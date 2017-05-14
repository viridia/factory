
/** Class representing a system clock. */
export class Clock {
  protected wakeTime: number;
  protected wakeTimer: NodeJS.Timer;

  constructor() {
    this.wakeTime = null;
    this.wakeTimer = null;
  }

  /** Get the current time in milliseconds. */
  public get time(): number {
    return Date.now();
  }

  /** Get the current time as a Date object. */
  public get now(): Date {
    return new Date();
  }

  /** Get a date some number of milliseconds in the future. */
  public after(interval: number): Date {
    return new Date(Date.now() + interval);
  }

  /** Set an alarm for some time in the future. If called a second time, it will replace the
      current alarm with the earlier of the two times. */
  public wakeAt(time: Date | number, callback: () => void): void {
    const wt = typeof time === 'number' ? Date.now() + time : time.getTime();
    if (this.wakeTime === null || this.wakeTime < wt) {
      clearTimeout(this.wakeTimer);
      this.wakeTime = wt;
      this.wakeTimer = setTimeout(() => {
        this.wakeTime = null;
        this.wakeTimer = null;
        callback();
      }, Math.max(0, wt - Date.now()));
    }
  }

  /** Cancel the current wakeup timer. */
  public cancelWake() {
    if (this.wakeTimer) {
      clearTimeout(this.wakeTimer);
      this.wakeTimer = null;
      this.wakeTime = null;
    }
  }
}
