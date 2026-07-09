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
exports.TravelController = void 0;
const common_1 = require("@nestjs/common");
const auth_1 = require("@lifehub/auth");
const permissions_1 = require("@lifehub/permissions");
const travel_service_1 = require("../services/travel.service");
const travel_dto_1 = require("../dtos/travel.dto");
let TravelController = class TravelController {
    travel;
    constructor(travel) {
        this.travel = travel;
    }
    async createTrip(body, user) {
        const dto = travel_dto_1.createTripSchema.parse(body);
        return this.travel.createTrip(user.sub, dto);
    }
    async listTrips(user) {
        return this.travel.listTrips(user.sub);
    }
    async getTrip(id, user) {
        return this.travel.getTripWithDetails(user.sub, id);
    }
    async updateTrip(id, body, user) {
        const dto = travel_dto_1.updateTripSchema.parse(body);
        return this.travel.updateTrip(user.sub, id, dto);
    }
    async deleteTrip(id, user) {
        await this.travel.deleteTrip(user.sub, id);
    }
    async addDestination(id, body, user) {
        const dto = travel_dto_1.createDestinationSchema.parse(body);
        return this.travel.addDestination(user.sub, id, dto);
    }
    async deleteDestination(id, destId, user) {
        await this.travel.deleteDestination(user.sub, id, destId);
    }
    async addTripDay(id, body, user) {
        const dto = travel_dto_1.createTripDaySchema.parse(body);
        return this.travel.addTripDay(user.sub, id, dto);
    }
    async deleteTripDay(id, dayId, user) {
        await this.travel.deleteTripDay(user.sub, id, dayId);
    }
    async addMediaToTrip(id, body, user) {
        const dto = travel_dto_1.addMediaToTripSchema.parse(body);
        return this.travel.addMediaToTrip(user.sub, id, dto);
    }
    async addMediaToDay(id, dayId, body, user) {
        const dto = travel_dto_1.addMediaToTripSchema.parse(body);
        return this.travel.addMediaToDay(user.sub, id, dayId, dto);
    }
};
exports.TravelController = TravelController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_1.RequirePermission)('travel', 'create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], TravelController.prototype, "createTrip", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_1.RequirePermission)('travel', 'read'),
    __param(0, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TravelController.prototype, "listTrips", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_1.RequirePermission)('travel', 'read'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TravelController.prototype, "getTrip", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, permissions_1.RequirePermission)('travel', 'update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], TravelController.prototype, "updateTrip", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(204),
    (0, permissions_1.RequirePermission)('travel', 'delete'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TravelController.prototype, "deleteTrip", null);
__decorate([
    (0, common_1.Post)(':id/destinations'),
    (0, permissions_1.RequirePermission)('travel', 'update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], TravelController.prototype, "addDestination", null);
__decorate([
    (0, common_1.Delete)(':id/destinations/:destId'),
    (0, common_1.HttpCode)(204),
    (0, permissions_1.RequirePermission)('travel', 'update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('destId')),
    __param(2, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], TravelController.prototype, "deleteDestination", null);
__decorate([
    (0, common_1.Post)(':id/days'),
    (0, permissions_1.RequirePermission)('travel', 'update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], TravelController.prototype, "addTripDay", null);
__decorate([
    (0, common_1.Delete)(':id/days/:dayId'),
    (0, common_1.HttpCode)(204),
    (0, permissions_1.RequirePermission)('travel', 'update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('dayId')),
    __param(2, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], TravelController.prototype, "deleteTripDay", null);
__decorate([
    (0, common_1.Post)(':id/media'),
    (0, permissions_1.RequirePermission)('travel', 'update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], TravelController.prototype, "addMediaToTrip", null);
__decorate([
    (0, common_1.Post)(':id/days/:dayId/media'),
    (0, permissions_1.RequirePermission)('travel', 'update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('dayId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], TravelController.prototype, "addMediaToDay", null);
exports.TravelController = TravelController = __decorate([
    (0, common_1.UseGuards)(auth_1.JwtGuard, permissions_1.PermissionGuard),
    (0, common_1.Controller)('trips'),
    __param(0, (0, common_1.Inject)(travel_service_1.TravelService)),
    __metadata("design:paramtypes", [travel_service_1.TravelService])
], TravelController);
//# sourceMappingURL=travel.controller.js.map