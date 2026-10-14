/**
 * Turning what a Chain said into what we store.
 *
 * Every awkward case handled here came out of real archived responses, not
 * from imagination: Dutch decimal commas, multipack forms, piece counts,
 * containers with no stated quantity, and Jumbo's non-standard bracketed
 * timezone. Each has a test.
 */

export type ComparisonUnit = "kg" | "l" | "piece";

export interface PackSize {
  /** Quantity in the comparison unit's base: kilograms, litres, or pieces. */
  readonly quantity: number;
  readonly unit: ComparisonUnit;
}

const TO_KG: Record<string, number> = { g: 0.001, gr: 0.001, gram: 0.001, kg: 1, kilo: 1 };
const TO_L: Record<string, number> = {
  ml: 0.001, milliliter: 0.001, cl: 0.01, centiliter: 0.01, dl: 0.1, l: 1, liter: 1, litre: 1,
};

function scale(amount: number, unit: string): PackSize | null {
  const key = unit.toLowerCase();
  if (key in TO_KG) return { quantity: amount * TO_KG[key]!, unit: "kg" };
  if (key in TO_L) return { quantity: amount * TO_L[key]!, unit: "l" };
  return null;
}

/** Rounds away binary-float noise: 24 x 300ml must be 7.2 l, not 7.199999. */
const tidy = (n: number) => Math.round(n * 1e6) / 1e6;

/**
 * Reads a pack size out of free text, or returns null when it cannot.
 *
 * Null is a real outcome rather than a failure. A Product with no derivable
 * Unit Price is simply not a comparison candidate; it is never dropped from
 * the catalogue and its wording is kept verbatim so a better parser can
 * recover it later.
 */
export function parsePackSize(text: string | null | undefined): PackSize | null {
  if (!text) return null;
  // Dutch decimals, and drop any parenthetical aside: "1 kg (ca. 2 stuks)".
  const cleaned = text
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/(\d),(\d)/g, "$1.$2")
    .trim();

  // Multipacks first, or "2 x 35 g" reads as 2 of something.
  const multi = cleaned.match(/(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*([a-z]+)/);
  if (multi) {
    const sized = scale(Number(multi[2]), multi[3]!);
    if (sized) {
      return { quantity: tidy(sized.quantity * Number(multi[1])), unit: sized.unit };
    }
  }

  const simple = cleaned.match(/(\d+(?:\.\d+)?)\s*(kg|kilo|gram|gr|g|milliliter|centiliter|liter|litre|l|ml|cl|dl)\b/);
  if (simple) {
    const sized = scale(Number(simple[1]), simple[2]!);
    if (sized) return { quantity: tidy(sized.quantity), unit: sized.unit };
  }

  if (/^per\s+stuk$/.test(cleaned)) return { quantity: 1, unit: "piece" };
  // Plus prices meat by the kilo with no number: "Per kilo".
  if (/^per\s+(kilo|kg)$/.test(cleaned)) return { quantity: 1, unit: "kg" };
  if (/^per\s+(liter|l)$/.test(cleaned)) return { quantity: 1, unit: "l" };
  const pieces = cleaned.match(/(\d+)\s*(?:stuks?|st\.?)\b/);
  if (pieces) return { quantity: Number(pieces[1]), unit: "piece" };

  // "Per schaal", "Per bakje": a container with no stated quantity.
  // Deliberately unparsed rather than assumed to be one of anything.
  return null;
}

/** Price per kilogram / litre / piece, in cents. The comparison figure. */
export function deriveUnitPrice(priceCents: number, pack: PackSize): number | null {
  if (pack.quantity <= 0) return null;
  return Math.round(priceCents / pack.quantity);
}

/** Decimal euros to integer cents. Chains send both euros and cents. */
export function eurosToCents(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

export function centsFrom(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.round(value);
}

/**
 * Parses a Chain timestamp.
 *
 * Jumbo sends `2026-10-07T00:01:00+02:00[Europe/Amsterdam]`, a java.time
 * format that Date rejects outright. The bracketed zone is redundant with the
 * offset already present, so it is stripped rather than interpreted.
 */
export function parseInstant(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const stripped = value.replace(/\[[^\]]*\]\s*$/, "").trim();
  const parsed = new Date(stripped);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Dirk marks "no end date" with a date far in the future. Storing it as
 * written would make every Offer look like it runs for twenty-odd years.
 */
const FAR_FUTURE_YEAR = 2040;

export function endDateOrOpenEnded(value: unknown): Date | null {
  const parsed = parseInstant(value);
  if (!parsed) return null;
  return parsed.getUTCFullYear() >= FAR_FUTURE_YEAR ? null : parsed;
}
