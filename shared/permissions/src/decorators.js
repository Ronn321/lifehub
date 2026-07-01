"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequirePermission = exports.PERMISSION_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.PERMISSION_KEY = 'lifehub:permission';
/**
 * Markiert einen Controller/Handler mit einer erforderlichen Permission.
 * Beispiel: `@RequirePermission('media', 'create')`
 */
const RequirePermission = (domain, action) => (0, common_1.SetMetadata)(exports.PERMISSION_KEY, { domain, action });
exports.RequirePermission = RequirePermission;
//# sourceMappingURL=decorators.js.map