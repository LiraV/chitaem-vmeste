/**
 * Framework-agnostic LLM proxy.
 *
 * The browser must never hold a provider key, and the model APIs do not allow
 * direct browser calls anyway. The client posts a trimmed request here and
 * this module adds the credentials server-side, then dispatches to the
 * selected provider (see selectedProvider).
 *
 * Providers return the same Anthropic-style content-block shape, so the
 * frontend does not change when the backend switches provider.
 *
 * Adapters: api/claude.js (Vercel), netlify/functions/claude.js (Netlify),
 * server.js (standalone Node), and the dev middleware in vite.config.js.
 */

import * as anthropic from "./_providers/anthropic.js";
import * as openai from "./_providers/openai.js";
import * as yandex from "./_providers/yandex.js";

const PROVIDERS = { anthropic, openai, yandex };

/**
 * Which provider to use. An explicit LLM_PROVIDER always wins; otherwise the
 * key that is actually present decides, so a deploy needs one variable rather
 * than two that can disagree.
 */
function selectedProvider() {
  const explicit = (process.env.LLM_PROVIDER || "").trim().toLowerCase();
  if (explicit) return explicit;
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.YANDEX_API_KEY || process.env.YANDEX_FOLDER_ID) return "yandex";
  return "openai";
}

const MAX_TOKENS_CAP = 16000;

/**
 * Ограничитель частоты.
 *
 * Эндпоинт публичный, а каждый запрос стоит денег у провайдера: проверено с
 * постороннего сервера, что без лимита бюджет доступен любому скрипту.
 *
 * Считаем в общем хранилище (Upstash Redis по REST — у Vercel он ставится из
 * маркетплейса в пару кликов и сам прописывает переменные). Это не украшение:
 * на serverless каждый запрос может обслужить отдельный инстанс со своей
 * памятью — в замере по проду три подряд ответа пришли от трёх разных, и
 * счётчик в памяти процесса их попросту не видел.
 *
 * Пока хранилище не подключено, работает запасной счётчик в памяти. Он ловит
 * наивный цикл, попавший на один инстанс, но сплошной защитой не является —
 * настоящий предел ущерба задаёт лимит расходов в кабинете провайдера.
 */
const RATE_WINDOW_SEC = 300;
const RATE_MAX_REQUESTS = 40;
const rateBuckets = new Map();

class TooManyRequests extends Error {
  constructor(message) {
    super(message);
    this.status = 429;
  }
}

const RATE_MESSAGE = "Слишком много запросов — подождите пару минут.";

/**
 * Счётчик в общем хранилище. Возвращает число обращений за окно или null,
 * если хранилище не настроено либо не ответило: молчаливый откат к памяти
 * лучше, чем отказ обслуживать читателей из-за недоступного Redis.
 */
async function sharedHits(key) {
  const url = (process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/+$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      // EXPIRE ... NX ставит срок только при первом INCR, поэтому окно
      // отсчитывается от первого запроса и не продлевается следующими.
      body: JSON.stringify([["INCR", key], ["EXPIRE", key, String(RATE_WINDOW_SEC), "NX"]]),
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const count = Number(Array.isArray(data) ? data[0]?.result : NaN);
    return Number.isFinite(count) ? count : null;
  } catch {
    return null;
  }
}

/** Запасной счётчик в памяти инстанса. */
function memoryHits(key) {
  const now = Date.now();
  for (const [k, b] of rateBuckets) {
    if (b.resetAt <= now) rateBuckets.delete(k);
  }
  const bucket = rateBuckets.get(key) || { count: 0, resetAt: now + RATE_WINDOW_SEC * 1000 };
  bucket.count += 1;
  rateBuckets.set(key, bucket);
  return bucket.count;
}

export async function checkRateLimit(ip) {
  const key = `rl:${ip || "unknown"}`;
  const hits = (await sharedHits(key)) ?? memoryHits(key);
  if (hits > RATE_MAX_REQUESTS) throw new TooManyRequests(RATE_MESSAGE);
}

/** Первый адрес из x-forwarded-for: за прокси именно он — клиент. */
export function clientIp(headers) {
  const fwd = headers?.["x-forwarded-for"];
  if (typeof fwd === "string" && fwd) return fwd.split(",")[0].trim();
  return "";
}
const MAX_MESSAGES = 80;
const MAX_CHARS = 400_000;

class BadRequest extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

/** Validate and normalise the client request into a provider-neutral shape. */
function buildRequest(input) {
  if (!input || typeof input !== "object") {
    throw new BadRequest("Body must be a JSON object");
  }

  const { system, messages, tools, max_tokens: maxTokens } = input;

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new BadRequest("`messages` must be a non-empty array");
  }
  if (messages.length > MAX_MESSAGES) {
    throw new BadRequest(`messages may contain at most ${MAX_MESSAGES} entries`);
  }

  const cleanMessages = messages.map((m, i) => {
    if (!m || (m.role !== "user" && m.role !== "assistant")) {
      throw new BadRequest(`messages[${i}].role must be "user" or "assistant"`);
    }
    if (typeof m.content !== "string") {
      throw new BadRequest(`messages[${i}].content must be a string`);
    }
    return { role: m.role, content: m.content };
  });

  const totalChars =
    cleanMessages.reduce((n, m) => n + m.content.length, 0) +
    (typeof system === "string" ? system.length : 0);
  if (totalChars > MAX_CHARS) {
    throw new BadRequest("Request too large");
  }

  let toolNames = [];
  if (tools !== undefined) {
    if (!Array.isArray(tools)) throw new BadRequest("`tools` must be an array");
    toolNames = tools.map((t) => {
      const name = t && t.name;
      if (typeof name !== "string" || !name) throw new BadRequest("Each tool needs a name");
      return name;
    });
  }

  return {
    system: typeof system === "string" && system.trim() ? system : undefined,
    messages: cleanMessages,
    maxTokens: Math.min(
      Math.max(Number.isFinite(maxTokens) ? Math.trunc(maxTokens) : 1000, 1),
      MAX_TOKENS_CAP
    ),
    toolNames,
  };
}

/**
 * @param {unknown} input Parsed JSON request body from the client.
 * @returns {Promise<{status: number, body: object}>} Never throws.
 */
export async function handleClaudeRequest(input, ip) {
  try {
    await checkRateLimit(ip);
  } catch (e) {
    return { status: 429, body: { error: { type: "rate_limited", message: e.message } } };
  }
  const name = selectedProvider();
  const provider = PROVIDERS[name];
  if (!provider) {
    console.error(`Unknown LLM_PROVIDER "${name}". Known: ${Object.keys(PROVIDERS).join(", ")}`);
    return {
      status: 500,
      body: { error: { type: "configuration_error", message: `Unknown LLM_PROVIDER "${name}"` } },
    };
  }

  let request;
  try {
    request = buildRequest(input);
  } catch (e) {
    if (e instanceof BadRequest) {
      return { status: 400, body: { error: { type: "invalid_request_error", message: e.message } } };
    }
    throw e;
  }

  // The Anthropic provider validates tool names against its own allowlist.
  // OpenAI and Yandex have no server-side tools here, so they ignore them and
  // answer from the model's own knowledge — the book lookup prompt already
  // handles a miss via its NOT_FOUND contract.
  return provider.complete(request);
}

/**
 * CORS. Only needed when the frontend is served from a different origin than
 * this proxy — e.g. the UI on GitHub Pages and the backend in Yandex Cloud.
 *
 * ALLOWED_ORIGINS is a comma-separated allowlist, e.g.
 *   ALLOWED_ORIGINS=https://lirav.github.io
 * When it is unset no CORS headers are sent at all, which is correct for the
 * same-origin setup (frontend and API served by the same container).
 *
 * Note: CORS is a browser rule, not access control. It stops other websites
 * from spending your quota via their visitors' browsers; it does not stop
 * anyone from calling the endpoint directly with curl.
 */
function allowlist() {
  return (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

/**
 * @param {string|undefined|null} origin The request's Origin header.
 * @returns {Record<string,string>} Headers to merge into the response. Empty
 *          when the origin is absent or not allowed.
 */
export function corsHeaders(origin) {
  if (!origin) return {};
  const allowed = allowlist();
  if (allowed.length === 0) return {};

  const normalized = origin.replace(/\/+$/, "");
  const match = allowed.includes("*") || allowed.includes(normalized);
  if (!match) return {};

  return {
    "access-control-allow-origin": normalized,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    // The response varies by Origin, so caches must not reuse it across sites.
    vary: "Origin",
  };
}
