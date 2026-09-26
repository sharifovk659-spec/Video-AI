#!/usr/bin/env tsx
import { createLogger } from "@/lib/logger";
import { processGenerationJobs } from "@/lib/jobs/worker";
import { getEnv } from "@/lib/config/env";

const log = createLogger("worker-cli");

async function main() {
  getEnv();
  log.info("Generation worker started");

  for (;;) {
    const processed = await processGenerationJobs(10);
    if (processed === 0) {
      await new Promise((r) =>
        setTimeout(r, getEnv().GENERATION_POLL_INTERVAL_MS),
      );
    }
  }
}

main().catch((error) => {
  log.error("Worker crashed", {
    message: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
