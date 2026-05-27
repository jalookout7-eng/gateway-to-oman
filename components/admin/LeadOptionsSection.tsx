"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";

type Kind = "status" | "qualification" | "segment";

interface LeadOption {
  kind: Kind;
  slug: string;
  label: string;
  color: string | null;
  sort_order: number;
  active: boolean;
}

const KIND_LABELS: Record<Kind, { title: string; help: string }> = {
  status: {
    title: "Statuses",
    help: "Where the lead is in your workflow (e.g. New, Contacted, Converted).",
  },
  qualification: {
    title: "Qualifications",
    help: "How qualified the lead is (e.g. Hot, Warm, Cold).",
  },
  segment: {
    title: "Segments",
    help: "What category of person they are (e.g. Entrepreneur, Investor, Retiree).",
  },
};

const COLORS = [
  "slate", "gray", "zinc", "red", "amber", "yellow",
  "lime", "green", "emerald", "teal", "cyan", "sky",
  "blue", "indigo", "violet", "purple", "pink", "rose",
];

// Map colour token → tailwind chip classes used in the preview swatch
function colorChipClass(color: string | null): string {
  if (!color) return "bg-gray-100 text-gray-600";
  // Use only colours that exist in COLORS — Tailwind needs class names known
  // at build time, so we map via a switch.
  const map: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    gray: "bg-gray-100 text-gray-700",
    zinc: "bg-zinc-100 text-zinc-700",
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
    yellow: "bg-yellow-100 text-yellow-700",
    lime: "bg-lime-100 text-lime-700",
    green: "bg-green-100 text-green-700",
    emerald: "bg-emerald-100 text-emerald-700",
    teal: "bg-teal-100 text-teal-700",
    cyan: "bg-cyan-100 text-cyan-700",
    sky: "bg-sky-100 text-sky-700",
    blue: "bg-blue-100 text-blue-700",
    indigo: "bg-indigo-100 text-indigo-700",
    violet: "bg-violet-100 text-violet-700",
    purple: "bg-purple-100 text-purple-700",
    pink: "bg-pink-100 text-pink-700",
    rose: "bg-rose-100 text-rose-700",
  };
  return map[color] ?? "bg-gray-100 text-gray-600";
}

export function LeadOptionsSection() {
  const [options, setOptions] = useState<LeadOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOptions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/lead-options?includeInactive=1", {
        credentials: "include",
      });
      if (!res.ok) {
        setError("Could not load lead options.");
        return;
      }
      const data = (await res.json()) as { options: LeadOption[] };
      setOptions(data.options);
    } catch {
      setError("Network error loading lead options.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  async function handleCreate(kind: Kind, label: string, color: string | null) {
    if (!label.trim()) return;
    const res = await fetch("/api/admin/lead-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ kind, label: label.trim(), color }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not create option.");
      return;
    }
    setError("");
    fetchOptions();
  }

  async function handleUpdate(opt: LeadOption, patch: Partial<LeadOption>) {
    const res = await fetch(`/api/admin/lead-options/${opt.kind}/${opt.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not update option.");
      return;
    }
    setError("");
    fetchOptions();
  }

  async function handleDelete(opt: LeadOption) {
    if (!window.confirm(`Delete "${opt.label}" permanently? Existing leads using this value will keep it but it won't appear in dropdowns again.`)) {
      return;
    }
    const res = await fetch(`/api/admin/lead-options/${opt.kind}/${opt.slug}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not delete option.");
      return;
    }
    const data = await res.json();
    if (data.leads_referencing > 0) {
      window.alert(`Deleted. ${data.leads_referencing} lead(s) still have this value — open those leads to pick a replacement.`);
    }
    setError("");
    fetchOptions();
  }

  const byKind = (kind: Kind) =>
    options.filter((o) => o.kind === kind).sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-600">
          Status, qualification, and segment values that appear in lead dropdowns. Adding here makes them
          available everywhere — filters, lead rows, CSV exports.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">{error}</div>
      )}

      {loading ? (
        <div className="text-sm text-gray-400">Loading…</div>
      ) : (
        <div className="space-y-8">
          {(["status", "qualification", "segment"] as const).map((kind) => (
            <KindBlock
              key={kind}
              kind={kind}
              title={KIND_LABELS[kind].title}
              help={KIND_LABELS[kind].help}
              items={byKind(kind)}
              onCreate={(label, color) => handleCreate(kind, label, color)}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function KindBlock({
  kind,
  title,
  help,
  items,
  onCreate,
  onUpdate,
  onDelete,
}: {
  kind: Kind;
  title: string;
  help: string;
  items: LeadOption[];
  onCreate: (label: string, color: string | null) => void;
  onUpdate: (opt: LeadOption, patch: Partial<LeadOption>) => void;
  onDelete: (opt: LeadOption) => void;
}) {
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState<string>("");

  function submitNew() {
    if (!newLabel.trim()) return;
    onCreate(newLabel, newColor || null);
    setNewLabel("");
    setNewColor("");
  }

  return (
    <section className="border border-gray-200 rounded-xl p-4 bg-white">
      <header className="mb-3">
        <h3 className="text-sm font-semibold text-navy">{title}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{help}</p>
      </header>

      <ul className="space-y-2">
        {items.length === 0 && (
          <li className="text-xs text-gray-400 italic">No options yet — add one below.</li>
        )}
        {items.map((opt) => (
          <li key={opt.slug} className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${opt.active ? "bg-white border-gray-200" : "bg-gray-50 border-gray-100 opacity-60"}`}>
            <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
            <span className={`text-xs px-2 py-0.5 rounded-full ${colorChipClass(opt.color)}`}>
              {opt.label}
            </span>
            <input
              type="text"
              defaultValue={opt.label}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== opt.label) onUpdate(opt, { label: v });
              }}
              className="text-sm flex-1 min-w-0 px-2 py-1 rounded border border-transparent hover:border-gray-200 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/20 bg-transparent"
              aria-label="Label"
            />
            <code className="text-xs text-gray-400 hidden sm:inline">{opt.slug}</code>
            <select
              value={opt.color ?? ""}
              onChange={(e) => onUpdate(opt, { color: e.target.value || null })}
              className="text-xs rounded border border-gray-200 bg-white px-1.5 py-1"
              aria-label="Colour"
            >
              <option value="">no colour</option>
              {COLORS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              type="number"
              defaultValue={opt.sort_order}
              onBlur={(e) => {
                const v = Number(e.target.value);
                if (!Number.isNaN(v) && v !== opt.sort_order) onUpdate(opt, { sort_order: v });
              }}
              className="w-16 text-xs px-2 py-1 rounded border border-gray-200"
              aria-label="Sort order"
              title="Sort order"
            />
            <label className="text-xs text-gray-500 flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={opt.active}
                onChange={(e) => onUpdate(opt, { active: e.target.checked })}
                className="cursor-pointer"
              />
              active
            </label>
            <button
              onClick={() => onDelete(opt)}
              aria-label={`Delete ${opt.label}`}
              className="text-gray-300 hover:text-red-500 transition-colors p-1"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submitNew(); }}
          placeholder={`Add a new ${kind}…`}
          className="text-sm flex-1 px-3 py-1.5 rounded border border-gray-200 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
        />
        <select
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          className="text-xs rounded border border-gray-200 bg-white px-2"
          aria-label="Colour for new option"
        >
          <option value="">colour…</option>
          {COLORS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          onClick={submitNew}
          disabled={!newLabel.trim()}
          className="text-sm px-3 py-1.5 gold-gradient text-white rounded font-medium hover:shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>
    </section>
  );
}
