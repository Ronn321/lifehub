export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  passwordHash: string;
  totpSecret: string | null;
  isActive: boolean;
  isSystem: boolean;
  locale: string;
  timezone: string;
  theme: 'dark' | 'light' | 'system';
  brandColor: string;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export type PublicUser = Omit<User, 'passwordHash' | 'totpSecret'>;

export function toPublicUser(u: User): PublicUser {
  const { passwordHash: _ph, totpSecret: _ts, ...rest } = u;
  return rest;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
}

export interface Session {
  id: string;
  userId: string;
  refreshHash: string;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}
