// Type definitions for rethinkdb-job-queue
// Project: https://github.com/grantcarthew/node-rethinkdb-job-queue
import { EventEmitter } from 'events';

interface PredicateFunction<P> {
  (job: P): boolean;
}

interface ProcessCallback<P> {
  (job: P,
   next: (error?: Error, jobResult?: P | string) => void,
   onCancel: (job: P, cancellationCallback?: () => void) => void): void;
}

declare class Queue<P extends Queue.Job> extends EventEmitter {
  public readonly name: string;
  public readonly id: string;
  public readonly host: string;
  public readonly port: number;
  public readonly db: string;
  public readonly r: object; // Actually RethinkDbDash handle
  public readonly changeFeed: boolean;
  public readonly master: boolean;
  public readonly masterInterval: boolean | number;
  public jobOptions: Queue.JobOptions;
  public readonly  removeFinishedJobs: boolean | number;
  public readonly running: number;
  public concurrency: number;
  public readonly paused: boolean;
  public readonly idle: boolean;
  constructor(cxOptions?: Queue.ConnectionOptions, qOptions?: Queue.QueueOptions);
  public addJob(job: P | P[]): Promise<P[]>;
  public cancelJob(job: string | P | P[]): Promise<P[]>;
  public containsJobByName(name: string, raw?: boolean): Promise<boolean>;
  public createJob(jobData?: object): P;
  public drop(): Promise<boolean>;
  public findJob(predicate: Object | PredicateFunction<P>, raw?: boolean): Promise<P[]>;
  public findJobByName(name: string, raw?: boolean): Promise<P[]>;
  public getJob(job: string | P | P[]): Promise<P[]>;
  public pause(global: boolean): Promise<boolean>;
  public process(handler: ProcessCallback<P>): Promise<boolean>;
  public ready(): Promise<boolean>;
  public reanimateJob(job: string | P | P[], dateEnable?: Date): Promise<P[]>;
  public removeJob(job: string | P | P[]): Promise<P[]>;
  public reset(): Promise<number>;
  public resume(global: boolean): Promise<boolean>;
  public review(): Promise<object>;
  public stop(): Promise<boolean>;
  public summary(): Promise<object>;
}

declare namespace Queue {
  interface ConnectionOptions {
    host?: string;
    port?: number;
    db?: string;
  }

  interface QueueOptions {
    name?: string;
    databaseInitDelay?: number;
    queryRunOptions?: boolean;
    changeFeed?: boolean;
    concurrency?: number;
    masterInterval?: number;
    limitJobLogs?: number;
    removeFinishedJobs?: number | boolean;
  }

  enum Priority {
    lowest,
    low,
    normal,
    medium,
    high,
    highest,
  }

  interface JobOptions {
    name?: string;
    priority?: Priority;
    timeout?: number;
    retryDelay?: number;
    retryMax?: number;
    repeat?: boolean | number;
    repeatDelay?: number;
    dateEnable?: Date;
  }

  export class Job {
    public id?: string;
    public name?: string;
    public priority?: Priority;
    public timeout?: number;
    public retryDelay?: number;
    public retryMax?: number;
    public retryCount?: number;
    public repeat?: boolean | number;
    public repeatDelay?: number;
    public processCount?: number;
    public progress?: number;
    public status?: string;
    public log?: LogEntry[];
    public dateCreated?: Date;
    public dateEnable?: Date;
    public dateStarted?: Date;
    public dateFinished?: Date;
    public queueId?: string;
    public setName(name: string): this;
    public setPriority(priority: Priority): this;
    public setTimeout(timeout: number): this;
    public setDateEnable(dateEnable: Date): this;
    public setRetryMax(retryMax: number): this;
    public setRetryDelay(retryDelay: number): this;
    public setRepeat(repeat: boolean | number): this;
    public setRepeatDelay(repeatDelay: number): this;
    public updateProgress(percent: number): this;
    public update(): Promise<this>;
    public getCleanCopy(priorityAsString?: boolean): object;
    public addLog(data?: object, message?: string, type?: string, status?: string): Promise<boolean>;
    public getLastLog(): LogEntry;
  }

  export interface LogEntry {
    date: Date;
    message?: string;
    queueId: string;
    status?: string;
    type?: string;
    data?: Object;
    // retryCount
  }
}

export = Queue;
