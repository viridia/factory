import * as bodyParser from 'body-parser';
import * as express from 'express';
import config from './config';
import JobRoutes from './JobRoutes';

// Use require for imports where there is no type library.
const proxy = require('express-http-proxy');

export default class App {
  public express: express.Application;

  constructor() {
    this.express = express();
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
    new JobRoutes().apply(router);

    // Proxy frontend server.
    router.use('/', proxy(process.env.FRONTEND_PROXY_HOST));

    // Install the router.
    this.express.use(router);
  }
}
