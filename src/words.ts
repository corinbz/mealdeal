/**
 * The basket page's own reading of typed items (prototype/words.js) and its
 * Resolution (prototype/resolve.js), loaded here so that the Ingredient
 * mapping and the digest read and resolve exactly as the page does. They are
 * plain browser scripts, not modules, because the page must still work opened
 * straight from disk, so they are evaluated rather than imported.
 */

import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

export type ComparisonUnit = "kg" | "l" | "piece";

export interface Parsed {
  readonly text: string;
  readonly noun: string;
  readonly quantity: number;
  readonly unit: ComparisonUnit;
  readonly guessed: boolean;
}

export interface Words {
  wordsOf(noun: string): string[];
  nameWords(name: string): string[];
  matches(words: readonly string[], names: readonly string[]): boolean;
  parse(text: string, tally: (words: string[]) => Record<ComparisonUnit, number>): Parsed | null;
}

/** A Requirement as prototype/resolve.js reads one. */
export interface Requirement extends Parsed {
  readonly ingredient: string | null;
  readonly variant: string | null;
  readonly preferences: Readonly<Record<string, boolean>>;
  /** For an unrecognised item, the Ingredient name it is probably a typo of. */
  readonly suggestion?: string | null;
}

/** A Product as prototype/resolve.js unpacks a catalogue row. */
export interface ResolvedProduct {
  readonly id: string;
  readonly chainId: string;
  readonly name: string;
  readonly shelfPriceCents: number;
  readonly offerPriceCents: number | null;
  readonly offerWording: string | null;
  readonly unitPriceCents: number;
  readonly ingredientUnitPriceCents: number | null;
  readonly referenceLowCents: number | null;
  readonly referenceDays: number | null;
}

/** Whether a running Offer is a real low (#18); see verdict in prototype/resolve.js. */
export interface Verdict {
  readonly kind: "lowest" | "not-lower" | "shelf-up" | "shelf-same";
  readonly lowCents: number;
  readonly days: number;
}

export interface Resolver {
  parse(text: string): Requirement | null;
  candidates(chainId: string, item: Requirement): ResolvedProduct[];
  unitPrice(p: ResolvedProduct, item: Requirement): number;
  verdict(p: ResolvedProduct): Verdict | null;
}

const context: { MealdealWords?: Words; MealdealResolve?: { createResolver(data: unknown): Resolver; SPREAD_CHECK: number } } = {};
for (const file of ["words.js", "resolve.js"]) {
  runInNewContext(readFileSync(new URL(`../prototype/${file}`, import.meta.url), "utf8"), context);
}
export const words: Words = context.MealdealWords!;
/** The page's own Resolution (prototype/resolve.js), over a catalogue as the page loads it. */
export const createResolver = (catalogue: unknown): Resolver => context.MealdealResolve!.createResolver(catalogue);
/** A difference between Chains larger than this is checked before Bladeren shows it as a bargain (#36). */
export const SPREAD_CHECK: number = context.MealdealResolve!.SPREAD_CHECK;
