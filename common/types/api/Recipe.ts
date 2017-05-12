export interface Expr {
  ['$ref']?: string;                  // Variable reference
  ['$foreach']?: [Expr, Expr, Expr];  // Foreach expansion
}

interface StrMap<V> {
  [key: string]: V;
}

export enum ParamType {
  BOOLEAN,
  INTEGER,
  NUMBER,
  TEXT,
  FILENAME,
  FILEPATH,
  DIRNAME,
  DIRPATH,
  RANGE,
}

export interface Param {
  id: string;
  title: string;
  type: ParamType;
  default?: any;
}

export interface Step {
  id: string | object;
  title: string | object;
  depends?: Array<string | Expr>;
  image?: string | Expr;
  tool?: string | Expr;
  workdir?: string | Expr;
  args?: Array<string | Expr>;
  env?: StrMap<string | Expr>;
  multiplicity?: StrMap<Expr>;
  inputs?: Array<string | Expr>;
  outputs?: Array<string | Expr>;
  weight?: number;
}

export interface Recipe {
  id: string;
  type?: string;
  title: string;
  params?: Param[];
  steps: Step[];
}
