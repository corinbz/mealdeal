import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCatalogue, type SourceChain, type SourceProduct } from "../src/catalogue/build.ts";
import { productsOf } from "../src/catalogue/format.ts";

/**
 * The catalogue built from each Chain's latest Observations, with no
 * database: which Ingredient a Product is, its price in that Ingredient's
 * unit, what an unmapped Product borrows from its EAN twin, and what the
 * page is told about each Chain.
 */

const chain = (id: string, name: string, over: Partial<SourceChain> = {}): SourceChain =>
  ({ id, name, kind: "supermarket", observedAt: "2026-10-14", productsRecorded: 100, offersRecorded: 10, ...over });
const product = (over: Partial<SourceProduct> & Pick<SourceProduct, "ref" | "name">): SourceProduct => ({
  brand: null, categories: [], eans: [], packText: null, packQuantity: 1, packUnit: "kg", comparisonUnit: "kg",
  shelfPriceCents: 100, offerPriceCents: null, unitPriceCents: 100, offerWording: null, offerEndsOn: null,
  nextWording: null, nextStartsOn: null, ...over,
});

const PRODUCE = ["Aardappelen, groente en fruit > Groente > Courgette"];
const MILK = ["Zuivel, eieren, boter > Melk"];

const source = {
  chains: [chain("dirk", "Dirk"), chain("hoogvliet", "Hoogvliet"), chain("jumbo", "Jumbo"), chain("lidl", "Lidl"), chain("vomar", "Vomar", { offersRecorded: 0 })],
  products: {
    dirk: [product({ ref: "d1", name: "Onbekend", packText: "Onbekend" })],
    hoogvliet: [product({ ref: "h1", name: "Campina Langlekker 1 l", brand: "Campina", eans: ["8712800000001"], packUnit: "l", comparisonUnit: "l" })],
    jumbo: [
      // Sold per kg, the Ingredient counted per piece at 0.3 kg each.
      product({ ref: "j1", name: "Courgette", categories: PRODUCE, packQuantity: 0.6, unitPriceCents: 250, nextWording: "", nextStartsOn: "2026-10-19" }),
      product({ ref: "j2", name: "Campina Halfvolle Melk 1 l", brand: "Campina", categories: MILK, eans: ["8712800000001"], packUnit: "l", comparisonUnit: "l", packText: "1 liter" }),
    ],
    lidl: [product({ ref: "l1", name: "Lidl Courgette", offerPriceCents: 49, offerWording: "Met Lidl Plus -50%" })],
    vomar: [],
  },
};
const built = buildCatalogue(source, { now: new Date("2026-10-14T05:00:00Z") });
const at = (chainId: string) => productsOf(built.catalogue, chainId);

test("a Product sold per kg is priced in its Ingredient's unit, where the vocabulary says how", () => {
  const [courgette] = at("jumbo");
  assert.equal(courgette!.ingredient, "courgette");
  assert.equal(courgette!.ingredientUnitPriceCents, 75, "€2.50 a kilo is €0.75 a courgette of 0.3 kg");
  assert.equal(courgette!.ingredientPack, 2, "0.6 kg is two courgettes");
  assert.equal(at("dirk")[0]!.ingredientUnitPriceCents, null, "no Ingredient, no comparison");
});

test("an unmapped Product borrows its EAN twin's Ingredient, and is counted as borrowed", () => {
  assert.equal(at("hoogvliet")[0]!.ingredient, "melk");
  assert.equal(at("hoogvliet")[0]!.variant, "halfvol");
  assert.deepEqual(built.counts["hoogvliet"], { total: 1, excluded: { nonfood: 0, alcohol: 0 }, mapped: 1, borrowed: 1, comparable: 1, upcoming: 0 });
  assert.deepEqual(built.catalogue.exact?.map((g) => g.members), [{ hoogvliet: "h1", jumbo: "j2" }]);
  assert.deepEqual(built.conflicts, []);
});

test("packaging that only repeats the name is left out; an announced Offer with no wording is kept", () => {
  assert.equal(at("dirk")[0]!.packaging, null);
  assert.equal(at("jumbo")[1]!.packaging, "1 liter");
  assert.equal(at("jumbo")[0]!.nextWording, "");
  assert.equal(built.counts["jumbo"]!.upcoming, 1);
});

test("the page is told each Chain's Store, Offers, EANs, offers-only and the card it assumes", () => {
  const c = Object.fromEntries(built.catalogue.chains.map((ch) => [ch.id, ch]));
  assert.equal(c["dirk"]!.store, "Store 66");
  assert.equal(c["jumbo"]!.store, null);
  assert.equal(c["vomar"]!.offers, false, "no Offers read: its prices are Shelf Prices");
  assert.equal(c["dirk"]!.eans, false);
  assert.equal(c["jumbo"]!.eans, true);
  assert.equal(c["lidl"]!.offersOnly, true);
  assert.equal(c["lidl"]!.card, "Lidl Plus");
  assert.equal(c["jumbo"]!.card, null);
  assert.equal(built.catalogue.generatedAt, "2026-10-14T05:00:00.000Z");
});

test("non-food and wine are left out before anything is matched, and counted", () => {
  const b = buildCatalogue({
    chains: [chain("jumbo", "Jumbo"), chain("plus", "Plus")],
    products: {
      jumbo: [
        product({ ref: "j1", name: "Campina Halfvolle Melk 1 l", eans: ["8712800000001"], categories: MILK, packUnit: "l", comparisonUnit: "l" }),
        product({ ref: "j2", name: "Pampers maat 4", categories: ["Baby en kind > Luiers en verschonen > Luiers"], comparisonUnit: "piece" }),
        product({ ref: "j3", name: "Hertog Jan Pilsener 6 x 30 cl", categories: ["Bier en wijn > Bier, pils > Blik"], packUnit: "l", comparisonUnit: "l" }),
      ],
      plus: [
        // A wine sharing an EAN with nothing kept, and a detergent: neither may reach an Exact Product.
        product({ ref: "p1", name: "Campina Halfvolle Melk 1 l", eans: ["8712800000001"], categories: ["Bier, wijn, sterke drank > Wijn > Rode wijn"], packUnit: "l", comparisonUnit: "l" }),
        product({ ref: "p2", name: "Ariel wasmiddel", categories: ["Huishouden, non food > Wasmiddelen"], packUnit: "l", comparisonUnit: "l" }),
      ],
    },
  });
  assert.deepEqual(productsOf(b.catalogue, "jumbo").map((p) => p.ref), ["j1", "j3"]);
  assert.deepEqual(productsOf(b.catalogue, "plus"), []);
  assert.deepEqual(b.counts["jumbo"]!.excluded, { nonfood: 1, alcohol: 0 });
  assert.deepEqual(b.counts["plus"]!.excluded, { nonfood: 1, alcohol: 1 });
  assert.deepEqual(b.catalogue.exact, []);
});
