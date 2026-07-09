"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardRepository = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("@lifehub/db");
let DashboardRepository = class DashboardRepository {
    dbService;
    constructor(dbService) {
        this.dbService = dbService;
    }
    get db() {
        return this.dbService.db;
    }
    async getLayout(userId) {
        const [row] = await this.db
            .select()
            .from(db_1.dashboardLayouts)
            .where((0, drizzle_orm_1.eq)(db_1.dashboardLayouts.userId, userId));
        return row?.layout ?? null;
    }
    async upsertLayout(userId, layout) {
        await this.db
            .insert(db_1.dashboardLayouts)
            .values({ userId, layout: (0, drizzle_orm_1.sql) `${JSON.stringify(layout)}::jsonb`, updatedAt: (0, drizzle_orm_1.sql) `now()` })
            .onConflictDoUpdate({
            target: db_1.dashboardLayouts.userId,
            set: { layout: (0, drizzle_orm_1.sql) `${JSON.stringify(layout)}::jsonb`, updatedAt: (0, drizzle_orm_1.sql) `now()` },
        });
    }
};
exports.DashboardRepository = DashboardRepository;
exports.DashboardRepository = DashboardRepository = __decorate([
    __param(0, (0, common_1.Inject)(db_1.DbService)),
    __metadata("design:paramtypes", [db_1.DbService])
], DashboardRepository);
//# sourceMappingURL=dashboard.repository.js.map