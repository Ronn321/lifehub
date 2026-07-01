"use strict";
/**
 * Pure permission-Logik (kein NestJS, kein DB).
 * Wird sowohl server- (PermissionGuard) als auch client-seitig (UI) genutzt.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_MATRIX = exports.ALL_ACTIONS = exports.ALL_DOMAINS = void 0;
exports.hasPermission = hasPermission;
exports.ALL_DOMAINS = [
    'users', 'media', 'travel', 'projects', 'recipes', 'shopping',
    'finance', 'insurance', 'vault', 'documents', 'calendar',
    'it_inventory', 'jellyfin', 'search', 'dashboard', 'plugins',
];
exports.ALL_ACTIONS = ['read', 'create', 'update', 'delete', 'share', 'admin'];
/**
 * In-Memory-Permission-Matrix.
 * Wird beim App-Start einmal aus der DB geladen und gecacht (Phase 0.5+).
 * Für Phase 0 nutzen wir die statischen Standard-Mappings (siehe seed.ts).
 */
exports.DEFAULT_MATRIX = {
    admin: new Set(),
    family: new Set(),
    child: new Set(),
    guest: new Set(),
};
// admin: alles
for (const d of exports.ALL_DOMAINS)
    for (const a of exports.ALL_ACTIONS) {
        exports.DEFAULT_MATRIX.admin.add(`${d}.${a}`);
    }
// family: alles außer admin
for (const d of exports.ALL_DOMAINS)
    for (const a of exports.ALL_ACTIONS) {
        if (a !== 'admin')
            exports.DEFAULT_MATRIX.family.add(`${d}.${a}`);
    }
// child: eingeschränkt
const CHILD_BLOCKED = new Set(['finance', 'vault', 'insurance', 'it_inventory', 'users', 'plugins']);
for (const d of exports.ALL_DOMAINS) {
    if (CHILD_BLOCKED.has(d))
        continue;
    for (const a of exports.ALL_ACTIONS) {
        exports.DEFAULT_MATRIX.child.add(`${d}.${a}`);
    }
}
// guest: nur read
for (const d of exports.ALL_DOMAINS) {
    exports.DEFAULT_MATRIX.guest.add(`${d}.read`);
}
function hasPermission(roles, domain, action, matrix = exports.DEFAULT_MATRIX) {
    for (const role of roles) {
        const set = matrix[role];
        if (set && set.has(`${domain}.${action}`))
            return true;
    }
    return false;
}
//# sourceMappingURL=engine.js.map