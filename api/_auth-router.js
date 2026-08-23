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
