import * as bodyParser from 'body-parser';
import * as deepstream from 'deepstream.io-client-js';
import * as express from 'express';
import * as fs from 'fs';
import * as Queue from 'rethinkdb-job-queue';
import { JobRecord } from '../../common/types/queue';
import config from './config';
import ConfigRoutes from './ConfigRoutes';
import JobRoutes from './JobRoutes';
import RecipeRoutes from './RecipeRoutes';

// Use require for imports where there is no type library.
const proxy = require('express-http-proxy');

export default class App {
  public express: express.Application;
  public deepstream: deepstreamIO.Client;
  private jobQueue: Queue<JobRecord>;

  constructor() {
    const [host, port] = process.env.RETHINKDB_HOST.split(':');
    this.express = express();
    this.deepstream = deepstream(process.env.DEEPSTREAM_HOST).login();
    this.jobQueue = new Queue<JobRecord>({ host, port, db: process.env.RETHINKDB_DB }, {
      name: 'JobQueue',
    });

    // Create the recipes table if it does not exist.
    const r = this.jobQueue.r;
    const db = r.db('Factory');
    this.ensureTablesExist(db, ['Recipes']);
    // db.tableList().then((tables: string[]) => {
    //   if (tables.indexOf('Recipes') < 0) {
    //     db.tableCreate('Recipes').then((result: any) => {
    //       if (result.tables_created === 1) {
    //         this.loadRecipes();
    //       }
    //     });
    //   } else {
    //     this.loadRecipes();
    //   }
    // });

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
    new JobRoutes(this.jobQueue, this.deepstream).apply(apiRouter);
    new RecipeRoutes(this.jobQueue.r).apply(apiRouter);

    // Proxy frontend server.
    router.use('/', proxy(process.env.FRONTEND_PROXY_HOST));

    // Install the router.
    this.express.use(router);
  }

  // private loadRecipes() {
  //   fs.readdir('./recipes', (err: NodeJS.ErrnoException, files: string[]) => {
  //     for (const file of files) {
  //       const json = JSON.parse(fs.readFileSync(`./recipes/${file}`).toString());
  //       console.info(file);
  //     }
  //     // this.jobQueue.r.table('Recipes').run((result: any) => {
  //     //   console.info(result);
  //     // });
  //   });
  // }

  private ensureTablesExist(db: any, tableNames: string[]): Array<Promise<{}>> {
    const promises: Array<Promise<{}>> = [];
    db.tableList().then((tables: string[]) => {
      for (const tableName of tableNames) {
        if (tables.indexOf(tableName) < 0) {
          promises.push(db.tableCreate(tableName)); // Let exception propagate
        }
      }
    });
    return promises;
  }
}
