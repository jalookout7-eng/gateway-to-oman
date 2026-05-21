// lib/intelligence/one-pager.ts
import type { TierPrecision, ConversionStats, DataCoverage, TopSource } from "./queries";
import type { ChangelogEntry } from "@/lib/ai/version";

export interface OnePagerInput {
  period: string;
  coverage: DataCoverage;
  precision: TierPrecision[];
  topSource: TopSource | null;
  conversion: { current: ConversionStats; previous: ConversionStats | null };
  changelog: ChangelogEntry[];
  learnings: { title: string; body: string | null }[];
  prose: { happened?: string; omar?: string; next?: string };
}

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const pct = (n: number | null) => (n === null ? "—" : `${n}%`);

export function renderOnePagerMarkdown(input: OnePagerInput): string {
  const { period, coverage, precision, topSource, conversion, changelog, learnings, prose } = input;
  const lines: string[] = [];
  lines.push(`# Gateway to Oman — Intelligence Summary (${period})`, "");

  lines.push("## What happened", "");
  lines.push(`- ${coverage.total} leads this period (${coverage.resolved} resolved, ${coverage.pending} pending).`);
  lines.push(`- Conversion rate: ${pct(conversion.current.ratePct)} (${conversion.current.converted}/${conversion.current.leads}).`);
  if (topSource) lines.push(`- Top source: ${topSource.source} (${topSource.count} leads).`);
  if (prose.happened) lines.push("", prose.happened);
  lines.push("");

  lines.push("## How Omar performed", "");
  for (const p of precision) {
    lines.push(`- ${cap(p.tier)}: ${pct(p.convertedPct)} converted · ${pct(p.engagedPct)} engaged (${p.resolved} resolved).`);
  }
  if (prose.omar) lines.push("", prose.omar);
  lines.push("");

  lines.push("## Conversion change", "");
  if (conversion.previous && conversion.previous.ratePct !== null && conversion.current.ratePct !== null) {
    const delta = conversion.current.ratePct - conversion.previous.ratePct;
    const sign = delta >= 0 ? "+" : "";
    lines.push(`- This period ${pct(conversion.current.ratePct)} vs last period ${pct(conversion.previous.ratePct)} (${sign}${delta} pts).`);
  } else {
    lines.push("- First period with data — treat as the baseline month; deltas start next period.");
  }
  lines.push("");

  lines.push("## What changed in the system", "");
  if (changelog.length) for (const c of changelog) lines.push(`- v${c.version} (${c.date}): ${c.summary}`);
  else lines.push("- No version changes this period.");
  lines.push("");

  lines.push("## What we're learning", "");
  if (learnings.length) for (const l of learnings) lines.push(`- ${l.title}${l.body ? ` — ${l.body}` : ""}`);
  else lines.push("- (none recorded yet)");
  lines.push("");

  lines.push("## What to expect next", "");
  lines.push(prose.next || "- (add your outlook)");
  lines.push("");

  return lines.join("\n");
}
