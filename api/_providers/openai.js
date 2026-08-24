/**
 * OpenAI provider (Chat Completions).
 *
 * Normalises the reply to the same content-block shape the other providers
 * return, so the frontend does not know which one answered.
 */

const DEFAULT_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-5.5";

// У моделей с рассуждением скрытые токены размышления списываются из того же
// max_completion_tokens, что и видимый ответ. На длинных инструкциях (карта
// героев, викторина) модель успевала израсходовать весь бюджет на раздумья и
// возвращала пустой текст. "low" оставляет место ответу и заодно дешевле.
const DEFAULT_REASONING_EFFORT = "low";

/**
 * @param {{system?: string, messages: Array<{role: string, content: string}>,
 *          maxTokens: number}} req
 * @returns {Promise<{status: number, body: object}>}
 */
export async function complete({ system, messages, maxTokens }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY is not set — cannot reach the OpenAI API.");
    return {
      status: 500,
      body: { error: { type: "configuration_error", message: "Server is missing OPENAI_API_KEY" } },
    };
  }

  const chatMessages = [];
  if (system) chatMessages.push({ role: "system", content: system });
  for (const m of messages) chatMessages.push({ role: m.role, content: m.content });

  const payload = {
    model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
    messages: chatMessages,
    // max_tokens is deprecated and rejected by reasoning models.
    max_completion_tokens: maxTokens,
  };

  // Пустая строка в переменной = не отправлять параметр вовсе.
  const effort = process.env.OPENAI_REASONING_EFFORT ?? DEFAULT_REASONING_EFFORT;
  if (effort) payload.reasoning_effort = effort;

  // Reasoning models reject `temperature`, so only send it when explicitly
  // configured for a model known to accept it.
  if (process.env.OPENAI_TEMPERATURE) {
    payload.temperature = Number(process.env.OPENAI_TEMPERATURE);
  }

  const headers = {
    "content-type": "application/json",
    authorization: `Bearer ${apiKey}`,
  };
  if (process.env.OPENAI_ORG) headers["openai-organization"] = process.env.OPENAI_ORG;
  if (process.env.OPENAI_PROJECT) headers["openai-project"] = process.env.OPENAI_PROJECT;

  const url = process.env.OPENAI_API_URL || DEFAULT_URL;
  const post = (body) => fetch(url, { method: "POST", headers, body: JSON.stringify(body) });

  let upstream, raw;
  try {
    upstream = await post(payload);
    raw = await upstream.text();

    // Не все модели принимают reasoning_effort. Если дело в нём — повторяем
    // без него, чтобы выбор модели не ломал приложение.
    if (upstream.status === 400 && payload.reasoning_effort && /reasoning_effort/i.test(raw)) {
      console.warn("Модель не принимает reasoning_effort — повторяю без него");
      const { reasoning_effort: _drop, ...plain } = payload;
      upstream = await post(plain);
      raw = await upstream.text();
    }
  } catch (e) {
    console.error("Upstream request to OpenAI failed:", e);
    return {
      status: 502,
      body: { error: { type: "upstream_error", message: "Could not reach the OpenAI API" } },
    };
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    console.error("Non-JSON response from OpenAI:", upstream.status, raw.slice(0, 500));
    return {
      status: 502,
      body: { error: { type: "upstream_error", message: "Malformed response from the OpenAI API" } },
    };
  }

  if (!upstream.ok) {
    console.error("OpenAI API error:", upstream.status, raw.slice(0, 500));
    const message = (data && data.error && data.error.message) || "OpenAI request failed";
    return { status: upstream.status, body: { error: { type: "upstream_error", message } } };
  }

  const choice = (data.choices && data.choices[0]) || null;
  const message = choice && choice.message;

  // A refusal comes back with content null and a `refusal` string instead.
  if (message && typeof message.refusal === "string" && message.refusal) {
    return {
      status: 200,
      body: { content: [{ type: "text", text: message.refusal }], model: data.model },
    };
  }

  const text = message && typeof message.content === "string" ? message.content.trim() : "";
  if (!text) {
    // finish_reason "length" means the answer was cut off before any text —
    // usually max_completion_tokens spent entirely on reasoning tokens.
    const reason = choice && choice.finish_reason;
    console.error("Empty completion from OpenAI:", reason, raw.slice(0, 500));
    return {
      status: 502,
      body: {
        error: {
          type: "upstream_error",
          message:
            reason === "length"
              ? "OpenAI hit the token limit before producing any text — raise max_tokens"
              : "OpenAI returned no text",
        },
      },
    };
  }

  return {
    status: 200,
    body: {
      content: [{ type: "text", text }],
      model: data.model,
      usage: data.usage,
    },
  };
}
