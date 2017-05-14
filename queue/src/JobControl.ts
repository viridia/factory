import { RunState } from '../../common/types/api';
import { Job } from './Job';
import { Logger } from './Logger';
import Queue from './Queue';

/** Properties that update() is not allowed to touch. */
const PROTECTED_PROPERTIES: any = {
  id: true,
  when: true,
};

export class JobControl<P extends Job> {
  // public readonly queue: Queue;
  public readonly job: P;
  public readonly queue: Queue<P>;
  private updates: any;
  private logger?: Logger<P>;
  private commit: () => void;

  /** Construct a new JobControl object.
      @param queue The queue containing the job.
      @param job The job record.
      @param updates An object containing all of the fields of the job that will be changed
          at the end of the transaction.
  */
  constructor(queue: Queue<P>, job: P, updates: object, commit: () => void) {
    this.queue = queue;
    this.job = job;
    this.updates = updates;
    this.commit = commit;
  }

  /** Returns a logger instance bound to this job. Individual log functions return a reference
      back to this object for additional chaining.
      Usage:
        control.log.error('error message').cancel();
      @returns A logger object.
  */
  public get log(): Logger<P> {
    if (!this.logger) {
      this.logger = new Logger(this);
    }
    return this.logger;
  }

  /** Set properties to be updated. */
  public update(properties: Partial<P>): this {
    const filteredProperties: any = {};
    for (const key of Object.getOwnPropertyNames(properties)) {
      if (!PROTECTED_PROPERTIES[key]) {
        this.updates[key] = (properties as any)[key];
      }
    }
    return this;
  }

  /** Reschedule the job for a future time and commit changes. */
  public reschedule(when?: number | Date): this {
    if (typeof when === 'number') {
      this.updates.when = this.queue.clock.after(when);
    } else if (when) {
      this.updates.when = when;
    } else {
      this.updates.when = this.queue.clock.after(this.queue.checkInterval);
    }
    this.commit();
    return this;
  }

  /** Mark the job as cancelled and commit changes. */
  public cancel(reason?: string | Error): void {
    let message = 'Job Cancelled';
    if (typeof(reason) === 'string') {
      message = `Job Cancelled: ${reason}`;
    } else if (reason && typeof reason.toString === 'function') {
      message = `Job Cancelled: ${reason.toString()}`;
    }
    this.queue.addLog('info', this.job.id, message);
    this.updates.state = RunState.CANCELLED;
    this.updates.endedAt = new Date();
    this.commit();
  }

  /** Mark the job as failed and commit changes. */
  public fail(reason?: string | Error): void {
    let message = 'Job Failed';
    if (typeof(reason) === 'string') {
      message = `Job Failed: ${reason}`;
    } else if (reason && typeof reason.toString === 'function') {
      message = `Job Failed: ${reason.toString()}`;
    }
    this.queue.addLog('info', this.job.id, message);
    this.updates.state = RunState.FAILED;
    this.updates.endedAt = new Date();
    this.commit();
  }

  /** Mark the job as finished and commit changes. */
  public finish(message?: string): void {
    this.queue.addLog('info', this.job.id, message || 'Job finished successfully');
    this.updates.state = RunState.COMPLETED;
    this.updates.endedAt = new Date();
    this.commit();
  }

  /** Commit all of the changes we've made to the job. */
  public end() {
    this.commit();
  }
}
