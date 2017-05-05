import * as Ajv from 'ajv';
import * as fs from 'fs';
import * as path from 'path';

export const ajv = Ajv();

export function loadSchema(schemaPath: string): Ajv.ValidateFunction {
  const json = JSON.parse(fs.readFileSync(path.join(__dirname, '..', schemaPath)).toString());
  return ajv.compile(json);
}
