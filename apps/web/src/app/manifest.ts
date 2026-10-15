import type { MetadataRoute } from "next";

/** Generates /manifest.webmanifest so the app is installable as a PWA. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MeetSpace",
    short_name: "MeetSpace",
    description: "Book a call slot with a provider's real Google Calendar availability.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    icons: [
      { src: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
