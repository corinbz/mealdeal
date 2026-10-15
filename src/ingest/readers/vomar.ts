import { readStep, jsonOf } from "../archive.ts";
import {
  eurosToCents,
  parseInstant,
  parsePackSize,
  type PackSize,
} from "../normalise.ts";
import { unitPriceOf } from "../unit-price.ts";
import type { ChainReader, ChainReading, PriceReading } from "./types.ts";

/**
 * Vomar.
 *
 * Read from the JSON gateway its own pages use; see
 * `src/archive/chains/vomar.ts` for what was verified and what Vomar does not
 * publish. In short: national Shelf Prices, a primary EAN plus additional
 * ones, a pack stated as a number and a unit, and no Offers at all.
 *
 * Vomar publishes no Unit Price, so every one here is derived, as for Dirk.
 * Unlike Dirk's free-text packaging, the pack arrives in two fields,
 * `contents` and `unit` ("500" and "gram"), which almost always read cleanly.
 *
 * Exercised on the full catalogue of 2026-10-14: 6,268 Products in 85 main
 * groups, every one with a primary EAN.
 */

interface VomarProduct {
  articleNumber?: unknown;
  description?: unknown;
  contents?: unknown;
  unit?: unknown;
  price?: unknown;
  pieceWeight?: unknown;
  primaryEan?: unknown;
  additionalEans?: unknown;
  brand?: unknown;
  departmentWebShopNumber?: unknown;
  mainGroupWebShopNumber?: unknown;
  subGroupWebShopNumber?: unknown;
  // `images` is in every response and deliberately not read (ADR-0003).
}

interface DepartmentNode {
  departmentNumber?: unknown;
  departmentDescription?: unknown;
  mainGroups?: {
    mainGroupNumber?: unknown;
    mainGroupDescription?: unknown;
    subGroups?: { subGroupNumber?: unknown; subGroupDescription?: unknown }[] | null;
  }[] | null;
}

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const number = (value: unknown): string | null =>
  typeof value === "number" && Number.isFinite(value) ? String(value) : null;

/**
 * The pack wording, as Vomar's own product card prints it: "500 gram",
 * "10 stuks", "per stuk". Two fields joined, nothing re-worded.
 */
function packTextOf(row: VomarProduct): string | null {
  const contents = text(row.contents) ?? number(row.contents);
  const unit = text(row.unit);
  return [contents, unit].filter(Boolean).join(" ") || null;
}

/**
 * The pack a Unit Price is derived from: Vomar's own two fields, and the name
 * only when they do not read ("Green Soap Navul Sinas 500ml" has neither).
 *
 * Unlike Jumbo's, a measure in the name of a Product Vomar counts in pieces
 * is not the pack's weight: in all 18 such Products on 2026-10-14 it was
 * each piece's size, "G'woon Huisvuilzak 60l, 20 stuks". Taking it would
 * price bin bags per litre. Products sold by weight already state it in the
 * fields, so the weight-first rule (issue #3) costs nothing here.
 */
function packOf(packText: string | null, name: string): PackSize | null {
  return parsePackSize(packText) ?? parsePackSize(name);
}

export const vomarReader: ChainReader = {
  chainId: "vomar",

  async read(archiveRoot: string, date: string): Promise<ChainReading> {
    const paths = await categoryPaths(archiveRoot, date);
    const prices: PriceReading[] = [];
    const parseFailures: string[] = [];
    const seenRefs = new Set<string>();
    let productsSeen = 0;
    let withoutUnitPrice = 0;

    for await (const record of readStep(archiveRoot, date, "vomar", "products")) {
      const rows = (jsonOf(record) as { products?: unknown } | null)?.products;
      if (!Array.isArray(rows)) {
        parseFailures.push(`${record.label}: unusable response body`);
        continue;
      }
      const observedAt = parseInstant(record.at) ?? new Date(`${date}T00:00:00Z`);

      for (const row of rows as VomarProduct[]) {
        productsSeen++;
        const ref = number(row.articleNumber);
        const name = text(row.description);
        const shelf = eurosToCents(row.price);
        if (!ref || !name || shelf === null || shelf <= 0) {
          parseFailures.push(`vomar product ${ref ?? "?"}: missing name or price`);
          continue;
        }
        if (seenRefs.has(ref)) continue;
        seenRefs.add(ref);

        const packText = packTextOf(row);
        const pack = packOf(packText, name);
        if (!pack) withoutUnitPrice++;

        const path = paths.get(
          [row.departmentWebShopNumber, row.mainGroupWebShopNumber, row.subGroupWebShopNumber].join("/"),
        );
        const eans = [row.primaryEan, ...(Array.isArray(row.additionalEans) ? row.additionalEans : [])]
          .map(text)
          .filter((e): e is string => e !== null);

        prices.push({
          chainProductRef: ref,
          name,
          brand: text(row.brand),
          packText,
          pack,
          // 1 is a pre-packed weighed pack (cheese, chicken), 2 loose produce
          // sold by weight; either way the price is for the stated contents.
          isWeightProduct: row.pieceWeight === 1 || row.pieceWeight === 2,
          eans: [...new Set(eans)],
          categories: path ? [path] : [],
          storeRef: null, // Vomar's gateway takes no Store: prices are national.
          observedAt,
          shelfPriceCents: shelf,
          offerPriceCents: null, // Vomar publishes no Offers we can read.
          ...unitPriceOf(shelf, pack, null),
        });
      }
    }

    return { prices, offers: [], productsSeen, withoutUnitPrice, parseFailures };
  },
};

/**
 * "department/mainGroup/subGroup" numbers to a path of names, such as
 * "Vers > Groente > Wortels & Knolgroente", from the archived tree. Subgroup
 * numbers repeat across main groups, so all three numbers are the key.
 */
async function categoryPaths(archiveRoot: string, date: string): Promise<Map<string, string>> {
  const paths = new Map<string, string>();
  for await (const record of readStep(archiveRoot, date, "vomar", "departments")) {
    const departments = (jsonOf(record) as { departments?: DepartmentNode[] } | null)?.departments ?? [];
    for (const d of departments) {
      const dName = text(d.departmentDescription);
      for (const m of d.mainGroups ?? []) {
        const mName = text(m.mainGroupDescription);
        for (const s of m.subGroups ?? []) {
          const sName = text(s.subGroupDescription);
          if (!dName || !mName || !sName) continue;
          paths.set(
            [d.departmentNumber, m.mainGroupNumber, s.subGroupNumber].join("/"),
            [dName, mName, sName].join(" > "),
          );
        }
      }
    }
  }
  return paths;
}
