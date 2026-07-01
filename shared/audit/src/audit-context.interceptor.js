"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditContextStorage = exports.AuditContextInterceptor = void 0;
exports.getCurrentAuditContext = getCurrentAuditContext;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const node_async_hooks_1 = require("node:async_hooks");
/**
 * Pro Request: setzt Postgres-Session-Variablen `app.actor_id` und `app.domain`,
 * damit der DB-Trigger `audit_row()` weiß, wer was geändert hat.
 *
 * Verwendung: global via APP_INTERCEPTOR in app.module.ts (Phase 0.5+).
 */
let AuditContextInterceptor = class AuditContextInterceptor {
    intercept(context, next) {
        const req = context.switchToHttp().getRequest();
        const userId = req.user?.sub ?? null;
        // Domain kommt aus Route-Prefix (z.B. /api/v1/media → "media")
        const path = req.path ?? '';
        const match = path.match(/^\/api\/v1\/([^/]+)/);
        const domain = match?.[1] ?? 'system';
        // Werte via async-local-storage, damit Service-Layer sie lesen kann
        return new rxjs_1.Observable((subscriber) => {
            exports.auditContextStorage.run({ actorId: userId, domain }, () => {
                next.handle().pipe((0, rxjs_1.tap)({
                    next: () => subscriber.next(undefined),
                    error: (err) => subscriber.error(err),
                    complete: () => subscriber.complete(),
                })).subscribe();
            });
        });
    }
};
exports.AuditContextInterceptor = AuditContextInterceptor;
exports.AuditContextInterceptor = AuditContextInterceptor = __decorate([
    (0, common_1.Injectable)()
], AuditContextInterceptor);
exports.auditContextStorage = new node_async_hooks_1.AsyncLocalStorage();
function getCurrentAuditContext() {
    return exports.auditContextStorage.getStore() ?? { actorId: null, domain: 'system' };
}
//# sourceMappingURL=audit-context.interceptor.js.map