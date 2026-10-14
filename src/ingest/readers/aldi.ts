import { readStep, jsonOf } from "../archive.ts";
import { deriveUnitPrice, parseInstant, parsePackSize, type ComparisonUnit } from "../normalise.ts";
import type { ChainReader, ChainReading, OfferReading, PriceReading } from "./types.ts";

/**
 * Aldi (#31): the Algolia index behind aldi.nl, read whole. See
 * `src/archive/chains/aldi.ts`.
 *
 * National prices. No EAN. The pack is `salesUnit` ("500 g", "2x120 g").
 * Aldi's own Unit Price (`basePrice`) is on the price shown now, Offer or
 * not, so it is stored whenever it is per kilo or litre.
 *
 * `currentPrice` is what a Store charges today. Under an Offer it carries
 * the Shelf Price as `strikePrice`; so the Shelf Price is the strike price
 * where there is one, and the price shown is then the Offer price. Three
 * kinds of price shown are not a price for one pack, and are not recorded:
 *
 *   - a multibuy, labelled "2 VOOR": the price is for two. The deal stays in
 *     the Offer's wording (ADR-0002).
 *   - a price from, labelled "VANAF" or "TOT -29%": one record stands for
 *     several articles ("Bier", 50 cl), and the price is the cheapest's.
 *   - an article not yet in Stores, labelled "v.a. wo. 21.10." ("from
 *     Wednesday"): it is recorded as an upcoming Offer only.
 *
 * Every entry in `promotionPrices` that advertises something (a label or a
 * strike price) is an Offer of that one Product, from its first day to its
 * last, recorded weeks ahead and passed over once it has ended. Action
 * articles ("OP=OP", while stock lasts) are Products like any other, sold at
 * the price shown; where a folder week lists one, that week is its Offer.
 *
 * Aldi sells nothing online that a Store does not, so nothing is passed over
 * for that (the owner's rule, 2026-10-14).
 */

interface Price {
  priceValue?: unknown;
  strikePrice?: { strikePriceValue?: unknown } | null;
  basePrice?: { basePriceValue?: unknown; basePriceScale?: unknown }[] | null;
  priceTagLabels?: { promoText1?: unknown } | null;
  validFrom?: unknown;
  validUntil?: unknown;
}
interface AldiHit {
  objectID?: unknown;
  name?: unknown;
  brandName?: unknown;
  salesUnit?: unknown;
  isAvailable?: unknown;
  hierarchicalCategories?: Record<string, unknown> | null;
  currentPrice?: Price | null;
  promotionPrices?: (Price & { validFromLocalDate?: unknown })[] | null;
}

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim().replace(/\s+/g, " ") : null;

/** 2.29 to 229. */
function cents(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value * 100) : null;
}

/** "1,89", as Aldi writes a price on its signs. */
const euros = (c: number) => (c / 100).toFixed(2).replace(".", ",");

/** Unix seconds, as Aldi sends them; the year 2099 means no end. */
function instant(value: unknown): Date | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const d = new Date(value * 1000);
  return d.getUTCFullYear() >= 2090 ? null : d;
}

const label = (price: Price | null | undefined) => text(price?.priceTagLabels?.promoText1);

/** "2 VOOR": the price shown is for several packs. */
const MULTIBUY = /^\d+\s*voor\b/i;
/** "VANAF 1,39", "TOT -24%": the cheapest of several articles. */
const PRICE_FROM = /^(vanaf|tot)\b/i;
/** "v.a. wo. 21.10.": not in Stores until then. */
const NOT_YET = /^v\.?\s*a\.?\s/i;

/** Brand shelves, seasons and prize-winners, which file a Product by occasion, not by what it is. */
const NOT_A_SHELF = /^(aldi merken|speciaal assortiment|winnaarsproducten|\S*assortiment)\b/i;

/**
 * Each place Aldi files a Product, as a path of names. Its paths arrive one
 * list per depth ("lvl0", "lvl1", ...); a path is each one no deeper path
 * extends. Brand, seasonal and prize shelves are left out where a Product
 * has a shelf of its own.
 */
export function categoryPaths(levels: AldiHit["hierarchicalCategories"]): string[] {
  const all = Object.values(levels ?? {})
    .flatMap((v) => (Array.isArray(v) ? v : []))
    .map(text)
    .filter((p): p is string => p !== null);
  const leaves = [...new Set(all)].filter((p) => !all.some((q) => q.startsWith(`${p} > `))).sort();
  const regular = leaves.filter((p) => !NOT_A_SHELF.test(p));
  return regular.length ? regular : leaves;
}

/** Aldi's Unit Price, when it is per kilo or litre. */
function basePrice(price: Price): { cents: number; unit: ComparisonUnit } | null {
  for (const b of price.basePrice ?? []) {
    const value = cents(b.basePriceValue);
    const scale = text(b.basePriceScale)?.toLowerCase();
    if (value !== null && (scale === "kg" || scale === "l")) return { cents: value, unit: scale };
  }
  return null;
}

/** The sign as Aldi words it, and its price: "-50% 1,19", "2 VOOR 6,00", "OP=OP 4,59". */
function wordingOf(price: Price): string | null {
  const sign = label(price);
  const value = cents(price.priceValue);
  if (!sign) return value !== null ? euros(value) : null;
  return value !== null ? `${sign} ${euros(value)}` : sign;
}

export const aldiReader: ChainReader = {
  chainId: "aldi",

  async read(archiveRoot: string, date: string): Promise<ChainReading> {
    const prices: PriceReading[] = [];
    const offers: (OfferReading & { productRefs: string[] })[] = [];
    const parseFailures: string[] = [];
    const seen = new Set<string>();
    let productsSeen = 0;
    let withoutUnitPrice = 0;

    for await (const record of readStep(archiveRoot, date, "aldi", "products")) {
      const answer = jsonOf(record) as { hits?: AldiHit[] } | null;
      if (!Array.isArray(answer?.hits)) {
        parseFailures.push(`${record.label}: unusable response body`);
        continue;
      }
      const observedAt = parseInstant(record.at) ?? new Date(`${date}T00:00:00Z`);
      const now = observedAt.getTime();

      for (const hit of answer.hits) {
        productsSeen++;
        const ref = text(hit.objectID);
        const name = text(hit.name);
        if (!ref || !name) {
          parseFailures.push(`aldi product ${ref ?? "?"}: missing name`);
          continue;
        }
        if (seen.has(ref)) continue;
        seen.add(ref);

        // Its Offers, this week's and the weeks ahead.
        for (const promotion of hit.promotionPrices ?? []) {
          const startsAt = instant(promotion.validFrom);
          const endsAt = instant(promotion.validUntil);
          if (endsAt && endsAt.getTime() < now) continue;
          if (!label(promotion) && cents(promotion.strikePrice?.strikePriceValue) === null) continue;
          offers.push({
            chainOfferRef: `${ref}@${text(promotion.validFromLocalDate) ?? startsAt?.toISOString().slice(0, 10) ?? "?"}`,
            storeRef: null,
            headline: null,
            // The sign, verbatim, with the price it shows (ADR-0002).
            wording: wordingOf(promotion),
            startsAt,
            endsAt,
            isUpcoming: startsAt !== null && startsAt.getTime() > now,
            observedAt,
            productRefs: [ref],
          });
        }

        // Its price today, when it is one for a pack a Store sells today.
        const current = hit.currentPrice;
        const shown = cents(current?.priceValue);
        if (hit.isAvailable !== true || !current || shown === null) continue;
        const sign = label(current) ?? "";
        const from = instant(current.validFrom);
        if (MULTIBUY.test(sign) || PRICE_FROM.test(sign) || NOT_YET.test(sign) || (from && from.getTime() > now)) continue;

        const strike = cents(current.strikePrice?.strikePriceValue);
        const shelf = strike !== null && strike > shown ? strike : shown;
        const offerCents = shelf !== shown ? shown : null;

        const packText = text(hit.salesUnit);
        // "Per stuk." and "0.75 l.": a sign's full stop is not part of the unit.
        const pack = parsePackSize(packText?.replace(/\.$/, ""));
        const chain = basePrice(current);
        let unitPriceCents: number | null = null;
        let comparisonUnit: ComparisonUnit | null = null;
        let unitPriceSource: PriceReading["unitPriceSource"] = null;
        if (chain) {
          [unitPriceCents, comparisonUnit, unitPriceSource] = [chain.cents, chain.unit, "chain"];
        } else if (pack) {
          [unitPriceCents, comparisonUnit, unitPriceSource] = [deriveUnitPrice(shown, pack), pack.unit, "derived"];
        }
        if (unitPriceCents === null) withoutUnitPrice++;

        prices.push({
          chainProductRef: ref,
          name,
          brand: text(hit.brandName),
          packText,
          pack,
          // Sold "Per kg": weighed at the till, at this price a kilo.
          isWeightProduct: /^per (kg|kilo)$/i.test(packText ?? ""),
          eans: [], // Aldi publishes none.
          categories: categoryPaths(hit.hierarchicalCategories),
          storeRef: null, // National: nothing on the site chooses a Store.
          observedAt,
          shelfPriceCents: shelf,
          offerPriceCents: offerCents,
          unitPriceCents,
          comparisonUnit,
          unitPriceSource,
        });
      }
    }

    return { prices, offers, productsSeen, withoutUnitPrice, parseFailures };
  },
};
