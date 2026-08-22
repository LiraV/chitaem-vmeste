/**
 * Anthropic provider. Used when the backend runs somewhere the Claude API is
 * available — note Russia is not in Anthropic's supported regions, so a
 * backend hosted in ru-central1 needs the Yandex provider instead.
 */

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-4-6";

/** Tools the client may ask for, by name. The definition is built here so a
 *  caller cannot smuggle in an arbitrary server-side tool. */
const ALLOWED_TOOLS = {
  web_search: { type: "web_search_20250305", name: "web_search" },
};

/** @returns {string[]|null} Resolved tool names, or null if one is unknown. */
export function resolveTools(names) {
  const out = [];
  for (const name of names) {
    const def = ALLOWED_TOOLS[name];
    if (!def) return null;
    out.push(def);
  }
  return out;
}

/**
 * @param {{system?: string, messages: Array<{role: string, content: string}>,
 *          maxTokens: number, toolNames: string[]}} req
 * @returns {Promise<{status: number, body: object}>}
 */
export async function complete({ system, messages, maxTokens, toolNames }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY is not set — cannot reach the Anthropic API.");
    return {
      status: 500,
      body: { error: { type: "configuration_error", message: "Server is missing ANTHROPIC_API_KEY" } },
    };
  }

  const payload = {
    model: process.env.CLAUDE_MODEL || DEFAULT_MODEL,
    max_tokens: maxTokens,
    messages,
  };
  if (system) payload.system = system;

  const tools = resolveTools(toolNames || []);
  if (tools === null) {
    return {
      status: 400,
      body: { error: { type: "invalid_request_error", message: "Unsupported tool" } },
    };
  }
  if (tools.length) payload.tools = tools;

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
    console.error("Anthropic API error:", upstream.status, JSON.stringify(body).slice(0, 500));
  }
  return { status: upstream.status, body };
}
