/**
 * Second opinions on which Ingredient a Product is, as the morning refresh
 * reports them: twins at other Chains that disagree (borrow.ts), the
 * Chain's own shelf (shelves.ts), and a classifier learnt from the
 * vocabulary's own mappings (classifier.ts). Each names a mapping rule to
 * look at; nothing here changes the catalogue.
 *
 * First, what people looking found (verdicts.ts): how often the vocabulary
 * and the classifier are right on the Gold Set, where the vocabulary was
 * wrong, and Verdicts that no longer hold.
 */

import type { Conflict } from "./borrow.ts";
import type { ClassifierOpinion } from "./classifier.ts";
import type { Check } from "./build.ts";
import type { ShelfOpinion } from "./shelves.ts";
import type { Verdict } from "./verdicts.ts";

export interface Opinions {
  readonly conflicts: readonly Conflict[];
  readonly shelves: readonly ShelfOpinion[];
  readonly classifier: ClassifierOpinion | null;
  readonly checks: readonly Check[];
  readonly stale: readonly { readonly verdict: Verdict; readonly nameNow: string | null }[];
}

export interface OpinionLimits {
  /** Shelves listed per section, the most telling first. */
  readonly shelves: number;
  /** Product names listed per shelf. */
  readonly names: number;
  /** Products listed per classifier section, the most certain first. */
  readonly predictions: number;
}

const LIMITS: OpinionLimits = { shelves: 40, names: 5, predictions: 60 };

const pct = (x: number) => `${Math.round(x * 100)}%`;
const more = (n: number, shown: number) => (n > shown ? ` and ${n - shown} more` : "");

/** Below this many, a share measured on the Gold Set can be ten points off. */
export const GOLD_ENOUGH = 100;

export function opinionsMarkdown({ conflicts, shelves, classifier, checks, stale }: Opinions, chainName: (id: string) => string, limits: OpinionLimits = LIMITS): string {
  const out: string[] = ["## Second opinions on mapping", ""];
  const none = (i: string | null) => i ?? "none";

  const gold = checks.filter((c) => c.from === "sample");
  out.push(`### Checked by hand (${checks.length}, ${gold.length} drawn at random)`, "");
  if (gold.length) {
    const right = (say: (c: Check) => string | null) => gold.filter((c) => say(c) === c.is).length;
    const share = (n: number) => `${n} of ${gold.length} (${pct(n / gold.length)})`;
    const byClassifier = classifier ? `, the classifier on ${share(right((c) => classifier.label(c.chainId, c.ref)))}` : "";
    out.push(`The Gold Set: Products drawn at random and looked at. The vocabulary alone is right on ${share(right((c) => c.unchecked))}${byClassifier}.${gold.length < GOLD_ENOUGH ? ` Under ${GOLD_ENOUGH}, a share can be ten points off.` : ""}`, "");
  } else {
    out.push("No Gold Set yet: `node scripts/check-mappings.ts sample` draws Products at random to look at.", "");
  }
  const wrong = checks.filter((c) => c.unchecked !== c.is);
  if (wrong.length) {
    out.push(`Where the vocabulary was wrong (${wrong.length}). Each Verdict holds already; a rule fixed puts its like right too.`, "");
    for (const c of wrong.slice(0, limits.predictions)) out.push(`- ${chainName(c.chainId)} · ${c.name}: *${none(c.unchecked)}*, is **${none(c.is)}**`);
    if (wrong.length > limits.predictions) out.push(`- and ${wrong.length - limits.predictions} more`);
    out.push("");
  }
  if (stale.length) {
    out.push(`Verdicts that no longer hold (${stale.length}): look again, or remove them from \`src/catalogue/verdicts.json\`.`, "");
    for (const { verdict: v, nameNow } of stale) out.push(`- ${chainName(v.chain)} · ${v.name} (${v.ref}): ${nameNow === null ? "gone" : `now "${nameNow}"`}`);
    out.push("");
  }
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

  if (classifier) {
    const shown = (n: number) => (n > limits.predictions ? `, the ${limits.predictions} most certain` : "");
    out.push(`### The classifier places elsewhere (${classifier.disagree.length}${shown(classifier.disagree.length)})`, "");
    out.push(`Learnt from the vocabulary's own mappings, it agrees on ${pct(classifier.agreement)} of them; where it is far surer of another Ingredient, the vocabulary is often wrong.`, "");
    if (!classifier.disagree.length) out.push("None.");
    for (const x of classifier.disagree.slice(0, limits.predictions)) {
      out.push(`- ${chainName(x.product.chainId)} · ${x.product.name}: *${x.product.ingredient}*, it says **${x.label}**`);
    }
    out.push("");
    out.push(`### The classifier would map (${classifier.suggest.length}${shown(classifier.suggest.length)})`, "");
    out.push("Unmapped, and far likelier one Ingredient than none: a word or shelf the vocabulary lacks.", "");
    if (!classifier.suggest.length) out.push("None.");
    for (const x of classifier.suggest.slice(0, limits.predictions)) out.push(`- ${chainName(x.product.chainId)} · ${x.product.name}: **${x.label}**`);
    out.push("");
  }
  return out.join("\n");
}
