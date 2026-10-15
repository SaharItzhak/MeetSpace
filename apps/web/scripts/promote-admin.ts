import { PrismaClient } from "@prisma/client";

/**
 * One-time helper to promote an already-registered account to ADMIN by email, without
 * anyone but the account owner ever having typed/handled their password.
 *
 * Usage (after the user has registered an account themselves via /register or Google
 * sign-in):
 *
 *   npm run promote-admin -- someone@example.com
 *
 * For a repeatable/production setup, prefer setting ADMIN_BOOTSTRAP_EMAILS instead (see
 * README) so the promotion happens automatically the moment that email registers —
 * this script is for promoting an account that already existed before you set that env
 * var, or for one-off fixes.
 */
async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npm run promote-admin -- <email>");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user found with email ${email}. They must register first.`);
    await prisma.$disconnect();
    process.exit(1);
  }

  await prisma.user.update({ where: { email }, data: { role: "ADMIN" } });
  console.log(`✔ ${email} is now an ADMIN.`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
