// Re-exports — CommonJS mode (no .js extensions)
export { DbService, DbModule, DB_TOKEN } from './db.module.js';
export type { Db } from './client.js';
export { getDb, closeDb } from './client.js';
export * from './schema/public.js';
