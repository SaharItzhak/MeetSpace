import { Resend } from "resend";
import type { EmailMessage, EmailProvider } from "@meetspace/shared";

export class ResendEmailProvider implements EmailProvider {
  private readonly client: Resend;
  private readonly from: string;

  constructor(apiKey: string, from: string) {
    this.client = new Resend(apiKey);
    this.from = from;
  }

  async send(message: EmailMessage): Promise<{ id: string }> {
    const result = await this.client.emails.send({
      from: this.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    if (result.error) {
      throw new Error(`Resend send failed: ${result.error.message}`);
    }
    return { id: result.data?.id ?? "" };
  }
}
