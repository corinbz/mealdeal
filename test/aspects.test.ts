import { test } from "node:test";
import assert from "node:assert/strict";
import { createResolver } from "../src/page.ts";
import { must } from "./helpers/page.ts";
import { createMapper } from "../src/ingredients/map.ts";
import { buildCatalogue } from "../src/catalogue/build.ts";

/**
 * Variants in several aspects, and the Ingredients named with what they hold
 * or taste of. Every Product here is a real one, its name, brand and
 * categories recorded from the 2026-10-14 archive.
 */

const map = createMapper();
const YOGHURT = ["Zuivel & kaas > Yoghurt, kwark & pap"];
const as = (chainId: string, name: string, categories: string[]) => {
  const m = map({ chainId, name, brand: null, categories });
  return m && [m.ingredient, m.variant];
};

test("a Product has one Variant in each aspect: type, fat and flavour", () => {
  assert.deepEqual(as("dirk", "Dodoni Griekse yoghurt 10%", YOGHURT), ["yoghurt", "grieks+10%+naturel"]);
  assert.deepEqual(as("plus", "Optimel Yoghurt Griekse stijl kers 0% vet", ["Zuivel, eieren, boter > Verse zuivel > Yoghurt"]), ["yoghurt", "grieks+mager+kers"]);
  assert.deepEqual(as("plus", "Almhof Halfvolle fruityoghurt kers", ["Zuivel, eieren, boter > Verse zuivel > Yoghurt"]), ["yoghurt", "gewoon+halfvol+kers"]);
});

test("a flavour is the one named first", () => {
  assert.deepEqual(as("dirk", "Arla Skyr perzik passievrucht", YOGHURT), ["yoghurt", "skyr+perzik"]);
});

test("a flavour of something else is a Variant, not a second thing", () => {
  assert.deepEqual(as("hoogvliet", "Smeerkaas sambal", ["Kaas, vleeswaren, tapas > Smeerkaas & zuivelspread > Smeerkaas"]), ["roomkaas", "sambal"]);
  assert.deepEqual(as("dirk", "Melkunie Vla chocolade", ["Zuivel & kaas > Vla"]), ["vla", null]);
});

test("a pizza named for its toppings is a pizza", () => {
  assert.equal(as("hoogvliet", "Ristorante pizza salami mozarella pesto", ["Diepvries > Pizza > Italiaanse pizza's"])?.[0], "pizza");
});

test("a shelf that holds one thing decides where the name gives only a flavour", () => {
  assert.deepEqual(as("vomar", "Ola Festini Peer", ["Diepvries > IJs > Handijs"]), ["ijs", "peer"]);
});

const { catalogue } = buildCatalogue({ chains: [], products: {} });
const R = createResolver({ ...catalogue, chains: [] });

test("several Variants typed together are read as one Requirement", () => {
  const p = must(R.parse("griekse yoghurt 10% aardbei"));
  assert.deepEqual([p.ingredient, p.variant, p.noun], ["yoghurt", "grieks+10%+aardbei", "griekse yoghurt 10% aardbei"]);
  assert.deepEqual([R.parse("500 g magere griekse yoghurt")?.variant, R.parse("500 g magere griekse yoghurt")?.quantity], ["grieks+mager", 0.5]);
  assert.equal(R.parse("strawberry greek yogurt")?.variant, "grieks+aardbei");
  assert.equal(R.parse("2% yogurt")?.variant, "2%");
});

test("several Variants share the Ingredient's name", () => {
  assert.equal(R.label("yoghurt", "grieks+mager+aardbei", "nl"), "magere griekse yoghurt aardbei");
  assert.equal(R.label("yoghurt", "skyr+aardbei", "nl"), "skyr aardbei");
  assert.equal(R.label("yoghurt", "grieks+10%", "en"), "greek yogurt 10%");
});

test("a Requirement naming some aspects is satisfied whatever the others are", () => {
  const p = { ingredient: "yoghurt", variant: "grieks+10%+naturel", ingredientUnitPriceCents: 400, form: "vers", biologisch: false, huismerk: false };
  const asks = (variant: string | null) => R.satisfies(p, { ingredient: "yoghurt", variant, preferences: {} });
  assert.deepEqual([asks(null), asks("grieks"), asks("grieks+10%"), asks("10%+naturel"), asks("skyr"), asks("grieks+aardbei")],
    [true, true, true, true, false, false]);
});
