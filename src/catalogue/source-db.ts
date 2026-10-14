/**
 * The catalogue's source read out of Postgres: each Chain's latest complete
 * run, and every Product's latest Observation with a Unit Price, with the
 * Offer running on it and the next one announced. src/catalogue/build.ts
 * turns this into the catalogue; it decides nothing about the page.
 */

import type { Db } from "../ingest/db.ts";
import type { ComparisonUnit } from "../ingredients/vocabulary.ts";
import { OFFERS_ONLY, type CatalogueSource, type SourceProduct } from "./build.ts";

/** One Product's latest Observation, as the query below reads it. */
interface ProductRow {
  chain_product_ref: string; name: string; pack_text: string | null; pack_quantity: string | null;
  pack_unit: string | null; comparison_unit: string; shelf_price_cents: number; offer_price_cents: number | null;
  unit_price_cents: number; wording: string | null; ends_on: string | null;
  next_wording: string | null; next_starts_on: string | null; has_next: boolean;
  brand: string | null; categories: string[]; eans: string[];
}

export async function readCatalogueSource(db: Db): Promise<CatalogueSource> {
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

  const products: Record<string, SourceProduct[]> = {};
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
      // An offers-only Chain's Products are current only in its latest run.
      [chain.id, OFFERS_ONLY.has(chain.id) ? chain.run_id : null],
    );
    products[chain.id] = rows.map((r) => ({
      ref: r.chain_product_ref,
      name: r.name,
      brand: r.brand,
      categories: r.categories,
      eans: r.eans,
      packText: r.pack_text,
      packQuantity: r.pack_quantity === null ? null : Number(r.pack_quantity),
      packUnit: r.pack_unit,
      comparisonUnit: r.comparison_unit as ComparisonUnit,
      shelfPriceCents: r.shelf_price_cents,
      offerPriceCents: r.offer_price_cents,
      unitPriceCents: r.unit_price_cents,
      offerWording: r.wording,
      offerEndsOn: r.ends_on,
      // An upcoming Offer with no tags still exists; the page names it generically.
      nextWording: r.has_next ? (r.next_wording ?? "") : null,
      nextStartsOn: r.next_starts_on,
    }));
  }

  return {
    chains: chains.map((c) => ({
      id: c.id, name: c.name, kind: c.kind, observedAt: c.archive_date,
      productsRecorded: Number(c.products_recorded ?? 0), offersRecorded: Number(c.offers_recorded ?? 0),
    })),
    products,
  };
}
