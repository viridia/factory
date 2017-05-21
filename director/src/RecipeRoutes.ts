import * as Ajv from 'ajv';
import { NextFunction, Request, Response, Router } from 'express';
import { Connection, Db } from 'rethinkdb';
import { Recipe } from '../../common/api';
import { logger } from './logger';
import { ajv, loadSchema } from './schemas';

/** Defines routes for creating and monitoring jobs and tasks. */
export default class JobRoutes {
  private router: Router;
  private conn: Connection;
  private db: Db;
  private recipeSchema: Ajv.ValidateFunction;

  constructor(conn: Connection, db: Db) {
    this.recipeSchema = loadSchema('./schemas/Recipe.schema.json');
    this.conn = conn;
    this.db = db;
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

  private queryRecipes(req: Request, res: Response, next: NextFunction): void {
    logger.info('Query recipes.');
    this.db.table('Recipes').run(this.conn).then(cursor => {
      cursor.toArray().then(recipes => {
        res.json(recipes);
      });
    }, (error: Error) => {
      res.status(500).json({ error: 'internal', message: error.message });
    });
  }

  private getRecipe(req: Request, res: Response, next: NextFunction): void {
    logger.info('Query recipe:', req.params.id);
    this.db.table('Recipes').get(req.params.id).run(this.conn).then(recipe => {
      if (recipe === null) {
        res.status(404).json({ error: 'not-found' });
      } else {
        res.json(recipe);
      }
    }, (error: Error) => {
      res.status(500).json({ error: 'internal', message: error.message });
    });
  }

  private patchRecipe(req: Request, res: Response, next: NextFunction): void {
    // const jcr = req.body as Recipe;
    // this.jobQueue.getRecipe(req.params.id).then(jobs => {
    //   console.debug(jobs);
    // });
    // res.json({ message: `requesting job ${req.params.id}.` });
  }

  private deleteRecipe(req: Request, res: Response, next: NextFunction): void {
    logger.info('Delete recipe:', req.params.id);
    this.db.table('Recipes').get(req.params.id).delete().run(this.conn).then(result => {
      if (result.deleted === 0) {
        res.status(404).json({ error: 'not-found' });
      } else {
        res.end();
      }
    }, (error: Error) => {
      res.status(500).json({ error: 'internal', message: error.message });
    });
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
    this.db.table('Recipes').insert(recipe, { conflict: 'replace' }).run(this.conn).then(result => {
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
