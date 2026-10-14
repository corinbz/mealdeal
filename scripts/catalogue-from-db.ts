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

const OUT = new URL("../prototype/catalogue.js", import.meta.url);

/**
 * One Product, as a positional row: 24,000 objects with repeated keys would
 * roughly double the file. The page reads them by these indices.
 */
type Row = [
  ref: string,
  name: string,
  /** Null when the Chain states none, or only repeats the name (Jumbo). */
  packaging: string | null,
  packQuantity: number | null,
  /**
   * What packQuantity counts. Not always the Comparison Unit: Jumbo prices
   * "Champignon Soep 3 Stuks" per kg, and 3 is pieces.
   */
  packUnit: string | null,
  comparisonUnit: string,
  shelfPriceCents: number,
  offerPriceCents: number | null,
  unitPriceCents: number,
  /** The Offer running on the day swept; offerPriceCents is its price, if it has one. */
  offerWording: string | null,
  /** The day it ends, in Amsterdam; null when open-ended or not stated. */
  offerEndsOn: string | null,
  /**
   * The next Offer announced but not yet started (#8). Kept apart from the
   * running one so the two are never mixed silently. It has no price here:
   * a price is only observed once an Offer runs, and none is derived from
   * its wording (ADR-0002).
   */
  nextWording: string | null,
  nextStartsOn: string | null,
  // scripts/apply-history.ts appends referenceLowCents and referenceDays.
];

const db = connect();

const { rows: chains } = await db.query<{
  id: string; name: string; kind: string; archive_date: string | null; products_recorded: number | null;
}>(
  // archive_date as text: read as a Date, it is local midnight in Amsterdam,
  // which toISOString() reports as the previous day.
  `SELECT c.id, c.name, c.kind, r.archive_date::text AS archive_date, r.products_recorded
     FROM chain c
     LEFT JOIN LATERAL (
       SELECT archive_date, products_recorded FROM ingest_run
        WHERE chain_id = c.id AND outcome = 'complete'
        ORDER BY id DESC LIMIT 1
     ) r ON true
    WHERE EXISTS (SELECT 1 FROM product p WHERE p.chain_id = c.id)
    ORDER BY c.name`,
);

const catalogue: Record<string, Row[]> = {};

for (const chain of chains) {
  const { rows } = await db.query<{
    chain_product_ref: string; name: string; pack_text: string | null; pack_quantity: string | null;
    pack_unit: string | null; comparison_unit: string; shelf_price_cents: number; offer_price_cents: number | null;
    unit_price_cents: number; wording: string | null; ends_on: string | null;
    next_wording: string | null; next_starts_on: string | null; has_next: boolean;
  }>(
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
     SELECT p.chain_product_ref, p.name, p.pack_text, p.pack_quantity,
            p.pack_unit, l.comparison_unit, l.shelf_price_cents, l.offer_price_cents,
            l.unit_price_cents, off.wording,
            (off.ends_at AT TIME ZONE 'Europe/Amsterdam')::date::text AS ends_on,
            nxt.wording AS next_wording,
            (nxt.starts_at AT TIME ZONE 'Europe/Amsterdam')::date::text AS next_starts_on,
            nxt.id IS NOT NULL AS has_next
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
      ORDER BY l.unit_price_cents`,
    [chain.id],
  );

  catalogue[chain.id] = rows.map<Row>((r) => [
    r.chain_product_ref,
    r.name,
    r.pack_text && r.pack_text !== r.name ? r.pack_text : null,
    r.pack_quantity === null ? null : Number(r.pack_quantity),
    r.pack_unit,
    r.comparison_unit,
    r.shelf_price_cents,
    r.offer_price_cents,
    r.unit_price_cents,
    r.wording,
    r.ends_on,
    // An upcoming Offer with no tags still exists; the page names it generically.
    r.has_next ? (r.next_wording ?? "") : null,
    r.next_starts_on,
  ]);
}

const data = {
  generatedAt: new Date().toISOString(),
  chains: chains.map((c) => ({
    id: c.id,
    name: c.name,
    kind: c.kind,
    store: c.id === "dirk" ? "Store 66" : null,
    observedAt: c.archive_date,
    catalogueSize: Number(c.products_recorded ?? 0),
  })),
  catalogue,
};

await writeFile(OUT, `// Generated by scripts/catalogue-from-db.ts. Do not edit.\nwindow.CATALOGUE = ${JSON.stringify(data)};\n`);
const counts = chains.map((c) => {
  const rows = catalogue[c.id]!;
  return `${c.name} ${rows.length} (${rows.filter((r) => r[11] !== null).length} with an upcoming Offer)`;
}).join(", ");
console.error(`wrote ${OUT.pathname}: ${counts} comparable products`);
await db.end();
