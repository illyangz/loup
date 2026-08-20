// Cloudflare Workers entrypoint. Separate from index.ts (the Node/Render
// entrypoint) because Workers has no `.listen()`-and-block model — a fetch
// event drives each request instead. httpServerHandler bridges the existing
// Express `app` (unchanged) into that model.
//
// The webhook delivery worker (lib/webhook-delivery.ts) normally runs a
// `setInterval` polling loop — that doesn't work here: a Workers isolate
// isn't guaranteed to stay alive between requests, so a timer registered
// during one request can simply stop firing once that request ends. Instead,
// a Cron Trigger (see wrangler.toml) invokes `scheduled()` below on a fixed
// schedule to drain the due-webhook queue. Minimum Cron Trigger granularity
// is 1 minute, vs. the original 5-second poll — delivery latency goes up,
// which is a real change from the Node deployment's behavior, not a
// like-for-like port.
import { httpServerHandler } from "cloudflare:node";
import app from "./app";
import { processDueEvents } from "./lib/webhook-delivery";
import { logger } from "./lib/logger";

const port = 8787;
app.listen(port);

export default {
  ...httpServerHandler({ port }),
  async scheduled(): Promise<void> {
    try {
      await processDueEvents();
    } catch (err) {
      logger.warn({ err }, "Webhook cron tick failed");
    }
  },
};
