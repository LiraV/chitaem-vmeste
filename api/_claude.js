/**
 * Framework-agnostic Anthropic proxy.
 *
 * The browser must never hold the API key, and api.anthropic.com does not
 * allow direct browser calls anyway. The client posts a trimmed request here
 * and this module adds the credentials server-side.
 *
 * Adapters: api/claude.js (Vercel), netlify/functions/claude.js (Netlify),
 * server.js (standalone Node), and the dev middleware in vite.config.js.
 */

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

const DEFAULT_MODEL = "claude-sonnet-4-6";
const MAX_TOKENS_CAP = 4000;
const MAX_MESSAGES = 80;
const MAX_CHARS = 400_000;

/** Tools the client may ask for, by name. The definition is built here so a
 *  caller cannot smuggle in an arbitrary server-side tool. */
const ALLOWED_TOOLS = {
  web_search: { type: "web_search_20250305", name: "web_search" },
};

class BadRequest extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

function buildPayload(input) {
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

  const payload = {
    model: process.env.CLAUDE_MODEL || DEFAULT_MODEL,
    max_tokens: Math.min(
      Math.max(Number.isFinite(maxTokens) ? Math.trunc(maxTokens) : 1000, 1),
      MAX_TOKENS_CAP
    ),
    messages: cleanMessages,
  };

  if (typeof system === "string" && system.trim()) payload.system = system;

  if (tools !== undefined) {
    if (!Array.isArray(tools)) throw new BadRequest("`tools` must be an array");
    const resolved = tools.map((t) => {
      const def = ALLOWED_TOOLS[t && t.name];
      if (!def) throw new BadRequest(`Unsupported tool: ${t && t.name}`);
      return def;
    });
    if (resolved.length) payload.tools = resolved;
  }

  return payload;
}

/**
 * @param {unknown} input Parsed JSON request body from the client.
 * @returns {Promise<{status: number, body: object}>} Status and JSON body to
 *          return to the client. Never throws.
 */
export async function handleClaudeRequest(input) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY is not set — cannot reach the Anthropic API.");
    return {
      status: 500,
      body: { error: { type: "configuration_error", message: "Server is missing ANTHROPIC_API_KEY" } },
    };
  }

  let payload;
  try {
    payload = buildPayload(input);
  } catch (e) {
    if (e instanceof BadRequest) {
      return { status: 400, body: { error: { type: "invalid_request_error", message: e.message } } };
    }
    throw e;
  }

  let upstream;
  try {
    upstream = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error("Upstream request to Anthropic failed:", e);
    return {
      status: 502,
      body: { error: { type: "upstream_error", message: "Could not reach the Anthropic API" } },
    };
  }

  const text = await upstream.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    console.error("Non-JSON response from Anthropic:", upstream.status, text.slice(0, 500));
    return {
      status: 502,
      body: { error: { type: "upstream_error", message: "Malformed response from the Anthropic API" } },
    };
  }

  if (!upstream.ok) {
    // Log server-side; the client only ever sees the shape it already handles.
    console.error("Anthropic API error:", upstream.status, JSON.stringify(body).slice(0, 500));
  }

  return { status: upstream.status, body };
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
