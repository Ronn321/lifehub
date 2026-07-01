export type VaultEntryType = 'login' | 'note' | 'card' | 'identity' | 'ssh';

export interface VaultEntry {
  id: string;
  name: string;
  type: VaultEntryType;
  username: string | null;
  encryptedPassword: string | null;
  url: string | null;
  notes: string | null;
  totpSecret: string | null;
  cardLast4: string | null;
  cardBrand: string | null;
  keyVersion: number;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
