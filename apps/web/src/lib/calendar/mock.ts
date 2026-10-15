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
 * In-memory fake calendar adapter used by tests (and local dev without Google
 * credentials configured). Implements the same `CalendarProvider` interface as
 * `GoogleCalendarProvider`, so booking logic never has to know which one it's using.
 */
export class MockCalendarProvider implements CalendarProvider {
  readonly id = "mock";
  readonly events = new Map<string, CreateEventInput>();
  private nextId = 1;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature must match CalendarProvider
  async freeBusy(_input: FreeBusyInput): Promise<FreeBusyResult> {
    return {
      busy: [...this.events.values()].map((event) => ({ start: event.start, end: event.end })),
    };
  }

  async createEvent(input: CreateEventInput): Promise<CreateEventResult> {
    const externalEventId = `mock-event-${this.nextId++}`;
    this.events.set(externalEventId, input);
    return { externalEventId, htmlLink: `https://mock.calendar.test/${externalEventId}` };
  }

  async updateEvent(input: UpdateEventInput): Promise<void> {
    const existing = this.events.get(input.externalEventId);
    if (!existing) return;
    this.events.set(input.externalEventId, {
      ...existing,
      title: input.title ?? existing.title,
      description: input.description ?? existing.description,
      start: input.start ?? existing.start,
      end: input.end ?? existing.end,
      timezone: input.timezone ?? existing.timezone,
    });
  }

  async cancelEvent(input: CancelEventInput): Promise<void> {
    this.events.delete(input.externalEventId);
  }
}
