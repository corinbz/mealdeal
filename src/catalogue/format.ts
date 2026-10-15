/**
 * The catalogue the basket page runs on: `window.CATALOGUE` in
 * prototype/catalogue.js. scripts/catalogue-from-db.ts writes it,
 * scripts/apply-history.ts adds each Offer's reference to it, and the page
 * (prototype/resolve.js), the morning checks, the price history and the
 * digest read it.
 *
 * Each Product is a positional row, because 24,000 objects with repeated keys
 * would roughly double the file, and `columns` names each position. This
 * module owns those names: a Product is written with toRow and read back with
 * productsOf, by name, so a column added or moved shifts no reader's numbers
 * and a test's catalogue is laid out as production lays it out. The page
 * reads rows by the same names (resolve.js), being a browser script that
 * cannot import this.
 */

import type { ComparisonUnit } from "../ingredients/vocabulary.ts";

/** One Product, as the page and every check reads it. */
export interface CatalogueProduct {
  readonly ref: string;
  readonly name: string;
  /** Null when the Chain states none, or only repeats the name (Jumbo). */
  readonly packaging: string | null;
  readonly packQuantity: number | null;
  /**
   * What packQuantity counts. Not always the Comparison Unit: Jumbo prices
   * "Champignon Soep 3 Stuks" per kg, and 3 is pieces.
   */
  readonly packUnit: string | null;
  readonly comparisonUnit: ComparisonUnit;
  readonly shelfPriceCents: number;
  readonly offerPriceCents: number | null;
  readonly unitPriceCents: number;
  /** The Offer running on the day swept; offerPriceCents is its price, if it has one. */
  readonly offerWording: string | null;
  /** The day it ends, in Amsterdam; null when open-ended or not stated. */
  readonly offerEndsOn: string | null;
  /**
   * The next Offer announced but not yet started (#8), "" when it has no
   * wording. Kept apart from the running one so the two are never mixed
   * silently. It has no price here: a price is only observed once an Offer
   * runs, and none is derived from its wording (ADR-0002).
   */
  readonly nextWording: string | null;
  readonly nextStartsOn: string | null;
  /** Which Ingredient the Product is (#14), or null when it is no single one. */
  readonly ingredient: string | null;
  readonly variant: string | null;
  readonly form: string | null;
  /** 1 biologisch, 2 huismerk: what the Preferences select on. */
  readonly flags: number;
  /**
   * The Unit Price in the Ingredient's own Comparison Unit, converted where
   * the vocabulary states how (a courgette is about 0.3 kg); null when it
   * cannot be, and then the Product is no comparison candidate for it.
   */
  readonly ingredientUnitPriceCents: number | null;
  /** The pack in the Ingredient's Comparison Unit, likewise. */
  readonly ingredientPack: number | null;
  /**
   * The lowest price paid in the days recorded before its Offer began, and
   * how many days that is (#18): added by scripts/apply-history.ts, null
   * when nothing can be claimed or the catalogue has no history yet.
   */
  readonly referenceLowCents: number | null;
  readonly referenceDays: number | null;
}

/** The columns scripts/catalogue-from-db.ts writes, in order. */
export const COLUMNS = [
  "ref", "name", "packaging", "packQuantity", "packUnit", "comparisonUnit", "shelfPriceCents", "offerPriceCents",
  "unitPriceCents", "offerWording", "offerEndsOn", "nextWording", "nextStartsOn", "ingredient", "variant", "form",
  "flags", "ingredientUnitPriceCents", "ingredientPack",
] as const satisfies readonly (keyof CatalogueProduct)[];

/** The columns scripts/apply-history.ts appends. */
export const HISTORY_COLUMNS = ["referenceLowCents", "referenceDays"] as const satisfies readonly (keyof CatalogueProduct)[];

export type Row = readonly unknown[];

export interface CatalogueChain {
  readonly id: string;
  readonly name: string;
  readonly kind?: string;
  /** The Store priced, for a Chain that prices per Store. */
  readonly store?: string | null;
  /** The day its prices are from. */
  readonly observedAt: string | null;
  readonly catalogueSize?: number | null;
  /** Whether it put any Offers online; false means its prices are all Shelf Prices (Vomar). */
  readonly offers?: boolean;
  /** False for a Chain that publishes no EANs (Dirk). */
  readonly eans?: boolean;
  /** True for a Chain whose only prices online are its Offers (Lidl). */
  readonly offersOnly?: boolean;
  /** The card counted as held, when an Offer today needs it. */
  readonly card?: string | null;
}

export interface CatalogueIngredient {
  readonly id: string;
  readonly name: string;
  readonly unit: ComparisonUnit;
  readonly also: readonly string[];
  readonly equals: Readonly<Partial<Record<ComparisonUnit, number>>>;
  readonly variants: readonly { readonly id: string; readonly name: string }[];
  readonly fresh: boolean;
  readonly aisle?: string | undefined;
}

export interface CatalogueExact {
  readonly id: string;
  readonly name: string;
  readonly members: Readonly<Record<string, string>>;
  readonly likely: Readonly<Record<string, string>>;
}

export interface Catalogue {
  readonly generatedAt?: string;
  readonly chains: readonly CatalogueChain[];
  readonly columns: readonly string[];
  readonly vocabulary: readonly CatalogueIngredient[];
  readonly catalogue: Readonly<Record<string, readonly Row[]>>;
  readonly exact?: readonly CatalogueExact[];
  /** Differences over 70% looked at and found real (#36). */
  readonly checked?: readonly { readonly chain: string; readonly ref: string; readonly ingredient: string }[];
}

/** A Product as a row in `columns`' order; a column the Product lacks is null. */
export function toRow(p: Partial<CatalogueProduct>, columns: readonly string[] = COLUMNS): unknown[] {
  return columns.map((c) => (p as Record<string, unknown>)[c] ?? null);
}

/**
 * A Chain's Products, read by column name. A column the catalogue does not
 * have (one built before history, say) reads as null.
 */
export function productsOf(c: Pick<Catalogue, "columns" | "catalogue">, chainId: string): CatalogueProduct[] {
  const index = c.columns.map((name, i) => [name, i] as const);
  return (c.catalogue[chainId] ?? []).map((r) => {
    const p: Record<string, unknown> = { referenceLowCents: null, referenceDays: null };
    for (const [name, i] of index) p[name] = r[i] ?? null;
    return p as unknown as CatalogueProduct;
  });
}

/**
 * The catalogue with columns appended to every row, their values per
 * Product: how scripts/apply-history.ts adds what only history knows.
 */
export function withColumns<C extends Catalogue>(c: C, names: readonly string[], valuesOf: (p: CatalogueProduct, chainId: string) => readonly unknown[]): C {
  const catalogue = Object.fromEntries(Object.keys(c.catalogue).map((chainId) => {
    const products = productsOf(c, chainId);
    return [chainId, c.catalogue[chainId]!.map((r, i) => [...r, ...valuesOf(products[i]!, chainId)])];
  }));
  return { ...c, columns: [...c.columns, ...names], catalogue };
}

const ASSIGNMENT = "window.CATALOGUE =";

/** Reads the `window.CATALOGUE = {...};` script the basket page loads. */
export function parseCatalogueScript(text: string): Catalogue {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (!text.includes(ASSIGNMENT) || start < 0 || end < start) {
    throw new Error("not a catalogue script: no window.CATALOGUE assignment");
  }
  return JSON.parse(text.slice(start, end + 1)) as Catalogue;
}

/** The script the basket page loads, under a comment saying what wrote it. */
export function catalogueScript(c: Catalogue, writtenBy: string): string {
  return `// Generated by ${writtenBy}. Do not edit.\n${ASSIGNMENT} ${JSON.stringify(c)};\n`;
}
