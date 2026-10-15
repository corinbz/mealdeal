/**
 * "Klopt niet" reports (#38) grouped by Product, so a Product reported by
 * several people, or for the same reason, stands out the way coverage gaps
 * do. Stored by functions/api/report.ts; read by scripts/reports.ts.
 */

import type { Report } from "../../functions/api/report.ts";

export type Stored = Report & { readonly receivedAt: string };

export interface ReportGroup {
  readonly chain: string;
  readonly ref: string;
  readonly name: string;
  readonly ingredient: string | null;
  readonly reports: readonly Stored[];
  /** How many of them say each thing. */
  readonly what: Readonly<Record<string, number>>;
}

export function groupReports(stored: readonly Stored[]): ReportGroup[] {
  const groups = new Map<string, Stored[]>();
  for (const r of stored) {
    const key = r.chain + "\u0000" + r.ref;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  return [...groups.values()].map((rs) => {
    const sorted = rs.slice().sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)), latest = sorted[0]!;
    const what: Record<string, number> = {};
    for (const r of rs) what[r.what] = (what[r.what] ?? 0) + 1;
    return { chain: latest.chain, ref: latest.ref, name: latest.name, ingredient: latest.ingredient, reports: sorted, what };
  }).sort((a, b) => b.reports.length - a.reports.length || b.reports[0]!.receivedAt.localeCompare(a.reports[0]!.receivedAt));
}

const euro = (cents: number) => "€" + (cents / 100).toFixed(2).replace(".", ",");
const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\s+/g, " ");

export function reportsMarkdown(groups: readonly ReportGroup[], since: string): string {
  const total = groups.reduce((n, g) => n + g.reports.length, 0);
  const head = `### "Klopt niet" reports since ${since}\n\n`;
  if (!total) return head + "None.\n";
  const rows = groups.map((g) => {
    // A report from a page in another language than Dutch says which (#25).
    const tagged = (r: Report, s: string) => ((r.lang ?? "nl") === "nl" ? s : `[${r.lang.toUpperCase()}] ${s}`);
    const notes = g.reports.filter((r) => r.note).map((r) => tagged(r, `“${cell(r.note)}”`)).join(" ");
    const seen = [...new Set(g.reports.map((r) => (r.cents === null ? "" : euro(r.cents) + " ") + (r.observedAt ?? "")).map((s) => s.trim()).filter(Boolean))].join(", ");
    const where = [...new Set(g.reports.filter((r) => r.context).map((r) => tagged(r, cell(r.context))))].slice(0, 3).join("; ");
    return `| ${cell(g.chain)} | ${cell(g.name)} (${cell(g.ref)}) | ${g.ingredient ?? "—"} | ${Object.entries(g.what).map(([w, n]) => `${w} ×${n}`).join(", ")} | ${seen} | ${where} | ${notes} |`;
  });
  return head + `${total} report${total === 1 ? "" : "s"} on ${groups.length} Product${groups.length === 1 ? "" : "s"}, most reported first.\n\n` +
    "| Chain | Product | Ingredient | What | Price shown | Where | Notes |\n|---|---|---|---|---|---|---|\n" + rows.join("\n") + "\n";
}
