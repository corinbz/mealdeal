/**
 * Checks the morning refresh runs on its own catalogue (#37), each turning a
 * class of mistakes into a line of the coverage report rather than something
 * found by chance while shopping. Only a report: assess.ts alone may refuse a
 * catalogue.
 *
 * - **Jumps**: a shelf price that moved sharply overnight with no Offer on
 *   either day. Usually a reading or unit slip, now and then a real change.
 * - **Splits**: the same Product, by name and pack, at two Chains or more,
 *   mapped to different Ingredients, or at one and not the other.
 * - **Units**: a Chain's own unit price that does not follow from its pack
 *   size and price, as Aldi's basePrice slips did (bc251fa) and Jumbo's
 *   trays and boxes priced whole but sized as one do.
 *
 * Any one found right as it is goes in known-slips.ts with the reason.
 */

import type { CoverageCatalogue } from "./coverage.ts";
import { productsOf, type CatalogueProduct } from "./format.ts";
import { followsFromPack, looksDrained } from "../ingest/unit-price.ts";

export type SelfCheck = "jump" | "split" | "unit";

export interface KnownSlip {
  readonly check: SelfCheck;
  readonly chain: string;
  /** The Chain's own Product reference; for a split, any one member quietens the group. */
  readonly ref: string;
  readonly why: string;
}

/**
 * Thresholds of the checks. A unit price is measured with ingest's own
 * yardstick (src/ingest/unit-price.ts), so the check and the reader that
 * chose the figure cannot drift apart.
 */
export const SELF_CHECK_LIMITS = {
  /** A shelf price changed by this share or more overnight, either way (1.4x up or down to 1/1.4). */
  jump: 0.4,
} as const;

export interface Jump { readonly chain: string; readonly ref: string; readonly name: string; readonly ingredient: string | null; readonly was: number; readonly now: number }
export interface Split { readonly name: string; readonly pack: string; readonly members: readonly { readonly chain: string; readonly ref: string; readonly ingredient: string | null }[] }
export interface UnitSlip {
  readonly chain: string; readonly ref: string; readonly name: string; readonly ingredient: string | null;
  readonly pack: string; readonly priceCents: number; readonly unitPriceCents: number;
  /** The unit price the pack size and price give. */
  readonly derivedCents: number;
  /**
   * "drained": a tin, jar or tub of something in liquid whose unit price is
   * 1.05 to 3 times the pack's, as when priced per drained kilo
   * (uitlekgewicht), which Dutch rules ask for. Comparable only with other
   * drained prices, so counted apart. "other": anything else, more likely a slip.
   */
  readonly kind: "drained" | "other";
}

export interface SelfChecks {
  readonly jumps: readonly Jump[];
  readonly splits: readonly Split[];
  readonly units: readonly UnitSlip[];
  /** Known slips no check reports today: their entry can go. */
  readonly stale: readonly KnownSlip[];
}


/** Foods sold in liquid, whose unit price may be per drained kilo even when not filed as conserven. */
const IN_LIQUID = /olijf|olijv|mozzarella|burrata|feta|haring|augurk|zilveruit|kappertje|jalapeno|peper(oni|s)? in|op (siroop|sap|water)|in (water|olie|pekel|saus|tomatensaus|eigen sap)|\b(blik|pot)\b/i;

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const packOf = (q: number | null, u: string | null) => (q === null || u === null ? "" : `${q} ${u}`);

export function assessSelfChecks(built: CoverageCatalogue, published: CoverageCatalogue | null, known: readonly KnownSlip[], limits = SELF_CHECK_LIMITS): SelfChecks {
  const onOffer = (p: CatalogueProduct) => p.offerPriceCents !== null || p.offerWording !== null;
  // Mapped Products first: their slips reach a price someone compares.
  const mappedFirst = <T extends { ingredient: string | null }>(a: T, b: T) => Number(a.ingredient === null) - Number(b.ingredient === null);

  const jumps: Jump[] = [];
  if (published) {
    for (const ch of built.chains) {
      const before = new Map(productsOf(published, ch.id).map((p) => [String(p.ref), p]));
      for (const p of productsOf(built, ch.id)) {
        const ref = String(p.ref), b = before.get(ref);
        if (!b || onOffer(p) || onOffer(b)) continue;
        const now = p.shelfPriceCents, then = b.shelfPriceCents;
        if (!now || !then) continue;
        const ratio = now / then;
        if (ratio >= 1 + limits.jump || ratio <= 1 / (1 + limits.jump)) {
          jumps.push({ chain: ch.id, ref, name: p.name, ingredient: p.ingredient, was: then, now });
        }
      }
    }
  }
  jumps.sort((a, b) => mappedFirst(a, b) || Math.abs(Math.log(b.now / b.was)) - Math.abs(Math.log(a.now / a.was)));

  const groups = new Map<string, { name: string; pack: string; members: { chain: string; ref: string; ingredient: string | null }[] }>();
  for (const ch of built.chains) for (const p of productsOf(built, ch.id)) {
    const pack = packOf(p.packQuantity, p.packUnit);
    if (!pack) continue;
    const key = fold(p.name) + "|" + pack;
    if (!groups.has(key)) groups.set(key, { name: p.name, pack, members: [] });
    groups.get(key)!.members.push({ chain: ch.id, ref: String(p.ref), ingredient: p.ingredient });
  }
  const splits = [...groups.values()].filter((g) => new Set(g.members.map((m) => m.chain)).size > 1 && new Set(g.members.map((m) => m.ingredient)).size > 1);
  // Two Ingredients is surely wrong; mapped at one and not another may be a form the vocabulary leaves out.
  const both = (s: Split) => new Set(s.members.map((m) => m.ingredient).filter((i) => i !== null)).size > 1;
  splits.sort((a, b) => Number(both(b)) - Number(both(a)) || a.name.localeCompare(b.name));

  const units: UnitSlip[] = [];
  for (const ch of built.chains) for (const p of productsOf(built, ch.id)) {
    const q = p.packQuantity, unit = p.unitPriceCents as number | null;
    if (!q || unit === null || p.packUnit !== p.comparisonUnit) continue;
    const prices = [p.shelfPriceCents as number | null, p.offerPriceCents].filter((c): c is number => c !== null);
    if (!prices.length) continue;
    if (prices.some((c) => followsFromPack(unit, c, q))) continue;
    units.push({ chain: ch.id, ref: String(p.ref), name: p.name, ingredient: p.ingredient, pack: packOf(q, p.packUnit),
      priceCents: prices.at(-1)!, unitPriceCents: unit, derivedCents: Math.round(prices.at(-1)! / q),
      kind: (p.form === "conserven" || IN_LIQUID.test(p.name)) && prices.some((c) => looksDrained(unit, c, q)) ? "drained" : "other" });
  }
  units.sort((a, b) => mappedFirst(a, b) || a.chain.localeCompare(b.chain) || a.name.localeCompare(b.name));

  // Everything found, before the known slips are left out: a known slip found nowhere is stale.
  const key = (check: SelfCheck, chain: string, ref: string) => `${check}|${chain}|${ref}`;
  const found = new Set([
    ...jumps.map((j) => key("jump", j.chain, j.ref)),
    ...units.map((u) => key("unit", u.chain, u.ref)),
    ...splits.flatMap((g) => g.members.map((m) => key("split", m.chain, m.ref))),
  ]);
  const quiet = new Set(known.map((k) => key(k.check, k.chain, k.ref)));
  return {
    jumps: jumps.filter((j) => !quiet.has(key("jump", j.chain, j.ref))),
    // A known split names any one member and quietens the whole group.
    splits: splits.filter((g) => !g.members.some((m) => quiet.has(key("split", m.chain, m.ref)))),
    units: units.filter((u) => !quiet.has(key("unit", u.chain, u.ref))),
    stale: known.filter((k) => !found.has(key(k.check, k.chain, k.ref))),
  };
}

/** At most this many lines per check in the job summary; the count says how many more. */
const SHOWN = 40;

export function selfChecksMarkdown(s: SelfChecks, built: CoverageCatalogue): string {
  const name = (id: string) => built.chains.find((c) => c.id === id)?.name ?? id;
  const euro = (c: number) => `€${(c / 100).toFixed(2)}`;
  const ing = (i: string | null) => (i === null ? "unmapped" : `*${i}*`);
  const out: string[] = [];
  const section = <T>(title: string, items: readonly T[], line: (x: T) => string, hint: string, intro = "") => {
    out.push(`### ${title} (${items.length})`, "");
    if (intro) out.push(intro, "");
    if (!items.length) out.push("None.");
    for (const x of items.slice(0, SHOWN)) out.push(`- ${line(x)}`);
    if (items.length > SHOWN) out.push(`- …and ${items.length - SHOWN} more`);
    out.push("", hint, "");
  };
  const counts = (xs: readonly { chain: string; ingredient: string | null }[]) => {
    const by = new Map<string, [number, number]>();
    for (const x of xs) { const c = by.get(x.chain) ?? [0, 0]; c[x.ingredient === null ? 1 : 0]++; by.set(x.chain, c); }
    return [...by].map(([c, [m, u]]) => `${name(c)} ${[m && `${m} mapped`, u && `${u} unmapped`].filter(Boolean).join(", ")}`).join("; ");
  };

  section(`Shelf prices up or down ${Math.round(SELF_CHECK_LIMITS.jump * 100)}% or more overnight, no Offer`, s.jumps,
    (j) => `**${j.name}** at ${name(j.chain)} (ref ${j.ref}, ${ing(j.ingredient)}): ${euro(j.was)} → ${euro(j.now)}`,
    "Usually a reading or unit slip. A real price change goes in `src/catalogue/known-slips.ts` as a `jump`.");
  section("Same Product at several Chains, mapped differently", s.splits,
    (g) => `**${g.name}** ${g.pack}: ${g.members.map((m) => `${name(m.chain)} ${ing(m.ingredient)}`).join(", ")}`,
    "One side is wrong, or the difference is meant (then a `split` in `src/catalogue/known-slips.ts`).");
  const drained = s.units.filter((u) => u.kind === "drained"), other = s.units.filter((u) => u.kind === "other");
  const otherUnmapped = other.filter((u) => u.ingredient === null);
  section("Unit prices that do not follow from the pack, mapped Products", other.filter((u) => u.ingredient !== null),
    (u) => `**${u.name}** at ${name(u.chain)} (ref ${u.ref}, ${ing(u.ingredient)}): ${u.pack} for ${euro(u.priceCents)} gives ${euro(u.derivedCents)}, the Chain says ${euro(u.unitPriceCents)}`,
    "A multipack sized as one, or a Chain's own slip. One right as it is goes in `src/catalogue/known-slips.ts` as a `unit`.",
    otherUnmapped.length ? `Besides these, Products mapped to no Ingredient, only counted: ${counts(otherUnmapped)}.` : "");
  out.push(`### Unit prices that look per drained kilo (${drained.length})`, "");
  if (!drained.length) out.push("None.");
  else {
    out.push(`By Chain: ${counts(drained)}. For example:`, "");
    for (const u of drained.filter((x) => x.ingredient !== null).slice(0, 5)) {
      out.push(`- **${u.name}** at ${name(u.chain)} (${ing(u.ingredient)}): ${u.pack} for ${euro(u.priceCents)} gives ${euro(u.derivedCents)}, the Chain says ${euro(u.unitPriceCents)}`);
    }
  }
  out.push("", "A tin or jar priced per drained kilo, as the rules ask, against others priced per kilo of the whole: listed by count, since the fix is one rule, not one Product.", "");

  if (s.stale.length) {
    out.push("### Known slips no longer seen", "");
    for (const k of s.stale) out.push(`- ${k.check} at ${name(k.chain)} (ref ${k.ref}): no longer reported, so its entry can go`);
    out.push("");
  }
  return out.join("\n");
}
