import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

/**
 * Resets and seeds the test database with one Provider (email/password login, wide-open
 * weekly availability) so Playwright specs have a deterministic starting point. Run with
 * `MOCK_CALENDAR=1 MOCK_EMAIL=1` so the app never touches real Google/Resend APIs.
 */
async function main() {
  const prisma = new PrismaClient();

  await prisma.reminderLog.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.weeklyAvailabilityRule.deleteMany();
  await prisma.blackoutDate.deleteMany();
  await prisma.providerProfile.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("test-password-123", 10);
  const provider = await prisma.user.create({
    data: {
      name: "Test Provider",
      email: "provider@test.local",
      passwordHash,
    },
  });

  // Demo-only admin account so the /admin user-management page can be tried out
  // locally. Same throwaway password as the other seeded fixture account — never used
  // in production, where real admins are designated via ADMIN_BOOTSTRAP_EMAILS instead.
  await prisma.user.create({
    data: {
      name: "Test Admin",
      email: "admin@test.local",
      passwordHash,
      role: "ADMIN",
    },
  });

  await prisma.providerProfile.create({
    data: {
      userId: provider.id,
      slug: "test-provider",
      displayName: "Test Provider",
      timezone: "UTC",
      slotDurationMinutes: 30,
      defaultReminderLeadMinutes: 30,
      weeklyRules: {
        // Wide open every day so the booking page always has slots regardless of
        // when the test suite happens to run.
        create: Array.from({ length: 7 }, (_, dayOfWeek) => ({
          dayOfWeek,
          startMinute: 0,
          endMinute: 23 * 60 + 30,
        })),
      },
    },
  });

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
