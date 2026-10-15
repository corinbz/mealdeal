/**
 * Second opinions on which Ingredient a Product is, as the morning refresh
 * reports them: twins at other Chains that disagree (borrow.ts), and the
 * Chain's own shelf (shelves.ts). Each names a mapping rule to look at;
 * nothing here changes the catalogue.
 */

import type { Conflict } from "./borrow.ts";
import type { ShelfOpinion } from "./shelves.ts";

export interface OpinionLimits {
  /** Shelves listed per section, the most telling first. */
  readonly shelves: number;
  /** Product names listed per shelf. */
  readonly names: number;
}

const LIMITS: OpinionLimits = { shelves: 40, names: 5 };

const pct = (x: number) => `${Math.round(x * 100)}%`;
const more = (n: number, shown: number) => (n > shown ? ` and ${n - shown} more` : "");

export function opinionsMarkdown(conflicts: readonly Conflict[], shelves: readonly ShelfOpinion[], chainName: (id: string) => string, limits: OpinionLimits = LIMITS): string {
  const out: string[] = ["## Second opinions on mapping", ""];
  const copies = (c: Conflict) => Object.entries(c.ingredients).map(([id, i]) => `${chainName(id)} ${i ?? "none"}`).join(", ");

  const settled = conflicts.filter((c) => c.settled);
  out.push(`### Twins settled by a majority (${settled.length})`, "");
  out.push("The same item at several Chains, mapped differently; most copies agree, so all now take theirs. The odd copy names a rule to fix.", "");
  if (!settled.length) out.push("None.");
  for (const c of settled) out.push(`- **${c.name}** → ${c.settled}: ${copies(c)}`);
  out.push("");

  const open = conflicts.filter((c) => !c.settled);
  out.push(`### Twins with no majority (${open.length})`, "");
  if (!open.length) out.push("None.");
  for (const c of open) out.push(`- **${c.name}**: ${copies(c)}`);
  out.push("");

  const odd = shelves.filter((s) => s.odd.length).sort((a, b) => b.share - a.share || b.mapped - a.mapped);
  const oddCount = odd.reduce((n, s) => n + s.odd.length, 0);
  out.push(`### Odd one out on its shelf (${oddCount} on ${odd.length} shelves)`, "");
  out.push("Mapped to an Ingredient its shelf hardly holds, on a shelf mostly one other thing: often a wrong match, sometimes the Chain's misfiling.", "");
  if (!odd.length) out.push("None.");
  for (const s of odd.slice(0, limits.shelves)) {
    const shown = s.odd.slice(0, limits.names).map((o) => `${o.name} → *${o.ingredient}*`).join("; ");
    out.push(`- ${chainName(s.chainId)} · ${s.shelf} (${pct(s.share)} ${s.ingredient}): ${shown}${more(s.odd.length, limits.names)}`);
  }
  if (odd.length > limits.shelves) out.push(`- and ${odd.length - limits.shelves} more shelves`);
  out.push("");

  const suggested = shelves.filter((s) => s.suggested.length).sort((a, b) => b.suggested.length - a.suggested.length);
  const sugCount = suggested.reduce((n, s) => n + s.suggested.length, 0);
  out.push(`### Unmapped on a shelf of one Ingredient (${sugCount} on ${suggested.length} shelves)`, "");
  out.push("Likely that Ingredient, or a near thing the vocabulary lacks (cake on a koekjes shelf, filters on a coffee shelf).", "");
  if (!suggested.length) out.push("None.");
  for (const s of suggested.slice(0, limits.shelves)) {
    out.push(`- ${chainName(s.chainId)} · ${s.shelf} (${pct(s.share)} ${s.ingredient}, ${s.suggested.length}): ${s.suggested.slice(0, limits.names).join("; ")}${more(s.suggested.length, limits.names)}`);
  }
  if (suggested.length > limits.shelves) out.push(`- and ${suggested.length - limits.shelves} more shelves`);
  out.push("");
  return out.join("\n");
}
