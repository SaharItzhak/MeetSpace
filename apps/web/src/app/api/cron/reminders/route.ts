import { NextResponse } from "next/server";
import { sendDueReminders } from "@/lib/booking/reminders";

/**
 * Protected endpoint polled every ~5 minutes by the `reminders-cron` GitHub Actions
 * workflow (Vercel's free Cron tier only supports daily schedules, which isn't tight
 * enough for lead times like 30 minutes). Auth is a shared-secret header rather than a
 * user session since this is called machine-to-machine.
 */
export async function POST(request: Request) {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendDueReminders();
  return NextResponse.json(result);
}
