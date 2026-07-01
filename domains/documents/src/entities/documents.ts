export type DocumentType = 'contract' | 'receipt' | 'manual' | 'official' | 'other';

export const documentTypeLabels: Record<DocumentType, string> = {
  contract: 'Vertrag',
  receipt: 'Quittung',
  manual: 'Handbuch',
  official: 'Amtlich',
  other: 'Sonstiges',
};

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  description: string | null;
  mimeType: string | null;
  fileSize: number | null;
  storagePath: string | null;
  tags: string[] | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface DocumentWithUrl extends Document {
  downloadUrl: string | null;
}
