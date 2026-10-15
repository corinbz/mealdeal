import { test } from "node:test";
import assert from "node:assert/strict";
import { borrowMappings, productKey } from "../src/catalogue/borrow.ts";
import type { ExactProduct } from "../src/catalogue/exact.ts";
import type { Mapping } from "../src/ingredients/map.ts";

/**
 * An unmapped Product borrows its EAN twin's Ingredient (#34), and only an
 * EAN-proven twin's: never one only likely the same.
 */

const mapping = (ingredient: string, variant: string | null = null, form: Mapping["form"] = "vers"): Mapping =>
  ({ ingredient, variant, form, biologisch: false, huismerk: false });
const group = (id: string, members: Record<string, string>, likely: Record<string, string> = {}): ExactProduct =>
  ({ id, name: "Galbani Mozzarella 125 g", members, likely });

test("an unmapped copy takes the Ingredient its EAN twins agree on", () => {
  const own = new Map([
    [productKey("jumbo", "J1"), null],
    [productKey("plus", "P1"), mapping("mozzarella")],
    [productKey("vomar", "V1"), mapping("mozzarella")],
  ]);
  const { mappings, conflicts } = borrowMappings([group("8000430130012", { jumbo: "J1", plus: "P1", vomar: "V1" })], own);
  assert.deepEqual(mappings.get(productKey("jumbo", "J1")), mapping("mozzarella"));
  assert.equal(mappings.size, 1);
  assert.deepEqual(conflicts, []);
});

test("twins that disagree lend nothing, and are reported even with no copy unmapped", () => {
  const own = new Map([
    [productKey("jumbo", "J1"), null],
    [productKey("plus", "P1"), mapping("mozzarella")],
    [productKey("vomar", "V1"), mapping("kaas")],
    [productKey("plus", "P2"), mapping("pesto")],
    [productKey("vomar", "V2"), mapping("pastasaus")],
  ]);
  const { mappings, conflicts } = borrowMappings([
    group("1", { jumbo: "J1", plus: "P1", vomar: "V1" }),
    group("2", { plus: "P2", vomar: "V2" }),
  ], own);
  assert.equal(mappings.size, 0);
  assert.deepEqual(conflicts.map((c) => [c.id, c.ingredients]), [
    ["1", { jumbo: null, plus: "mozzarella", vomar: "kaas" }],
    ["2", { plus: "pesto", vomar: "pastasaus" }],
  ]);
});

test("a Product only likely the same, at a Chain without EANs, borrows nothing", () => {
  const own = new Map([[productKey("plus", "P1"), mapping("mozzarella")], [productKey("dirk", "D1"), null]]);
  const { mappings } = borrowMappings([group("1", { plus: "P1", vomar: "V1" }, { dirk: "D1" })], new Map([...own, [productKey("vomar", "V1"), mapping("mozzarella")]]));
  assert.equal(mappings.has(productKey("dirk", "D1")), false);
});

test("a Variant or form the twins disagree on is not borrowed, the Ingredient still is", () => {
  const own = new Map([
    [productKey("jumbo", "J1"), null],
    [productKey("plus", "P1"), mapping("melk", "halfvol", "vers")],
    [productKey("vomar", "V1"), mapping("melk", "vol", "vers")],
  ]);
  const { mappings } = borrowMappings([group("1", { jumbo: "J1", plus: "P1", vomar: "V1" })], own);
  assert.deepEqual(mappings.get(productKey("jumbo", "J1")), mapping("melk", null, "vers"));
});
