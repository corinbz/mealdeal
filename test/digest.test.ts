import { test } from "node:test";
import assert from "node:assert/strict";
import { composeDigest, realDeals, type DigestCatalogue } from "../src/digest/compose.ts";

/**
 * The weekly digest may only call something a discount when the real-discount
 * check (#18) supports it: an Offer with its own price, below the Product's
 * lowest price of the days before.
 */

type Row = [string, string, null, number, string, string, number, number | null, number, string | null, null, null, null, number | null, number | null];
const row = (ref: string, name: string, unit: "kg" | "l" | "piece", shelf: number, offer: number | null, wording: string | null, low: number | null, days: number | null): Row =>
  [ref, name, null, 1, unit, unit, shelf, offer, offer ?? shelf, wording, null, null, null, low, days];

const DATA: DigestCatalogue = {
  chains: [{ id: "dirk", name: "Dirk", observedAt: "2026-10-21" }, { id: "jumbo", name: "Jumbo", observedAt: "2026-10-21" }],
  catalogue: {
    dirk: [
      row("1", "Rundergehakt", "kg", 449, 399, "1 euro korting", 449, 12), // real low
      row("2", "Halfvolle melk", "l", 109, 99, "actie", 95, 12),            // not lower than recently
      row("3", "Kruimige aardappelen", "kg", 249, null, "1+1 gratis", 249, 12), // no price of its own
    ],
    jumbo: [
      row("a", "Jumbo Rundergehakt 500 g", "kg", 469, 429, "25% korting", null, null), // no history
      row("b", "Jumbo Kipgehakt", "kg", 499, 449, "actie", 499, 30),                    // another staple's word
      row("c", "Jumbo Aardappelen Kruimig", "kg", 279, 199, "25% korting", 279, 30),     // real low
    ],
  },
};

test("only Offers below the Reference Price are claimed", () => {
  const found = realDeals(DATA, ["500 g rundergehakt", "1 l halfvolle melk", "1 kg kruimige aardappelen"]);
  assert.deepEqual(found.map((s) => [s.staple, s.deals.map((d) => `${d.chain}: ${d.name}`)]), [
    ["rundergehakt", ["Dirk: Rundergehakt"]],
    ["halfvolle melk", []],
    ["kruimige aardappelen", ["Jumbo: Jumbo Aardappelen Kruimig"]],
  ]);
});

test("a staple matches like the page: every typed word ends a word of the name", () => {
  const found = realDeals(DATA, ["gehakt"]);
  assert.deepEqual(found[0]!.deals.map((d) => d.name), ["Rundergehakt", "Jumbo Kipgehakt"]);
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
  const data: DigestCatalogue = { chains: DATA.chains.slice(0, 1), catalogue: { dirk: [row("1", "Rundergehakt", "kg", 449, 399, "<b>actie</b>", 449, 3)] } };
  assert.match(composeDigest(data, ["rundergehakt"], "https://e/", "https://g/").html, /&lt;b&gt;actie&lt;\/b&gt;/);
});
