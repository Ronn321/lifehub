import { sql } from 'drizzle-orm';
import { getDb, type Db, DB_TOKEN } from './client.js';

// Plain class — no @Injectable decorator (Phase 0 dev simplification).
export class DbService {
  constructor(public readonly db: Db) {}

  async ping(): Promise<boolean> {
    try {
      await this.db.execute(sql`SELECT 1`);
      return true;
    } catch {
      return false;
    }
  }
}
