import { readStep, payloadOf } from "../archive.ts";
import {
  centsFrom,
  parseInstant,
  parsePackSize,
  type ComparisonUnit,
} from "../normalise.ts";
import type { ChainReader, ChainReading, OfferReading, PriceReading } from "./types.ts";

/**
 * Jumbo.
 *
 * The opposite data-quality case to Dirk: Jumbo publishes an EAN and a
 * pre-computed Unit Price, and its prices are national rather than per-Store.
 * Where a Chain computes a Unit Price we store theirs, because that figure is
 * what the Chain legally represents to the consumer at the shelf -- ours would
 * be a second opinion on a number they already published.
 *
 * NOT YET EXERCISED ON REAL DATA. Jumbo's edge tarpits an honest client, so
 * the archive holds no Jumbo product responses and this reader is proved only
 * against a fixture built to the documented response shape. The field names
 * come from the archiver's verified selection set; the response envelope
 * around them (`searchProducts { products { ... } }`) is the part the edge
 * refused to confirm. See docs/archive.md.
 */

interface JumboProduct {
  sku?: unknown;
  title?: unknown;
  ean?: unknown;
  price?: {
    price?: unknown;
    promoPrice?: unknown;
    pricePerUnit?: { price?: unknown; unit?: unknown } | null;
  } | null;
}

interface JumboPromotion {
  id?: unknown;
  title?: unknown;
  subtitle?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  tags?: unknown;
  products?: unknown;
}

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

/** Jumbo states the unit as a bare word. Anything else is left unmapped. */
function comparisonUnit(unit: unknown): ComparisonUnit | null {
  const key = text(unit)?.toLowerCase();
  if (!key) return null;
  if (["kg", "kilo", "kilogram"].includes(key)) return "kg";
  if (["l", "liter", "litre", "ltr"].includes(key)) return "l";
  if (["stuk", "stuks", "piece", "st"].includes(key)) return "piece";
  return null;
}

export const jumboReader: ChainReader = {
  chainId: "jumbo",

  async read(archiveRoot: string, date: string): Promise<ChainReading> {
    const prices: PriceReading[] = [];
    const offers: OfferReading[] = [];
    const parseFailures: string[] = [];
    const seenRefs = new Set<string>();
    let productsSeen = 0;
    let unparsedPackSizes = 0;

    for await (const record of readStep(archiveRoot, date, "jumbo", "products")) {
      const data = payloadOf(record);
      if (!data) {
        parseFailures.push(`${record.label}: unusable response body`);
        continue;
      }
      const result = data.searchProducts as { products?: unknown } | null | undefined;
      const rows = result?.products;
      if (!Array.isArray(rows)) continue;

      for (const row of rows as JumboProduct[]) {
        productsSeen++;
        const ref = text(row.sku);
        const name = text(row.title);
        const shelf = centsFrom(row.price?.price);
        if (!ref || !name || shelf === null || shelf <= 0) {
          parseFailures.push(`jumbo product ${ref ?? "?"}: missing title or price`);
          continue;
        }
        // Categories overlap, so the same sku arrives more than once per run.
        // One observation per Product per run, not one per category it sits in.
        if (seenRefs.has(ref)) continue;
        seenRefs.add(ref);

        const chainUnitCents = centsFrom(row.price?.pricePerUnit?.price);
        const chainUnit = comparisonUnit(row.price?.pricePerUnit?.unit);
        // Jumbo exposes no separate pack field in the selection set we
        // archive, so the pack wording available to us is the title itself.
        // Kept verbatim rather than re-written into a tidier form.
        const pack = parsePackSize(name);
        if (!pack && !chainUnit) unparsedPackSizes++;

        const ean = text(row.ean);
        prices.push({
          chainProductRef: ref,
          name,
          brand: null, // Not in the archived selection set.
          packText: name,
          pack,
          isWeightProduct: false,
          eans: ean ? [ean] : [],
          storeRef: null, // Jumbo's public endpoint publishes national prices.
          observedAt: parseInstant(record.at) ?? new Date(`${date}T00:00:00Z`),
          shelfPriceCents: shelf,
          offerPriceCents: centsFrom(row.price?.promoPrice),
          unitPriceCents: chainUnitCents,
          comparisonUnit: chainUnit ?? pack?.unit ?? null,
          unitPriceSource: chainUnitCents !== null ? "chain" : null,
        });
      }
    }

    for await (const record of readStep(archiveRoot, date, "jumbo", "promotions")) {
      const data = payloadOf(record);
      if (!data) {
        parseFailures.push(`${record.label}: unusable response body`);
        continue;
      }
      const rows = data.promotions;
      if (!Array.isArray(rows)) continue;
      const observedAt = parseInstant(record.at) ?? new Date(`${date}T00:00:00Z`);

      for (const raw of rows as JumboPromotion[]) {
        const ref = text(raw.id);
        if (!ref) continue;
        const startsAt = parseInstant(raw.startDate);
        // Jumbo publishes next week's Offers before they begin, which is the
        // single most useful thing in its feed.
        const isUpcoming = startsAt !== null && startsAt.getTime() > observedAt.getTime();

        const tags = Array.isArray(raw.tags)
          ? (raw.tags as { text?: unknown }[])
              .map((t) => text(t.text))
              .filter((t): t is string => t !== null)
          : [];

        offers.push({
          chainOfferRef: ref,
          storeRef: null,
          headline: text(raw.title),
          // Jumbo's mechanics arrive as human-readable tag text ("1+1 gratis",
          // "25% korting"). Joined, never parsed: the effective unit price of
          // a Dutch Offer depends on how many you buy (ADR-0002).
          wording: tags.length ? tags.join(" · ") : text(raw.subtitle),
          startsAt,
          endsAt: parseInstant(raw.endDate),
          isUpcoming,
          observedAt,
          productRefs: Array.isArray(raw.products)
            ? (raw.products as { sku?: unknown }[])
                .map((p) => text(p.sku))
                .filter((s): s is string => s !== null)
            : [],
        });
      }
    }

    return { prices, offers, productsSeen, unparsedPackSizes, parseFailures };
  },
};
