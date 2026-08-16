export interface Contact {
  id: string;
  ownerId: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ContactListResult {
  items: Contact[];
  total: number;
}
