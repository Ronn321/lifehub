"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DbService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
// Plain class — no @Injectable decorator (Phase 0 dev simplification).
class DbService {
    db;
    constructor(db) {
        this.db = db;
    }
    async ping() {
        try {
            await this.db.execute((0, drizzle_orm_1.sql) `SELECT 1`);
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.DbService = DbService;
//# sourceMappingURL=db.service.js.map