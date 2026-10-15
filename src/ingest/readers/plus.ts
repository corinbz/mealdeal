import { readStep, jsonOf } from "../archive.ts";
import { parseInstant, parsePackSize } from "../normalise.ts";
import { unitPriceOf } from "../unit-price.ts";
import type { ChainReader, ChainReading, OfferReading, PriceReading } from "./types.ts";

/**
 * Plus.
 *
 * Read from the product-list screen service its own pages call; see
 * `src/archive/chains/plus.ts` for how it is reached. National Shelf
 * Prices, the running Offer on each Product with its wording, dates and,
 * where Plus states one, its price, and no EANs: the one call carrying them
 * also returns supplier text, and is not archived (#27, ADR-0003).
 *
 * Plus publishes no Unit Price in the list, so every one is derived from the
 * pack ("Per 500 g", "Per 4 st"), at the price paid, as for Dirk.
 */

interface PlusRow {
  SKU?: unknown;
  Brand?: unknown;
  Name?: unknown;
  Product_Subtitle?: unknown;
  OriginalPrice?: unknown;
  NewPrice?: unknown;
  Packging?: unknown;
  Categories?: { List?: { Name?: unknown }[] } | null;
  PromotionLabel?: unknown;
  PromotionBasedLabel?: unknown;
  PromotionStartDate?: unknown;
  PromotionEndDate?: unknown;
  IsFreeDeliveryOffer?: unknown;
  // ImageURL, Logos and Meta* are in every row and deliberately not read (ADR-0003).
}

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim().replace(/\s+/g, " ") : null;

/** "0.89" to 89. Plus sends prices as strings, and some unrounded ("0.8925"). */
function cents(value: unknown): number | null {
  const s = text(value);
  if (!s || !/^\d+(\.\d+)?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}

/**
 * Not Offers: terms for online delivery ("Gratis bezorging BIJ 10.00 EURO"),
 * which change no Product's price (as with Jumbo, issue #5).
 */
const isDeliveryPerk = (label: string) => /bezorg/i.test(label);

/** The instant an Amsterdam day begins, or the last moment of it. Plus states Offer days as bare dates. */
export function amsterdamDay(date: unknown, end = false): Date | null {
  const s = text(date);
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s) || s.startsWith("1900")) return null;
  const noonUtc = new Date(`${s}T12:00:00Z`);
  const offset = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Amsterdam", timeZoneName: "shortOffset" })
    .formatToParts(noonUtc).find((p) => p.type === "timeZoneName")?.value ?? "GMT+1";
  const [, sign, hours] = offset.match(/GMT([+-])(\d+)/) ?? ["", "+", "1"];
  const hh = String(hours).padStart(2, "0");
  return new Date(`${s}T${end ? "23:59:59" : "00:00:00"}${sign}${hh}:00`);
}

export const plusReader: ChainReader = {
  chainId: "plus",

  async read(archiveRoot: string, date: string): Promise<ChainReading> {
    const prices: PriceReading[] = [];
    const offers = new Map<string, OfferReading & { productRefs: string[] }>();
    const parseFailures: string[] = [];
    const seenRefs = new Set<string>();
    let productsSeen = 0;
    let withoutUnitPrice = 0;

    for await (const record of readStep(archiveRoot, date, "plus", "products")) {
      const answer = jsonOf(record) as { data?: { ProductList?: { List?: { PLP_Str?: PlusRow }[] } } } | null;
      const rows = answer?.data?.ProductList?.List;
      if (!Array.isArray(rows)) {
        parseFailures.push(`${record.label}: unusable response body`);
        continue;
      }
      const observedAt = parseInstant(record.at) ?? new Date(`${date}T00:00:00Z`);

      for (const { PLP_Str: row } of rows) {
        productsSeen++;
        if (!row) continue;
        const ref = text(row.SKU);
        const name = text(row.Name);
        const shelf = cents(row.OriginalPrice);
        if (!ref || !name || shelf === null || shelf <= 0) {
          parseFailures.push(`plus product ${ref ?? "?"}: missing name or price`);
          continue;
        }
        // Top-level categories do not overlap, but a Product can sit in a
        // seasonal one as well: one observation per Product per run.
        if (seenRefs.has(ref)) continue;
        seenRefs.add(ref);

        const packText = text(row.Product_Subtitle);
        const pack = parsePackSize(packText) ?? parsePackSize(name);
        if (!pack) withoutUnitPrice++;

        const label = text(row.PromotionLabel);
        const offer = label && !isDeliveryPerk(label) && row.IsFreeDeliveryOffer !== true ? label : null;
        // "0" and "0.0" mean no Offer price, not free: "1+1 GRATIS" has none.
        const newPrice = cents(row.NewPrice);
        const offerCents = offer && newPrice !== null && newPrice > 0 ? newPrice : null;
        const paid = offerCents ?? shelf;

        prices.push({
          chainProductRef: ref,
          name,
          brand: text(row.Brand),
          packText,
          pack,
          // Sold by the kilo: loose produce, priced for the stated weight.
          isWeightProduct: text(row.Packging)?.toLowerCase() === "kg",
          eans: [], // Not archived: see above.
          categories: (() => {
            const path = (row.Categories?.List ?? []).map((c) => text(c.Name)).filter((n): n is string => !!n);
            return path.length ? [path.join(" > ")] : [];
          })(),
          storeRef: null, // National: a Store number changed no price sampled.
          observedAt,
          shelfPriceCents: shelf,
          offerPriceCents: offerCents,
          ...unitPriceOf(paid, pack, null),
        });

        if (offer) {
          // The list carries no promotion id. Products sharing wording and
          // days are recorded as one Offer, which is all the list can say.
          const startsAt = amsterdamDay(row.PromotionStartDate);
          const endsAt = amsterdamDay(row.PromotionEndDate, true);
          const key = [offer, text(row.PromotionStartDate), text(row.PromotionEndDate)].join("|");
          const known = offers.get(key);
          if (known) known.productRefs.push(ref);
          else offers.set(key, {
            chainOfferRef: key,
            storeRef: null,
            headline: null,
            // Verbatim, never parsed (ADR-0002): "3 VOOR 5.00" is a price
            // only when you buy three.
            wording: [offer, text(row.PromotionBasedLabel)].filter(Boolean).join(" · "),
            startsAt,
            endsAt,
            isUpcoming: startsAt !== null && startsAt.getTime() > observedAt.getTime(),
            observedAt,
            productRefs: [ref],
          });
        }
      }
    }

    return { prices, offers: [...offers.values()], productsSeen, withoutUnitPrice, parseFailures };
  },
};
