"use client";

import { useEffect } from "react";

/** Registers the PWA service worker on mount. Renders nothing. */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Non-fatal: the app still works without offline support.
      });
    }
  }, []);
  return null;
}
