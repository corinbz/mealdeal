/**
 * An unmapped Product borrows the Ingredient of its EAN twin (#34).
 *
 * The same trade item is often named or filed differently by each Chain, so
 * one copy maps to an Ingredient and another to none. When a shared EAN
 * proves they are one item (ADR-0006), the unmapped copy is that Ingredient
 * too. Only EAN-proven members count, never a Product only likely the same,
 * so a Chain publishing no EANs (Dirk) never borrows. Twins that map to
 * different Ingredients prove a mapping wrong somewhere, and nothing is
 * borrowed from them: they are reported instead, borrowing or not.
 */

import type { Mapping } from "../ingredients/map.ts";
import type { ExactProduct } from "./exact.ts";

/** A Product as a key: chain id and its own ref. */
export const productKey = (chainId: string, ref: string) => chainId + "\u0000" + ref;

export interface Conflict {
  /** The Exact Product's id, its lowest shared EAN. */
  readonly id: string;
  readonly name: string;
  /** Chain id to the Ingredient that Chain's copy maps to, or null. */
  readonly ingredients: Readonly<Record<string, string | null>>;
}

export interface Borrowed {
  /** Product key to the Mapping it borrowed. */
  readonly mappings: ReadonlyMap<string, Mapping>;
  readonly conflicts: readonly Conflict[];
}

/** Agreed when every mapped twin says the same; otherwise null. */
const agreed = <T>(values: readonly T[]): T | null => (new Set(values).size === 1 ? values[0]! : null);

export function borrowMappings(groups: readonly ExactProduct[], own: ReadonlyMap<string, Mapping | null>): Borrowed {
  const mappings = new Map<string, Mapping>();
  const conflicts: Conflict[] = [];
  for (const g of groups) {
    const members = Object.entries(g.members).map(([chainId, ref]) => ({ chainId, key: productKey(chainId, ref) }));
    const mapped = members.map((m) => own.get(m.key) ?? null).filter((m): m is Mapping => m !== null);
    const unmapped = members.filter((m) => !own.get(m.key));
    if (!mapped.length) continue;
    const ingredient = agreed(mapped.map((m) => m.ingredient));
    // Reported whether or not a copy is unmapped: either way one is wrong.
    if (ingredient === null) {
      conflicts.push({ id: g.id, name: g.name, ingredients: Object.fromEntries(members.map((m) => [m.chainId, own.get(m.key)?.ingredient ?? null])) });
      continue;
    }
    if (!unmapped.length) continue;
    // Variant and form only where the twins agree on them as well.
    const borrowed: Mapping = {
      ingredient,
      variant: agreed(mapped.map((m) => m.variant)),
      form: agreed(mapped.map((m) => m.form)),
      biologisch: mapped.some((m) => m.biologisch),
      // Own-brand goods never share an Exact Product (ADR-0006).
      huismerk: false,
    };
    for (const m of unmapped) mappings.set(m.key, borrowed);
  }
  return { mappings, conflicts };
}
