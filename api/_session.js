/**
 * Подписанные токены сессии (JWT HS256) на штатном crypto — без зависимостей.
 *
 * Используются в двух местах: сама сессия пользователя и параметр state в
 * OAuth-обмене. Для state важно, что подпись позволяет проверить его на
 * возврате, не храня ничего на сервере между двумя запросами.
 */
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

const b64url = (buf) => Buffer.from(buf).toString("base64url");

/** Минимальная длина секрета подписи. Короткий подбирается перебором. */
export const MIN_SECRET_LENGTH = 32;

/** @returns {boolean} Годится ли текущий SESSION_SECRET для подписи. */
export function hasUsableSecret() {
  const s = process.env.SESSION_SECRET;
  return typeof s === "string" && s.length >= MIN_SECRET_LENGTH;
}

function secret() {
  if (!hasUsableSecret()) {
    throw new Error(`SESSION_SECRET не задан или короче ${MIN_SECRET_LENGTH} символов`);
  }
  return process.env.SESSION_SECRET;
}

function signature(data) {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

/**
 * @param {object} payload Полезная нагрузка.
 * @param {number} ttlSeconds Срок жизни.
 * @returns {string} Токен вида header.payload.signature
 */
export function sign(payload, ttlSeconds) {
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + ttlSeconds };
  const head = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const data = `${head}.${b64url(JSON.stringify(body))}`;
  return `${data}.${signature(data)}`;
}

/**
 * @param {string|undefined|null} token
 * @returns {object|null} Полезная нагрузка или null, если подпись/срок не сошлись.
 */
export function verify(token) {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const data = `${parts[0]}.${parts[1]}`;
  const expected = Buffer.from(signature(data));
  const given = Buffer.from(parts[2]);
  // Сравнение за постоянное время: иначе по времени ответа можно подбирать подпись.
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

/** Случайная строка для одноразовых значений (nonce в state). */
export const nonce = () => randomBytes(16).toString("base64url");
