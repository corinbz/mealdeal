/**
 * Lists "Klopt niet" reports (#38) grouped by Product, most reported first,
 * as Markdown: the morning refresh appends it to its summary.
 *
 *   node scripts/reports.ts <dir> [--since YYYY-MM-DD]
 *
 * <dir> holds the bucket's reports/ as synced (reports/<day>/<file>.json).
 * Only reports received on or after --since are listed; by default the last
 * seven days.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { groupReports, reportsMarkdown, type Stored } from "../src/reports/group.ts";

const args = process.argv.slice(2);
const dir = args[0];
if (!dir) {
  console.error("usage: node scripts/reports.ts <dir> [--since YYYY-MM-DD]");
  process.exit(2);
}
const at = args.indexOf("--since");
const since = at >= 0 ? args[at + 1]! : new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);

const stored: Stored[] = [];
const days = (() => { try { return readdirSync(dir); } catch { return []; } })();
for (const day of days.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= since)) {
  const path = join(dir, day);
  if (!statSync(path).isDirectory()) continue;
  for (const f of readdirSync(path).filter((f) => f.endsWith(".json"))) {
    try { stored.push(JSON.parse(readFileSync(join(path, f), "utf8"))); } catch { /* a broken file is skipped, never fatal */ }
  }
}
console.log(reportsMarkdown(groupReports(stored), since));
