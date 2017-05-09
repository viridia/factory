import * as bodyParser from 'body-parser';
import * as deepstream from 'deepstream.io-client-js';
import * as express from 'express';
import * as fs from 'fs';
import * as Queue from 'rethinkdb-job-queue';
import { JobRecord, TaskRecord } from '../../common/types/queue';
import config from './config';
import ConfigRoutes from './ConfigRoutes';
import JobRoutes from './JobRoutes';
import { logger } from './logger';
import RecipeRoutes from './RecipeRoutes';

// Use require for imports where there is no type library.
const proxy = require('express-http-proxy');

export default class App {
  public express: express.Application;
  public deepstream: deepstreamIO.Client;
  private jobQueue: Queue<JobRecord>;
  private taskQueue: Queue<TaskRecord>;
  private db: any;

  constructor() {
    const host = process.env.RETHINKDB_PROXY_SERVICE_HOST;
    const port = process.env.RETHINKDB_PROXY_SERVICE_PORT;
    this.express = express();
    this.deepstream = deepstream(process.env.DEEPSTREAM_HOST).login();
    this.jobQueue = new Queue<JobRecord>({ host, port, db: process.env.DB_NAME }, {
      name: process.env.JOB_QUEUE_NAME,
    });
    this.taskQueue = new Queue<TaskRecord>({ host, port, db: process.env.DB_NAME }, {
      name: process.env.TASK_QUEUE_NAME,
    });

    // Create the recipes table if it does not exist.
    const r = (this.jobQueue as any).r; // TODO: Typescript compiler bug?
    this.db = r.db(process.env.DB_NAME);
    this.ensureTablesExist(this.db, ['Recipes']);

    // Install middlewares and routes
    this.middleware();
    this.routes();
  }

  /** Install needed middleware. */
  private middleware(): void {
    this.express.use(bodyParser.json());
  }

  /** Set up routes. */
  private routes(): void {
    const router = express.Router();

    // Add the router for the jobs API.
    const apiRouter = express.Router();
    router.use('/api/v1', apiRouter);
    new ConfigRoutes().apply(apiRouter);
    new JobRoutes(this.jobQueue, this.taskQueue, this.deepstream).apply(apiRouter);
    new RecipeRoutes((this.jobQueue as any).r).apply(apiRouter);

    // Proxy frontend server.
    router.use('/', proxy(process.env.FRONTEND_PROXY_HOST));

    // Install the router.
    this.express.use(router);
  }

  private ensureTablesExist(db: any, tableNames: string[]): Array<Promise<{}>> {
    const promises: Array<Promise<{}>> = [];
    db.tableList().then((tables: string[]) => {
      for (const tableName of tableNames) {
        if (tables.indexOf(tableName) < 0) {
          logger.info(`Creating table "${tableName}"`);
          promises.push(db.tableCreate(tableName).run()); // Let exception propagate
        }
      }
    });
    return promises;
  }
}
