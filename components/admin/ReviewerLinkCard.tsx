"use client";

import { useEffect, useState } from "react";
import { Link2, Loader2, Copy, Check, RefreshCw } from "lucide-react";

function authHeaders() {
  return { "Content-Type": "application/json" };
}

export function ReviewerLinkCard() {
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shuffling, setShuffling] = useState(false);
  // null = still loading, false = failed/forbidden (render nothing), true = ok
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/admin/reviewer-link", { headers: authHeaders(), credentials: "include" })
      .then((r) => {
        if (!r.ok) {
          setOk(false);
          return null;
        }
        setOk(true);
        return r.json();
      })
      .then((data) => {
        if (data && typeof data.url === "string") setUrl(data.url);
      })
      .catch(() => setOk(false));
  }, []);

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the field is selectable as a fallback.
    }
  }

  async function shuffle() {
    if (!confirm("Generate a new link? The current link will stop working immediately.")) return;
    setShuffling(true);
    try {
      const res = await fetch("/api/admin/reviewer-link", {
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.url === "string") setUrl(data.url);
      }
    } finally {
      setShuffling(false);
    }
  }

  // The endpoint 403s for non-owner admins (intended — owner-only surface).
  // Render nothing rather than a spinner that never resolves into a card
  // they can't use anyway.
  if (ok === false) return null;

  return (
    <div className="rounded-xl bg-white ring-1 ring-gray-200 shadow-sm p-5">
      <div className="flex items-center gap-3">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gold/10 text-gold">
          <Link2 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-heading text-base font-semibold text-navy">
            Reviewer access link
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Share this to grant temporary full-marketplace access without sign-up.
            Shuffle it any time to revoke everyone who has the old link.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row items-stretch gap-2">
        <input
          readOnly
          value={url ?? "Loading…"}
          onFocus={(e) => e.currentTarget.select()}
          className="flex-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-mono text-gray-700 outline-none focus:bg-white focus:border-gold focus:ring-2 focus:ring-gold/20"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={copy}
            disabled={!url}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-navy px-3 py-2 text-sm font-semibold text-white hover:bg-navy-light transition-colors disabled:opacity-50"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={shuffle}
            disabled={shuffling || !url}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            {shuffling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Shuffle
          </button>
        </div>
      </div>
    </div>
  );
}
