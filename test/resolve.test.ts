import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { buildCatalogue } from "../src/catalogue/build.ts";

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

test("a typo of a known Ingredient gets a suggestion; an unknown word gets none", () => {
  assert.equal(resolver.parse("500 g spinzaie").suggestion, "spinazie");
  assert.equal(resolver.parse("1 l halfvole melk").suggestion, "halfvolle melk");
  assert.equal(resolver.parse("pindaksa").suggestion, "pindakaas");
  assert.equal(resolver.parse("1 kg kattenvoer").suggestion, null);
  assert.equal(resolver.parse("400 g spinazie").suggestion, undefined, "a recognised item needs none");
});

/** Exact Products (#15), as scripts/catalogue-from-db.ts writes them. */
const exactResolver = context.MealdealResolve.createResolver({
  chains: [{ id: "dirk", name: "Dirk" }, { id: "jumbo", name: "Jumbo" }, { id: "vomar", name: "Vomar" }],
  columns: COLUMNS,
  vocabulary: [{ id: "pindakaas", name: "pindakaas", unit: "kg", also: [], equals: {}, fresh: false, variants: [] }],
  catalogue: {
    dirk: [["d1", "Calvé Pindakaas", "kg", 299, 854, 0.35, "kg", "pindakaas", null, null, 0, 854, 0.35]],
    jumbo: [
      ["j1", "Calvé Pindakaas Regular 350 g", "kg", 349, 997, 0.35, "kg", "pindakaas", null, null, 0, 997, 0.35],
      ["j2", "Calvé Pindakaas Regular 650 g", "kg", 549, 845, 0.65, "kg", "pindakaas", null, null, 0, 845, 0.65],
    ],
    vomar: [
      ["v1", "Calve Pindakaas", "kg", 299, 854, 0.35, "kg", "pindakaas", null, null, 0, 854, 0.35],
      ["v2", "Calve Pindakaas", "kg", 435, 669, 0.65, "kg", "pindakaas", null, null, 0, 669, 0.65],
    ],
  },
  exact: [
    { id: "8711200428953", name: "Calvé Pindakaas Regular 350 g", members: { jumbo: "j1", vomar: "v1" }, likely: { dirk: "d1" } },
    { id: "8711200431632", name: "Calvé Pindakaas Regular 650 g", members: { jumbo: "j2", vomar: "v2" }, likely: {} },
  ],
});

test("a typed brand and product offers its Exact Products, narrowed by the pack typed", () => {
  const names = (text: string) => [...exactResolver.exactMatches(text).map((m: { name: string }) => m.name)];
  assert.deepEqual(names("calve pindakaas"), ["Calvé Pindakaas Regular 350 g", "Calvé Pindakaas Regular 650 g"]);
  // Typed after the name, as people do, or before it.
  assert.deepEqual(names("Calvé pindakaas 650 g"), ["Calvé Pindakaas Regular 650 g"]);
  assert.deepEqual(names("350 g calve pindakaas"), ["Calvé Pindakaas Regular 350 g"]);
  // One word names a kind of food, not a branded item.
  assert.deepEqual(names("pindakaas"), []);
});

test("an Exact Product resolves to each Chain's own one, and only likely where no EAN proves it", () => {
  const id = "8711200428953";
  assert.equal(exactResolver.exactProduct("jumbo", id)?.name, "Calvé Pindakaas Regular 350 g");
  assert.equal(exactResolver.exactProduct("vomar", id)?.name, "Calve Pindakaas");
  assert.equal(exactResolver.exactProduct("dirk", id), null);
  assert.equal(exactResolver.likelyProduct("dirk", id)?.name, "Calvé Pindakaas");
  assert.equal(exactResolver.exactIdOf(exactResolver.products.vomar["vomar-v2"]), "8711200431632");
});

test("a staple alerts when today is clearly below its Usual Price, and only with enough history", () => {
  const { priceDrop, USUAL_MIN_DAYS } = context.MealdealResolve;
  const days = (cents: (number | null)[], offerToday = false) =>
    cents.map((c, i) => c === null ? null : { cents: c, offer: offerToday && i === cents.length - 1, product: "Melk" });
  const steady = Array.from({ length: USUAL_MIN_DAYS }, (_, i) => (i % 2 ? 100 : 104));

  // Usual is the median of the days before today (102); 85 is 17% below it.
  assert.deepEqual({ ...priceDrop(days([...steady, 85], true)) }, { cents: 85, usualCents: 102, percent: 17, offer: true, product: "Melk" });
  // 14% below is not clearly below.
  assert.equal(priceDrop(days([...steady, 88])), null);
  // One day short of enough history: no alert, however low.
  assert.equal(priceDrop(days([...steady.slice(1), 50])), null);
  // Gaps do not count as history.
  assert.equal(priceDrop(days([...steady.slice(1), null, 50])), null);
  // Not observed today: nothing to alert on.
  assert.equal(priceDrop(days([...steady, null])), null);
  // Often on Offer at 70: that is its usual price, so 70 again is no drop.
  const offers = Array.from({ length: 20 }, (_, i) => (i % 3 ? 70 : 100));
  assert.equal(priceDrop(days([...offers, 70])), null);
});

test("three days of history are too few for any staple to alert", () => {
  for (const text of ["1 l melk", "400 g spinazie"]) assert.equal(resolver.priceDropAt("dirk", resolver.parse(text)), null);
});

test("the real vocabulary reads plain boter as roomboter, and margarine as itself", () => {
  const { catalogue } = buildCatalogue({ chains: [], products: {} });
  const real = context.MealdealResolve.createResolver({ ...catalogue, chains: [] });
  assert.equal(real.parse("250 g boter").ingredient, "roomboter");
  assert.equal(real.parse("boter").ingredient, "roomboter");
  assert.equal(real.parse("margarine").ingredient, "margarine");
  assert.equal(real.parse("ongezouten roomboter").variant, "ongezouten");
});
