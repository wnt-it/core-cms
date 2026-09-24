export interface ContactPayload {
  type?: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  subject?: string;
  message?: string;
  sourcePage?: string;
  sourceUrl?: string;
  metadata?: Record<string, unknown>;
}
