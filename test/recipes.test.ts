import { test } from "node:test";
import assert from "node:assert/strict";
import { createResolver, RECIPES } from "../src/page.ts";
import { pageVocabulary } from "../src/catalogue/build.ts";

/**
 * The recipes (#20, ADR-0007) are data, and each Requirement must name an
 * Ingredient the vocabulary knows, read the way the basket page reads it.
 * A recipe that slips through unresolved would be priced on whatever Product
 * names happen to match, or on nothing.
 */

const vocabulary = pageVocabulary();
const resolver = createResolver({ chains: [], columns: ["ref"], vocabulary, catalogue: {} });

test("there are recipes, each complete and with a unique id", () => {
  assert.ok(RECIPES.length >= 20);
  assert.equal(new Set(RECIPES.map((r) => r.id)).size, RECIPES.length);
  for (const r of RECIPES) {
    assert.match(r.id, /^[a-z0-9-]+$/, r.id);
    assert.ok(r.name && r.persons > 0 && r.minutes > 0, r.id);
    assert.ok(r.requirements.length >= 2 && r.steps.length >= 3, r.id);
    assert.ok(Array.isArray(r.pantry), r.id);
  }
});

test("every recipe comes from the decided sources, a Wikibooks one with what its credit needs", () => {
  for (const r of RECIPES) {
    if (r.source === "own") continue;
    assert.equal(r.source.kind, "wikibooks", r.id);
    assert.match(r.source.url, /^https:\/\/nl\.wikibooks\.org\/wiki\/Kookboek\//, r.id);
    assert.ok(r.source.title && Number.isInteger(r.source.revision), r.id);
  }
});

test("every Requirement names a known Ingredient, in its own unit, with a stated quantity", () => {
  const units = new Map(vocabulary.map((d) => [d.id, d]));
  const bad: string[] = [];
  for (const r of RECIPES) for (const text of r.requirements) {
    const g = resolver.parse(text);
    const def = g?.ingredient ? units.get(g.ingredient) : undefined;
    if (!g || !def) bad.push(`${r.id}: "${text}" names no Ingredient`);
    // A bare count ("4 eieren") is read as pieces, which is right for an Ingredient counted so.
    else if (g.guessed && def.unit !== "piece") bad.push(`${r.id}: "${text}" has no unit`);
    else if (g.unit !== def.unit && !(g.unit in def.equals)) bad.push(`${r.id}: "${text}" is in ${g.unit}, ${def.id} in ${def.unit}`);
    else if (g.suggestion) bad.push(`${r.id}: "${text}" reads as a typo of ${g.suggestion}`);
  }
  assert.deepEqual(bad, []);
});

test("every recipe has an English name, pantry and steps, step for step (#25)", () => {
  for (const r of RECIPES) {
    assert.ok(r.en?.name, r.id);
    assert.equal(r.en.steps.length, r.steps.length, r.id);
    assert.equal(r.en.pantry.length, r.pantry.length, r.id);
    assert.ok(r.en.steps.every((s: string) => s.trim().length > 20), r.id);
  }
});
