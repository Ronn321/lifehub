import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PERMISSION_KEY } from './decorators.js';
import { hasPermission, type Action, type Domain, type PermissionMatrix } from './engine.js';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<{ domain: Domain; action: Action } | undefined>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true; // kein @RequirePermission → freigeben (z.B. public endpoint)

    const req = context.switchToHttp().getRequest<Request & { user?: { roles: string[] } }>();
    const user = req.user;
    if (!user || !Array.isArray(user.roles)) {
      throw new ForbiddenException('No authenticated user or roles missing');
    }

    const matrix: PermissionMatrix = (req as any).permissionMatrix; // optional override
    if (hasPermission(user.roles, required.domain, required.action, matrix)) return true;
    throw new ForbiddenException(`Missing permission: ${required.domain}.${required.action}`);
  }
}
