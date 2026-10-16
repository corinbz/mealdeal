/**
 * The starting Ingredient vocabulary (#14): everyday Ingredients, each with
 * the aisles it is sold in, the words that name it, and its Variants.
 *
 * Words are matched the way the basket page matches what a shopper types
 * (prototype/words.js): a word of the Product name must END with the
 * Ingredient's word, after stemming, because a Dutch compound names its kind
 * last. Where two Ingredients both match one word, the longer word wins, so
 * "aardappelen" is aardappelen, not appels, and "karnemelk" is not melk.
 *
 * A word starting with "=" is matched as written, without stemming, where
 * stemming would merge two Ingredients: "broodje" stems to "brood".
 *
 * Variants are matched as text in the Product name, in the order given, and
 * the first that matches wins: "halfvolle" must come before "volle". A
 * Variant marked `fallback` is given to a Product that names no other one, so
 * plain "Uien" are gele uien.
 *
 * An Ingredient's Variants may differ in several aspects, each matched on its
 * own: "Griekse yoghurt 10% aardbei" is grieks in its type, 10% in its fat and
 * aardbei in its flavour, and "Gesneden rode uien" rode in its type and
 * gesneden in its cut. A flavour is the one the name gives first, and a
 * Product naming none is naturel, where naturel is one of its flavours.
 *
 * A Variant may instead be given by how a Product is kept: a pizza filed in
 * the freezer is diepvries, whatever its name says.
 */

import type { Aisle, Form } from "./aisles.ts";

export type ComparisonUnit = "kg" | "l" | "piece";

/** What a Variant differs in. Variants of one aspect exclude each other; of different ones they combine. */
export type Aspect = "soort" | "snit" | "vet" | "smaak";
export const ASPECTS: readonly Aspect[] = ["soort", "snit", "vet", "smaak"];

export interface VariantDef {
  readonly id: string;
  /** Its aspect; "soort" when none is given. */
  readonly aspect?: Aspect;
  /** What a shopper types for it, such as "halfvolle melk". */
  readonly name: string;
  readonly words: readonly string[];
  readonly fallback?: boolean;
  /** Given to a Product kept this way, rather than by its name's words. */
  readonly form?: Form;
  /** Given to a Product filed on a shelf this matches, where its name gives none. */
  readonly shelf?: RegExp;
}

export interface IngredientDef {
  readonly id: string;
  /** What a shopper types, and what the page shows. */
  readonly name: string;
  readonly unit: ComparisonUnit;
  readonly aisles: readonly Aisle[];
  /** Words a Product name must end one of its words with. */
  readonly words: readonly string[];
  /** Other names a shopper may type for it. */
  readonly also: readonly string[];
  /** Lower-case text that rules a Product out despite matching. */
  readonly not: readonly string[];
  readonly variants: readonly VariantDef[];
  /**
   * One of this Ingredient's Comparison Unit in another unit, so a Product
   * priced in that unit still compares: a courgette is about 0.3 kg.
   */
  readonly equals: Partial<Record<ComparisonUnit, number>>;
  /**
   * Sold fresh and shelf-stable alike, and a shopper means either: no form is
   * assumed. Most chains file rookworst with the tins (Unox), and Dirk and
   * Aldi sell no other.
   */
  readonly anyForm: boolean;
  /**
   * A mix of other Ingredients sold as one (wokgroente, rauwkost). A Product
   * naming several Ingredients maps here if it names this, or to nothing.
   */
  readonly mix: boolean;
  /**
   * The smallest pack, in this Ingredient's unit, that still counts as it: a
   * Product sold smaller is something else to a shopper, as a party bread or a
   * 400 g roggebrood is not a loaf. None when any size will do.
   */
  readonly smallest?: number;
  /**
   * Named with what it holds or tastes of, and still this: "Pizza salami",
   * "Paprika chips", "Tomatensoep met balletjes". A Product naming it is it,
   * whatever other Ingredient it also names, where it would otherwise be a mix.
   */
  readonly wins?: boolean;
  /**
   * A Chain's shelf that holds only this, matched against each part of a
   * category path but the first: what is filed there is this, even where its
   * name gives only the flavour ("Ola Festini Peer" on "IJs > Handijs").
   */
  readonly shelf?: RegExp;
  /**
   * A Chain's shelf this never is, matched the same way: filed there, a
   * Product naming it only tastes of it, as a hazelnut chocolate bar is not
   * noten, nor a chocolate biscuit chocolade.
   */
  readonly notShelf?: RegExp;
}

/**
 * Flavours an Ingredient may come in, each with the words that name it in a
 * Product name (Dutch and English alike, as both are on Dutch shelves), the
 * word that names it on the page, and in English. Two-flavour words first
 * ("kaas-ui" before kaas); a fruit inside another's name after it
 * (sinaasappel, granaatappel before appel).
 */
export const FLAVOURS: Readonly<Record<string, { nl: string; en: string; words: readonly string[] }>> = {
  naturel: { nl: "naturel", en: "plain", words: ["naturel", "natural", "plain", "gezouten", "salted", "zeezout", "sea salt"] },
  "kaas-ui": { nl: "kaas-ui", en: "cheese and onion", words: ["kaas-ui", "kaas ui", "kaas & ui", "kaas en ui", "cheese & onion", "cheese and onion", "cheese onion"] },
  "zout-azijn": { nl: "zout en azijn", en: "salt and vinegar", words: ["salt & vinegar", "salt and vinegar", "zout & azijn", "zout en azijn", "azijn"] },
  aardbei: { nl: "aardbei", en: "strawberry", words: ["aardbei", "strawberr"] },
  framboos: { nl: "framboos", en: "raspberry", words: ["framboos", "frambozen", "raspberr"] },
  kers: { nl: "kers", en: "cherry", words: ["kers ", "kersen", "cherry", "cherries"] },
  bosvruchten: { nl: "bosvruchten", en: "forest fruit", words: ["bosvrucht", "bosbes", "blauwe bes", "rood fruit", "rode vrucht", "forest fruit", "red fruit"] },
  cassis: { nl: "cassis", en: "blackcurrant", words: ["cassis", "zwarte bes", "blackcurrant"] },
  grenadine: { nl: "grenadine", en: "grenadine", words: ["grenadine"] },
  perzik: { nl: "perzik", en: "peach", words: ["perzik", "peach"] },
  mango: { nl: "mango", en: "mango", words: ["mango"] },
  passievrucht: { nl: "passievrucht", en: "passion fruit", words: ["passievrucht", "maracuja", "passion"] },
  sinaasappel: { nl: "sinaasappel", en: "orange", words: ["sinaasappel", "orange"] },
  appel: { nl: "appel", en: "apple", words: ["appel", "apple"] },
  peer: { nl: "peer", en: "pear", words: ["peer ", "peren", "pear"] },
  banaan: { nl: "banaan", en: "banana", words: ["banaan", "banana"] },
  citroen: { nl: "citroen", en: "lemon", words: ["citroen", "lemon"] },
  limoen: { nl: "limoen", en: "lime", words: ["limoen", " lime"] },
  multivruchten: { nl: "multivruchten", en: "mixed fruit", words: ["multivrucht", "multifruit", "tropical", "tropisch", "tropische"] },
  kokos: { nl: "kokos", en: "coconut", words: ["kokos", "coconut"] },
  vanille: { nl: "vanille", en: "vanilla", words: ["vanille", "vanilla"] },
  chocolade: { nl: "chocolade", en: "chocolate", words: ["chocola", "choco", "chocolate", "cacao"] },
  stracciatella: { nl: "stracciatella", en: "stracciatella", words: ["stracciatella"] },
  karamel: { nl: "karamel", en: "caramel", words: ["karamel", "caramel"] },
  cookie: { nl: "cookie", en: "cookie", words: ["cookie"] },
  pistache: { nl: "pistache", en: "pistachio", words: ["pistache", "pistachio"] },
  koffie: { nl: "koffie", en: "coffee", words: ["koffie", "mokka", "mocca", "coffee"] },
  honing: { nl: "honing", en: "honey", words: ["honing", "honey"] },
  paprika: { nl: "paprika", en: "paprika", words: ["paprika"] },
  kaas: { nl: "kaas", en: "cheese", words: ["kaas", "cheese", "cheddar"] },
  ui: { nl: "ui", en: "onion", words: [" ui ", " uien", "onion"] },
  chili: { nl: "chili", en: "chili", words: ["chili", "chilli", "jalape"] },
  bbq: { nl: "barbecue", en: "barbecue", words: ["bbq", "barbecue"] },
  kruiden: { nl: "kruiden", en: "herbs", words: ["kruiden", "tuinkruid", "herbs"] },
  knoflook: { nl: "knoflook", en: "garlic", words: ["knoflook", "garlic"] },
  bieslook: { nl: "bieslook", en: "chives", words: ["bieslook", "chives"] },
  peper: { nl: "peper", en: "pepper", words: ["peper", "pepper"] },
  sambal: { nl: "sambal", en: "sambal", words: ["sambal"] },
  truffel: { nl: "truffel", en: "truffle", words: ["truffel", "truffle"] },
  granaatappel: { nl: "granaatappel", en: "pomegranate", words: ["granaatappel", "pomegranate"] },
  ananas: { nl: "ananas", en: "pineapple", words: ["ananas", "pineapple"] },
  druif: { nl: "druif", en: "grape", words: ["druif", "druiven", "grape"] },
  cranberry: { nl: "cranberry", en: "cranberry", words: ["cranberr", "veenbes"] },
  ginger: { nl: "gember", en: "ginger", words: ["ginger", "gember"] },
  munt: { nl: "munt", en: "mint", words: ["munt", " mint"] },
  // What pet food is made of, which is its flavour to a cat.
  kip: { nl: "kip", en: "chicken", words: ["kip", "chicken", "gevogelte", "poultry"] },
  rund: { nl: "rund", en: "beef", words: ["rund", "beef"] },
  lam: { nl: "lam", en: "lamb", words: ["lam ", "lams", "lamb"] },
  kalkoen: { nl: "kalkoen", en: "turkey", words: ["kalkoen", "turkey"] },
  eend: { nl: "eend", en: "duck", words: ["eend", "duck"] },
  konijn: { nl: "konijn", en: "rabbit", words: ["konijn", "rabbit"] },
  zalm: { nl: "zalm", en: "salmon", words: ["zalm", "salmon"] },
  tonijn: { nl: "tonijn", en: "tuna", words: ["tonijn", "tuna"] },
  vis: { nl: "vis", en: "fish", words: ["vis ", "vis-", "vis,", "visch", "fish", "oceaanvis", "zeevis", "kabeljauw", "forel"] },
};

/** Variants of one aspect, in the order they are matched. */
const aspect = (a: Aspect, vs: [id: string, name: string, words: string[], fallback?: boolean][]): VariantDef[] =>
  vs.map(([id, name, words, fallback]) => ({ id, name, words, aspect: a, ...(fallback ? { fallback: true } : {}) }));

interface Options {
  /** Its flavours, as ids of FLAVOURS: Variants of the aspect "smaak", naturel the one for a name that gives none. */
  flavours?: string[];
  also?: string[];
  not?: string[];
  variants?: (VariantDef | [id: string, name: string, words: string[], fallback?: boolean])[];
  equals?: Partial<Record<ComparisonUnit, number>>;
  name?: string;
  mix?: boolean;
  anyForm?: boolean;
  smallest?: number;
  wins?: boolean;
  shelf?: RegExp;
  notShelf?: RegExp;
}

const defs: IngredientDef[] = [];
function ing(id: string, unit: ComparisonUnit, aisles: Aisle[], words: string[], o: Options = {}): void {
  defs.push({
    id, name: o.name ?? id, unit, aisles, words, also: o.also ?? [], not: o.not ?? [],
    variants: [
      ...(o.variants ?? []).map((v) => Array.isArray(v) ? { id: v[0], name: v[1], words: v[2], ...(v[3] ? { fallback: true } : {}) } : v),
      ...(o.flavours ?? []).map((f): VariantDef => ({ id: f, name: `${o.name ?? id} ${FLAVOURS[f]!.nl}`, words: FLAVOURS[f]!.words, aspect: "smaak", ...(f === "naturel" ? { fallback: true } : {}) })),
    ],
    equals: o.equals ?? {},
    mix: o.mix ?? false,
    anyForm: o.anyForm ?? false,
    ...(o.smallest ? { smallest: o.smallest } : {}),
    ...(o.wins ? { wins: true } : {}),
    ...(o.shelf ? { shelf: o.shelf } : {}),
    ...(o.notShelf ? { notShelf: o.notShelf } : {}),
  });
}

/**
 * Sold whole or cut, and a shopper means one: "Gesneden uien", "Bloemkool
 * roosjes", "Mangoblokjes". Whole is the cut a name that gives none is.
 */
const CUT_WORDS = ["gesneden", "fijngesneden", " fijn ", "gesnipperd", "geraspt", "reepjes", "blokjes", "ringen", "roosjes", "stukjes", "julienne", "partjes", "parten"];
const cut = (name: string, whole = `hele ${name}`): VariantDef[] =>
  aspect("snit", [["gesneden", `gesneden ${name}`, CUT_WORDS], ["heel", whole, ["heel ", "hele "], true]]);

// Aisle groups, for brevity.
const VEG: Aisle[] = ["produce", "frozen", "conserves"];
const FRESH_VEG: Aisle[] = ["produce"];
const FRUIT: Aisle[] = ["produce", "frozen", "conserves"];
const MEAT: Aisle[] = ["meat", "frozen"];
const FISH: Aisle[] = ["fish", "frozen"];
const DAIRY: Aisle[] = ["dairy"];
const PANTRY: Aisle[] = ["pantry"];
const TINNED: Aisle[] = ["conserves", "pantry"];

// ── Potatoes ────────────────────────────────────────────────────────────
ing("aardappelen", "kg", ["produce"], ["aardappel", "aardappelen", "kriel", "krieltjes", "minikriel"], {
  not: ["puree", "schijf", "partjes", "gratin", "rösti", "rosti", "schotel", "wedges", "gekruid", "kroket", "wafel"],
  variants: [["kriel", "krieltjes", ["kriel"]], ["vastkokend", "vastkokende aardappelen", ["vastkok"]],
    ["kruimig", "kruimige aardappelen", ["kruimig", "bloemig"]]],
  also: ["piepers"],
});
ing("zoete aardappelen", "kg", ["produce", "frozen"], ["zoete aardappel", "zoete aardappelblokjes"], { also: ["zoete aardappel", "bataat"], not: ["friet", "frites"], variants: cut("zoete aardappelen") });
ing("friet", "kg", ["frozen", "produce"], ["friet", "patat", "frites"], { also: ["patat", "frites"] });
ing("aardappelpuree", "kg", ["produce", "frozen", "pantry"], ["aardappelpuree", "=puree", "aardappelpuree voor stamppot"], { not: ["tomaten", "appel", "chocolade", "tomato"] });

// ── Vegetables ──────────────────────────────────────────────────────────
ing("wortelen", "kg", VEG, ["wortel", "wortelen", "peen", "winterpeen", "bospeen", "waspeen", "worteltjes"], {
  not: ["sap", "taart", "cake", "salade", "mieriks"],
  also: ["wortels", "peen", "worteltjes"],
});
ing("uien", "kg", ["produce", "frozen"], ["uien", "ui", "=uien"], {
  not: ["gebakken", "crispy", "soep", "lente", "bosui", "zilver", "chips", "onion rings", "zoetzuur", "gepaneerd"],
  variants: [["rode", "rode uien", ["rode"]], ["gele", "gele uien", ["gele"], true], ...cut("uien")],
  equals: { piece: 7 },
  also: ["ui"],
});
ing("bosui", "kg", FRESH_VEG, ["bosui", "lenteui", "bosuitje"], { also: ["lente-ui"] });
ing("sjalotten", "kg", FRESH_VEG, ["sjalot", "sjalotje"], { also: ["sjalotjes"] });
ing("zilveruitjes", "kg", TINNED, ["zilveruitje", "uitje"], { not: ["jus", "chips", "soup", "soep"] });
ing("knoflook", "kg", ["produce", "pantry"], ["knoflook"], { equals: { piece: 20 }, not: ["saus", "olie", "boter", "brood", "poeder", "korrel", "pers", "friteslijn"], notShelf: /saus|mayonaise|tomaten/i });
ing("prei", "kg", VEG, ["prei"], { not: ["soep"], variants: cut("prei") });
ing("courgette", "piece", VEG, ["courgette", "courgettes"], { equals: { kg: 0.3 }, not: ["spaghetti", "noedels", "linten", "groentemix"] });
ing("komkommer", "piece", FRESH_VEG, ["komkommer"], { equals: { kg: 0.4 }, not: ["snoep", "mini"] });
ing("snoepkomkommers", "kg", FRESH_VEG, ["snoepkomkommer", "minikomkommer"], { also: ["mini komkommers"] });
ing("paprika", "piece", VEG, ["paprika", "paprikas"], {
  equals: { kg: 0.2 },
  not: ["chips", "poeder", "saus", "kruiden", "punt", "gerookt", "gegrild", "gevuld"],
  variants: [["rood", "rode paprika", ["rode", "rood"]], ["geel", "gele paprika", ["gele", "geel"]],
    ["groen", "groene paprika", ["groene", "groen"]]],
});
ing("puntpaprika", "kg", FRESH_VEG, ["puntpaprika"], {});
ing("tomaten", "kg", ["produce"], ["tomaat", "tomaten", "tomaatjes"], {
  not: ["soep", "saus", "ketchup", "puree", "gedroogd", "zongedroogd", "blokjes", "gepeld", "frito", "passata", "chips", "voeder", "vogelvoer"],
  variants: [["snoep", "snoeptomaten", ["snoep", "cherry", "kers", "mini"]], ["tros", "trostomaten", ["tros"]],
    ["roma", "roma tomaten", ["roma"]], ["vlees", "vleestomaten", ["vlees"]]],
});
ing("tomatenblokjes", "kg", TINNED, ["tomatenblokje", "blokjestomaat"], { also: ["tomaten in blokjes"] });
ing("gepelde tomaten", "kg", TINNED, ["gepelde tomaat", "gepelde tomaten"], { also: ["gepelde tomaten"] });
ing("passata", "kg", TINNED, ["passata", "tomatenfrito", "gezeefde tomaten"], { equals: { l: 1 }, also: ["gezeefde tomaten"] });
ing("tomatenpuree", "kg", TINNED, ["tomatenpuree", "tomato puree"], {});
ing("broccoli", "kg", VEG, ["broccoli", "broccoliroosjes"], { not: ["soep", "mix", "rijst", "gehaktbal"], variants: cut("broccoli") });
ing("bloemkool", "piece", VEG, ["bloemkool", "bloemkoolroosjes", "roosjesbloemkool"], { equals: { kg: 0.8 }, not: ["rijst", "soep", "mix", "kaas", "puree"], variants: cut("bloemkool", "hele bloemkool") });
ing("spinazie", "kg", VEG, ["spinazie"], { not: ["soep", "pasta", "taart", "ravioli", "pizza", "crème", "creme"] });
ing("andijvie", "kg", ["produce", "frozen"], ["andijvie"], { not: ["stamppot", "salade"], variants: cut("andijvie") });
ing("boerenkool", "kg", ["produce", "frozen"], ["boerenkool"], { not: ["stamppot", "chips"], variants: cut("boerenkool") });
ing("zuurkool", "kg", ["produce", "conserves", "deli"], ["zuurkool"], { anyForm: true, not: ["stamppot", "schotel"] });
ing("spruiten", "kg", VEG, ["spruit", "spruitjes"], { also: ["spruitjes"] });
ing("sperziebonen", "kg", VEG, ["sperziebonen", "sperzieboon", "haricots verts"], { also: ["haricots verts"] });
ing("snijbonen", "kg", VEG, ["snijbonen"], {});
ing("peultjes", "kg", VEG, ["peultje", "peulen", "sugar snaps", "sugarsnaps"], { also: ["sugar snaps"] });
ing("doperwten", "kg", ["frozen", "conserves"], ["doperwt", "erwt", "erwtjes", "=erwtjes"], { not: ["soep", "spliterwt", "kikkererwt", "wortel"] });
ing("doperwten en wortelen", "kg", ["frozen", "conserves"], ["doperwten en wortel", "erwten en wortel", "erwtjes en wortel", "doperwten wortel", "doperwtjes & worteltjes", "doperwtjes met worteltjes", "doperwtjes worteltjes", "erwten & wortel", "tuinerwten wortel"], { not: ["soep"], mix: true });
ing("mais", "kg", ["frozen", "conserves", "produce"], ["mais", "maïs", "maiskolf", "=maïskolven", "=maiskolven", "suikermais", "suikermaïs"], { not: ["chips", "zetmeel", "maizena", "olie", "wafel", "meel", "pop", "insalatissime"] });
ing("champignons", "kg", VEG, ["champignon", "champignons"], {
  not: ["soep", "saus", "roomsaus"],
  variants: [["kastanje", "kastanjechampignons", ["kastanje"]], ["wit", "witte champignons", ["wit"], true], ...cut("champignons")],
});
ing("paddenstoelen", "kg", VEG, ["paddenstoel", "oesterzwam", "oesterzwammen", "shiitake", "portobello"], { not: ["soep", "saus", "risotto"] });
ing("aubergine", "piece", VEG, ["aubergine"], { equals: { kg: 0.3 }, not: ["dip", "gegrild"] });
ing("pompoen", "piece", ["produce"], ["pompoen", "flespompoen", "butternut", "pompoenblokjes"], { equals: { kg: 1.2 }, not: ["snoep", "soep", "pitten", "spaghetti", "stamp", "verspakket"], variants: cut("pompoen") });
ing("knolselderij", "piece", FRESH_VEG, ["knolselderij"], { equals: { kg: 0.8 } });
// Sold by the head as often as by weight: a head of bleekselderij is about half a kilo, of paksoi 300 g, a chinese kool 800 g.
ing("bleekselderij", "kg", FRESH_VEG, ["bleekselderij", "selderijstengel"], { equals: { piece: 2 } });
ing("venkel", "piece", FRESH_VEG, ["venkel"], { equals: { kg: 0.3 }, not: ["thee", "zaad"] });
// A red cabbage sold per piece weighs about 1.25 kg.
ing("rode kool", "kg", ["produce", "conserves", "frozen"], ["rodekool", "rode kool"], { equals: { piece: 0.8 }, also: ["rodekool"], not: ["stamppot"] });
ing("witte kool", "kg", FRESH_VEG, ["wittekool", "witte kool"], { also: ["wittekool"], variants: cut("witte kool") });
ing("spitskool", "kg", FRESH_VEG, ["spitskool"], { variants: cut("spitskool") });
ing("chinese kool", "kg", FRESH_VEG, ["chinese kool", "chinakool"], { equals: { piece: 1.25 } });
ing("paksoi", "kg", FRESH_VEG, ["paksoi", "paksoy", "pakchoi"], { equals: { piece: 3.3 } });
ing("witlof", "kg", FRESH_VEG, ["witlof"], {});
ing("koolrabi", "piece", FRESH_VEG, ["koolrabi"], { equals: { kg: 0.4 } });
ing("rode bieten", "kg", ["produce", "conserves"], ["biet", "bieten", "rodebiet", "bietjes"], { not: ["sap", "chips", "salade", "hummus"], variants: cut("rode bieten") });
ing("radijs", "kg", FRESH_VEG, ["radijs", "radijsjes"], {});
ing("pastinaak", "kg", FRESH_VEG, ["pastinaak"], {});
ing("asperges", "kg", ["produce", "conserves"], ["asperge", "asperges"], { not: ["soep", "saus"] });
ing("avocado", "piece", ["produce", "frozen"], ["avocado", "avocados"], { equals: { kg: 0.2 }, not: ["dip", "guacamole", "olie", "spread"] });
ing("taugé", "kg", ["produce", "conserves"], ["taugé", "tauge"], {});
ing("ijsbergsla", "piece", FRESH_VEG, ["ijsbergsla", "ijsberg"], { equals: { kg: 0.5 }, also: ["ijsberg sla"], variants: cut("ijsbergsla", "hele ijsbergsla") });
ing("kropsla", "piece", FRESH_VEG, ["kropsla", "botersla"], { equals: { kg: 0.3 } });
ing("sla", "kg", FRESH_VEG, ["sla", "slamelange", "melange", "romaine", "eikenblad"], { not: ["dressing", "saus", "ijsberg", "krop", "veld", "rucola", "maaltijd", "rauwkost"] });
ing("rucola", "kg", FRESH_VEG, ["rucola"], {});
ing("veldsla", "kg", FRESH_VEG, ["veldsla", "sla veldsla"], {});
ing("rauwkost", "kg", FRESH_VEG, ["rauwkost", "koolsla", "julienne", "rauwkostsalade"], { mix: true });
ing("roerbakgroente", "kg", ["produce", "frozen"], ["roerbakgroente", "wokgroente", "roerbakmix", "fijne roerbak", "italiaanse roerbak", "mexicaanse roerbak", "oosterse roerbak", "hollandse roerbak", "champignon roerbak", "wokmix", "nasigroente", "bamigroente", "ovengroente"], { also: ["wokgroente"], mix: true });
ing("soepgroente", "kg", ["produce", "frozen"], ["soepgroente"], { mix: true });
ing("stamppotgroente", "kg", ["produce", "frozen"], ["stamppotgroente", "hutspot", "stamppot"], { mix: true, not: ["boerenkoolstamppot", "puree", "aardappelpuree", "worst", "gehakt", "maaltijd", "kruimig", "aardappelen"] });
ing("gember", "kg", ["produce", "pantry"], ["gember", "gemberwortel"], { not: ["bier", "koek", "shot", "thee", "siroop", "drank", "ale", "poeder", "snoep", "kombucha"] });
ing("rode peper", "kg", FRESH_VEG, ["peper", "pepers", "chilipeper", "chili"], {
  not: ["zwarte", "witte", "gemalen", "molen", "saus", "korrel", "steak", "paprika", "zout", "salami", "poeder", "carne", "bonen", "padron", "knoflookchili", "kaas", "worst", "bami", "chow"],
  also: ["peper", "chilipeper", "chili pepers"],
});

// ── Fresh herbs ─────────────────────────────────────────────────────────
for (const [id, words] of [
  ["peterselie", ["peterselie"]], ["koriander", ["koriander"]], ["basilicum", ["basilicum"]], ["bieslook", ["bieslook"]],
  ["dille", ["dille"]], ["munt", ["munt", "muntblad"]], ["tijm", ["tijm"]], ["rozemarijn", ["rozemarijn"]],
] as [string, string[]][]) {
  // A pot or bunch is about 25 g.
  ing(id, "kg", ["produce", "frozen"], words, { equals: { piece: 40 }, not: ["pepermunt", "pangalicious", "thee", "pesto", "olie", "gedroogd", "saus", "kauwgom", "snoep", "pastille", "drop", "aardappel", "potatoes", "kriel"] });
}

// ── Fruit ───────────────────────────────────────────────────────────────
ing("appels", "kg", ["produce", "frozen"], ["appel", "appels", "appeltjes", "elstar", "jonagold", "jonagored", "braeburn", "pink lady", "kanzi", "goudrenet", "granny smith"], {
  not: ["appelsap", "moes", "taart", "flap", "stroop", "chips", "azijn", "gedroogd", "cider", "bol", "compote", "beignet", "strudel", "knijpfruit", "smoothie"],
  variants: [["elstar", "elstar appels", ["elstar"]], ["jonagold", "jonagold appels", ["jonagold", "jonagored"]],
    ["goudrenet", "goudrenetten", ["goudrenet"]], ["granny", "granny smith", ["granny"]], ["braeburn", "braeburn appels", ["braeburn"]]],
  also: ["appel"],
});
ing("peren", "kg", FRUIT, ["peer", "peren", "conference", "doyenné", "stoofpeer", "stoofperen", "=peren"], {
  not: ["sap", "siroop", "drank", "taart", "stroop"],
  variants: [["stoof", "stoofperen", ["stoof", "gieser"]], ["hand", "handperen", ["conference", "doyenn"], true]],
  also: ["peer"],
});
ing("bananen", "kg", FRUIT, ["banaan", "bananen"], { equals: { piece: 5.5 }, not: ["chips", "brood", "smoothie", "snoep", "melk", "gedroogd", "taart"], also: ["banaan"] });
ing("sinaasappels", "kg", FRUIT, ["sinaasappel", "sinaasappelen", "sinaasappels"], { not: ["sap", "marmelade", "limonade", "siroop", "drank", "chocolade"], also: ["sinaasappel"] });
ing("mandarijnen", "kg", FRUIT, ["mandarijn", "mandarijnen", "clementine", "clementines"], { not: ["sap", "conserven", "partjes op siroop"] });
ing("citroenen", "piece", ["produce"], ["citroen", "citroenen"], { equals: { kg: 0.1 }, not: ["sap", "limonade", "thee", "melisse", "gras", "taart", "cake", "drank", "rasp", "snoep", "frisdrank"], also: ["citroen"] });
ing("limoenen", "piece", ["produce"], ["limoen", "limoenen", "limes"], { equals: { kg: 0.07 }, not: ["sap", "limonade", "drank", "frisdrank"], also: ["limoen"] });
ing("grapefruit", "piece", ["produce"], ["grapefruit"], { equals: { kg: 0.4 }, not: ["sap", "drank", "frisdrank"] });
ing("druiven", "kg", FRUIT, ["druif", "druiven"], { not: ["sap", "suiker", "rozijn"] });
ing("aardbeien", "kg", FRUIT, ["aardbei", "aardbeien"], { not: ["jam", "yoghurt", "kwark", "taart", "smoothie", "snoep", "limonade", "drink", "siroop", "chocolade", "cornet", "cornets", "ijs", "sorbet"] });
ing("blauwe bessen", "kg", FRUIT, ["blauwe bes", "bosbes", "bosbessen", "blueberries"], { also: ["blauwe bessen", "bosbessen"], not: ["jam", "yoghurt", "muffin", "smoothie", "cheesecake", "taart"] });
ing("frambozen", "kg", FRUIT, ["framboos", "frambozen"], { not: ["bavarois", "jam", "yoghurt", "siroop", "limonade", "smoothie", "azijn", "chocolade"] });
ing("kersen", "kg", FRUIT, ["kers", "kersen"], { not: ["tomaat", "tomaten", "bonbon", "likeur", "jam", "bier", "limonade", "siroop"] });
ing("kiwi's", "piece", FRUIT, ["kiwi", "kiwis", "kiwifruit"], { equals: { kg: 0.1 }, not: ["bes"], also: ["kiwi"] });
ing("mango", "piece", FRUIT, ["mango", "mangos", "mangoblokjes"], { equals: { kg: 0.4 }, not: ["sap", "chutney", "smoothie", "drank", "gedroogd", "lassi", "yoghurt"], variants: cut("mango", "hele mango") });
ing("ananas", "piece", FRUIT, ["ananas", "ananasblokjes"], { equals: { kg: 1.2 }, not: ["sap", "drank", "gedroogd"], variants: cut("ananas", "hele ananas") });
ing("meloen", "piece", ["produce"], ["meloen", "watermeloen", "galiameloen", "cantaloupe", "honingmeloen"], { not: ["drink", "energy"], equals: { kg: 1.5 }, variants: cut("meloen", "hele meloen") });
ing("pruimen", "kg", FRUIT, ["pruim", "pruimen"], { not: ["gedroogd", "jam"] });
ing("nectarines", "kg", FRUIT, ["nectarine", "perzik", "perziken"], { not: ["sap", "yoghurt", "drank", "ijsthee", "siroop"] });
ing("granaatappel", "piece", ["produce"], ["granaatappel", "=granaatappelpitjes"], { equals: { kg: 0.3 } });
ing("fruitsalade", "kg", ["produce", "conserves"], ["fruitsalade", "fruitmix"], { mix: true });
ing("appelmoes", "kg", TINNED, ["appelmoes", "appelcompote"], { not: ["knijp"], shelf: /^appelmoes/i });
ing("rozijnen", "kg", PANTRY, ["rozijn", "rozijnen", "krenten", "sultana"], { not: ["brood", "bol", "koek", "yofruit", "biscuit", "sticks"] });
ing("dadels", "kg", ["pantry", "produce", "deli", "conserves"], ["dadel", "dadels"], { not: ["ontbijtmix", "gevuld"] });

// ── Meat ────────────────────────────────────────────────────────────────
ing("gehakt", "kg", MEAT, ["gehakt", "gehaktmix"], {
  not: ["bal", "ballen", "schnitzel", "slavink", "brood", "kruiden", "mix voor", "vega", "speklap", "hamburger", "cordon", "spinazie"],
  // Half-om-half first: "Half-om-Half Gehakt Varken-Rund" names rund as well.
  variants: [["half-om-half", "half-om-half gehakt", ["half om half", "half-om-half", "h.o.h", "gemengd", "varken-rund"]],
    ["rund", "rundergehakt", ["runder", "rund"]], ["varken", "varkensgehakt", ["varkens"]], ["kip", "kipgehakt", ["kip"]]],
});
ing("gehaktballen", "kg", MEAT, ["gehaktbal", "gehaktballen", "balletje", "slavink"], { not: ["choco", "chocolade", "melkchocolade", "vega", "soep", "saus", "tomatensaus", "jus"] });
ing("hamburgers", "kg", MEAT, ["hamburger", "burger", "burgers"], { not: ["vega", "broodje", "saus", "kruiden", "kip"] });
ing("kipfilet", "kg", MEAT, ["kipfilet", "kipfilets", "kippenfilet", "kipfiletreepje", "kipfiletblokje", "kipreepje", "kipblokje", "kiphaasje", "kipstukje"], {
  not: ["vleeswaren", "gerookt", "broodbeleg", "gegrild", "flinterdun", "plakjes", "salade", "spread", "pastei", "vegetarisch", "vega", "nugget"],
  variants: [["heel", "hele kipfilet", ["heel", "hele", "filet"], true], ["blokjes", "kipblokjes", ["blokje", "reepje", "stukjes", "repen"]]],
  also: ["kipfilet", "kippenfilet"],
});
ing("kipdijfilet", "kg", MEAT, ["kipdijfilet", "dijfilet", "kippendij", "kipdij", "kipdijreepje", "kipdijblokje"], { not: ["vleeswaren", "spies", "sate"], also: ["kipdij", "kipdijen"] });
ing("kippenpoten", "kg", MEAT, ["kippenpoot", "kippenpoten", "drumstick", "drumsticks", "kippenbout", "kippenbouten"], { also: ["drumsticks", "kippenbouten"] });
ing("kipvleugels", "kg", MEAT, ["kipvleugel", "kippenvleugel", "wing", "wings"], {});
ing("hele kip", "kg", MEAT, ["hele kip", "kip"], { not: ["loempia", "gyoza", "bapao", "filet", "dij", "poot", "vleugel", "gehakt", "schnitzel", "burger", "nugget", "blokje", "reep", "kerrie", "salade", "bouillon", "kruiden", "saus", "sate", "spies", "worst", "cordon", "gyros", "shoarma", "pastei", "vega", "soep", "ham", "doner", "tandoori", "pittige", "karaage", "kebab", "kebap", "boomstam", "strips", "chipolata", "worstje"] });
ing("kalkoenfilet", "kg", MEAT, ["kalkoenfilet", "kalkoen"], { not: ["tapas", "vleeswaren", "gerookt", "plakjes", "rollade", "salchichon", "worst"] });
ing("speklappen", "kg", MEAT, ["speklap", "speklappen"], { not: ["kruiden", "vega"] });
ing("spekblokjes", "kg", ["meat", "deli"], ["spekblokje", "spekreepje", "spekjes", "lardon"], { also: ["spekjes", "spekreepjes"] });
ing("ontbijtspek", "kg", ["meat", "deli"], ["ontbijtspek", "bacon"], {});
ing("varkenshaas", "kg", MEAT, ["varkenshaas", "varkenshaasje", "haasje"], {});
ing("karbonade", "kg", MEAT, ["karbonade", "karbonades", "schouderkarbonade", "haaskarbonade"], {});
ing("schnitzels", "kg", MEAT, ["schnitzel", "schnitzels"], { not: ["kabeljauw", "vis", "vega", "kip", "kaas", "cordon"] });
ing("varkensvlees", "kg", MEAT, ["varkensvlees", "procureur", "procureurlap", "varkenslap", "sparerib", "spareribs", "casselerrib", "varkensoester", "varkensfilet", "fricandeau", "hamlap", "hamlappen", "varkensrollade", "filetlap", "filetlappen"], {});
ing("biefstuk", "kg", MEAT, ["biefstuk", "biefstukken", "steak", "steaks", "entrecote", "ribeye", "tournedos", "kogelbiefstuk"], { not: ["kruiden", "vega", "saus", "peper", "tartaar"] });
ing("stoofvlees", "kg", MEAT, ["stoofvlees", "sukadelap", "sukadelappen", "runderlap", "runderlappen", "stooflap", "stooflappen", "riblap", "riblappen", "draadjesvlees"], { also: ["sukadelappen", "runderlappen"] });
ing("rundvlees reepjes", "kg", MEAT, ["runderreepje", "biefreepje", "runderpoulet", "rund reepjes", "runderstukjes"], {});
ing("rookworst", "kg", ["meat", "deli", "conserves", "pantry"], ["rookworst"], { anyForm: true, not: ["erwtensoep", "stamppot", "broodje", "vegetarisch", "vega", "kip", "soep"] });
ing("braadworst", "kg", MEAT, ["braadworst", "braadworstjes", "saucijs", "saucijzen", "chipolata", "bratwurst", "barbecueworst"], {});
ing("shoarma", "kg", MEAT, ["shoarma", "gyros", "doner", "kebab"], { not: ["kruiden", "saus", "brood", "vega", "pizza"] });
ing("lamsvlees", "kg", MEAT, ["lamsvlees", "lamskotelet", "lamsbout", "lamsrack", "lamsgehakt"], {});
// Skewers, fresh or frozen; not the sauce (pindasaus), nor a meal with rice.
ing("saté", "kg", ["meat", "frozen", "deli"], ["saté", "sate", "kipsate", "kippensate", "varkenssate", "varkensate", "satéstokjes", "satestokjes", "satéspiesen", "satespiesen"], {
  wins: true,
  not: ["saus", "salade", "kroket", "nasi", "bami", "rijst", "kruiden", "marinade", "schnitzel", "gehaktbal", "chips", "kroepoek", "noedel", "mix", "soep", "wrap", "pizza", "broodje", "dagschotel", "maaltijd", "chicken tonight", "worst", "sperziebonen"],
  variants: [["kip", "kipsaté", ["kip", "ajam", "chicken"]], ["varken", "varkenssaté", ["varken", "babi"]], ["vega", "vegetarische saté", ["vega", "veggie", "vegetarisch", "plantaardig"]]],
});

// ── Fish ────────────────────────────────────────────────────────────────
ing("zalm", "kg", ["fish", "frozen", "deli"], ["zalm", "zalmfilet", "zalmmoot", "zalmmoten"], {
  not: ["salade", "spread", "pastei", "sushi", "salmon spread"],
  variants: [["gerookt", "gerookte zalm", ["gerookt", "smoked"]], ["vers", "zalmfilet", ["filet", "moot", "moten"], true]],
});
ing("kabeljauw", "kg", FISH, ["kabeljauw", "kabeljauwfilet", "kabeljauwhaas"], {});
ing("pangasius", "kg", FISH, ["pangasius", "pangasiusfilet", "pangalicious"], {});
ing("koolvis", "kg", FISH, ["koolvis", "koolvisfilet", "alaskakoolvis"], {});
// Sold frozen only.
ing("tilapia", "kg", FISH, ["tilapia", "tilapiafilet"], { anyForm: true });
ing("vissticks", "kg", ["frozen", "fish"], ["visstick", "vissticks", "fishsticks"], {});
ing("garnalen", "kg", ["fish", "frozen"], ["garnaal", "garnalen", "gamba", "gambas", "scampi", "scampis", "vannamei"], { not: ["chips", "kroket", "salade", "kroepoek", "cocktail", "surimi"] });
ing("mosselen", "kg", ["fish", "frozen", "conserves"], ["mossel", "mosselen"], { not: ["saus"] });
ing("haring", "kg", ["fish", "deli", "conserves"], ["haring", "haringen", "maatjes", "maatjesharing"], { not: ["salade"] });
ing("makreel", "kg", ["fish", "deli", "conserves"], ["makreel", "makreelfilet"], { not: ["salade", "spread"] });
ing("tonijn", "kg", ["conserves", "fish", "frozen"], ["tonijn", "tonijnstukken", "tonijnfilet", "tonijnmoot"], { anyForm: true, not: ["salade", "spread", "pizza", "sushi", "plantaardig"] });
ing("sardines", "kg", ["conserves"], ["sardine", "sardines", "sardientjes"], {});

ing("kibbeling", "kg", FISH, ["kibbeling"], { not: ["saus"] });
ing("surimi", "kg", ["fish", "deli", "frozen"], ["surimi", "krabstick", "krabsticks", "surimisticks", "surimichunks"], { not: ["salade"], also: ["krabsticks"] });

// ── Vegetarian ──────────────────────────────────────────────────────────
ing("tofu", "kg", ["vega", "produce"], ["tofu"], {});
ing("tempeh", "kg", ["vega", "produce", "pantry"], ["tempeh"], {});
ing("vegetarisch gehakt", "kg", ["vega", "frozen"], ["gehakt", "vegagehakt", "gehaktstukjes"], { not: ["bal", "ballen", "burger"], also: ["vega gehakt", "plantaardig gehakt"] });
ing("falafel", "kg", ["vega", "readymeal", "frozen"], ["falafel", "falafelballetjes", "falafelbites"], { not: ["mix", "wrap", "kruiden", "bowl", "topping"] });

// ── Dairy and eggs ──────────────────────────────────────────────────────
ing("melk", "l", ["dairy", "drinks"], ["melk"], {
  not: ["chocolade", "koffie", "poeder", "kokos", "geiten", "melkchocolade", "melkmeisje", "boter", "rijst", "zuiveldrank", "spread", "proteine", "protein", "koek", "gecondenseerd", "fruitmelk", "frisdrank"],
  variants: [["lactosevrij", "lactosevrije melk", ["lactosevrij", "lactose vrij", "lactofree"]], ["halfvol", "halfvolle melk", ["halfvol", "half vol"]], ["vol", "volle melk", ["volle", "vol "]],
    ["mager", "magere melk", ["mager"]]],
});
ing("karnemelk", "l", ["dairy", "drinks"], ["karnemelk"], {});
ing("chocolademelk", "l", ["dairy", "drinks"], ["chocolademelk", "chocomel"], {});
ing("koffiemelk", "l", ["dairy", "drinks"], ["koffiemelk", "koffiecreamer", "koffieroom", "becel lekker romig", "becel voor in de koffie", "=halvamel", "=goudband"], {});
ing("havermelk", "l", ["vega", "drinks", "dairy"], ["havermelk", "haverdrink", "oatdrink", "oatly"], { also: ["haverdrink"] });
ing("sojamelk", "l", ["vega", "drinks", "dairy"], ["sojamelk", "sojadrink"], { also: ["sojadrink"] });
ing("amandelmelk", "l", ["vega", "drinks", "dairy"], ["amandelmelk", "amandeldrink"], { also: ["amandeldrink"] });
ing("kokosmelk", "l", ["pantry", "conserves"], ["kokosmelk", "kokosroom"], {});
ing("yoghurt", "l", ["dairy"], ["yoghurt", "yogurt", "skyr"], {
  equals: { kg: 1 },
  not: ["drink", "drank", "dressing", "saus", "rozijn", "muesli", "granola", "proteine", "protein", "lactosevrij", "biscuit", "snack", "mousse", "knijp", "toetje", "twix", "m&m ", "sprinklins", "balletjes", "balls", "alternatief"],
  // "1,5%" before "5%", and "10%" before "0%", since each contains the other.
  variants: [
    ...aspect("soort", [["grieks", "griekse yoghurt", ["griek", "greek"]], ["skyr", "skyr", ["skyr"]], ["gewoon", "gewone yoghurt", [], true]]),
    ...aspect("vet", [["10%", "yoghurt 10%", ["10%", "10 %"]], ["halfvol", "halfvolle yoghurt", ["halfvol", "1,5%", "1.5%"]], ["5%", "yoghurt 5%", ["5%"]],
      ["2%", "yoghurt 2%", ["2%"]], ["mager", "magere yoghurt", ["mager", "0%", "0,1%", "0.1%"]], ["vol", "volle yoghurt", ["volle", "vol ", "3,5%"]]]),
  ],
  flavours: ["naturel", "aardbei", "framboos", "kers", "bosvruchten", "perzik", "mango", "passievrucht", "sinaasappel", "appel", "banaan", "citroen", "kokos", "vanille", "chocolade", "stracciatella", "karamel", "honing"],
});
ing("kwark", "kg", ["dairy"], ["kwark"], { equals: { l: 1 }, not: ["drink", "proteine", "protein", "toetje", "taart", "snack"],
  variants: aspect("vet", [["mager", "magere kwark", ["mager", "0%"]], ["half", "halfvolle kwark", ["halfvol"]], ["vol", "volle kwark", ["volle", "vol "]]]),
  flavours: ["naturel", "aardbei", "framboos", "bosvruchten", "perzik", "mango", "sinaasappel", "appel", "banaan", "citroen", "kokos", "vanille", "stracciatella", "honing"] });
// Puddings, mousses and other desserts from the chiller; not vla, which a
// shopper names as such.
ing("toetje", "kg", ["dairy", "pantry"], ["toetje", "toetjes", "pudding", "puddingen", "mousse", "chocolademousse", "dessert", "desserts", "rijstebrij", "tiramisu", "panna cotta", "bavarois", "griesmeelpudding"], {
  equals: { l: 1 },
  wins: true,
  not: ["mix", "poeder", "bak", "taart", "ijs", "saus", "koek", "cake", "hond", "kat", "baby", "vla", "wijn", "yoghurt", "kwark", "skyr", "koffiecups", "koffiepads", "cups", "pads", "kookpudding", "kloppudding", "koopmans"],
  variants: [["pudding", "pudding", ["pudding"]], ["mousse", "mousse", ["mousse"]], ["rijst", "rijstdessert", ["rijst"]], ["griesmeel", "griesmeelpudding", ["griesmeel"]], ["tiramisu", "tiramisu", ["tiramisu"]]],
  flavours: ["chocolade", "vanille", "karamel", "aardbei", "framboos", "kers", "perzik", "mango", "citroen", "koffie", "stracciatella", "banaan", "bosvruchten", "kokos", "pistache"],
});
ing("vla", "l", ["dairy"], ["vla", "vanillevla", "chocoladevla", "hopjesvla", "karamelvla", "bitterkoekjesvla", "aardbeienvla", "bananenvla"], { not: ["custard", "pudding"] });
ing("slagroom", "l", ["dairy"], ["slagroom"], { not: ["spuit", "taart", "soesje", "toetje"] });
ing("kookroom", "l", ["dairy"], ["kookroom", "blue band finesse koken", "finesse koken"], { not: ["soja", "kruiden"] });
ing("crème fraîche", "l", ["dairy"], ["crème fraîche", "creme fraiche", "fraîche", "fraiche"], { equals: { kg: 1 }, also: ["creme fraiche"] });
ing("zure room", "l", ["dairy"], ["zure room", "sour cream"], { equals: { kg: 1 }, also: ["sour cream"] });
ing("roomboter", "kg", ["dairy"], ["roomboter", "boter", "grasboter"], {
  // On a list, plain "boter" is roomboter: margarine may not be sold as boter.
  also: ["boter"],
  not: ["margarine", "halvarine", "plant", "sense", "cholesterol", "blue band", "pinda", "bak", "braad", "kruiden", "knoflook", "koek", "cake", "croissant", "spritsen", "vloeibaar", "olie", "appel"],
  variants: [["ongezouten", "ongezouten roomboter", ["ongezouten"], true], ["gezouten", "gezouten roomboter", ["gezouten"]]],
});
ing("margarine", "kg", ["dairy"], ["margarine", "halvarine", "becel", "blueband", "blue band", "plantboter"], { not: ["bak", "braad", "vloeibaar", "koken", "finesse", "lekker romig", "vlees & jus", "vlees en jus", "voordeelfles"] });
ing("bak- en braadboter", "kg", ["dairy", "pantry"], ["bak- en braad", "bak en braad", "bak & braad", "braadboter", "bakboter",
  // Becel's liquid and its Vlees & Jus are for frying, though named for neither.
  "becel vlees", "becel original vloeibaar", "becel vloeibaar", "becel original voordeelfles"], { also: ["bakboter", "braadboter"] });
ing("eieren", "piece", ["dairy"], ["eier", "eieren", "scharreleier", "scharreleieren"], {
  equals: { kg: 0.06 },
  not: ["salade", "chocolade", "paas", "spread", "kwartel", "verf", "pasta"],
  // Organic is how the hens are kept, as much as scharrel or vrije uitloop: the egg's code 0. First, so
  // "Biologische scharreleieren" is organic.
  variants: [["bio", "biologische eieren", ["biologisch", "bio+", "bio "]], ["scharrel", "scharreleieren", ["scharrel"]], ["vrije uitloop", "vrije-uitloopeieren", ["vrije uitloop", "uitloop"]]],
  also: ["ei", "eitjes"],
});
// Egg white, sold liquid. "Eiwit" alone is also protein, on every bar and shake, so only as a phrase.
ing("eiwit", "kg", ["dairy"], ["vloeibaar eiwit", "vloeibare eiwit", "kippeneiwit"], { also: ["eiwitten", "vloeibaar eiwit"] });

// ── Cheese ──────────────────────────────────────────────────────────────
ing("kaas", "kg", ["cheese", "dairy"], ["kaas", "gouda", "leerdammer", "maasdammer", "edammer", "beemster", "old amsterdam", "milner", "=kaas"], {
  not: ["amsterdam crème", "amsterdam creme", "kaascrème", "kaascreme", "smeer", "room", "geit", "schapen", "flavour", "vegan", "stengel", "mozzarella", "feta", "parmezaan", "brie", "camembert", "geraspt", "rasp", "strooi", "vega", "plantaardig", "saus", "fondue", "soufflé", "souffle", "chips", "cracker", "koek", "broodje", "stengel", "dip", "salade", "blokjes", "cottage", "hüttenkäse", "mascarpone", "ricotta", "halloumi", "smelt", "heks"],
  variants: [["extra belegen", "extra belegen kaas", ["extra belegen"]], ["jong belegen", "jong belegen kaas", ["jong belegen"]],
    ["belegen", "belegen kaas", ["belegen"]], ["oud", "oude kaas", ["oude", "oud ", "overjarig"]], ["jong", "jonge kaas", ["jong"]]],
});
ing("geraspte kaas", "kg", ["cheese", "dairy"], ["geraspte", "geraspt", "strooikaas", "raspkaas", "geraspte kaas", "gratin kaas", "gratinkaas"], { not: ["parmezaan", "vega", "plantaardig"], also: ["strooikaas"] });
ing("geitenkaas", "kg", ["cheese", "dairy"], ["geitenkaas", "=geitenbrie"], {});
ing("mozzarella", "kg", ["cheese", "dairy"], ["mozzarella", "burrata"], { not: ["stick", "pizza"] });
ing("feta", "kg", ["cheese", "dairy"], ["feta", "fetakaas", "witte kaas"], { not: ["salade", "spread", "dip"] });
ing("parmezaanse kaas", "kg", ["cheese", "dairy"], ["parmezaan", "parmezaanse", "parmigiano", "grana", "padano", "parmezaanse kaas", "padano kaas", "reggiano kaas"], { also: ["parmezaan", "parmigiano"] });
ing("roomkaas", "kg", ["cheese", "dairy", "deli"], ["roomkaas", "smeerkaas", "philadelphia", "mascarpone", "kaascrème", "kaascreme", "old amsterdam crème", "old amsterdam creme"], { not: ["rol", "rolletje", "rolletjes", "sweet peppers", "mexicaantjes", "chimichurri", "hot honey", "saus", "dip"],
  flavours: ["naturel", "kruiden", "knoflook", "bieslook", "sambal", "peper", "truffel", "honing"] });
ing("brie", "kg", ["cheese", "dairy"], ["brie", "camembert", "=brie"], {});
ing("halloumi", "kg", ["cheese", "dairy"], ["halloumi", "grillkaas"], {});
ing("ricotta", "kg", ["cheese", "dairy"], ["ricotta"], { not: ["ravioli", "pasta", "tortellini", "tortelloni", "rigatoni", "lasagne", "spinazie", "spinaci", "saus"] });

// ── Deli ────────────────────────────────────────────────────────────────
ing("ham", "kg", ["deli", "meat"], ["ham", "achterham", "beenham", "schouderham", "rauwe ham", "parmaham", "serranoham"], { not: ["hamburger", "kaas", "salade", "spread", "croissant", "tosti", "pizza", "lap", "chips", "crisps"],
  variants: [["rauw", "rauwe ham", ["rauwe", "parma", "serrano", "prosciutto"]], ["gekookt", "gekookte ham", ["achter", "been", "schouder", "gekookt"], true]] });
ing("kipfilet beleg", "kg", ["deli"], ["kipfilet", "kalkoenfilet"], { name: "kipfilet (beleg)", also: ["kipfilet beleg"] });
ing("salami", "kg", ["deli"], ["salami", "chorizo", "pepperoni", "snijworst"], { not: ["rolletje", "pizza", "chips"] });
ing("filet americain", "kg", ["deli"], ["americain", "américain"], { not: ["vega", "saus"] });
ing("leverworst", "kg", ["deli"], ["leverworst", "pate", "paté", "roompate", "roompaté", "smeerworst"], { not: ["vega"] });
// Dirk and DekaMarkt file hummus with the salads.
ing("hummus", "kg", ["deli", "pantry", "readymeal"], ["hummus", "houmous"], { not: ["bowl", "chips", "topping", "eat real"] });
// Sold in jars as often as chilled, and a shopper means either.
ing("knakworst", "kg", ["conserves", "deli", "meat"], ["knakworst", "knakworstje", "knakworstjes", "frankfurter", "frankfurters", "weense worst"], { anyForm: true, not: ["vega", "kip", "broodje", "soep"], also: ["knakworstjes", "knakkies"] });
ing("grillworst", "kg", ["deli"], ["grillworst"], { not: ["vega"] });
ing("boterhamworst", "kg", ["deli"], ["boterhamworst"], { not: ["vega"] });
ing("cervelaat", "kg", ["deli"], ["cervelaat"], { not: ["vega"] });

// ── Bread ───────────────────────────────────────────────────────────────
// A loaf: anything under 600 g, or a "kleintje", is not what a shopper means by brood.
ing("brood", "piece", ["bakery", "frozen"], ["=brood", "=broden", "boterham"], {
  equals: { kg: 0.8 },
  smallest: 0.75,
  not: ["kleintje", "breekbrood", "turks", "bananen", "stok", "krenten", "rozijn", "libanees", "shoarma", "half", "mini", "suiker", "kruiden", "knoflook", "pita", "naan", "afbak", "kaas", "mais", "beleg", "pudding", "rijst", "kruimel", "paneer", "chips", "ontbijtkoek", "pistolet", "bol", "croissant", "bagel", "tortilla", "wrap", "beschuit", "cracker", "toast", "mix", "meel", "kokos"],
  variants: [["volkoren", "volkorenbrood", ["volkoren"]], ["meergranen", "meergranenbrood", ["meergranen", "granen", "zaden", "spelt"]],
    ["bruin", "bruinbrood", ["bruin", "tarwe"]], ["wit", "witbrood", ["wit", "casino"]]],
});
ing("stokbrood", "piece", ["bakery", "frozen"], ["stokbrood", "baguette"], { equals: { kg: 0.25 }, not: ["kruiden", "knoflook", "pizza"] });
ing("afbakbroodjes", "piece", ["bakery", "frozen"], ["afbakbroodje", "afbakbroodjes", "pistolet", "pistolets", "petit pain"], { equals: { kg: 0.06 } });
ing("bolletjes", "piece", ["bakery", "frozen"], ["bolletje", "bolletjes", "=broodje", "=broodjes", "puntje", "puntjes", "=puntjes"], { equals: { kg: 0.06 }, not: ["shoarma", "oerknack", "goed bezig", "kaneel", "burger", "bapao", "kruidenboter", "knoflook", "afbak", "krenten", "rozijn", "suiker", "hamburger", "kaas", "worst", "saucijz", "frikandel", "kroket", "pizza", "snack", "sandwich", "koffie", "chocolade", "croissant"] });
ing("tortilla's", "piece", ["bakery", "pantry"], ["tortilla", "tortillas", "wrap", "wraps"], { equals: { kg: 0.04 }, not: ["chips", "kit", "saus", "spaanse"], also: ["wraps", "tortilla"] });
ing("pitabroodjes", "piece", ["bakery", "pantry", "frozen"], ["pita", "pitabroodje", "pitabroodjes", "naan"], { equals: { kg: 0.08 }, also: ["pita broodjes"] });
ing("croissants", "piece", ["bakery", "frozen"], ["croissant", "croissants", "croissantjes"], { equals: { kg: 0.05 }, not: ["ham", "kaas", "chocolade"] });
ing("beschuit", "kg", ["bakery", "pantry"], ["beschuit", "beschuiten"], { equals: { piece: 100 } });
ing("crackers", "kg", ["bakery", "pantry"], ["cracker", "crackers", "knäckebröd", "knackebrod", "rijstwafel", "rijstwafels"], {});
ing("roggebrood", "kg", ["bakery", "pantry"], ["roggebrood"], {});

// ── Snacks, biscuits and sweets ─────────────────────────────────────────
// Savoury snacks but chips and nuts: crackers to serve, mixes, sticks.
ing("zoutjes", "kg", ["snacks"], ["zoutjes", "borrelzoutjes", "wereldzoutjes", "japanse mix", "borrelmix", "nibbits", "zoute stengels", "pretzel", "pretzels", "rijstcookies", "kaasballetjes", "cheese balls", "=bugles", "wasabi erwtjes"], {
  not: ["chocolade", "chocolate", "snoep", "drop", "hond", "kat", "pinda", "noten", "chips"],
  flavours: ["naturel", "kaas", "paprika", "bbq", "chili", "ui"],
});
ing("chips", "kg", ["snacks", "pantry"], ["chips", "ribbelchips", "naturelchips", "paprikachips", "tortillachips", "nachos"], {
  wins: true,
  not: ["choc", "cookie", "koek", "banaan", "bananen", "appel", "kokos", "kroepoek", "groente", "vis", "dill chips"],
  flavours: ["naturel", "paprika", "kaas-ui", "zout-azijn", "kaas", "chili", "bbq", "ui", "kruiden", "peper", "truffel"], notShelf: /augurk/i,
});
ing("popcorn", "kg", ["snacks", "pantry"], ["popcorn"], { not: ["wafel"] });
ing("kroepoek", "kg", ["pantry", "snacks"], ["kroepoek", "krupuk"], { wins: true });
ing("drop", "kg", ["snacks"], ["drop", "dropjes", "salmiak", "muntdrop"], { also: ["dropjes"] });
ing("chocolade", "kg", ["snacks"], ["chocolade", "chocoladereep", "chocoladetablet", "melkchocolade", "tablet"], {
  wins: true,
  shelf: /^(chocoladerepen|chocoladerepen, chocoladetabletten|repen, tabletten)$/i,
  not: ["koek", "biscuit", "wafel", "cake", "cookie", "pinda", "rozijn", "hagelslag", "vlokken", "pasta", "drink", "muesli", "rijst", "ei", "paas", "sprits", "kruidno", "kruidenoten"],
  variants: [["puur", "pure chocolade", ["puur", "pure", "dark"]], ["wit", "witte chocolade", ["witte", "white"]], ["melk", "melkchocolade", ["melk", "milk"], true]],
  also: ["chocoladereep", "reep chocolade"], notShelf: /^koek$|koekjes|koek met|kruidnoten|pepernoten|strooigoed|biscuit|verse koek|zachte koek|^cake$|tussendoorkoek|koekrepen|mueslirepen|luxe koek|alledaagse/i,
});
// "Chocolade koekjes" are biscuits: both win, and the last word names the kind.
ing("koekjes", "kg", ["snacks", "pantry", "bakery"], ["koek", "koekje", "koekjes", "biscuit", "biscuits", "cookie", "cookies", "=sprits", "=spritsen"], {
  wins: true,
  shelf: /^(koekjes|koekjes, biscuits|biscuits?|mini koekjes|chocolade koekjes|koekjes met chocolade|alledaagse koek|alledaagse en trommelbiscuit)$/i,
  not: ["pannenkoek", "ontbijtkoek", "peperkoek", "hond", "kat", "baby", "vla", "crackers", "cookies & cream", "cookies and cream", "cookie dough", "cruesli", "pudding", "powder", "protein", "reep", "repen", "muesli", "cake", "muffin", "brownie", "donut", "crunchers", "kaas", "bar", "mix voor", "borrelzoutjes", "rijstcookie"],
  also: ["koek", "biscuits"], notShelf: /^chocolade$|chocoladerepen|candybars|chocolade ?snoepjes|uitdeelzakken|chocoladeletters/i,
});
ing("stroopwafels", "kg", ["snacks", "bakery", "pantry"], ["stroopwafel", "stroopwafels"], { wins: true, not: ["mix", "chocoladereep", "reep", "boterkoek"], also: ["stroopwafel"] });
ing("speculaas", "kg", ["snacks", "bakery", "pantry"], ["speculaas", "speculaasjes", "speculoos"], { wins: true, not: ["pasta", "spread", "kruiden", "vla", "ijs", "muesli", "granola", "donut", "hagelslag", "mix voor"], notShelf: /ontbijtgranen|cereals|muesli|bonbon|chocoladerepen/i });
// Kruidkoek, gemberkoek and Snelle Jelle's rozijnenkoek are ontbijtkoek, not koekjes.
ing("ontbijtkoek", "kg", ["bakery", "pantry", "snacks"], ["ontbijtkoek", "peperkoek", "kruidkoek", "gemberkoek", "rozijnenkoek", "kruidkoekrepen", "ontbijtkoekrepen"], { wins: true, shelf: /^((on)?gesneden )?ontbijtkoek(repen| gesneden, ongesneden)?$/i });
ing("kauwgom", "kg", ["snacks"], ["kauwgom", "kauwgum", "gums"], { also: ["kauwgum"] });
ing("winegums", "kg", ["snacks"], ["winegum", "winegums", "wine gums"], { also: ["winegum"] });

// ── Ready to heat ───────────────────────────────────────────────────────
ing("pizza", "piece", ["frozen", "readymeal"], ["pizza", "pizzas"], {
  wins: true,
  shelf: /pizza('?s)?$/i,
  equals: { kg: 0.35 },
  not: ["bodem", "deeg", "saus", "kruiden", "snack", "broodje", "baguette", "chips", "mini", "bites", "rolls", "breekbrood", "piadina", "flatbread", "noodle", "noedel", "salsa"],
  also: ["pizza's"],
  variants: [{ id: "diepvries", name: "diepvriespizza", words: [], form: "diepvries" }, { id: "gekoeld", name: "verse pizza", words: [], fallback: true }],
});
ing("soep", "l", ["readymeal", "pantry"], ["soep"], {
  wins: true,
  equals: { kg: 1 },
  not: ["soepgroente", "soepballetjes", "soepvlees", "bouillon", "cup", "instant", "bami", "yum yum", "vifon", "kom", "lepel", "pan", "bord", "verspakket", "kruidenpasta"],
  variants: [["tomaat", "tomatensoep", ["tomaat", "tomaten"]], ["kip", "kippensoep", ["kip"]], ["erwten", "erwtensoep", ["erwten", "snert"]],
    ["champignon", "champignonsoep", ["champignon"]], ["uien", "uiensoep", ["uien"]], ["groente", "groentesoep", ["groente"]]],
});
ing("frikandellen", "kg", ["frozen"], ["frikandel", "frikandellen"], { not: ["broodje", "speciaal"], also: ["frikandel"] });
ing("ijs", "l", ["frozen"], ["ijs", "roomijs", "schepijs", "ijsje", "ijsjes", "waterijs"], { wins: true, shelf: /^(ijs|ijsjes|handijs|waterijs|roomijs|schepijs.*)$/i, not: ["ijsblokje", "ijsklontje", "ijsberg", "ijsthee", "ijskoffie", "hoorn", "saus"], also: ["roomijs", "schepijs", "ijsjes"],
  flavours: ["vanille", "chocolade", "aardbei", "karamel", "cookie", "pistache", "stracciatella", "mango", "kers", "citroen", "bosvruchten", "passievrucht", "framboos", "peer", "koffie", "banaan", "kokos"] });
// Named for their filling, and still kroketten: "Stoofvlees croquetten", "Garnalen croquetten".
// About ten kroketten or loempia's to the kilo, fifty mini loempia's, forty bitterballen, sixteen pannenkoeken, 250 poffertjes.
ing("kroketten", "kg", ["frozen", "readymeal"], ["kroket", "kroketten", "croquet", "croquetten"], { wins: true, equals: { piece: 10 }, not: ["aardappel", "broodje", "mix", "saus"], also: ["kroket"] });
ing("bitterballen", "kg", ["frozen", "readymeal"], ["bitterbal", "bitterballen"], { wins: true, equals: { piece: 40 }, not: ["saus", "mosterd"], also: ["bitterbal"] });
ing("loempia's", "kg", ["frozen", "readymeal"], ["loempia", "loempias"], { equals: { piece: 10 }, not: ["saus", "vel", "vellen", "deeg", "mini"], also: ["loempia"] });
ing("mini loempia's", "kg", ["frozen", "readymeal"], ["mini loempia", "mini loempias", "miniloempia", "miniloempias", "mini groente loempia", "mini groente loempias", "mini kip loempia"], { equals: { piece: 50 }, not: ["saus"] });
ing("pannenkoeken", "kg", ["bakery", "readymeal", "frozen"], ["pannenkoek", "pannenkoeken"], { equals: { piece: 16 }, not: ["mix", "meel", "stroop", "kruiden", "schudfles"], also: ["pannenkoek"] });
ing("poffertjes", "kg", ["bakery", "readymeal", "frozen"], ["poffertje", "poffertjes"], { equals: { piece: 250 }, not: ["mix", "pan", "meel", "suiker"] });
ing("gnocchi", "kg", ["pantry", "readymeal"], ["gnocchi"], { wins: true });

// ── Pantry ──────────────────────────────────────────────────────────────
ing("rijst", "kg", PANTRY, ["rijst", "basmati", "pandan", "zilvervliesrijst", "risottorijst", "risotto", "jasmijnrijst", "langgraan", "arborio", "zilvervlies"], {
  not: ["wafel", "melk", "drink", "drank", "pap", "bloem", "noedel", "mie", "azijn", "papier", "kaas", "bloemkool", "salade", "maaltijd", "nasi", "bami", "gepofte"],
  variants: [["basmati", "basmatirijst", ["basmati"]], ["pandan", "pandanrijst", ["pandan", "jasmijn"]], ["zilvervlies", "zilvervliesrijst", ["zilvervlies"]],
    ["risotto", "risottorijst", ["risotto", "arborio"]], ["langgraan", "langgraanrijst", ["langgraan", "witte"], true]],
});
ing("pasta", "kg", ["pantry", "readymeal"], ["pasta", "spaghetti", "penne", "macaroni", "fusilli", "farfalle", "tagliatelle", "lasagne", "lasagnebladen", "rigatoni", "orzo", "tortellini", "ravioli", "conchiglie", "linguine", "spaghettini", "fettuccine", "vermicelli", "pipe rigate", "celentani", "casarecce", "farfelle"], {
  not: ["easy eats", "vanille", "boterham", "saus", "kruiden", "salade", "maaltijd", "mix", "courgette", "pompoen", "schotel", "groente", "curry", "penotti", "duopasta", "wereldgerecht", "wasabi", "chicken", "notenpasta"],
  variants: [["spaghetti", "spaghetti", ["spaghetti"]], ["penne", "penne", ["penne"]], ["macaroni", "macaroni", ["macaroni"]],
    ["fusilli", "fusilli", ["fusilli"]], ["tagliatelle", "tagliatelle", ["tagliatelle"]], ["lasagne", "lasagnebladen", ["lasagne"]],
    ["tortellini", "tortellini", ["tortellini", "ravioli"]]], notShelf: /broodbeleg|chocopasta|hazelnootpasta/i,
});
ing("mie", "kg", PANTRY, ["mie", "noedel", "noedels", "noodles", "rijstnoedel", "eiermie", "noedles"], { not: ["soep", "saus", "kruiden", "maaltijd", "bami"], also: ["noedels", "noodles"] });
ing("couscous", "kg", PANTRY, ["couscous", "bulgur", "parelcouscous"], {});
ing("quinoa", "kg", PANTRY, ["quinoa"], {});
ing("havermout", "kg", PANTRY, ["havermout", "havervlok", "havervlokken", "oats"], { not: ["koek", "reep", "drink", "melk"] });
ing("muesli", "kg", PANTRY, ["muesli", "granola", "cruesli"], { not: ["reep", "repen", "yoghurt"] });
ing("cornflakes", "kg", PANTRY, ["cornflakes", "ontbijtgranen"], { not: ["churros"] });
ing("bloem", "kg", PANTRY, ["bloem", "tarwebloem", "patentbloem", "meel", "tarwemeel", "volkorenmeel"], { not: ["liga", "bakmeel", "zelfrijzend", "mais", "rijst", "kool", "pannenkoek", "mix", "zonnebloem", "veldbloem"], also: ["meel", "tarwebloem"] });
ing("zelfrijzend bakmeel", "kg", PANTRY, ["bakmeel", "zelfrijzend"], {});
// Hoogvliet files its mixes beside the pancakes, under Hollandse keuken.
ing("pannenkoekmix", "kg", [...PANTRY, "readymeal"], ["pannenkoekmix", "pannenkoekenmix", "pannenkoekmeel", "bakmix voor pannenkoeken", "schudfles"], {});
ing("maizena", "kg", PANTRY, ["maizena", "maiszetmeel", "maïszetmeel", "binder"], {});
ing("paneermeel", "kg", PANTRY, ["paneermeel", "panko"], {});
ing("suiker", "kg", PANTRY, ["suiker", "kristalsuiker", "basterdsuiker", "poedersuiker", "rietsuiker"], {
  not: ["vanille", "zoetje", "klontjes", "spek", "wafel", "brood", "vrij", "kaneel", "parels", "siroop", "stroop", "alternatief"],
  variants: [["kristal", "kristalsuiker", ["kristal"], true], ["basterd", "basterdsuiker", ["basterd", "bruine"]], ["poeder", "poedersuiker", ["poeder"]], ["riet", "rietsuiker", ["riet"]]],
});
ing("vanillesuiker", "kg", PANTRY, ["vanillesuiker"], {});
ing("bakpoeder", "kg", PANTRY, ["bakpoeder"], { equals: { piece: 60 } });
ing("gist", "kg", PANTRY, ["gist"], {});
ing("olijfolie", "l", PANTRY, ["olijfolie"], { not: ["tonijn", "sardine", "spray", "zeep", "zonnebloem", "zon"],
  variants: [["extra vierge", "extra vierge olijfolie", ["extra vierge", "extra virgin"]], ["mild", "milde olijfolie", ["mild", "puur", "pure", "classico"]]] });
ing("zonnebloemolie", "l", PANTRY, ["zonnebloemolie", "frituurolie", "plantaardige olie", "arachideolie", "olie"], { not: ["olijf", "sesam", "kokos", "spray", "zonnebloempit", "massage", "baby", "tonijn", "sardine", "knoflook", "chili", "truffel", "etherische"] });
ing("azijn", "l", PANTRY, ["azijn", "balsamico"], { not: ["schoonmaak", "chips", "augurk", "uitje"] });
ing("mayonaise", "l", PANTRY, ["mayonaise", "fritessaus", "frietsaus", "yofresh", "mayonnaise"], { equals: { kg: 1 } });
ing("ketchup", "l", PANTRY, ["ketchup", "tomatenketchup", "tomaten ketchup"], { equals: { kg: 1 } });
ing("mosterd", "kg", PANTRY, ["mosterd"], { equals: { l: 1 }, not: ["salata", "soep", "saus", "dressing"] });
ing("sojasaus", "l", PANTRY, ["sojasaus", "ketjap", "ketjap manis", "kecap manis", "tamari", "soy sauce"], { not: ["mix", "babi", "kruidenmix"], also: ["ketjap"] });
ing("pindasaus", "kg", PANTRY, ["pindasaus", "satésaus", "satesaus"], { equals: { l: 1 } });
ing("pesto", "kg", ["pantry", "deli", "readymeal"], ["pesto"], { not: ["dip", "pasta", "verspakket", "crackers", "chips", "presto", "mayo", "dressing"] });
ing("pastasaus", "kg", ["pantry", "readymeal"], ["pastasaus", "tomatensaus", "bolognese", "arrabiata", "napoletana", "carbonara"], { equals: { l: 1 }, not: ["lasagnette", "wereldgerecht", "mix", "kruiden", "maaltijd", "noedel", "noodle", "ramen", "noedles"] });
// Dirk files stock cubes with its long-life soups.
ing("bouillon", "kg", [...PANTRY, "readymeal"], ["bouillon", "bouillonblokje", "bouillonblokjes", "fond", "fonds",
  // The flavour named after it is not a second thing: "Bouillon kip" is stock.
  ...["kip", "rund", "champignon", "vis"].flatMap((f) => [`bouillon ${f}`, `bouillonblokjes ${f}`, `bouillonblokje ${f}`])], { equals: { l: 1 }, not: ["soep", "tomaten"] });
ing("zout", "kg", PANTRY, ["zout", "zeezout", "keukenzout"], { not: ["chips", "pinda", "noten", "ongezouten", "gezouten", "drop", "zoutjes", "karamel", "caramel", "boter", "kruidenzout", "selderij", "knoflook", "vaatwas", "regenereer", "popcorn", "knäckebröd", "knackebrod", "wafel", "marinade", "seasoning", "kruidenmix", "geen zout"], notShelf: /crackers|rijstwafels|chips|noten|koek/i });
ing("zwarte peper", "kg", PANTRY, ["peper", "peperkorrel", "peperkorrels", "pepermolen"], { not: ["rode", "chili", "groene", "paprika", "saus", "steak", "zout", "cayenne", "jalape", "pepers", "salami", "koek", "munt", "mini", "paste", "gochujang", "hot", "pepertjes", "dipmix"], also: ["peper"] });
ing("pindakaas", "kg", ["pantry"], ["pindakaas", "peanut butter", "fijngemalen pinda's", "gemalen pinda's", "pindapasta", "pinda pasta"], { not: ["koek", "reep", "chocolade", "snoep", "bar"],
  variants: [["stukjes", "pindakaas met stukjes", ["stukjes", "crunchy"]], ["naturel", "pindakaas naturel", ["naturel", "100%"]]] });
ing("jam", "kg", ["pantry"], ["jam", "confiture", "fruitbeleg", "marmelade"], { not: ["koek", "taart", "yoghurt", "cake"], wins: true });
ing("hagelslag", "kg", ["pantry"], ["hagelslag", "vlokken", "chocoladevlokken"], { not: ["havervlok", "haver", "aardappel", "cornflakes", "kokos", "rogge", "spelt", "gerst", "tarwe", "granenvlokken", "boekweit", "quinoa", "rijst", "mais", "muesli", "zeezout", "chili", "peper", "geraspt"], wins: true });
ing("honing", "kg", ["pantry"], ["honing"], { not: ["koek", "mosterd", "thee", "drop", "snoep", "yoghurt", "cereal", "haver", "reep", "repen", "woksaus", "teriyaki"] });
ing("chocoladepasta", "kg", ["pantry"], ["chocoladepasta", "nutella", "hazelnootpasta", "chocopasta"], {});
ing("currysaus", "l", PANTRY, ["curry", "currysaus"], { equals: { kg: 1 }, not: ["kerrie", "poeder", "pasta", "kruiden", "strooier", "dipmix"] });
ing("kidneybonen", "kg", TINNED, ["kidneyboon", "kidneybonen"], { not: ["chili", "mix", "salade"] });
ing("bruine bonen", "kg", TINNED, ["bruine bonen", "bruine boon"], { also: ["bruine bonen"], not: ["soep"] });
ing("witte bonen", "kg", TINNED, ["witte bonen", "witte boon"], { also: ["witte bonen"], not: ["tomatensaus"] });
ing("kikkererwten", "kg", TINNED, ["kikkererwt", "kikkererwten"], { not: ["hummus", "chips"] });
ing("linzen", "kg", TINNED, ["linze", "linzen", "linzen pure"], { not: ["soep", "salade", "insalatissime"] });
ing("augurken", "kg", TINNED, ["augurk", "augurken", "cornichon", "cornichons", "dill chips"], {});
ing("olijven", "kg", ["conserves", "deli", "pantry"], ["olijf", "olijven"], { not: ["olie", "tapenade"] });
ing("pinda's", "kg", ["snacks", "pantry"], ["pinda", "pindas", "borrelnoot", "borrelnoten"], { not: ["pepsels", "kaas", "saus", "koek", "olie", "snoep", "chocolade", "rijst", "nougat", "reep", "bar", "karamel", "pasta"], also: ["pindas"], notShelf: /^(chocolade|repen, tabletten|chocoladerepen.*|candybars)$/i });
ing("noten", "kg", ["snacks", "pantry", "produce"], ["noot", "noten", "cashew", "cashewnoten", "walnoot", "walnoten", "amandel", "amandelen", "hazelnoot", "hazelnoten", "pecan", "pistache", "notenmix", "studentenhaver", "=noten"], { not: ["kruidnoot", "kruidnoten", "penotti", "pasta", "d'or", "penotti", "pudding", "pasta", "melk", "drink", "chocolade", "koek", "reep", "olie", "kokos", "spread", "pinda", "borrelnoot", "muskaat"], notShelf: /chocola|bonbon|chocopasta|hazelnootpasta|muesli|ontbijtgranen|cereals|^koek|koekjes|toppings/i });
ing("kerrie", "kg", PANTRY, ["kerrie", "kerriepoeder", "currypoeder"], { not: ["chicken tonight", "saus", "wok"] });
ing("paprikapoeder", "kg", PANTRY, ["paprikapoeder"], {});
ing("sambal", "kg", PANTRY, ["sambal", "sambal oelek", "sambal badjak"], { wins: true, equals: { l: 1 }, not: ["kaas", "chips", "kroepoek", "pinda", "noten"] });
ing("appelstroop", "kg", PANTRY, ["appelstroop"], {});
ing("kaneel", "kg", PANTRY, ["kaneel"], { not: ["knappers", "thee", "koek", "brood", "bol", "rol", "suiker", "bakmix", "cake", "moes", "wafel"] });
ing("zwarte bonen", "kg", TINNED, ["zwarte bonen", "zwarte boon"], { also: ["zwarte bonen"], not: ["spread"] });
ing("sesamzaad", "kg", PANTRY, ["sesamzaad", "sesamzaadjes"], {});
ing("oregano", "kg", PANTRY, ["oregano"], { not: ["cracker", "tomaat", "tomaten", "pizza", "saus", "olie", "chips", "kaas", "brood"] });
ing("nootmuskaat", "kg", PANTRY, ["nootmuskaat", "foelie"], {});
ing("bladerdeeg", "kg", ["frozen", "bakery", "pantry"], ["bladerdeeg"], { not: ["broodje", "stengel", "staaf", "flap", "croissant", "saucijz", "worst", "kaas", "appel", "koek", "hapje", "snack"] });
ing("sriracha", "l", PANTRY, ["sriracha"], { equals: { kg: 1 }, not: ["mayo", "ketchup", "chips", "noot", "noten", "pinda", "noedel", "cracker", "sesam", "seeds", "dipmix", "wings"] });
ing("knoflooksaus", "l", PANTRY, ["knoflooksaus"], { equals: { kg: 1 } });

// ── Drinks, coffee and tea ──────────────────────────────────────────────
ing("koffie", "kg", ["drinks"], ["koffie", "koffiebonen", "filterkoffie", "snelfilter", "koffiepads", "koffiecups", "espresso", "oploskoffie", "koffiecapsules", "capsules", "lungo", "ristretto"], {
  not: ["nesquik", "granenkoffie", "melk", "creamer", "room", "filterzak", "machine", "ijskoffie", "koek", "chocolade", "likeur", "drink"],
  variants: [["bonen", "koffiebonen", ["bonen"]], ["pads", "koffiepads", ["pads", "senseo"]], ["cups", "koffiecups", ["cups", "capsule", "nespresso", "dolce"]],
    ["oplos", "oploskoffie", ["oplos", "instant"]], ["filter", "filterkoffie", ["filter", "snelfilter", "gemalen"], true]],
});
ing("thee", "piece", ["drinks"], ["thee", "theezakje", "theezakjes", "rooibos", "earl grey", "infusion", "infusions", "=thee"], { equals: { kg: 0.002 }, not: ["ijsthee", "ice", "glas", "pot", "lepel", "koek", "drink", "biscuit", "licht", "kaars", "kombucha"] });
// Named, they are what a juice of several fruits is not: "Fruity Juice Sinaasappelsap".
ing("sinaasappelsap", "l", ["drinks"], ["sinaasappelsap", "jus d'orange", "sap sinaasappel"], { wins: true });
ing("appelsap", "l", ["drinks"], ["appelsap", "sap appel"], { wins: true });
ing("drinkyoghurt", "l", ["dairy", "drinks"], ["drinkyoghurt", "yoghurtdrank", "yoghurtdrink", "yoghurt drink", "drink yoghurt", "optimel drink", "melkan drink"], { not: ["haver", "soja", "kokos", "amandel", "rijst"], flavours: ["naturel", "bosvruchten", "aardbei", "framboos", "perzik", "mango", "ananas", "multivruchten"] });
ing("ijsthee", "l", ["drinks"], ["ijsthee", "icetea", "ice tea"], { also: ["ice tea"], not: ["siroop"] });
ing("cola", "l", ["drinks"], ["cola", "=pepsi"], {
  not: ["rum", "bacardi", "whisky", "jack daniel", "pitu", "batida", "bourbon", "wodka", "vodka", "sodastream", "soda mix", "cream soda"],
  variants: [["zero", "cola zero", ["zero", "light", "suikervrij", "no sugar"]], ["regular", "gewone cola", ["regular", "original", "classic"], true]],
});
ing("limonadesiroop", "l", ["drinks"], ["siroop", "limonadesiroop", "ranja", "diksap", "=cevitam", "=cévitam"], { wins: true, not: ["op siroop", "ahorn", "agave", "maple", "dadel", "pannenkoek", "glucose", "koffie"], also: ["ranja", "siroop", "diksap", "limonade"],
  flavours: ["aardbei", "framboos", "sinaasappel", "appel", "bosvruchten", "grenadine", "cassis", "multivruchten", "perzik", "peer", "citroen", "limoen", "mango", "passievrucht", "kers"] });
ing("bier", "l", ["drinks"], ["bier", "pils", "pilsener", "pilsner"], {
  not: ["radler", "azijn", "glas", "worst", "pul", "opener", "kaas", "mosterd", "brood", "cadeau", "geschenk", "gazeuse", "cider"],
  variants: [["alcoholvrij", "alcoholvrij bier", ["0.0", "0,0", "alcoholvrij", "alcoholarm"]], ["pils", "pils", ["pils", "pilsener", "pilsner", "lager"]]], shelf: /^(bier|bier, pils|pilsener( bier)?|speciaal ?bier|alcoholvrij bier.*|bokbieren|mexicaans bier|pils 0\.0|speciaalbier 0\.0)$/i, notShelf: /^(cider.*|fruitbieren|fris en fruitig bier|radler( 0\.0)?|cider en fruitbier 0\.0)$/i,
});
ing("tonic", "l", ["drinks"], ["tonic"], { not: ["gin", "wodka", "vodka", "isotonic", "hyper", "sport"] });
ing("water", "l", ["drinks"], ["water", "bronwater", "mineraalwater", "smaakwater", "vitaminwater", "vitaminewater", "fruitwater", "=vitamin well", "=spa touch", "=spa fruit"], {
  not: ["kokos", "tonic", "drinkfles", "waterfles", "kraan", "watermeloen", "ijs", "rozen", "siroop", "limonade"],
  variants: [["bruisend", "bruisend water", ["bruisend", "sparkling", "koolzuurhoudend", "met prik", "touch"]], ["plat", "plat water", ["plat", "still", "niet bruisend", "koolzuurvrij", "zonder prik"], true]],
  flavours: ["naturel", "citroen", "limoen", "granaatappel", "appel", "kers", "framboos", "aardbei", "cassis", "perzik", "mango", "munt", "ginger"],
});
// Juice, nectar and fruit drink, of whatever fruit but orange or apple alone,
// which have their own: "Fruity Juice Sinaasappel mango", "Dubbeldrank Ananas
// & guave".
ing("vruchtensap", "l", ["drinks"], ["sap", "vruchtensap", "fruitsap", "multivruchtensap", "nectar", "vruchtennectar", "juice", "fruitdrank", "vruchtendrank",
  "=dubbelfris", "=dubbelfrisss", "=dubbeldrank", "=wicky", "=taksi", "capri-sun", "capri sun", "=tintelfruit", "fruitdrink", "=oasis", "=maaza", "=superjuice"], {
  not: ["siroop", "diksap", "limonade", "cider", "bier", "wijn", "azijn", "shot", "shotje", "smoothie", "groente", "tomaat", "tomaten", "biet", "wortel", "aloe", "kokos", "citroensap", "limoensap", "saus", "ijs", "zuurkool", "kombucha", "water"],
  variants: [["nectar", "vruchtennectar", ["nectar"]], ["vers", "vers sap", ["vers ", "versgeperst", "vers geperst", "gekoeld"]]],
  flavours: ["granaatappel", "sinaasappel", "appel", "multivruchten", "mango", "ananas", "druif", "cranberry", "perzik", "peer", "aardbei", "framboos", "bosvruchten", "banaan", "passievrucht", "kers", "citroen", "cassis"],
});
// Soft drinks but cola, tonic and iced tea, which have their own; mostly
// named by brand alone, so its shelves say it too.
ing("frisdrank", "l", ["drinks"], ["frisdrank", "frisdranken", "limonade", "sinas", "cassis", "bitter lemon", "ginger ale", "ginger beer", "gingerbeer", "energiedrank", "energy drink", "energydrink", "sportdrank", "sportdrink",
  "=fanta", "=sprite", "=7up", "=7-up", "seven up", "=sisi", "=rivella", "royal club", "dr. pepper", "dr pepper", "mountain dew", "=fernandes", "mogu mogu", "red bull", "monster energy", "=rockstar", "=bullit", "=celsius", "=shakura", "=aquarius", "=powerade", "=gatorade", "=extran", "aa drink", "=isostar", "=crystal clear", "=lipton sparkling"], {
  not: ["siroop", "diksap", "eiwit", "protein", "cola", "pepsi", "ijsthee", "ice tea", "icetea", "tonic", "bier", "pils", "radler", "gazeuse", "wijn", "rum", "gin", "wodka", "vodka", "whisky", "likeur", "cocktail", "snoep", "lolly", "kauwgom", "gum", "drop", "poeder", "tablet", "bruistablet", "taart", "koek", "kokoswater", "kombucha", "water", "chips", "ijs"],
  shelf: /^(sinas(, cassis)?|(blikjes|flessen) sinas|((flessen|blikjes|pakken|flesjes) )?fris met fruitsmaak|lemon, lime|ginger ale en ginger beer|speciaal fris|overige frisdrank|energiedranken|sportdrink|sportdranken|sportdrank, energiedrank|sport-, energiedrank|energy- of sportdrank)$/i,
  variants: [["energie", "energiedrank", ["energy", "energie", "red bull", "rockstar", "bullit", "celsius", "shakura"]], ["sport", "sportdrank", ["sport", "isoton", "aa drink", "aquarius", "extran", "powerade", "gatorade", "isostar"]],
    ["zero", "frisdrank zero", ["zero", "light", "suikervrij", "no sugar", "0% suiker", "sugar free", "sugarfree", "1kcal"]], ["gewoon", "gewone frisdrank", ["regular", "original"], true]],
  flavours: ["sinaasappel", "citroen", "limoen", "cassis", "appel", "framboos", "aardbei", "kers", "mango", "perzik", "multivruchten", "ginger", "druif", "ananas", "passievrucht"],
});

// ── Meal kits ───────────────────────────────────────────────────────────
// A box or bag with what one dish takes: fresh, the vegetables cut with a
// sauce and spices (Verspakket roti masala), or kept on the shelf, the dry
// parts of one (Old El Paso fajita). Not the spice mixes beside them, nor
// soup kits, which are soepgroente.
ing("maaltijdpakket", "piece", ["readymeal", "produce", "pantry"], ["maaltijdpakket", "maaltijdpakketten", "verspakket", "verspakketten", "maaltijdbox", "kookpakket", "mealkit", "meal kit", "dinner kit", "fajita kit", "taco kit", "burrito kit", "enchilada kit", "wrap kit", "tortilla kit", "wereldgerecht", "wereldgerechten"], {
  wins: true,
  not: ["soep", "soepgroente", "soepgroenten", "soeppakket", "kippensoep", "erwtensoep", "groentesoep", "kruidenmix", "mix voor", "saus", "hak ", "heat & eat", "maggi noodles", "maggi noedels", "seasoning", "chicken mix"],
  shelf: /^(maaltijdpakket(ten)?|verspakketten|verse maaltijdpakketten|maaltijdpakketten, maaltijdmixen)$/i,
  also: ["maaltijdpakketten", "verspakket"],
  variants: [{ id: "vers", name: "verspakket", words: ["verspakket", "vers ", "verse "], shelf: /^(verspakketten|verse maaltijdpakketten|maaltijdpakket)$/i },
    { id: "houdbaar", name: "houdbaar maaltijdpakket", words: ["houdbaar"], fallback: true }],
});

// ── Diet and sports food ────────────────────────────────────────────────
// What the Chains shelve as "Sportvoeding, afslankvoeding": protein bars,
// shakes and powders, meal replacements. Not sports drinks, which are fris,
// nor protein yoghurt and kwark, kept with the dairy.
ing("dieetvoeding", "kg", ["pantry", "drinks", "snacks"], ["dieetvoeding", "sportvoeding", "afslankvoeding", "eiwitreep", "eiwitrepen", "proteïnereep", "proteïnerepen", "proteinereep", "proteinerepen", "protein bar", "proteinbar", "eiwitshake", "proteïneshake", "proteineshake", "protein shake", "eiwitdrank", "eiwitlimonade", "eiwitpoeder", "proteïnepoeder", "proteinepoeder", "whey", "maaltijdvervanger", "maaltijdshake", "=modifast", "=slim-fast", "=slimfast", "=barebells", "=herbalife"], {
  wins: true,
  not: ["yoghurt", "kwark", "skyr", "vla", "pudding", "melk", "saus", "ketchup", "mayonaise", "pindakaas", "peanut butter", "oats", "havermout", "breakfast", "hummus", "cake"],
  shelf: /^(sportvoeding.*|afslankvoeding|proteïne (repen|shake)|eiwitpoeder|sportsupplementen|pre workout|(voor|na|tijdens) het sporten|dranken & shakes)$/i,
  variants: aspect("soort", [["reep", "eiwitreep", ["reep", "repen", "bar", "eiwitreep", "eiwitrepen", "proteïnereep", "proteïnerepen", "proteinereep", "proteinerepen", "proteinbar"]], ["drank", "eiwitdrank", ["shake", "drank", "drink", "limonade", "lemonade", "milk", "shot", "water", "eiwitshake", "proteïneshake", "proteineshake", "eiwitdrank", "eiwitlimonade", "maaltijdshake"]], ["poeder", "eiwitpoeder", ["poeder", "powder", "whey", "eiwitpoeder", "proteïnepoeder", "proteinepoeder"]]]),
});

// ── Pets ────────────────────────────────────────────────────────────────
// Mostly named by brand, so their shelves say which animal too. Not the
// litter, toys or care beside them.
const PET_NOT = ["bak", "korrel", "grit", "zand", "speelgoed", "speeltje", "shampoo", "vlo", "teek", "borstel", "riem", "halsband", "poepzak", "mand", "krabpaal", "hooi", "stro", "houtvezel", "vogel", "parkiet", "kanarie", "knaagdier", "cavia", "hamster"];
const PET_KINDS = (animal: string) => aspect("soort", [
  ["snack", `${animal}snacks`, ["snack", "treat", "dreamies", "stick", "dental", "kauw", "mergkoek", "beloning", "knabbel"]],
  ["nat", `nat ${animal}voer`, ["gelei", "jelly", "saus", "gravy", "paté", "pate", "mousse", "natvoer", "natte", "pouch", "maaltijdzakjes", "blik", "terrine", "chunks", "reepjes", "hapjes", "nat "]],
  ["droog", `droog ${animal}voer`, ["brokjes", "brokken", "droog", "droge", "kibble", "krokantjes"]],
]);
const PET_FLAVOURS = ["kip", "rund", "lam", "kalkoen", "eend", "konijn", "zalm", "tonijn", "vis"];
ing("kattenvoer", "kg", ["pet"], ["kattenvoer", "kattenvoeding", "kattenbrokjes", "kattensnack", "kattensnacks", "kattenmelk", "kat", "katten", "kitten", "cat", "poes",
  "=whiskas", "=felix", "=sheba", "gourmet gold", "gourmet perle", "gourmet mon petit", "gourmet a la carte", "gourmet revelations", "perfect fit", "=friskies", "=kitekat", "purina one", "cat chow", "=dreamies", "=catisfactions"], {
  not: [...PET_NOT, "hond", "dog", "puppy"],
  shelf: /^(kat|kat - .*|(nat|droog) kattenvoer|katten(voeding|snacks).*)$/i,
  variants: PET_KINDS("katten"), flavours: PET_FLAVOURS,
});
ing("hondenvoer", "kg", ["pet"], ["hondenvoer", "hondenvoeding", "hondenbrokken", "hondensnack", "hondensnacks", "hond", "honden", "puppy", "dog",
  "=pedigree", "=cesar", "=frolic", "=bonzo", "=chappi", "dog chow", "=beneful", "=markies", "=schmackos", "=dentastix"], {
  not: [...PET_NOT, "kat", "katten", "kitten", " cat"],
  shelf: /^(hond|hond - .*|(nat|droog) hondenvoer|honden(voeding|snacks).*)$/i,
  variants: PET_KINDS("honden"), flavours: PET_FLAVOURS,
});

export const VOCABULARY: readonly IngredientDef[] = defs;

/** Fails loudly on a vocabulary that would map ambiguously. */
export function checkVocabulary(vocabulary: readonly IngredientDef[] = VOCABULARY): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const d of vocabulary) {
    if (ids.has(d.id)) problems.push(`duplicate Ingredient id: ${d.id}`);
    ids.add(d.id);
    const variants = new Set<string>();
    for (const v of d.variants) {
      if (variants.has(v.id)) problems.push(`${d.id}: duplicate Variant ${v.id}`);
      variants.add(v.id);
    }
    for (const a of ASPECTS) if (d.variants.filter((v) => v.fallback && (v.aspect ?? "soort") === a).length > 1) problems.push(`${d.id}: more than one fallback Variant in ${a}`);
    for (const v of d.variants) if (v.id.includes("+")) problems.push(`${d.id}: Variant ${v.id} has a "+", which joins Variants`);
    if (d.equals[d.unit] !== undefined) problems.push(`${d.id}: converts its own unit`);
  }
  return problems;
}
