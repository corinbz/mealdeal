/**
 * Builds the dataset behind the UI prototype out of the real archive.
 *
 * Dirk's side is genuine: product names, packaging text, Shelf Prices and
 * Offers exactly as archived for one Store on one day. Jumbo's side is
 * simulated, because Jumbo's endpoint is not currently archivable -- the
 * prototype needs two Chains to compare and only one of them can be real.
 *
 * Every simulated figure is marked as such in the output and labelled in the
 * UI. A comparison screen full of invented prices that looks real is worse
 * than useless; it is the thing that gets believed.
 *
 *   node scripts/ui-fixture.ts --archive archive --date 2026-10-13 > prototype/fixture.json
 */

import { readFile, readdir } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";

interface DirkProduct {
  productId: number;
  brand: string | null;
  name: string;
  packaging: string | null;
  isWeightProduct: boolean;
  shelfPriceCents: number;
  offerPriceCents: number | null;
}

/** Dirk sends decimal euros; everything downstream works in integer cents. */
function toCents(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

async function* ndjson(path: string): AsyncGenerator<unknown> {
  const text = gunzipSync(await readFile(path)).toString("utf8");
  for (const line of text.split("\n")) {
    if (line.trim()) yield JSON.parse(line) as unknown;
  }
}

async function* walk(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (entry.name.endsWith(".ndjson.gz")) yield path;
  }
}

export async function readDirkProducts(
  archiveRoot: string,
  date: string,
): Promise<DirkProduct[]> {
  const byId = new Map<number, DirkProduct>();
  const base = join(archiveRoot, date, "dirk", "products");

  for await (const file of walk(base)) {
    for await (const record of ndjson(file)) {
      const { body } = record as { body: string };
      const payload = JSON.parse(body) as {
        data?: { productsAssortment?: (Record<string, unknown> | null)[] };
      };
      for (const row of payload.data?.productsAssortment ?? []) {
        if (!row) continue; // Store does not stock it -- a real observation.
        const info = (row.productInformation ?? {}) as Record<string, unknown>;
        const shelf = toCents(row.normalPrice);
        const offer = toCents(row.offerPrice);
        const name = typeof info.headerText === "string" ? info.headerText.trim() : "";
        const id = typeof row.productId === "number" ? row.productId : null;
        if (id === null || !name || shelf === null || shelf <= 0) continue;

        byId.set(id, {
          productId: id,
          brand: typeof info.brand === "string" ? info.brand : null,
          name,
          packaging: typeof info.packaging === "string" ? info.packaging : null,
          isWeightProduct: info.isWeightProduct === true,
          shelfPriceCents: shelf,
          // Dirk uses 0 to mean "no Offer", not "free".
          offerPriceCents: offer && offer > 0 ? offer : null,
        });
      }
    }
  }
  return [...byId.values()];
}

export interface Offer {
  headline: string;
  /** The Chain's own advertised wording. Never parsed into a percentage. */
  wording: string | null;
  startDate: string | null;
  endDate: string | null;
  productIds: number[];
  upcoming: boolean;
}

export async function readDirkOffers(
  archiveRoot: string,
  date: string,
): Promise<Offer[]> {
  const offers: Offer[] = [];
  const base = join(archiveRoot, date, "dirk", "offers");

  for await (const file of walk(base)) {
    for await (const record of ndjson(file)) {
      const { body } = record as { body: string };
      const payload = JSON.parse(body) as {
        data?: {
          listOffers?: {
            currentOffers?: Record<string, unknown>[];
            upcomingOffers?: Record<string, unknown>[];
          };
        };
      };
      const groups: [Record<string, unknown>[], boolean][] = [
        [payload.data?.listOffers?.currentOffers ?? [], false],
        [payload.data?.listOffers?.upcomingOffers ?? [], true],
      ];
      for (const [list, upcoming] of groups) {
        for (const raw of list) {
          const headline = typeof raw.headerText === "string" ? raw.headerText.trim() : "";
          if (!headline) continue;
          offers.push({
            headline,
            wording:
              [raw.promotionText, raw.textPriceSign, raw.subText]
                .find((v) => typeof v === "string" && v.trim()) as string | undefined ?? null,
            startDate: typeof raw.startDate === "string" ? raw.startDate : null,
            endDate: typeof raw.endDate === "string" ? raw.endDate : null,
            productIds: Array.isArray(raw.productIds)
              ? raw.productIds.filter((v): v is number => typeof v === "number")
              : [],
            upcoming,
          });
        }
      }
    }
  }
  return offers;
}

// ──────────────────────────────────────────────────────────────────────────
// Pack-size parsing
//
// A preview of what issue #1 needs properly. Dirk states pack size as free
// text and publishes no Unit Price, so the figure all comparison runs on has
// to be derived here. The awkward forms below are all real, taken from the
// archived data: Dutch decimal commas, multipacks, piece counts, and a
// parenthetical that has to be ignored.
// ──────────────────────────────────────────────────────────────────────────

export type ComparisonUnit = "kg" | "l" | "piece";

export interface PackSize {
  /** Quantity in the comparison unit's base: kilograms, litres, or pieces. */
  readonly quantity: number;
  readonly unit: ComparisonUnit;
}

const TO_KG: Record<string, number> = { g: 0.001, gram: 0.001, kg: 1, kilo: 1 };
const TO_L: Record<string, number> = { ml: 0.001, cl: 0.01, l: 1, liter: 1, litre: 1 };

function scale(amount: number, unit: string): PackSize | null {
  const key = unit.toLowerCase();
  if (key in TO_KG) return { quantity: amount * TO_KG[key]!, unit: "kg" };
  if (key in TO_L) return { quantity: amount * TO_L[key]!, unit: "l" };
  return null;
}

/**
 * Reads a pack size out of free text, or returns null when it cannot.
 *
 * Returning null is a real outcome rather than a failure: a Product with no
 * derivable Unit Price is simply not a comparison candidate, and must not be
 * dropped from the catalogue or guessed at.
 */
export function parsePackSize(text: string | null): PackSize | null {
  if (!text) return null;
  // Dutch decimals, and ignore any parenthetical aside such as
  // "1 kg (ca. 2 stuks)".
  const cleaned = text.toLowerCase().replace(/\(.*?\)/g, " ").replace(",", ".").trim();

  // Multipacks: "2 x 35 g", "24 x 300ml". Total quantity is what matters.
  const multi = cleaned.match(/(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*([a-z]+)/);
  if (multi) {
    const sized = scale(Number(multi[2]), multi[3]!);
    if (sized) return { quantity: sized.quantity * Number(multi[1]), unit: sized.unit };
  }

  const simple = cleaned.match(/(\d+(?:\.\d+)?)\s*(kg|kilo|gram|g|liter|litre|l|ml|cl)\b/);
  if (simple) {
    const sized = scale(Number(simple[1]), simple[2]!);
    if (sized) return sized;
  }

  if (/^per\s+stuk$/.test(cleaned)) return { quantity: 1, unit: "piece" };
  const pieces = cleaned.match(/(\d+)\s*stuks?\b/);
  if (pieces) return { quantity: Number(pieces[1]), unit: "piece" };

  // "Per schaal", "Per bakje" and friends: a container with no stated
  // quantity. Deliberately unparsed rather than assumed to be one of anything.
  return null;
}

/**
 * Pack size, preferring the packaging field but falling back to the product
 * name. Dirk really does put the weight only in the name sometimes --
 * "Snoeptomaatjes 500 gram" packaged as "Per schaal" -- and ignoring that
 * would throw away a comparable Product for no reason.
 */
export function packSizeFor(product: {
  packaging: string | null;
  name: string;
}): PackSize | null {
  return parsePackSize(product.packaging) ?? parsePackSize(product.name);
}

/** Price per kilogram / litre / piece, in cents. The comparison figure. */
export function unitPriceCents(
  priceCents: number,
  pack: PackSize,
): number | null {
  if (pack.quantity <= 0) return null;
  return Math.round(priceCents / pack.quantity);
}
