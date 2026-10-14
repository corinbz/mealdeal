/**
 * Each Product's recent daily price, kept so an Offer can be judged against
 * what the Product cost before it (#18).
 *
 * A discount measured against an inflated "was" price says nothing. EU
 * price-reduction rules use the lowest price of the 30 days before the
 * reduction as the reference, and this uses the same reference, as context
 * rather than legal advice. It is per Product, never per Ingredient: the
 * question is whether this pack got cheaper, not whether mince did.
 *
 * The morning refresh ingests a single day into a throwaway database, so
 * the history is carried between mornings as a file next to the catalogue.
 * It is derived: everything in it comes from catalogues built from the
 * archive, the system of record (ADR-0005).
 */

/**
 * One Product on one day: the price paid, as `[cents]` when an Offer was
 * running and plain `cents` when not, or `null` when it was not observed.
 * Gaps stay gaps; nothing is interpolated.
 */
export type Day = number | [number] | null;

export interface PriceHistory {
  /** Ascending, one column per day kept. */
  readonly dates: string[];
  /** Chain → Product ref → one Day per date. */
  readonly chains: Record<string, Record<string, Day[]>>;
}

/** The fields of a catalogue row this reads; see scripts/catalogue-from-db.ts. */
export interface PricedRow {
  readonly ref: string;
  readonly shelfPriceCents: number;
  readonly offerPriceCents: number | null;
  readonly offerWording: string | null;
  readonly offerUpcoming: boolean;
}

export interface Reference {
  /** Lowest price paid in the reference period, per pack. */
  readonly lowCents: number;
  /** How many days the reference period spans, at most REFERENCE_DAYS. */
  readonly days: number;
}

export const REFERENCE_DAYS = 30;
/**
 * Days kept. More than the reference period, so an Offer that has run for a
 * while is still judged against the days before it began. One that has run
 * longer than the surplus gets a shorter reference, and says so in its days.
 */
export const KEEP_DAYS = 45;

const DAY_MS = 86_400_000;
const dayNumber = (date: string) => Date.parse(`${date}T00:00:00Z`) / DAY_MS;
const cents = (day: Day) => (Array.isArray(day) ? day[0] : day);

/** The same rule the basket page uses for what a pack costs today. */
export function today(row: PricedRow): Day {
  const onOffer = (row.offerPriceCents !== null || !!row.offerWording) && !row.offerUpcoming;
  if (!onOffer) return row.shelfPriceCents;
  return [row.offerPriceCents ?? row.shelfPriceCents];
}

/**
 * Adds `date`'s prices, replacing that day if it is already there (a refresh
 * re-run), and drops days older than KEEP_DAYS. Refuses a day older than the
 * newest kept: history is only ever extended forwards.
 */
export function recordDay(
  history: PriceHistory | null,
  date: string,
  rows: Readonly<Record<string, readonly PricedRow[]>>,
): PriceHistory {
  const before = history ?? { dates: [], chains: {} };
  const newest = before.dates.at(-1);
  if (newest && newest > date) throw new Error(`history already runs to ${newest}, so ${date} cannot be added`);

  const keepFrom = dayNumber(date) - (KEEP_DAYS - 1);
  const kept = before.dates.map((d, i) => ({ d, i })).filter(({ d }) => d !== date && dayNumber(d) >= keepFrom);
  const dates = [...kept.map(({ d }) => d), date];

  const chains: Record<string, Record<string, Day[]>> = {};
  for (const id of new Set([...Object.keys(before.chains), ...Object.keys(rows)])) {
    const out: Record<string, Day[]> = {};
    for (const [ref, days] of Object.entries(before.chains[id] ?? {})) {
      const series = kept.map(({ i }) => days[i] ?? null);
      if (series.some((d) => d !== null)) out[ref] = [...series, null];
    }
    for (const row of rows[id] ?? []) {
      (out[row.ref] ??= kept.map(() => null))[dates.length - 1] = today(row);
    }
    chains[id] = out;
  }
  return { dates, chains };
}

/**
 * The lowest price in the REFERENCE_DAYS before the current reduction began,
 * or null when nothing was observed then. Only for a Product on Offer on the
 * history's last day.
 *
 * Days immediately before, on Offer at today's price, are the same reduction
 * still running: judged against them, a week-old Offer would look like no
 * Offer at all. So the reference period ends where that run began.
 */
export function reference(history: PriceHistory, chainId: string, ref: string): Reference | null {
  const series = history.chains[chainId]?.[ref];
  const last = history.dates.length - 1;
  const now = series?.[last];
  if (!series || !Array.isArray(now)) return null;

  let start = last;
  for (let i = last - 1; i >= 0; i--) {
    const day = series[i];
    if (!Array.isArray(day) || day[0] !== now[0]) break;
    start = i;
  }

  const end = dayNumber(history.dates[start]!);
  let lowCents = Infinity, earliest = end;
  for (let i = 0; i < start; i++) {
    const day = series[i] ?? null, at = dayNumber(history.dates[i]!);
    if (day === null || at < end - REFERENCE_DAYS) continue;
    lowCents = Math.min(lowCents, cents(day)!);
    earliest = Math.min(earliest, at);
  }
  return lowCents === Infinity ? null : { lowCents, days: end - earliest };
}
