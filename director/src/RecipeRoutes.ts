import * as Ajv from 'ajv';
import { NextFunction, Request, Response, Router } from 'express';
import { Recipe } from '../../common/types/api';
import { ajv, loadSchema } from './schemas';

/** Defines routes for creating and monitoring jobs and tasks. */
export default class JobRoutes {
  private router: Router;
  private r: any; // RethinkDBDash connection handle
  private recipeSchema: Ajv.ValidateFunction;

  constructor(r: any) {
    this.recipeSchema = loadSchema('./schemas/Recipe.schema.json');
    this.r = r;
    this.router = Router();
    this.routes();
  }

  /** Add this router to the parent router. */
  public apply(parent: Router): void {
    parent.use('/recipes', this.router);
  }

  private routes(): void {
    this.router.get('/:id', this.getRecipe.bind(this));
    this.router.put('/:id', this.putRecipe.bind(this));
    this.router.delete('/:id', this.deleteRecipe.bind(this));
    this.router.get('/', this.queryRecipes.bind(this));
  }

  private getRecipe(req: Request, res: Response, next: NextFunction): void {
    // res.json({ message: `requesting job ${req.params.id}.` });
  }

  private patchRecipe(req: Request, res: Response, next: NextFunction): void {
    // const jcr = req.body as Recipe;
    // this.jobQueue.getRecipe(req.params.id).then(jobs => {
    //   console.debug(jobs);
    // });
    // res.json({ message: `requesting job ${req.params.id}.` });
  }

  private deleteRecipe(req: Request, res: Response, next: NextFunction): void {
    // console.info('Attempting to delete recipe:', req.params.id);
    // this.jobQueue.cancelRecipe(req.params.id).then(jobs => {
    //   // const job = jobs[0];
    //   // console.info('Cancellation successful:', job);
    //   // this.deepstream.event.emit(`jobs.project.${job.project}`,
    //   //   { jobsUpdated: [this.serializeRecipe(job)] });
    //   res.end();
    // }, (error: any) => {
    //   console.error(error);
    //   res.status(500).json({ message: error.message });
    // });
  }

  private queryRecipes(req: Request, res: Response, next: NextFunction): void {
    // this.jobQueue.findRecipe({
    //   user: req.query.user,
    //   project: req.query.project,
    // }).then(jobList => {
    //   res.json(jobList.map(this.serializeRecipe));
    // }, error => {
    //   console.error(error);
    // });
  }

  private putRecipe(req: Request, res: Response, next: NextFunction): void {
    const recipe = req.body as Recipe;
    if (!this.recipeSchema(recipe)) {
      // TODO: We need a much better error reporter
      const errors = ajv.errorsText(this.recipeSchema.errors, { dataVar: 'Recipe' });
      console.error(this.recipeSchema.errors);
      console.error(errors);
      res.status(400).json({ error: 'validation', message: errors, errorList: errors });
      return;
    }
    recipe.id = req.params.id;
    this.r.db(process.env.DB_NAME).table('Recipes').insert(recipe, { conflict: 'replace' })
    .then((result: any) => {
      if (result.errors) {
        console.error('error inserting recipe:', result.first_error);
        res.status(500).json({ error: 'internal', message: result.first_error });
      } else {
        res.status(200).json({
          replaced: result.replaced,
          inserted: result.inserted,
          unchanged: result.unchanged,
        });
      }
    }, (error: Error) => {
      res.status(500).json({ error: 'internal', message: error.message });
    });
  }
}
