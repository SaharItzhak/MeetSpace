import type { EmailProvider } from "@meetspace/shared";
import { ResendEmailProvider } from "./resend";
import { globalMockEmailProvider } from "./mock";

let cached: EmailProvider | undefined;

/** Resolves the configured email adapter: Resend in production, an in-memory mock otherwise. */
export function getEmailProvider(): EmailProvider {
  if (cached) return cached;
  if (process.env.MOCK_EMAIL === "1" || !process.env.RESEND_API_KEY) {
    cached = globalMockEmailProvider;
    return cached;
  }
  cached = new ResendEmailProvider(
    process.env.RESEND_API_KEY,
    process.env.EMAIL_FROM ?? "MeetSpace <onboarding@resend.dev>"
  );
  return cached;
}

export function emailTemplate(params: { title: string; bodyLines: string[] }): {
  html: string;
  text: string;
} {
  const text = `${params.title}\n\n${params.bodyLines.join("\n")}`;
  const html = `<h2>${escapeHtml(params.title)}</h2>${params.bodyLines
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("")}`;
  return { html, text };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
