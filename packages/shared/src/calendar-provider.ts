import type { Interval } from "./types.js";

/** A single Google-style freebusy response for one calendar. */
export interface FreeBusyResult {
  busy: Interval[];
}

export interface CreateEventInput {
  /** Calendar-account-scoped identifier for the calendar to create the event on. */
  calendarId: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
  attendeeEmails: string[];
  /** IANA timezone for the event, e.g. "America/New_York". */
  timezone: string;
}

export interface CreateEventResult {
  /** Provider-specific event id, stored so we can update/cancel it later. */
  externalEventId: string;
  /** A link to view the event, if the provider exposes one. */
  htmlLink?: string;
}

export interface UpdateEventInput {
  calendarId: string;
  externalEventId: string;
  title?: string;
  description?: string;
  start?: Date;
  end?: Date;
  timezone?: string;
}

export interface CancelEventInput {
  calendarId: string;
  externalEventId: string;
}

export interface FreeBusyInput {
  calendarId: string;
  timeMin: Date;
  timeMax: Date;
}

/**
 * Provider-agnostic calendar integration surface. Only `GoogleCalendarProvider` is
 * implemented for v1; Outlook (Microsoft Graph) and Apple (CalDAV) adapters can be
 * added later by implementing this same interface without touching booking logic.
 */
export interface CalendarProvider {
  readonly id: string;
  freeBusy(input: FreeBusyInput): Promise<FreeBusyResult>;
  createEvent(input: CreateEventInput): Promise<CreateEventResult>;
  updateEvent(input: UpdateEventInput): Promise<void>;
  cancelEvent(input: CancelEventInput): Promise<void>;
}
