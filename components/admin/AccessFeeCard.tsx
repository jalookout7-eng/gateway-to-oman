"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Banknote } from "lucide-react";

function authHeaders() {
  return { "Content-Type": "application/json" };
}

export function AccessFeeCard() {
  const [fee, setFee] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings/marketplace", { headers: authHeaders(), credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.marketplace_access_fee_omr === "number") {
          setFee(data.marketplace_access_fee_omr);
          setDraft(String(data.marketplace_access_fee_omr));
        }
      })
      .catch(() => undefined);
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(draft);
    if (!Number.isFinite(amount) || amount < 0) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings/marketplace", {
        method: "PUT",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify({ marketplace_access_fee_omr: amount }),
      });
      if (res.ok) {
        const data = await res.json();
        setFee(data.marketplace_access_fee_omr);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl bg-white ring-1 ring-gray-200 shadow-sm p-5">
      <div className="flex items-center gap-3">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gold/10 text-gold">
          <Banknote className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-heading text-base font-semibold text-navy">
            Marketplace access fee
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Shown on the access page when visitors click any listing card.
          </p>
        </div>
      </div>
      <form onSubmit={handleSave} className="mt-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500">
            OMR
          </span>
          <input
            type="number"
            min={0}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={fee === null}
            className="w-full rounded-md border border-gray-200 bg-gray-50 pl-12 pr-3 py-2 text-sm font-semibold focus:bg-white focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={saving || fee === null || Number(draft) === fee}
          className="inline-flex items-center gap-1.5 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-light transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? "Saving" : "Save"}
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm text-emerald-600 font-medium">
            <Check className="h-4 w-4" />
            Saved
          </span>
        )}
      </form>
    </div>
  );
}
