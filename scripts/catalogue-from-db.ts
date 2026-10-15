/**
 * Writes every comparable Product in the database to the file the basket page
 * runs on.
 *
 *   node scripts/catalogue-from-db.ts
 *
 * The page resolves Basket Items itself, in the browser, so it needs each
 * Chain's whole comparable catalogue rather than candidates for a fixed
 * Basket. That is the point: the Basket is whatever the user types.
 *
 * Output goes to prototype/catalogue.js as a plain script, not JSON, because a
 * page opened straight from disk may load a script but may not fetch a file.
 * It is rebuilt from the database and not tracked: committed, every refresh
 * would add megabytes to the history.
 *
 * Only Products carrying a Unit Price and a Comparison Unit are written. One
 * without either is not a comparison candidate, which is why ingest reports
 * that count per run.
 */

import { writeFile } from "node:fs/promises";
import { connect } from "../src/ingest/db.ts";
import { formOf } from "../src/ingredients/aisles.ts";
import { createMapper, isOwnBrand, type Mapping } from "../src/ingredients/map.ts";
import { borrowMappings, productKey } from "../src/catalogue/borrow.ts";
import { CHECKED_SPREADS } from "../src/catalogue/checked-spreads.ts";
import { groupExactProducts, type ExactCandidate } from "../src/catalogue/exact.ts";
import { VOCABULARY, type ComparisonUnit } from "../src/ingredients/vocabulary.ts";
import { catalogueScript, COLUMNS, toRow, type Catalogue, type CatalogueProduct, type Row } from "../src/catalogue/format.ts";

const OUT = new URL("../prototype/catalogue.js", import.meta.url);

/**
 * Chains that put only their Offers online (Lidl, #28). A Product of theirs
 * is current only while their offers page lists it, so only their latest
 * run counts: last week's Offer must not linger as this week's price.
 */
const OFFERS_ONLY = new Set(["lidl"]);

/**
 * The card or app a Chain's Offers may require, as its wording names it.
 * Every such price counts as paid, as if the shopper held the card (owner's
 * decision, 2026-10-14), and the page says which cards it assumed.
 */
const CARDS: Readonly<Record<string, string>> = { lidl: "Lidl Plus" };

/** One Ingredient's quantity in another unit: courgette 1 piece = 0.3 kg. */
function inIngredientUnit(perUnitOf: ComparisonUnit, quantity: number, ingredientUnit: ComparisonUnit, equals: Partial<Record<ComparisonUnit, number>>, price: boolean): number | null {
  if (perUnitOf === ingredientUnit) return quantity;
  const x = equals[perUnitOf];
  if (!x) return null;
  // A price per kg times 0.3 kg is the price of one courgette; a pack of
  // 0.6 kg divided by 0.3 kg is two courgettes.
  return price ? Math.round(quantity * x) : Math.round((quantity / x) * 1000) / 1000;
}

const map = createMapper();
const vocabulary = new Map(VOCABULARY.map((d) => [d.id, d]));
const mappedCount: Record<string, { mapped: number; borrowed: number; comparable: number; total: number }> = {};

const db = connect();

const { rows: chains } = await db.query<{
  id: string; name: string; kind: string; archive_date: string | null; products_recorded: number | null;
  offers_recorded: number | null; run_id: string | null;
}>(
  // archive_date as text: read as a Date, it is local midnight in Amsterdam,
  // which toISOString() reports as the previous day.
  `SELECT c.id, c.name, c.kind, r.archive_date::text AS archive_date, r.products_recorded, r.offers_recorded, r.id AS run_id
     FROM chain c
     LEFT JOIN LATERAL (
       SELECT id, archive_date, products_recorded, offers_recorded FROM ingest_run
        WHERE chain_id = c.id AND outcome = 'complete'
        ORDER BY id DESC LIMIT 1
     ) r ON true
    WHERE EXISTS (SELECT 1 FROM product p WHERE p.chain_id = c.id)
    ORDER BY c.name`,
);

/** One Product's latest Observation, as the query below reads it. */
interface ProductRow {
  chain_product_ref: string; name: string; pack_text: string | null; pack_quantity: string | null;
  pack_unit: string | null; comparison_unit: string; shelf_price_cents: number; offer_price_cents: number | null;
  unit_price_cents: number; wording: string | null; ends_on: string | null;
  next_wording: string | null; next_starts_on: string | null; has_next: boolean;
  brand: string | null; categories: string[]; eans: string[];
}

/** Each Chain's Products, as written; the catalogue holds them as rows (src/catalogue/format.ts). */
const products: Record<string, Omit<CatalogueProduct, "referenceLowCents" | "referenceDays">[]> = {};
const exactCandidates: ExactCandidate[] = [];
/** Each Chain's rows as read, and each Product's own Mapping, until EAN twins have lent theirs. */
const pending: Record<string, ProductRow[]> = {};
const own = new Map<string, Mapping | null>();

for (const chain of chains) {
  const { rows } = await db.query<ProductRow>(
    // The latest Observation per Product, joined to the running Offer naming
    // it and, separately, the next upcoming one. All from the same run: a day
    // can be re-ingested after a parser fix, its runs share an observed_at,
    // and Observations and Offers are never revised, so without the run as
    // tie-break an earlier run's figures and wording would leak through.
    `WITH latest AS (
       SELECT DISTINCT ON (o.chain_product_ref) o.*
         FROM price_observation o
        WHERE o.chain_id = $1
        ORDER BY o.chain_product_ref, o.observed_at DESC, o.run_id DESC
     )
     SELECT p.chain_product_ref, p.name, p.brand, p.categories, p.pack_text, p.pack_quantity,
            p.pack_unit, l.comparison_unit, l.shelf_price_cents, l.offer_price_cents,
            l.unit_price_cents, off.wording,
            (off.ends_at AT TIME ZONE 'Europe/Amsterdam')::date::text AS ends_on,
            nxt.wording AS next_wording,
            (nxt.starts_at AT TIME ZONE 'Europe/Amsterdam')::date::text AS next_starts_on,
            nxt.id IS NOT NULL AS has_next,
            ARRAY(SELECT e.ean FROM product_ean e
                   WHERE e.chain_id = p.chain_id AND e.chain_product_ref = p.chain_product_ref) AS eans
       FROM latest l
       JOIN product p USING (chain_id, chain_product_ref)
       LEFT JOIN LATERAL (
         SELECT oo.wording, oo.ends_at
           FROM offer_product op
           JOIN offer_observation oo ON oo.id = op.offer_observation_id
          WHERE oo.chain_id = $1 AND oo.run_id = l.run_id AND op.chain_product_ref = p.chain_product_ref
            AND NOT oo.is_upcoming
          ORDER BY oo.id DESC
          LIMIT 1
       ) off ON true
       LEFT JOIN LATERAL (
         SELECT oo.id, oo.wording, oo.starts_at
           FROM offer_product op
           JOIN offer_observation oo ON oo.id = op.offer_observation_id
          WHERE oo.chain_id = $1 AND oo.run_id = l.run_id AND op.chain_product_ref = p.chain_product_ref
            AND oo.is_upcoming
          ORDER BY oo.starts_at NULLS LAST, oo.id DESC
          LIMIT 1
       ) nxt ON true
      WHERE l.unit_price_cents IS NOT NULL AND l.comparison_unit IS NOT NULL
        AND ($2::bigint IS NULL OR l.run_id = $2)
      ORDER BY l.unit_price_cents`,
    [chain.id, OFFERS_ONLY.has(chain.id) ? chain.run_id : null],
  );

  pending[chain.id] = rows.map((r) => {
    const m = map({ chainId: chain.id, name: r.name, brand: r.brand, categories: r.categories });
    own.set(productKey(chain.id, r.chain_product_ref), m);
    const packQuantity = r.pack_quantity === null ? null : Number(r.pack_quantity);
    exactCandidates.push({
      chainId: chain.id, ref: r.chain_product_ref, name: r.name, brand: r.brand, eans: r.eans,
      packQuantity, packUnit: r.pack_unit, huismerk: isOwnBrand(chain.id, r.brand, r.name),
    });
    return r;
  });
}

/**
 * Exact Products (#15): the same branded item at several Chains, proven by a
 * shared EAN, with any Product only likely the same at a Chain publishing no
 * EANs. Members are refs into each Chain's rows above. See src/catalogue/exact.ts.
 */
const exact = groupExactProducts(exactCandidates);

/**
 * A Product mapping to nothing borrows its EAN twin's Ingredient (#34); see
 * src/catalogue/borrow.ts. Twins that disagree are listed, to be fixed.
 */
const borrowed = borrowMappings(exact, own);

for (const chain of chains) {
  const rows = pending[chain.id]!;
  const counts = (mappedCount[chain.id] = { mapped: 0, borrowed: 0, comparable: 0, total: rows.length });
  products[chain.id] = rows.map((r) => {
    const key = productKey(chain.id, r.chain_product_ref);
    const lent = borrowed.mappings.get(key);
    const m = own.get(key) ?? lent ?? null;
    const def = m ? vocabulary.get(m.ingredient)! : null;
    const unit = r.comparison_unit as ComparisonUnit;
    const iPrice = def ? inIngredientUnit(unit, r.unit_price_cents, def.unit, def.equals, true) : null;
    const packQuantity = r.pack_quantity === null ? null : Number(r.pack_quantity);
    const iPack = def && packQuantity !== null && r.pack_unit
      ? inIngredientUnit(r.pack_unit as ComparisonUnit, packQuantity, def.unit, def.equals, false)
      : null;
    if (m) counts.mapped++;
    if (lent) counts.borrowed++;
    if (iPrice !== null) counts.comparable++;
    return {
      ref: r.chain_product_ref,
      name: r.name,
      packaging: r.pack_text && r.pack_text !== r.name ? r.pack_text : null,
      packQuantity,
      packUnit: r.pack_unit,
      comparisonUnit: unit,
      shelfPriceCents: r.shelf_price_cents,
      offerPriceCents: r.offer_price_cents,
      unitPriceCents: r.unit_price_cents,
      offerWording: r.wording,
      offerEndsOn: r.ends_on,
      // An upcoming Offer with no tags still exists; the page names it generically.
      nextWording: r.has_next ? (r.next_wording ?? "") : null,
      nextStartsOn: r.next_starts_on,
      ingredient: m?.ingredient ?? null,
      variant: m?.variant ?? null,
      form: m?.form ?? null,
      flags: (m?.biologisch ? 1 : 0) | (m?.huismerk ? 2 : 0),
      ingredientUnitPriceCents: iPrice,
      ingredientPack: iPack,
    };
  });
}
/** The page reads each Product as a row, by column name (src/catalogue/format.ts). */
const catalogue: Record<string, Row[]> = Object.fromEntries(Object.entries(products).map(([id, ps]) => [id, ps.map((p) => toRow(p))]));
const withEans = new Set(exactCandidates.filter((c) => c.eans.length).map((c) => c.chainId));

const data: Catalogue = {
  generatedAt: new Date().toISOString(),
  chains: chains.map((c) => ({
    id: c.id,
    name: c.name,
    kind: c.kind,
    store: c.id === "dirk" ? "Store 66" : null,
    observedAt: c.archive_date,
    catalogueSize: Number(c.products_recorded ?? 0),
    /**
     * False for a Chain that published no Offers on the day, as Vomar never
     * does in a readable form: its prices there are Shelf Prices, and the
     * page says so rather than letting it look as if nothing were reduced.
     */
    offers: Number(c.offers_recorded ?? 0) > 0,
    /** False for a Chain that publishes no EANs (Dirk): it is never in an exact comparison. */
    eans: withEans.has(c.id),
    /** True for a Chain whose only prices online are its Offers (Lidl): never a bag of its own. */
    offersOnly: OFFERS_ONLY.has(c.id),
    /** The card counted as held, when any Offer today needs it; null otherwise. */
    card: CARDS[c.id] && products[c.id]!.some((p) => [p.offerWording, p.nextWording].some((w) => w?.includes(CARDS[c.id]!))) ? CARDS[c.id]! : null,
  })),
  columns: [...COLUMNS],
  /**
   * What the page reads a typed item against. `fresh`: the Ingredient is sold
   * fresh, so frozen, tinned and jarred count only when a Preference allows.
   * `aisle`: where it is mainly sold, which Bladeren groups it under (#36)
   * and whose sticker stands in for its own.
   */
  vocabulary: VOCABULARY.map((d) => ({
    id: d.id, name: d.name, unit: d.unit, also: d.also, equals: d.equals,
    variants: d.variants.map((v) => ({ id: v.id, name: v.name })),
    fresh: !d.anyForm && d.aisles.some((a) => formOf(a) === "vers"),
    aisle: d.aisles[0],
  })),
  catalogue,
  exact,
  /** Differences over 70% looked at and found real, which Bladeren then shows as any other (#36). */
  checked: CHECKED_SPREADS.map(({ chain, ref, ingredient }) => ({ chain, ref, ingredient })),
};

await writeFile(OUT, catalogueScript(data, "scripts/catalogue-from-db.ts"));
const counts = chains.map((c) => {
  const ps = products[c.id]!;
  return `${c.name} ${ps.length} (${ps.filter((p) => p.nextWording !== null).length} with an upcoming Offer)`;
}).join(", ");
console.error(`wrote ${OUT.pathname}: ${counts} comparable products`);
// Reported every run (#14): how much of each Chain maps to an Ingredient, and
// how much of that compares in the Ingredient's own unit.
for (const c of chains) {
  const n = mappedCount[c.id]!;
  console.error(`  ${c.name}: ${n.mapped} mapped to an Ingredient (${n.borrowed} borrowed from an EAN twin), ${n.total - n.mapped} unmapped; ${n.comparable} comparable in the Ingredient's unit`);
}
// EAN twins mapped to different Ingredients: one of them is wrong (#34).
const names = Object.fromEntries(chains.map((c) => [c.id, c.name]));
console.error(`  ${borrowed.conflicts.length} Exact Products whose Chains map them to different Ingredients${borrowed.conflicts.length ? ":" : ""}`);
for (const k of borrowed.conflicts) {
  console.error(`    ${k.name} (${k.id}): ${Object.entries(k.ingredients).map(([c, i]) => `${names[c]} ${i ?? "none"}`).join(", ")}`);
}
const likely = exact.filter((g) => Object.keys(g.likely).length).length;
console.error(`  ${exact.length} Exact Products shared by EAN, ${likely} with a Product likely the same where no EAN is published`);
await db.end();
