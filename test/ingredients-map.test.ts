import { test } from "node:test";
import assert from "node:assert/strict";
import { createMapper, type MappableProduct } from "../src/ingredients/map.ts";
import { aisleOf } from "../src/ingredients/aisles.ts";
import { checkVocabulary, VOCABULARY } from "../src/ingredients/vocabulary.ts";

/**
 * Which Ingredient a Product is (#14). Every Product here is a real one, its
 * name, brand and categories recorded from the 2026-10-14 archive, and most
 * are the misfires word matching alone produced on the basket page: appel in
 * aardappel, carrots in a jar or in baby food, cat food with kalkoen in it.
 *
 * Tested at the mapper rather than through a full run: it is a pure function
 * over a large, awkward space of names, which is the case docs/ingest.md
 * already makes for pack-size parsing.
 */

const map = createMapper();
const product = (chainId: string, brand: string | null, categories: string[]) => ({ chainId, brand, categories });
const R: Record<string, Omit<MappableProduct, "name">> = {
  "Poldergoud Geschilde aardappeltjes Kruimig ongekookt": product("dirk", "Poldergoud", ["Aardappelen, groente & fruit > Aardappelen"]),
  "Hollandse Elstar": product("dirk", "Hollandse", ["Aardappelen, groente & fruit > Fruit"]),
  "Jumbo Knijpfruit Appel Perzik Zoete Aardappel 4 x 90 g": product("jumbo", null, ["Conserven, soepen, sauzen, oliën > Fruitconserven > Appelmoes en compote"]),
  "Jumbo Doperwten Wortelen 340 g": product("jumbo", null, ["Conserven, soepen, sauzen, oliën > Groenteconserven > Doperwten en wortels"]),
  "Hollandse Winterpeen": product("dirk", "Hollandse", ["Aardappelen, groente & fruit > Groente"]),
  "Hak Wortelen extra fijn": product("dirk", "Hak", ["Aardappelen, groente & fruit > Groenteconserven"]),
  "Hak Worteltjes 680 g": product("jumbo", null, ["Aardappelen, groente en fruit > Groente > Wortels, knolgroenten en radijs", "Conserven, soepen, sauzen, oliën > Groenteconserven > Wortelen"]),
  "Purina One Kattenvoer sensitive kalkoen & rijst": product("dirk", "Purina One", ["Huishoud & huisdieren > Huisdieren"]),
  "Olvarit 6+ Maanden Tomaat Rund Aardappel Wortel": product("dirk", "Olvarit", ["Kind & drogisterij > Babyvoeding vanaf 6 maanden"]),
  "1 de Beste Tomatenblokjes knoflook en ui": product("dirk", "1 de Beste", ["Aardappelen, groente & fruit > Groenteconserven"]),
  "Slagerhuis Gelderse rookworst": product("dirk", "Slagerhuis", ["Vlees & vis > Vleesconserven"]),
  "Jumbo Biologische Wortelen 1KG": product("jumbo", null, ["Aardappelen, groente en fruit > Groente > Wortels, knolgroenten en radijs"]),
  "1 de Beste Uien": product("dirk", "1 de Beste", ["Aardappelen, groente & fruit > Groente"]),
  "1 de Beste Rode uien": product("dirk", "1 de Beste", ["Aardappelen, groente & fruit > Groente"]),
  "1 de Beste Kaiserbroodje 4 stuks": product("dirk", "1 de Beste", ["Brood, beleg & koek > Afbakbrood"]),
  "Vloerbrood volkoren heel": product("dirk", null, ["Brood, beleg & koek > Brood"]),
  "Princes Tonijnstukken in olijfolie": product("dirk", "Princes", ["Vlees & vis > Visconserven"]),
  "Jumbo Ovengroente Courgette, Paprika & Wortel 600 g": product("jumbo", null, ["Aardappelen, groente en fruit > Groentemix en stamppot > Ovengroente"]),
  "Winterpeen Verpakt": product("vomar", null, ["Vers > Groente > Wortels & Knolgroente"]),
  "4m75 Olvarit Wortel": product("vomar", "Olvarit", ["Baby & Kind > Baby- en Kindervoeding > Maaltijden"]),
  "Schouderham": product("vomar", "Vomar", ["Vers > Vleeswaren & Salades > Vleeswaren"]),
  "Goede Vangst Zalmfilet Met Huid 4st": product("vomar", "Goede Vangst", ["Vers > Verse Vis > Verse Vis"]),
  "Mager Rundergehakt": product("vomar", "Vomar", ["Vers > Vlees > Gehakt & Tartaar"]),
  "G'woon Pindakaas": product("vomar", "G'woon", ["Voorraadkast > Broodbeleg > Hartig Broodbeleg"]),
  "PLUS Achterham": product("plus", "PLUS", ["Kaas, vleeswaren, tapas > Vleeswaren > Ham"]),
  "PLUS Spaghetti": product("plus", "PLUS", ["Pasta, rijst, internationale keuken > Pasta > Spaghetti, linguine, tagliatelle"]),
  "PLUS Houdbare Halfvolle Melk": product("plus", "PLUS", ["Zuivel, eieren, boter > Houdbare zuivel > Houdbare melk"]),
  "Uit de keuken van PLUS Verse Nasi goreng": product("plus", "Uit de keuken van", ["Verse kant-en-klaarmaaltijden > Oosterse maaltijden"]),
  "MILBONA Jong belegen plakken Goudse 48+ kaas": product("lidl", "MILBONA", ["Eten en dichtbij voedsel > Kaas, zuivelproducten & eieren > Kaas"]),
  "COMBINO Spaghetti": product("lidl", "COMBINO", ["Eten en dichtbij voedsel > Voedselvoorraad > Rijst, pasta & peulvruchten"]),
  "Extra mager rundergehakt": product("lidl", null, ["Eten en dichtbij voedsel > Vlees & gevogelte > rundvlees"]),
  "Iglo roerbaksensatie kip-spinazie": product("lidl", null, ["Eten en dichtbij voedsel > Diepvriesvoeding (Diepvriesvoeding) > Diepvriesmaaltijden"]),
  "Hondenvoer kuipje senior kip": product("lidl", null, ["Eten en dichtbij voedsel > Dierbenodigdheden > Hondenvoer"]),
  "Rundergehakt": product("hoogvliet", "Hoogvliet", ["Vlees, vis, vegetarisch > Rund- en varkensvlees > Gehakt"]),
  "kaas jong belegen komijn plakken": product("hoogvliet", "Koggelandse", ["Kaas, vleeswaren, tapas > Plakken kaas > Koggelandse"]),
  "Appel perzik 4+ mnd": product("hoogvliet", "Bonbébé", ["Baby, kind > Babyvoeding > Fruithapjes"]),
  "DekaVers Kipfilet": product("dekamarkt", "DekaVers", ["Vlees & vis > Kip & kalkoen"]),
  "Spaghetti": product("aldi", "CUCINA", ["Pasta, rijst en wereldkeuken > Pasta"]),
  "Pitloze witte druiven": product("aldi", null, ["Aardappels, groente en fruit > Fruit"]),
  "Jong belegen kaas plakken": product("aldi", "MILSANI", ["Kaas en vleeswaren > Kaas"]),
};
const mapped = (name: string) => map({ name, ...R[name]! });
const ingredient = (name: string) => mapped(name)?.ingredient ?? null;

test("the vocabulary has no duplicate or ambiguous entries", () => {
  assert.deepEqual(checkVocabulary(), []);
});

test("aardappel is never appel, in whichever aisle", () => {
  assert.equal(ingredient("Poldergoud Geschilde aardappeltjes Kruimig ongekookt"), "aardappelen");
  assert.equal(ingredient("Hollandse Elstar"), "appels");
  // Among the apple sauces, where aardappelen is not sold, it still names a mix.
  assert.equal(ingredient("Jumbo Knijpfruit Appel Perzik Zoete Aardappel 4 x 90 g"), null);
});

test("wortelen are carrots: fresh or jarred, never peas and carrots", () => {
  assert.equal(ingredient("Jumbo Doperwten Wortelen 340 g"), "doperwten en wortelen");
  assert.deepEqual([mapped("Hollandse Winterpeen")?.ingredient, mapped("Hollandse Winterpeen")?.form], ["wortelen", "vers"]);
  assert.deepEqual([mapped("Hak Wortelen extra fijn")?.ingredient, mapped("Hak Wortelen extra fijn")?.form], ["wortelen", "conserven"]);
});

test("a jar is a jar, even where the Chain also files it with fresh vegetables", () => {
  assert.equal(mapped("Hak Worteltjes 680 g")?.form, "conserven");
});

test("pet food and baby food are never an Ingredient, whatever they contain", () => {
  assert.equal(ingredient("Purina One Kattenvoer sensitive kalkoen & rijst"), null);
  assert.equal(ingredient("Olvarit 6+ Maanden Tomaat Rund Aardappel Wortel"), null);
});

test("a Product naming several Ingredients is a mix, not the first of them", () => {
  assert.equal(ingredient("1 de Beste Tomatenblokjes knoflook en ui"), null);
  assert.equal(ingredient("Jumbo Ovengroente Courgette, Paprika & Wortel 600 g"), "roerbakgroente");
});

test("what follows 'in' does not name the Product", () => {
  assert.equal(ingredient("Princes Tonijnstukken in olijfolie"), "tonijn");
});

test("a short word must be the whole word: ui is not the end of slagerhuis", () => {
  assert.notEqual(ingredient("Slagerhuis Gelderse rookworst"), "uien");
});

test("a Variant named, or the fallback when none is", () => {
  assert.equal(mapped("1 de Beste Rode uien")?.variant, "rode+heel");
  assert.equal(mapped("1 de Beste Uien")?.variant, "gele+heel");
  assert.equal(mapped("Poldergoud Geschilde aardappeltjes Kruimig ongekookt")?.variant, "kruimig");
  assert.equal(mapped("Vloerbrood volkoren heel")?.variant, "volkoren");
});

test("sold cut is a Variant of its own, in an aspect of its own: gesneden rode uien", () => {
  const v = (chainId: string, name: string, categories: string[]) => map({ chainId, name, brand: null, categories })?.variant ?? null;
  assert.equal(v("jumbo", "Jumbo Gesnipperde Uien 150 g", ["Aardappelen, groente en fruit > Groente > Uien, knoflook en sjalotten"]), "gele+gesneden");
  assert.equal(v("dirk", "1 de Beste Broccoliroosjes", ["Aardappelen, groente & fruit > Groente"]), "gesneden");
  assert.equal(v("dekamarkt", "Boerenkool fijn", ["Aardappelen, groente & fruit > Groente"]), "gesneden");
  assert.equal(v("dekamarkt", "Boerenkool", ["Aardappelen, groente & fruit > Groente"]), "heel");
});

test("a pizza is frozen or chilled by where it is kept, whatever its name says", () => {
  const as = (name: string, categories: string[]) => { const x = map({ chainId: "vomar", name, brand: null, categories }); return [x?.ingredient, x?.variant]; };
  assert.deepEqual(as("Dr Oetker Ristorante Tonno", ["Diepvries > Pizza's"]), ["pizza", "diepvries"]);
  assert.deepEqual(as("Deka's keuken Pizza tonijn", ["Maaltijden, salades & tapas > Pizza's"]), ["pizza", "gekoeld"]);
});

test("a meal kit is fresh by the shelf it is filed on, if its name does not say", () => {
  const as = (chainId: string, name: string, categories: string[]) => { const x = map({ chainId, name, brand: null, categories }); return [x?.ingredient, x?.variant]; };
  assert.deepEqual(as("hoogvliet", "Chili con carne", ["Aardappelen, Groente, Fruit > Verspakketten > Maaltijdpakketten"]), ["maaltijdpakket", "vers"]);
  assert.deepEqual(as("dekamarkt", "Verspakket roti massala", ["Maaltijden, salades & tapas > Verse maaltijden"]), ["maaltijdpakket", "vers"]);
  assert.deepEqual(as("dirk", "Honig Maaltijdpakket mexicaanse wraps", ["Maaltijden, salades & tapas > Houdbare maaltijden"]), ["maaltijdpakket", "houdbaar"]);
  assert.equal(as("hoogvliet", "Taco seasoning mix 28g", ["Wereldkeukens, kruiden, pasta en rijst > Maaltijdpakketten en mixen > Maaltijdpakketten"])[0], undefined);
});

test("protein and diet food is an Ingredient of its own, wherever it is filed", () => {
  const as = (chainId: string, name: string, categories: string[]) => { const x = map({ chainId, name, brand: null, categories }); return [x?.ingredient, x?.variant]; };
  assert.deepEqual(as("plus", "Upfront Eiwitlimonade Zwarte bes", ["Frisdrank, sappen, koffie, thee > Sappen, fruitdrank > Gekoeld sap"]), ["dieetvoeding", "drank"]);
  assert.deepEqual(as("dirk", "Barebells Salty peanut", ["Ontbijt, broodbeleg en bakproducten > Sportvoeding > Proteïne repen"]), ["dieetvoeding", "reep"]);
  assert.deepEqual(as("plus", "Upfront Oats chocolade", ["Ontbijt, broodbeleg en bakproducten > Ontbijtgranen > Havermout"])[0], "havermout");
});

test("a brand the name starts with gives no flavour, though it may give the kind", () => {
  const v = (name: string, brand: string, categories: string[]) => map({ chainId: "dirk", name, brand, categories })?.variant ?? null;
  assert.equal(v("Appelsientje Fruitdrink sinaasappel", "Appelsientje", ["Dranken, sap, koffie & thee > Vruchtensappen"]), "sinaasappel");
  assert.equal(v("Red Bull Sugarfree", "Red Bull", ["Dranken, sap, koffie & thee > Frisdranken"]), "energie");
});

test("a roll is not a loaf, though both stem to brood", () => {
  assert.equal(ingredient("1 de Beste Kaiserbroodje 4 stuks"), "bolletjes");
  assert.equal(ingredient("Vloerbrood volkoren heel"), "brood");
});

test("biologisch and huismerk are read off the Product, for the Preferences", () => {
  assert.deepEqual(
    [mapped("Jumbo Biologische Wortelen 1KG")?.biologisch, mapped("Jumbo Biologische Wortelen 1KG")?.huismerk],
    [true, true],
  );
  assert.equal(mapped("1 de Beste Uien")?.huismerk, true);
  assert.equal(mapped("Hollandse Winterpeen")?.huismerk, false);
});

test("reads Vomar's category tree, whose names differ from the other Chains'", () => {
  // Fresh food sits under "Vers > ...", which no rule knew before Vomar.
  assert.deepEqual(
    [ingredient("Winterpeen Verpakt"), ingredient("Goede Vangst Zalmfilet Met Huid 4st"), ingredient("Mager Rundergehakt")],
    ["wortelen", "zalm", "gehakt"],
  );
  assert.equal(mapped("Winterpeen Verpakt")?.form, "vers");
  // Baby meals are baby food, not ready meals and not carrots.
  assert.equal(ingredient("4m75 Olvarit Wortel"), null);
  // "Vers > Vleeswaren & Salades > Vleeswaren": sliced meat, though its
  // group's name says salades.
  assert.equal(ingredient("Schouderham"), "ham");
});

test("knows Vomar's own brands, the Superunie lines included", () => {
  assert.equal(mapped("G'woon Pindakaas")?.huismerk, true);
  assert.equal(mapped("Mager Rundergehakt")?.huismerk, true);
  assert.equal(mapped("Goede Vangst Zalmfilet Met Huid 4st")?.huismerk, false);
});

test("reads Plus's category tree, and its own brands", () => {
  assert.deepEqual(
    [ingredient("PLUS Achterham"), ingredient("PLUS Spaghetti"), ingredient("PLUS Houdbare Halfvolle Melk")],
    ["ham", "pasta", "melk"],
  );
  assert.equal(mapped("PLUS Houdbare Halfvolle Melk")?.variant, "halfvol");
  // "Kaas, vleeswaren, tapas" holds cheese and sliced meats both; no rule
  // knew the name before Plus.
  assert.equal(aisleOf("Kaas, vleeswaren, tapas > Kaas > Voorverpakte kaasplakken"), "cheese");
  assert.equal(aisleOf("Kaas, vleeswaren, tapas > Vleeswaren > Ham"), "deli");
  // Coffee and sugar share a shelf with coffee milk, which is dairy (#37).
  assert.equal(aisleOf("Frisdrank, sappen, koffie, thee > Koffie, koffiemelk, suiker > Filterkoffie"), "drinks");
  assert.equal(aisleOf("Frisdrank, sappen, koffie, thee > Koffie, koffiemelk, suiker > Suiker"), "pantry");
  assert.equal(aisleOf("Frisdrank, sappen, koffie, thee > Koffie, koffiemelk, suiker > Koffiemelk, koffieroom, koffiecreamers"), "dairy");
  assert.equal(aisleOf("Aardappelen, groente, fruit > Groente > Slaschotels, salades, dressings, slaversierders"), "produce");
  assert.equal(mapped("PLUS Spaghetti")?.huismerk, true);
  // A ready meal, not an Ingredient; but its brand is Plus's own line.
  assert.equal(ingredient("Uit de keuken van PLUS Verse Nasi goreng"), null);
});

test("reads Lidl's category tree, and its own brands", () => {
  // "Kaas, zuivelproducten & eieren > Kaas" is cheese, not eggs.
  assert.equal(ingredient("MILBONA Jong belegen plakken Goudse 48+ kaas"), "kaas");
  assert.equal(ingredient("COMBINO Spaghetti"), "pasta");
  assert.equal(ingredient("Extra mager rundergehakt"), "gehakt");
  assert.deepEqual([mapped("MILBONA Jong belegen plakken Goudse 48+ kaas")?.huismerk, mapped("COMBINO Spaghetti")?.huismerk], [true, true]);
  assert.equal(mapped("Extra mager rundergehakt")?.huismerk, false);
  // A frozen stir-fry meal is not spinach; dog food with chicken is not chicken.
  assert.equal(ingredient("Iglo roerbaksensatie kip-spinazie"), null);
  assert.equal(ingredient("Hondenvoer kuipje senior kip"), null);
});

test("reads Hoogvliet's category tree, and its own brands", () => {
  // Its meat department is "Vlees, vis, vegetarisch": meat, not vega.
  assert.equal(aisleOf("Vlees, vis, vegetarisch > Kip, kalkoen > Kipfilet"), "meat");
  assert.equal(aisleOf("Vlees, vis, vegetarisch > Vegetarisch > Gehakt"), "vega");
  assert.equal(aisleOf("Vlees, vis, vegetarisch > Vis > Diepvriesvis, vissticks"), "frozen");
  assert.equal(ingredient("Rundergehakt"), "gehakt");
  assert.equal(mapped("Rundergehakt")?.form, "vers");
  assert.equal(aisleOf("Kaas, vleeswaren, tapas > Plakken kaas > Koggelandse"), "cheese");
  assert.equal(ingredient("kaas jong belegen komijn plakken"), "kaas");
  // "Baby, kind" is non-food at Lidl; Hoogvliet's baby food is baby food.
  assert.equal(aisleOf("Baby, kind > Babyvoeding > Fruithapjes"), "baby");
  assert.equal(ingredient("Appel perzik 4+ mnd"), null);
  assert.deepEqual([mapped("Rundergehakt")?.huismerk, mapped("kaas jong belegen komijn plakken")?.huismerk], [true, false]);
});

test("knows DekaMarkt's own labels, on Dirk's categories", () => {
  assert.equal(ingredient("DekaVers Kipfilet"), "kipfilet");
  assert.equal(mapped("DekaVers Kipfilet")?.huismerk, true);
});

test("knows Aldi's own labels and its shelves", () => {
  assert.equal(ingredient("Spaghetti"), "pasta");
  assert.equal(mapped("Spaghetti")?.huismerk, true);
  assert.deepEqual([ingredient("Pitloze witte druiven"), mapped("Pitloze witte druiven")?.form], ["druiven", "vers"]);
  assert.equal(mapped("Pitloze witte druiven")?.huismerk, false);
  assert.equal(ingredient("Jong belegen kaas plakken"), "kaas");
});

// Gaps the recipes turned up (#33): Products every shopper would count, that
// no Ingredient claimed. Each is a real Product from the 2026-10-14 archive.
const GAP: Record<string, Omit<MappableProduct, "name">> = {
  "Eetrijpe avocado's": product("aldi", null, ["Aardappels, groente en fruit > Fruit"]),
  "Zoete puntpaprika's": product("aldi", null, ["Aardappels, groente en fruit > Groenten"]),
  "Unox Gelderse rookworst": product("dirk", "Unox", ["Vlees & vis > Vleesconserven"]),
  "Jumbo Geraspte Kaas Belegen 48+ 175 g": product("jumbo", null, ["Vleeswaren, kaas en tapas > Kaas voor de maaltijd > Geraspte kaas"]),
  "Galbani Grana Padano Kaas 150 g": product("jumbo", "Galbani", ["Vleeswaren, kaas en tapas > Kaas voor de maaltijd > Parmezaanse kaas"]),
  "G'woon Gezeefde Tomaten": product("vomar", "G'woon", ["Voorraadkast > Pasta, rijst & wereldmarkt > Tomatenproducten"]),
  "Passata gezeefde tomaten": product("hoogvliet", null, ["Pasta, rijst, oliën, wereldkeuken > Italiaanse keuken > Tomatenbasis"]),
  "Risotto": product("aldi", null, ["Pasta, rijst en wereldkeuken > Rijst"]),
  "Fijne roerbak": product("hoogvliet", null, ["Aardappelen, Groente, Fruit > Groente > Groentemixen"]),
  "PLUS Zelfrijzend Bakmeel": product("plus", "PLUS", ["Brood, gebak, bakproducten > Bakproducten > Basismeel"]),
  "Witte bonen in tomatensaus": product("aldi", null, ["Soepen, sauzen, kruiden en conserven > Groenteconserven"]),
  // Kept right while closing them: an apostrophe that is a brand's, peanut
  // butter that names its peanuts, and noodles for the wok.
  "Gouda's Glorie Volle pond": product("dirk", "Gouda's Glorie", ["Zuivel & kaas > Boter & margarine"]),
  "Gouda's Glorie Mayonaise vol & romig": product("dekamarkt", null, ["Voorraadkast > Sauzen"]),
  "Calvé Pindakaas 100% Fijngemalen Pinda's 350 g": product("jumbo", null, ["Ontbijt, broodbeleg en bakkerij > Pindakaas en notenpasta > Pindakaas"]),
  "Pindakaas 100% Grof Gemalen Pinda's": product("hoogvliet", null, ["Ontbijt, broodbeleg > Zoet beleg > Pindakaas"]),
  "Jumbo Roerbak Mie 300 g": product("jumbo", null, ["Wereldkeukens, kruiden, pasta en rijst > Aziatische keuken > Noedels en mie"]),
  // Wrong at the source, and lent to EAN twins until fixed (#34).
  "Cote D'or Hazelnoot": product("vomar", "Cote D'or", ["Voorraadkast > Chocolade & Snoep > Chocolade"]),
  "Orinoko Boterhampasta met Cacao en Melk 350 g": product("jumbo", null, ["Ontbijt, broodbeleg en bakproducten > Zoet broodbeleg > Hazelnoot-, Chocoladepasta"]),
  "Knorr Wg Lasagnette": product("vomar", "Knorr", ["Voorraadkast > Pasta, rijst & wereldmarkt > Maaltijdpakketten"]),
  // EAN twins the coverage report (#35) found mapped two ways.
  "Duo Penotti Hazelnoot & Vanille 400 g": product("jumbo", null, ["Ontbijt, broodbeleg en bakproducten > Zoet broodbeleg > Hazelnoot-, Chocoladepasta"]),
  "Hak Doperwtjes Worteltjes": product("vomar", "Hak", ["Voorraadkast > Soepen, conserven, sauzen & smaakmakers > Groenteconserven"]),
  "Hak Doperwtjes met Worteltjes 350 g": product("jumbo", null, ["Conserven, soepen, sauzen, oliën > Groenteconserven > Doperwten en wortels"]),
};
const gap = (name: string) => map({ name, ...GAP[name]! });

test("names a plural with an apostrophe as the singular Ingredient", () => {
  assert.equal(gap("Eetrijpe avocado's")?.ingredient, "avocado");
  assert.equal(gap("Zoete puntpaprika's")?.ingredient, "puntpaprika");
});

test("counts rookworst from the tins as rookworst, in whatever form", () => {
  assert.deepEqual([gap("Unox Gelderse rookworst")?.ingredient, gap("Unox Gelderse rookworst")?.form], ["rookworst", "conserven"]);
  // Not assumed fresh, so a recipe's "275 g rookworst" accepts it (catalogue `fresh`).
  assert.equal(VOCABULARY.find((d) => d.id === "rookworst")?.anyForm, true);
});

test("reads Jumbo's cooking cheese and Plus's baking shelf as what they are", () => {
  assert.equal(aisleOf("Vleeswaren, kaas en tapas > Kaas voor de maaltijd > Geraspte kaas"), "cheese");
  assert.equal(gap("Jumbo Geraspte Kaas Belegen 48+ 175 g")?.ingredient, "geraspte kaas");
  assert.equal(gap("Galbani Grana Padano Kaas 150 g")?.ingredient, "parmezaanse kaas");
  assert.equal(aisleOf("Brood, gebak, bakproducten > Bakproducten > Basismeel"), "pantry");
  assert.equal(gap("PLUS Zelfrijzend Bakmeel")?.ingredient, "zelfrijzend bakmeel");
});

test("knows passata by its Dutch name, risotto rice by its short one, and a roerbak", () => {
  assert.equal(gap("G'woon Gezeefde Tomaten")?.ingredient, "passata");
  assert.equal(gap("Passata gezeefde tomaten")?.ingredient, "passata");
  assert.deepEqual([gap("Risotto")?.ingredient, gap("Risotto")?.variant], ["rijst", "risotto"]);
  assert.equal(gap("Fijne roerbak")?.ingredient, "roerbakgroente");
  // Still not white beans: they are in tomato sauce.
  assert.equal(gap("Witte bonen in tomatensaus"), null);
});

test("keeps a brand's apostrophe, a peanut butter's peanuts and wok noodles as they were", () => {
  assert.notEqual(gap("Gouda's Glorie Volle pond")?.ingredient, "kaas");
  assert.equal(gap("Gouda's Glorie Mayonaise vol & romig")?.ingredient, "mayonaise");
  assert.equal(gap("Calvé Pindakaas 100% Fijngemalen Pinda's 350 g")?.ingredient, "pindakaas");
  assert.equal(gap("Pindakaas 100% Grof Gemalen Pinda's")?.ingredient, "pindakaas");
  assert.equal(gap("Jumbo Roerbak Mie 300 g")?.ingredient, "mie");
});

test("does not read chocolate as nuts, a sandwich spread as pasta, or a meal kit as sauce", () => {
  assert.notEqual(gap("Cote D'or Hazelnoot")?.ingredient, "noten");
  assert.notEqual(gap("Orinoko Boterhampasta met Cacao en Melk 350 g")?.ingredient, "pasta");
  assert.notEqual(gap("Knorr Wg Lasagnette")?.ingredient, "pastasaus");
  assert.notEqual(gap("Duo Penotti Hazelnoot & Vanille 400 g")?.ingredient, "noten");
});

test("reads peas with carrots as the mix, however the Chain joins them", () => {
  assert.equal(gap("Hak Doperwtjes Worteltjes")?.ingredient, "doperwten en wortelen");
  assert.equal(gap("Hak Doperwtjes met Worteltjes 350 g")?.ingredient, "doperwten en wortelen");
});

test("with no category at all, the name decides, in any food aisle (Aldi's offers)", () => {
  const offer = (name: string, brand: string | null = null) => map({ chainId: "aldi", name, brand, categories: [] });
  assert.equal(offer("Verse Zeeuwse mosselen")?.ingredient, "mosselen");
  assert.equal(offer("Croissants")?.ingredient, "croissants");
  assert.equal(offer("Kipfilet")?.form, "vers");
  assert.equal(offer("Partjes mandarijn op lichte siroop")?.form, "conserven");
  for (const n of ["Melkchocoladeballen", "Pepermunt", "Vogelvoer of voederautomaat", "Tortilla Spaanse stijl", "Kip karaage"]) assert.equal(offer(n), null, n);
  assert.equal(offer("Paddenstoelen", "ALL SEASONS"), null, "frozen or tinned, the name does not say which");
});

test("how a Product is sold, or the flavour of stock, is not a second thing", () => {
  const veg = ["Aardappelen, groente & fruit > Groente"];
  assert.equal(map({ chainId: "dirk", name: "Bio+ Portobello per bak", brand: null, categories: veg })?.ingredient, "paddenstoelen");
  assert.equal(map({ chainId: "dirk", name: "Maggi Bouillon kip", brand: null, categories: ["Maaltijden, salades & tapas > Houdbare soepen"] })?.ingredient, "bouillon");
});

test("a Variant word may end the name: Yoghurt Vol", () => {
  const m = map({ chainId: "vomar", name: "Campina Yoghurt Vol", brand: null, categories: ["Vers > Zuivel, Boter & Eieren > Yoghurt"] });
  assert.deepEqual([m?.ingredient, m?.variant], ["yoghurt", "gewoon+vol+naturel"]);
});

test("Dirk's and DekaMarkt's halal shelf is cold cuts: Wahid's 125 g kipfilet is sliced, not fresh", () => {
  const m = (chainId: string, name: string) => map({ chainId, name, brand: "Wahid", categories: ["Vlees & vis > Halal vlees & kip"] })?.ingredient ?? null;
  assert.equal(aisleOf("Vlees & vis > Halal vlees & kip"), "deli");
  assert.equal(m("dirk", "Wahid Kipfilet naturel"), "kipfilet beleg");
  assert.equal(m("dekamarkt", "Wahid Kalkoenfilet halal"), "kipfilet beleg");
  assert.equal(m("dekamarkt", "Wahid Kalkoensalami"), "salami");
});

test("a brand is not what it sells: Bolletje rusks, Kips paté, Hoogvliet's Met Roomboter", () => {
  const m = (chainId: string, name: string, categories: string[], brand: string | null = null) => map({ chainId, name, brand, categories })?.ingredient ?? null;
  assert.equal(m("dirk", "Bolletje Beschuit volkoren", ["Brood, beleg & koek > Beschuit & crackers"]), "beschuit");
  assert.equal(m("plus", "Kips Roompate", ["Kaas, vleeswaren, tapas > Vleeswaren > Pate, lever, zult"]), "leverworst");
  assert.equal(m("hoogvliet", "Met Roomboter", ["Zuivel, eieren, boter > Boter, margarine > Roomboter"], "Becel"), "margarine");
  assert.equal(m("dekamarkt", "Met passie geteeld Aardappelen kruimig", ["Aardappelen, groente & fruit > Aardappelen"], "Met passie geteeld"), "aardappelen");
});

test("Becel's liquid is for frying and Lekker Romig is coffee milk, whatever shelf", () => {
  const m = (name: string, categories: string[]) => map({ chainId: "jumbo", name, brand: null, categories })?.ingredient ?? null;
  assert.equal(m("Becel Vlees & Jus 450 ml", ["Zuivel, boter en eieren > Boter en Margarine > Bak- en braadboter"]), "bak- en braadboter");
  assert.equal(m("Becel Lekker Romig 467 ml", ["Koffie en thee > Koffiemelk en creamer > Pak koffiemelk"]), "koffiemelk");
});

test("on a shelf an Ingredient is never on, its word is only a flavour: hazelnut chocolate, nut muesli, chocolate biscuits", () => {
  const m = (chainId: string, name: string, categories: string[], brand: string | null = null) => map({ chainId, name, brand, categories })?.ingredient ?? null;
  assert.equal(m("dirk", "Twix Hazelnoot 5-pack", ["Snacks & snoep > Chocolade"], "Twix"), null);
  assert.equal(m("jumbo", "Quaker Cruesli Zero Sugar Added Noten 400 gr", ["Ontbijt, broodbeleg en bakproducten > Ontbijtgranen > Krokante muesli"]), "muesli");
  // A candy bar among the chocolate is no biscuit, nor, with a biscuit in it, chocolade.
  assert.equal(m("plus", "Twix Melk chocolade karamel koekje single", ["Snoep, koek, chocolade, chips, noten > Chocolade > Chocoladerepen, chocoladetabletten"], "Twix"), null);
  assert.equal(m("jumbo", "Jumbo Lekker Vrij van Gluten Digestives Melkchocolade 165 g", ["Koek, snoep, chocolade en chips > Koek > Chocolade koekjes"]), "koekjes");
  assert.equal(m("jumbo", "Lotus Biscoff speculoos pasta original 400 g", ["Ontbijt, broodbeleg en bakproducten > Zoet broodbeleg > Hazelnoot-, Chocoladepasta"]), null);
  assert.equal(m("plus", "Mutti Polpa Knoflook", ["Pasta, rijst, internationale keuken > Pastasaus, tomatenpuree > Tomatenpuree, gepelde/gezeefde tomaten"], "Mutti"), null);
});

test("a beer shelf holds beer, named or not, but not its fruit beers", () => {
  const m = (name: string, categories: string[]) => map({ chainId: "jumbo", name, brand: null, categories })?.ingredient ?? null;
  assert.equal(m("Stella Artois Krat 24x330ML", ["Bier en wijn > Bier, pils > Krat"]), "bier");
  assert.equal(m("Bavaria 0.0% Fruity Lemon & Lime 6x330ml", ["Bier en wijn > Alcoholvrij bier > Cider en fruitbier 0.0"]), null);
});

test("a compound the stemmer cuts short still ends with its Ingredient: roombrie, kruidenthee", () => {
  const m = (chainId: string, name: string, categories: string[]) => map({ chainId, name, brand: null, categories })?.ingredient ?? null;
  assert.equal(m("jumbo", "Jumbo Roombrie ca. 258 g", ["Vleeswaren, kaas en tapas > Kaas voor de borrel > Witte korst kaas, brie"]), "brie");
  assert.equal(m("jumbo", "Localtea De Nacht Wacht Kruidenthee met Rooibos, Valeriaan, Kamille & Lavendel 18 x 1,5 g", ["Koffie en thee > Thee > Kruidenthee"]), "thee");
  // "Pure" is not puree.
  assert.equal(m("plus", "Pickwick Rooibos pure thee", ["Frisdrank, sappen, koffie, thee > Thee > Zwarte thee"]), "thee");
});

test("what the classifier found the vocabulary had wrong (2026-10-15)", () => {
  const m = (chainId: string, name: string, categories: string[]) => map({ chainId, name, brand: null, categories })?.ingredient ?? null;
  assert.equal(m("jumbo", "Kühne Dill Chips Zoetzuur 330 g", ["Conserven, soepen, sauzen, oliën > Augurken en uitjes > Augurken"]), "augurken");
  assert.equal(m("jumbo", "Samyang Buldak Noedels Spicy Ramen Carbonara Flavour 130 g", ["Conserven, soepen, sauzen, oliën > Soep > Instant noedels en snack cups"]), "mie");
  assert.equal(m("jumbo", "Bonne Maman Aardbeien Confiture 370 g", ["Ontbijt, broodbeleg en bakproducten > Zoet broodbeleg > Jam"]), "jam");
  assert.equal(m("jumbo", "Leksands Knäckebröd Zaden en Zeezout 200g", ["Ontbijt, broodbeleg en bakproducten > Beschuit, crackers en rijstwafels > Crackers, knäckebröd"]), "crackers");
  assert.equal(m("hoogvliet", "Weide & veldbloemen", ["Ontbijt, broodbeleg > Broodbeleg > Honing"]), null);
  assert.equal(m("jumbo", "Heinz Tomato Puree 140 g", ["Wereldkeukens, kruiden, pasta en rijst > Mediterrane keuken > Tomatenblokjes en -puree"]), "tomatenpuree");
});
