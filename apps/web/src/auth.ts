import NextAuth, { type DefaultSession } from "next-auth";
import type { Provider } from "next-auth/providers";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "USER" | "ADMIN";
    } & DefaultSession["user"];
  }
}

// Base Google OAuth scope: just identity. We deliberately do NOT request the Calendar
// scope here — that's requested incrementally (see src/app/become-provider actions)
// only once a user opts in to being a Provider, per the product requirement.
const BASE_GOOGLE_SCOPE = "openid email profile";

const providers: Provider[] = [
  Google({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    authorization: {
      params: {
        scope: BASE_GOOGLE_SCOPE,
        access_type: "offline",
        prompt: "consent",
      },
    },
  }),
  Credentials({
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = credentials?.email as string | undefined;
      const password = credentials?.password as string | undefined;
      if (!email || !password) return null;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user?.passwordHash) return null;

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return null;

      return { id: user.id, name: user.name, email: user.email, image: user.image };
    },
  }),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  // Required for self-hosted deployments (CI's `next start`, Vercel preview URLs, etc.)
  // where Auth.js can't otherwise infer a trusted host from AUTH_URL/NEXTAUTH_URL and
  // would silently fail to complete the post-sign-in redirect.
  trustHost: true,
  providers,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      // Re-read role from the DB on every token refresh (not just at sign-in) so an
      // admin promotion/demotion (via the /admin UI or ADMIN_BOOTSTRAP_EMAILS) takes
      // effect on the user's next request without forcing them to sign out first.
      if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true, email: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          if (dbUser.role !== "ADMIN" && dbUser.email && isBootstrapAdminEmail(dbUser.email)) {
            await prisma.user.update({ where: { id: token.sub }, data: { role: "ADMIN" } });
            token.role = "ADMIN";
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = (token.role as "USER" | "ADMIN" | undefined) ?? "USER";
      }
      return session;
    },
  },
});

/** Comma-separated emails (set via env, never in code) that are always treated as
 * ADMIN. Lets the deployer bootstrap their own first admin account — via Google
 * sign-in or email/password registration — without anyone else ever handling their
 * credentials. */
function isBootstrapAdminEmail(email: string): boolean {
  const list = (process.env.ADMIN_BOOTSTRAP_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

/** Scope requested when a signed-in user opts in to becoming a Provider. */
export const GOOGLE_CALENDAR_SCOPE =
  "openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly";
