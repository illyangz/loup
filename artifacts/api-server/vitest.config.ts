import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    // Multiple test files now open real connections to the same file-backed
    // PGlite store (tenant-isolation, widget-token, and the express apps in
    // idempotency all import @workspace/db). PGlite's single connection isn't
    // safe for concurrent access from separate vitest workers — run test
    // files sequentially to avoid intermittent WASM aborts.
    fileParallelism: false,
  },
});