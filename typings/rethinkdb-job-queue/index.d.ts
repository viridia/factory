// Type definitions for rethinkdb-job-queue
// Project: https://github.com/grantcarthew/node-rethinkdb-job-queue
import { EventEmitter } from 'events';

interface PredicateFunction<P> {
  (job: P): boolean;
}

declare class Queue<P extends Queue.Job> extends EventEmitter {
  public readonly name: string;
  public readonly id: string;
  public readonly host: string;
  public readonly port: number;
  public readonly db: string;
  //  get r () { return this._r }
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
  public addJob(job: P | [P]): Promise<[P]>;
  public createJob(jobData?: object): P;
  public findJob(predicate: Object | PredicateFunction<P>, raw?: boolean): Promise<[P]>;
  public getJob(job: string | P | [P]): Promise<[P]>;
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

  export interface Job {
    id?: string;
    name?: string;
    priority?: Priority;
    timeout?: number;
    retryDelay?: number;
    retryMax?: number;
    retryCount?: number;
    repeat?: boolean | number;
    repeatDelay?: number;
    processCount?: number;
    progress?: number;
    status?: string;
    log?: [LogEntry];
    dateCreated?: Date;
    dateStarted?: Date;
    dateFinished?: Date;
    queueId?: string;
  }

  /** Standard implementation of Job. Fields are filled in when the job is added. */
  export class AbstractJob {
    public id?: string;
    public name?: string;
    public priority?: Queue.Priority;
    public timeout?: number;
    public retryDelay?: number;
    public retryMax?: number;
    public retryCount?: number;
    public repeat?: boolean | number;
    public repeatDelay?: number;
    public processCount?: number;
    public progress?: number;
    public status?: string;
    public log?: [Queue.LogEntry];
    public dateCreated?: Date;
    public dateStarted?: Date;
    public dateFinished?: Date;
    public queueId?: string;
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
