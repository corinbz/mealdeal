import type { Db } from "./db.ts";
import type { ChainReading } from "./readers/types.ts";

export interface RunCounts {
  productsSeen: number;
  productsRecorded: number;
  pricesRecorded: number;
  offersRecorded: number;
  withoutUnitPrice: number;
  parseFailures: number;
}

export interface RunResult {
  runId: number | null;
  outcome: "complete" | "rejected";
  counts: RunCounts;
  notes: string | null;
}

export interface RecordOptions {
  /**
   * Reject a run recording less than this share of the previous run's
   * Products. A Chain quietly changing its API shape looks exactly like
   * missing data, so a sharp drop must be an alarm rather than a quiet
   * success. Dirk's `listOffers` already proved the failure mode: called
   * wrongly it answers HTTP 200 with empty lists.
   */
  readonly minVolumeRatio: number;
  /** Accept a flagged run anyway, for a genuine catalogue shrink. */
  readonly force: boolean;
}

export const DEFAULT_OPTIONS: RecordOptions = { minVolumeRatio: 0.5, force: false };

async function previousVolume(db: Db, chainId: string): Promise<number | null> {
  const { rows } = await db.query<{ products_recorded: number }>(
    `SELECT products_recorded FROM ingest_run
      WHERE chain_id = $1 AND outcome = 'complete'
      ORDER BY id DESC LIMIT 1`,
    [chainId],
  );
  return rows.length ? Number(rows[0]!.products_recorded) : null;
}

/**
 * Writes one Chain's reading for one archive date.
 *
 * Everything happens in a single transaction so a rejected run leaves no
 * half-ingested day behind. The run row itself is then written outside that
 * transaction, because the record that a run was rejected is exactly the part
 * that must survive the rollback.
 */
export async function record(
  db: Db,
  chainId: string,
  archiveDate: string,
  reading: ChainReading,
  options: RecordOptions = DEFAULT_OPTIONS,
): Promise<RunResult> {
  const distinctProducts = new Set(reading.prices.map((p) => p.chainProductRef));
  const counts: RunCounts = {
    productsSeen: reading.productsSeen,
    productsRecorded: distinctProducts.size,
    pricesRecorded: reading.prices.length,
    offersRecorded: reading.offers.length,
    withoutUnitPrice: reading.withoutUnitPrice,
    parseFailures: reading.parseFailures.length,
  };

  const previous = await previousVolume(db, chainId);
  const floor = previous === null ? 0 : Math.floor(previous * options.minVolumeRatio);
  const dropped = previous !== null && counts.productsRecorded < floor;

  if (dropped && !options.force) {
    const notes =
      `rejected: recorded ${counts.productsRecorded} products, below the ` +
      `${floor} floor (${Math.round(options.minVolumeRatio * 100)}% of the ` +
      `previous run's ${previous}). A Chain changing its API shape looks ` +
      `exactly like this. Re-run with --force if the catalogue genuinely shrank.`;
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO ingest_run
         (chain_id, archive_date, finished_at, outcome, products_seen,
          products_recorded, prices_recorded, offers_recorded,
          without_unit_price, parse_failures, notes)
       VALUES ($1, $2, now(), 'rejected', $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        chainId, archiveDate, counts.productsSeen, counts.productsRecorded,
        counts.pricesRecorded, counts.offersRecorded, counts.withoutUnitPrice,
        counts.parseFailures, notes,
      ],
    );
    return { runId: Number(rows[0]!.id), outcome: "rejected", counts, notes };
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const { rows: runRows } = await client.query<{ id: string }>(
      `INSERT INTO ingest_run (chain_id, archive_date) VALUES ($1, $2) RETURNING id`,
      [chainId, archiveDate],
    );
    const runId = Number(runRows[0]!.id);

    for (const price of reading.prices) {
      // The Product row carries the latest description; the observation
      // carries the price. Only the latter is history.
      await client.query(
        `INSERT INTO product
           (chain_id, chain_product_ref, name, brand, pack_text, pack_quantity,
            comparison_unit, is_weight_product, first_seen_on, last_seen_on)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
         ON CONFLICT (chain_id, chain_product_ref) DO UPDATE SET
           name = EXCLUDED.name,
           brand = EXCLUDED.brand,
           pack_text = EXCLUDED.pack_text,
           pack_quantity = EXCLUDED.pack_quantity,
           comparison_unit = EXCLUDED.comparison_unit,
           is_weight_product = EXCLUDED.is_weight_product,
           last_seen_on = GREATEST(product.last_seen_on, EXCLUDED.last_seen_on)`,
        [
          chainId, price.chainProductRef, price.name, price.brand, price.packText,
          price.pack?.quantity ?? null, price.comparisonUnit,
          price.isWeightProduct, archiveDate,
        ],
      );

      for (const ean of price.eans) {
        await client.query(
          `INSERT INTO product_ean (chain_id, chain_product_ref, ean)
           VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [chainId, price.chainProductRef, ean],
        );
      }

      await client.query(
        `INSERT INTO price_observation
           (run_id, chain_id, chain_product_ref, store_ref, observed_at,
            shelf_price_cents, offer_price_cents, unit_price_cents,
            comparison_unit, unit_price_source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          runId, chainId, price.chainProductRef, price.storeRef, price.observedAt,
          price.shelfPriceCents, price.offerPriceCents, price.unitPriceCents,
          price.comparisonUnit, price.unitPriceSource,
        ],
      );
    }

    for (const offer of reading.offers) {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO offer_observation
           (run_id, chain_id, store_ref, chain_offer_ref, headline, wording,
            starts_at, ends_at, is_upcoming, observed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [
          runId, chainId, offer.storeRef, offer.chainOfferRef, offer.headline,
          offer.wording, offer.startsAt, offer.endsAt, offer.isUpcoming,
          offer.observedAt,
        ],
      );
      const offerId = Number(rows[0]!.id);
      for (const ref of new Set(offer.productRefs)) {
        await client.query(
          `INSERT INTO offer_product (offer_observation_id, chain_product_ref)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [offerId, ref],
        );
      }
    }

    const notes = dropped
      ? `forced: recorded ${counts.productsRecorded} products against a ${floor} floor`
      : reading.parseFailures.length
        ? `${reading.parseFailures.length} parse failure(s): ${reading.parseFailures.slice(0, 3).join(" | ")}`
        : null;

    await client.query(
      `UPDATE ingest_run SET
         finished_at = now(), outcome = 'complete', products_seen = $2,
         products_recorded = $3, prices_recorded = $4, offers_recorded = $5,
         without_unit_price = $6, parse_failures = $7, notes = $8
       WHERE id = $1`,
      [
        runId, counts.productsSeen, counts.productsRecorded, counts.pricesRecorded,
        counts.offersRecorded, counts.withoutUnitPrice, counts.parseFailures, notes,
      ],
    );

    await client.query("COMMIT");
    return { runId, outcome: "complete", counts, notes };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
