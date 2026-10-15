/**
 * Which Ingredient each Product in the catalogue is, all things considered,
 * and how that was decided: the one place to ask.
 *
 * A Product's own name and shelf say first (src/ingredients/map.ts). Then its
 * twins at other Chains (twins.ts) may lend it theirs when it has none, or
 * outvote it by a clear majority (borrow.ts), unless its own name or aisle
 * rules their Ingredient out. Last, a pack too small to be what the
 * Ingredient means (a party bread is not a loaf) makes it none at all.
 *
 * The catalogue build reads the outcome; a test or a script asking why a
 * Product ended up where it did reads the same outcome, with what its name
 * alone said beside it.
 */

import { createAllows, createMapper, isOwnBrand, type Mapping, type MappableProduct } from "../ingredients/map.ts";
import { VOCABULARY, type ComparisonUnit, type IngredientDef } from "../ingredients/vocabulary.ts";
import { borrowMappings, productKey, type Conflict } from "./borrow.ts";
import { groupTwins } from "./twins.ts";

export interface MappingInput extends MappableProduct {
  readonly ref: string;
  readonly eans: readonly string[];
  readonly packQuantity: number | null;
  readonly packUnit: string | null;
  /** How much one pack holds, as stated or as its price says; null when neither does. */
  readonly pack: { readonly quantity: number; readonly unit: ComparisonUnit } | null;
}

/**
 * How a Product came by its Ingredient:
 *   name       its own name and shelf
 *   twin       none of its own; its twins lent theirs
 *   outvoted   its name said another; most of its twins say this
 *   too-small  it had one, but its pack is too small to be it: none
 *   none       nothing says it is any Ingredient
 */
export type How = "name" | "twin" | "outvoted" | "too-small" | "none";

export interface Decision {
  /** Its Ingredient in the catalogue, or null. */
  readonly mapping: Mapping | null;
  readonly how: How;
  /** What its own name and shelf said, whatever was decided. */
  readonly byName: Mapping | null;
  /** One pack in the Ingredient's own unit, or null where it has none or it does not convert. */
  readonly pack: number | null;
}

export interface Mapped {
  /** The Decision for a Product given, by Chain and ref. */
  decision(chainId: string, ref: string): Decision;
  /** Twins mapped to different Ingredients, settled by a majority or not: one of them is wrong (#34). */
  readonly conflicts: readonly Conflict[];
}

/**
 * One quantity of an Ingredient in its own unit: courgette 1 piece = 0.3 kg.
 * A price per kg times 0.3 kg is the price of one courgette; a pack of
 * 0.6 kg divided by 0.3 kg is two courgettes. null where the vocabulary says
 * no such equivalence.
 */
export function inIngredientUnit(def: Pick<IngredientDef, "unit" | "equals">, perUnitOf: ComparisonUnit, quantity: number, kind: "price" | "amount"): number | null {
  if (perUnitOf === def.unit) return quantity;
  const x = def.equals[perUnitOf];
  if (!x) return null;
  return kind === "price" ? Math.round(quantity * x) : Math.round((quantity / x) * 1000) / 1000;
}

export function mapProducts(products: readonly MappingInput[], vocabulary: readonly IngredientDef[] = VOCABULARY): Mapped {
  const map = createMapper(vocabulary);
  const allows = createAllows(vocabulary);
  const defs = new Map(vocabulary.map((d) => [d.id, d]));

  const byKey = new Map<string, MappingInput>();
  const own = new Map<string, Mapping | null>();
  for (const p of products) {
    const key = productKey(p.chainId, p.ref);
    byKey.set(key, p);
    own.set(key, map(p));
  }
  // Twins are joined more widely than Exact Products, and only ever lend an
  // Ingredient to an unmapped or outvoted copy (#34).
  const borrowed = borrowMappings(groupTwins(products), own, (key, ingredient) => allows(byKey.get(key)!, ingredient));

  const decisions = new Map<string, Decision>();
  for (const [key, p] of byKey) {
    const byName = own.get(key) ?? null;
    const lent = borrowed.mappings.get(key);
    // Whether it is a Chain's own brand is the copy's own, never its twins'.
    const mapping = lent ? { ...lent, huismerk: isOwnBrand(p.chainId, p.brand, p.name) } : byName;
    const how: How = lent ? (borrowed.overruled.has(key) ? "outvoted" : "twin") : byName ? "name" : "none";
    const def = mapping ? defs.get(mapping.ingredient)! : null;
    const pack = def && p.pack ? inIngredientUnit(def, p.pack.unit, p.pack.quantity, "amount") : null;
    if (def?.smallest && p.pack && (pack ?? Infinity) < def.smallest) {
      decisions.set(key, { mapping: null, how: "too-small", byName, pack: null });
    } else {
      decisions.set(key, { mapping, how, byName, pack });
    }
  }
  return {
    decision(chainId, ref) {
      const d = decisions.get(productKey(chainId, ref));
      if (!d) throw new Error(`no Product ${chainId} ${ref} was mapped`);
      return d;
    },
    conflicts: borrowed.conflicts,
  };
}
