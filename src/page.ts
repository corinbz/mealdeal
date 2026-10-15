/**
 * The basket page's own scripts, loaded once for everything outside the
 * browser: its reading of typed items (prototype/words.js), its Resolution
 * and Basket pricing (prototype/resolve.js), and its recipes
 * (prototype/recipes.js). The Ingredient mapping, the digest, the morning
 * reports, the scripts and the tests all read, resolve and price exactly as
 * the page does by going through here. They are plain browser scripts, not
 * modules, because the page must still work opened straight from disk, so
 * they are evaluated rather than imported.
 *
 * The types below are what callers here may rely on. The scripts are the
 * truth; test/page.test.ts checks every function named here is one they
 * define.
 */

import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import type { CatalogueIngredient } from "./catalogue/format.ts";

export type ComparisonUnit = "kg" | "l" | "piece";

export interface Parsed {
  readonly text: string;
  readonly noun: string;
  readonly quantity: number;
  readonly unit: ComparisonUnit;
  readonly guessed: boolean;
}

export interface Words {
  stem(word: string): string;
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

/** A Requirement on the list: the page gives each an id, and one naming an Exact Product its id. */
export interface Item extends Requirement {
  readonly id?: string;
  readonly exact?: string;
}

/** A Product as prototype/resolve.js unpacks a catalogue row. */
export interface ResolvedProduct {
  readonly id: string;
  readonly chainId: string;
  readonly name: string;
  readonly packaging: string | null;
  readonly packQuantity: number | null;
  readonly packUnit: string | null;
  readonly comparisonUnit: ComparisonUnit;
  readonly shelfPriceCents: number;
  readonly offerPriceCents: number | null;
  readonly unitPriceCents: number;
  readonly offerWording: string | null;
  readonly offerEndsOn: string | null;
  readonly nextWording: string | null;
  readonly nextStartsOn: string | null;
  readonly ingredient: string | null;
  readonly variant: string | null;
  readonly form: string | null;
  readonly biologisch: boolean;
  readonly huismerk: boolean;
  readonly ingredientUnitPriceCents: number | null;
  readonly ingredientPack: number | null;
  readonly referenceLowCents: number | null;
  readonly referenceDays: number | null;
}

/** Whether a running Offer is a real low (#18); see verdict in prototype/resolve.js. */
export interface Verdict {
  readonly kind: "lowest" | "not-lower" | "shelf-up" | "shelf-same";
  readonly lowCents: number;
  readonly days: number;
}

export interface Offer {
  readonly wording: string;
  readonly priceCents: number | null;
  readonly startsOn: string | null;
  readonly continues?: boolean;
}

/** One Product bought for a Requirement, in whole packs. */
export interface Line {
  readonly p: ResolvedProduct;
  readonly o: Offer | null;
  readonly offer: string | null;
  readonly onOffer: boolean;
  readonly packs: number;
  readonly cost: number;
  /** How many times what was asked for is bought; null where the pack is in another unit. */
  readonly over: number | null;
  /** The part of what is bought that is used. */
  readonly share: number;
  /** The packs at the Shelf Price, where the Offer price is below it. */
  readonly was: number | null;
}

export interface Chain {
  readonly id: string;
  readonly name: string;
  readonly offersOnly?: boolean;
  readonly eans?: boolean;
}

export interface BagTotal {
  readonly chain: Chain;
  readonly cost: number;
  readonly filled: number;
  readonly total: number;
  readonly full: boolean;
}

export interface Comparison {
  readonly rows: readonly { readonly item: Item; readonly by: Readonly<Record<string, Line | null>>; readonly avail: readonly Chain[]; readonly min: number | null; readonly max: number | null }[];
  readonly totals: readonly BagTotal[];
  readonly best: BagTotal | null;
  readonly combo: { readonly ids: readonly string[]; readonly cost: number; readonly filled: number; readonly from: Readonly<Record<string, string>> } | null;
  readonly exact: { readonly rows: readonly unknown[]; readonly totals: readonly BagTotal[] };
}

export interface RecipeAt {
  readonly chain: Chain;
  readonly lines: readonly (Line | null)[];
  readonly cost: number;
  readonly missing: number;
  readonly deals: number;
  readonly saving: number;
}

export interface RecipePrice {
  readonly at: readonly RecipeAt[];
  readonly best: RecipeAt | undefined;
  readonly complete: boolean;
}

export interface DayPrice {
  readonly cents: number;
  readonly offer: boolean;
  readonly product: string;
}

export interface PriceDrop {
  readonly cents: number;
  readonly usualCents: number;
  readonly percent: number;
  readonly offer: boolean;
  readonly product: string;
}

/** Where the Chain makes the most difference (#36); see spreads in prototype/resolve.js. */
export interface SpreadsResult {
  readonly ingredients: readonly {
    readonly d: CatalogueIngredient;
    readonly by: Readonly<Record<string, { readonly p: ResolvedProduct; readonly cost: number }>>;
    readonly avail: readonly Chain[];
    readonly min: number | null;
    readonly max: number | null;
    readonly mid: number | null;
    readonly share: number;
    readonly unchecked: boolean;
  }[];
  readonly worth: readonly { readonly p: ResolvedProduct; readonly c: Chain; readonly rivalCost: number; readonly share: number; readonly unchecked: boolean }[];
}

export interface Pricing {
  readonly week?: "nu" | "volgende";
  readonly corrections?: Readonly<Record<string, string>> | null;
}

/** A Requirement's Ingredient and Preferences, without what was typed: what satisfies asks. */
export type Asked = Pick<Requirement, "ingredient" | "variant" | "preferences">;

/** An item on the list as which kind (#43) reads it: the page adds `anyKind` once the shopper answers "any". */
export interface Kindable extends Pick<Requirement, "ingredient" | "variant"> {
  readonly exact?: string;
  readonly anyKind?: boolean;
}

/** The kinds an item may be (#43); see kinds in prototype/resolve.js. */
export interface Kinds {
  readonly aspects: readonly {
    readonly aspect: string;
    readonly options: readonly { readonly v: { readonly id: string; readonly name: string }; readonly n: number }[];
    readonly value: string | null;
  }[];
  readonly sold: boolean;
  readonly asks: boolean;
}

export interface Resolver {
  /** Each Chain's Products by id ("dirk-123"). */
  readonly products: Readonly<Record<string, Readonly<Record<string, ResolvedProduct>>>>;
  readonly vocabulary: ReadonlyMap<string, CatalogueIngredient>;
  /** Per Chain, the first day its announced Offers start. */
  readonly nextStarts: Readonly<Record<string, string>>;
  parse(text: string): Requirement | null;
  suggest(noun: string): string | null;
  label(ingredient: string, variant: string | null, lang: string): string | null;
  variantsOf(variant: string | null): string[];
  joinVariants(ingredient: string, ids: readonly string[]): string | null;
  kindsSold(ingredient: string): Map<string | null, number>;
  kinds(item: Kindable): Kinds | null;
  chooseKind(item: Kindable, variant: string | null): { variant: string | null; anyKind: boolean; answered: boolean };
  candidates(chainId: string, item: Requirement): ResolvedProduct[];
  satisfies(p: Pick<ResolvedProduct, "ingredient" | "variant" | "form" | "biologisch" | "huismerk" | "ingredientUnitPriceCents">, item: Asked): boolean;
  packsFor(p: ResolvedProduct, item: Requirement): { known: boolean; packs: number; pack: number | null };
  unitPrice(p: ResolvedProduct, item: Requirement): number;
  correctionKey(chainId: string, item: Requirement): string;
  dailyPrices(chainId: string, item: Requirement): { dates: string[]; days: (DayPrice | null)[] };
  priceDropAt(chainId: string, item: Requirement): PriceDrop | null;
  exactIdOf(p: ResolvedProduct): string | null;
  exactProduct(chainId: string, id: string): ResolvedProduct | null;
  likelyProduct(chainId: string, id: string): ResolvedProduct | null;
  exactMatches(text: string, limit?: number): { id: string; name: string; extra: number }[];
  spreads(): SpreadsResult;
  isOnOffer(p: ResolvedProduct): boolean;
  offerFor(p: ResolvedProduct, week?: "nu" | "volgende"): Offer | null;
  packCents(p: ResolvedProduct, o: Offer | null): number;
  verdict(p: ResolvedProduct): Verdict | null;
  correctedProduct(chainId: string, item: Requirement, corrections: Readonly<Record<string, string>> | null): ResolvedProduct | null;
  line(chainId: string, item: Requirement, pricing?: Pricing): Line | null;
  compare(items: readonly Item[], pricing?: Pricing): Comparison;
  priceRecipe(requirements: readonly Requirement[], pricing?: Pricing): RecipePrice;
  usedCents(l: Line): number;
}

/** A recipe (#20) as prototype/recipes.js writes it: Requirements as a shopper types them. */
export interface Recipe {
  readonly id: string;
  readonly name: string;
  readonly persons: number;
  readonly minutes: number;
  readonly source: "own" | { readonly kind: "wikibooks"; readonly title: string; readonly url: string; readonly revision: number };
  readonly requirements: readonly string[];
  readonly pantry: readonly string[];
  readonly steps: readonly string[];
  readonly en?: { readonly name: string; readonly pantry: readonly string[]; readonly steps: readonly string[] };
}

interface Loaded {
  window?: Loaded;
  MealdealWords?: Words;
  MealdealResolve?: {
    createResolver(catalogue: unknown, prices?: unknown): Resolver;
    priceDrop(days: readonly (DayPrice | null)[]): PriceDrop | null;
    USUAL_MIN_DAYS: number;
    DROP_SHARE: number;
    SPREAD_CHECK: number;
  };
  RECIPES?: Recipe[];
}

const context: Loaded = {};
context.window = context;
for (const file of ["words.js", "resolve.js", "recipes.js"]) {
  runInNewContext(readFileSync(new URL(`../prototype/${file}`, import.meta.url), "utf8"), context);
}
const resolve = context.MealdealResolve!;

export const words: Words = context.MealdealWords!;
/**
 * The page's own Resolution over a catalogue as the page loads it, and
 * `prices` as window.PRICES (scripts/daily-prices.ts), or nothing when there
 * is no history.
 */
export const createResolver = (catalogue: unknown, prices?: unknown): Resolver => resolve.createResolver(catalogue, prices);
/** The Price Drop rule (#19): today's Daily Price against the Usual Price, or null. */
export const priceDrop = (days: readonly (DayPrice | null)[]): PriceDrop | null => resolve.priceDrop(days);
/** Fewer observed days than this before today is not enough to judge a Price Drop. */
export const USUAL_MIN_DAYS: number = resolve.USUAL_MIN_DAYS;
/** A difference between Chains larger than this is checked before Bladeren shows it as a bargain (#36). */
export const SPREAD_CHECK: number = resolve.SPREAD_CHECK;
/** The recipes the page offers. */
export const RECIPES: readonly Recipe[] = context.RECIPES!;
