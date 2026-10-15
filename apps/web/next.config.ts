import type { NextConfig } from "next";

// This app is a dynamic, per-user booking/dashboard product (Prisma reads on every
// request, session-gated pages, etc.) rather than a mostly-static site, so Next 16's
// opt-in "Cache Components" prerendering strictness is more friction than value here.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
