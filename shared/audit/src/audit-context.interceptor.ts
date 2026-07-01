import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { Request } from 'express';

/**
 * Pro Request: setzt Postgres-Session-Variablen `app.actor_id` und `app.domain`,
 * damit der DB-Trigger `audit_row()` weiß, wer was geändert hat.
 *
 * Verwendung: global via APP_INTERCEPTOR in app.module.ts (Phase 0.5+).
 */
@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request & { user?: { sub: string } }>();
    const userId = req.user?.sub ?? null;
    // Domain kommt aus Route-Prefix (z.B. /api/v1/media → "media")
    const path = req.path ?? '';
    const match = path.match(/^\/api\/v1\/([^/]+)/);
    const domain = match?.[1] ?? 'system';

    // Werte via async-local-storage, damit Service-Layer sie lesen kann
    return new Observable((subscriber) => {
      auditContextStorage.run({ actorId: userId, domain }, () => {
        next.handle().pipe(
          tap({
            next: () => subscriber.next(undefined),
            error: (err) => subscriber.error(err),
            complete: () => subscriber.complete(),
          }),
        ).subscribe();
      });
    });
  }
}

export interface AuditContext {
  actorId: string | null;
  domain: string;
}

export const auditContextStorage = new AsyncLocalStorage<AuditContext>();

export function getCurrentAuditContext(): AuditContext {
  return auditContextStorage.getStore() ?? { actorId: null, domain: 'system' };
}
