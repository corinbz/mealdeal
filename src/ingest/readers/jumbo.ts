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
 * Exercised on the real catalogue: 17,104 Products from a full 1134-category
 * walk on 2026-10-13, of which 17,072 carried an EAN and 16,938 a Unit Price
 * Jumbo computed itself. Dirk, by contrast, published neither for any of its
 * 963 — which is why the two were built together.
 *
 * Reaching the endpoint at all requires an agent string Jumbo accepts; the
 * honest one is tarpitted. That is a decision recorded in
 * `src/archive/chains/jumbo.ts` and `docs/archive.md`, not a default.
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

const sameWords = (a: string, b: string): boolean => {
  const fold = (s: string) => s.split(/\s+/).join(" ").toLowerCase();
  return fold(a) === fold(b);
};

/**
 * Jumbo states the unit as a bare word. Anything else is left unmapped.
 *
 * `pieces` and `kg` are the spellings observed in live responses. `pieces` in
 * particular was missing from the first version of this list, which was
 * written against a fixture of our own invention that guessed `stuk` -- so
 * every piece-priced Jumbo Product would have had its Comparison Unit
 * silently dropped. The other spellings here are still guesses and will stay
 * guesses until a real response uses one.
 */
function comparisonUnit(unit: unknown): ComparisonUnit | null {
  const key = text(unit)?.toLowerCase();
  if (!key) return null;
  if (["kg", "kilo", "kilogram"].includes(key)) return "kg";
  if (["l", "liter", "litre", "ltr"].includes(key)) return "l";
  if (["pieces", "piece", "stuk", "stuks", "st"].includes(key)) return "piece";
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
    let withoutUnitPrice = 0;

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
        if (!ref || !name) {
          parseFailures.push(`jumbo product ${ref ?? "?"}: no sku or title`);
          continue;
        }
        // Jumbo lists some Products at a price of 0 with a null pricePerUnit
        // -- pet food and cosmetics, in the observed data. Zero is not a
        // price, so there is nothing to record, but this is the Chain's own
        // catalogue state rather than a parsing problem, and saying so keeps
        // the count meaningful.
        if (shelf === null || shelf <= 0) {
          parseFailures.push(`jumbo product ${ref}: listed with no price (${shelf ?? "null"})`);
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
        // Jumbo's own figure or nothing: we do not derive a second opinion on
        // a number the Chain already publishes, so a null pricePerUnit means
        // this Product has no Unit Price however readable its pack size is.
        if (chainUnitCents === null) withoutUnitPrice++;

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

        // A tag that only repeats the title is a brand page's label, not
        // mechanics: "Red Band" tagged "Red Band" advertises no deal. Exact
        // match only — "Gratis lepelsetje" sits inside its title and is the
        // whole offer.
        const title = text(raw.title);
        const tags = Array.isArray(raw.tags)
          ? (raw.tags as { text?: unknown }[])
              .map((t) => text(t.text))
              .filter((t): t is string => t !== null)
              .filter((t) => title === null || !sameWords(t, title))
          : [];

        offers.push({
          chainOfferRef: ref,
          storeRef: null,
          headline: title,
          // Jumbo's mechanics arrive as human-readable tag text ("1+1 gratis",
          // "25% korting", "2e halve prijs"). Joined, never parsed: the
          // effective unit price of a Dutch Offer depends on how many you buy
          // (ADR-0002).
          //
          // No fallback to `subtitle`. It holds things like a supplier name
          // ("Van Wijngaarden"), and an earlier fallback put those on screen
          // in the slot reserved for the deal — which reads as though the
          // brand were the offer. An Offer with no tags has no advertised
          // mechanics, and null says exactly that.
          wording: tags.length ? tags.join(" · ") : null,
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

    return { prices, offers, productsSeen, withoutUnitPrice, parseFailures };
  },
};
