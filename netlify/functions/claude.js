import { handleClaudeRequest } from "../../api/_claude.js";

export default async (request) => {
  if (request.method !== "POST") {
    return Response.json(
      { error: { type: "method_not_allowed", message: "Use POST" } },
      { status: 405, headers: { Allow: "POST" } }
    );
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return Response.json(
      { error: { type: "invalid_request_error", message: "Body is not valid JSON" } },
      { status: 400 }
    );
  }

  const { status, body } = await handleClaudeRequest(input);
  return Response.json(body, { status });
};

export const config = { path: "/api/claude" };
