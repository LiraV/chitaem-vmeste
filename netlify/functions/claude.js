import { handleClaudeRequest, corsHeaders } from "../../api/_claude.js";

export default async (request) => {
  const cors = corsHeaders(request.headers.get("origin"));

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  if (request.method !== "POST") {
    return Response.json(
      { error: { type: "method_not_allowed", message: "Use POST" } },
      { status: 405, headers: { Allow: "POST", ...cors } }
    );
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return Response.json(
      { error: { type: "invalid_request_error", message: "Body is not valid JSON" } },
      { status: 400, headers: cors }
    );
  }

  const { status, body } = await handleClaudeRequest(input);
  return Response.json(body, { status, headers: cors });
};

export const config = { path: "/api/claude" };
