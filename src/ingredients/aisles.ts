/**
 * Which part of the shop a Chain's category is, whatever the Chain calls it.
 *
 * Dirk, Jumbo, Vomar, Plus, Lidl, Hoogvliet, DekaMarkt and Aldi each have their
 * own category tree, a few hundred leaves between them. An Ingredient says
 * which aisles it is sold in, rather than listing every Chain's categories,
 * and the aisle also gives a Product its form: carrots in Groente are fresh,
 * in Groenteconserven jarred, and in Babyvoeding not carrots at all. That is
 * how "wortelen" stops matching Hak and Olvarit without a word list that can
 * never be complete.
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
  // Plus, first: its coffee shelf is "Koffie, koffiemelk, suiker", which the
  // dairy rule's /koffiemelk/ would claim whole, coffee and sugar with it
  // (#37). And its bagged salads sit with dressings under "Slaschotels,
  // salades", which the ready-meal rule's /salades/ would claim.
  [/^frisdrank, sappen, koffie, thee > koffie, koffiemelk, suiker > koffiemelk/i, "dairy"],
  [/^frisdrank, sappen, koffie, thee > koffie, koffiemelk, suiker > (suiker|zoetstof|cacaopoeder)/i, "pantry"],
  [/^frisdrank, sappen, koffie, thee > koffie, koffiemelk, suiker/i, "drinks"],
  [/^aardappelen, groente, fruit > groente > slaschotels/i, "produce"],
  // Hoogvliet, first: its meat department is called "Vlees, vis,
  // vegetarisch", which the vega rule below would claim whole, and its baby
  // department shares Lidl's name for a non-food one.
  [/^vlees, vis, vegetarisch > vegetarisch/i, "vega"],
  [/^vlees, vis, vegetarisch > vis > diepvries/i, "frozen"],
  [/^vlees, vis, vegetarisch > (kip|rund)/i, "meat"],
  [/^baby, kind > (babyvoeding|drinken)/i, "baby"],
  [/^kaas, vleeswaren, tapas > (buitenlandse kaas|geraspte kaas|kook & saladekazen|plakken kaas|smeerkaas|stukken kaas)/i, "cheese"],
  [/^chips, zoutjes, noten/i, "snacks"],
  [/^bakkerij > (krentenbollen|roggebrood|thuis afbakken|vers brood)/i, "bakery"],
  [/^soepen, conserven, sauzen, kruiden > soepen/i, "readymeal"],
  [/^koffie, thee > (koffie|thee)$|^koffie, thee > (koffie|thee) >/i, "drinks"],
  // Lidl, first: its food sits under one department ("Eten en dichtbij
  // voedsel"), and the general rules below would read "Kaas, zuivelproducten
  // & eieren > Kaas" as eggs.
  [/^eten en dichtbij voedsel > (dierbenodigdheden|baby & kind|drogisterij|huishouding|bloemen)|^(keuken & huishouden|baby, kind|wonen|bouwmarkt)/i, "nonfood"],
  [/^eten en dichtbij voedsel > groenten & fruit/i, "produce"],
  [/^eten en dichtbij voedsel > vlees & gevogelte > worst & vleeswaren/i, "deli"],
  [/^eten en dichtbij voedsel > vlees & gevogelte/i, "meat"],
  [/^eten en dichtbij voedsel > diepvries[^>]*> diepvriesmaaltijden/i, "readymeal"],
  [/^eten en dichtbij voedsel > diepvries/i, "frozen"],
  [/^eten en dichtbij voedsel > kaas, zuivelproducten & eieren > kaas/i, "cheese"],
  [/^eten en dichtbij voedsel > kaas, zuivelproducten/i, "dairy"],
  [/^eten en dichtbij voedsel > bakkerij > toast/i, "pantry"],
  [/^eten en dichtbij voedsel > bakkerij/i, "bakery"],
  [/^eten en dichtbij voedsel > snoep & snacks/i, "snacks"],
  [/^eten en dichtbij voedsel > dranken|^wijn, bier/i, "drinks"],
  [/^eten en dichtbij voedsel > voedselvoorraad > (groente- en fruitconserven|conserven|ingemaakte)/i, "conserves"],
  [/^eten en dichtbij voedsel > kant-en-klaar/i, "readymeal"],
  [/^eten en dichtbij voedsel > (voedselvoorraad|muesli|koffie|oliën)/i, "pantry"],
  // Aldi, first: the general rules below would read its baking shelf as
  // bread and its cheese at the drinks table as a ready meal.
  [/^aardappels, groente en fruit/i, "produce"],
  [/^kaas en vleeswaren > kaas|^borrelhapjes > kaas/i, "cheese"],
  [/^borrelhapjes > vleeswaren/i, "deli"],
  [/^chips, noten en zoutjes > noten/i, "pantry"],
  [/^chips, noten en zoutjes/i, "snacks"],
  [/^brood, bakkerij en bakken > (beschuit|zelf bakken)/i, "pantry"],
  [/^(bier, mixdranken|wijn|winnaarsproducten > wijn|sappen, frisdrank)|^thee en koffie > (koffie|thee)$/i, "drinks"],
  [/^soepen, sauzen, kruiden en conserven > (kruiden|olie|sauzen)/i, "pantry"],
  [/huisdier|dierenvoeding/i, "pet"],
  [/babyvoeding|peutervoeding|flesvoeding|kindervoeding|^baby (en|&) kind/i, "baby"],
  [/drogisterij|^huishoud|^non.?food|& non food|^bloemen/i, "nonfood"],
  // Not /conserven/: Jumbo's sauces and oils sit in "Conserven, soepen,
  // sauzen, oliën", and gravy is not a tin of vegetables.
  [/(groente|fruit|vruchten|vis|vlees)conserven|augurken en uitjes/i, "conserves"],
  [/^diepvries/i, "frozen"],
  // Vomar files sliced meats beside salads ("Vers > Vleeswaren & Salades"),
  // so they are claimed before the ready-meal rule's /salades/ can.
  [/^vers > vleeswaren & salades > vegetarische/i, "vega"],
  [/^vers > vleeswaren & salades > (vleeswaren|filet americain|paté)$/i, "deli"],
  [/^vers > grill/i, "readymeal"],
  // Plus files soup among sauces and conserves; a soup is a ready meal.
  [/^soepen, conserven, sauzen, smaakmakers > soep\b/i, "readymeal"],
  // Jumbo files cooking cheese as "Kaas voor de maaltijd", which the
  // ready-meal rule below would claim: grated cheese is cheese.
  [/^vleeswaren, kaas en tapas > kaas voor de (maaltijd|borrel)/i, "cheese"],
  // Plus files flour and baking powder beside bread; they are pantry.
  [/^brood, gebak, bakproducten > bakproducten/i, "pantry"],
  // Soup, but not soup meat ("Soepballetjes en soepvlees"); gourmetten is raw
  // meat for the table grill.
  // Dirk and DekaMarkt keep olives and tapas beside the ready meals; they are not one.
  [/^maaltijden, salades & tapas > tapas$/i, "deli"],
  // Aldi's dips and spreads (hummus, roomkaas) are not snacks to serve.
  [/^borrelhapjes > spreads/i, "deli"],
  // Plus files roggebrood with the crackers; it is a loaf.
  [/> roggebrood$/i, "bakery"],
  // Plus files fruit salad as "Gesneden fruit, fruitsalades": fruit, not a dish.
  [/fruitsalade/i, "produce"],
  [/maaltijd|verspakket|> (verse )?soep(en)?$|houdbare soepen|quiche|pannenkoek|sushi|sandwich|pizza|ovenschotel|salades|slaatjes|borrelhapjes/i, "readymeal"],
  [/verse sappen/i, "drinks"],
  [/gedroogd fruit|pitten en zuidvruchten/i, "pantry"],
  [/^aardappelen, groente|^vers > (aardappelen|groente|fruit|verse kruiden)/i, "produce"],
  [/vegetarisch|vleesvervanger|plantaardig/i, "vega"],
  // Not /kaas/: Dirk's dairy department is called "Zuivel & kaas".
  [/kaas gesneden|kaas stuk|overige kazen|kaas voor|^vers > kaas|^kaas, vleeswaren, tapas > kaas/i, "cheese"],
  [/^vleeswaren|vleeswaren$|filet americain|^vers > verse tapas|^kaas, vleeswaren, tapas > (vleeswaren|tapas)/i, "deli"],
  [/^vers > vlees > sauzen/i, "pantry"],
  [/^vlees|^vers > (vlees|kip & kalkoen)/i, "meat"],
  [/^zuivel|eieren|houdbare zuivel|koffiemelk/i, "dairy"],
  [/broodbeleg/i, "pantry"],
  [/^brood|gebak|afbakbrood|^vers > (brood|banket|verse crackers)/i, "bakery"],
  [/^dranken|^frisdrank|^bier en wijn|^bier, wijn|^koffie en thee/i, "drinks"],
  [/^snacks|^koek, snoep|^voorraadkast > (chips|chocolade|tussendoortjes)|^snoep, koek/i, "snacks"],
  [/^vers > (ontbijt|verse noten)|^voorraadkast|^soepen, conserven, sauzen|^pasta, rijst|^bewuste voeding|^wereldkeukens|^ontbijt|^conserven, soepen|bakproducten/i, "pantry"],
];

/** The aisle of one category path, or null when no rule claims it. */
export function aisleOf(path: string): Aisle | null {
  // Fish has its own aisle, even where a Chain files it under meat.
  if (/(^|> )(verse )?vis($| >)|zalm|schaal- en schelp/i.test(path) && !/conserven|diepvries|tapas/i.test(path)) return "fish";
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
