/**
 * What the app shows: food and drink, and of alcohol only beer (owner's
 * decision, 2026-10-15). Pet food and baby food stay; nappies, detergent,
 * shampoo, candles and wine go. Decided when the catalogue is built, never
 * when a Chain is swept: the archive keeps every Product, so a rule found
 * wrong later can be re-run over every day already captured (ADR-0005).
 *
 * A Product is judged by its Chain's categories, each a path such as
 * "Kind & drogisterij > Luiers". One food category is enough to keep it, so
 * a beer also filed under a party shelf beside wine stays a beer. A Product
 * with no category that says anything is judged by its name and how it is
 * sold.
 */

export type Excluded = "nonfood" | "alcohol";

const segmentsOf = (path: string) => path.split(" > ").map((s) => s.trim());

/** Departments that are non-food as a whole, apart from what FOOD_WITHIN keeps. Lidl's sit one level down, under "Eten en dichtbij voedsel". */
const NONFOOD_DEPARTMENT = /drogisterij|huishoud|non.?food|bloemen|wonen|bouwmarkt|koken, tafelen|speelgoed/i;
/** Food inside such a department: Dirk files pet food under "Huishoud & huisdieren", baby food under "Kind & drogisterij". */
const FOOD_WITHIN = /voeding|voer\b|tussendoortjes|snacks|^drinken$/i;
/**
 * Shelves that say nothing of what is on them: a pet department with no
 * shelf below it holds litter beside the food, and theme shops and seasonal
 * ranges hold anything. A Product found only there is judged as one with no
 * category.
 */
const SAYS_NOTHING = /huisdier|^(hond|kat|vogel, knaagdier)$|themashop|assortiment$|^in out$/i;
/** Non-food shelves inside food departments: Jumbo's "Baby en kind > Luiers en verschonen", Aldi's "Paasassortiment > Pannen". */
const NONFOOD_WITHIN = /luiers|verschonen|verzorging|accessoires|zelfzorg|zwangerschap|kleding|speelgoed|kookgerei|keukengerei|^pannen$|(?<!taart|garneringen, )versiering|verlichting|voedingssupplement|cadeaukaarten|dierbenodig|barbecue benodig|kattenbak/i;

/**
 * Wine, spirits and mixed drinks, by shelf. Not /wijn/ alone: wine vinegar
 * is pantry. A department's own name is skipped where it names beer too
 * (Jumbo's "Bier en wijn"), so only Aldi's plain "Wijn" counts there.
 */
const NOT_BEER = /wijn(?!azijn)|sterke dran|slijterij|likeur|aperitie|^port\b|sherry|\bvermou|bubbels|champagne|prosecco|^cava$|\bcocktails?\b|mixdran|seltzer|advocaat|digestie|^gin\b|^rum\b|whisk[ey]|wodka|vodka|jenever|cognac|brandewijn|vieux|tequila|^bitters$|miniaturen|^shots$|^hugo$|^cider$/i;
const BEER = /bier|pils|radler/i;

/** A beer shelf: its own name says so, or its parent does and it is not wine ("Speciaalbier > Tripel", not "Kerst wijn, bier > Kerst witte wijn"). */
function isBeer(segments: readonly string[]): boolean {
  const last = segments.at(-1)!, parent = segments.at(-2);
  return BEER.test(last) || (segments.length > 2 && !!parent && BEER.test(parent) && !NOT_BEER.test(last));
}

function judgeCategory(path: string): Excluded | "food" | "unknown" {
  const s = segmentsOf(path), below = s.slice(1);
  if (!isBeer(s) && (below.some((x) => NOT_BEER.test(x)) || /^wijn$/i.test(s[0]!))) return "alcohol";
  // The deepest shelf that says decides: cat litter sits under "Huisdier > Kat"
  // beside the cat food, and Lidl's dog food under "Dierbenodigdheden".
  for (const x of below.toReversed()) {
    if (NONFOOD_WITHIN.test(x)) return "nonfood";
    if (FOOD_WITHIN.test(x)) return "food";
  }
  if (SAYS_NOTHING.test(s.at(-1)!)) return "unknown";
  return s.slice(0, 2).some((x) => NONFOOD_DEPARTMENT.test(x)) ? "nonfood" : "food";
}

/**
 * A Product with no category: Aldi's action articles, filed under "offer"
 * alone (1,055 of 3,794 on 2026-10-14). Those sold by the piece are nearly
 * all clothes, lamps, plants and tools, so by the piece is non-food unless the
 * name says food; by weight or volume is food unless the name says otherwise.
 */
const FOOD_PIECE_NAME = /eieren|muffin|repen|bolletjes|broodjes|snack|\bijs\b|kauw|voer\b|bieslook|basilicum|kruiden|bakdecoratie|wafel/i;
const NONFOOD_NAME = /wasmiddel|wasverzachter|toiletpapier|keukenrol|keukenpapier|shampoo|tandpasta|tandenborstel|deodorant|douchegel|bodymousse|handzeep|vaatwas|afwasmiddel|luier|reiniger|schuurmiddel|destop|maandverband|batterij|kaars|geurstokjes|geurparels|luchtverfris|kattenbak|afvalzak|vuilzak|schors|ruitensproei|powerspray|kruidenbad|grondverf|gewrichtsgel|pijngel|\btrui|jeans|sokken|deurmat|stofzuiger|braadpan|koekenpan|messenset|servies/i;
const NOT_BEER_NAME = /wijn(?!azijn|druiv)|chardonnay|chianti|merlot|cabernet|sauvignon|pinot|primitivo|rioja|tempranillo|cariñena|montepulciano|bodegas|bacchus|\brosé(?!\w)|prosecco|\bcava\b|champagne|whisk[ey]|wodka|vodka|likeur|jenever|mixdrink|seltzer|hard iced/i;

function judgeName(name: string, unit: string | undefined): Excluded | null {
  if (NOT_BEER_NAME.test(name)) return "alcohol";
  if (NONFOOD_NAME.test(name)) return "nonfood";
  return unit === "piece" && !FOOD_PIECE_NAME.test(name) ? "nonfood" : null;
}

/** Why a Product is left out of the app, or null when it is food or beer. `unit` is its Comparison Unit. */
export function excluded(p: { readonly name: string; readonly categories: readonly string[]; readonly unit?: string | undefined }): Excluded | null {
  const verdicts = p.categories.map(judgeCategory);
  if (verdicts.includes("food")) return null;
  if (!p.categories.length || verdicts.includes("unknown")) return judgeName(p.name, p.unit);
  return verdicts.includes("alcohol") ? "alcohol" : "nonfood";
}
