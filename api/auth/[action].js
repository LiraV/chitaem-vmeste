import { routeAuth } from "../_auth-router.js";

export default async function handler(req, res) {
  const action = String(req.query?.action || "");
  const { status, headers, body } = await routeAuth(action, req.query, req.headers?.cookie);
  for (const [k, v] of Object.entries(headers || {})) res.setHeader(k, v);
  if (body) return res.status(status).json(body);
  return res.status(status).end();
}
