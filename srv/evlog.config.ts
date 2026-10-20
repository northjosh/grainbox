import { defineEvlog } from "evlog";
import type { DrainContext } from "evlog";
import { createFsDrain } from "evlog/fs";
import { createSentryDrain } from "evlog/sentry";
import { createDrainPipeline } from "evlog/pipeline";
import {
  createGeoEnricher,
  createRequestSizeEnricher,
  createTraceContextEnricher,
  createUserAgentEnricher,
} from "evlog/enrichers";

const pipeline = createDrainPipeline<DrainContext>({
  batch: { size: 50, intervalMs: 5000 },
  retry: { maxAttempts: 3 },
});

const drains =
  process.env.NODE_ENV === "production"
    ? [pipeline(createSentryDrain())]
    : [createFsDrain()];

const enrichers =
  process.env.NODE_ENV === "production"
    ? [
        createUserAgentEnricher(),
        createGeoEnricher(),
        createRequestSizeEnricher(),
        createTraceContextEnricher(),
      ]
    : [createTraceContextEnricher()];

/**
 * Settings for grainbox, read by the app and by the evlog CLI.
 * Reads SENTRY_DSN, OTEL_EXPORTER_OTLP_ENDPOINT, OTEL_SERVICE_NAME, LOKI_ENDPOINT from the environment.
 * https://evlog.dev/cli/config
 */
export default defineEvlog({
  service: "grainbox",
  exclude: [
    '/api/health',
    '/assets/**',
    '/_status',
    '/favicon.ico',
  ],
  drain: async (ctx) => void (await Promise.all(drains.map((drain) => drain(ctx)))),
  enrich: async (ctx) => {
    for (const enrich of enrichers) await enrich(ctx);
  },
});
