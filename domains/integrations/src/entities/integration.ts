// Pure domain types for the integrations domain (Google account connections).

export interface GoogleConnectionStatus {
  connected: boolean;
  email: string | null;
  grantedScopes: string[];
  lastSyncAt: string | null;
}

/** Row of integrations.google_connections (tokens are kept encrypted, never exposed). */
export interface GoogleConnection {
  id: string;
  ownerId: string;
  googleEmail: string;
  displayName: string | null;
  avatarUrl: string | null;
  tokenExpiresAt: string | null;
  grantedScopes: string[];
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
