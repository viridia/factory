import * as r from 'rethinkdb';
import { Connection } from 'rethinkdb';

export function ensureDbsExist (conn: Connection, dbNames: string[]) {
  return r.dbList().run(conn).then(existing => {
    const promises: Array<Promise<any>> = [];
    for (const db of dbNames) {
      if (existing.indexOf(db) < 0) {
        promises.push(r.dbCreate(db).run(conn));
      }
    }
    return Promise.all(promises);
  });
}

export function ensureTablesExist (conn: Connection, dbName: string, tables: string[]) {
  const db = r.db(dbName);
  return db.tableList().run(conn).then(existing => {
    const promises: Array<Promise<any>> = [];
    for (const table of tables) {
      if (existing.indexOf(table) < 0) {
        promises.push(db.tableCreate(table).run(conn));
      }
    }
    return Promise.all(promises);
  });
}
