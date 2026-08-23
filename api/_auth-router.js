/**
 * Общая маршрутизация /api/auth/* — используется адаптером Vercel, локальным
 * сервером и dev-сервером Vite, чтобы вход вёл себя одинаково везде.
 */
import { start, callback, me, logout, parseCookies } from "./_auth.js";

/**
 * @param {string} action Последний сегмент пути: start | callback | me | logout
 * @param {URLSearchParams|object} query
 * @param {string} cookieHeader
 * @returns {Promise<{status:number, headers?:object, body?:object}>}
 */
export async function routeAuth(action, query, cookieHeader) {
  const q = query instanceof URLSearchParams ? Object.fromEntries(query) : (query || {});
  const cookies = parseCookies(cookieHeader);
  // Любая неожиданная ошибка здесь — это ответ 500, а не падение процесса.
  try {
    switch (action) {
      case "start": return start();
      case "callback": return await callback(q, cookies);
      case "me": return me(cookies);
      case "logout": return logout();
      default:
        return { status: 404, body: { error: { type: "not_found", message: `Неизвестный маршрут входа: ${action}` } } };
    }
  } catch (e) {
    console.error(`Ошибка в /api/auth/${action}:`, e);
    return { status: 500, body: { error: { type: "server_error", message: "Вход временно недоступен" } } };
  }
}

/**
 * Обёртка для serverless-функций Vercel. Каждый эндпоинт входа — отдельный
 * файл: динамический маршрут api/auth/[action].js там не подхватывался, и
 * запрос проваливался в общий редирект на index.html.
 */
export function vercelAuthHandler(action) {
  return async function handler(req, res) {
    const { status, headers, body } = await routeAuth(action, req.query, req.headers?.cookie);
    for (const [k, v] of Object.entries(headers || {})) res.setHeader(k, v);
    if (body) return res.status(status).json(body);
    return res.status(status).end();
  };
}
