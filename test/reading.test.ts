import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { createMapper } from "../src/ingredients/map.ts";
import { buildCatalogue } from "../src/catalogue/build.ts";

/**
 * What scripts/check-reading.ts found reading a long shopping list, kept
 * fixed: each item reads as the Ingredient it did when last looked at
 * (test/fixtures/shopping-readings.txt), so a change to the vocabulary that
 * reads one differently shows here, to be looked at, never silently.
 *
 *   UPDATE_READINGS=1 node --test test/reading.test.ts   rewrites the file after a change meant to.
 */

const context: Record<string, any> = {};
for (const f of ["words.js", "resolve.js"]) runInNewContext(readFileSync(`prototype/${f}`, "utf8"), context);
const { catalogue } = buildCatalogue({ chains: [], products: {} });
const R = context.MealdealResolve.createResolver({ ...catalogue, chains: [] });
const read = (text: string) => { const r = R.parse(text); return r?.ingredient ? r.ingredient + (r.variant ? "/" + r.variant : "") : "-"; };

test("a word its Products are named by reads as that Ingredient, unless it says too little", () => {
  assert.deepEqual(["winterpeen", "halvarine", "smeerkaas", "achterham", "nutella", "elstar"].map(read),
    ["wortelen", "margarine", "roomkaas", "ham", "chocoladepasta", "appels"]);
  assert.deepEqual(["kip", "olie", "vlokken"].map(read), ["-", "-", "-"]);
});

test("a name is not read from its last words past a word that makes it something else", () => {
  assert.equal(read("rijstwafels met chocolade"), "-");
  assert.equal(read("mix voor spaghetti"), "-");
  assert.equal(read("vega gehakt"), "vegetarisch gehakt");
  assert.equal(read("vegetarische schnitzel"), "-");
  assert.equal(read("verse spinazie"), "spinazie");
});

test("0.0 is a drink without alcohol, not none of one", () => {
  assert.equal(read("0.0 bier"), "bier/alcoholvrij");
  assert.equal(R.parse("0,0 bier").quantity, 1);
});

test("a name with no word to search on finds nothing, not everything", () => {
  const data = { ...catalogue, chains: [{ id: "dirk" }], catalogue: { dirk: [["1", "Dirk Halfvolle melk", "1 l", 1, "l", "l", 99, null, 99, null, null, null, null, null, null, null, 0, null, null]] } };
  const one = context.MealdealResolve.createResolver(data);
  assert.equal(one.candidates("dirk", one.parse("m&m's")).length, 0);
  assert.equal(one.candidates("dirk", one.parse("halfvolle met melk")).length, 1);
});

const map = createMapper();
const as = (chainId: string, name: string, categories: string[]) => map({ chainId, name, brand: null, categories })?.ingredient ?? null;

test("a food a Product's name rules out by its own words is no second thing in it", () => {
  assert.equal(as("dirk", "1 de Beste Pastasaus ricotta", ["Voorraadkast > Pasta & pasta sauzen"]), "pastasaus");
  assert.equal(as("plus", "Red Phoenix Sriracha mayonaise", ["Soepen, conserven, sauzen, smaakmakers > Snacksaus, mayonaise > Mayonaise"]), "mayonaise");
  assert.equal(as("plus", "Grand'Italia Tortellini spinaci e ricotta", ["Pasta, rijst, internationale keuken > Pasta > Tortellini, gevulde pasta"]), "pasta");
});

test("kroketten and bitterballen are named for their filling and are still that", () => {
  assert.equal(as("plus", "Kwekkeboom Stoofvlees croquetten", ["Diepvries > Diepvries snacks"]), "kroketten");
  assert.equal(as("dekamarkt", "G'woon Bitterballen rundvlees 30 stuks", ["Diepvries > Diepvries snacks"]), "bitterballen");
});

test("a Chain's own shelf names, compounds and mixes map to the one thing they are", () => {
  assert.equal(as("aldi", "Zoute popcorn", ["Chips, noten en zoutjes > Chips"]), "popcorn");
  assert.equal(as("plus", "Vici Surimisticks 250GR", ["Vlees, kip, vis, vega > Schaaldieren, schelpdieren > Krab, surimi"]), "surimi");
  assert.equal(as("aldi", "Vegan falafelballetjes", ["Vlees, vis en vega > Vegetarisch en vegan"]), "falafel");
  assert.equal(as("hoogvliet", "Appel kaneel moes", ["Soepen, conserven, sauzen, kruiden > Conserven > Appelmoes, appelcompote"]), "appelmoes");
  assert.equal(as("hoogvliet", "Schudfles pannenkoek compleet", ["Pasta, rijst, oliën, wereldkeuken > Hollandse keuken > Pannenkoeken, poffertjes"]), "pannenkoekmix");
  assert.equal(as("dirk", "Duca Mini loempia's 20 stuks", ["Diepvries > Snacks"]), "mini loempia's");
});

test("the shopping list reads as it did when last looked at", () => {
  const items: string[] = [];
  for (const line of readFileSync("scripts/shopping-list.txt", "utf8").split("\n")) {
    const t = line.trim();
    if (t && !t.startsWith("#") && !items.includes(t)) items.push(t);
  }
  const now = items.map((t) => `${t}\t${read(t)}`).join("\n") + "\n";
  const file = "test/fixtures/shopping-readings.txt";
  if (process.env.UPDATE_READINGS) writeFileSync(file, now);
  const was = new Map(readFileSync(file, "utf8").trim().split("\n").map((l) => l.split("\t") as [string, string]));
  const changed = items.map((t) => [t, was.get(t) ?? "(new)", read(t)]).filter(([, a, b]) => a !== b).map(([t, a, b]) => `${t}: ${a} -> ${b}`);
  assert.deepEqual(changed, []);
});
