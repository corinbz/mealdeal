/**
 * Which Ingredient a Product is (#14), and which Variant, form and
 * Preferences. A Product that is not one food, such as a ready meal, maps to
 * none, and that is counted rather than forced.
 */

import { words as reading } from "../words.ts";
import { aisleOf, formOf, type Aisle, type Form } from "./aisles.ts";
import { VOCABULARY, type IngredientDef } from "./vocabulary.ts";

export interface MappableProduct {
  readonly chainId: string;
  readonly name: string;
  readonly brand: string | null;
  readonly categories: readonly string[];
}

export interface Mapping {
  readonly ingredient: string;
  readonly variant: string | null;
  readonly form: Form | null;
  readonly biologisch: boolean;
  readonly huismerk: boolean;
}

/** Each Chain's own brand, for the huismerk Preference. */
const OWN_BRAND: Readonly<Record<string, RegExp>> = {
  dirk: /^(1 de beste|dirk)\b/i,
  jumbo: /^jumbo\b/i,
};

interface Compiled {
  readonly def: IngredientDef;
  readonly aisles: ReadonlySet<Aisle>;
  /** Single words, stemmed; several-word phrases are matched as text. */
  readonly stems: readonly string[];
  /** Words matched unstemmed, at the end of a word as written. */
  readonly exact: readonly string[];
  readonly phrases: readonly string[];
}

function compile(vocabulary: readonly IngredientDef[]): Compiled[] {
  return vocabulary.map((def) => ({
    def,
    aisles: new Set(def.aisles),
    stems: def.words.filter((w) => !w.includes(" ") && !w.startsWith("=")).map((w) => reading.nameWords(w).join("")).filter(Boolean),
    exact: def.words.filter((w) => w.startsWith("=")).map((w) => w.slice(1)),
    phrases: def.words.filter((w) => w.includes(" ")).map((w) => w.toLowerCase()),
  }));
}

/**
 * Whether an exclusion applies. A single word must start or end a word of the
 * name, not merely occur in it: "sap" rules out appelsap, but sinaasappel
 * contains it too. A phrase is matched as text.
 */
function excludes(term: string, lower: string, raw: readonly string[]): boolean {
  if (/[\s%]/.test(term)) return lower.includes(term);
  return raw.some((w) => {
    const stemmed = reading.nameWords(w).join("");
    return w.startsWith(term) || w.endsWith(term) || stemmed.endsWith(term);
  });
}

const ELSEWHERE: ReadonlySet<Aisle> = new Set(["readymeal", "baby", "pet", "nonfood"]);

export function createMapper(vocabulary: readonly IngredientDef[] = VOCABULARY) {
  const compiled = compile(vocabulary);

  /**
   * Which Ingredients each word of a name belongs to, across the whole
   * vocabulary and regardless of aisle: those with the longest Ingredient word
   * it ends with. So "aardappel" belongs to aardappelen even in an aisle where
   * only appels are sold, and is never taken for appel. Ingredients tied on one
   * word (gehakt and vegetarisch gehakt) all own it, and the aisle decides.
   * A word of three letters or fewer must match whole: "ui" is not the end
   * of "slagerhuis".
   */
  function owners(head: string, names: readonly string[], written: readonly string[]): Compiled[][] {
    const best = names.map(() => ({ length: 0, cs: [] as Compiled[] }));
    const claim = (i: number, c: Compiled, length: number) => {
      const b = best[i]!;
      if (length > b.length) { b.length = length; b.cs = [c]; }
      else if (length === b.length && !b.cs.includes(c)) b.cs.push(c);
    };
    for (const c of compiled) {
      names.forEach((n, i) => {
        for (const s of c.stems) if (s.length > 3 ? n.endsWith(s) : n === s) claim(i, c, s.length);
        for (const e of c.exact) if (written[i]!.endsWith(e)) claim(i, c, e.length);
      });
      for (const p of c.phrases) {
        const at = head.indexOf(p);
        if (at < 0) continue;
        // A phrase claims every word it covers, outranking single words.
        const first = head.slice(0, at).split(/\s+/).filter(Boolean).length;
        const count = p.split(/\s+/).length;
        for (let i = first; i < first + count && i < names.length; i++) claim(i, c, 100 + p.length);
      }
    }
    return best.map((b) => b.cs);
  }

  return function map(product: MappableProduct): Mapping | null {
    const aisles = new Set(product.categories.map(aisleOf).filter((a): a is Aisle => a !== null));
    if (!aisles.size) return null;
    const lower = product.name.toLowerCase();
    // "X met Y", "X in olijfolie", "X op siroop": only what comes before can
    // name the Product. A dish named after X is not X.
    // "Zalm gerookt minder zout": what something is without, or with less
    // of, does not name it either.
    const head = lower.split(/\s(?:met|with|in|op|zonder|minder)\s/)[0]!;
    const written = head.split(/\s+/);
    const names = written.map((w) => reading.nameWords(w).join(""));
    const raw = lower.split(/[^\p{L}0-9%']+/u).filter(Boolean);

    const owned = owners(head, names, written);
    // Words owned by the same Ingredients are one thing named twice ("Kanzi
    // Appels"); words owned by different ones name a mix, which maps to a mix
    // Ingredient if it names one, and otherwise to no single Ingredient.
    const things = [...new Map(owned.filter((cs) => cs.length).map((cs) => [cs.map((c) => c.def.id).sort().join("|"), cs])).values()];
    const named = things.flat();
    const candidates = things.length > 1 ? named.filter((c) => c.def.mix) : named;
    // The rightmost word names the kind in Dutch.
    const at = (c: Compiled) => owned.findLastIndex((cs) => cs.includes(c));
    const chosen = candidates
      .sort((a, b) => at(b) - at(a))
      .find((c) => [...aisles].some((a) => c.aisles.has(a))
        // Filed with ready meals, baby food or pet food anywhere, a Product
        // is that, whatever other aisle it also sits in.
        && [...aisles].every((a) => !ELSEWHERE.has(a) || c.aisles.has(a))
        && !c.def.not.some((n) => excludes(n, lower, raw)));
    if (!chosen) return null;

    const def = chosen.def;
    const variant = def.variants.find((v) => v.words.some((w) => lower.includes(w.toLowerCase())))
      ?? def.variants.find((v) => v.fallback) ?? null;
    // Filed under several aisles, the kept one decides the form: Hak's
    // carrots sit in Groente too, but they are in a jar.
    const kept = [...aisles].filter((a) => chosen.aisles.has(a));
    const aisle = kept.find((a) => formOf(a) === "conserven" || formOf(a) === "diepvries") ?? kept[0]!;
    return {
      ingredient: def.id,
      variant: variant?.id ?? null,
      form: formOf(aisle),
      biologisch: /\bbio(logisch|logische)?\b/.test(lower) || product.categories.some((c) => /biologisch/i.test(c)),
      huismerk: OWN_BRAND[product.chainId]?.test(product.brand ?? product.name) ?? false,
    };
  };
}
