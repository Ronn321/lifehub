// Pure domain types for the email domain (Gmail live proxy, no local tables).

export interface EmailThreadSummary {
  id: string;
  historyId?: string;
  subject: string;
  from: string;
  to: string;
  date: string | null;
  snippet: string;
  unread: boolean;
  hasAttachment: boolean;
  labels: string[];
}

export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface EmailMessage {
  id: string;
  from: string;
  to: string;
  cc?: string;
  subject: string;
  date: string | null;
  bodyHtml: string;
  bodyText: string;
  snippet: string;
  labelIds: string[];
  attachments: EmailAttachment[];
}

export interface EmailStatus {
  connected: boolean;
  email: string | null;
  unreadInbox: number;
}
