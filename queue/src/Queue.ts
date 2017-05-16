import { EventEmitter } from 'events';
import { ChangesOptions, Connection, Cursor, Db, now, Table } from 'rethinkdb';
import * as r from 'rethinkdb';
import { RunState } from '../../common/types/api';
import { Clock } from './Clock';
import { Job } from './Job';
import { JobControl } from './JobControl';
import { LogEntry } from './LogEntry';

export interface QueueOptions {
  db?: string;
  name?: string; // Table name of the queue
  checkInterval?: number;
  processTimeout?: number;
}

export interface Logger {
  add(level: string, message: string, data?: any): void;
  info(message: string, data?: any): void;
  warning(message: string, data?: any): void;
  error(message: string, data?: any): void;
}

export class Queue<P extends Job> extends EventEmitter {
  public readonly checkInterval: number;
  public readonly processTimeout: number;
  public ready: Promise<any>;
  public table: string;
  public logTable: string;
  public clock: Clock;
  private conn: Connection;
  private dbHandle: Db;
  private processCursor: Cursor;
  private processCallback: (job: P, control: JobControl<P>) => void;
  private wakeCallback: () => void;

  constructor(connection: Connection, options: QueueOptions = {}) {
    super();
    this.conn = connection;
    this.table = options.name || 'Queue';
    this.logTable = `${this.table}_Logs`;
    this.checkInterval = options.checkInterval || 1000 * 5;
    this.processTimeout = options.processTimeout || 1000  * 60 * 60;
    this.processCursor = null;
    this.processCallback = null;
    // this.processTask = this.processTask.bind(this);
    this.wakeCallback = () => { this.processTask(); };
    this.clock = new Clock();
    this.ready = r.dbList().run(this.conn).then(dbs => {
      const dbName = options.db || 'JobQueue';
      if (dbs.indexOf(dbName) < 0) {
        return r.dbCreate(dbName).run(this.conn).then(() => {
          this.dbHandle = r.db(dbName);
        });
      } else {
        this.dbHandle = r.db(dbName);
        return null;
      }
    }).then(() => {
      if (!this.db) {
        throw Error('DB initialization failed.');
      }
      return this.ensureTablesExist([this.table, this.logTable]);
    }).then(() => {
      return this.ensureIndicesExist(this.logTable, ['job']);
    });
  }

  public get db() {
    return this.dbHandle;
  }

  public clear() {
    return Promise.all([
      this.db.table(this.table).delete().run(this.conn),
      this.db.table(this.logTable).delete().run(this.conn),
    ]);
  }

  public create(jobSpec: Partial<P>): P {
    // Don't allow this field to be set manually.
    delete jobSpec.id;
    return {
      ...(jobSpec as any),
      state: jobSpec.state !== undefined ? jobSpec.state : RunState.READY,
      when: jobSpec.when || this.clock.now,
    };
  }

  /** Add a job to the queue.
      @returns A promise containing an array of job objects.
  */
  public addJob(job: P | P[]): Promise<P[]> {
    const jobArray = Array.isArray(job) ? job : [job];
    return this.db.table(this.table)
        .insert(jobArray, { returnChanges: true })
        .run(this.conn).then((result: any) => {
          return result.changes.map((ch: { new_val: Job }) => ch.new_val);
        });
  }

  public get(jobId: string): Promise<P> {
    return this.db.table(this.table).get(jobId).run(this.conn).then(job => {
      return job as any; // Because of incorrect RethinkDB @types signature.
    });
  }

  public find(query: any): Promise<P[]> {
    return this.db.table(this.table).filter(query).run(this.conn).then(cursor => {
      return cursor.toArray();
    });
  }

  public cancel(jobs: string | string[]): Promise<number> {
    const idList = Array.isArray(jobs) ? jobs : [jobs];
    return this.db.table(this.table).getAll(...idList).update({ state: RunState.CANCELLED })
    .run(this.conn).then(result => {
      return result.replaced;
    });
  }

  public delete(jobs: string | string[]): Promise<number> {
    const idList = Array.isArray(jobs) ? jobs : [jobs];
    return this.db.table(this.table).getAll(...idList).delete().run(this.conn).then(result => {
      return result.deleted;
    });
  }

  /** Wake one or more sleeping jobs.
      @param jobs List of job ids to wake.
      @param when At what time should the jobs be woken up. If the job's wake time is sooner
          than this, then the job will not be updated.
      @return The number of jobs woken.
  */
  public wake(jobs: string | string[], when: Date | number): Promise<number> {
    const idList = Array.isArray(jobs) ? jobs : [jobs];
    const due = typeof(when) === 'number' ? this.clock.after(when) : when;
    return this.db.table(this.table).getAll(...idList)
        .filter(r.row('state').lt(RunState.WAITING))
        .filter(r.row('when').gt(due))
        .update({ when: due })
        .run(this.conn).then(result => {
      return result.replaced;
    });
  }

  /** Create a jobControl object for a job. A JobControl object represents a transaction to
      update the properties or running state of a job, or to add log entries for the job.
      @param job The job.
      @return A JobControl object for the given job.
    */
  public getControl(job: P): JobControl<P> {
    const pending = {};
    return new JobControl<P>(this, job, pending, () => {
      return this.db.table(this.table).get(job.id).update(pending, { returnChanges: true })
      .run(this.conn).then((updateResult: any) => {
        return updateResult.changes.length > 0 ? updateResult.changes[0].new_val : job;
      });
    });
  }

  public addLog(job: Job | string, level: string, message: string, data: any = {}): Promise<any> {
    if (level !== 'info' && level !== 'error' && level !== 'warning') {
      throw Error(`Unknown logging level: ${level}.`);
    }
    return this.db.table(this.logTable).insert({
      job: typeof(job) === 'string' ? job : job.id,
      level,
      message,
      data,
      date: this.clock.now,
    }).run(this.conn);
  }

  public deleteLogs(jobs: string | string[]): Promise<number> {
    const idList = Array.isArray(jobs) ? jobs : [jobs];
    return this.db.table(this.logTable)
        .filter((entry: LogEntry) => entry.job in idList).delete()
        .run(this.conn).then(result => {
          return result.deleted;
        });
  }

  public getLogs(jobId: string): Promise<LogEntry[]> {
    return this.db.table(this.logTable).filter({ job: jobId }).orderBy('date').run(this.conn)
    .then(cursor => cursor.toArray());
  }

  public watchLogs(jobId: string): Promise<LogEntry[]> {
    return this.db.table(this.logTable).filter({ job: jobId }).orderBy('date').run(this.conn)
    .then(cursor => cursor.toArray());
  }

  public async process(callback: (job: P, control: JobControl<P>) => void) {
    if (!this.db) {
      throw Error('DB not open.');
    }
    this.processCallback = callback;
    this.clock.wakeAt(0, this.wakeCallback);
  }

  public stop() {
    if (this.processCursor) {
      this.processCursor.close();
      this.processCursor = null;
    }
    this.clock.cancelWake();
  }

  // Theory of operation: We can use RethinkDB changefeed to inform us if any jobs were added to
  // the queue that are due. However, the clock time of the subscription won't automatically update;
  // we have to periodically close the changefeed cursor and recreate it with a new timestamp.
  // So the way to handle that is to set up the changefeed query to tell us about jobs that are
  // five minutes (the check interval) in the future or less. Jobs which are due now are processed
  // immediately. Jobs which are not due yet but are due within the next check interval are used
  // to set a timer for when we should destroy and re-create the changefeed query.
  //
  // What this means is that as jobs are posted to the queue, if they are due now they will wake
  // up the processor and be handled immediately; If they are are due within five minutes, then
  // they will also wake up the processor, but only to reset the timer; And if they are not due
  // within five minutes, they will not wake up the processor at all (but the processor will wake
  // up in five minutes anyway).
  //
  // The net result of all this is that there should be minimal CPU usage when the queue is sparsely
  // populated, and there should be near-zero latency between a job's due date and when it actually
  // gets processed. The only actual latency should be the result of the CPU usage of processing
  // any prior jobs that occurred around the same time.
  private async processTask() {
    // Watch for changes on all queue entries that have a ready date in the past.
    if (this.processCursor) {
      this.processCursor.close();
      this.processCursor = null;
    }

    // Define a time window consisting of the interval [now, now + checkInterval].
    const windowBegin = this.clock.now;
    const windowEnd = this.clock.after(this.checkInterval);
    this.clock.wakeAt(this.checkInterval, this.wakeCallback);

    // Watch for any queue entries that are due before the end of the window.
    // console.log('beginning watch');
    this.processCursor = await this.db.table(this.table)
        .filter(r.row('state').lt(RunState.WAITING))
        .filter(r.row('when').le(windowEnd))
        .changes({ includeInitial: true, squash: true } as ChangesOptions)
        .run(this.conn);

    // As we get called:
    // * if an entry is due now, then process it.
    // * if an entry is due before the end of the window, then use it to compute the next check.
    // let nextEventTime = windowEnd;
    this.processCursor.each((e: any, change) => {
      if (e) {
        if (e.msg === 'Cursor is closed.') {
          return;
        }
        console.error('change error', e);
      } else if (change.new_val) {
        const job = change.new_val;
        // console.log('got change', job.id, job.when.getTime());
        if (job.when.getTime() <= this.clock.time) {
          this.processOneJob(job.id);
        } else {
          // console.log('change due soon', job.when.getTime() - windowBegin.getTime());
          this.clock.wakeAt(job.when, this.wakeCallback);
        }
      }
    });
  }

  private async processOneJob(jobId: string): Promise<void> {
    // Try to update the due time before another process gets it.
    const updateResult: any = await this.db.table(this.table).get(jobId).update({
      when: r.branch(
        r.row('when').le(this.clock.now),
        r.expr(this.clock.after(this.processTimeout)),
        r.row('when'),
      ),
    }, {
      returnChanges: true,
    }).run(this.conn);
    if (updateResult.replaced) {
      // We got there before any other process did.
      const job: P = updateResult.changes[0].new_val;
      // Set up the pending changes to make to the object.
      const pending: any = {
        // Default date is the next check interval.
        when: this.clock.after(this.checkInterval),
      };
      // If job is in the 'ready' state, change it to 'running'.
      if (job.state === RunState.READY) {
        job.state = pending.state = RunState.RUNNING;
        job.startedAt = pending.startedAt = this.clock.now;
      }
      // Create the JobControl object and pass it to the callback.
      const jc = new JobControl<P>(this, job, pending, () => {
        // The callback should have, at some point, committed their changes.
        return this.db.table(this.table).get(job.id).update(pending, { returnChanges: true })
        .run(this.conn).then((result: any) => {
          return result.changes.length > 0 ? result.changes[0].new_val : job;
        });
      });
      // Call the application callback.
      this.processCallback(job, jc);
    }
  }

  private ensureTablesExist(tables: string[]) {
    return this.db.tableList().run(this.conn).then(existingTables => {
      const promises: Array<Promise<any>> = [];
      for (const table of tables) {
        if (existingTables.indexOf(table) < 0) {
          promises.push(this.db.tableCreate(table).run(this.conn));
        }
      }
      return Promise.all(promises);
    });
  }

  private ensureIndicesExist(table: string, indices: string[]) {
    return this.db.table(table).indexList().run(this.conn).then(existing => {
      const promises: Array<Promise<any>> = [];
      for (const idx of indices) {
        if (existing.indexOf(idx) < 0) {
          promises.push(this.db.table(table).indexCreate(idx).run(this.conn));
        }
      }
      return Promise.all(promises);
    });
  }
}
