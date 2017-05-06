import { Param, Recipe, Step } from '../types/api';
import ExpressionEvaluator, { Env, Range } from './ExpressionEvaluator';
import Task from './Task';

/** A set of tasks generated from a recipe. */
export default class TaskSet {
  public id: string;
  public params: Param[];
  public steps: Step[];
  public userArgs: Env;
  public taskMap: { [taskId: string]: Task };
  public taskList: Task[];
  public evaluator = new ExpressionEvaluator();
  private stepIndex: number;

  constructor(recipe: Recipe) {
    this.id = recipe.id;
    this.params = recipe.params || [];
    this.steps = recipe.steps || [];
    this.userArgs = {};
    this.taskMap = {};
    this.taskList = [];
  }

  public setUserArgs(userArgs: Env) {
    this.userArgs = userArgs;
  }

  /** Evaluate the recipe and produce a set of tasks. */
  public createTasks() {
    this.stepIndex = 0;
    for (const step of this.steps) {
      if (step.multiplicity) {
        const iterables = [];
        for (const varName of Object.getOwnPropertyNames(step.multiplicity)) {
          const expr = this.evaluator.eval(step.multiplicity[varName], this.userArgs, 'range');
          iterables.push({ varName, range: expr });
        }
        if (iterables.length === 0) {
          throw Error('Empty multiplicity specification');
        }
        this.iterate(iterables, step, this.userArgs);
      } else {
        this.createTask(step, this.userArgs);
      }
      this.stepIndex += 1;
    }
    this.computeDependencies();
  }

  /** Produce multiple tasks via the 'multiplicity' property. */
  private iterate(iterables: any[], step: Step, env: Env) {
    const { ...envCopy } = env;
    const [iter, ...rest] = iterables;
    const { varName, range } = iter;
    if (typeof range.start !== 'number' ||
        typeof range.end !== 'number' ||
        typeof range.step !== 'number') {
      throw Error(`Invalid range expression: ${range}`);
    }
    for (let i = range.start; i <= range.end; i += range.step) {
      envCopy[varName] = i;
      if (rest.length === 0) {
        this.createTask(step, envCopy);
      } else {
        this.iterate(rest, step, envCopy);
      }
    }
  }

  /** Create a single task instance from a step definition. */
  private createTask(step: Step, env: Env) {
    const task = new Task(
      this.evaluator.eval(step.id, env, 'string'),
      this.evaluator.eval(step.title, env, 'string'),
    );
    task.stepIndex = this.stepIndex;
    if (task.taskId in this.taskMap) {
      throw Error(`Task id "${task.taskId}" is not unique.`);
    }
    if (step.depends) {
      task.depends = this.ensureUnique(this.evaluator.evalArray(step.depends, env, 'string'));
    }
    if (step.args) {
      task.args = this.evaluator.evalArray(step.args, env, 'string');
    }
    if (step.env) {
      for (const name of Object.getOwnPropertyNames(step.env)) {
        task.env[name] = this.evaluator.eval(step.env[name], env, 'string');
      }
    }
    if (step.inputs) {
      task.inputs = this.ensureUnique(this.evaluator.evalArray(step.inputs, env));
    }
    if (step.outputs) {
      task.outputs = this.ensureUnique(this.evaluator.evalArray(step.outputs, env));
    }
    if (step.weight !== undefined) {
      task.weight = step.weight;
    }
    this.taskMap[task.taskId] = task;
    this.taskList.push(task);
    return task;
  }

  /** Given a list of names, ensure there are no duplicates. */
  private ensureUnique(names: string[]): string[] {
    const result: string[] = [];
    const seen: { [name: string]: boolean; } = {};
    for (const name of names) {
      if (!seen[name]) {
        seen[name] = true;
        result.push(name);
      }
    }
    return result;
  }

  private computeDependencies() {
    for (const task of this.taskList) {
      for (const dep of task.depends) {
        const prior = this.taskMap[dep];
        if (!prior) {
          throw Error(`Task "${task.taskId}" depends on non-existent task "${dep}".`);
        }
        if (prior.stepIndex > task.stepIndex) {
          throw Error(`Task "${task.taskId}" cannot depend on subsequent task "${dep}".`);
        }
        if (prior.stepIndex === task.stepIndex) {
          throw Error(`Task "${task.taskId}" cannot depend on task "${dep}" which is in the same step.`);
        }
        prior.dependents.push(task.taskId);
      }
    }
  }
}
