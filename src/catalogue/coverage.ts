/**
 * What the morning refresh reports about Ingredient coverage (#35).
 *
 * An Ingredient most Chains sell but one does not is either a real gap in
 * that Chain's range or a Product the mapper misses there. The second kind is
 * what costed recipes turned up in #33, by chance and late; listed every
 * morning, it shows up the day a mapping regresses. Gaps known to be real are
 * listed in known-gaps.ts and not reported again.
 *
 * Nothing here refuses a catalogue: that is assess.ts. This only reports, from
 * the built catalogue and the one published yesterday.
 */

import { productsOf, type Catalogue } from "./format.ts";

/** The parts of the catalogue (format.ts) the morning reports read. */
export interface CoverageCatalogue extends Pick<Catalogue, "columns" | "catalogue"> {
  readonly chains: readonly { readonly id: string; readonly name?: string; readonly offersOnly?: boolean }[];
  readonly vocabulary: readonly { readonly id: string; readonly variants: readonly { readonly id: string }[] }[];
  readonly exact?: readonly { readonly id: string; readonly name: string; readonly members: Readonly<Record<string, string>> }[];
}

export interface KnownGap {
  readonly chain: string;
  /** An Ingredient id, or "ingredient/variant" for one variant of it. */
  readonly ingredient: string;
  /** Why it is real, so a later reader can judge whether it still is. */
  readonly why: string;
}

export interface Gap {
  /** An Ingredient id, or "ingredient/variant". */
  readonly ingredient: string;
  readonly missingAt: readonly string[];
  readonly soldAt: number;
}

export interface Drop {
  readonly chain: string;
  readonly mapped: number;
  readonly was: number;
}

export interface Conflict {
  readonly id: string;
  readonly name: string;
  readonly ingredients: Readonly<Record<string, string | null>>;
}

export interface Coverage {
  readonly gaps: readonly Gap[];
  /** Known gaps the Chain now sells after all: the entry can go. */
  readonly stale: readonly KnownGap[];
  readonly drops: readonly Drop[];
  readonly conflicts: readonly Conflict[];
  /** Chain id to its Products mapped to an Ingredient, today. */
  readonly mapped: Readonly<Record<string, number>>;
}

export interface CoverageOptions {
  /** Report an Ingredient sold at no more Chains short of all than this. */
  readonly maxMissing: number;
  /** Report a Chain whose mapped Products fell below this share of yesterday's. */
  readonly minRatio: number;
}

export const DEFAULTS: CoverageOptions = { maxMissing: 2, minRatio: 0.9 };

function mappedCounts(c: CoverageCatalogue): Record<string, number> {
  return Object.fromEntries(c.chains.map((ch) => [ch.id, productsOf(c, ch.id).filter((p) => p.ingredient !== null).length]));
}

export function assessCoverage(built: CoverageCatalogue, published: CoverageCatalogue | null, known: readonly KnownGap[], options: CoverageOptions = DEFAULTS): Coverage {
  // A Chain listing only its Offers (Lidl) lacks most things any given week.
  const chains = built.chains.filter((c) => !c.offersOnly).map((c) => c.id);
  // What each Chain sells comparably, as Ingredient ids and ingredient/variant.
  const sells = new Map<string, Set<string>>();
  for (const id of chains) {
    const s = new Set<string>();
    for (const p of productsOf(built, id)) {
      if (p.ingredient === null || p.ingredientUnitPriceCents === null) continue;
      s.add(p.ingredient);
      if (p.variant !== null) s.add(`${p.ingredient}/${p.variant}`);
    }
    sells.set(id, s);
  }

  const isKnown = (chain: string, ingredient: string) => known.some((k) => k.chain === chain && k.ingredient === ingredient);
  const gaps: Gap[] = [];
  const keys = built.vocabulary.flatMap((d) => [d.id, ...d.variants.map((v) => `${d.id}/${v.id}`)]);
  for (const key of keys) {
    const missing = chains.filter((c) => !sells.get(c)!.has(key));
    // Sold nowhere, or at too few to call the rest a gap.
    if (!missing.length || missing.length > options.maxMissing || missing.length === chains.length) continue;
    // A variant gap at a Chain missing the whole Ingredient says nothing new.
    const base = key.split("/")[0]!;
    const missingAt = missing.filter((c) => !isKnown(c, key) && (key === base || (sells.get(c)!.has(base) && !isKnown(c, base))));
    if (missingAt.length) gaps.push({ ingredient: key, missingAt, soldAt: chains.length - missing.length });
  }
  const stale = known.filter((k) => sells.get(k.chain)?.has(k.ingredient));

  const mapped = mappedCounts(built);
  const before = published ? mappedCounts(published) : {};
  const drops: Drop[] = [];
  for (const id of chains) {
    const was = before[id];
    if (was !== undefined && mapped[id]! < was * options.minRatio) drops.push({ chain: id, mapped: mapped[id]!, was });
  }

  // EAN twins mapped to different Ingredients (#34): one of them is wrong.
  // Nothing is lent between them, so each row still says its own mapping.
  const byRef = new Map(Object.keys(built.catalogue).map((id) => [id, new Map(productsOf(built, id).map((p) => [p.ref, p.ingredient]))]));
  const conflicts: Conflict[] = [];
  for (const g of built.exact ?? []) {
    const ingredients = Object.fromEntries(Object.entries(g.members).map(([c, r]) => [c, byRef.get(c)?.get(r) ?? null]));
    if (new Set(Object.values(ingredients).filter((i) => i !== null)).size > 1) conflicts.push({ id: g.id, name: g.name, ingredients });
  }

  return { gaps, stale, drops, conflicts, mapped };
}

/** The report as Markdown, for the workflow's job summary. */
export function coverageMarkdown(c: Coverage, built: CoverageCatalogue, published: CoverageCatalogue | null): string {
  const name = (id: string) => built.chains.find((ch) => ch.id === id)?.name ?? id;
  const before = published ? mappedCounts(published) : {};
  const out: string[] = ["## Ingredient coverage", ""];

  out.push("| Chain | Mapped to an Ingredient | Yesterday |", "| --- | ---: | ---: |");
  for (const ch of built.chains) out.push(`| ${name(ch.id)} | ${c.mapped[ch.id]} | ${before[ch.id] ?? "–"} |`);
  out.push("");

  if (c.drops.length) {
    out.push("### Sharp drops since yesterday", "");
    for (const d of c.drops) out.push(`- **${name(d.chain)}**: ${d.mapped} mapped, down from ${d.was}`);
    out.push("");
  }

  out.push(`### Sold at most Chains but not at one (${c.gaps.length})`, "");
  if (!c.gaps.length) out.push("None.");
  for (const g of c.gaps) out.push(`- **${g.ingredient}**: none at ${g.missingAt.map(name).join(", ")} (sold at ${g.soldAt})`);
  out.push("", "A real gap goes in `src/catalogue/known-gaps.ts`; any other is a mapping to fix.", "");

  if (c.stale.length) {
    out.push("### Known gaps no longer missing", "");
    for (const k of c.stale) out.push(`- **${k.ingredient}** at ${name(k.chain)}: sold after all, so its entry can go`);
    out.push("");
  }

  out.push(`### EAN twins mapped to different Ingredients (${c.conflicts.length})`, "");
  if (!c.conflicts.length) out.push("None.");
  for (const k of c.conflicts) {
    out.push(`- ${k.name} (${k.id}): ${Object.entries(k.ingredients).map(([ch, i]) => `${name(ch)} ${i ?? "none"}`).join(", ")}`);
  }
  out.push("");
  return out.join("\n");
}
