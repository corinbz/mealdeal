/**
 * Which Unit Price a Product is compared on: the Chain's own figure, or the
 * one its price and Pack Size give. One rule for every Chain's reader, and
 * the yardstick the morning self-check (#37) measures the catalogue with.
 *
 * Which of the two is right when they disagree depends on where the Pack
 * Size came from.
 *
 * A pack the Chain states in a field of its own (Aldi's salesUnit,
 * Hoogvliet's contents) is the Chain's word, so a figure that does not follow
 * from it within UNIT_PRICE_TOLERANCE is the slip, and the pack's own
 * arithmetic is used. Slips of that kind found so far:
 *
 *   - stale, or per one of a multipack: "3-pack crackers, 3x75 g, 1,39,
 *     18,53 per kg" at Aldi;
 *   - the pack's price as the kilo's: "Varkenshaas, ca. 500 g, 6,00, 6,00
 *     per kg";
 *   - a factor of a thousand: "200 g, 1,95, 1950,00 per kg";
 *   - per drained kilo, where the owner chose the whole pack for every Chain
 *     (#37).
 *
 * A pack read out of a Product's title (Jumbo's) is our reading, often of
 * the wrong number: "Pedigree Dentastix 3-10kg 7 Stuks", "Conimex Noodles
 * 12 x 250 g" sold as one. Its Chain's figure stands, except the one slip
 * Jumbo is known to make, a price per drained kilo: "Jumbo Doperwten 680 g"
 * at €0.93, "€2.04 per kg", 1.05 to 3 times the pack's.
 *
 * A pack whose weight is only roughly stated ("ca. 600 g", weighed at the
 * till) keeps the Chain's figure unless it is one of the two gross slips:
 * its price is only roughly the stated weight's.
 */

import { deriveUnitPrice, type ComparisonUnit, type PackSize } from "./normalise.ts";
import type { PriceReading } from "./readers/types.ts";

/** How far a Chain's figure may be off the pack's and still be taken as it: 10%, or 2 cents, whichever is more. */
export const UNIT_PRICE_TOLERANCE = { share: 0.1, cents: 2 } as const;

/**
 * Times the pack's own figure that a tin or jar priced per drained kilo
 * (uitlekgewicht) comes out at: below this is rounding, above it a slip of
 * another kind.
 */
export const DRAINED_BAND = { from: 1.05, to: 3 } as const;

/** A Chain's own Unit Price, and the price it is a figure of: the price shown, or the Shelf Price where the Chain prices Offers apart. */
export interface StatedUnitPrice {
  readonly cents: number;
  /** null where the Chain left the unit out: kept as stated, compared with nothing. */
  readonly unit: ComparisonUnit | null;
  readonly ofCents: number;
}

export type UnitPriceChoice = Pick<PriceReading, "unitPriceCents" | "comparisonUnit" | "unitPriceSource">;

/** "ca. 500 g", "circa 1 kg", "± 600 g": a weight only roughly stated. */
export const isApproximate = (packText: string | null | undefined) => /\bca\b|circa|±/i.test(packText ?? "");

/** Whether a unit price follows from a pack's price and size, within UNIT_PRICE_TOLERANCE. */
export function followsFromPack(unitCents: number, priceCents: number, quantity: number): boolean {
  const own = priceCents / quantity;
  return Math.abs(unitCents - own) <= Math.max(UNIT_PRICE_TOLERANCE.share * own, UNIT_PRICE_TOLERANCE.cents);
}

/** Whether a unit price is the pack's own 1.05 to 3 times over, as a price per drained kilo is. */
export function looksDrained(unitCents: number, priceCents: number, quantity: number): boolean {
  const times = unitCents / (priceCents / quantity);
  return times >= DRAINED_BAND.from && times <= DRAINED_BAND.to;
}

/** Whether a Chain's figure by weight or volume can be the pack's; see the module comment. */
function agrees(stated: StatedUnitPrice, pack: PackSize | null, { approximate, packFromTitle }: Options): boolean {
  if (!pack || pack.unit !== stated.unit || pack.quantity <= 0) return true;
  if (packFromTitle) return !looksDrained(stated.cents, stated.ofCents, pack.quantity);
  const own = stated.ofCents / pack.quantity;
  if (stated.cents === stated.ofCents && Math.abs(pack.quantity - 1) > 0.05) return false;
  if (stated.cents >= own * 20) return false;
  return approximate || followsFromPack(stated.cents, stated.ofCents, pack.quantity);
}

interface Options {
  /** "ca. 500 g": see isApproximate. */
  readonly approximate?: boolean;
  /** The pack was read out of the Product's title, not stated by the Chain in a field of its own. */
  readonly packFromTitle?: boolean;
}

const byMeasure = (u: ComparisonUnit | null | undefined) => u === "kg" || u === "l";

/**
 * The Unit Price of a Product at the price paid today, by weight or volume
 * whenever one is known, by the piece only when none is (the owner's rule,
 * #3). In order:
 *
 *   1. The Chain's own figure per kg or litre, where it agrees with the pack.
 *      One given on the Shelf Price, when an Offer price is paid, is used
 *      only where there is no pack, scaled to the price paid and then ours.
 *   2. One derived from the pack, when it states a weight or volume.
 *   3. The Chain's own per-piece figure, unless it is the pack's whole price
 *      for a pack of several pieces ("Paprika Duo 2 Stuks", "€2.99 per
 *      piece"), when each piece is the pack's share.
 *   4. One derived per piece from a count in the pack.
 *
 * Derived figures are marked as ours. A figure whose unit the Chain left out
 * stays unmapped: guessing "piece" would let a per-something price be
 * compared with a per-piece one.
 */
export function unitPriceOf(
  paidCents: number,
  pack: PackSize | null,
  stated: StatedUnitPrice | null,
  options: Options = {},
): UnitPriceChoice {
  const derived = (p: PackSize): UnitPriceChoice => ({ unitPriceCents: deriveUnitPrice(paidCents, p), comparisonUnit: p.unit, unitPriceSource: "derived" });
  const theirs = (s: StatedUnitPrice): UnitPriceChoice => s.ofCents === paidCents
    ? { unitPriceCents: s.cents, comparisonUnit: s.unit, unitPriceSource: "chain" }
    : { unitPriceCents: Math.round((s.cents * paidCents) / s.ofCents), comparisonUnit: s.unit, unitPriceSource: "derived" };
  // A figure on another price than the one paid is scaled only where no pack
  // gives an exact one: scaling carries the Chain's own rounding along.
  const usable = stated && (stated.ofCents === paidCents || !pack) ? stated : null;
  if (usable && byMeasure(usable.unit) && agrees(usable, pack, options)) return theirs(usable);
  if (pack && byMeasure(pack.unit)) return derived(pack);
  if (usable && usable.unit === "piece" && usable.cents === usable.ofCents && pack?.unit === "piece" && pack.quantity > 1) return derived(pack);
  if (usable && !byMeasure(usable.unit)) return theirs(usable);
  if (pack) return derived(pack);
  return { unitPriceCents: null, comparisonUnit: null, unitPriceSource: null };
}
