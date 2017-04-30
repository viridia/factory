import { NextFunction, Request, Response, Router } from 'express';
import * as express from 'express';

/** Defines routes for creating and monitoring jobs and tasks. */
export default class JobRoutes {
  private router: express.Router;

  constructor() {
    this.router = express.Router();
    this.routes();
  }

  /** Add this router to the parent router. */
  public apply(parent: express.Router): void {
    parent.use('/api/v1', this.router);
  }

  private routes(): void {
    this.router.get('/jobs/:id', this.getJob);
    this.router.get('/jobs', this.queryJobs);
    this.router.post('/jobs', this.createJob);
    this.router.get('/tasks/:id', this.getTask);
    this.router.get('/tasks', this.queryTasks);
  }

  private getJob(req: Request, res: Response, next: NextFunction): void {
    res.json({ message: `requesting job ${req.params.id}.` });
  }

  private queryJobs(req: Request, res: Response, next: NextFunction): void {
    res.json([
      {
        id: 10,
        recipe: 'mandlebrot.render',
        recipeTitle: 'Mandelbrot',
        mainFileName: 'Mandel.txt',
        project: 11,
        projectName: 'Demo Project',
        asset: 12,
        assetName: 'Mandel',
        user: 10,
        username: 'talin',
        tasksTotal: 50,
        tasksFinished: 10,
        tasksFailed: 1,
        createdAt: new Date(),
      },
      {
        id: 11,
        recipe: 'mandlebrot.render',
        recipeTitle: 'Mandelbrot',
        mainFileName: 'Mandel.txt',
        project: 11,
        projectName: 'Demo Project',
        asset: 12,
        assetName: 'Mandel',
        user: 10,
        username: 'talin',
        tasksTotal: 50,
        tasksFinished: 10,
        tasksFailed: 1,
        createdAt: new Date(),
      },
    ]);
  }

  private createJob(req: Request, res: Response, next: NextFunction): void {
    res.json({ message: 'posting a new job.' });
  }

  private getTask(req: Request, res: Response, next: NextFunction): void {
    res.json({ message: `requesting task ${req.params.id}.` });
  }

  private queryTasks(req: Request, res: Response, next: NextFunction): void {
    res.json({ message: 'requesting all tasks.' });
  }
}
