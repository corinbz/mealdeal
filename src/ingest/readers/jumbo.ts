import { readStep, payloadOf } from "../archive.ts";
import {
  centsFrom,
  deriveUnitPrice,
  parseInstant,
  parsePackSize,
  type ComparisonUnit,
  type PackSize,
} from "../normalise.ts";
import type { ChainReader, ChainReading, OfferReading, PriceReading } from "./types.ts";

/**
 * Jumbo.
 *
 * The opposite data-quality case to Dirk: Jumbo publishes an EAN and a
 * pre-computed Unit Price, and its prices are national rather than per-Store.
 * Where Jumbo computes a Unit Price per kg or litre we store theirs, because
 * that figure is what the Chain legally represents at the shelf. One rule
 * outranks that: compare by weight whenever a weight is known (issue #3). So a
 * Product Jumbo prices per piece but whose title states a weight is compared
 * on a weight price we derive, marked as ours; see unitPriceFor.
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
  promotions?: { tags?: { text?: unknown }[] | null }[] | null;
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
 * Delivery perks: "Gratis bezorging", "€ 1,50 bezorgkorting". Terms for
 * online delivery, not a reduction on any Product's price, so not Offers
 * (issue #5). Their conditions ("Vanaf € 12,00", "Bij elke 2 stuks") arrive
 * as separate tags and are only ever seen alongside a perk.
 */
const isDeliveryPerk = (tag: string) => /bezorg/i.test(tag);
const isPerkCondition = (tag: string) => /^(vanaf\s*€|bij\s+(elke?\s+)?(\d+\s+)?stuks?$)/i.test(tag);
/** Tag text can carry zero-width spaces ("Gratis bezorging\u200b"). */
const tagText = (value: unknown) => text(typeof value === "string" ? value.replace(/[\u200b-\u200d\ufeff]/g, "") : value);

/**
 * "Alleen online", "Alleen online - OP=OP": an Offer only for online orders.
 * The owner compares what a shopper pays in a Store (2026-10-14), so these
 * are neither Offers nor a price paid. The archive still holds them.
 */
const isOnlineOnly = (tags: unknown) =>
  Array.isArray(tags) && tags.some((t: { text?: unknown }) => /^alleen online\b/i.test(tagText(t?.text) ?? ""));

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

/**
 * Which Unit Price a Jumbo Product is compared on: by weight or volume
 * whenever one is known, by the piece only when none is (the owner's rule,
 * issue #3). In order:
 *
 *   1. Jumbo's own figure, when it is per kg or per litre.
 *   2. One derived from the pack, when the title states a weight or volume.
 *      Jumbo prices "Tortilla Wraps 8 Stuks 320 g" per piece; by weight it
 *      compares with every other wrap sold by the gram.
 *   3. Jumbo's own per-piece figure.
 *   4. One derived per piece from a count in the title.
 *
 * Derived figures use the price paid, the Offer price when there is one, as
 * Jumbo's own do, and are marked as ours.
 */
function unitPriceFor(
  chainCents: number | null,
  chainUnit: ComparisonUnit | null,
  pack: PackSize | null,
  paidCents: number,
): Pick<PriceReading, "unitPriceCents" | "comparisonUnit" | "unitPriceSource"> {
  const byMeasure = (u: ComparisonUnit | null | undefined) => u === "kg" || u === "l";
  if (chainCents !== null && byMeasure(chainUnit)) {
    return { unitPriceCents: chainCents, comparisonUnit: chainUnit, unitPriceSource: "chain" };
  }
  if (pack && byMeasure(pack.unit)) {
    return { unitPriceCents: deriveUnitPrice(paidCents, pack), comparisonUnit: pack.unit, unitPriceSource: "derived" };
  }
  if (chainCents !== null) {
    // A figure whose unit Jumbo left out stays unmapped: guessing "piece"
    // would let a per-something price be compared with a per-piece one.
    return { unitPriceCents: chainCents, comparisonUnit: chainUnit, unitPriceSource: "chain" };
  }
  if (pack) {
    return { unitPriceCents: deriveUnitPrice(paidCents, pack), comparisonUnit: pack.unit, unitPriceSource: "derived" };
  }
  return { unitPriceCents: null, comparisonUnit: chainUnit, unitPriceSource: null };
}

export const jumboReader: ChainReader = {
  chainId: "jumbo",

  async read(archiveRoot: string, date: string): Promise<ChainReading> {
    const paths = await categoryPaths(archiveRoot, date);
    // Every category a Product was listed under, not just the first: a
    // Product sits in several, and the first one seen is an accident of order.
    const filedUnder = new Map<string, Set<string>>();
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
        const path = paths.get(record.label.replace(/^products\/cat-/, ""));
        if (path) (filedUnder.get(ref) ?? filedUnder.set(ref, new Set()).get(ref)!).add(path);
        // Categories overlap, so the same sku arrives more than once per run.
        // One observation per Product per run, not one per category it sits in.
        if (seenRefs.has(ref)) continue;
        seenRefs.add(ref);

        // A promo price whose every promotion is online only is not paid in
        // a Store. Jumbo's own Unit Price is computed on that price, so it
        // goes too and the Unit Price is derived from the Shelf Price. A
        // Product also on an in-store promotion keeps it: the in-store one
        // is the price Jumbo states.
        const promotions = Array.isArray(row.promotions) ? row.promotions : [];
        const onlineOnly = promotions.length > 0 && promotions.every((p) => isOnlineOnly(p?.tags));
        const promo = onlineOnly ? null : centsFrom(row.price?.promoPrice);
        const droppedPromo = onlineOnly && centsFrom(row.price?.promoPrice) !== null;
        const chainUnitCents = droppedPromo ? null : centsFrom(row.price?.pricePerUnit?.price);
        const chainUnit = comparisonUnit(row.price?.pricePerUnit?.unit);
        // Jumbo exposes no separate pack field in the selection set we
        // archive, so the pack wording available to us is the title itself.
        // Kept verbatim rather than re-written into a tidier form.
        const pack = parsePackSize(name);
        const unit = unitPriceFor(chainUnitCents, chainUnit, pack, promo ?? shelf);
        if (unit.unitPriceCents === null) withoutUnitPrice++;

        const ean = text(row.ean);
        prices.push({
          chainProductRef: ref,
          name,
          brand: null, // Not in the archived selection set.
          packText: name,
          pack,
          isWeightProduct: false,
          eans: ean ? [ean] : [],
          categories: [], // Filled in below, once every category is read.
          storeRef: null, // Jumbo's public endpoint publishes national prices.
          observedAt: parseInstant(record.at) ?? new Date(`${date}T00:00:00Z`),
          shelfPriceCents: shelf,
          offerPriceCents: promo,
          ...unit,
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
        const sent = Array.isArray(raw.tags)
          ? (raw.tags as { text?: unknown }[])
              .map((t) => tagText(t.text))
              .filter((t): t is string => t !== null)
              .filter((t) => title === null || !sameWords(t, title))
          : [];
        // A delivery perk and its conditions are dropped. A promotion that was
        // nothing but a perk is not an Offer and is not recorded at all; the
        // archive still holds it verbatim.
        const perk = sent.some(isDeliveryPerk);
        const tags = perk ? sent.filter((t) => !isDeliveryPerk(t) && !isPerkCondition(t)) : sent;
        if (perk && tags.length === 0) continue;
        // Online orders only: not an Offer in any Store.
        if (isOnlineOnly(raw.tags)) continue;

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

    return {
      prices: prices.map((p) => ({ ...p, categories: [...(filedUnder.get(p.chainProductRef) ?? [])].sort() })),
      offers, productsSeen, withoutUnitPrice, parseFailures,
    };
  },
};

/**
 * Category id to its path of names, from the archived category tree. Its
 * names sometimes carry trailing spaces ("Lactosevrije melk "); they are
 * trimmed, since two spellings of one category would be two categories.
 */
async function categoryPaths(archiveRoot: string, date: string): Promise<Map<string, string>> {
  interface Node { id?: unknown; name?: unknown; children?: Node[] | null }
  const paths = new Map<string, string>();
  const walk = (nodes: Node[] | null | undefined, prefix: string[]) => {
    for (const node of nodes ?? []) {
      const id = text(node.id), name = text(node.name);
      if (!id || !name) continue;
      const path = [...prefix, name];
      paths.set(id, path.join(" > "));
      walk(node.children, path);
    }
  };
  for await (const record of readStep(archiveRoot, date, "jumbo", "categories")) {
    walk(payloadOf(record)?.categoriesTree as Node[] | undefined, []);
  }
  return paths;
}
