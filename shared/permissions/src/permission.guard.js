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
exports.PermissionGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const decorators_js_1 = require("./decorators.js");
const engine_js_1 = require("./engine.js");
let PermissionGuard = class PermissionGuard {
    reflector;
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const required = this.reflector.getAllAndOverride(decorators_js_1.PERMISSION_KEY, [context.getHandler(), context.getClass()]);
        if (!required)
            return true; // kein @RequirePermission → freigeben (z.B. public endpoint)
        const req = context.switchToHttp().getRequest();
        const user = req.user;
        if (!user || !Array.isArray(user.roles)) {
            throw new common_1.ForbiddenException('No authenticated user or roles missing');
        }
        const matrix = req.permissionMatrix; // optional override
        if ((0, engine_js_1.hasPermission)(user.roles, required.domain, required.action, matrix))
            return true;
        throw new common_1.ForbiddenException(`Missing permission: ${required.domain}.${required.action}`);
    }
};
exports.PermissionGuard = PermissionGuard;
exports.PermissionGuard = PermissionGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], PermissionGuard);
//# sourceMappingURL=permission.guard.js.map