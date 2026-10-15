import { readStep } from "../archive.ts";
import { parseInstant, parsePackSize } from "../normalise.ts";
import { unitPriceOf } from "../unit-price.ts";
import type { ChainReader, ChainReading, OfferReading, PriceReading } from "./types.ts";

/**
 * Lidl: its Offers page, the only place Lidl prices food online (#28). See
 * `src/archive/chains/lidl.ts`.
 *
 * Every product on the page carries its data as JSON in a `data-grid-data`
 * attribute. Three kinds of product, each read for what Lidl states:
 *
 *   - reduced: a price and the price it was. The Shelf Price is the "was"
 *     price, the Offer price the reduced one.
 *   - on the page at its price, with nothing struck through (a week's bakery
 *     or a themed range). That is a Shelf Price, and no Offer.
 *   - reduced with the Lidl Plus app: a Lidl Plus price and the price it
 *     was. The Shelf Price is the "was" price and the Offer price the Lidl
 *     Plus one. The owner chose on 2026-10-14 to count every Chain's card and
 *     app prices as if the shopper held them; the page says so, and the
 *     Offer's wording names the app.
 *
 * So Lidl's catalogue here is a hundred-odd Products a week, not its
 * assortment: Lidl publishes no other prices. No EANs: `ians` are Lidl's own
 * article numbers.
 */

interface Price {
  price?: unknown;
  oldPrice?: unknown;
  packaging?: { text?: unknown } | null;
  basePrice?: { text?: unknown } | null;
  discount?: { percentageDiscount?: unknown; showDiscount?: unknown; bargainHintText?: unknown } | null;
  endDate?: unknown;
}

interface LidlItem {
  erpNumber?: unknown;
  title?: unknown;
  fullTitle?: unknown;
  brand?: { name?: unknown } | null;
  keyfacts?: { wonCategoryPrimary?: unknown; wonCategoryPrimaryPath?: unknown; description?: unknown } | null;
  regionsPrices?: Record<string, {
    currentPrice?: Price | null;
    currentLidlPlusPrice?: { price?: Price | null; lidlPlusText?: unknown; highlightText?: unknown } | null;
  }> | null;
  storeStartDate?: unknown;
  storeEndDate?: unknown;
  /** Sold in Stores, and sold in Lidl's webshop. Every food Offer seen is in Stores only. */
  store?: unknown;
  online?: unknown;
  // Images, banners and badges are on every product and deliberately not read (ADR-0003).
}

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim().replace(/\s+/g, " ") : null;

/** 1.19 to 119. Lidl sends prices as numbers. */
const cents = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value * 100) : null;

/** Lidl states a price to the cent ("1.29"); written back the same way. */
const euros = (c: number) => (c / 100).toFixed(2);

/** An attribute value as the page escaped it, decoded. */
function unescapeAttribute(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|quot|amp|apos|lt|gt);/gi, (_, e: string) => {
    const k = e.toLowerCase();
    if (k.startsWith("#x")) return String.fromCodePoint(parseInt(k.slice(2), 16));
    if (k.startsWith("#")) return String.fromCodePoint(Number(k.slice(1)));
    return ({ quot: '"', amp: "&", apos: "'", lt: "<", gt: ">" } as Record<string, string>)[k]!;
  });
}

/** Every product's data on one archived page, and how many attributes could not be read. */
export function itemsOf(html: string): { items: LidlItem[]; unreadable: number } {
  const items: LidlItem[] = [];
  let unreadable = 0;
  for (const m of html.matchAll(/data-grid-data="([^"]*)"/g)) {
    try {
      items.push(JSON.parse(unescapeAttribute(m[1]!)) as LidlItem);
    } catch {
      unreadable++;
    }
  }
  return { items, unreadable };
}

/** A Unix time in seconds, as Lidl states an Offer's first and last moment in store. */
function instant(value: unknown): Date | null {
  return typeof value === "number" && value > 0 ? new Date(value * 1000) : null;
}

/**
 * Lidl's category path, without the root every product shares ("Werelden van
 * nood"). Split on the numeric path beside it, so a name with a slash in it
 * cannot add a level.
 */
function categoryOf(item: LidlItem): string[] {
  const names = text(item.keyfacts?.wonCategoryPrimary)?.split("/") ?? [];
  const ids = text(item.keyfacts?.wonCategoryPrimaryPath)?.split("/") ?? [];
  if (!names.length || names.length !== ids.length) return [];
  const path = names.slice(1).map((n) => n.trim()).filter(Boolean);
  return path.length ? [path.join(" > ")] : [];
}

/**
 * The pack, where the price does not state it: Lidl's key facts list it as
 * a bullet of its own ("<li>355 g</li>", "<li>3 x 35 g</li>"). Only a bullet
 * that is a quantity and nothing else is read; the rest of the key facts
 * describe the product and are never read or stored (ADR-0003).
 */
export function packBulletOf(description: unknown): string | null {
  const html = text(description);
  if (!html) return null;
  for (const m of html.matchAll(/<li>([^<]{1,30})<\/li>/gi)) {
    const bullet = text(m[1]);
    if (bullet && /^\d/.test(bullet) && parsePackSize(bullet)) return bullet;
  }
  return null;
}

export const lidlReader: ChainReader = {
  chainId: "lidl",

  async read(archiveRoot: string, date: string): Promise<ChainReading> {
    const prices: PriceReading[] = [];
    const offers: (OfferReading & { productRefs: string[] })[] = [];
    const parseFailures: string[] = [];
    const seenRefs = new Set<string>();
    let productsSeen = 0;
    let withoutUnitPrice = 0;

    for await (const record of readStep(archiveRoot, date, "lidl", "offers")) {
      const { items, unreadable } = itemsOf(record.body);
      if (unreadable) parseFailures.push(`${record.label}: ${unreadable} product attribute(s) not JSON`);
      if (!items.length) {
        parseFailures.push(`${record.label}: no products on the page`);
        continue;
      }
      const observedAt = parseInstant(record.at) ?? new Date(`${date}T00:00:00Z`);

      for (const item of items) {
        productsSeen++;
        const ref = text(item.erpNumber);
        const name = text(item.fullTitle) ?? text(item.title);
        if (!ref || !name) {
          parseFailures.push(`lidl product ${ref ?? "?"}: missing number or name`);
          continue;
        }
        if (seenRefs.has(ref)) continue;
        seenRefs.add(ref);
        // Only what a Store sells is compared (the owner, 2026-10-14). A
        // product not yet in Stores says store: false too, so only one Lidl
        // sells online and not in Stores is passed over.
        if (item.online === true && item.store !== true) continue;

        // One price list for every region (regionsV2 names region 1's for all six).
        const region = Object.values(item.regionsPrices ?? {})[0];
        const current = region?.currentPrice ?? null;
        const lidlPlus = region?.currentLidlPlusPrice ?? null;
        const startsAt = instant(item.storeStartDate);
        let endsAt = instant(item.storeEndDate);
        const isUpcoming = startsAt !== null && startsAt.getTime() > observedAt.getTime();

        // What Lidl states, in order of precedence: a price for everyone,
        // else a Lidl Plus price. Each with the price it was, if reduced.
        const now = cents(current?.price), was = cents(current?.oldPrice);
        const plus = cents(lidlPlus?.price?.price), plusWas = cents(lidlPlus?.price?.oldPrice);
        const stated: Price | null = now !== null ? current : plus !== null ? lidlPlus!.price! : null;
        endsAt ??= parseInstant(stated?.endDate);

        let shelf: number | null = null;
        let offerCents: number | null = null;
        let wording: string | null = null;
        if (now !== null && was !== null && was > now) {
          shelf = was;
          offerCents = now;
          const pct = current?.discount?.showDiscount !== false ? current?.discount?.percentageDiscount : null;
          wording = [typeof pct === "number" && pct > 0 ? `-${pct}%` : null, text(current?.discount?.bargainHintText)]
            .filter(Boolean).join(" · ") || "aanbieding";
        } else if (now !== null) {
          shelf = now;
        }
        // With the app, cheaper still (or only then reduced): counted as paid.
        // Where the price for everyone is already lower, that one stands.
        if (plus !== null && plus < (offerCents ?? now ?? Infinity)) {
          shelf ??= plusWas !== null && plusWas > plus ? plusWas : null;
          offerCents = shelf !== null && plus < shelf ? plus : null;
          wording = [text(lidlPlus?.highlightText), `${euros(plus)} ${text(lidlPlus?.lidlPlusText) ?? "met Lidl Plus"}`]
            .filter(Boolean).join(" · ");
        }

        // Not in store yet. The price it was is today's price; the reduced
        // one is not paid until the Offer starts, so it stays in the wording
        // (ADR-0002). A product stated at one price, reduced from nothing,
        // is not sold until then at all.
        if (isUpcoming && offerCents !== null) {
          if (!wording?.includes(euros(offerCents))) wording = `${euros(offerCents)} · ${wording}`;
          offerCents = null;
        } else if (isUpcoming && now !== null && was === null) {
          wording = euros(now);
          shelf = null;
        }

        if (shelf !== null) {
          const packText = text(stated?.packaging?.text) ?? packBulletOf(item.keyfacts?.description);
          const pack = parsePackSize(packText) ?? parsePackSize(text(stated?.basePrice?.text));
          if (!pack) withoutUnitPrice++;
          const paid = offerCents ?? shelf;
          const brand = text(item.brand?.name);
          prices.push({
            chainProductRef: ref,
            name,
            brand: brand && brand !== "-" ? brand : null,
            packText,
            pack,
            isWeightProduct: /^per (kg|kilo)$/i.test(packText ?? ""),
            eans: [], // `ians` are Lidl's article numbers, not EANs.
            categories: categoryOf(item),
            storeRef: null, // National: one price list for every region.
            observedAt,
            shelfPriceCents: shelf,
            offerPriceCents: offerCents,
            ...unitPriceOf(paid, pack, null),
          });
        }

        if (wording) {
          offers.push({
            // The page carries no promotion id: one Offer per product and run.
            chainOfferRef: `${ref}|${startsAt?.toISOString() ?? ""}`,
            storeRef: null,
            // Named here because an Offer can outlive the price it was read with.
            headline: name,
            wording,
            startsAt,
            endsAt,
            isUpcoming,
            observedAt,
            productRefs: [ref],
          });
        }
      }
    }

    return { prices, offers, productsSeen, withoutUnitPrice, parseFailures };
  },
};
