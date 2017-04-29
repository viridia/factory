import * as express from 'express';
import * as bodyParser from 'body-parser';
import JobRoutes from './JobRoutes';

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
    let router = express.Router();
    router.get('/', (req, res, next) => {
      res.json({
        message: 'Hello World!'
      });
    });
    new JobRoutes().apply(router);
    router.get('*', (req, res, next) => {
      res.status(404);
    });
    this.express.use(router);
  }
}
