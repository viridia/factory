import * as bodyParser from 'body-parser';
import * as deepstream from 'deepstream.io-client-js';
import * as express from 'express';
import * as fs from 'fs';
import * as r from 'rethinkdb';
import { connect, Connection, Db } from 'rethinkdb';
import { ensureDbsExist, ensureTablesExist } from '../../common/db/util';
import { JobRecord, TaskRecord } from '../../common/types/queue';
import * as queue from '../../queue';
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
  public ready: Promise<void>;
  private conn: Connection;
  private jobQueue: queue.Queue<JobRecord>;
  private taskQueue: queue.Queue<TaskRecord>;
  private db: Db;

  constructor() {
    this.express = express();
    this.deepstream = deepstream(
      `${process.env.DEEPSTREAM_SERVICE_HOST}:${process.env.DEEPSTREAM_SERVICE_PORT}`).login();

    this.ready = connect({
      host: process.env.RETHINKDB_PROXY_SERVICE_HOST,
      port: process.env.RETHINKDB_PROXY_SERVICE_PORT,
    }).then((conn: Connection) => {
      this.conn = conn;
      return ensureDbsExist(this.conn, [process.env.DB_NAME]);
    }).then(() => {
      // Create the recipes table if it does not exist.
      this.db = r.db(process.env.DB_NAME);
      ensureTablesExist(this.conn, process.env.DB_NAME, ['Recipes']);
    }).then(() => {
      this.jobQueue = new  queue.Queue<JobRecord>(this.conn, {
        db: process.env.DB_NAME,
        name: process.env.JOB_QUEUE_NAME,
      });
      this.taskQueue = new queue.Queue<TaskRecord>(this.conn, {
        db: process.env.DB_NAME,
        name: process.env.TASK_QUEUE_NAME,
      });

      // Install middlewares and routes
      this.middleware();
      this.routes();
    });
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

    // Proxy frontend server.
    router.use('/', proxy(process.env.FRONTEND_PROXY_HOST));

    // Install the router.
    this.express.use(router);
  }
}
