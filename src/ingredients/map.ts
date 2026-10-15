/**
 * Which Ingredient a Product is (#14), and which Variant, form and
 * Preferences. A Product that is not one food, such as a ready meal, maps to
 * none, and that is counted rather than forced.
 */

import { words as reading } from "../page.ts";
import { aisleOf, formOf, type Aisle, type Form } from "./aisles.ts";
import { ASPECTS, VOCABULARY, type IngredientDef, type VariantDef } from "./vocabulary.ts";

export interface MappableProduct {
  readonly chainId: string;
  readonly name: string;
  readonly brand: string | null;
  readonly categories: readonly string[];
}

export interface Mapping {
  readonly ingredient: string;
  /** Its Variant in each aspect it names one in, joined by "+" in aspect order ("grieks+10%+aardbei"). */
  readonly variant: string | null;
  readonly form: Form | null;
  readonly biologisch: boolean;
  readonly huismerk: boolean;
}

/** Each Chain's own brand, for the huismerk Preference. */
const OWN_BRAND: Readonly<Record<string, RegExp>> = {
  dirk: /^(1 de beste|dirk)\b/i,
  jumbo: /^jumbo\b/i,
  // Vomar's own label and the Superunie lines it sells as its own: the
  // cheapest of each kind on its shelves is G'woon, not "Vomar".
  vomar: /^(vomar|g'woon|melkan|daily chef)\b|^bio\+/i,
  // PLUS and its own lines (PLUS Boerentrots, Biologisch PLUS, "Uit de
  // keuken van PLUS"), and the Superunie lines it shares with Vomar.
  plus: /^(biologisch )?plus\b|^uit de keuken van\b|^melkan\b|^bio\+/i,
  // Hoogvliet's own label, and the Superunie lines it sells as its own, as
  // Vomar does (Bonbébé is Superunie's baby food).
  hoogvliet: /^(hoogvliet|g'woon|melkan|daily chef|bonb[ée]b[ée])\b|^bio\+/i,
  // DekaMarkt's own labels (DekaVers, Deka's keuken, Altijd handig), Dirk's
  // 1 de Beste from the same group, and the Superunie lines, as at Hoogvliet.
  dekamarkt: /^(dekamarkt|dekavers|deka's keuken|1 de beste|altijd handig|g'woon|melkan|daily chef|bonb[ée]b[ée])\b|^bio\+/i,
  // Aldi sells mostly its own labels: those on its "ALDI merken" shelf
  // (2026-10-14), and the ones it sells beside them, chiefly non-food.
  aldi: /^(aldi|albona|all seasons|asia green garden|barissimo|bellasan|bio|biscotto|bon-ri|cachet|choceur|cucina|daylicious|de afbakker|de hete ketel|de kruiden ?company|dentitex|fair|fresh (&|and) free|golden (bridge|power|seafood)|goud.gebakken|gourmet|grandessa|heerlijck banket|helaes|hofstee de drie eiken|juliet|kaapse (pracht|kracht)|kiekeboe|lacura|le gusto|lyttos|mama mancini|mamia|milsani|molenland|moser roth|mucci|my vay|party gebak|potato king|power force|quellbrunn|rio d ?'oro|river|romeo|satessa|schultenbr[äa]u|snack fan|solo|sun snacks|sweet.land|tandil|trader joe's|triangle pharma|trophy smaakmakers|una|westmin(i)?ster|home creation|tesoros del sur|lily & dan|crofton|gardenline|ambiano|casalux|crane|workzone|ferrex|topcraft|adventuridge|up2fashion|toylino|novitesse|ride\+go|finest bakery|lekker & snel)\b/i,
  // Lidl sells mostly its own lines, each under a name of its own.
  lidl: /^(lidl|milbona|combino|kania|lupilu|cien|w5|deluxe|bellarom|sondey|belbake|chef select|floralys|trattoria alfredo|pilos|solevita|freeway|vitasia|crownfield|snack day|alesto|fin carr[ée]|saskia|maribel|favorina|dulano|golden seafood|ocean sea|nixe|baresa|italiamo|eridanous|mcennedy|perlenbacher|envia|formil|ryneczek lidla|maître jean.pierre|maitre jean.pierre)\b/i,
};

/** Whether a Product is its Chain's own brand, mapped to an Ingredient or not. */
export function isOwnBrand(chainId: string, brand: string | null, name: string): boolean {
  return OWN_BRAND[chainId]?.test(brand ?? name) ?? false;
}

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
    phrases: def.words.filter((w) => w.includes(" ")).map((w) => w.toLowerCase().replace(JOINERS, " ")),
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

/** The parts of a Product's category paths but the first, which only names the department. */
const shelvesOf = (categories: readonly string[]) => categories.flatMap((c) => c.split(/\s*>\s*/).slice(1));

/** Whether a Product is filed on a shelf its Ingredient never is. */
const offShelf = (def: IngredientDef, shelves: readonly string[]) => !!def.notShelf && shelves.some((s) => def.notShelf!.test(s));

const BRAND_NOT_FOOD = /^(gouda's glorie|bolletje|kips)\b(?=\s+\S)/;

/**
 * What a name or brand says about how a Product is kept, where the Chain's
 * category does not: Hoogvliet and Plus file Vis Marine, a frozen brand,
 * beside fresh fish, and Jumbo its tinned mackerel among the tapas.
 */
const FROZEN = /\b(diepvries|bevroren|vis marine)\b/;
const TINNED = /\bin [\p{L} ]*?(olie|olijfolie|zonnebloemolie|water|tomatensaus|pekel)\b|\bgebroken\b|\bop [\p{L} ]*?siroop\b/u;

const ELSEWHERE: ReadonlySet<Aisle> = new Set(["readymeal", "baby", "pet", "nonfood"]);
/** Aisles no twin elsewhere can lend a food to. */
const NOT_FOOD: ReadonlySet<Aisle> = new Set(["baby", "pet", "nonfood"]);
/**
 * Where a Product with no category at all may be: any food aisle but those.
 * Aldi files its weekly action articles under "offer" alone (over a thousand
 * of them, mostly food), and others only under its seasonal range, so the name decides, and its form is the
 * Ingredient's main aisle unless the name says frozen or tinned.
 */
const ANY_FOOD: ReadonlySet<Aisle> = new Set<Aisle>(["produce", "meat", "fish", "vega", "dairy", "cheese", "deli", "bakery", "pantry", "conserves", "frozen", "drinks", "snacks"]);

/** Words after which a name goes on about something else: "X met Y". */
const JOINER = /\s(?:met|with|in|op|zonder|minder)\s/;
const JOINERS = new RegExp(JOINER.source, "g");

/**
 * A Product's Variants, one per aspect. Spaces around the name, so a word
 * written "vol " also ends one ("Yoghurt Vol") and " ui " starts one.
 */
export function variantOf(def: IngredientDef, lower: string): string | null {
  const text = " " + lower + " ";
  // Where a Variant's word first occurs; a flavour's only at the start of a
  // word, so "sinaasappel" is not appel, though "perzikyoghurt" is perzik.
  const first = (w: string, start: boolean) => {
    for (let i = text.indexOf(w); i >= 0; i = text.indexOf(w, i + 1)) if (!start || w.startsWith(" ") || !/\p{L}/u.test(text[i - 1]!)) return i;
    return Infinity;
  };
  const at = (v: VariantDef) => Math.min(...v.words.map((w) => first(w.toLowerCase(), v.aspect === "smaak")));
  const ids = ASPECTS.flatMap((a) => {
    const vs = def.variants.filter((v) => (v.aspect ?? "soort") === a);
    // A flavour is the one named first ("perzik passievrucht" is perzik);
    // otherwise the first in the vocabulary's order that the name gives.
    const named = a === "smaak"
      ? vs.filter((v) => at(v) < Infinity).sort((x, y) => at(x) - at(y))[0]
      : vs.find((v) => at(v) < Infinity);
    const v = named ?? vs.find((x) => x.fallback);
    return v ? [v.id] : [];
  });
  return ids.length ? ids.join("+") : null;
}

/**
 * Whether a Product may be an Ingredient it does not map to by name, as its
 * twins at other Chains say (borrow.ts): only if nothing in its own name
 * rules it out, and it is not filed as baby food, pet food or non-food the
 * Ingredient is not. Its aisle is not asked otherwise: a Chain's odd shelf
 * (Hoogvliet's sugar among the coffee) is often why its name did not map.
 */
export function createAllows(vocabulary: readonly IngredientDef[] = VOCABULARY) {
  const defs = new Map(vocabulary.map((d) => [d.id, d]));
  return function allows(product: MappableProduct, ingredient: string): boolean {
    const def = defs.get(ingredient);
    if (!def) return false;
    const aisles = product.categories.map(aisleOf);
    const lower = product.name.toLowerCase();
    const raw = lower.split(/[^\p{L}0-9%']+/u).filter(Boolean);
    return aisles.every((a) => !a || !NOT_FOOD.has(a) || def.aisles.includes(a))
      && !def.not.some((n) => excludes(n, lower, raw)) && !offShelf(def, shelvesOf(product.categories));
  };
}

/** Where a Product is filed, and its name as the mapper reads it. */
function readProduct(product: MappableProduct): { uncategorized: boolean; aisles: ReadonlySet<Aisle>; lower: string } {
  // Aldi's seasonal range and its brand pages say nothing of the aisle either.
  const uncategorized = product.categories.every((c) => /^(speciaal assortiment|aldi merken)\b/i.test(c));
  const aisles = uncategorized ? ANY_FOOD : new Set(product.categories.map(aisleOf).filter((a): a is Aisle => a !== null));
  // Hoogvliet leaves the brand out of a name, so "Met Roomboter" is Becel's
  // margarine with butter: a name starting with what it has is the brand's.
  const lower = (product.chainId === "hoogvliet" && /^(met|zonder|minder)\s/i.test(product.name) && product.brand ? product.brand + " " + product.name : product.name).toLowerCase();
  return { uncategorized, aisles, lower };
}

/** How a name or brand says a Product is kept, where its aisle may not. */
function said(def: IngredientDef, product: MappableProduct, lower: string): Form | null {
  // Only for an Ingredient that is sold tinned at all: mozzarella in water is fresh.
  return FROZEN.test(lower) || FROZEN.test((product.brand ?? "").toLowerCase()) ? "diepvries"
    : def.aisles.includes("conserves") && TINNED.test(lower) ? "conserven" : null;
}

/** A Product as one Ingredient: its Variants, form and Preferences. */
function mappingFor(product: MappableProduct, def: IngredientDef, aisles: ReadonlySet<Aisle>, lower: string, uncategorized: boolean): Mapping {
  // Filed under several aisles, the kept one decides the form: Hak's
  // carrots sit in Groente too, but they are in a jar. Filed nowhere the
  // Ingredient is (a Verdict can say so), its main aisle does.
  const filed = uncategorized ? [] : [...aisles].filter((a) => def.aisles.includes(a));
  const kept = filed.length ? filed : [def.aisles[0]!];
  const aisle = kept.find((a) => formOf(a) === "conserven" || formOf(a) === "diepvries") ?? kept[0]!;
  return {
    ingredient: def.id,
    variant: variantOf(def, lower),
    form: said(def, product, lower) ?? formOf(aisle),
    biologisch: /\bbio(logisch|logische)?\b/.test(lower) || product.categories.some((c) => /biologisch/i.test(c)),
    huismerk: isOwnBrand(product.chainId, product.brand, product.name),
  };
}

/**
 * A Product as an Ingredient it was found to be by looking (a Verdict),
 * whatever its name says: its Variants, form and Preferences read as the
 * mapper would read them for that Ingredient.
 */
export function createMappingAs(vocabulary: readonly IngredientDef[] = VOCABULARY) {
  const defs = new Map(vocabulary.map((d) => [d.id, d]));
  return function mappingAs(product: MappableProduct, ingredient: string): Mapping {
    const def = defs.get(ingredient);
    if (!def) throw new Error(`no Ingredient ${ingredient}`);
    const { uncategorized, aisles, lower } = readProduct(product);
    return mappingFor(product, def, aisles, lower, uncategorized);
  };
}

export function createMapper(vocabulary: readonly IngredientDef[] = VOCABULARY) {
  const compiled = compile(vocabulary);
  const joined = vocabulary.flatMap((d) => d.words).map((w) => w.toLowerCase()).filter((w) => JOINER.test(w));

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
    const { uncategorized, aisles, lower } = readProduct(product);
    if (!aisles.size) return null;
    // "X met Y", "X in olijfolie", "X op siroop": only what comes before can
    // name the Product. A dish named after X is not X.
    // "Zalm gerookt minder zout": what something is without, or with less
    // of, does not name it either.
    // A brand that names a food it is not: Gouda's Glorie makes margarine,
    // Bolletje rusks and crackers, Kips paté.
    // A vocabulary phrase spanning one of those words ("doperwtjes met
    // worteltjes") names one thing, so the name is not cut inside it.
    // How it is sold ("per bak", "per stuk") names nothing: "bak" is not a thing.
    let text = lower.replace(BRAND_NOT_FOOD, "").replace(/\bper (bak|bakje|stuk|stuks|kilo|kg|doos|zak|bos|pot|tros|schaal)\b/g, "").trim();
    for (const p of joined) text = text.replaceAll(p, p.replace(JOINERS, " "));
    const head = text.split(JOINER)[0]!;
    const written = head.split(/\s+/);
    // "Avocado's" is avocados: the apostrophe of a Dutch plural is not a
    // break between two words, or the word would never end with "avocado".
    const names = written.map((w) => reading.nameWords(w.replace(/['’]/g, "")).join(""));
    const raw = lower.replace(BRAND_NOT_FOOD, "").split(/[^\p{L}0-9%']+/u).filter(Boolean);

    const owned = owners(head, names, written);
    const shelves = shelvesOf(product.categories);
    const fits = (c: Compiled) => [...aisles].some((a) => c.aisles.has(a))
      // Filed with ready meals, baby food or pet food anywhere, a Product
      // is that, whatever other aisle it also sits in.
      && [...aisles].every((a) => !ELSEWHERE.has(a) || c.aisles.has(a))
      && !ruledOut(c);
    // A food other things are named after that this Product is not, such as
    // chocolade in "Vla chocolade", is only its flavour, so names no second
    // thing; nor does one whose own words rule this Product out ("Pastasaus
    // ricotta", "Sriracha mayonaise"), or whose shelf does ("Twix Hazelnoot"
    // among the chocolate).
    function ruledOut(c: Compiled): boolean {
      return c.def.not.some((n) => excludes(n, lower, raw)) || offShelf(c.def, shelves);
    }
    const flavour = (cs: Compiled[]) => cs.every((c) => (c.def.wins && !fits(c)) || ruledOut(c));
    // Words owned by the same Ingredients are one thing named twice ("Kanzi
    // Appels"); words owned by different ones name a mix, which maps to a mix
    // Ingredient if it names one, and otherwise to no single Ingredient.
    const things = [...new Map(owned.filter((cs) => cs.length && !flavour(cs)).map((cs) => [cs.map((c) => c.def.id).sort().join("|"), cs])).values()];
    const named = things.flat();
    // "Pizza salami" is a pizza, not a mix of pizza and salami.
    const winners = named.filter((c) => c.def.wins && fits(c));
    // "Skyr perzik", "Yoghurt kers": a word naming one of its own flavours is
    // that flavour, though perzik or kersen are Ingredients too.
    const tastes = (c: Compiled, i: number) => c.def.variants.some((v) => v.aspect === "smaak" && v.words.some((w) => written[i]!.includes(w.trim().toLowerCase())));
    const flavoured = things.length > 1 ? named.filter((c) => fits(c) && owned.every((cs, i) => !cs.length || cs.includes(c) || tastes(c, i))) : [];
    const candidates = winners.length ? winners : flavoured.length ? flavoured : things.length > 1 ? named.filter((c) => c.def.mix) : named;
    // The rightmost word names the kind in Dutch.
    const at = (c: Compiled) => owned.findLastIndex((cs) => cs.includes(c));
    const byName = candidates.sort((a, b) => at(b) - at(a)).find(fits);
    // A shelf that holds one thing outranks a name that gives only a flavour
    // or nothing at all, but not a name that says what kind of thing it is.
    const shelved = byName?.def.wins ? undefined : compiled.find((c) => c.def.shelf && shelves.some((s) => c.def.shelf!.test(s)) && fits(c));
    const chosen = shelved ?? byName;
    if (!chosen) return null;

    // Aldi's All Seasons is frozen or tinned, never fresh: with no category to
    // say which, only the name can.
    if (uncategorized && !said(chosen.def, product, lower) && /^all seasons$/i.test(product.brand ?? "")) return null;
    return mappingFor(product, chosen.def, aisles, lower, uncategorized);
  };
}
