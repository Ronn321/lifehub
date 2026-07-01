"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePasswordSchema = exports.updateUserSchema = exports.refreshSchema = exports.registerSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email().max(255),
    password: zod_1.z.string().min(8).max(200),
});
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email().max(255),
    password: zod_1.z.string().min(8).max(200),
    displayName: zod_1.z.string().min(1).max(100),
});
exports.refreshSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(20),
});
exports.updateUserSchema = zod_1.z.object({
    displayName: zod_1.z.string().min(1).max(100).optional(),
    avatarUrl: zod_1.z.string().url().max(500).optional(),
    theme: zod_1.z.enum(['dark', 'light', 'system']).optional(),
    brandColor: zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    locale: zod_1.z.string().min(2).max(10).optional(),
    timezone: zod_1.z.string().min(2).max(50).optional(),
});
exports.changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(8).max(200),
    newPassword: zod_1.z.string().min(8).max(200),
});
//# sourceMappingURL=auth.dto.js.map