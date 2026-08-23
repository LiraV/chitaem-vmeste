/**
 * Standalone production server: serves the built SPA from dist/ and hosts the
 * /api/claude proxy. Used by `npm start` (Docker, Render, Railway, Fly, a VPS).
 * Vercel and Netlify do not use this file — they use the adapters in api/ and
 * netlify/functions/ instead.
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { handleClaudeRequest, corsHeaders } from "./api/_llm.js";
import { routeAuth } from "./api/_auth-router.js";

const PORT = Number(process.env.PORT) || 3000;
const DIST = resolve(dirname(fileURLToPath(import.meta.url)), "dist");
const MAX_BODY_BYTES = 1_000_000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function sendJson(res, status, body, extraHeaders = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", ...extraHeaders });
  res.end(payload);
}

function readBody(req) {
  return new Promise((res, rej) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        rej(new Error("Body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => res(Buffer.concat(chunks).toString("utf8")));
    req.on("error", rej);
  });
}

async function serveStatic(res, pathname) {
  // Resolve inside DIST only — never let a crafted path escape the build dir.
  const candidate = resolve(DIST, "." + normalize(pathname));
  const safe = candidate === DIST || candidate.startsWith(DIST + sep);
  let file = safe ? candidate : null;

  if (file) {
    try {
      const info = await stat(file);
      if (info.isDirectory()) file = join(file, "index.html");
    } catch {
      file = null;
    }
  }

  // SPA fallback: unknown paths render the app shell.
  if (!file) file = join(DIST, "index.html");

  try {
    const data = await readFile(file);
    const ext = extname(file);
    const headers = { "content-type": MIME[ext] || "application/octet-stream" };
    // Vite emits content-hashed asset filenames, so those are safe to pin.
    headers["cache-control"] = file.includes(`${sep}assets${sep}`)
      ? "public, max-age=31536000, immutable"
      : "no-cache";
    res.writeHead(200, headers);
    res.end(data);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found. Run `npm run build` first.");
  }
}

// Обёртка: непойманная ошибка в обработке одного запроса не должна уносить
// весь процесс — остальные читатели не виноваты.
const server = createServer((req, res) => {
  handle(req, res).catch((e) => {
    console.error("Необработанная ошибка запроса:", e);
    if (!res.headersSent) sendJson(res, 500, { error: { type: "server_error", message: "Внутренняя ошибка" } });
    else res.end();
  });
});

async function handle(req, res) {
  const { pathname } = new URL(req.url, "http://localhost");

  if (pathname.startsWith("/api/auth/")) {
    const action = pathname.slice("/api/auth/".length);
    const { status, headers, body } = await routeAuth(action, new URL(req.url, "http://localhost").searchParams, req.headers.cookie);
    if (body) return sendJson(res, status, body, headers || {});
    res.writeHead(status, headers || {});
    return res.end();
  }

  if (pathname === "/api/claude") {
    const cors = corsHeaders(req.headers.origin);

    // Preflight: the browser asks before sending a cross-origin POST.
    if (req.method === "OPTIONS") {
      res.writeHead(204, cors);
      return res.end();
    }

    if (req.method !== "POST") {
      return sendJson(res, 405, { error: { type: "method_not_allowed", message: "Use POST" } }, cors);
    }
    let input;
    try {
      input = JSON.parse(await readBody(req));
    } catch {
      return sendJson(res, 400, { error: { type: "invalid_request_error", message: "Body is not valid JSON" } }, cors);
    }
    const { status, body } = await handleClaudeRequest(input);
    return sendJson(res, status, body, cors);
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return sendJson(res, 405, { error: { type: "method_not_allowed", message: "Use GET" } });
  }
  return serveStatic(res, pathname);
}

// Bind all interfaces: container runtimes (Yandex Serverless Containers,
// Docker) route external traffic to the container IP, not to loopback.
server.listen(PORT, "0.0.0.0", () => {
  console.log(`chitaem-vmeste listening on 0.0.0.0:${PORT}`);
});
