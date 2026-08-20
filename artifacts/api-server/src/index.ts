import app from "./app";
import { startWebhookWorker } from "./lib/webhook-delivery";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  // P1-3: in-process outbox delivery worker (MVP; queue-backed in production).
  startWebhookWorker();
  logger.info({ port }, "Server listening");
});
