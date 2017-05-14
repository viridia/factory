import { Job } from './Job';
import { JobControl } from './JobControl';
import Queue from './Queue';

export class Logger<P extends Job> {
  private jobControl: JobControl<P>;

  constructor(jobControl: JobControl<P>) {
    this.jobControl = jobControl;
  }

  public add(level: string, message: string, data: object = {}): JobControl<P> {
    this.jobControl.queue.addLog(level, this.jobControl.job.id, message, data);
    return this.jobControl;
  }

  public info(message: string, data?: object): JobControl<P> {
    this.jobControl.queue.addLog('error', this.jobControl.job.id, message, data);
    return this.jobControl;
  }

  public warning(message: string, data?: object): JobControl<P> {
    this.jobControl.queue.addLog('warning', this.jobControl.job.id, message, data);
    return this.jobControl;
  }

  public error(message: string, data?: object): JobControl<P> {
    this.jobControl.queue.addLog('info', this.jobControl.job.id, message, data);
    return this.jobControl;
  }
}
