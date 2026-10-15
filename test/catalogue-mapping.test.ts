import { test } from "node:test";
import assert from "node:assert/strict";
import { mapProducts, type MappingInput } from "../src/catalogue/mapping.ts";

/**
 * Which Ingredient each Product is, all things considered, and how that was
 * decided: by its own name, lent by its twins, outvoted by them, or dropped
 * as too small a pack to be it.
 */

const MILK = ["Zuivel > Melk"];
const BREAD = ["Brood, beleg > Brood"];
const product = (over: Partial<MappingInput> & Pick<MappingInput, "chainId" | "ref" | "name">): MappingInput => ({
  brand: null, categories: [], eans: [], packQuantity: 1, packUnit: "l", pack: { quantity: 1, unit: "l" }, ...over,
});
const EAN = "8712800000001";

const mapped = mapProducts([
  product({ chainId: "jumbo", ref: "j1", name: "Campina Halfvolle Melk 1 l", brand: "Campina", categories: MILK, eans: [EAN] }),
  product({ chainId: "plus", ref: "p1", name: "Campina Halfvolle Melk", brand: "Campina", categories: MILK, eans: [EAN] }),
  // Named so its own name says nothing, and so it says another Ingredient.
  product({ chainId: "hoogvliet", ref: "h1", name: "Campina Halfvol 1 l", brand: "Campina", eans: [EAN] }),
  product({ chainId: "vomar", ref: "v1", name: "Campina Halfvolle Karnemelk 1 l", brand: "Campina", categories: MILK, eans: [EAN] }),
  product({ chainId: "jumbo", ref: "b1", name: "Jumbo Partybrood Wit 200 g", categories: BREAD, packQuantity: 0.2, packUnit: "kg", pack: { quantity: 0.2, unit: "kg" } }),
  product({ chainId: "jumbo", ref: "b2", name: "Jumbo Volkorenbrood heel", categories: BREAD, packQuantity: 0.8, packUnit: "kg", pack: { quantity: 0.8, unit: "kg" } }),
  product({ chainId: "jumbo", ref: "x1", name: "Zwitsal babyshampoo" }),
]);
const how = (chainId: string, ref: string) => {
  const d = mapped.decision(chainId, ref);
  return [d.how, d.mapping?.ingredient ?? null, d.byName?.ingredient ?? null];
};

test("a Product named as its Ingredient is that Ingredient, by its name", () => {
  assert.deepEqual(how("jumbo", "j1"), ["name", "melk", "melk"]);
  assert.equal(mapped.decision("jumbo", "j1").pack, 1);
});

test("one whose name says nothing takes its twins' Ingredient, never their own brand", () => {
  assert.deepEqual(how("hoogvliet", "h1"), ["twin", "melk", null]);
  assert.equal(mapped.decision("hoogvliet", "h1").mapping?.huismerk, false);
});

test("one whose name says another Ingredient than most of its twins takes theirs, and its name's is kept beside it", () => {
  assert.deepEqual(how("vomar", "v1"), ["outvoted", "melk", "karnemelk"]);
  assert.deepEqual(mapped.conflicts.map((c) => [c.id, c.settled]), [[EAN, "melk"]]);
});

test("a pack too small to be its Ingredient is none at all, though its name says one", () => {
  assert.deepEqual(how("jumbo", "b1"), ["too-small", null, "brood"]);
  assert.equal(mapped.decision("jumbo", "b1").pack, null);
  assert.deepEqual(how("jumbo", "b2"), ["name", "brood", "brood"]);
});

test("one nothing says is any Ingredient is none, and a Product never given is an error", () => {
  assert.deepEqual(how("jumbo", "x1"), ["none", null, null]);
  assert.throws(() => mapped.decision("jumbo", "nope"));
});
