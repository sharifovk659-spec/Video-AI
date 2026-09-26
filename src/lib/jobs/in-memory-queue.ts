import type { JobEnqueuePayload, JobQueue } from "@/lib/jobs/types";
import { kickGenerationWorker } from "@/lib/jobs/worker";

/** DB-backed queue: enqueue marks work and wakes the in-process / CLI worker. */
export class DatabaseJobQueue implements JobQueue {
  async enqueue(payload: JobEnqueuePayload): Promise<void> {
    void payload;
    kickGenerationWorker();
  }
}

export const jobQueue: JobQueue = new DatabaseJobQueue();
