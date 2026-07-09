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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const dashboard_repository_1 = require("../repositories/dashboard.repository");
const dashboard_dto_1 = require("../dtos/dashboard.dto");
let DashboardService = class DashboardService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    generateDefaultWidgets() {
        return dashboard_dto_1.DEFAULT_WIDGETS.map((w, i) => ({
            id: `widget-${w.type}`,
            type: w.type,
            x: (i % 2) * w.w,
            y: Math.floor(i / 2) * 2,
            w: w.w,
            h: w.h,
        }));
    }
    async getLayout(userId) {
        try {
            const saved = await this.repo.getLayout(userId);
            if (saved)
                return saved;
            return { widgets: this.generateDefaultWidgets() };
        }
        catch {
            throw new common_1.InternalServerErrorException('Layout konnte nicht geladen werden');
        }
    }
    async saveLayout(userId, layout) {
        try {
            await this.repo.upsertLayout(userId, layout);
            return layout;
        }
        catch {
            throw new common_1.InternalServerErrorException('Layout konnte nicht gespeichert werden');
        }
    }
    async resetLayout(userId) {
        const layout = { widgets: this.generateDefaultWidgets() };
        try {
            await this.repo.upsertLayout(userId, layout);
            return layout;
        }
        catch {
            throw new common_1.InternalServerErrorException('Layout konnte nicht zurückgesetzt werden');
        }
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [dashboard_repository_1.DashboardRepository])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map