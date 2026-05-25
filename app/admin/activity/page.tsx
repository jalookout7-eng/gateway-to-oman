"use client";

import { useState, useEffect, useCallback } from "react";
import { Activity, Bot, Shield, Server, User, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

type LogEntry = {
  id: string;
  actor_type: "bot" | "admin" | "system" | "visitor";
  actor_id: string | null;
  actor_email: string | null;
  actor_name: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  source: string;
  metadata: unknown;
  ip: string | null;
  created_at: string;
};

const ACTOR_ICONS: Record<LogEntry["actor_type"], typeof Bot> = {
  bot: Bot,
  admin: Shield,
  system: Server,
  visitor: User,
};

const ACTOR_STYLES: Record<LogEntry["actor_type"], string> = {
  bot: "bg-purple-50 text-purple-700 ring-purple-200",
  admin: "bg-amber-50 text-amber-700 ring-amber-200",
  system: "bg-gray-100 text-gray-600 ring-gray-200",
  visitor: "bg-blue-50 text-blue-700 ring-blue-200",
};

function authHeaders() {
  return { "Content-Type": "application/json" };
}

export default function AdminActivityPage() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actor, setActor] = useState<"all" | LogEntry["actor_type"]>("all");
  const [source, setSource] = useState<"all" | "main" | "businesses">("all");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (actor !== "all") params.set("actor", actor);
      if (source !== "all") params.set("source", source);
      if (action.trim()) params.set("action", action.trim());
      params.set("page", String(page));

      const res = await fetch(`/api/admin/activity?${params.toString()}`, {
        headers: authHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setEntries(data.entries);
      setHasMore(data.hasMore);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [actor, source, action, page]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    setPage(1);
  }, [actor, source, action]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-navy">Activity log</h1>
        <p className="text-sm text-gray-500 mt-1">
          Audit trail across bot, admin, system, and visitor actions. {total > 0 && `${total.toLocaleString()} entries.`}
        </p>
      </div>

      <div className="rounded-xl bg-white ring-1 ring-gray-200 shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 p-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Actor</span>
            {(["all", "bot", "admin", "system", "visitor"] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setActor(a)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  actor === a ? "bg-navy text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                {a.charAt(0).toUpperCase() + a.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Source</span>
            {(["all", "main", "businesses"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSource(s)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  source === s ? "bg-navy text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
            <input
              type="search"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="Filter by action (e.g. lead_captured)…"
              className="ml-auto w-full sm:w-64 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm focus:bg-white focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400 inline-flex items-center justify-center gap-2 w-full">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading activity…
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="mx-auto h-10 w-10 text-gray-300" strokeWidth={1.5} />
            <p className="mt-3 font-heading text-lg font-semibold text-navy">No activity matches your filters.</p>
            <p className="mt-1 text-sm text-gray-500">Try clearing filters above.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {entries.map((e) => (
              <ActivityRow key={e.id} entry={e} />
            ))}
          </ul>
        )}

        {(page > 1 || hasMore) && !loading && (
          <div className="border-t border-gray-100 p-3 flex items-center justify-between">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-navy disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <span className="text-xs text-gray-500">Page {page}</span>
            <button
              type="button"
              disabled={!hasMore}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-navy disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityRow({ entry: e }: { entry: LogEntry }) {
  const Icon = ACTOR_ICONS[e.actor_type];
  return (
    <li className="p-4 hover:bg-gray-50/50 transition-colors">
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full ring-1 ring-inset flex-shrink-0 ${ACTOR_STYLES[e.actor_type]}`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {e.actor_type}
              {e.actor_email && <span className="ml-1 text-gray-400 normal-case font-normal">· {e.actor_email}</span>}
            </span>
            <span className="text-xs text-gray-400">{new Date(e.created_at).toLocaleString()}</span>
          </div>
          <p className="mt-1 text-sm text-navy font-medium">
            <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{e.action}</span>
            {e.target_type && (
              <span className="ml-2 text-gray-600 text-sm">
                → {e.target_type}
                {e.target_id && <span className="ml-1 font-mono text-xs text-gray-400">{String(e.target_id).slice(0, 8)}…</span>}
              </span>
            )}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
            {e.source && <span>source: {e.source}</span>}
            {e.ip && <span>ip: {e.ip}</span>}
          </div>
          {e.metadata !== null && e.metadata !== undefined && (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer text-gray-500 hover:text-navy">metadata</summary>
              <pre className="mt-1 bg-gray-50 ring-1 ring-gray-100 rounded p-2 overflow-auto text-gray-700">
                {JSON.stringify(e.metadata, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    </li>
  );
}
