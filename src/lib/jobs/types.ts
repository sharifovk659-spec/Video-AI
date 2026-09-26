export type JobEnqueuePayload = {
  generationId: string;
};

export interface JobQueue {
  enqueue(payload: JobEnqueuePayload): Promise<void>;
}
