type Entry = { version: string; date: string; summary: string };
export function VersionCard({ current, changelog }: { current: string; changelog: Entry[] }) {
  return (
    <div className="rounded-xl bg-white ring-1 ring-gray-200 shadow-sm p-4">
      <h2 className="text-xs uppercase tracking-wide font-bold text-gray-500 mb-2">Omar active version</h2>
      <p className="text-lg font-heading font-semibold text-navy">v{current} <span className="text-xs text-gray-400 font-body">· prompt + scoring</span></p>
      <ul className="mt-2 space-y-1">
        {changelog.map((c) => <li key={c.version} className="text-[11px] text-gray-500">v{c.version} ({c.date}) — {c.summary}</li>)}
      </ul>
    </div>
  );
}
