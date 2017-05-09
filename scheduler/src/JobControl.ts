import * as Queue from 'rethinkdb-job-queue';

/** Data type used to signal a cancellation. */
interface Cancellation extends Error {
  cancelJob: boolean;
}

export default class JobControl<P extends Queue.Job> {
  public next: (error?: Error, job?: P | string) => void;

  constructor(next: (error?: Error, job?: P | string) => void) {
    this.next = next;
  }

  /** Indicate that the job should no longer be processed. */
  public cancel(reason: string) {
    const error = new Error(reason) as Cancellation;
    error.cancelJob = true;
    this.next(error);
  }

  /** Indicate that the job encountered a fatal error. */
  public fatal(error: Error) {
    (error as Cancellation).cancelJob = true;
    this.next(error);
  }

  /** Indicate that the job is complete. */
  public complete(message: string = 'complete') {
    this.next(null, message);
  }

  /** Indicate that the job should be rescheduled for a later time. */
  public reschedule(job: P, when?: Date) {
    if (when) {
      job.setDateEnable(when);
    }
    this.next(null, job);
  }
}
