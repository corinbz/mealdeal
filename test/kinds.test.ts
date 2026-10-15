import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCatalogue, type SourceProduct } from "../src/catalogue/build.ts";
import { createResolver, type Kindable } from "../src/page.ts";
import { must, plain } from "./helpers/page.ts";

/**
 * Which kind (#43): an item whose Ingredient comes in Variants but names none
 * is asked which, in each aspect, offered only what is sold with what is
 * already chosen. The Products are real ones from the 2026-10-14 archive.
 */

const YOGHURT = ["Zuivel & kaas > Yoghurt, kwark & pap"], MILK = ["Zuivel & kaas > Melk"];
const product = (ref: string, name: string, categories: string[], unit: "kg" | "l" = "kg"): SourceProduct => ({
  ref, name, brand: null, categories, eans: [], packText: null, packQuantity: 0.5, packUnit: unit, comparisonUnit: unit,
  shelfPriceCents: 200, offerPriceCents: null, unitPriceCents: 400, offerWording: null, offerEndsOn: null, nextWording: null, nextStartsOn: null,
});
const { catalogue } = buildCatalogue({
  chains: [{ id: "dirk", name: "Dirk", kind: "supermarket", observedAt: "2026-10-14", productsRecorded: 7, offersRecorded: 0 }],
  products: { dirk: [
    product("1", "Dodoni Griekse yoghurt 10%", YOGHURT),                 // grieks+10%+naturel
    product("2", "Optimel Yoghurt Griekse stijl kers 0% vet", YOGHURT),  // grieks+mager+kers
    product("3", "Almhof Halfvolle fruityoghurt kers", YOGHURT),         // gewoon+halfvol+kers
    product("4", "Arla Skyr perzik passievrucht", YOGHURT),              // skyr+perzik
    product("5", "Campina Halfvolle Melk", MILK, "l"),
    product("6", "Campina Volle Melk", MILK, "l"),
    product("7", "Verse spinazie", ["Groente > Bladgroente"]),
  ] },
}, { now: new Date("2026-10-14T05:00:00Z") });
const R = createResolver(catalogue);
const item = (text: string, over: Partial<Kindable> = {}): Kindable => ({ ...must(R.parse(text)), ...over });
const offered = (text: string, over: Partial<Kindable> = {}) =>
  plain(must(R.kinds(item(text, over))).aspects).map((a) => [a.aspect, a.value, a.options.map((o) => o.v.id)]);

test("an item naming no kind is asked each aspect, plain first among the flavours", () => {
  const k = must(R.kinds(item("yoghurt")));
  assert.deepEqual([k.sold, k.asks], [true, true]);
  assert.deepEqual(offered("yoghurt"), [
    ["soort", null, ["grieks", "skyr", "gewoon"]],
    ["vet", null, ["10%", "halfvol", "mager"]],
    ["smaak", null, ["naturel", "kers", "perzik"]],
  ]);
});

test("only the kinds sold with what is chosen are offered: Greek yoghurt shows the fats Greek yoghurt comes in", () => {
  assert.deepEqual(offered("griekse yoghurt").slice(1), [["vet", null, ["10%", "mager"]], ["smaak", null, ["naturel", "kers"]]]);
});

test("Variants sold nowhere together are asked again, each still shown so one can change", () => {
  const k = must(R.kinds(item("griekse yoghurt 10% aardbei")));
  assert.deepEqual([k.sold, k.asks], [false, true]);
  assert.deepEqual(plain(k.aspects).map((a) => a.value), ["grieks", "10%", "aardbei"]);
});

test("answered \"any\", an item is not asked again, unless what it names is sold nowhere", () => {
  assert.equal(must(R.kinds(item("yoghurt", { anyKind: true }))).asks, false);
  assert.equal(must(R.kinds(item("griekse yoghurt 10% aardbei", { anyKind: true }))).asks, true);
});

test("nothing to choose: no Variants on sale, or an Exact Product", () => {
  assert.equal(R.kinds(item("spinazie")), null);
  assert.equal(R.kinds(item("melk", { exact: "8712800000001" })), null);
});

test("a kind tapped replaces the other of its aspect, and tapped again comes off", () => {
  const greek = item("griekse yoghurt");
  // Low-fat Greek comes only in kers here: nothing is left to ask.
  assert.deepEqual(plain(R.chooseKind(greek, "mager")), { variant: "grieks+mager", anyKind: false, answered: true });
  // Greek chosen, the fat is still open: asked on.
  assert.deepEqual(plain(R.chooseKind(item("yoghurt"), "grieks")), { variant: "grieks", anyKind: false, answered: false });
  assert.deepEqual(R.chooseKind(greek, "skyr").variant, "skyr");
  assert.deepEqual(R.chooseKind(item("griekse yoghurt 10%"), "10%").variant, "grieks");
});

test("\"any\" keeps what was chosen in other aspects, and clears an Ingredient varying in one", () => {
  assert.deepEqual(plain(R.chooseKind(item("griekse yoghurt"), null)), { variant: "grieks", anyKind: true, answered: true });
  assert.deepEqual(plain(R.chooseKind(item("halfvolle melk"), null)), { variant: null, anyKind: true, answered: true });
  assert.deepEqual(plain(R.chooseKind(item("melk"), "vol")), { variant: "vol", anyKind: false, answered: true });
});
