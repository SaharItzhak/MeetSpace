"use client";

import { useState } from "react";

/** Copies the full public booking URL to the clipboard with brief confirmation feedback. */
export default function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  async function onClick() {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — fail silently, link is
      // still visible and clickable on the page.
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium hover:bg-slate-50"
    >
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}
