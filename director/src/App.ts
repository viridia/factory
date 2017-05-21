import * as bodyParser from 'body-parser';
import * as deepstream from 'deepstream.io-client-js';
import * as express from 'express';
import * as fs from 'fs';
import * as r from 'rethinkdb';
import { connect, Connection, Db } from 'rethinkdb';
import { ensureDbsExist, ensureTablesExist } from '../../common/db/util';
import { JobRecord, TaskRecord } from '../../common/queue';
import * as queue from '../../queue';
import ConfigRoutes from './ConfigRoutes';
import JobRoutes from './JobRoutes';
import { logger } from './logger';
import RecipeRoutes from './RecipeRoutes';

// Use require for imports where there is no type library.
const proxy = require('express-http-proxy');

export default class App {
  public express: express.Application;
  public deepstream: deepstreamIO.Client;
  public ready: Promise<void>;
  private conn: Connection;
  private jobQueue: queue.Queue<JobRecord>;
  private taskQueue: queue.Queue<TaskRecord>;
  private db: Db;

  /** Construct an instance of App.
      @param deepstream An instance of a deepstream.io client. This should be null except in
          test environments whre you want to substitute a mock implementation.
  */
  constructor(deepstream: deepstreamIO.Client = null) {
    this.deepstream = deepstream;
    this.express = express();
    this.ready = this.init(); // Asynchronous initialization.
  }

  private async init() {
    const dsHost = `${process.env.DEEPSTREAM_SERVICE_HOST}:${process.env.DEEPSTREAM_SERVICE_PORT}`;
    logger.info(`Connecting to Deepstream router: ${dsHost}.`);
    this.deepstream = deepstream(dsHost).login();

    logger.info(`Connecting to RethinkDB: ${process.env.RETHINKDB_PROXY_SERVICE_HOST}:` +
        `${process.env.RETHINKDB_PROXY_SERVICE_PORT}.`);
    this.conn = await connect({
      host: process.env.RETHINKDB_PROXY_SERVICE_HOST,
      port: process.env.RETHINKDB_PROXY_SERVICE_PORT,
    });

    await ensureDbsExist(this.conn, [process.env.DB_NAME]);

    // Create the recipes table if it does not exist.
    this.db = r.db(process.env.DB_NAME);
    await ensureTablesExist(this.conn, process.env.DB_NAME, ['Recipes']);

    logger.info(`Connecting to job queue ${process.env.DB_NAME}:${process.env.JOB_QUEUE_NAME}.`);
    this.jobQueue = new  queue.Queue<JobRecord>(this.conn, {
      db: process.env.DB_NAME,
      name: process.env.JOB_QUEUE_NAME,
    });

    logger.info(`Connecting to task queue ${process.env.DB_NAME}:${process.env.TASK_QUEUE_NAME}.`);
    this.taskQueue = new queue.Queue<TaskRecord>(this.conn, {
      db: process.env.DB_NAME,
      name: process.env.TASK_QUEUE_NAME,
    });

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
    new RecipeRoutes(this.conn, this.db).apply(apiRouter);
    apiRouter.get('/healthz', (req, res, next) => {
      res.json({ health: 'OK' });
    });

    // Proxy frontend server.
    if (process.env.FRONTEND_PROXY_HOST) {
      router.use('/', proxy(process.env.FRONTEND_PROXY_HOST));
    }

    // Install the router.
    this.express.use(router);
  }
}
