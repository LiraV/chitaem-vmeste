/**
 * Yandex Cloud Foundation Models provider.
 *
 * Chosen when the backend runs inside Russia, where api.anthropic.com is not
 * available. Responses are normalised to the Anthropic content-block shape so
 * the frontend does not need to know which provider answered.
 *
 * Auth, in order of preference:
 *   1. YANDEX_IAM_TOKEN  — explicit token, mainly for tests
 *   2. YANDEX_API_KEY    — service account API key, for running outside the cloud
 *   3. the metadata service — the default inside Yandex Cloud. The container
 *      already runs as a service account, so no key needs to be created,
 *      stored in Lockbox, or rotated.
 */

const DEFAULT_URL = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion";
const DEFAULT_MODEL = "yandexgpt";

const METADATA_TOKEN_URL =
  "http://169.254.169.254/computeMetadata/v1/instance/service-accounts/default/token";
// Refresh early so a request never starts with a token about to expire.
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000;

/** @type {{token: string, expiresAt: number} | null} */
let cachedToken = null;

async function metadataToken() {
  if (cachedToken && Date.now() < cachedToken.expiresAt - TOKEN_REFRESH_MARGIN_MS) {
    return cachedToken.token;
  }

  const res = await fetch(process.env.YANDEX_METADATA_URL || METADATA_TOKEN_URL, {
    headers: { "Metadata-Flavor": "Google" },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) {
    throw new Error(`metadata service returned ${res.status}`);
  }

  const data = await res.json();
  if (!data || typeof data.access_token !== "string") {
    throw new Error("metadata service returned no access_token");
  }

  const ttlMs = (Number(data.expires_in) || 0) * 1000;
  cachedToken = { token: data.access_token, expiresAt: Date.now() + ttlMs };
  return cachedToken.token;
}

/** @returns {Promise<string|null>} Authorization header value, or null. */
async function authHeader() {
  const iamToken = process.env.YANDEX_IAM_TOKEN;
  if (iamToken) return `Bearer ${iamToken}`;

  const apiKey = process.env.YANDEX_API_KEY;
  if (apiKey) return `Api-Key ${apiKey}`;

  try {
    return `Bearer ${await metadataToken()}`;
  } catch (e) {
    console.error("Could not get an IAM token from the metadata service:", e.message);
    return null;
  }
}

/**
 * @param {{system?: string, messages: Array<{role: string, content: string}>,
 *          maxTokens: number}} req
 * @returns {Promise<{status: number, body: object}>} Anthropic-shaped body.
 */
export async function complete({ system, messages, maxTokens }) {
  const auth = await authHeader();
  const folderId = process.env.YANDEX_FOLDER_ID;

  if (!auth) {
    return {
      status: 500,
      body: {
        error: {
          type: "configuration_error",
          message:
            "No Yandex credentials: set YANDEX_API_KEY, or run inside Yandex Cloud with a service account attached",
        },
      },
    };
  }
  if (!folderId) {
    console.error("YANDEX_FOLDER_ID is not set — the model URI cannot be built.");
    return {
      status: 500,
      body: { error: { type: "configuration_error", message: "Server is missing YANDEX_FOLDER_ID" } },
    };
  }

  const model = process.env.YANDEX_MODEL || DEFAULT_MODEL;
  // A caller may pass a full gpt:// URI to pin a specific model or version.
  const modelUri = model.startsWith("gpt://") ? model : `gpt://${folderId}/${model}/latest`;

  // Yandex takes the system prompt as a message with role "system", and calls
  // the field `text` rather than `content`.
  const yandexMessages = [];
  if (system) yandexMessages.push({ role: "system", text: system });
  for (const m of messages) yandexMessages.push({ role: m.role, text: m.content });

  const payload = {
    modelUri,
    completionOptions: {
      stream: false,
      temperature: Number(process.env.YANDEX_TEMPERATURE ?? 0.6),
      // int64 fields are conventionally strings in protobuf JSON.
      maxTokens: String(maxTokens),
    },
    messages: yandexMessages,
  };

  let upstream;
  try {
    upstream = await fetch(process.env.YANDEX_API_URL || DEFAULT_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: auth,
        "x-folder-id": folderId,
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error("Upstream request to Yandex Foundation Models failed:", e);
    return {
      status: 502,
      body: { error: { type: "upstream_error", message: "Could not reach Yandex Foundation Models" } },
    };
  }

  const raw = await upstream.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    console.error("Non-JSON response from Yandex:", upstream.status, raw.slice(0, 500));
    return {
      status: 502,
      body: { error: { type: "upstream_error", message: "Malformed response from Yandex Foundation Models" } },
    };
  }

  if (!upstream.ok) {
    console.error("Yandex API error:", upstream.status, raw.slice(0, 500));
    const message =
      (data && (data.message || (data.error && data.error.message))) || "Yandex Foundation Models request failed";
    return { status: upstream.status, body: { error: { type: "upstream_error", message } } };
  }

  const alternatives = (data.result && data.result.alternatives) || [];
  const text = alternatives
    .map((a) => (a && a.message && typeof a.message.text === "string" ? a.message.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();

  if (!text) {
    console.error("Empty completion from Yandex:", raw.slice(0, 500));
    return {
      status: 502,
      body: { error: { type: "upstream_error", message: "Yandex Foundation Models returned no text" } },
    };
  }

  // Normalise to the Anthropic shape the frontend already parses.
  return {
    status: 200,
    body: {
      content: [{ type: "text", text }],
      model: (data.result && data.result.modelVersion) || modelUri,
      usage: (data.result && data.result.usage) || undefined,
    },
  };
}
