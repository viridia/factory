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
  table?: string;
  checkInterval?: number;
  processTimeout?: number;
}

export interface Logger {
  add(level: string, message: string, data?: any): void;
  info(message: string, data?: any): void;
  warning(message: string, data?: any): void;
  error(message: string, data?: any): void;
}

export default class Queue<P extends Job> extends EventEmitter {
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

  constructor(connection: Connection, options: QueueOptions = {}) {
    super();
    this.conn = connection;
    this.table = options.table || 'Queue';
    this.logTable = `${this.table}_Logs`;
    this.checkInterval = options.checkInterval || 1000 * 5;
    this.processTimeout = options.processTimeout || 1000  * 60 * 60;
    this.processCursor = null;
    this.processCallback = null;
    this.clock = new Clock();
    this.ready = r.dbList().run(this.conn).then(dbs => {
      const dbName = options.db || 'JQueue';
      if (dbs.indexOf(dbName) < 0) {
        return r.dbCreate(dbName).run(this.conn).then(() => {
          this.dbHandle = r.db(dbName);
        });
      } else {
        this.dbHandle = r.db(dbName);
        return null;
      }
    }).then(() => {
      return this.ensureTablesExist([this.table, this.logTable]);
    });

    this.processTask = this.processTask.bind(this);
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

  public createJob(jobSpec: Partial<P>): P {
    // Don't allow these fields to be set manually.
    delete jobSpec.id;
    delete jobSpec.state;
    return {
      ...(jobSpec as any),
      state: RunState.WAITING,
      when: jobSpec.when || this.clock.now,
    };
  }

  /** Add a job to the queue.
      @returns The number of jobs added (always 1).
  */
  public addJob(job: P): Promise<P> {
    delete job.id;
    return this.db.table(this.table)
        .insert(job, { returnChanges: true })
        .run(this.conn).then((result: any) => {
          return result.changes[0].new_val;
        });
  }

  public addLog(job: Job | string, level: string, message: string, data: any = {}): Promise<any> {
    return this.db.table(this.logTable).insert({
      job: typeof(job) === 'string' ? job : job.id,
      level,
      message,
      data,
      date: this.clock.now,
    }).run(this.conn);
  }

  public get(jobId: string): Promise<P> {
    return this.db.table(this.table).get(jobId).run(this.conn).then(cursor => {
      return cursor.toArray().then(jobs => {
        return jobs[0];
      });
    });
  }

  public getControl(jobId: string): Promise<JobControl<P>> {
    return this.db.table(this.table).get(jobId).run(this.conn).then(cursor => {
      const pending = {};
      return cursor.toArray().then(jobs => {
        const job = jobs[0];
        return new JobControl<P>(this, job, pending, () => {
          this.db.table(this.table).get(job.id).update(pending).run(this.conn);
        });
      });
    });
  }

  public getLogs(jobId: string): Promise<LogEntry[]> {
    return this.db.table(this.logTable).filter({ job: jobId }).run(this.conn)
    .then(cursor => cursor.toArray());
  }

  public watchLogs(jobId: string): Promise<LogEntry[]> {
    return this.db.table(this.logTable).filter({ job: jobId }).run(this.conn)
    .then(cursor => cursor.toArray());
  }

  public async process(callback: (job: P, control: JobControl<P>) => void) {
    this.processCallback = callback;
    this.clock.wakeAt(0, this.processTask);
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
    this.clock.wakeAt(this.checkInterval, this.processTask);

    // Watch for any queue entries that are due before the end of the window.
    // console.log('beginning watch');
    this.processCursor = await this.db.table(this.table)
        .filter(r.row('state').le(RunState.RUNNING))
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
          this.processDueJob(job.id);
        } else {
          // console.log('change due soon', when.getTime() - windowBegin.getTime());
          this.clock.wakeAt(job.when, this.processTask);
        }
      }
    });
  }

  private async processDueJob(jobId: string): Promise<void> {
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
      const pending = {
        // Default date is the next check interval.
        when: this.clock.after(this.checkInterval),
      };
      // Create the JobControl object and pass it to the callback.
      const jc = new JobControl<P>(this, job, pending, () => {
        // The callback should have, at some point, committed their changes.
        this.db.table(this.table).get(job.id).update(pending).run(this.conn);
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
}
