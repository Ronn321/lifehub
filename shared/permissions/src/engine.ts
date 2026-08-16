/**
 * Pure permission-Logik (kein NestJS, kein DB).
 * Wird sowohl server- (PermissionGuard) als auch client-seitig (UI) genutzt.
 */

export type Action = 'read' | 'create' | 'update' | 'delete' | 'share' | 'admin';
export type Domain =
  | 'users' | 'media' | 'travel' | 'projects' | 'recipes' | 'shopping'
  | 'finance' | 'insurance' | 'vault' | 'documents' | 'calendar'
  | 'it_inventory' | 'jellyfin' | 'search' | 'dashboard' | 'plugins' | 'pages'
  | 'email' | 'integrations' | 'contacts';

export const ALL_DOMAINS: Domain[] = [
  'users', 'media', 'travel', 'projects', 'recipes', 'shopping',
  'finance', 'insurance', 'vault', 'documents', 'calendar',
  'it_inventory', 'jellyfin', 'search', 'dashboard', 'plugins', 'pages',
  'email', 'integrations', 'contacts',
];

export const ALL_ACTIONS: Action[] = ['read', 'create', 'update', 'delete', 'share', 'admin'];

export interface PermissionMatrix {
  // roleName -> set of "<domain>.<action>"
  [role: string]: Set<string>;
}

/**
 * In-Memory-Permission-Matrix.
 * Wird beim App-Start einmal aus der DB geladen und gecacht (Phase 0.5+).
 * Für Phase 0 nutzen wir die statischen Standard-Mappings (siehe seed.ts).
 */
export const DEFAULT_MATRIX: PermissionMatrix = {
  admin: new Set(),
  family: new Set(),
  child: new Set(),
  guest: new Set(),
};

// admin: alles
for (const d of ALL_DOMAINS) for (const a of ALL_ACTIONS) {
  DEFAULT_MATRIX.admin!.add(`${d}.${a}`);
}

// family: alles außer admin
for (const d of ALL_DOMAINS) for (const a of ALL_ACTIONS) {
  if (a !== 'admin') DEFAULT_MATRIX.family!.add(`${d}.${a}`);
}

// child: eingeschränkt
const CHILD_BLOCKED = new Set(['finance', 'vault', 'insurance', 'it_inventory', 'users', 'plugins']);
for (const d of ALL_DOMAINS) {
  if (CHILD_BLOCKED.has(d)) continue;
  for (const a of ALL_ACTIONS) {
    DEFAULT_MATRIX.child!.add(`${d}.${a}`);
  }
}

// guest: nur read
for (const d of ALL_DOMAINS) {
  DEFAULT_MATRIX.guest!.add(`${d}.read`);
}

export function hasPermission(
  roles: string[],
  domain: Domain,
  action: Action,
  matrix: PermissionMatrix = DEFAULT_MATRIX,
): boolean {
  for (const role of roles) {
    const set = matrix[role];
    if (set && set.has(`${domain}.${action}`)) return true;
  }
  return false;
}
