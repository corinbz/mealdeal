/**
 * Which part of the shop a Chain's category is, whatever the Chain calls it.
 *
 * Dirk and Jumbo each have their own category tree, a few hundred leaves
 * between them. An Ingredient says which aisles it is sold in, rather than
 * listing every Chain's categories, and the aisle also gives a Product its
 * form: carrots in Groente are fresh, in Groenteconserven jarred, and in
 * Babyvoeding not carrots at all. That is how "wortelen" stops matching Hak
 * and Olvarit without a word list that can never be complete.
 */

export type Aisle =
  | "produce" | "meat" | "fish" | "vega" | "dairy" | "cheese" | "deli" | "bakery"
  | "pantry" | "conserves" | "frozen" | "readymeal" | "drinks" | "snacks"
  | "baby" | "pet" | "nonfood";

/** How a Product is kept, which a Preference may restrict. */
export type Form = "vers" | "diepvries" | "conserven";

/**
 * First match wins, so the order matters: pet and baby food sit inside
 * departments that would otherwise read as food ("Diepvries > Dierenvoeding",
 * "Kind & drogisterij > Babyvoeding"), and conserves inside produce
 * ("Aardappelen, groente & fruit > Groenteconserven").
 */
const RULES: [RegExp, Aisle][] = [
  [/huisdier|dierenvoeding/i, "pet"],
  [/babyvoeding|peutervoeding|flesvoeding|^baby en kind/i, "baby"],
  [/drogisterij|^huishoud|^non.?food|^bloemen/i, "nonfood"],
  // Not /conserven/: Jumbo's sauces and oils sit in "Conserven, soepen,
  // sauzen, oliën", and gravy is not a tin of vegetables.
  [/(groente|fruit|vis|vlees)conserven|augurken en uitjes/i, "conserves"],
  [/^diepvries/i, "frozen"],
  // Soup, but not soup meat ("Soepballetjes en soepvlees"); gourmetten is raw
  // meat for the table grill.
  [/maaltijd|verspakket|> (verse )?soep(en)?$|houdbare soepen|quiche|pannenkoek|sushi|sandwich|pizza|ovenschotel|salades|slaatjes|borrelhapjes/i, "readymeal"],
  [/verse sappen/i, "drinks"],
  [/gedroogd fruit|pitten en zuidvruchten/i, "pantry"],
  [/^aardappelen, groente/i, "produce"],
  [/vegetarisch|vleesvervanger|plantaardig/i, "vega"],
  // Not /kaas/: Dirk's dairy department is called "Zuivel & kaas".
  [/kaas gesneden|kaas stuk|overige kazen|kaas voor/i, "cheese"],
  [/^vleeswaren|vleeswaren$|filet americain/i, "deli"],
  [/^vlees/i, "meat"],
  [/^zuivel|eieren|houdbare zuivel|koffiemelk/i, "dairy"],
  [/broodbeleg/i, "pantry"],
  [/^brood|gebak|afbakbrood/i, "bakery"],
  [/^dranken|^frisdrank|^bier en wijn|^koffie en thee/i, "drinks"],
  [/^snacks|^koek, snoep/i, "snacks"],
  [/^voorraadkast|^wereldkeukens|^ontbijt|^conserven, soepen|bakproducten/i, "pantry"],
];

/** The aisle of one category path, or null when no rule claims it. */
export function aisleOf(path: string): Aisle | null {
  // Fish has its own aisle, even where a Chain files it under meat.
  if (/(^|> )vis($| >)|zalm|schaal- en schelp/i.test(path) && !/conserven|diepvries|tapas/i.test(path)) return "fish";
  for (const [rule, aisle] of RULES) if (rule.test(path)) return aisle;
  return null;
}

const FRESH: ReadonlySet<Aisle> = new Set(["produce", "meat", "fish", "dairy", "cheese", "deli", "bakery"]);

/** The form an aisle implies, or null where form means nothing (pasta, coffee). */
export function formOf(aisle: Aisle): Form | null {
  if (aisle === "frozen") return "diepvries";
  if (aisle === "conserves") return "conserven";
  return FRESH.has(aisle) ? "vers" : null;
}
