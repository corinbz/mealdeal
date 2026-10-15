/**
 * The Chain's own shelf as a second opinion on which Ingredient a Product is.
 *
 * Each Chain files its Products on shelves of its own ("Zuivel > Yoghurt >
 * Griekse yoghurt"), and most of a shelf's mapped Products are usually one
 * Ingredient. Against that:
 *
 *   - odd: a Product mapped to an Ingredient its shelf hardly holds, on a
 *     shelf that is mostly one other thing, such as a chocolate bar mapped to
 *     noten on a chocolate shelf. Often a wrong match, sometimes the Chain's
 *     own misfiling (Hoogvliet keeps Milka bars among the ice creams).
 *   - suggested: unmapped Products on a shelf that is nearly all one
 *     Ingredient, such as eiwit on an egg shelf, likely that Ingredient.
 *
 * Only reported, never applied: a shelf also holds what goes with its
 * Ingredient (wraps beside the tortillas, dip beside the chips).
 */

export interface ShelvedProduct {
  readonly chainId: string;
  readonly ref: string;
  readonly name: string;
  /** The Chain's category path, the deepest it gives. */
  readonly shelf: string;
  readonly ingredient: string | null;
  /** It has a Verdict (verdicts.ts): counted on its shelf, never listed. */
  readonly checked?: boolean;
}

export interface ShelfOpinion {
  readonly chainId: string;
  readonly shelf: string;
  /** The Ingredient most of the shelf's mapped Products are. */
  readonly ingredient: string;
  /** Its share of the shelf's mapped Products. */
  readonly share: number;
  readonly mapped: number;
  /** Mapped to an Ingredient the shelf hardly holds: Product name and its Ingredient. */
  readonly odd: readonly { readonly name: string; readonly ingredient: string }[];
  /** Unmapped, on a shelf nearly all one Ingredient. */
  readonly suggested: readonly string[];
}

export interface ShelfOptions {
  /** A shelf says something only with this many mapped Products. */
  readonly minMapped: number;
  /** Mostly one Ingredient, for an odd one out to count. */
  readonly oddShelf: number;
  /** An Ingredient this rare on such a shelf, and on at most two of its Products, is odd. */
  readonly oddShare: number;
  /** Nearly all one Ingredient, for an unmapped Product to be suggested it. */
  readonly suggestShelf: number;
  /** And at least this share of the shelf mapped at all: a shelf mostly unmapped holds other things. */
  readonly suggestMapped: number;
}

export const SHELF_DEFAULTS: ShelfOptions = { minMapped: 8, oddShelf: 0.6, oddShare: 0.1, suggestShelf: 0.85, suggestMapped: 0.5 };

export function assessShelves(products: readonly ShelvedProduct[], options: ShelfOptions = SHELF_DEFAULTS): ShelfOpinion[] {
  const shelves = new Map<string, ShelvedProduct[]>();
  for (const p of products) {
    if (!p.shelf) continue;
    const k = p.chainId + "\u0000" + p.shelf;
    (shelves.get(k) ?? shelves.set(k, []).get(k)!).push(p);
  }
  const out: ShelfOpinion[] = [];
  for (const ps of shelves.values()) {
    const mapped = ps.filter((p) => p.ingredient !== null);
    if (mapped.length < options.minMapped) continue;
    const counts = new Map<string, number>();
    for (const p of mapped) counts.set(p.ingredient!, (counts.get(p.ingredient!) ?? 0) + 1);
    const [ingredient, top] = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]!;
    const share = top / mapped.length;
    const odd = share < options.oddShelf ? [] : mapped
      .filter((p) => { const n = counts.get(p.ingredient!)!; return !p.checked && n <= 2 && n / mapped.length < options.oddShare; })
      .map((p) => ({ name: p.name, ingredient: p.ingredient! }));
    const suggested = share >= options.suggestShelf && mapped.length / ps.length >= options.suggestMapped
      ? ps.filter((p) => p.ingredient === null && !p.checked).map((p) => p.name) : [];
    if (odd.length || suggested.length) out.push({ chainId: ps[0]!.chainId, shelf: ps[0]!.shelf, ingredient, share, mapped: mapped.length, odd, suggested });
  }
  return out.sort((a, b) => a.chainId.localeCompare(b.chainId) || a.shelf.localeCompare(b.shelf));
}
