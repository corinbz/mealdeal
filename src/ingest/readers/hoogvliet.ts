import { readStep, jsonOf } from "../archive.ts";
import { parseInstant, parsePackSize, type ComparisonUnit } from "../normalise.ts";
import { isApproximate, unitPriceOf } from "../unit-price.ts";
import { amsterdamDay } from "./plus.ts";
import type { ChainReader, ChainReading, OfferReading, PriceReading } from "./types.ts";

/**
 * Hoogvliet (#29): Magento's GraphQL behind hoogvliet.nl, asked for every sku
 * in the catalogue sitemap. See `src/archive/chains/hoogvliet.ts`.
 *
 * National prices. EANs. A pack in two fields (`inhoud_ce` "500", `eenheid`
 * "Gram"), read together. Hoogvliet's own Unit Price is computed on the
 * Shelf Price, so it is stored only when no Offer price applies; under an
 * Offer price one is derived from the pack, at the price paid.
 *
 * Offers come two ways, and are one Offer when they name the same one:
 *
 *   - on a Product, while it runs: its wording, dates and `promotion_id`.
 *     Where Hoogvliet reduces the Product's own price ("per stuk 1,89",
 *     "50% korting"), the final price is the Offer price. Where it does not
 *     ("2 voor 6,99", "1 + 1 Gratis") the final price is the Shelf Price and
 *     the deal stays in the wording (ADR-0002).
 *   - as a GroupedProduct, a tile in the weekly folder, whose sku is the
 *     `promotion_id` its Products name: the folder's headline, wording and
 *     dates, published weeks ahead. A tile names no Products, so an upcoming
 *     one is recorded with none until its week begins.
 *
 * A Product Hoogvliet marks online only is not read at all: only what a
 * Store sells is compared (the owner, 2026-10-14).
 */

interface Price { value?: unknown }
interface Promotion {
  korting_label?: unknown;
  raw_discount_label?: { text?: unknown; price?: unknown; full_label?: unknown } | null;
  valid_from?: unknown;
  valid_to?: unknown;
  promotion_id?: unknown;
  promotie_prijs?: unknown;
}
interface Field { value?: unknown }
interface HoogvlietItem {
  __typename?: unknown;
  sku?: unknown;
  name?: unknown;
  is_promotion?: unknown;
  catch_weight_item_code?: unknown;
  categories?: { name?: unknown; level?: unknown; url_path?: unknown }[] | null;
  promotion_meta_data?: Promotion | null;
  price_range?: { minimum_price?: { regular_price?: Price | null; final_price?: Price | null } | null } | null;
  ean?: Field | null;
  merk?: Field | null;
  eenheid?: Field | null;
  inhoud_ce?: Field | null;
  volume_eenheid?: Field | null;
  prijs_per_volume_eenheid?: Field | null;
  productkenmerken_online_only?: Field | null;
}

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim().replace(/\s+/g, " ") : null;

/** 2.29 to 229; Hoogvliet sends numbers, or strings such as ".0900". */
function cents(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" && /^\d*\.?\d+$/.test(value.trim()) ? Number(value) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

/** "1,89", as Hoogvliet writes a price in its own wording. */
const euros = (c: number) => (c / 100).toFixed(2).replace(".", ",");

/**
 * An Offer's first or last moment. Hoogvliet writes it two ways: an instant
 * with its offset ("2026-10-13T20:00:00+00:00"), or an Amsterdam wall-clock
 * time with none ("2026-10-21 00:00:00.000"), read as that whole day.
 */
export function offerInstant(value: unknown, end = false): Date | null {
  const s = text(value);
  if (!s) return null;
  const local = s.match(/^(\d{4}-\d{2}-\d{2}) \d{2}:\d{2}/);
  return local ? amsterdamDay(local[1], end) : parseInstant(s);
}

/** "Prijs per kilo" to kg; a Unit Price per roll or pack is left unmapped. */
function unitOf(value: unknown): ComparisonUnit | null {
  const s = text(value)?.toLowerCase();
  if (s === "prijs per kilo") return "kg";
  if (s === "prijs per liter") return "l";
  if (s === "prijs per stuk") return "piece";
  return null;
}

/** Seasonal and themed shelves, which file a Product by occasion, not by what it is. */
const SEASONAL = /^(feestdagen|themashops|alles voor de barbecue)\b/i;

/**
 * Each place Hoogvliet files a Product, as a path of names. Its categories
 * arrive flat, every level of every path; a path is each one no other
 * extends. The weekly "Aanbiedingen" listing is left out: it files a
 * Product by this week's Offer, not by what it is. So are seasonal shelves
 * ("Feestdagen > 2. Borrel"), unless a Product sits on no other.
 */
export function categoryPaths(categories: HoogvlietItem["categories"]): string[] {
  const byPath = new Map<string, string>();
  for (const c of categories ?? []) {
    const path = text(c.url_path), name = text(c.name);
    if (path && name) byPath.set(path, name);
  }
  const leaves = [...byPath.keys()].filter((p) => ![...byPath.keys()].some((q) => q.startsWith(`${p}/`)));
  const paths = leaves
    .filter((p) => !p.startsWith("aanbiedingen"))
    .map((leaf) => {
      const parts = leaf.split("/");
      return parts.map((_, i) => byPath.get(parts.slice(0, i + 1).join("/"))).filter(Boolean).join(" > ");
    })
    .filter(Boolean)
    .sort();
  const regular = paths.filter((p) => !SEASONAL.test(p));
  return regular.length ? regular : paths;
}

/** The deal as Hoogvliet words it, with its price where the label leaves it off ("per fles" at 3.49). */
function wordingOf(promotion: Promotion | null | undefined): string | null {
  const label = text(promotion?.raw_discount_label?.full_label) ?? text(promotion?.korting_label);
  if (!label) return null;
  if (/\d/.test(label)) return label;
  const price = cents(promotion?.raw_discount_label?.price) ?? cents(promotion?.promotie_prijs);
  return price !== null ? `${label} ${euros(price)}` : label;
}

export const hoogvlietReader: ChainReader = {
  chainId: "hoogvliet",

  async read(archiveRoot: string, date: string): Promise<ChainReading> {
    const prices: PriceReading[] = [];
    const offers = new Map<string, OfferReading & { productRefs: string[] }>();
    const tiles: { item: HoogvlietItem; observedAt: Date }[] = [];
    const parseFailures: string[] = [];
    const seenRefs = new Set<string>();
    let productsSeen = 0;
    let withoutUnitPrice = 0;

    const offerFor = (key: string, promotion: Promotion | null | undefined, observedAt: Date, headline: string | null) => {
      const known = offers.get(key);
      if (known) return known;
      const startsAt = offerInstant(promotion?.valid_from);
      const offer = {
        chainOfferRef: key,
        storeRef: null,
        headline,
        // Verbatim, never parsed (ADR-0002).
        wording: wordingOf(promotion),
        startsAt,
        endsAt: offerInstant(promotion?.valid_to, true),
        isUpcoming: startsAt !== null && startsAt.getTime() > observedAt.getTime(),
        observedAt,
        productRefs: [] as string[],
      };
      offers.set(key, offer);
      return offer;
    };

    for await (const record of readStep(archiveRoot, date, "hoogvliet", "products")) {
      const answer = jsonOf(record) as { data?: { products?: { items?: HoogvlietItem[] } | null } } | null;
      const items = answer?.data?.products?.items;
      if (!Array.isArray(items)) {
        parseFailures.push(`${record.label}: unusable response body`);
        continue;
      }
      const observedAt = parseInstant(record.at) ?? new Date(`${date}T00:00:00Z`);

      for (const item of items) {
        if (item.__typename === "GroupedProduct") {
          tiles.push({ item, observedAt });
          continue;
        }
        productsSeen++;
        const ref = text(item.sku);
        const name = text(item.name);
        const prices_ = item.price_range?.minimum_price;
        const shelf = cents(prices_?.regular_price?.value);
        if (!ref || !name || shelf === null) {
          parseFailures.push(`hoogvliet product ${ref ?? "?"}: missing name or price`);
          continue;
        }
        if (seenRefs.has(ref)) continue;
        seenRefs.add(ref);
        if (text(item.productkenmerken_online_only?.value) === "1") continue;

        const promotion = item.is_promotion === true ? item.promotion_meta_data : null;
        const final = cents(prices_?.final_price?.value);
        const offerCents = promotion && final !== null && final < shelf ? final : null;

        // "500" and "Gram"; ".5" is half, so the number is written out first.
        const amount = Number(text(item.inhoud_ce?.value) ?? NaN);
        const unitWord = text(item.eenheid?.value);
        const packText = Number.isFinite(amount) && amount > 0 && unitWord ? `${amount} ${unitWord}` : null;
        const pack = parsePackSize(packText);

        const chainUnit = unitOf(item.volume_eenheid?.value);
        const chainCents = cents(item.prijs_per_volume_eenheid?.value);
        // Hoogvliet's own figure is on the Shelf Price, so an Offer price paid scales it (src/ingest/unit-price.ts).
        const { unitPriceCents, comparisonUnit, unitPriceSource } = unitPriceOf(offerCents ?? shelf, pack,
          chainCents !== null && chainUnit ? { cents: chainCents, unit: chainUnit, ofCents: shelf } : null, { approximate: isApproximate(packText) });
        if (unitPriceCents === null) withoutUnitPrice++;

        const ean = text(item.ean?.value);
        prices.push({
          chainProductRef: ref,
          name,
          brand: text(item.merk?.value),
          packText,
          pack,
          // Catch weight 2: packed by weight and priced per kilo, a slice of
          // ham at whatever this pack weighs (packaging "Kilogram"). A "1
          // Kilo" bag of chips is not one.
          isWeightProduct: text(item.catch_weight_item_code) === "2",
          eans: ean && /^(\d{8}|\d{12,14})$/.test(ean) ? [ean] : [],
          categories: categoryPaths(item.categories),
          storeRef: null, // National: no request names a Store.
          observedAt,
          shelfPriceCents: shelf,
          offerPriceCents: offerCents,
          unitPriceCents,
          comparisonUnit,
          unitPriceSource,
        });

        if (promotion && wordingOf(promotion)) {
          const id = text(promotion.promotion_id);
          const key = id ?? [wordingOf(promotion), text(promotion.valid_from), text(promotion.valid_to)].join("|");
          offerFor(key, promotion, observedAt, null).productRefs.push(ref);
        }
      }
    }

    // The folder's tiles: a running Offer's headline, and the weeks ahead.
    for (const { item, observedAt } of tiles) {
      const ref = text(item.sku);
      const promotion = item.promotion_meta_data;
      const endsAt = offerInstant(promotion?.valid_to, true);
      if (!ref || !wordingOf(promotion) || (endsAt && endsAt.getTime() < observedAt.getTime())) continue;
      const offer = offerFor(ref, promotion, observedAt, text(item.name));
      if (!offer.headline) offers.set(ref, { ...offer, headline: text(item.name) });
    }

    return { prices, offers: [...offers.values()], productsSeen, withoutUnitPrice, parseFailures };
  },
};
