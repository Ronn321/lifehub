import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as publicSchema from './schema/public.js';

export type Db = PostgresJsDatabase<typeof publicSchema>;
export const DB_TOKEN = Symbol('DB_TOKEN');

let _db: Db | null = null;
let _sql: ReturnType<typeof postgres> | null = null;

export function getDb(): Db {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL not set');
    _sql = postgres(url, { max: 10, prepare: false });
    _db = drizzle(_sql, { schema: publicSchema });
  }
  return _db;
}

export async function closeDb(): Promise<void> {
  if (_sql) {
    await _sql.end({ timeout: 5 });
    _sql = null;
    _db = null;
  }
}
