import { test } from "node:test";
import assert from "node:assert/strict";
import { globalEan, groupExactProducts, type ExactCandidate } from "../src/catalogue/exact.ts";

/**
 * Exact Products (#15). Every Product here is a real one from the 2026-10-14
 * catalogue, name, brand, EANs and pack as recorded and refs shortened,
 * except the one marked constructed.
 */

const p = (chainId: string, ref: string, name: string, brand: string | null, eans: string[], pack: [number, string] | null, huismerk = false): ExactCandidate =>
  ({ chainId, ref, name, brand, eans, packQuantity: pack?.[0] ?? null, packUnit: pack?.[1] ?? null, huismerk });

const CALVE_350 = [
  p("jumbo", "J1", "Calvé Pindakaas Regular 350 g", null, ["8711200428953"], [0.35, "kg"]),
  p("vomar", "V1", "Calve Pindakaas", "Calve", ["8711200428953", "8712100516382", "8720182127426"], [0.35, "kg"]),
];
const CALVE_100 = [
  p("jumbo", "J2", "Calvé Pindakaas 100% Fijngemalen Pinda's 350 g", null, ["8720182127440"], [0.35, "kg"]),
  p("vomar", "V2", "Calve 100% Pindakaas", "Calve", ["8720182127440"], [0.35, "kg"]),
];
const DIRK = [
  p("dirk", "D1", "Calvé Pindakaas", "Calvé", [], [0.35, "kg"]),
  p("dirk", "D2", "Calvé Pindakaas", "Calvé", [], [0.65, "kg"]),
  p("dirk", "D3", "1 de Beste Pindakaas", "1 de Beste", [], [0.35, "kg"], true),
];

test("products sharing an EAN across Chains are one Exact Product", () => {
  const [g] = groupExactProducts(CALVE_350);
  assert.deepEqual(g!.members, { jumbo: "J1", vomar: "V1" });
  assert.equal(g!.id, "8711200428953");
  // The name that says the most, which is usually the one stating the pack.
  assert.equal(g!.name, "Calvé Pindakaas Regular 350 g");
});

test("an in-store code never joins Chains", () => {
  assert.equal(globalEan("2221230000000"), null);
  assert.equal(globalEan("8711200428953"), "8711200428953");
  // Loose apples at Vomar carry a restricted-range code. The Jumbo row is
  // constructed: another Chain's in-store numbering may reuse any such code,
  // and that would not make it the same item.
  const groups = groupExactProducts([
    p("vomar", "V", "Elstar Appels Los", null, ["2221230000000"], [1, "kg"]),
    p("jumbo", "J", "Jumbo Elstar Appels", null, ["2221230000000"], [1, "kg"]),
  ]);
  assert.deepEqual(groups, []);
});

test("an own-brand Product is never an Exact Product", () => {
  // Jumbo's own Kropsla carries the supplier's EAN that Vomar's unbranded
  // one does: the same lettuce, but ADR-0006 keeps own brands at the
  // Ingredient level.
  const groups = groupExactProducts([
    p("jumbo", "J", "Jumbo Kropsla", null, ["8710147711135"], null, true),
    p("vomar", "V", "Kropsla", null, ["8710147711135"], [1, "piece"]),
  ]);
  assert.deepEqual(groups, []);
});

test("an EAN on two different packs does not join them", () => {
  // One Crodino EAN is a 6 x 175 ml pack at Jumbo and one 105 ml bottle at Vomar.
  assert.deepEqual(groupExactProducts([
    p("jumbo", "J", "Crodino Biondo 6 x 175ml", null, ["8000040720380"], [1.05, "l"]),
    p("vomar", "V", "Crodino Aperitivo", "Crodino", ["8000040720380"], [0.105, "l"]),
  ]), []);
  // Packs stated in different units cannot be compared, and do not block it:
  // "4 x 80 g" at Jumbo is "4 stuks" at Vomar.
  assert.equal(groupExactProducts([
    p("jumbo", "J", "Mora Classics Hamburgers 4 x 80 g", null, ["8710861994180"], [0.32, "kg"]),
    p("vomar", "V", "Mora Hamburgers", "Mora", ["8710861994180"], [4, "piece"]),
  ]).length, 1);
});

test("a Chain with two Products on one Exact Product drops out of it", () => {
  const groups = groupExactProducts([
    ...CALVE_350,
    p("vomar", "V9", "Calve Pindakaas", "Calve", ["8711200428953"], [0.35, "kg"]),
  ]);
  assert.deepEqual(groups, []);
});

test("a Chain with no EANs joins only as likely the same, on brand, name and pack", () => {
  const groups = groupExactProducts([...CALVE_350, ...CALVE_100, ...DIRK]);
  const regular = groups.find((g) => g.id === "8711200428953")!;
  const pure = groups.find((g) => g.id === "8720182127440")!;
  // Dirk's plain "Calvé Pindakaas" 350 g is the Regular, not the 100%: the
  // narrowest name wins. The 650 g pot is another pack, and never is.
  assert.deepEqual(regular.likely, { dirk: "D1" });
  assert.deepEqual(pure.likely, {});
  // Likely is never membership: the proof stays with the EANs.
  assert.equal("dirk" in regular.members, false);
});

test("an own brand is not likely the same as a branded item", () => {
  const groups = groupExactProducts([...CALVE_350, DIRK[2]!]);
  assert.deepEqual(groups[0]!.likely, {});
});
