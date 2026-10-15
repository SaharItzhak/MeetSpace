export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Provider-agnostic email sending surface, so tests/dev can use a fake adapter and
 * production can use Resend without the booking/reminder logic knowing the difference.
 */
export interface EmailProvider {
  send(message: EmailMessage): Promise<{ id: string }>;
}
