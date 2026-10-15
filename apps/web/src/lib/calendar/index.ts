import type { CalendarProvider } from "@meetspace/shared";
import { prisma } from "@/lib/prisma";
import { GoogleCalendarProvider } from "./google";
import { MockCalendarProvider } from "./mock";

/**
 * Resolves a ready-to-use `CalendarProvider` for a given app user, refreshing their
 * Google access token first if it has expired. Falls back to an in-memory mock when
 * `MOCK_CALENDAR=1` (used by Playwright e2e and local dev without Google credentials).
 */
export async function getCalendarProviderForUser(userId: string): Promise<CalendarProvider> {
  if (process.env.MOCK_CALENDAR === "1") {
    return new MockCalendarProvider();
  }

  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });
  if (!account?.access_token) {
    throw new Error("No connected Google account found for this user. Reconnect Google Calendar.");
  }

  let accessToken = account.access_token;
  const isExpired = account.expires_at != null && account.expires_at * 1000 < Date.now();

  if (isExpired && account.refresh_token) {
    const refreshed = await refreshGoogleAccessToken(account.refresh_token);
    accessToken = refreshed.access_token;
    await prisma.account.update({
      where: { id: account.id },
      data: {
        access_token: refreshed.access_token,
        expires_at: refreshed.expires_at,
      },
    });
  }

  return new GoogleCalendarProvider(accessToken, account.refresh_token);
}

async function refreshGoogleAccessToken(
  refreshToken: string
): Promise<{ access_token: string; expires_at: number }> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to refresh Google access token: ${response.status}`);
  }
  const json = (await response.json()) as { access_token: string; expires_in: number };
  return {
    access_token: json.access_token,
    expires_at: Math.floor(Date.now() / 1000) + json.expires_in,
  };
}
