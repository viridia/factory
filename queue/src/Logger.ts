import { Job } from './Job';
import { JobControl } from './JobControl';
import { Queue } from './Queue';

export class Logger<P extends Job> {
  private jobControl: JobControl<P>;

  constructor(jobControl: JobControl<P>) {
    this.jobControl = jobControl;
  }

  public add(level: string, message: string, data: object = {}): JobControl<P> {
    this.jobControl.queue.addLog(this.jobControl.job.id, level, message, data);
    return this.jobControl;
  }

  public info(message: string, data?: object): JobControl<P> {
    this.jobControl.queue.addLog(this.jobControl.job.id, 'info', message, data);
    return this.jobControl;
  }

  public warning(message: string, data?: object): JobControl<P> {
    this.jobControl.queue.addLog(this.jobControl.job.id, 'warning', message, data);
    return this.jobControl;
  }

  public error(message: string, data?: object): JobControl<P> {
    this.jobControl.queue.addLog(this.jobControl.job.id, 'error', message, data);
    return this.jobControl;
  }
}
