import { test } from "node:test";
import assert from "node:assert/strict";
import { excluded } from "../src/catalogue/food.ts";

/**
 * What the app shows: food and drink, and of alcohol only beer. Judged on
 * the Chains' own category paths, as swept on 2026-10-14.
 */

const judge = (categories: string[], name = "", unit?: string) => excluded({ name, categories, unit });

test("food stays, including pet food and baby food", () => {
  for (const path of [
    "Aardappelen, groente en fruit > Groente > Courgette en aubergine",
    "Huishoud & huisdieren > Huisdieren",
    "Huisdier > Kat > Droog kattenvoer",
    "Eten en dichtbij voedsel > Dierbenodigdheden > Hondenvoer",
    "Kind & drogisterij > Babyvoeding vanaf 6 maanden",
    "Baby, drogisterij > Babyvoeding > Baby fruithapjes",
    "Eten en dichtbij voedsel > Voedselvoorraad > Bakbenodigdheden",
    "Brood en gebak > Gebak > Taartversiering",
    "Ontbijtgranen, broodbeleg, tussendoor > Ontbijtgranen > Havermout, ontbijtpap",
    "Conserven, soepen, sauzen, oliën > Fruitconserven > Fruitcocktail",
    "Conserven, soepen, sauzen, oliën > Snacksauzen > Cocktailsaus",
    "Soepen, conserven, sauzen, smaakmakers > Azijn > Balsamicoazijn, wijnazijn, appelazijn",
  ]) assert.equal(judge([path]), null, path);
});

test("non-food goes, also where it sits beside food", () => {
  for (const path of [
    "Baby en kind > Luiers en verschonen > Luiers",
    "Huishoud & huisdieren > Wasmiddel & verzachters",
    "Huisdier > Kat > Kattenbakvulling",
    "Huisdier > Hond > Hond - verzorging",
    "Eten en dichtbij voedsel > Huishouding > Toiletpapier",
    "Eten en dichtbij voedsel > Bloemen & planten > Bloemen & planten",
    "Drogisterij en gezondheid > Zelfzorg > Voedingssupplementen",
    "Paasassortiment > Bakken en keukengerei",
  ]) assert.equal(judge([path]), "nonfood", path);
});

test("beer stays, alcohol-free and radler too; wine and spirits go, alcohol-free wine too", () => {
  for (const path of [
    "Bier en wijn > Speciaalbier > Tripel",
    "Bier en wijn > Alcoholvrij bier > Pils 0.0",
    "Bier en wijn > Radler, Mexicaans en cider > Radler",
    "Wijn, bier, sterke drank > Bier > Pilsener bier",
  ]) assert.equal(judge([path]), null, path);
  for (const path of [
    "Bier en wijn > Rode wijn > Soepel",
    "Bier en wijn > Witte wijn > Alcoholvrij",
    "Wijn, bier, sterke drank > Sterke dranken > Whisky",
    "Bier en wijn > Mixdrankjes en seltzers > Hard seltzers",
    "Bier en wijn > Radler, Mexicaans en cider > Cider",
    "Kerstassortiment > Kerst wijn, bier > Kerst witte wijn",
    "Wijn > Rosé",
  ]) assert.equal(judge([path]), "alcohol", path);
});

test("one food category is enough to keep a Product", () => {
  assert.equal(judge(["Feestassortiment > Feestelijke wijnen", "Bier en wijn > Speciaalbier > Blond"]), null);
  assert.equal(judge(["Huishoud & huisdieren > Kaarsen", "Bier en wijn > Rode wijn > Soepel"]), "alcohol");
});

test("with no category, the name and how it is sold decide", () => {
  assert.equal(judge([], "Gerookte zalm", "kg"), null);
  assert.equal(judge([], "Premium pilsener", "l"), null);
  assert.equal(judge([], "Scharreleieren", "piece"), null);
  assert.equal(judge([], "Winterjas", "piece"), "nonfood");
  assert.equal(judge([], "Max power afwasmiddel", "l"), "nonfood");
  assert.equal(judge([], "Brunetti di Amerosa Chianti", "l"), "alcohol");
  assert.equal(judge([], "Rosé 4-pack", "l"), "alcohol");
  assert.equal(judge([], "Koffielikeur", "l"), "alcohol");
});

test("on a shelf that says nothing, the name decides: litter goes, Whiskas stays", () => {
  const kat = ["Huishouden en dieren > Huisdieren > Kat"];
  assert.equal(judge(kat, "Jumbo Kattenbakvulling Comfort 10 L", "l"), "nonfood");
  assert.equal(judge(kat, "Whiskas Kattenvoer Junior - Classic selectie in saus - 4 x 12 maaltijdzakjes", "piece"), null);
  assert.equal(judge(kat, "Karlie Hondenspeelgoed Donut", "piece"), "nonfood");
  assert.equal(judge(["Themashops > In Out & GSK > In out"], "Doos chardonnay", "l"), "alcohol");
});
