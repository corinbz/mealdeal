import { test } from "node:test";
import assert from "node:assert/strict";
import { createMapper, type MappableProduct } from "../src/ingredients/map.ts";
import { aisleOf } from "../src/ingredients/aisles.ts";
import { checkVocabulary } from "../src/ingredients/vocabulary.ts";

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
  "Uit de keuken van PLUS Verse Loempia": product("plus", "Uit de keuken van", ["Verse kant-en-klaarmaaltijden > Oosterse maaltijden"]),
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
  assert.equal(mapped("1 de Beste Rode uien")?.variant, "rode");
  assert.equal(mapped("1 de Beste Uien")?.variant, "gele");
  assert.equal(mapped("Poldergoud Geschilde aardappeltjes Kruimig ongekookt")?.variant, "kruimig");
  assert.equal(mapped("Vloerbrood volkoren heel")?.variant, "volkoren");
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
  assert.equal(mapped("PLUS Spaghetti")?.huismerk, true);
  // A ready meal, not an Ingredient; but its brand is Plus's own line.
  assert.equal(ingredient("Uit de keuken van PLUS Verse Loempia"), null);
});
