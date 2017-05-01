// Type definitions for rethinkdb-job-queue
// Project: https://github.com/grantcarthew/node-rethinkdb-job-queue

interface PredicateFunction<P> {
  (job: P): boolean;
}

declare class Queue<P extends Queue.Job> {
  public name: string;
  public id: string;
  public host: string;
  //  get port () { return this._port }
  public db: string;
  //  get r () { return this._r }
  //  get changeFeed () { return this._changeFeed }
  //  get master () { return this._masterInterval > 0 }
  //  get masterInterval () { return this._masterInterval }
  //  get jobOptions () { return this._jobOptions }
  //  get limitJobLogs () { return this._limitJobLogs }
  //  get removeFinishedJobs () { return this._removeFinishedJobs }
  //  get running () { return this._running }
  //  get concurrency () { return this._concurrency }
  public paused: boolean;
  public idle: boolean;
  constructor(cxOptions?: Queue.ConnectionOptions, qOptions?: Queue.QueueOptions);
  public addJob(job: P | [P]): Promise<[P]>;
  public createJob(jobData?: object): P;
  public findJob(predicate: Object | PredicateFunction<P>, raw?: boolean): Promise<[P]>;
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
