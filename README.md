# MeetSpace

MeetSpace lets anyone act as a **Provider** (define call-slot availability, synced with
real Google Calendar busy times) and/or a **Requester** (book an open slot on a provider's
public page). Think "kindergarten teacher office hours," but generic enough for any
1:1 scheduling use case.

This is a v1 / MVP build. See [Scope & limitations](#scope--limitations-v1) at the bottom
before relying on it for anything beyond a demo.

## How it works

1. **Become a provider**: sign in with Google, connect your Google Calendar
   (incremental OAuth — calendar scope is only requested once you opt in), set a slug
   (`/book/your-slug`), timezone, default call duration, weekly recurring availability,
   and blackout/vacation dates.
2. **Requesters** open `/book/your-slug`, see real open slots (your weekly rules minus
   blackout dates minus whatever Google Calendar reports as busy via the Freebusy API,
   minus other pending/approved MeetSpace bookings), pick one, and submit their name,
   email, phone number, and an optional note. This creates a **pending** booking — nothing
   touches any calendar yet.
3. **Providers** see pending requests on `/dashboard` and approve or decline.
   - Approving creates a real Google Calendar event on the provider's calendar with the
     requester added as an attendee (`sendUpdates=all`, so Google emails them an
     invite/.ics automatically — no OAuth needed on the requester's side). The event
     description includes the requester's phone number (for an actual phone call) and a
     free, no-signup Jitsi Meet link (`https://meet.jit.si/<random-room-id>`) as a video
     alternative.
   - Declining just marks the booking declined; the slot becomes bookable again.
4. **Reminders**: independent of Google Calendar's own reminders, MeetSpace sends its own
   email (via Resend) a configurable number of minutes before each approved call. Each
   account has a default lead time in account settings, overridable per booking. Because
   Vercel's free-tier Cron only fires daily, a **GitHub Actions workflow** polls a protected
   API route every ~5 minutes to send any reminders that are due. Sending is idempotent — a
   `ReminderLog` row with a unique constraint on the booking is used as an atomic "claim",
   so a booking is never reminded twice even if two poll runs overlap.
5. **Cancelling**: either party can cancel a pending or approved booking from their
   dashboard. Cancelling an approved booking deletes the Google Calendar event via the API
   and emails the other party. Rescheduling is intentionally v1-simple: cancel, then submit
   a new request.

## Repo layout

npm workspaces monorepo:

```
apps/web         Next.js 16 (App Router, TypeScript, Tailwind) — the only deployable app today
packages/shared   Pure TS domain logic: types, timezone/interval math, slot computation,
                  overlap detection, reminder-due calculation, CalendarProvider /
                  EmailProvider interfaces, zod validation schemas, Jitsi room helper.
                  Framework-agnostic so apps/mobile (future Expo app) can reuse it.
apps/mobile       Not built yet — reserved for a future React Native/Expo app (explicit
                  future phase, out of scope for this build).
```

### Why a provider-agnostic calendar adapter?

`packages/shared/src/calendar-provider.ts` defines a `CalendarProvider` interface
(`freeBusy`, `createEvent`, `updateEvent`, `cancelEvent`). `apps/web/src/lib/calendar/`
implements:
- `GoogleCalendarProvider` — real Google Calendar API v3 (events + freebusy), with
  automatic access-token refresh.
- `MockCalendarProvider` — in-memory fake used in dev/tests (`MOCK_CALENDAR=1`).

Booking logic (`apps/web/src/lib/booking/service.ts`) only ever talks to the interface, so
adding Outlook (Microsoft Graph) or Apple (CalDAV) later is a new adapter file, not a
rewrite. Email works the same way via `EmailProvider` (`ResendEmailProvider` /
`MockEmailProvider`).

## Prerequisites

- Node.js **20+** (the app was built/tested against 20.18.0; Next.js 16 will not run on
  very old Node, and some devDependencies warn below Node 20.19 — that warning is
  harmless).
- A Postgres database. This project is tested against **Supabase** or **Neon** free tiers
  (either works — Prisma just needs a standard `postgresql://` connection string).
- A Google Cloud OAuth client (for real Google sign-in/calendar sync) — optional for local
  dev if you use the mock adapters (see below).
- A [Resend](https://resend.com) API key (optional for local dev — mock email adapter is
  available).

## Environment variables

Copy `apps/web/.env.example` to `apps/web/.env` and fill in real values. Summary:

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string (Supabase/Neon) |
| `AUTH_SECRET` | yes | Auth.js session/JWT signing secret (`npx auth secret`) |
| `NEXTAUTH_SECRET` | yes (alias) | Kept equal to `AUTH_SECRET` for tooling that still looks for the old name |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | for real Google sign-in/calendar | OAuth client from Google Cloud Console, Calendar API enabled |
| `RESEND_API_KEY` | for real emails | Resend API key |
| `EMAIL_FROM` | no (has default) | "From" address used for reminder/notification emails |
| `CRON_SECRET` | yes (once deployed) | Bearer token the reminders-cron GitHub Action must present to `/api/cron/reminders` |
| `MOCK_CALENDAR` / `MOCK_EMAIL` | no | Set to `1` to use in-memory fake Calendar/Email adapters instead of real Google/Resend — used automatically in CI and recommended until you've configured real credentials |

## Running locally

```powershell
# from repo root
npm install

# apps/web/.env - copy from .env.example and fill in DATABASE_URL at minimum;
# set MOCK_CALENDAR=1 and MOCK_EMAIL=1 to skip Google/Resend setup for now.

# create tables (first time, or after schema changes)
npx prisma db push --schema apps/web/prisma/schema.prisma
# (or, to maintain a migration history instead of `db push`:
#  npm run prisma:migrate --workspace=apps/web -- --name init)

npm run dev
# -> http://localhost:3000
```

### Seeding test data

`apps/web/prisma/seed.ts` wipes and recreates a single test provider
(`provider@test.local` / `test-password-123`, slug `test-provider`) with wide-open weekly
availability — used by the Playwright e2e tests and handy for manual testing too:

```powershell
npm run db:seed --workspace=apps/web
```

## Testing

```powershell
npm run test               # Vitest unit tests (packages/shared): slot computation,
                            # overlap/conflict detection, reminder-due scheduling
npm run typecheck          # tsc --noEmit across both workspaces
npm run lint               # eslint (apps/web)
npm run build              # prisma generate + next build (apps/web), shared build first
npm run test:e2e --workspace=apps/web   # Playwright, needs a running Postgres + seed + dev server
```

Playwright (`apps/web/playwright.config.ts`) auto-starts `next dev` against
`DATABASE_URL`/`MOCK_CALENDAR=1`/`MOCK_EMAIL=1` locally, or you can point it at an
already-running server with `PLAYWRIGHT_BASE_URL`. The two specs under `apps/web/e2e/`
cover the critical path end-to-end: provider has availability → requester books → provider
approves → booking shows correct requester details; and a decline flow that reopens the
slot. CI runs these against a real Postgres service container (see
`.github/workflows/ci.yml`); this sandboxed dev environment has no local Postgres, so the
e2e suite was written and typechecked here but verified in CI rather than run locally —
flagged explicitly as a known gap below.

## CI / automation

- **`.github/workflows/ci.yml`** — on every push/PR: lint, typecheck, unit tests, build,
  then a second job spins up a Postgres service container, pushes the Prisma schema,
  seeds it, builds, boots the app, and runs the Playwright suite with mocked
  calendar/email adapters.
- **`.github/workflows/reminders-cron.yml`** — runs every 5 minutes
  (`cron: "*/5 * * * *"`) and POSTs to `/api/cron/reminders` with a bearer `CRON_SECRET`.
  Requires two **repository secrets** once you deploy: `APP_URL` (your deployed app's base
  URL) and `CRON_SECRET` (must match the same env var set on the deployment). If either is
  unset, the job logs a message and exits successfully instead of failing (so the
  workflow doesn't spam failure emails before you've deployed anything).

## Deploying to Vercel

1. Create a Postgres database (Supabase or Neon free tier) and copy its connection string.
2. Import this repo into Vercel. In the project's **Settings → General**, set
   **Root Directory** to `apps/web` (Vercel will still run `npm install` from the repo
   root first since it detects the npm workspaces setup, so `packages/shared` resolves
   correctly). Framework preset: Next.js. Build command can stay the default
   (`npm run build`, which runs `prisma generate && next build`).
3. Set environment variables in the Vercel project (same names as `.env.example`):
   `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`,
   `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`. Leave
   `MOCK_CALENDAR`/`MOCK_EMAIL` unset in production.
4. In Google Cloud Console, add your Vercel URL's OAuth redirect:
   `https://<your-app>.vercel.app/api/auth/callback/google`, and enable the
   **Google Calendar API** on that project.
5. Run `npx prisma db push` (or `migrate deploy` if you maintain migrations) against the
   production `DATABASE_URL` once, from your machine or a one-off Vercel deploy hook.
6. Add GitHub repo secrets `APP_URL` (`https://<your-app>.vercel.app`) and `CRON_SECRET`
   (same value as the Vercel env var) so `reminders-cron.yml` can reach the deployed app.

## PWA

`apps/web/src/app/manifest.ts` + `public/sw.js` (cache-first for static assets, always
network for `/api/*`) make the app installable on mobile/desktop home screens for an
app-like experience, with no app-store cost. Native iOS/Android apps (React Native/Expo,
reusing `packages/shared`) are an explicit future phase and not part of this build.

## Scope & limitations (v1)

- **Google Calendar only.** Outlook/Microsoft Graph and Apple/CalDAV adapters are not
  implemented — the `CalendarProvider` interface exists specifically so they can be added
  later without touching booking logic.
- **Email reminders only** — no SMS/push notifications in this build.
- **Web/PWA only** — no native mobile app yet (`apps/mobile` is a reserved, empty
  placeholder for that future phase).
- **Reschedule = cancel + rebook.** No in-place reschedule UI in v1.
- **Guest bookings are allowed.** A requester does not need an account to submit a
  booking request — their name/email/phone are stored directly on the `Booking` row, and a
  unique `cancelToken` is generated so a guest could self-service cancel via a tokenized
  link in a future iteration (the dashboard-based cancel flow covers signed-in users today).
- **Conflict prevention is best-effort between Google freebusy and MeetSpace's own pending
  bookings** — there's a small race window between a requester submitting a request and a
  provider approving it where two different requesters could both have a pending request
  for the same slot; approving one does not retroactively invalidate the other, so a
  provider should decline the second ("double-booked") request on review. The UI does not
  yet proactively warn about this overlap.
- **e2e tests are written and typechecked but have not been executed in this sandboxed dev
  environment** (no local Postgres available here) — they run against a real Postgres
  service container in GitHub Actions CI, which is the source of truth for whether the
  critical booking path works end-to-end.
- **Next.js 16 "Cache Components"** (`cacheComponents`/`partialPrefetching`) are
  intentionally left disabled in `next.config.ts` — this app is fundamentally dynamic
  (per-user dashboards, live calendar data), and enabling that feature would require
  wrapping most pages in Suspense boundaries for no real benefit here.
