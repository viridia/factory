import * as r from 'rethinkdb';
import { connect, Connection, Db } from 'rethinkdb';
import { ensureDbsExist, ensureTablesExist } from '../../common/db/util';
import { TaskRecord } from '../../common/queue';
import * as queue from '../../queue';

class Agent {
  public ready: Promise<void>;
  private conn: Connection;
  private taskQueue: queue.Queue<TaskRecord>;
  private db: Db;

  constructor() {
    this.ready = connect({
      host: process.env.RETHINKDB_PROXY_SERVICE_HOST,
      port: process.env.RETHINKDB_PROXY_SERVICE_PORT,
    }).then((conn: Connection) => {
      this.conn = conn;
      return ensureDbsExist(this.conn, [process.env.DB_NAME]);
    }).then(() => {
      // Create the recipes table if it does not exist.
      this.db = r.db(process.env.DB_NAME);
    }).then(() => {
      this.taskQueue = new queue.Queue<TaskRecord>(this.conn, {
        db: process.env.DB_NAME,
        name: process.env.TASK_QUEUE_NAME,
      });
    });
  }

  public run() {
    // console.log();
  }
}

const agent = new Agent();
agent.ready.then(() => {
  agent.run();
});
