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
 */

import type { Aisle } from "./aisles.ts";

export type ComparisonUnit = "kg" | "l" | "piece";

export interface VariantDef {
  readonly id: string;
  /** What a shopper types for it, such as "halfvolle melk". */
  readonly name: string;
  readonly words: readonly string[];
  readonly fallback?: boolean;
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
}

interface Options {
  also?: string[];
  not?: string[];
  variants?: (VariantDef | [id: string, name: string, words: string[], fallback?: boolean])[];
  equals?: Partial<Record<ComparisonUnit, number>>;
  name?: string;
  mix?: boolean;
  anyForm?: boolean;
}

const defs: IngredientDef[] = [];
function ing(id: string, unit: ComparisonUnit, aisles: Aisle[], words: string[], o: Options = {}): void {
  defs.push({
    id, name: o.name ?? id, unit, aisles, words, also: o.also ?? [], not: o.not ?? [],
    variants: (o.variants ?? []).map((v) => Array.isArray(v) ? { id: v[0], name: v[1], words: v[2], ...(v[3] ? { fallback: true } : {}) } : v),
    equals: o.equals ?? {},
    mix: o.mix ?? false,
    anyForm: o.anyForm ?? false,
  });
}

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
ing("zoete aardappelen", "kg", ["produce", "frozen"], ["zoete aardappel"], { also: ["zoete aardappel", "bataat"] });
ing("friet", "kg", ["frozen", "produce"], ["friet", "patat", "frites"], { also: ["patat", "frites"] });
ing("aardappelpuree", "kg", ["produce", "frozen", "pantry"], ["aardappelpuree", "puree"], { not: ["tomaten", "appel", "chocolade"] });

// ── Vegetables ──────────────────────────────────────────────────────────
ing("wortelen", "kg", VEG, ["wortel", "wortelen", "peen", "winterpeen", "bospeen", "waspeen", "worteltjes"], {
  not: ["sap", "taart", "cake", "salade", "mieriks"],
  also: ["wortels", "peen", "worteltjes"],
});
ing("uien", "kg", ["produce", "frozen"], ["uien", "ui"], {
  not: ["gebakken", "crispy", "soep", "lente", "bosui", "zilver", "chips", "ringen"],
  variants: [["rode", "rode uien", ["rode"]], ["gele", "gele uien", ["gele"], true]],
  also: ["ui"],
});
ing("bosui", "kg", FRESH_VEG, ["bosui", "lenteui", "bosuitje"], { also: ["lente-ui"] });
ing("sjalotten", "kg", FRESH_VEG, ["sjalot", "sjalotje"], { also: ["sjalotjes"] });
ing("zilveruitjes", "kg", TINNED, ["zilveruitje", "uitje"], { not: ["chips"] });
ing("knoflook", "kg", ["produce", "pantry"], ["knoflook"], { not: ["saus", "olie", "boter", "brood", "poeder", "korrel", "pers"] });
ing("prei", "kg", VEG, ["prei"], { not: ["soep"] });
ing("courgette", "piece", VEG, ["courgette", "courgettes"], { equals: { kg: 0.3 }, not: ["spaghetti", "noedels", "linten"] });
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
  not: ["soep", "saus", "ketchup", "puree", "gedroogd", "zongedroogd", "blokjes", "gepeld", "frito", "passata", "chips"],
  variants: [["snoep", "snoeptomaten", ["snoep", "cherry", "kers", "mini"]], ["tros", "trostomaten", ["tros"]],
    ["roma", "roma tomaten", ["roma"]], ["vlees", "vleestomaten", ["vlees"]]],
});
ing("tomatenblokjes", "kg", TINNED, ["tomatenblokje", "blokjestomaat"], { also: ["tomaten in blokjes"] });
ing("gepelde tomaten", "kg", TINNED, ["gepelde tomaat", "gepelde tomaten"], { also: ["gepelde tomaten"] });
ing("passata", "kg", TINNED, ["passata", "tomatenfrito", "gezeefde tomaten"], { equals: { l: 1 }, also: ["gezeefde tomaten"] });
ing("tomatenpuree", "kg", TINNED, ["tomatenpuree"], {});
ing("broccoli", "kg", VEG, ["broccoli"], { not: ["soep", "mix", "rijst", "gehaktbal"] });
ing("bloemkool", "piece", VEG, ["bloemkool"], { equals: { kg: 0.8 }, not: ["rijst", "soep", "mix", "kaas", "puree"] });
ing("spinazie", "kg", VEG, ["spinazie"], { not: ["soep", "pasta", "taart", "ravioli", "pizza", "crème", "creme"] });
ing("andijvie", "kg", ["produce", "frozen"], ["andijvie"], { not: ["stamppot", "salade"] });
ing("boerenkool", "kg", ["produce", "frozen"], ["boerenkool"], { not: ["stamppot", "chips"] });
ing("zuurkool", "kg", ["produce", "conserves", "deli"], ["zuurkool"], { anyForm: true, not: ["stamppot", "schotel"] });
ing("spruiten", "kg", VEG, ["spruit", "spruitjes"], { also: ["spruitjes"] });
ing("sperziebonen", "kg", VEG, ["sperziebonen", "sperzieboon", "haricots verts"], { also: ["haricots verts"] });
ing("snijbonen", "kg", VEG, ["snijbonen"], {});
ing("peultjes", "kg", VEG, ["peultje", "peulen", "sugar snaps", "sugarsnaps"], { also: ["sugar snaps"] });
ing("doperwten", "kg", ["frozen", "conserves"], ["doperwt", "erwt", "erwtjes"], { not: ["soep", "spliterwt", "kikkererwt", "wortel"] });
ing("doperwten en wortelen", "kg", ["frozen", "conserves"], ["doperwten en wortel", "erwten en wortel", "erwtjes en wortel", "doperwten wortel", "doperwtjes & worteltjes", "doperwtjes met worteltjes", "doperwtjes worteltjes", "erwten & wortel", "tuinerwten wortel"], { not: ["soep"], mix: true });
ing("mais", "kg", ["frozen", "conserves", "produce"], ["mais", "maïs", "maiskolf", "=maïskolven", "=maiskolven"], { not: ["chips", "zetmeel", "maizena", "olie", "wafel", "meel", "pop"] });
ing("champignons", "kg", VEG, ["champignon", "champignons"], {
  not: ["soep", "saus", "roomsaus"],
  variants: [["kastanje", "kastanjechampignons", ["kastanje"]], ["wit", "witte champignons", ["wit"], true]],
});
ing("paddenstoelen", "kg", VEG, ["paddenstoel", "oesterzwam", "shiitake", "portobello"], { not: ["soep", "saus", "risotto"] });
ing("aubergine", "piece", VEG, ["aubergine"], { equals: { kg: 0.3 }, not: ["dip", "gegrild"] });
ing("pompoen", "piece", ["produce"], ["pompoen", "flespompoen", "butternut"], { equals: { kg: 1.2 }, not: ["soep", "pitten", "spaghetti", "stamp", "verspakket"] });
ing("knolselderij", "piece", FRESH_VEG, ["knolselderij"], { equals: { kg: 0.8 } });
ing("bleekselderij", "kg", FRESH_VEG, ["bleekselderij", "selderijstengel"], {});
ing("venkel", "piece", FRESH_VEG, ["venkel"], { equals: { kg: 0.3 }, not: ["thee", "zaad"] });
// A red cabbage sold per piece weighs about 1.25 kg.
ing("rode kool", "kg", ["produce", "conserves", "frozen"], ["rodekool", "rode kool"], { equals: { piece: 0.8 }, also: ["rodekool"], not: ["stamppot"] });
ing("witte kool", "kg", FRESH_VEG, ["wittekool", "witte kool"], { also: ["wittekool"] });
ing("spitskool", "kg", FRESH_VEG, ["spitskool"], {});
ing("chinese kool", "kg", FRESH_VEG, ["chinese kool", "chinakool"], {});
ing("paksoi", "kg", FRESH_VEG, ["paksoi", "paksoy", "pakchoi"], {});
ing("witlof", "kg", FRESH_VEG, ["witlof"], {});
ing("koolrabi", "piece", FRESH_VEG, ["koolrabi"], { equals: { kg: 0.4 } });
ing("rode bieten", "kg", ["produce", "conserves"], ["biet", "bieten", "rodebiet", "bietjes"], { not: ["sap", "chips", "salade", "hummus"] });
ing("radijs", "kg", FRESH_VEG, ["radijs", "radijsjes"], {});
ing("pastinaak", "kg", FRESH_VEG, ["pastinaak"], {});
ing("asperges", "kg", ["produce", "conserves"], ["asperge", "asperges"], { not: ["soep", "saus"] });
ing("avocado", "piece", ["produce", "frozen"], ["avocado", "avocados"], { equals: { kg: 0.2 }, not: ["dip", "guacamole", "olie", "spread"] });
ing("taugé", "kg", ["produce", "conserves"], ["taugé", "tauge"], {});
ing("ijsbergsla", "piece", FRESH_VEG, ["ijsbergsla", "ijsberg"], { equals: { kg: 0.5 }, also: ["ijsberg sla"] });
ing("kropsla", "piece", FRESH_VEG, ["kropsla", "botersla"], { equals: { kg: 0.3 } });
ing("sla", "kg", FRESH_VEG, ["sla", "slamelange", "melange", "romaine", "eikenblad"], { not: ["dressing", "saus", "ijsberg", "krop", "veld", "rucola", "maaltijd", "rauwkost"] });
ing("rucola", "kg", FRESH_VEG, ["rucola"], {});
ing("veldsla", "kg", FRESH_VEG, ["veldsla"], {});
ing("rauwkost", "kg", FRESH_VEG, ["rauwkost", "koolsla", "julienne"], { mix: true });
ing("roerbakgroente", "kg", ["produce", "frozen"], ["roerbakgroente", "wokgroente", "roerbakmix", "fijne roerbak", "italiaanse roerbak", "mexicaanse roerbak", "oosterse roerbak", "hollandse roerbak", "champignon roerbak", "wokmix", "nasigroente", "bamigroente", "ovengroente"], { also: ["wokgroente"], mix: true });
ing("soepgroente", "kg", ["produce", "frozen"], ["soepgroente"], { mix: true });
ing("stamppotgroente", "kg", ["produce", "frozen"], ["stamppotgroente", "hutspot", "stamppot"], { mix: true, not: ["worst", "gehakt", "maaltijd"] });
ing("gember", "kg", ["produce", "pantry"], ["gember", "gemberwortel"], { not: ["bier", "koek", "shot", "thee", "siroop", "drank", "ale", "poeder", "snoep"] });
ing("rode peper", "kg", FRESH_VEG, ["peper", "pepers", "chilipeper", "chili"], {
  not: ["zwarte", "witte", "gemalen", "molen", "saus", "korrel", "steak", "paprika", "zout", "salami", "poeder", "carne", "bonen", "padron"],
  also: ["peper", "chilipeper", "chili pepers"],
});

// ── Fresh herbs ─────────────────────────────────────────────────────────
for (const [id, words] of [
  ["peterselie", ["peterselie"]], ["koriander", ["koriander"]], ["basilicum", ["basilicum"]], ["bieslook", ["bieslook"]],
  ["dille", ["dille"]], ["munt", ["munt", "muntblad"]], ["tijm", ["tijm"]], ["rozemarijn", ["rozemarijn"]],
] as [string, string[]][]) {
  ing(id, "kg", ["produce", "frozen"], words, { not: ["thee", "pesto", "olie", "gedroogd", "saus", "kauwgom", "snoep", "pastille", "drop", "aardappel", "potatoes", "kriel"] });
}

// ── Fruit ───────────────────────────────────────────────────────────────
ing("appels", "kg", ["produce", "frozen"], ["appel", "appels", "appeltjes", "elstar", "jonagold", "jonagored", "braeburn", "pink lady", "kanzi", "goudrenet", "granny smith"], {
  not: ["sap", "moes", "taart", "flap", "stroop", "chips", "azijn", "gedroogd", "cider", "bol", "compote", "beignet", "strudel", "knijpfruit", "smoothie"],
  variants: [["elstar", "elstar appels", ["elstar"]], ["jonagold", "jonagold appels", ["jonagold", "jonagored"]],
    ["goudrenet", "goudrenetten", ["goudrenet"]], ["granny", "granny smith", ["granny"]], ["braeburn", "braeburn appels", ["braeburn"]]],
  also: ["appel"],
});
ing("peren", "kg", FRUIT, ["peer", "peren", "conference", "doyenné", "stoofpeer", "stoofperen"], {
  not: ["sap", "siroop", "drank", "taart", "stroop"],
  variants: [["stoof", "stoofperen", ["stoof", "gieser"]], ["hand", "handperen", ["conference", "doyenn"], true]],
  also: ["peer"],
});
ing("bananen", "kg", FRUIT, ["banaan", "bananen"], { not: ["chips", "brood", "smoothie", "snoep", "melk", "gedroogd", "taart"], also: ["banaan"] });
ing("sinaasappels", "kg", FRUIT, ["sinaasappel", "sinaasappelen", "sinaasappels"], { not: ["sap", "marmelade", "limonade", "siroop", "drank", "chocolade"], also: ["sinaasappel"] });
ing("mandarijnen", "kg", FRUIT, ["mandarijn", "mandarijnen", "clementine", "clementines"], { not: ["sap", "conserven", "partjes op siroop"] });
ing("citroenen", "piece", ["produce"], ["citroen", "citroenen"], { equals: { kg: 0.1 }, not: ["sap", "limonade", "thee", "melisse", "gras", "taart", "cake", "drank", "rasp", "snoep", "frisdrank"], also: ["citroen"] });
ing("limoenen", "piece", ["produce"], ["limoen", "limoenen", "limes"], { equals: { kg: 0.07 }, not: ["sap", "limonade", "drank", "frisdrank"], also: ["limoen"] });
ing("grapefruit", "piece", ["produce"], ["grapefruit"], { equals: { kg: 0.4 }, not: ["sap", "drank", "frisdrank"] });
ing("druiven", "kg", FRUIT, ["druif", "druiven"], { not: ["sap", "suiker", "rozijn"] });
ing("aardbeien", "kg", FRUIT, ["aardbei", "aardbeien"], { not: ["jam", "yoghurt", "kwark", "taart", "smoothie", "snoep", "limonade", "drink", "siroop", "chocolade"] });
ing("blauwe bessen", "kg", FRUIT, ["blauwe bes", "bosbes", "bosbessen", "blueberries"], { also: ["blauwe bessen", "bosbessen"], not: ["jam", "yoghurt", "muffin", "smoothie"] });
ing("frambozen", "kg", FRUIT, ["framboos", "frambozen"], { not: ["jam", "yoghurt", "siroop", "limonade", "smoothie", "azijn"] });
ing("kersen", "kg", FRUIT, ["kers", "kersen"], { not: ["tomaat", "tomaten", "bonbon", "likeur", "jam", "bier", "limonade", "siroop"] });
ing("kiwi's", "piece", FRUIT, ["kiwi", "kiwis"], { equals: { kg: 0.1 }, not: ["bes"], also: ["kiwi"] });
ing("mango", "piece", FRUIT, ["mango", "mangos"], { equals: { kg: 0.4 }, not: ["sap", "chutney", "smoothie", "drank", "gedroogd", "lassi", "yoghurt"] });
ing("ananas", "piece", FRUIT, ["ananas"], { equals: { kg: 1.2 }, not: ["sap", "drank", "gedroogd"] });
ing("meloen", "piece", ["produce"], ["meloen", "watermeloen", "galiameloen", "cantaloupe", "honingmeloen"], { equals: { kg: 1.5 } });
ing("pruimen", "kg", FRUIT, ["pruim", "pruimen"], { not: ["gedroogd", "jam"] });
ing("nectarines", "kg", FRUIT, ["nectarine", "perzik", "perziken"], { not: ["sap", "yoghurt", "drank", "ijsthee", "siroop"] });
ing("granaatappel", "piece", ["produce"], ["granaatappel", "=granaatappelpitjes"], { equals: { kg: 0.3 } });
ing("fruitsalade", "kg", ["produce", "conserves"], ["fruitsalade", "fruitmix"], { mix: true });
ing("appelmoes", "kg", TINNED, ["appelmoes", "appelcompote"], { not: ["knijp"] });
ing("rozijnen", "kg", PANTRY, ["rozijn", "rozijnen", "krenten", "sultana"], { not: ["brood", "bol", "koek"] });
ing("dadels", "kg", ["pantry", "produce", "deli"], ["dadel", "dadels"], {});

// ── Meat ────────────────────────────────────────────────────────────────
ing("gehakt", "kg", MEAT, ["gehakt", "gehaktmix"], {
  not: ["bal", "ballen", "schnitzel", "slavink", "brood", "kruiden", "mix voor", "vega", "speklap", "hamburger", "cordon"],
  // Half-om-half first: "Half-om-Half Gehakt Varken-Rund" names rund as well.
  variants: [["half-om-half", "half-om-half gehakt", ["half om half", "half-om-half", "h.o.h", "gemengd", "varken-rund"]],
    ["rund", "rundergehakt", ["runder", "rund"]], ["varken", "varkensgehakt", ["varkens"]], ["kip", "kipgehakt", ["kip"]]],
});
ing("gehaktballen", "kg", MEAT, ["gehaktbal", "gehaktballen", "balletje", "slavink"], { not: ["vega", "soep", "saus", "tomatensaus", "jus"] });
ing("hamburgers", "kg", MEAT, ["hamburger", "burger", "burgers"], { not: ["vega", "broodje", "saus", "kruiden", "kip"] });
ing("kipfilet", "kg", MEAT, ["kipfilet", "kipfilets", "kippenfilet", "kipfiletreepje", "kipfiletblokje", "kipreepje", "kipblokje", "kiphaasje", "kipstukje"], {
  not: ["vleeswaren", "gerookt", "broodbeleg", "gegrild", "flinterdun", "plakjes", "salade", "spread", "pastei", "vegetarisch", "vega", "nugget"],
  variants: [["heel", "hele kipfilet", ["heel", "hele", "filet"], true], ["blokjes", "kipblokjes", ["blokje", "reepje", "stukjes", "repen"]]],
  also: ["kipfilet", "kippenfilet"],
});
ing("kipdijfilet", "kg", MEAT, ["kipdijfilet", "dijfilet", "kippendij", "kipdij", "kipdijreepje", "kipdijblokje"], { not: ["vleeswaren", "spies", "sate"], also: ["kipdij", "kipdijen"] });
ing("kippenpoten", "kg", MEAT, ["kippenpoot", "kippenpoten", "drumstick", "drumsticks", "kippenbout", "kippenbouten"], { also: ["drumsticks", "kippenbouten"] });
ing("kipvleugels", "kg", MEAT, ["kipvleugel", "kippenvleugel", "wing", "wings"], {});
ing("hele kip", "kg", MEAT, ["hele kip", "kip"], { not: ["filet", "dij", "poot", "vleugel", "gehakt", "schnitzel", "burger", "nugget", "blokje", "reep", "kerrie", "salade", "bouillon", "kruiden", "saus", "sate", "spies", "worst", "cordon", "gyros", "shoarma", "pastei", "vega", "soep", "ham", "doner", "tandoori", "pittige"] });
ing("kalkoenfilet", "kg", MEAT, ["kalkoenfilet", "kalkoen"], { not: ["vleeswaren", "gerookt", "plakjes", "rollade", "salchichon", "worst"] });
ing("speklappen", "kg", MEAT, ["speklap", "speklappen"], { not: ["kruiden", "vega"] });
ing("spekblokjes", "kg", ["meat", "deli"], ["spekblokje", "spekreepje", "spekjes", "lardon"], { also: ["spekjes", "spekreepjes"] });
ing("ontbijtspek", "kg", ["meat", "deli"], ["ontbijtspek", "bacon"], {});
ing("varkenshaas", "kg", MEAT, ["varkenshaas", "varkenshaasje", "haasje"], {});
ing("karbonade", "kg", MEAT, ["karbonade", "karbonades", "schouderkarbonade", "haaskarbonade"], {});
ing("schnitzels", "kg", MEAT, ["schnitzel", "schnitzels"], { not: ["vega", "kip", "kaas", "cordon"] });
ing("varkensvlees", "kg", MEAT, ["varkensvlees", "procureur", "procureurlap", "varkenslap", "sparerib", "spareribs", "casselerrib", "varkensoester", "varkensfilet", "fricandeau", "hamlap", "hamlappen", "varkensrollade", "filetlap", "filetlappen"], {});
ing("biefstuk", "kg", MEAT, ["biefstuk", "biefstukken", "steak", "steaks", "entrecote", "ribeye", "tournedos", "kogelbiefstuk"], { not: ["kruiden", "vega", "saus", "peper", "tartaar"] });
ing("stoofvlees", "kg", MEAT, ["stoofvlees", "sukadelap", "sukadelappen", "runderlap", "runderlappen", "stooflap", "stooflappen", "riblap", "riblappen", "draadjesvlees"], { also: ["sukadelappen", "runderlappen"] });
ing("rundvlees reepjes", "kg", MEAT, ["runderreepje", "biefreepje", "runderpoulet", "rund reepjes", "runderstukjes"], {});
ing("rookworst", "kg", ["meat", "deli", "conserves"], ["rookworst"], { anyForm: true, not: ["erwtensoep", "stamppot", "broodje", "vegetarisch", "vega", "kip", "soep"] });
ing("braadworst", "kg", MEAT, ["braadworst", "braadworstjes", "saucijs", "saucijzen", "chipolata", "bratwurst", "barbecueworst"], {});
ing("shoarma", "kg", MEAT, ["shoarma", "gyros", "doner", "kebab"], { not: ["kruiden", "saus", "brood", "vega", "pizza"] });
ing("lamsvlees", "kg", MEAT, ["lamsvlees", "lamskotelet", "lamsbout", "lamsrack", "lamsgehakt"], {});

// ── Fish ────────────────────────────────────────────────────────────────
ing("zalm", "kg", ["fish", "frozen", "deli"], ["zalm", "zalmfilet", "zalmmoot", "zalmmoten"], {
  not: ["salade", "spread", "pastei", "sushi", "salmon spread"],
  variants: [["gerookt", "gerookte zalm", ["gerookt", "smoked"]], ["vers", "zalmfilet", ["filet", "moot", "moten"], true]],
});
ing("kabeljauw", "kg", FISH, ["kabeljauw", "kabeljauwfilet", "kabeljauwhaas"], {});
ing("pangasius", "kg", FISH, ["pangasius", "pangasiusfilet"], {});
ing("koolvis", "kg", FISH, ["koolvis", "koolvisfilet", "alaskakoolvis"], {});
ing("tilapia", "kg", FISH, ["tilapia", "tilapiafilet"], {});
ing("vissticks", "kg", ["frozen"], ["visstick", "vissticks", "fishsticks"], {});
ing("garnalen", "kg", ["fish", "frozen"], ["garnaal", "garnalen", "gamba", "gambas", "scampi", "scampis"], { not: ["chips", "kroket", "salade", "kroepoek", "cocktail"] });
ing("mosselen", "kg", ["fish", "frozen", "conserves"], ["mossel", "mosselen"], { not: ["saus"] });
ing("haring", "kg", ["fish", "deli", "conserves"], ["haring", "haringen", "maatjes", "maatjesharing"], { not: ["salade"] });
ing("makreel", "kg", ["fish", "deli", "conserves"], ["makreel", "makreelfilet"], { not: ["salade", "spread"] });
ing("tonijn", "kg", ["conserves", "fish", "frozen"], ["tonijn", "tonijnstukken", "tonijnfilet"], { not: ["salade", "spread", "pizza", "sushi"] });
ing("sardines", "kg", ["conserves"], ["sardine", "sardines", "sardientjes"], {});

// ── Vegetarian ──────────────────────────────────────────────────────────
ing("tofu", "kg", ["vega", "produce"], ["tofu"], {});
ing("tempeh", "kg", ["vega", "produce"], ["tempeh"], {});
ing("vegetarisch gehakt", "kg", ["vega", "frozen"], ["gehakt", "vegagehakt", "gehaktstukjes"], { not: ["bal", "ballen", "burger"] });

// ── Dairy and eggs ──────────────────────────────────────────────────────
ing("melk", "l", ["dairy", "drinks"], ["melk"], {
  not: ["chocolade", "koffie", "poeder", "kokos", "geiten", "melkchocolade", "melkmeisje", "boter", "rijst", "zuiveldrank", "spread", "proteine", "protein"],
  variants: [["lactosevrij", "lactosevrije melk", ["lactosevrij", "lactose vrij", "lactofree"]], ["halfvol", "halfvolle melk", ["halfvol", "half vol"]], ["vol", "volle melk", ["volle", "vol "]],
    ["mager", "magere melk", ["mager"]]],
});
ing("karnemelk", "l", ["dairy", "drinks"], ["karnemelk"], {});
ing("chocolademelk", "l", ["dairy", "drinks"], ["chocolademelk", "chocomel"], {});
ing("koffiemelk", "l", ["dairy", "drinks"], ["koffiemelk", "koffiecreamer", "koffieroom"], {});
ing("havermelk", "l", ["vega", "drinks", "dairy"], ["havermelk", "haverdrink", "oatdrink", "oatly"], { also: ["haverdrink"] });
ing("sojamelk", "l", ["vega", "drinks", "dairy"], ["sojamelk", "sojadrink"], { also: ["sojadrink"] });
ing("amandelmelk", "l", ["vega", "drinks", "dairy"], ["amandelmelk", "amandeldrink"], { also: ["amandeldrink"] });
ing("kokosmelk", "l", ["pantry", "conserves"], ["kokosmelk", "kokosroom"], {});
ing("yoghurt", "l", ["dairy"], ["yoghurt", "yogurt", "skyr"], {
  equals: { kg: 1 },
  not: ["drink", "drank", "dressing", "saus", "rozijn", "bes", "aardbei", "perzik", "framboos", "kers", "vanille", "fruit", "muesli", "granola", "honing", "mango", "citroen", "stracciatella", "proteine", "protein", "lactosevrij"],
  variants: [["grieks", "griekse yoghurt", ["griek", "greek"]], ["skyr", "skyr", ["skyr"]], ["mager", "magere yoghurt", ["mager", "0%"]],
    ["halfvol", "halfvolle yoghurt", ["halfvol"]], ["vol", "volle yoghurt", ["volle", "vol "]]],
});
ing("kwark", "kg", ["dairy"], ["kwark"], { equals: { l: 1 }, not: ["drink", "fruit", "aardbei", "vanille", "bes", "kers", "perzik", "framboos", "citroen", "proteine", "protein"],
  variants: [["mager", "magere kwark", ["mager"]], ["half", "halfvolle kwark", ["halfvol"]], ["vol", "volle kwark", ["volle", "vol "]]] });
ing("vla", "l", ["dairy"], ["vla", "vanillevla", "chocoladevla"], { not: ["custard", "pudding"] });
ing("slagroom", "l", ["dairy"], ["slagroom"], { not: ["spuit", "taart", "soesje", "toetje"] });
ing("kookroom", "l", ["dairy"], ["kookroom"], { not: ["kruiden"] });
ing("crème fraîche", "l", ["dairy"], ["crème fraîche", "creme fraiche", "fraîche", "fraiche"], { equals: { kg: 1 }, also: ["creme fraiche"] });
ing("zure room", "l", ["dairy"], ["zure room", "sour cream"], { equals: { kg: 1 }, also: ["sour cream"] });
ing("roomboter", "kg", ["dairy"], ["roomboter", "boter", "grasboter"], {
  not: ["margarine", "halvarine", "plant", "sense", "cholesterol", "blue band", "pinda", "bak", "braad", "kruiden", "knoflook", "koek", "cake", "croissant", "spritsen", "vloeibaar", "olie", "appel", "zout"],
  variants: [["ongezouten", "ongezouten roomboter", ["ongezouten"], true], ["gezouten", "gezouten roomboter", ["gezouten"]]],
});
ing("margarine", "kg", ["dairy"], ["margarine", "halvarine", "becel", "blueband", "blue band", "plantboter"], { not: ["bak", "braad", "vloeibaar", "koken", "finesse"] });
ing("bak- en braadboter", "kg", ["dairy", "pantry"], ["bak- en braad", "bak en braad", "braadboter", "bakboter"], { also: ["bakboter", "braadboter"] });
ing("eieren", "piece", ["dairy"], ["eier", "eieren", "scharreleier", "scharreleieren"], {
  equals: { kg: 0.06 },
  not: ["salade", "chocolade", "paas", "spread", "kwartel", "verf", "pasta"],
  variants: [["scharrel", "scharreleieren", ["scharrel"]], ["vrije uitloop", "vrije-uitloopeieren", ["vrije uitloop", "uitloop"]]],
  also: ["ei", "eitjes"],
});

// ── Cheese ──────────────────────────────────────────────────────────────
ing("kaas", "kg", ["cheese", "dairy"], ["kaas", "gouda", "leerdammer", "maasdammer", "edammer", "beemster", "old amsterdam", "milner"], {
  not: ["smeer", "room", "geit", "schapen", "flavour", "vegan", "stengel", "mozzarella", "feta", "parmezaan", "brie", "camembert", "geraspt", "rasp", "strooi", "vega", "plantaardig", "saus", "fondue", "soufflé", "souffle", "chips", "cracker", "koek", "broodje", "stengel", "dip", "salade", "blokjes", "cottage", "hüttenkäse", "mascarpone", "ricotta", "halloumi"],
  variants: [["extra belegen", "extra belegen kaas", ["extra belegen"]], ["jong belegen", "jong belegen kaas", ["jong belegen"]],
    ["belegen", "belegen kaas", ["belegen"]], ["oud", "oude kaas", ["oude", "oud ", "overjarig"]], ["jong", "jonge kaas", ["jong"]]],
});
ing("geraspte kaas", "kg", ["cheese", "dairy"], ["geraspte", "geraspt", "strooikaas", "raspkaas", "geraspte kaas"], { not: ["parmezaan", "vega", "plantaardig"], also: ["strooikaas"] });
ing("geitenkaas", "kg", ["cheese", "dairy"], ["geitenkaas"], {});
ing("mozzarella", "kg", ["cheese", "dairy"], ["mozzarella", "burrata"], { not: ["stick", "pizza"] });
ing("feta", "kg", ["cheese", "dairy"], ["feta", "fetakaas", "witte kaas"], { not: ["salade", "spread", "dip"] });
ing("parmezaanse kaas", "kg", ["cheese", "dairy"], ["parmezaan", "parmezaanse", "parmigiano", "grana", "padano", "parmezaanse kaas", "padano kaas", "reggiano kaas"], { also: ["parmezaan", "parmigiano"] });
ing("roomkaas", "kg", ["cheese", "dairy"], ["roomkaas", "smeerkaas", "philadelphia", "mascarpone"], { not: ["saus", "dip"] });
ing("brie", "kg", ["cheese", "dairy"], ["brie", "camembert"], {});
ing("halloumi", "kg", ["cheese", "dairy"], ["halloumi", "grillkaas"], {});

// ── Deli ────────────────────────────────────────────────────────────────
ing("ham", "kg", ["deli", "meat"], ["ham", "achterham", "beenham", "schouderham", "rauwe ham", "parmaham", "serranoham"], { not: ["hamburger", "kaas", "salade", "spread", "croissant", "tosti", "pizza", "lap"],
  variants: [["rauw", "rauwe ham", ["rauwe", "parma", "serrano", "prosciutto"]], ["gekookt", "gekookte ham", ["achter", "been", "schouder", "gekookt"], true]] });
ing("kipfilet beleg", "kg", ["deli"], ["kipfilet", "kalkoenfilet"], { name: "kipfilet (beleg)", also: ["kipfilet beleg"] });
ing("salami", "kg", ["deli"], ["salami", "chorizo", "pepperoni", "snijworst"], { not: ["pizza", "chips"] });
ing("filet americain", "kg", ["deli"], ["americain", "américain"], { not: ["saus"] });
ing("leverworst", "kg", ["deli"], ["leverworst", "pate", "paté", "smeerworst"], {});
ing("hummus", "kg", ["deli", "pantry"], ["hummus", "houmous"], {});

// ── Bread ───────────────────────────────────────────────────────────────
ing("brood", "piece", ["bakery", "frozen"], ["=brood", "=broden", "boterham"], {
  equals: { kg: 0.8 },
  not: ["stok", "krenten", "rozijn", "libanees", "shoarma", "half", "mini", "suiker", "kruiden", "knoflook", "pita", "naan", "afbak", "kaas", "mais", "beleg", "pudding", "rijst", "kruimel", "paneer", "chips", "ontbijtkoek", "pistolet", "bol", "croissant", "bagel", "tortilla", "wrap", "beschuit", "cracker", "toast", "mix", "meel"],
  variants: [["volkoren", "volkorenbrood", ["volkoren"]], ["meergranen", "meergranenbrood", ["meergranen", "granen", "zaden", "spelt"]],
    ["bruin", "bruinbrood", ["bruin", "tarwe"]], ["wit", "witbrood", ["wit", "casino"]]],
});
ing("stokbrood", "piece", ["bakery", "frozen"], ["stokbrood", "baguette"], { equals: { kg: 0.25 }, not: ["kruiden", "knoflook", "pizza"] });
ing("afbakbroodjes", "piece", ["bakery", "frozen"], ["afbakbroodje", "afbakbroodjes", "pistolet", "pistolets", "petit pain"], { equals: { kg: 0.06 } });
ing("bolletjes", "piece", ["bakery", "frozen"], ["bolletje", "bolletjes", "=broodje", "=broodjes", "puntje", "puntjes"], { equals: { kg: 0.06 }, not: ["afbak", "krenten", "rozijn", "suiker", "hamburger", "kaas", "worst", "saucijz", "frikandel", "kroket", "pizza", "snack", "sandwich", "koffie", "chocolade", "croissant"] });
ing("tortilla's", "piece", ["bakery", "pantry"], ["tortilla", "tortillas", "wrap", "wraps"], { equals: { kg: 0.04 }, not: ["chips", "kit", "saus"], also: ["wraps", "tortilla"] });
ing("pitabroodjes", "piece", ["bakery", "pantry", "frozen"], ["pita", "pitabroodje", "pitabroodjes", "naan"], { equals: { kg: 0.08 } });
ing("croissants", "piece", ["bakery", "frozen"], ["croissant", "croissants", "croissantjes"], { equals: { kg: 0.05 }, not: ["ham", "kaas", "chocolade"] });
ing("beschuit", "kg", ["bakery", "pantry"], ["beschuit", "beschuiten"], {});
ing("crackers", "kg", ["bakery", "pantry"], ["cracker", "crackers", "knäckebröd", "rijstwafel", "rijstwafels"], {});

// ── Pantry ──────────────────────────────────────────────────────────────
ing("rijst", "kg", PANTRY, ["rijst", "basmati", "pandan", "zilvervliesrijst", "risottorijst", "risotto", "jasmijnrijst", "langgraan", "arborio"], {
  not: ["wafel", "melk", "drink", "drank", "pap", "bloem", "noedel", "mie", "azijn", "papier", "kaas", "bloemkool", "salade", "maaltijd", "nasi", "bami"],
  variants: [["basmati", "basmatirijst", ["basmati"]], ["pandan", "pandanrijst", ["pandan", "jasmijn"]], ["zilvervlies", "zilvervliesrijst", ["zilvervlies"]],
    ["risotto", "risottorijst", ["risotto", "arborio"]], ["langgraan", "langgraanrijst", ["langgraan", "witte"], true]],
});
ing("pasta", "kg", ["pantry", "readymeal"], ["pasta", "spaghetti", "penne", "macaroni", "fusilli", "farfalle", "tagliatelle", "lasagne", "lasagnebladen", "rigatoni", "orzo", "tortellini", "ravioli", "conchiglie", "linguine", "spaghettini", "fettuccine", "vermicelli"], {
  not: ["vanille", "boterham", "saus", "kruiden", "salade", "maaltijd", "mix", "courgette", "pompoen", "schotel", "groente"],
  variants: [["spaghetti", "spaghetti", ["spaghetti"]], ["penne", "penne", ["penne"]], ["macaroni", "macaroni", ["macaroni"]],
    ["fusilli", "fusilli", ["fusilli"]], ["tagliatelle", "tagliatelle", ["tagliatelle"]], ["lasagne", "lasagnebladen", ["lasagne"]],
    ["tortellini", "tortellini", ["tortellini", "ravioli"]]],
});
ing("mie", "kg", PANTRY, ["mie", "noedel", "noedels", "noodles", "rijstnoedel", "eiermie"], { not: ["soep", "saus", "kruiden", "maaltijd", "bami"], also: ["noedels", "noodles"] });
ing("couscous", "kg", PANTRY, ["couscous", "bulgur", "parelcouscous"], {});
ing("quinoa", "kg", PANTRY, ["quinoa"], {});
ing("havermout", "kg", PANTRY, ["havermout", "havervlok", "havervlokken", "oats"], { not: ["koek", "reep", "drink", "melk"] });
ing("muesli", "kg", PANTRY, ["muesli", "granola", "cruesli"], { not: ["reep", "repen", "yoghurt"] });
ing("cornflakes", "kg", PANTRY, ["cornflakes", "ontbijtgranen"], {});
ing("bloem", "kg", PANTRY, ["bloem", "tarwebloem", "patentbloem", "meel", "tarwemeel", "volkorenmeel"], { not: ["bakmeel", "zelfrijzend", "mais", "rijst", "kool", "pannenkoek", "mix"], also: ["meel", "tarwebloem"] });
ing("zelfrijzend bakmeel", "kg", PANTRY, ["bakmeel", "zelfrijzend"], {});
ing("pannenkoekmix", "kg", PANTRY, ["pannenkoekmix", "pannenkoekenmix", "pannenkoekmeel"], {});
ing("maizena", "kg", PANTRY, ["maizena", "maiszetmeel", "binder"], {});
ing("paneermeel", "kg", PANTRY, ["paneermeel", "panko"], {});
ing("suiker", "kg", PANTRY, ["suiker", "kristalsuiker", "basterdsuiker", "poedersuiker", "rietsuiker"], {
  not: ["vanille", "zoetje", "klontjes", "spek", "wafel", "brood", "vrij", "kaneel", "parels"],
  variants: [["kristal", "kristalsuiker", ["kristal"], true], ["basterd", "basterdsuiker", ["basterd", "bruine"]], ["poeder", "poedersuiker", ["poeder"]], ["riet", "rietsuiker", ["riet"]]],
});
ing("vanillesuiker", "kg", PANTRY, ["vanillesuiker"], {});
ing("bakpoeder", "kg", PANTRY, ["bakpoeder"], {});
ing("gist", "kg", PANTRY, ["gist"], {});
ing("olijfolie", "l", PANTRY, ["olijfolie"], { not: ["tonijn", "sardine", "spray", "zeep", "zonnebloem", "zon"],
  variants: [["extra vierge", "extra vierge olijfolie", ["extra vierge", "extra virgin"]], ["mild", "milde olijfolie", ["mild", "puur", "pure"]]] });
ing("zonnebloemolie", "l", PANTRY, ["zonnebloemolie", "frituurolie", "plantaardige olie", "arachideolie", "olie"], { not: ["olijf", "sesam", "kokos", "spray", "zonnebloempit", "massage", "baby", "tonijn", "sardine", "knoflook", "chili", "truffel", "etherische"] });
ing("azijn", "l", PANTRY, ["azijn", "balsamico"], { not: ["schoonmaak", "chips", "augurk", "uitje"] });
ing("mayonaise", "l", PANTRY, ["mayonaise", "fritessaus", "frietsaus"], { equals: { kg: 1 } });
ing("ketchup", "l", PANTRY, ["ketchup", "tomatenketchup"], { equals: { kg: 1 } });
ing("mosterd", "kg", PANTRY, ["mosterd"], { equals: { l: 1 }, not: ["soep", "saus", "dressing"] });
ing("sojasaus", "l", PANTRY, ["sojasaus", "ketjap", "ketjap manis", "kecap manis", "tamari"], { also: ["ketjap"] });
ing("pindasaus", "kg", PANTRY, ["pindasaus", "satésaus", "satesaus"], { equals: { l: 1 } });
ing("pesto", "kg", ["pantry", "deli", "readymeal"], ["pesto"], { not: ["pasta", "verspakket", "crackers", "chips", "presto"] });
ing("pastasaus", "kg", ["pantry", "readymeal"], ["pastasaus", "tomatensaus", "bolognese", "arrabiata", "napoletana", "carbonara"], { equals: { l: 1 }, not: ["lasagnette", "wereldgerecht", "mix", "kruiden", "maaltijd"] });
ing("bouillon", "kg", PANTRY, ["bouillon", "bouillonblokje", "bouillonblokjes", "fond", "fonds"], { equals: { l: 1 }, not: ["soep", "tomaten"] });
ing("zout", "kg", PANTRY, ["zout", "zeezout", "keukenzout"], { not: ["chips", "pinda", "noten", "ongezouten", "gezouten", "drop", "zoutjes", "karamel", "caramel", "boter", "kruidenzout", "selderij", "knoflook", "vaatwas", "regenereer"] });
ing("zwarte peper", "kg", PANTRY, ["peper", "peperkorrel", "peperkorrels"], { not: ["rode", "chili", "groene", "paprika", "saus", "steak", "zout", "cayenne", "jalape", "pepers", "salami", "koek", "munt"], also: ["peper"] });
ing("pindakaas", "kg", ["pantry"], ["pindakaas", "peanut butter", "fijngemalen pinda's", "gemalen pinda's"], { not: ["koek", "reep", "chocolade", "snoep", "bar"],
  variants: [["stukjes", "pindakaas met stukjes", ["stukjes", "crunchy"]], ["naturel", "pindakaas naturel", ["naturel", "100%"]]] });
ing("jam", "kg", ["pantry"], ["jam", "confiture", "fruitbeleg", "marmelade"], { not: ["koek", "taart", "yoghurt", "cake"] });
ing("hagelslag", "kg", ["pantry"], ["hagelslag", "vlokken", "chocoladevlokken"], { not: ["havervlok", "haver", "aardappel", "cornflakes", "kokos", "rogge", "spelt", "gerst", "tarwe", "granenvlokken", "boekweit", "quinoa", "rijst", "mais", "muesli"] });
ing("honing", "kg", ["pantry"], ["honing"], { not: ["koek", "mosterd", "thee", "drop", "snoep", "yoghurt", "cereal"] });
ing("chocoladepasta", "kg", ["pantry"], ["chocoladepasta", "nutella", "hazelnootpasta", "chocopasta"], {});
ing("currysaus", "l", PANTRY, ["curry", "currysaus"], { equals: { kg: 1 }, not: ["kerrie", "poeder", "pasta", "kruiden"] });
ing("kidneybonen", "kg", TINNED, ["kidneyboon", "kidneybonen"], { not: ["chili", "mix", "salade"] });
ing("bruine bonen", "kg", TINNED, ["bruine bonen", "bruine boon"], { also: ["bruine bonen"], not: ["soep"] });
ing("witte bonen", "kg", TINNED, ["witte bonen", "witte boon"], { also: ["witte bonen"], not: ["tomatensaus"] });
ing("kikkererwten", "kg", TINNED, ["kikkererwt", "kikkererwten"], { not: ["hummus", "chips"] });
ing("linzen", "kg", TINNED, ["linze", "linzen"], { not: ["soep", "salade"] });
ing("augurken", "kg", TINNED, ["augurk", "augurken", "cornichon", "cornichons"], {});
ing("olijven", "kg", ["conserves", "deli", "pantry"], ["olijf", "olijven"], { not: ["olie", "tapenade"] });
ing("pinda's", "kg", ["snacks", "pantry"], ["pinda", "pindas", "borrelnoot", "borrelnoten"], { not: ["kaas", "saus", "koek", "olie", "snoep", "chocolade", "rijst"], also: ["pindas"] });
ing("noten", "kg", ["snacks", "pantry", "produce"], ["noot", "noten", "cashew", "cashewnoten", "walnoot", "walnoten", "amandel", "amandelen", "hazelnoot", "hazelnoten", "pecan", "pistache", "notenmix", "studentenhaver"], { not: ["d'or", "penotti", "pudding", "pasta", "melk", "drink", "chocolade", "koek", "reep", "olie", "kokos", "spread", "pinda", "borrelnoot", "muskaat"] });
ing("kerrie", "kg", PANTRY, ["kerrie", "kerriepoeder", "currypoeder"], {});
ing("paprikapoeder", "kg", PANTRY, ["paprikapoeder"], {});
ing("kaneel", "kg", PANTRY, ["kaneel"], { not: ["thee", "koek", "brood", "bol", "rol", "suiker", "bakmix", "cake"] });

// ── Drinks, coffee and tea ──────────────────────────────────────────────
ing("koffie", "kg", ["drinks"], ["koffie", "koffiebonen", "filterkoffie", "snelfilter", "koffiepads", "koffiecups", "espresso", "oploskoffie"], {
  not: ["melk", "creamer", "room", "filterzak", "machine", "ijskoffie", "koek", "chocolade", "likeur", "drink"],
  variants: [["bonen", "koffiebonen", ["bonen"]], ["pads", "koffiepads", ["pads", "senseo"]], ["cups", "koffiecups", ["cups", "capsule", "nespresso", "dolce"]],
    ["oplos", "oploskoffie", ["oplos", "instant"]], ["filter", "filterkoffie", ["filter", "snelfilter", "gemalen"], true]],
});
ing("thee", "piece", ["drinks"], ["thee", "theezakje", "theezakjes", "rooibos", "earl grey"], { equals: { kg: 0.002 }, not: ["ijsthee", "ice", "glas", "pot", "lepel", "koek", "drink", "biscuit", "licht", "kaars"] });
ing("sinaasappelsap", "l", ["drinks"], ["sinaasappelsap", "jus d'orange"], {});
ing("appelsap", "l", ["drinks"], ["appelsap"], {});
ing("water", "l", ["drinks"], ["water", "bronwater", "mineraalwater"], { not: ["kokos", "tonic", "sparkling flavour", "smaak", "fles", "kraan", "watermeloen", "vitamin", "ijs", "rozen"] });

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
    if (d.variants.filter((v) => v.fallback).length > 1) problems.push(`${d.id}: more than one fallback Variant`);
    if (d.equals[d.unit] !== undefined) problems.push(`${d.id}: converts its own unit`);
  }
  return problems;
}
