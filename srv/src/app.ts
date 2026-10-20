import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { sentry } from "@sentry/hono/node";
import { validateSession } from "./middleware.js";
import { evlogMiddleware } from "./evlog.js";
import { authRoutes } from "./routes/auth.js";
import { sandboxesRoutes } from "./routes/sandboxes.js";
import { snapshotRoutes } from "./routes/snapshots.js";
import { portRoutes } from "./routes/ports.js";
import type { Env } from "./env.js";

export function createApp() {
  let app = new Hono<Env>();

  app.use(evlogMiddleware);
  app.use(sentry(app));

  app.use("/assets/*", serveStatic({ root: "./public" }));
  app.use("/icon.png", serveStatic({ root: "./public" }));
  app.use("/icon-180.png", serveStatic({ root: "./public" }));
  app.use("/icon-32.png", serveStatic({ root: "./public" }));
  app.use("/favicon.ico", serveStatic({ root: "./public" }));
  app.use("/favicon.png", serveStatic({ root: "./public" }));
  app.use("/favicon-180.png", serveStatic({ root: "./public" }));
  app.use("/favicon-32.png", serveStatic({ root: "./public" }));
  app.get("/", serveStatic({ root: "./public/" }));

  const api = app.basePath("/api");

  api.get("/health", (c) => c.json({ ok: true }));

  // auth carries validateSession per-route for /session and /logout,
  // so it is mounted before the global session validation
  api.route("/", authRoutes);

  api.use("*", validateSession);

  api.route("/", sandboxesRoutes);
  api.route("/", snapshotRoutes);
  api.route("/", portRoutes);

  api.all("*", (c) => c.json({ error: "Not found" }, 404));

  app.get("*", (c, next) => {
    if (!c.req.header("accept")?.includes("text/html")) {
      return next();
    }

    return serveStatic({ root: "./public", path: "index.html" })(c, next);
  });

  app.onError((err, c) => {
    c.get("log").error(err);
    return c.json({ error: err.message }, 500);
  });
  return app;
}
