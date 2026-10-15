import type { EmailMessage, EmailProvider } from "@meetspace/shared";

/** In-memory fake email adapter used by tests and local dev without a Resend API key. */
export class MockEmailProvider implements EmailProvider {
  readonly sent: EmailMessage[] = [];
  private nextId = 1;

  async send(message: EmailMessage): Promise<{ id: string }> {
    this.sent.push(message);
    return { id: `mock-email-${this.nextId++}` };
  }
}

export const globalMockEmailProvider = new MockEmailProvider();
