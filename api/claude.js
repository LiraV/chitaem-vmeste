import { handleClaudeRequest } from "./_claude.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: { type: "method_not_allowed", message: "Use POST" } });
  }

  // Vercel parses JSON bodies automatically, but be tolerant of a raw string.
  let input = req.body;
  if (typeof input === "string") {
    try {
      input = JSON.parse(input);
    } catch {
      return res.status(400).json({ error: { type: "invalid_request_error", message: "Body is not valid JSON" } });
    }
  }

  const { status, body } = await handleClaudeRequest(input);
  return res.status(status).json(body);
}
