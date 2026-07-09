"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAndAssignTagSchema = exports.assignTagSchema = exports.createTagSchema = exports.addToAlbumSchema = exports.updateAlbumSchema = exports.createAlbumSchema = exports.updateSourceSchema = exports.createSourceSchema = void 0;
const zod_1 = require("zod");
exports.createSourceSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    type: zod_1.z.enum(['nas_path', 'windows_path', 's3', 'upload_temp']),
    path: zod_1.z.string().min(1),
    autoIndex: zod_1.z.boolean().optional().default(false),
});
exports.updateSourceSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255).optional(),
    path: zod_1.z.string().optional(),
    isActive: zod_1.z.boolean().optional(),
    autoIndex: zod_1.z.boolean().optional(),
});
exports.createAlbumSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().optional(),
    type: zod_1.z.enum(['standard', 'travel', 'event', 'timeline']).optional().default('standard'),
});
exports.updateAlbumSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255).optional(),
    description: zod_1.z.string().optional(),
    type: zod_1.z.enum(['standard', 'travel', 'event', 'timeline']).optional(),
});
exports.addToAlbumSchema = zod_1.z.object({
    mediaIds: zod_1.z.array(zod_1.z.string().uuid()).min(1),
});
exports.createTagSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    color: zod_1.z.string().max(20).optional(),
});
exports.assignTagSchema = zod_1.z.object({
    tagId: zod_1.z.string().uuid(),
});
exports.createAndAssignTagSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    color: zod_1.z.string().max(20).optional(),
});
//# sourceMappingURL=media.dto.js.map