import { readStep, payloadOf } from "../archive.ts";
import {
  endDateOrOpenEnded,
  eurosToCents,
  parseInstant,
  parsePackSize,
} from "../normalise.ts";
import { unitPriceOf } from "../unit-price.ts";
import type { ChainReader, ChainReading, OfferReading, PriceReading } from "./types.ts";

/**
 * Dirk van den Broek, and DekaMarkt: two Chains of Detailresult Groep whose
 * sites ask the same gateway software (`src/archive/chains/detailresult.ts`),
 * so one reader serves both.
 *
 * Neither publishes an EAN or a Unit Price, so every comparison figure on
 * this side is derived from free-text pack wording. Dirk's prices are
 * genuinely per-Store, so each of its readings carries the Store it was
 * fetched for. DekaMarkt's are national, read at the site's default Store
 * 283, which is no shop; its readings name none.
 *
 * Two sentinel values are translated here and never reach the store:
 *   * An offer price of 0 means "no Offer", not "free".
 *   * An end date in 2049 means "open-ended", not a twenty-year promotion.
 * No other Chain's code knows these exist.
 */

interface AssortmentRow {
  productId?: unknown;
  productNumber?: unknown;
  storeId?: unknown;
  normalPrice?: unknown;
  offerPrice?: unknown;
  priceDate?: unknown;
  productInformation?: {
    brand?: unknown;
    headerText?: unknown;
    subText?: unknown;
    packaging?: unknown;
    isWeightProduct?: unknown;
    department?: unknown;
    webgroup?: unknown;
  } | null;
}

/** Dirk names the department and web group on the Product itself. */
function categoryOf(info: NonNullable<AssortmentRow["productInformation"]>): string[] {
  const department = text(info.department), webgroup = text(info.webgroup);
  return department && webgroup ? [`${department} > ${webgroup}`] : [];
}

interface OfferRow {
  offerId?: unknown;
  storeId?: unknown;
  headerText?: unknown;
  subText?: unknown;
  promotionText?: unknown;
  textPriceSign?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  embargoDate?: unknown;
  priceDate?: unknown;
  productIds?: unknown;
}

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

/**
 * `ACTIE` is simply Dutch for "promotion" — a template marker on Dirk's price
 * sign, carrying nothing the normal/offer price pair does not already say.
 * It is a sentinel in the same class as an offer price of 0, and treating it
 * as advertised wording put the literal string "ACTIE_" on screen as though
 * it were the deal.
 */
const GENERIC_PROMOTION_MARKER = /^actie$/i;

/**
 * The Offer's advertised wording, or null when the Chain published none.
 *
 * Dirk sends no `promotionText` at all — 0 of 264 Offers in the swept day —
 * so for Dirk this is usually null, and an Offer's meaning comes from its
 * price pair rather than from words. The price sign is still worth reading,
 * because a minority of it is real: `VR, ZA & ZO` ("Fri, Sat & Sun") is a day
 * restriction a shopper needs. So the sign is kept when it says something and
 * dropped when it is only the generic marker.
 *
 * Nothing here composes or interprets (ADR-0002): a kept sign is the Chain's
 * own string, whitespace-normalised and otherwise untouched.
 */
function advertisedWording(raw: OfferRow): string | null {
  const promotion = text(raw.promotionText);
  if (promotion) return promotion;

  const sign = text(raw.textPriceSign)?.replace(/[\s_]+/g, " ").trim();
  if (!sign || GENERIC_PROMOTION_MARKER.test(sign)) return null;
  return sign;
}

export interface DetailresultReaderOptions {
  chainId: string;
  /** Prices and Offers are the same at every Store, so none is recorded. */
  national: boolean;
}

export function detailresultReader({ chainId, national }: DetailresultReaderOptions): ChainReader {
  const storeOf = (value: unknown): string | null =>
    !national && typeof value === "number" ? String(value) : null;

  return {
    chainId,

    async read(archiveRoot: string, date: string): Promise<ChainReading> {
      const prices: PriceReading[] = [];
      const offers: OfferReading[] = [];
      const parseFailures: string[] = [];
      // A Product can sit in more than one web group, so the same Product at the
      // same Store arrives several times in one run. That is catalogue
      // structure, not two observations.
      const seen = new Set<string>();
      let productsSeen = 0;
      let withoutUnitPrice = 0;

      for await (const record of readStep(archiveRoot, date, chainId, "products")) {
        const data = payloadOf(record);
        if (!data) {
          parseFailures.push(`${record.label}: unusable response body`);
          continue;
        }
        const rows = data.productsAssortment;
        // The web-group listing step archives only ids; it is not an error.
        if (!Array.isArray(rows)) continue;

        for (const row of rows as (AssortmentRow | null)[]) {
          productsSeen++;
          // A null row is a real observation: this Store does not carry this
          // Product today. There is nothing to price, so nothing is recorded.
          if (!row) continue;

          const ref = typeof row.productId === "number" ? String(row.productId) : null;
          const shelf = eurosToCents(row.normalPrice);
          const info = row.productInformation ?? {};
          const name = text(info.headerText);
          if (!ref || shelf === null || shelf <= 0 || !name) {
            parseFailures.push(`${chainId} product ${ref ?? "?"}: missing name or price`);
            continue;
          }

          const storeRef = storeOf(row.storeId);
          const key = `${ref}@${storeRef ?? "chain"}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const rawOffer = eurosToCents(row.offerPrice);
          const packText = text(info.packaging);
          // Dirk really does state the weight only in the name sometimes --
          // "Snoeptomaatjes 500 gram" packaged as "Per schaal" -- and ignoring
          // that discards a comparable Product for no reason.
          const pack = parsePackSize(packText) ?? parsePackSize(name);
          if (!pack) withoutUnitPrice++;

          const offerCents = rawOffer !== null && rawOffer > 0 ? rawOffer : null;
          const effective = offerCents ?? shelf;

          prices.push({
            chainProductRef: ref,
            name,
            brand: text(info.brand),
            packText,
            pack,
            isWeightProduct: info.isWeightProduct === true,
            eans: [], // The gateway's schema has no EAN field at all.
            categories: categoryOf(info),
            storeRef,
            observedAt: parseInstant(row.priceDate) ?? new Date(`${date}T00:00:00Z`),
            shelfPriceCents: shelf,
            offerPriceCents: offerCents,
            ...unitPriceOf(effective, pack, null),
          });
        }
      }

      for await (const record of readStep(archiveRoot, date, chainId, "offers")) {
        const data = payloadOf(record);
        if (!data) {
          parseFailures.push(`${record.label}: unusable response body`);
          continue;
        }
        const listOffers = data.listOffers as
          | { currentOffers?: unknown; upcomingOffers?: unknown }
          | null
          | undefined;
        if (!listOffers) continue;

        for (const [list, upcoming] of [
          [listOffers.currentOffers, false],
          [listOffers.upcomingOffers, true],
        ] as [unknown, boolean][]) {
          if (!Array.isArray(list)) continue;
          for (const raw of list as OfferRow[]) {
            const ref = typeof raw.offerId === "number" ? String(raw.offerId) : null;
            if (!ref) continue;
            offers.push({
              chainOfferRef: ref,
              storeRef: storeOf(raw.storeId),
              headline: text(raw.headerText),
              wording: advertisedWording(raw),
              startsAt: parseInstant(raw.startDate),
              endsAt: endDateOrOpenEnded(raw.endDate),
              isUpcoming: upcoming,
              observedAt: parseInstant(raw.priceDate) ?? new Date(`${date}T00:00:00Z`),
              productRefs: Array.isArray(raw.productIds)
                ? raw.productIds
                    .filter((v): v is number => typeof v === "number")
                    .map(String)
                : [],
            });
          }
        }
      }

      return { prices, offers, productsSeen, withoutUnitPrice, parseFailures };
    },
  };
}

export const dirkReader = detailresultReader({ chainId: "dirk", national: false });
export const dekamarktReader = detailresultReader({ chainId: "dekamarkt", national: true });
