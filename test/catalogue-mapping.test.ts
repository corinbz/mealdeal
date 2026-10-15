import { test } from "node:test";
import assert from "node:assert/strict";
import { mapProducts, type MappingInput } from "../src/catalogue/mapping.ts";
import type { Verdict } from "../src/catalogue/verdicts.ts";

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

const verdict = (chain: string, ref: string, name: string, is: string | null): Verdict => ({ chain, ref, name, is, from: "sample", on: "2026-10-16" });
const products = [
  product({ chainId: "jumbo", ref: "j1", name: "Campina Halfvolle Melk 1 l", brand: "Campina", categories: MILK, eans: [EAN] }),
  product({ chainId: "plus", ref: "p1", name: "Campina Halfvolle Melk", brand: "Campina", categories: MILK, eans: [EAN] }),
  product({ chainId: "vomar", ref: "v1", name: "Campina Halfvolle Karnemelk 1 l", brand: "Campina", categories: MILK, eans: [EAN] }),
  product({ chainId: "jumbo", ref: "b1", name: "Jumbo Partybrood Wit 200 g", categories: BREAD, packQuantity: 0.2, packUnit: "kg", pack: { quantity: 0.2, unit: "kg" } }),
  product({ chainId: "jumbo", ref: "x1", name: "Zwitsal babyshampoo" }),
  product({ chainId: "aldi", ref: "a1", name: "Milsani Lactosevrije drink" }),
  product({ chainId: "plus", ref: "a2", name: "Milsani Lactosevrije drink", brand: "Milsani" }),
];

test("a Verdict outranks the Product's name and its twins, and keeps what the vocabulary alone said", () => {
  const m = mapProducts(products, undefined, [verdict("vomar", "v1", "Campina Halfvolle Karnemelk 1 l", "karnemelk")]);
  const d = m.decision("vomar", "v1");
  assert.deepEqual([d.how, d.mapping?.ingredient, d.unchecked.how, d.unchecked.mapping?.ingredient], ["verdict", "karnemelk", "outvoted", "melk"]);
  assert.equal(m.decision("jumbo", "j1").how, "name", "the others keep their own");
});

test("a Verdict of none takes a Product's Ingredient away, and one on a small pack holds", () => {
  const m = mapProducts(products, undefined, [verdict("jumbo", "j1", "Campina Halfvolle Melk 1 l", null), verdict("jumbo", "b1", "Jumbo Partybrood Wit 200 g", "brood")]);
  assert.deepEqual([m.decision("jumbo", "j1").how, m.decision("jumbo", "j1").mapping], ["verdict", null]);
  assert.deepEqual([m.decision("jumbo", "b1").mapping?.ingredient, m.decision("jumbo", "b1").unchecked.how], ["brood", "too-small"]);
});

test("a Verdict lends its Ingredient to the Product's twins, read as the mapper reads it", () => {
  const m = mapProducts(products, undefined, [verdict("aldi", "a1", "Milsani lactosevrije  drink", "melk")]);
  assert.equal(m.decision("aldi", "a1").mapping?.huismerk, true, "Milsani is Aldi's own");
  const twin = m.decision("plus", "a2");
  assert.deepEqual([twin.how, twin.mapping?.ingredient, twin.unchecked.how], ["twin", "melk", "twin"]);
});

test("a Verdict on a Product gone, or named otherwise now, no longer holds and is said so", () => {
  const m = mapProducts(products, undefined, [verdict("jumbo", "x1", "Zwitsal shampoo", "melk"), verdict("jumbo", "gone", "Iets", null)]);
  assert.equal(m.decision("jumbo", "x1").how, "none");
  assert.deepEqual(m.stale.map((s) => [s.verdict.ref, s.nameNow]), [["x1", "Zwitsal babyshampoo"], ["gone", null]]);
});
