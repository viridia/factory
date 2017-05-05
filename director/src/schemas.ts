import * as Ajv from 'ajv';
import * as fs from 'fs';

export const ajv = Ajv();

export function loadSchema(path: string): Ajv.ValidateFunction {
  const json = JSON.parse(fs.readFileSync(path).toString());
  return ajv.compile(json);
}
