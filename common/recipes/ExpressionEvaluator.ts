const fieldRegExp = /{{([A-Za-z_][A-Za-z0-9_]*)(?::(\d*))?}}/g;

export interface Env {
  [key: string]: any;
}

export interface Range {
  start: number;
  end: number;
  step?: number;
}

interface Substitution {
  key: string;
  format: {
    width?: number;
    leadingZeros?: boolean;
  };
}

interface OperatorMap {
  [key: string]: (expr: any, env: Env) => any;
}

export default class ExpressionEvaluator {
  private operators: OperatorMap;

  constructor() {
    this.operators = {
      $foreach: this.evalForeach.bind(this),
    };
  }

  /** Given an input value of any type, do the following:
      * Coerce it to the specified result type if possible.
      * If the input value is a string, do template expansion on it, using the definitions
        supplied in the 'env' parameter.
  */
  public eval(expr: any, env: Env, coerce: string = null): any {
    switch (typeof expr) {
      case 'boolean': return this.coerce(expr, coerce);
      case 'number': return this.coerce(expr, coerce);
      case 'string': {
        if (coerce === 'string') {
          return this.evalTemplate(this.parseTemplate(expr), env);
        } else if (coerce === 'number' ||
            coerce === 'boolean' ||
            coerce === 'array' ||
            coerce === 'range' ||
            coerce === null) {
          return this.evalAndCoerce(this.parseTemplate(expr), env, coerce);
        } else {
          throw Error(`Unknown coercion type: ${coerce}`);
        }
      }
      case 'object':
        if (Array.isArray(expr)) {
          // Eval each element individually. Make no assumptions yet about the types of elements.
          return this.coerce(expr.map(element => this.eval(element, env)), coerce);
        } else {
          let foundOperator: string = null;
          let result: any;
          for (const key of Object.getOwnPropertyNames(expr)) {
            const evalFn = this.operators[key];
            if (evalFn) {
              if (foundOperator) {
                throw Error(`Conflicing operators: ${key} and ${foundOperator}`);
              }
              foundOperator = key;
            }
            result = evalFn(expr[key], env);
          }
          if (foundOperator) {
            return result;
          }
          throw Error(`Unsupported type: ${expr}`);
        }
      default:
        throw Error(`Unsupported type: ${expr}`);
    }
  }

  /** Similar to eval, but also flattens any nested arrays. */
  public evalArray(expr: any, env: Env, itemType: string = null) {
    const result = this.eval(expr, env, 'array');
    if (!Array.isArray(result)) {
      throw Error(`Expected an array: ${expr}`);
    }
    const flat: any[] = [];
    const flatten = (array: any[]) => {
      for (const item of array) {
        if (Array.isArray(item)) {
          flatten(item);
        } else {
          flat.push(this.coerce(item, itemType));
        }
      }
    };
    flatten(result);
    return flat;
  }

  public coerce(expr: any, toType: string = null): any {
    switch (typeof expr) {
      case 'boolean':
        if (toType === 'boolean' || toType === null) {
          return expr;
        } else if (toType === 'number') {
          return expr ? 1 : 0;
        } else if (toType === 'string') {
          return '' + expr;
        } else if (toType === 'array') {
          throw Error('Cannot convert boolean to array.');
        } else {
          throw Error(`Unknown coercion type: ${toType}`);
        }
      case 'number':
        if (toType === 'number' || toType === null) {
          return expr;
        } else if (toType === 'boolean') {
          return !!expr;
        } else if (toType === 'string') {
          return '' + expr;
        } else if (toType === 'array') {
          throw Error('Cannot convert number to array.');
        } else if (toType === 'range') {
          throw Error('Cannot convert number to range.');
        } else {
          throw Error(`Unknown coercion type: ${toType}`);
        }
      case 'string': {
        if (toType === 'string' || toType === null) {
          return expr;
        } else if (toType === 'boolean') {
          return !!expr;
        } else if (toType === 'array') {
          throw Error('Cannot convert string to array.');
        } else if (toType === 'number') {
          const n = parseInt(expr, 10);
          if (isNaN(n)) {
            throw Error(`Cannot conver string: "${expr}" to number.`);
          }
          return n;
        } else {
          throw Error(`Unknown coercion type: ${toType}`);
        }
      }
      case 'object':
        if (Array.isArray(expr)) {
          if (toType === 'array' || toType === null) {
            return expr;
          } else if (toType === 'number') {
            throw Error('Cannot convert array to number.');
          } else if (toType === 'boolean') {
            throw Error('Cannot convert array to boolean.');
          } else if (toType === 'string') {
            throw Error('Cannot convert array to string.');
          } else if (toType === 'range') {
            if (expr.length < 2 || expr.length > 3) {
              throw Error(
                'Range expression must have at least two and no more than three elements.');
            } else if (expr.length >= 2 && expr.length <= 3) {
              const args = expr.map(elt => this.coerce(elt, 'number'));
              if (args.length === 2) {
                args.push(1);
              }
              return {
                start: args[0],
                end: args[1],
                step: args[2],
              };
            }
            // etc.
          } else {
            throw Error(`Unknown coercion type: ${toType}`);
          }
        } else if (toType === 'range') {
          // pass
        } else {
          throw Error(`Unsupported type: ${expr}`);
        }
      default:
        throw Error(`Unsupported type: ${expr}`);
    }
  }

  /** Parses a string with format substition fields of the form {{name}} or {{name:width}}.
      Returns an array of string literals and substitution objects.
  */
  public parseTemplate(input: string): Array<string | Substitution> {
    const result: Array<string | Substitution> = [];
    let lastIndex = 0;
    while (true) {
      const m = fieldRegExp.exec(input);
      if (m) {
        if (m.index > lastIndex) {
          result.push(input.slice(lastIndex, m.index));
        }
        const sub: Substitution = {
          key: m[1],
          format: {},
        };
        if (m[2]) {
          sub.format.leadingZeros = m[2].startsWith('0');
          sub.format.width = parseInt(m[2], 10);
          if (isNaN(sub.format.width)) {
            throw Error(`Invalid format width specifier: ${m[2]}`);
          }
        }
        result.push(sub);
        lastIndex = fieldRegExp.lastIndex;
        if (fieldRegExp.lastIndex === 0) {
          break;
        }
      } else {
        if (input.length > lastIndex) {
          result.push(input.slice(lastIndex));
        }
        break;
      }
    }
    return result;
  }

  public evalAndCoerce(template: Array<string | Substitution>, env: Env, coerce: string): any {
    // Special case where the entire template is just one substitution field, in which case we
    // want to return the variable directly.
    let expr;
    if (template.length === 1 &&
        typeof template[0] !== 'string' &&
        (template[0] as Substitution).format.width === undefined) {
      const p: Substitution = template[0] as Substitution;
      if (!(p.key in env)) {
        throw Error(`Unknown name "${p.key}"`);
      }
      // Just use the value directly, don't turn it into a string.
      expr = env[p.key];
    } else {
      // It's either a complex template or a simple string, so get the string result.
      expr = this.evalTemplate(template, env);
    }

    return this.coerce(expr, coerce);
  }

  public evalTemplate(template: Array<string | Substitution>, env: Env): string {
    const parts = template.map(p => {
      if (typeof p === 'string') {
        return p;
      } else {
        if (!(p.key in env)) {
          throw Error(`Unknown name "${p.key}"`);
        }
        let val = env[p.key];
        if (typeof val === 'number') {
          val = '' + val;
          if (p.format.width > 0 && p.format.width > val.length) {
            const paddingChar = p.format.leadingZeros ? '0' : ' ';
            val = paddingChar.repeat(p.format.width - val.length) + val;
          }
        } else if (typeof val !== 'string') {
          val = val + '';
        }
        return val;
      }
    });
    return parts.join('');
  }

  private evalForeach(args: any, env: Env): any {
    if (args.length !== 3) {
      console.error(args);
      throw Error(`$foreach requires 3 arguments: ${args}`);
    }
    const [varName, range, body] = args;
    const iterable = this.eval(range, env, 'range');
    if (typeof varName !== 'string' || varName.length === 0) {
      throw Error('$foreach variable name must be a string');
    }
    const { ...envCopy } = env;
    const result: any[] = [];
    for (let i = iterable.start; i <= iterable.end; i += iterable.step) {
      envCopy[varName] = i;
      result.push(this.eval(body, envCopy));
    }
    return result;
  }
}
