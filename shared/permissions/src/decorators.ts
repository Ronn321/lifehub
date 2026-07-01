import { SetMetadata } from '@nestjs/common';
import type { Action, Domain } from './engine.js';

export const PERMISSION_KEY = 'lifehub:permission';

/**
 * Markiert einen Controller/Handler mit einer erforderlichen Permission.
 * Beispiel: `@RequirePermission('media', 'create')`
 */
export const RequirePermission = (domain: Domain, action: Action) =>
  SetMetadata(PERMISSION_KEY, { domain, action });
