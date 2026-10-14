import { test } from "node:test";
import assert from "node:assert/strict";
import { composeDigest, realDeals, type DigestCatalogue } from "../src/digest/compose.ts";

/**
 * The weekly digest may only call something a discount when the real-discount
 * check (#18) supports it: an Offer with its own price, below the Product's
 * lowest price of the days before. Staples resolve as on the basket page
 * (prototype/resolve.js), through the Ingredient vocabulary (#14).
 */

const COLUMNS = [
  "ref", "name", "packaging", "packQuantity", "packUnit", "comparisonUnit", "shelfPriceCents", "offerPriceCents",
  "unitPriceCents", "offerWording", "offerEndsOn", "nextWording", "nextStartsOn", "ingredient", "variant", "form",
  "flags", "ingredientUnitPriceCents", "ingredientPack", "referenceLowCents", "referenceDays",
];

interface P { name: string; unit: "kg" | "l" | "piece"; shelf: number; offer?: number | null; wording?: string | null;
  low?: number | null; days?: number | null; ingredient?: string | null; variant?: string | null }
let n = 0;
const row = (p: P) => {
  const price = p.offer ?? p.shelf;
  return [String(++n), p.name, null, 1, p.unit, p.unit, p.shelf, p.offer ?? null, price, p.wording ?? null, null, null, null,
    p.ingredient ?? null, p.variant ?? null, p.ingredient ? "vers" : null, 0, p.ingredient ? price : null, p.ingredient ? 1 : null,
    p.low ?? null, p.days ?? null];
};

const VOCABULARY = [
  { id: "gehakt", name: "gehakt", unit: "kg", also: [], equals: {}, fresh: true, variants: [{ id: "rund", name: "rundergehakt" }] },
  { id: "melk", name: "melk", unit: "l", also: [], equals: {}, fresh: true, variants: [{ id: "halfvol", name: "halfvolle melk" }] },
  { id: "aardappelen", name: "aardappelen", unit: "kg", also: [], equals: {}, fresh: true, variants: [{ id: "kruimig", name: "kruimige aardappelen" }] },
];

const catalogue = (rows: Record<string, P[]>, chains = [["dirk", "Dirk"], ["jumbo", "Jumbo"]]): DigestCatalogue => ({
  chains: chains.filter(([id]) => rows[id!]).map(([id, name]) => ({ id: id!, name: name!, observedAt: "2026-10-21" })),
  columns: COLUMNS,
  vocabulary: VOCABULARY,
  catalogue: Object.fromEntries(Object.entries(rows).map(([id, ps]) => [id, ps.map(row)])),
});

const DATA = catalogue({
  dirk: [
    { name: "Rundergehakt", unit: "kg", shelf: 449, offer: 399, wording: "1 euro korting", low: 449, days: 12, ingredient: "gehakt", variant: "rund" },
    { name: "Halfvolle melk", unit: "l", shelf: 109, offer: 99, wording: "actie", low: 95, days: 12, ingredient: "melk", variant: "halfvol" },
    { name: "Kruimige aardappelen", unit: "kg", shelf: 249, offer: null, wording: "1+1 gratis", low: 249, days: 12, ingredient: "aardappelen", variant: "kruimig" },
  ],
  jumbo: [
    { name: "Jumbo Rundergehakt 500 g", unit: "kg", shelf: 469, offer: 429, wording: "25% korting", ingredient: "gehakt", variant: "rund" }, // no history
    { name: "Jumbo Aardappelen Kruimig", unit: "kg", shelf: 279, offer: 199, wording: "25% korting", low: 279, days: 30, ingredient: "aardappelen", variant: "kruimig" },
  ],
});

test("only Offers below the Reference Price are claimed", () => {
  const found = realDeals(DATA, ["500 g rundergehakt", "1 l halfvolle melk", "1 kg kruimige aardappelen"]);
  assert.deepEqual(found.map((s) => [s.staple, s.deals.map((d) => `${d.chain}: ${d.name}`)]), [
    ["rundergehakt", ["Dirk: Rundergehakt"]],
    ["halfvolle melk", []],
    ["kruimige aardappelen", ["Jumbo: Jumbo Aardappelen Kruimig"]],
  ]);
});

test("a staple resolves through its Ingredient, as on the list", () => {
  // "gehakt" names the Ingredient without a Variant, so any Variant may satisfy it.
  assert.deepEqual(realDeals(DATA, ["gehakt"])[0]!.deals.map((d) => d.name), ["Rundergehakt"]);
});

test("a staple the vocabulary does not know still resolves by name, without dishes named after it", () => {
  const data = catalogue({ jumbo: [
    { name: "Jumbo Bloemkool Broccoli Gehaktbal met Gekookte Aardappelen 500 g", unit: "kg", shelf: 499, offer: 399, wording: "voor 3,99", low: 499, days: 1 },
    { name: "Jumbo Broccoli 500 g", unit: "kg", shelf: 119, offer: 109, wording: "voor 1,09", low: 119, days: 1 },
  ] });
  assert.deepEqual(realDeals(data, ["400 g broccoli"])[0]!.deals.map((d) => d.name), ["Jumbo Broccoli 500 g"]);
});

test("the email says which day the prices are from, and names staples without a real discount", () => {
  const digest = composeDigest(DATA, ["500 g rundergehakt", "1 l halfvolle melk"], "https://example.pages.dev/", "https://github.com/x");
  assert.equal(digest.deals, 1);
  assert.equal(digest.subject, "1 echte korting op je vaste boodschappen");
  assert.match(digest.text, /prijzen van woensdag 21 oktober/);
  assert.match(digest.text, /Dirk: Rundergehakt, €3,99 in plaats van €4,49 \(1 euro korting\)\. Laagste prijs in 12 dagen; daarvoor minstens €4,49\./);
  assert.match(digest.text, /Geen echte korting deze week op: halfvolle melk\./);
  assert.match(digest.html, /Disable workflow/);
});

test("a week with nothing real says so rather than sending deals it cannot support", () => {
  const digest = composeDigest(DATA, ["1 l halfvolle melk"], "https://example.pages.dev/", "https://github.com/x");
  assert.equal(digest.deals, 0);
  assert.equal(digest.subject, "Deze week geen echte kortingen op je vaste boodschappen");
});

test("wording is escaped in the HTML", () => {
  const data = catalogue({ dirk: [{ name: "Rundergehakt", unit: "kg", shelf: 449, offer: 399, wording: "<b>actie</b>", low: 449, days: 3, ingredient: "gehakt", variant: "rund" }] });
  assert.match(composeDigest(data, ["rundergehakt"], "https://e/", "https://g/").html, /&lt;b&gt;actie&lt;\/b&gt;/);
});
