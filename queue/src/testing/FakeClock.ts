import { Clock } from '../Clock';

export class FakeClock extends Clock {
  private currentTime: number;
  private callback: () => any;

  constructor(currentTime: number) {
    super();
    this.currentTime = currentTime;
    this.callback = null;
  }

  /** Advance the clock time by `interval` ms. */
  public advance(interval: number): void {
    this.setTime(this.currentTime + interval);
  }

  /** Set the current clock time. */
  public setTime(time: number): void {
    this.currentTime = Math.max(this.currentTime, time);
    if (this.wakeTime !== null && time >= this.wakeTime) {
      this.wakeTime = null;
      Promise.resolve(this.callback());
    }
  }

  public get now(): Date {
    return new Date(this.currentTime);
  }

  public get time(): number {
    return this.currentTime;
  }

  public after(interval: number): Date {
    return new Date(this.currentTime + interval);
  }

  public wakeAt(time: Date | number, callback: () => void): void {
    const wt = typeof time === 'number' ? this.currentTime + time : time.getTime();
    if (this.wakeTime === null || this.wakeTime < wt) {
      this.callback = callback;
      this.wakeTime = wt;
    }
  }

  public cancelWake() {
    if (this.wakeTimer) {
      this.wakeTimer = null;
      this.wakeTime = null;
      this.callback = null;
    }
  }
}
