"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_WIDGETS = exports.layoutSchema = exports.widgetSchema = exports.WIDGET_TYPES = void 0;
const zod_1 = require("zod");
exports.WIDGET_TYPES = [
    'media', 'calendar', 'weather', 'savings', 'tasks', 'finance', 'projects',
];
exports.widgetSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    type: zod_1.z.enum(exports.WIDGET_TYPES),
    x: zod_1.z.number().int().min(0),
    y: zod_1.z.number().int().min(0),
    w: zod_1.z.number().int().min(1).max(6),
    h: zod_1.z.number().int().min(1).max(6),
    config: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.layoutSchema = zod_1.z.object({
    widgets: zod_1.z.array(exports.widgetSchema),
});
exports.DEFAULT_WIDGETS = [
    { type: 'media', label: 'Letzte Medien', w: 2, h: 2 },
    { type: 'weather', label: 'Wetter', w: 1, h: 1 },
    { type: 'calendar', label: 'Kalender', w: 2, h: 2 },
    { type: 'savings', label: 'Sparziele', w: 1, h: 1 },
];
//# sourceMappingURL=dashboard.dto.js.map