import { test } from "node:test";
import assert from "node:assert/strict";
import { groupTwins, twinWords, type TwinCandidate } from "../src/catalogue/twins.ts";
import { createAllows } from "../src/ingredients/map.ts";

/**
 * Twins: one item at several Chains, joined by a shared EAN, or by brand,
 * name and pack where no EAN is published, so a mapping fixed at one Chain
 * holds at all of them.
 */

const p = (chainId: string, ref: string, name: string, brand: string | null, over: Partial<TwinCandidate> = {}): TwinCandidate =>
  ({ chainId, ref, name, brand, eans: [], packQuantity: 1, packUnit: "l", ...over });

test("brand and name are the same words in any order, without the pack", () => {
  assert.deepEqual(twinWords("G'woon", "G'woon Mini Groente Loempias"), twinWords(null, "G'woon Mini loempia groente 24 st."));
  assert.deepEqual(twinWords("Hak", "Appel kaneel moes"), twinWords(null, "Hak Moes Kaneel Appel"));
  assert.notDeepEqual(twinWords("Beemster", "Oud 48+ Plakken"), twinWords("Beemster", "Oud 30+ Plakken"));
});

test("own brands sharing an EAN are twins, and so are same-named Products at the same pack", () => {
  const twins = groupTwins([
    p("vomar", "v1", "G'woon Halfvolle melk", "G'woon", { eans: ["8718452000001"] }),
    p("hoogvliet", "h1", "Halfvolle melk", "G'woon", { eans: ["8718452000001"] }),
    p("dirk", "d1", "1 de Beste Halfvolle melk", "1 de Beste"),
    p("dekamarkt", "k1", "1 de Beste Halfvolle melk", "1 de Beste"),
    p("dekamarkt", "k2", "1 de Beste Halfvolle melk 2 l", "1 de Beste", { packQuantity: 2 }),
  ]);
  assert.deepEqual(twins.map((t) => t.members), [{ vomar: "v1", hoogvliet: "h1" }, { dekamarkt: "k1", dirk: "d1" }]);
});

test("a join that would put two Products of one Chain together is refused, and the rest of the group stands", () => {
  const twins = groupTwins([
    p("jumbo", "j1", "Beemster Oud Kaas 6 Plakken", null, { eans: ["8712243044513"], packUnit: "kg", packQuantity: 0.15 }),
    p("hoogvliet", "h1", "Oud 48+ Plakken", "Beemster", { eans: ["8712243044513"], packUnit: "kg", packQuantity: 0.15 }),
    p("vomar", "v1", "Beemster Oud Plakken", "Beemster", { eans: ["8712243044513", "8712243000000"], packUnit: "kg", packQuantity: 0.15 }),
    p("hoogvliet", "h2", "Oud Plakken", "Beemster", { eans: ["8712243000000"], packUnit: "kg", packQuantity: 0.15 }),
  ]);
  assert.deepEqual(twins.map((t) => t.members), [{ jumbo: "j1", hoogvliet: "h1", vomar: "v1" }]);
});

test("a twin lends no Ingredient its own name rules out, nor food to pet food", () => {
  const allows = createAllows();
  const at = (name: string, categories: string[] = []) => ({ chainId: "plus", name, brand: null, categories });
  assert.equal(allows(at("Saitaku Wasabi paste"), "pasta"), false);
  assert.equal(allows(at("Kristalsuiker", ["Koffie, thee > Koffiemelk, suiker & cacao > Suiker"]), "suiker"), true);
  assert.equal(allows(at("Kip in gelei", ["Huisdier > Kattenvoer"]), "kipfilet"), false);
});
