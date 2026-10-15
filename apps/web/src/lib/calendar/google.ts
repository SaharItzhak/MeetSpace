import { google } from "googleapis";
import type {
  CalendarProvider,
  CancelEventInput,
  CreateEventInput,
  CreateEventResult,
  FreeBusyInput,
  FreeBusyResult,
  UpdateEventInput,
} from "@meetspace/shared";

/**
 * Google Calendar implementation of the provider-agnostic `CalendarProvider` interface.
 * Takes already-refreshed OAuth tokens for the provider whose calendar is being read/
 * written — token refresh itself is handled by the NextAuth Google provider + Prisma
 * adapter (see src/auth.ts), which keeps a current `refresh_token`/`access_token` on
 * the provider's `Account` row.
 */
export class GoogleCalendarProvider implements CalendarProvider {
  readonly id = "google";
  private readonly client: ReturnType<typeof google.calendar>;

  constructor(accessToken: string, refreshToken?: string | null) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken ?? undefined,
    });
    this.client = google.calendar({ version: "v3", auth: oauth2Client });
  }

  async freeBusy(input: FreeBusyInput): Promise<FreeBusyResult> {
    const response = await this.client.freebusy.query({
      requestBody: {
        timeMin: input.timeMin.toISOString(),
        timeMax: input.timeMax.toISOString(),
        items: [{ id: input.calendarId }],
      },
    });
    const calendarBusy = response.data.calendars?.[input.calendarId]?.busy ?? [];
    return {
      busy: calendarBusy
        .filter((period) => period.start && period.end)
        .map((period) => ({
          start: new Date(period.start as string),
          end: new Date(period.end as string),
        })),
    };
  }

  async createEvent(input: CreateEventInput): Promise<CreateEventResult> {
    const response = await this.client.events.insert({
      calendarId: input.calendarId,
      sendUpdates: "all",
      requestBody: {
        summary: input.title,
        description: input.description,
        start: { dateTime: input.start.toISOString(), timeZone: input.timezone },
        end: { dateTime: input.end.toISOString(), timeZone: input.timezone },
        attendees: input.attendeeEmails.map((email) => ({ email })),
      },
    });
    return {
      externalEventId: response.data.id ?? "",
      htmlLink: response.data.htmlLink ?? undefined,
    };
  }

  async updateEvent(input: UpdateEventInput): Promise<void> {
    const requestBody: Record<string, unknown> = {};
    if (input.title) requestBody.summary = input.title;
    if (input.description) requestBody.description = input.description;
    if (input.start) {
      requestBody.start = { dateTime: input.start.toISOString(), timeZone: input.timezone };
    }
    if (input.end) {
      requestBody.end = { dateTime: input.end.toISOString(), timeZone: input.timezone };
    }
    await this.client.events.patch({
      calendarId: input.calendarId,
      eventId: input.externalEventId,
      sendUpdates: "all",
      requestBody,
    });
  }

  async cancelEvent(input: CancelEventInput): Promise<void> {
    try {
      await this.client.events.delete({
        calendarId: input.calendarId,
        eventId: input.externalEventId,
        sendUpdates: "all",
      });
    } catch (error: unknown) {
      // Treat "already gone" as a success — cancellation is idempotent.
      const status = (error as { code?: number; status?: number })?.code ??
        (error as { code?: number; status?: number })?.status;
      if (status !== 404 && status !== 410) {
        throw error;
      }
    }
  }
}
