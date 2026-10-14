/**
 * The differences between Chains too large to show unchecked (#36).
 *
 * Bladeren ranks Ingredients by how far the cheapest Chain is below the
 * middle one, and Offers by how far they are below every other Chain. The
 * investigation behind bc251fa found every difference over 70% to be a wrong
 * match, a frozen or tinned form, or a unit the Chain itself got wrong. So
 * those are held back on the page until checked-spreads.ts lists the Product,
 * and listed here every morning. Both read the page's own Resolution
 * (prototype/resolve.js), so they agree on what is held back.
 */

import { createResolver, SPREAD_CHECK } from "../words.ts";

export interface CheckedSpread {
  readonly chain: string;
  /** The Chain's own Product reference, as in the catalogue's `ref` column. */
  readonly ref: string;
  readonly ingredient: string;
  /** What was checked and why it is real, so a later reader can judge it. */
  readonly why: string;
}

export interface UncheckedSpread {
  /** "spread": the Ingredient's cheapest Chain against the middle one. "offer": an Offer against every other Chain. */
  readonly kind: "spread" | "offer";
  readonly ingredient: string;
  readonly chain: string;
  readonly ref: string;
  readonly name: string;
  readonly cents: number;
  /** What it is compared with: the middle Chain's, or the next cheapest Chain's, price in the same unit. */
  readonly againstCents: number;
  readonly share: number;
}

export interface Spreads {
  readonly unchecked: readonly UncheckedSpread[];
  /** Checked entries that name no difference over the threshold today: they can go. */
  readonly stale: readonly CheckedSpread[];
  readonly threshold: number;
}

interface Product { readonly id: string; readonly chainId: string; readonly name: string; readonly ingredient: string; readonly ingredientUnitPriceCents: number }
interface Resolved {
  spreads(): {
    ingredients: { d: { id: string }; by: Record<string, { p: Product; cost: number }>; avail: { id: string }[]; mid: number | null; share: number; unchecked: boolean }[];
    worth: { p: Product; rivalCost: number; share: number; unchecked: boolean }[];
  };
}

const refOf = (p: Product) => p.id.slice(p.chainId.length + 1);

/**
 * `catalogue` as the page loads it; `checked` is checked-spreads.ts, which the
 * built catalogue carries too, but without the reasons.
 */
export function assessSpreads(catalogue: object, checked: readonly CheckedSpread[]): Spreads {
  const threshold = SPREAD_CHECK;
  const s = (createResolver({ ...catalogue, checked }) as unknown as Resolved).spreads();
  const big: (UncheckedSpread & { unchecked: boolean })[] = [];
  for (const g of s.ingredients) {
    if (g.share <= threshold || !g.avail.length) continue;
    const p = g.by[g.avail[0]!.id]!.p;
    big.push({ kind: "spread", ingredient: g.d.id, chain: p.chainId, ref: refOf(p), name: p.name, cents: p.ingredientUnitPriceCents, againstCents: g.mid!, share: g.share, unchecked: g.unchecked });
  }
  for (const w of s.worth) {
    if (w.share <= threshold) continue;
    big.push({ kind: "offer", ingredient: w.p.ingredient, chain: w.p.chainId, ref: refOf(w.p), name: w.p.name, cents: w.p.ingredientUnitPriceCents, againstCents: w.rivalCost, share: w.share, unchecked: w.unchecked });
  }
  const stale = checked.filter((k) => !big.some((b) => b.chain === k.chain && b.ref === k.ref && b.ingredient === k.ingredient));
  return { unchecked: big.filter((b) => b.unchecked).map(({ unchecked: _, ...b }) => b), stale, threshold };
}

/** The report as Markdown, for the workflow's job summary after the coverage report. */
export function spreadsMarkdown(s: Spreads, chainName: (id: string) => string): string {
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const euro = (c: number) => `€${(c / 100).toFixed(2)}`;
  const out = [`### Over ${pct(s.threshold)} cheaper, not yet checked (${s.unchecked.length})`, ""];
  if (!s.unchecked.length) out.push("None.");
  for (const u of s.unchecked) {
    out.push(`- **${u.ingredient}** at ${chainName(u.chain)}: ${u.name} (ref ${u.ref}) ${euro(u.cents)} per unit, ${pct(u.share)} below ` +
      (u.kind === "spread" ? `the middle Chain's ${euro(u.againstCents)}` : `every other Chain, on Offer (next ${euro(u.againstCents)})`));
  }
  out.push("", "Bladeren holds these back under “Nog niet gecontroleerd”. A real one goes in `src/catalogue/checked-spreads.ts`; any other is a mapping or unit to fix.", "");
  if (s.stale.length) {
    out.push("### Checked differences no longer seen", "");
    for (const k of s.stale) out.push(`- **${k.ingredient}** at ${chainName(k.chain)} (ref ${k.ref}): no longer over ${pct(s.threshold)}, so its entry can go`);
    out.push("");
  }
  return out.join("\n");
}
