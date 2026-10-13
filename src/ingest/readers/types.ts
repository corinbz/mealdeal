import type { ComparisonUnit, PackSize } from "../normalise.ts";

/** One Product as one Chain priced it, at one moment, at one scope. */
export interface PriceReading {
  readonly chainProductRef: string;
  readonly name: string;
  readonly brand: string | null;
  /** The Chain's own pack wording, kept even when it cannot be parsed. */
  readonly packText: string | null;
  readonly pack: PackSize | null;
  readonly isWeightProduct: boolean;
  readonly eans: readonly string[];
  /** NULL means the price applies across the Chain, not that it is unknown. */
  readonly storeRef: string | null;
  readonly observedAt: Date;
  readonly shelfPriceCents: number;
  readonly offerPriceCents: number | null;
  readonly unitPriceCents: number | null;
  readonly comparisonUnit: ComparisonUnit | null;
  /** Whose figure the Unit Price is: the Chain's own, or one we derived. */
  readonly unitPriceSource: "chain" | "derived" | null;
}

export interface OfferReading {
  readonly chainOfferRef: string;
  readonly storeRef: string | null;
  readonly headline: string | null;
  /** The Chain's advertised wording, verbatim. Nothing is derived from it. */
  readonly wording: string | null;
  readonly startsAt: Date | null;
  readonly endsAt: Date | null;
  readonly isUpcoming: boolean;
  readonly observedAt: Date;
  readonly productRefs: readonly string[];
}

export interface ChainReading {
  readonly prices: PriceReading[];
  readonly offers: OfferReading[];
  /** Products the Chain mentioned, including those we could not record. */
  readonly productsSeen: number;
  /**
    * Observations recorded with no Unit Price, and therefore not comparison
    * candidates. Measured, not hidden.
    *
    * Deliberately counts the outcome rather than one cause of it. Dirk reaches
    * it by unparseable pack wording; Jumbo by publishing no Unit Price for a
    * Product whose title states no quantity either. Counting only
    * pack-parsing failures undercounted Jumbo by 39.
    */
  readonly withoutUnitPrice: number;
  readonly parseFailures: string[];
}

export interface ChainReader {
  readonly chainId: string;
  read(archiveRoot: string, date: string): Promise<ChainReading>;
}
