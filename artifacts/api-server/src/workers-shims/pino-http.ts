// Workers-only replacement for `pino-http`, aliased in via wrangler.toml.
// See workers-shims/pino.ts for why: pino-http's own module import of the
// real `pino` build fails at Cloudflare's validation step, not just
// bundling. This implements only what app.ts actually uses: attaching
// req.id / req.log, and one completion-line log per request using the
// same req/res serializers app.ts already passes in.

import type { NextFunction, Request, Response } from "express";
import type { ShimLogger } from "./pino";

type Serializer<T> = (value: T) => Record<string, unknown>;

interface PinoHttpOptions {
  logger: ShimLogger;
  serializers?: {
    req?: Serializer<Request>;
    res?: Serializer<Response>;
  };
}

let counter = 0;
function nextRequestId(): string {
  counter = (counter + 1) % Number.MAX_SAFE_INTEGER;
  return `${Date.now().toString(36)}-${counter}`;
}

export default function pinoHttp(opts: PinoHttpOptions) {
  const { logger, serializers } = opts;
  return function pinoHttpMiddleware(req: Request, res: Response, next: NextFunction) {
    // req.id / req.log are typed by the real pino-http package's ambient
    // Express augmentation (still present as a devDependency for that
    // type info, even though the runtime module is aliased away) — cast
    // through unknown since ShimLogger deliberately doesn't implement
    // pino.Logger's full surface (fatal/trace/silent/etc.), only what
    // this codebase actually calls.
    req.id = nextRequestId();
    req.log = logger as unknown as Request["log"];

    res.on("finish", () => {
      const reqFields = serializers?.req ? serializers.req(req) : { id: req.id, method: req.method, url: req.url };
      const resFields = serializers?.res ? serializers.res(res) : { statusCode: res.statusCode };
      logger.info({ req: reqFields, res: resFields }, "request completed");
    });

    next();
  };
}
