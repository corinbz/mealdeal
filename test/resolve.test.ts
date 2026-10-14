import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

/**
 * Resolution through Ingredients (#14), as the basket page and the digest
 * both run it (prototype/resolve.js). Each Chain's Products are candidates for
 * a Requirement when they are its Ingredient, within its Variant and
 * Preferences, and fresh unless a Preference allows otherwise; cheapest per
 * unit first.
 */

const context: Record<string, any> = {};
for (const f of ["words.js", "resolve.js"]) runInNewContext(readFileSync(`prototype/${f}`, "utf8"), context);

const COLUMNS = ["ref", "name", "comparisonUnit", "shelfPriceCents", "unitPriceCents", "packQuantity", "packUnit",
  "ingredient", "variant", "form", "flags", "ingredientUnitPriceCents", "ingredientPack"];
type Row = [string, string, string, number, number, number, string, string | null, string | null, string | null, number, number | null, number | null];
const BIO = 1, HUISMERK = 2;

const PRICES = {
  dates: ["2026-10-12", "2026-10-13", "2026-10-14"],
  series: { dirk: { "3": [90, 95, 95], "4": [[89], null, 99], "5": [130, 139, 139], "1": [500, null, 498] } },
};
const resolver = context.MealdealResolve.createResolver({
  chains: [{ id: "dirk", name: "Dirk" }, { id: "jumbo", name: "Jumbo" }],
  columns: COLUMNS,
  vocabulary: [
    { id: "spinazie", name: "spinazie", unit: "kg", also: [], equals: {}, fresh: true, variants: [] },
    { id: "melk", name: "melk", unit: "l", also: [], equals: {}, fresh: true,
      variants: [{ id: "halfvol", name: "halfvolle melk" }, { id: "vol", name: "volle melk" }] },
    { id: "gehakt", name: "gehakt", unit: "kg", also: [], equals: {}, fresh: true, variants: [{ id: "rund", name: "rundergehakt" }] },
    { id: "courgette", name: "courgette", unit: "piece", also: [], equals: { kg: 0.3 }, fresh: true, variants: [] },
    { id: "pindakaas", name: "pindakaas", unit: "kg", also: [], equals: {}, fresh: false, variants: [] },
  ],
  catalogue: {
    dirk: [
      ["1", "Spinazie", "kg", 199, 498, 0.4, "kg", "spinazie", null, "vers", 0, 498, 0.4],
      ["2", "Bladspinazie diepvries", "kg", 99, 220, 0.45, "kg", "spinazie", null, "diepvries", 0, 220, 0.45],
      ["3", "Volle melk", "l", 95, 95, 1, "l", "melk", "vol", "vers", 0, 95, 1],
      ["4", "Halfvolle melk", "l", 99, 99, 1, "l", "melk", "halfvol", "vers", 0, 99, 1],
      ["5", "Bio halfvolle melk", "l", 139, 139, 1, "l", "melk", "halfvol", "vers", BIO, 139, 1],
      ["6", "Courgette", "piece", 75, 75, 1, "piece", "courgette", null, "vers", 0, 75, 1],
      ["7", "1 de Beste Pindakaas", "kg", 67, 191, 0.35, "kg", "pindakaas", null, null, HUISMERK, 191, 0.35],
      ["8", "Calvé Pindakaas", "kg", 349, 997, 0.35, "kg", "pindakaas", null, null, 0, 997, 0.35],
      ["9", "Kattenvoer zalm", "kg", 150, 120, 1.25, "kg", null, null, null, 0, null, null],
    ] satisfies Row[],
    jumbo: [
      ["a", "Jumbo Rundergehakt", "kg", 479, 958, 0.5, "kg", "gehakt", "rund", "vers", HUISMERK, 958, 0.5],
    ] satisfies Row[],
  },
}, PRICES);
const first = (chain: string, text: string) => resolver.candidates(chain, resolver.parse(text))[0]?.name ?? null;

test("a Correction is kept per Chain and Ingredient, so it applies to every item needing it", () => {
  const key = (chain: string, text: string) => resolver.correctionKey(chain, resolver.parse(text));
  assert.equal(key("dirk", "500 g rundergehakt"), key("dirk", "1 kg rundergehakt"));
  assert.equal(key("dirk", "500 g rundergehakt"), key("dirk", "bio rundergehakt"));
  assert.notEqual(key("dirk", "500 g rundergehakt"), key("jumbo", "500 g rundergehakt"));
  assert.notEqual(key("dirk", "500 g rundergehakt"), key("dirk", "500 g gehakt"));
});

test("fresh is assumed, and a Preference allows frozen", () => {
  assert.equal(first("dirk", "400 g spinazie"), "Spinazie");
  assert.equal(first("dirk", "400 g diepvries spinazie"), "Bladspinazie diepvries");
});

test("a Variant named narrows; none named takes the cheapest of any", () => {
  assert.equal(first("dirk", "1 l halfvolle melk"), "Halfvolle melk");
  assert.equal(first("dirk", "1 l melk"), "Volle melk");
});

test("biologisch, huismerk and A-merk are Preferences that narrow the candidates", () => {
  assert.equal(first("dirk", "1 l bio halfvolle melk"), "Bio halfvolle melk");
  assert.equal(first("dirk", "huismerk pindakaas"), "1 de Beste Pindakaas");
  assert.equal(first("dirk", "a-merk pindakaas"), "Calvé Pindakaas");
  assert.deepEqual({ ...resolver.parse("1 l bio halfvolle melk").preferences }, { biologisch: true });
});

test("a quantity in another unit converts where the vocabulary says how", () => {
  const item = resolver.parse("600 g courgette");
  assert.deepEqual([item.ingredient, item.quantity, item.unit, item.guessed], ["courgette", 2, "piece", false]);
  assert.equal(resolver.packsFor(resolver.candidates("dirk", item)[0], item).packs, 2);
});

test("an item the vocabulary does not know resolves by Product name, and says so", () => {
  const item = resolver.parse("1 kg kattenvoer");
  assert.equal(item.ingredient, null);
  assert.equal(first("dirk", "1 kg kattenvoer"), "Kattenvoer zalm");
});

test("a Chain without the Ingredient has no candidate, which Coverage then shows", () => {
  assert.equal(first("jumbo", "400 g spinazie"), null);
});

test("the Daily Price is the lowest per day among the Products that satisfy the item", () => {
  const plain = (text: string) => resolver.dailyPrices("dirk", resolver.parse(text)).days.map((d: any) => d && [d.cents, d.offer]);
  // Any melk: volle on most days, but halfvolle while it was on Offer.
  assert.deepEqual(plain("1 l melk"), [[89, true], [95, false], [95, false]]);
  // Halfvolle only: the Bio carton fills the day the cheaper one was not observed.
  assert.deepEqual(plain("1 l halfvolle melk"), [[89, true], [139, false], [99, false]]);
  // A day nothing satisfying was observed is a gap.
  assert.deepEqual(plain("400 g spinazie"), [[500, false], null, [498, false]]);
});
