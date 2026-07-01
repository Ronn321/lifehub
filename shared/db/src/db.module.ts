import { Module, Global } from '@nestjs/common';
import { DbService } from './db.service.js';
import { DB_TOKEN, getDb } from './client.js';

export { DB_TOKEN } from './client.js';
export { getDb, closeDb } from './client.js';
export { DbService } from './db.service.js';
export type { Db } from './client.js';

// Factory-Provider, der DbService ohne @Injectable instantiiert.
class DbServiceFactory {
  private instance: DbService | null = null;
  getInstance(): DbService {
    if (!this.instance) {
      this.instance = new DbService(getDb());
    }
    return this.instance;
  }
}

@Global()
@Module({
  providers: [
    DbServiceFactory,
    {
      provide: DB_TOKEN,
      useFactory: (f: DbServiceFactory) => f.getInstance(),
      inject: [DbServiceFactory],
    },
    {
      provide: DbService,
      useFactory: (f: DbServiceFactory) => f.getInstance(),
      inject: [DbServiceFactory],
    },
  ],
  exports: [DbService, DB_TOKEN],
})
export class DbModule {}
