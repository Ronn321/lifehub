"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTripDaySchema = exports.createDestinationSchema = exports.addMediaToTripSchema = exports.updateTripSchema = exports.createTripSchema = void 0;
const zod_1 = require("zod");
exports.createTripSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().optional(),
    startDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
    endDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
    coverMediaId: zod_1.z.string().uuid().optional(),
    status: zod_1.z.enum(['planned', 'active', 'completed']).optional().default('planned'),
});
exports.updateTripSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(255).optional(),
    description: zod_1.z.string().optional(),
    startDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    coverMediaId: zod_1.z.string().uuid().nullable().optional(),
    status: zod_1.z.enum(['planned', 'active', 'completed']).optional(),
});
exports.addMediaToTripSchema = zod_1.z.object({
    mediaId: zod_1.z.string().uuid(),
    caption: zod_1.z.string().optional(),
    dayId: zod_1.z.string().uuid().nullable().optional(),
    ord: zod_1.z.number().int().optional().default(0),
});
exports.createDestinationSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    lat: zod_1.z.string().optional(),
    lng: zod_1.z.string().optional(),
});
exports.createTripDaySchema = zod_1.z.object({
    dayDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    title: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
//# sourceMappingURL=travel.dto.js.map