/**
 * The catalogue the basket page runs on, built from each Chain's latest
 * Observations: rows in, catalogue out. Where the rows come from is the
 * caller's business; scripts/catalogue-from-db.ts reads them out of Postgres
 * (source-db.ts), and the tests hand them in.
 *
 * Everything decided on the way is here: which Ingredient each Product is,
 * as mapping.ts decides it (by name, from its twins, #34, none for too
 * small a pack, or as a person looking found it: verdicts.ts); its Unit Price and pack in that Ingredient's own unit;
 * which Products are one Exact Product (#15); and what the page is told
 * about each Chain: the Store priced, whether it has Offers or EANs, whether
 * it is offers-only, which card it assumes.
 *
 * Only Products carrying a Unit Price and a Comparison Unit belong in the
 * source. One without either is not a comparison candidate, which is why
 * ingest reports that count per run. Non-food and alcohol other than beer
 * are left out here, and counted (food.ts).
 */

import { formOf } from "../ingredients/aisles.ts";
import { isOwnBrand } from "../ingredients/map.ts";
import { englishOf } from "../ingredients/english.ts";
import { VOCABULARY, type ComparisonUnit, type IngredientDef } from "../ingredients/vocabulary.ts";
import type { Conflict } from "./borrow.ts";
import type { LabelledProduct } from "./classifier.ts";
import { assessShelves, type ShelfOpinion } from "./shelves.ts";
import { inIngredientUnit, mapProducts } from "./mapping.ts";
import { CHECKED_SPREADS } from "./checked-spreads.ts";
import { groupExactProducts, type ExactCandidate } from "./exact.ts";
import { excluded, type Excluded } from "./food.ts";
import { VERDICTS, type Verdict, type VerdictSource } from "./verdicts.ts";
import { COLUMNS, toRow, type Catalogue, type CatalogueIngredient, type CatalogueProduct, type Row } from "./format.ts";

/**
 * Chains that put only their Offers online (Lidl, #28). A Product of theirs
 * is current only while their offers page lists it, so the source gives only
 * their latest run: last week's Offer must not linger as this week's price.
 */
export const OFFERS_ONLY: ReadonlySet<string> = new Set(["lidl"]);

/**
 * Words Products are named by that say too little to read as their
 * Ingredient when typed alone: "kip" is any chicken, not a whole one, and
 * "olie" any oil.
 */
const TOO_GENERAL: ReadonlySet<string> = new Set(["kip", "olie", "curry", "vlokken", "melange"]);

/**
 * The card or app a Chain's Offers may require, as its wording names it.
 * Every such price counts as paid, as if the shopper held the card (owner's
 * decision, 2026-10-14), and the page says which cards it assumed.
 */
const CARDS: Readonly<Record<string, string>> = { lidl: "Lidl Plus" };

/** The one Store priced, for a Chain that prices per Store. */
const STORES: Readonly<Record<string, string>> = { dirk: "Store 66" };

export interface SourceChain {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
  /** The day its latest complete run swept, in Amsterdam. */
  readonly observedAt: string | null;
  readonly productsRecorded: number;
  readonly offersRecorded: number;
}

/** One Product's latest Observation, with the Offers running and announced on it. */
export interface SourceProduct {
  readonly ref: string;
  readonly name: string;
  readonly brand: string | null;
  readonly categories: readonly string[];
  readonly eans: readonly string[];
  readonly packText: string | null;
  readonly packQuantity: number | null;
  readonly packUnit: string | null;
  readonly comparisonUnit: ComparisonUnit;
  readonly shelfPriceCents: number;
  readonly offerPriceCents: number | null;
  readonly unitPriceCents: number;
  readonly offerWording: string | null;
  readonly offerEndsOn: string | null;
  /** The next Offer announced: null when none is, "" when one is with no wording. */
  readonly nextWording: string | null;
  readonly nextStartsOn: string | null;
}

export interface CatalogueSource {
  /** In the order the page lists them. */
  readonly chains: readonly SourceChain[];
  readonly products: Readonly<Record<string, readonly SourceProduct[]>>;
}

export interface ChainCounts {
  /** In the catalogue, after what was left out. */
  readonly total: number;
  /** Left out: non-food, and alcohol other than beer. */
  readonly excluded: Readonly<Record<Excluded, number>>;
  readonly mapped: number;
  /** Mapped only through its twins at other Chains (not one then too small a pack to be it). */
  readonly borrowed: number;
  /** Mapped by its own name to another Ingredient than most of its twins, and given theirs. */
  readonly overruled: number;
  /** Mapped, and priced in the Ingredient's own unit. */
  readonly comparable: number;
  readonly upcoming: number;
}

/** A Verdict that holds, beside what the vocabulary alone made of its Product. */
export interface Check {
  readonly chainId: string;
  readonly ref: string;
  readonly name: string;
  readonly from: VerdictSource;
  /** The Ingredient the Verdict says, or null for none. */
  readonly is: string | null;
  /** What the Product would be without it: by name, from its twins, or none. */
  readonly unchecked: string | null;
}

export interface Built {
  readonly catalogue: Catalogue;
  /** Reported every run (#14): how much of each Chain maps, and compares. */
  readonly counts: Readonly<Record<string, ChainCounts>>;
  /** Twins mapped to different Ingredients, settled by a majority or not: one of them is wrong (#34). */
  readonly conflicts: readonly Conflict[];
  /** The Chains' own shelves as a second opinion: odd ones out, and unmapped Products a shelf suggests. */
  readonly shelves: readonly ShelfOpinion[];
  /** Every Product with its shelves and Ingredient, for the classifier's opinion (classifier.ts). */
  readonly labelled: readonly LabelledProduct[];
  /** Every Verdict that holds (verdicts.ts); those drawn at random are the Gold Set. */
  readonly checks: readonly Check[];
  /** Verdicts whose Product is gone from the catalogue, or named otherwise now: to look at again, or drop. */
  readonly stale: readonly { readonly verdict: Verdict; readonly nameNow: string | null }[];
}

/**
 * What the page reads a typed item against. `fresh`: the Ingredient is sold
 * fresh, so frozen, tinned and jarred count only when a Preference allows.
 * `aisle`: where it is mainly sold, which Bladeren groups it under (#36)
 * and whose sticker stands in for its own. `names`: its names in other
 * languages, read whatever the page's language, the first one shown (#25).
 * `words`: the words its Products are named by, which read as it too
 * where no other Ingredient's are the same.
 */
export function pageVocabulary(vocabulary: readonly IngredientDef[] = VOCABULARY): CatalogueIngredient[] {
  return vocabulary.map((d) => ({
    id: d.id, name: d.name, unit: d.unit, also: d.also, equals: d.equals,
    words: d.words.filter((w) => !w.startsWith("=") && w.trim() === w && !TOO_GENERAL.has(w)),
    variants: d.variants.map((v) => {
      const en = englishOf(d.id)?.variants[v.id];
      return { id: v.id, name: v.name, ...(v.aspect && v.aspect !== "soort" ? { aspect: v.aspect } : {}), ...(en ? { names: { en } } : {}) };
    }),
    fresh: !d.anyForm && d.aisles.some((a) => formOf(a) === "vers"),
    aisle: d.aisles[0],
    ...(englishOf(d.id) ? { names: { en: englishOf(d.id)!.names } } : {}),
  }));
}

export function buildCatalogue(source: CatalogueSource, { now = new Date(), vocabulary = VOCABULARY, verdicts = VERDICTS }: { now?: Date; vocabulary?: readonly IngredientDef[]; verdicts?: readonly Verdict[] } = {}): Built {
  const defs = new Map(vocabulary.map((d) => [d.id, d]));
  // Left out before anything else, so no Exact Product or borrowed mapping
  // leads to a Product the page never shows.
  const left: Record<string, Record<Excluded, number>> = {};
  const kept: Record<string, readonly SourceProduct[]> = {};
  for (const chain of source.chains) {
    const n = (left[chain.id] = { nonfood: 0, alcohol: 0 });
    kept[chain.id] = (source.products[chain.id] ?? []).filter((p) => {
      const why = excluded({ name: p.name, categories: p.categories, unit: p.comparisonUnit });
      if (why) n[why]++;
      return !why;
    });
  }
  const productsAt = (id: string) => kept[id] ?? [];

  /**
   * How much one pack holds, as stated, or else as its price says: Jumbo
   * states no size for its loaves, but €0.93 at €1.16 a kilo is 800 g. Only
   * for counting packs; the Exact Product join keeps to stated sizes.
   */
  const packOf = (p: SourceProduct): { quantity: number; unit: ComparisonUnit } | null => {
    if (p.packQuantity !== null && p.packUnit) return { quantity: p.packQuantity, unit: p.packUnit as ComparisonUnit };
    const paid = p.offerPriceCents ?? p.shelfPriceCents;
    if (!(paid > 0 && p.unitPriceCents > 0)) return null;
    const x = paid / p.unitPriceCents;
    // Unit prices are rounded to the cent, so only two figures of it are real.
    const quantity = p.comparisonUnit === "piece" && Math.abs(x - Math.round(x)) < 0.1 ? Math.round(x) : Number(x.toPrecision(2));
    return quantity > 0 ? { quantity, unit: p.comparisonUnit } : null;
  };

  const candidates: ExactCandidate[] = [];
  for (const chain of source.chains) for (const p of productsAt(chain.id)) {
    candidates.push({
      chainId: chain.id, ref: p.ref, name: p.name, brand: p.brand, eans: p.eans,
      packQuantity: p.packQuantity, packUnit: p.packUnit, huismerk: isOwnBrand(chain.id, p.brand, p.name),
    });
  }
  // Exact Products (#15), shown to the shopper; mapping.ts joins twins more
  // widely, which only lend an Ingredient.
  const exact = groupExactProducts(candidates);
  const mapped = mapProducts(source.chains.flatMap((chain) => productsAt(chain.id).map((p) => ({
    chainId: chain.id, ref: p.ref, name: p.name, brand: p.brand, categories: p.categories, eans: p.eans,
    packQuantity: p.packQuantity, packUnit: p.packUnit, pack: packOf(p),
  }))), vocabulary, verdicts);

  const counts: Record<string, ChainCounts> = {};
  const checks: Check[] = [];
  const products: Record<string, Omit<CatalogueProduct, "referenceLowCents" | "referenceDays">[]> = {};
  for (const chain of source.chains) {
    const c = { total: 0, excluded: left[chain.id]!, mapped: 0, borrowed: 0, overruled: 0, comparable: 0, upcoming: 0 };
    products[chain.id] = productsAt(chain.id).map((p) => {
      const { mapping: m, how, pack: iPack, unchecked } = mapped.decision(chain.id, p.ref);
      if (how === "verdict") {
        const v = verdicts.find((x) => x.chain === chain.id && x.ref === p.ref)!;
        checks.push({ chainId: chain.id, ref: p.ref, name: p.name, from: v.from, is: m?.ingredient ?? null, unchecked: unchecked.mapping?.ingredient ?? null });
      }
      const def = m ? defs.get(m.ingredient)! : null;
      const iPrice = def ? inIngredientUnit(def, p.comparisonUnit, p.unitPriceCents, "price") : null;
      c.total++;
      if (m) c.mapped++;
      if (how === "outvoted") c.overruled++;
      else if (how === "twin") c.borrowed++;
      if (iPrice !== null) c.comparable++;
      if (p.nextWording !== null) c.upcoming++;
      return {
        ref: p.ref,
        name: p.name,
        packaging: p.packText && p.packText !== p.name ? p.packText : null,
        packQuantity: p.packQuantity,
        packUnit: p.packUnit,
        comparisonUnit: p.comparisonUnit,
        shelfPriceCents: p.shelfPriceCents,
        offerPriceCents: p.offerPriceCents,
        unitPriceCents: p.unitPriceCents,
        offerWording: p.offerWording,
        offerEndsOn: p.offerEndsOn,
        nextWording: p.nextWording,
        nextStartsOn: p.nextStartsOn,
        ingredient: m?.ingredient ?? null,
        variant: m?.variant ?? null,
        form: m?.form ?? null,
        flags: (m?.biologisch ? 1 : 0) | (m?.huismerk ? 2 : 0),
        ingredientUnitPriceCents: iPrice,
        ingredientPack: iPack,
      };
    });
    counts[chain.id] = c;
  }
  const withEans = new Set(candidates.filter((c) => c.eans.length).map((c) => c.chainId));
  const card = (id: string) => {
    const name = CARDS[id];
    return name && products[id]!.some((p) => [p.offerWording, p.nextWording].some((w) => w?.includes(name))) ? name : null;
  };

  const catalogue: Catalogue = {
    generatedAt: now.toISOString(),
    chains: source.chains.map((c) => ({
      id: c.id,
      name: c.name,
      kind: c.kind,
      store: STORES[c.id] ?? null,
      observedAt: c.observedAt,
      catalogueSize: c.productsRecorded,
      /**
       * False for a Chain that published no Offers on the day, as Vomar never
       * does in a readable form: its prices there are Shelf Prices, and the
       * page says so rather than letting it look as if nothing were reduced.
       */
      offers: c.offersRecorded > 0,
      /** False for a Chain that publishes no EANs (Dirk): it is never in an exact comparison. */
      eans: withEans.has(c.id),
      /** True for a Chain whose only prices online are its Offers (Lidl): never a bag of its own. */
      offersOnly: OFFERS_ONLY.has(c.id),
      /** The card counted as held, when any Offer today needs it; null otherwise. */
      card: card(c.id),
    })),
    columns: [...COLUMNS],
    vocabulary: pageVocabulary(vocabulary),
    catalogue: Object.fromEntries(Object.entries(products).map(([id, ps]) => [id, ps.map((p): Row => toRow(p))])),
    exact,
    /** Differences over 70% looked at and found real, which Bladeren then shows as any other (#36). */
    checked: CHECKED_SPREADS.map(({ chain, ref, ingredient }) => ({ chain, ref, ingredient })),
  };
  const labelled: LabelledProduct[] = source.chains.flatMap((chain) => productsAt(chain.id).map((p, i) => ({
    chainId: chain.id, ref: p.ref, name: p.name, brand: p.brand, categories: p.categories, unit: p.comparisonUnit,
    ingredient: products[chain.id]![i]!.ingredient,
    checked: mapped.decision(chain.id, p.ref).how === "verdict",
  })));
  const shelves = assessShelves(labelled.map((p) => ({ ...p, shelf: p.categories[0] ?? "" })));
  return { catalogue, counts, conflicts: mapped.conflicts, shelves, labelled, checks, stale: mapped.stale };
}
