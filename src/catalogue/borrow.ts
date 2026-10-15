/**
 * An unmapped Product borrows the Ingredient of its twins (#34), and twins
 * that disagree are settled by a clear majority.
 *
 * The same item is often named or filed differently by each Chain, so one
 * copy maps to an Ingredient and another to none, or to another. Twins
 * (twins.ts) are joined by a shared EAN, or by brand, name and pack where a
 * Chain publishes no EANs; they only ever lend an Ingredient, never claim to
 * the shopper that two Products are the same (ADR-0006).
 *
 * When the mapped copies agree, every unmapped copy takes it. When they do
 * not, an Ingredient held by more than half of them, and by at least two,
 * decides for every copy: KitKat hazelnoot is chocolade at Hoogvliet and
 * Jumbo, so not noten at Vomar. Both are reported, the settled ones too, since
 * the minority copy names a mapping rule to look at.
 */

import type { Mapping } from "../ingredients/map.ts";

/** A Product as a key: chain id and its own ref. */
export const productKey = (chainId: string, ref: string) => chainId + "\u0000" + ref;

/** Twins, or Exact Products: one item and each Chain's copy of it. */
export interface TwinGroup {
  readonly id: string;
  readonly name: string;
  readonly members: Readonly<Record<string, string>>;
}

export interface Conflict {
  /** The group's id: its lowest shared EAN, or the words that joined it. */
  readonly id: string;
  readonly name: string;
  /** Chain id to the Ingredient that Chain's copy maps to, or null. */
  readonly ingredients: Readonly<Record<string, string | null>>;
  /** The Ingredient a majority settled it on, or null when none did. */
  readonly settled: string | null;
}

export interface Borrowed {
  /** Product key to the Mapping it borrowed, or was outvoted into. */
  readonly mappings: ReadonlyMap<string, Mapping>;
  /** Keys of mapped copies the majority overruled. */
  readonly overruled: ReadonlySet<string>;
  readonly conflicts: readonly Conflict[];
}

/** Agreed when every mapped twin says the same; otherwise null. */
const agreed = <T>(values: readonly T[]): T | null => (new Set(values).size === 1 ? values[0]! : null);

/** The Ingredient more than half the mapped copies hold, and at least two; otherwise null. */
function majority(mapped: readonly Mapping[]): string | null {
  const counts = new Map<string, number>();
  for (const m of mapped) counts.set(m.ingredient, (counts.get(m.ingredient) ?? 0) + 1);
  const [top, n] = [...counts].sort((a, b) => b[1] - a[1])[0]!;
  return n >= 2 && n * 2 > mapped.length ? top : null;
}

/**
 * `allows` says whether a copy may be the Ingredient its twins settle on: its
 * own aisle and name can rule that out, and then it keeps its own mapping.
 */
export function borrowMappings(groups: readonly TwinGroup[], own: ReadonlyMap<string, Mapping | null>, allows: (key: string, ingredient: string) => boolean = () => true): Borrowed {
  const mappings = new Map<string, Mapping>();
  const overruled = new Set<string>();
  const conflicts: Conflict[] = [];
  for (const g of groups) {
    const members = Object.entries(g.members).map(([chainId, ref]) => ({ chainId, key: productKey(chainId, ref) }));
    const mapped = members.map((m) => own.get(m.key) ?? null).filter((m): m is Mapping => m !== null);
    if (!mapped.length) continue;
    let ingredient = agreed(mapped.map((m) => m.ingredient));
    if (ingredient === null) {
      ingredient = majority(mapped);
      conflicts.push({ id: g.id, name: g.name, ingredients: Object.fromEntries(members.map((m) => [m.chainId, own.get(m.key)?.ingredient ?? null])), settled: ingredient });
      if (ingredient === null) continue;
    }
    const takers = members.filter((m) => own.get(m.key)?.ingredient !== ingredient && allows(m.key, ingredient!));
    if (!takers.length) continue;
    // Variant and form only where the copies holding it agree on them as well.
    const holding = mapped.filter((m) => m.ingredient === ingredient);
    const borrowed: Mapping = {
      ingredient,
      variant: agreed(holding.map((m) => m.variant)),
      form: agreed(holding.map((m) => m.form)),
      biologisch: holding.some((m) => m.biologisch),
      // Whether it is a Chain's own brand is the copy's own: build.ts decides.
      huismerk: false,
    };
    for (const m of takers) {
      mappings.set(m.key, borrowed);
      if (own.get(m.key)) overruled.add(m.key);
    }
  }
  return { mappings, overruled, conflicts };
}
