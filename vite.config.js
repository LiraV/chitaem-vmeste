import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Mounts the same /api/claude handler used in production onto the dev server,
 * so `npm run dev` behaves like a real deployment instead of 404-ing.
 */
function claudeApiDevServer(env) {
  return {
    name: "claude-api-dev-server",
    apply: "serve",
    configureServer(server) {
      // The handler reads process.env; loadEnv gives it the values from .env.
      for (const key of ["ANTHROPIC_API_KEY", "CLAUDE_MODEL"]) {
        if (env[key] && !process.env[key]) process.env[key] = env[key];
      }

      server.middlewares.use("/api/claude", async (req, res) => {
        const json = (status, body) => {
          res.statusCode = status;
          res.setHeader("content-type", "application/json; charset=utf-8");
          res.end(JSON.stringify(body));
        };

        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.method !== "POST") {
          return json(405, { error: { type: "method_not_allowed", message: "Use POST" } });
        }

        let raw = "";
        for await (const chunk of req) raw += chunk;

        let input;
        try {
          input = JSON.parse(raw);
        } catch {
          return json(400, { error: { type: "invalid_request_error", message: "Body is not valid JSON" } });
        }

        // Imported lazily so edits to the handler are picked up on restart
        // without the plugin holding a stale copy.
        const { handleClaudeRequest } = await import("./api/_llm.js");
        const { status, body } = await handleClaudeRequest(input);
        return json(status, body);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // "" prefix => load every var, not just VITE_*. These stay server-side; they
  // are never exposed to the client bundle.
  const env = loadEnv(mode, process.cwd(), "");

  return {
    // GitHub Pages serves a project site from /<repo>/, so assets must be
    // referenced from that prefix. VITE_BASE is set by the Pages workflow;
    // everywhere else (Yandex Cloud, Vercel, Netlify, dev) the default "/" is
    // correct.
    base: env.VITE_BASE || "/",
    plugins: [react(), claudeApiDevServer(env)],
    build: {
      outDir: "dist",
      sourcemap: false,
    },
  };
});
