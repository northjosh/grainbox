import { serve } from "@hono/node-server";
import { WebSocketServer } from "ws";
import { ensureRuntime } from "microsandbox";
import { log } from "evlog";
import { initSentry } from "../sentry.config.js";
import { createApp } from "./app.js";

initSentry();
await ensureRuntime();

const app = createApp();

const wss = new WebSocketServer({ noServer: true });

serve(
  {
    fetch: app.fetch,
    port: Number(process.env.GB_SERVER_PORT) || 3001,
    websocket: {
      server: wss,
    },
  },
  (info) => {
    log.info(`Server is running on http://localhost:${info.port}`);
  },
);
