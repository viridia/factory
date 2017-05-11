import { NextFunction, Request, Response, Router } from 'express';

/** Defines routes for creating and monitoring jobs and tasks. */
export default class ConfigRoutes {
  private router: Router;

  constructor() {
    this.router = Router();
    this.routes();
  }

  /** Add this router to the parent router. */
  public apply(parent: Router): void {
    parent.use('/config', this.router);
  }

  private routes(): void {
    this.router.get('/', this.getConfig.bind(this));
  }

  private getConfig(req: Request, res: Response, next: NextFunction): void {
    res.json({ hosts: {
      deepstream: `${process.env.DEEPSTREAM_SERVICE_HOST}:${process.env.DEEPSTREAM_SERVICE_PORT}`,
    } });
  }
}
