/**
 * Each mapped Product's price per day, in its Ingredient's own unit (#16), for
 * the page to compute an Ingredient's Daily Price from.
 *
 * The Daily Price (CONTEXT.md) is the lowest Unit Price a shopper could pay
 * that day for what satisfies a Requirement. Which Products satisfy one
 * depends on the Basket Item's Variant and Preferences, so the page takes the
 * minimum itself (prototype/resolve.js), over these per-Product series. The
 * series come from the price history (history.ts), which is derived from the
 * archive, so all of it can be recomputed.
 */

import type { Day, PriceHistory } from "./history.ts";

/** One day of one Product: per unit, as `[cents]` while an Offer ran; null when not observed. */
export type UnitDay = number | [number] | null;

export interface DailyPrices {
  /** Ascending and contiguous: the last SHOWN_DAYS calendar days of the history. */
  readonly dates: string[];
  /** Chain → Product ref → one UnitDay per date. */
  readonly series: Record<string, Record<string, UnitDay[]>>;
}

/** What the page needs of a catalogue row to put its pack price per unit. */
export interface UnitBasis {
  readonly ref: string;
  /** The Product's pack in the Ingredient's unit, when known. */
  readonly ingredientPack: number | null;
  /** Today's per-unit price and the pack price it came from, when the pack is not known. */
  readonly ingredientUnitPriceCents: number;
  readonly paidTodayCents: number;
}

export const SHOWN_DAYS = 30;

const cents = (day: Day) => (Array.isArray(day) ? day[0] : day);

/**
 * A pack price as a price per unit of the Ingredient. With the pack size, that
 * is a division; without it, today's ratio between the two, which holds for as
 * long as the pack is the same Product.
 */
export function perUnit(paid: number, basis: UnitBasis): number {
  if (basis.ingredientPack && basis.ingredientPack > 0) return Math.round(paid / basis.ingredientPack);
  return Math.round((paid * basis.ingredientUnitPriceCents) / basis.paidTodayCents);
}

const DAY_MS = 86_400_000;
const dayNumber = (date: string) => Date.parse(`${date}T00:00:00Z`) / DAY_MS;
const dateOf = (n: number) => new Date(n * DAY_MS).toISOString().slice(0, 10);

/**
 * The last SHOWN_DAYS calendar days up to the history's newest, every one of
 * them: a day the refresh never ran is absent from the history altogether, and
 * must still be a gap on the page rather than closed up around.
 */
export function dailyPrices(history: PriceHistory, bases: Readonly<Record<string, readonly UnitBasis[]>>): DailyPrices {
  const newest = history.dates.at(-1);
  if (!newest) return { dates: [], series: {} };
  const oldest = Math.max(dayNumber(history.dates[0]!), dayNumber(newest) - (SHOWN_DAYS - 1));
  const dates: string[] = [];
  for (let n = oldest; n <= dayNumber(newest); n++) dates.push(dateOf(n));
  const column = dates.map((d) => history.dates.indexOf(d));

  const series: Record<string, Record<string, UnitDay[]>> = {};
  for (const [chainId, list] of Object.entries(bases)) {
    const out: Record<string, UnitDay[]> = {};
    for (const basis of list) {
      const days = history.chains[chainId]?.[basis.ref];
      if (!days) continue;
      out[basis.ref] = column.map((i) => {
        const day = i < 0 ? null : days[i] ?? null;
        const paid = cents(day);
        if (paid === null) return null;
        const unit = perUnit(paid, basis);
        return Array.isArray(day) ? [unit] : unit;
      });
    }
    series[chainId] = out;
  }
  return { dates, series };
}
