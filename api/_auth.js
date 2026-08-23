/**
 * Вход через Яндекс ID (OAuth 2.0, authorization code flow).
 *
 * Обмен кода на токен идёт на сервере, поэтому client_secret в браузер не
 * попадает. Полученный токен Яндекса мы не храним и наружу не отдаём: он
 * нужен один раз, чтобы узнать, кто пришёл. Дальше пользователь ходит с нашей
 * собственной подписанной сессией в httpOnly-куке.
 */
import { sign, verify, nonce } from "./_session.js";

const AUTHORIZE_URL = "https://oauth.yandex.ru/authorize";
const TOKEN_URL = process.env.YANDEX_TOKEN_URL || "https://oauth.yandex.ru/token";
const USERINFO_URL = process.env.YANDEX_USERINFO_URL || "https://login.yandex.ru/info?format=json";

const SESSION_COOKIE = "cv_session";
const STATE_COOKIE = "cv_oauth_state";
const SESSION_TTL = 60 * 60 * 24 * 30;  // 30 дней
const STATE_TTL = 60 * 10;              // код Яндекса живёт 10 минут

export const isAuthConfigured = () =>
  Boolean(process.env.YANDEX_CLIENT_ID && process.env.YANDEX_CLIENT_SECRET && process.env.SESSION_SECRET);

/** Разбор заголовка Cookie в объект. */
export function parseCookies(header) {
  const out = {};
  for (const part of String(header || "").split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function cookie(name, value, maxAge) {
  const bits = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  // Локальная разработка идёт по http, там Secure не даст куке установиться.
  if ((process.env.APP_URL || "").startsWith("https://")) bits.push("Secure");
  return bits.join("; ");
}

const appUrl = () => (process.env.APP_URL || "").replace(/\/+$/, "");
const redirectUri = () => `${appUrl()}/api/auth/callback`;

/** Шаг 1: уводим пользователя на страницу согласия Яндекса. */
export function start() {
  if (!isAuthConfigured()) {
    return { status: 500, body: { error: { type: "configuration_error", message: "Вход не настроен на сервере" } } };
  }
  const n = nonce();
  const state = sign({ n }, STATE_TTL);
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", process.env.YANDEX_CLIENT_ID);
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("state", state);
  return {
    status: 302,
    headers: { location: url.toString(), "set-cookie": cookie(STATE_COOKIE, n, STATE_TTL) },
  };
}

/** Шаг 2: Яндекс вернул код — меняем его на токен и заводим свою сессию. */
export async function callback(query, cookies) {
  if (!isAuthConfigured()) {
    return { status: 500, body: { error: { type: "configuration_error", message: "Вход не настроен на сервере" } } };
  }
  if (query.error) {
    // Пользователь отказал в доступе — это не ошибка, просто возвращаем его назад.
    return { status: 302, headers: { location: `${appUrl()}/?auth=denied` } };
  }

  const claims = verify(query.state);
  // Double submit: подпись доказывает, что state выпустили мы, кука — что его
  // получил этот же браузер. Одной подписи мало против подмены сессии.
  if (!claims || !cookies[STATE_COOKIE] || cookies[STATE_COOKIE] !== claims.n) {
    return { status: 302, headers: { location: `${appUrl()}/?auth=badstate` } };
  }
  if (!query.code) {
    return { status: 302, headers: { location: `${appUrl()}/?auth=nocode` } };
  }

  let profile;
  try {
    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: query.code,
        client_id: process.env.YANDEX_CLIENT_ID,
        client_secret: process.env.YANDEX_CLIENT_SECRET,
      }),
    });
    const token = await tokenRes.json();
    if (!tokenRes.ok || !token.access_token) {
      console.error("Яндекс не выдал токен:", tokenRes.status, JSON.stringify(token).slice(0, 300));
      return { status: 302, headers: { location: `${appUrl()}/?auth=failed` } };
    }

    const infoRes = await fetch(USERINFO_URL, { headers: { authorization: `OAuth ${token.access_token}` } });
    profile = await infoRes.json();
    if (!infoRes.ok || !profile.id) {
      console.error("Не удалось получить профиль:", infoRes.status, JSON.stringify(profile).slice(0, 300));
      return { status: 302, headers: { location: `${appUrl()}/?auth=failed` } };
    }
  } catch (e) {
    console.error("Ошибка обмена с Яндекс ID:", e);
    return { status: 302, headers: { location: `${appUrl()}/?auth=failed` } };
  }

  const session = sign({
    sub: String(profile.id),
    name: profile.display_name || profile.real_name || profile.login || "",
    email: profile.default_email || "",
  }, SESSION_TTL);

  return {
    status: 302,
    headers: {
      location: `${appUrl()}/`,
      "set-cookie": [cookie(SESSION_COOKIE, session, SESSION_TTL), cookie(STATE_COOKIE, "", 0)],
    },
  };
}

/** Кто сейчас вошёл. Фронтенд спрашивает это при загрузке. */
export function me(cookies) {
  // Раньше проверки подписи: без SESSION_SECRET verify бросает исключение, а
  // это штатное состояние сервера, на котором вход ещё не настроен.
  if (!isAuthConfigured()) return { status: 200, body: { user: null, configured: false } };
  const payload = verify(cookies[SESSION_COOKIE]);
  if (!payload) return { status: 200, body: { user: null, configured: isAuthConfigured() } };
  return { status: 200, body: { user: { id: payload.sub, name: payload.name, email: payload.email }, configured: true } };
}

export function logout() {
  return { status: 302, headers: { location: `${appUrl()}/`, "set-cookie": cookie(SESSION_COOKIE, "", 0) } };
}

/** Сессия из заголовка Cookie — для защиты остальных эндпоинтов. */
export function sessionFrom(cookieHeader) {
  if (!isAuthConfigured()) return null;
  return verify(parseCookies(cookieHeader)[SESSION_COOKIE]);
}
