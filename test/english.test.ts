import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createResolver } from "../src/page.ts";
import { must } from "./helpers/page.ts";
import { buildCatalogue } from "../src/catalogue/build.ts";
import { VOCABULARY } from "../src/ingredients/vocabulary.ts";
import { ENGLISH, englishOf } from "../src/ingredients/english.ts";

/**
 * Typing in English (#25): every Ingredient and Variant has English names,
 * read as the same Requirement as the Dutch ones, whatever the page's
 * language, and none of them reads as another Ingredient or Variant.
 */

const { catalogue } = buildCatalogue({ chains: [], products: {} });
const R = createResolver({ ...catalogue, chains: [] });

test("every Ingredient and Variant has an English name", () => {
  const missing = VOCABULARY.flatMap((d) => {
    const en = englishOf(d.id);
    if (!en) return [d.id];
    return d.variants.filter((v) => !en.variants[v.id]).map((v) => d.id + "/" + v.id);
  });
  assert.deepEqual(missing, []);
});

test("no English name is given for an Ingredient or Variant the vocabulary lacks", () => {
  const ids = new Map(VOCABULARY.map((d) => [d.id, new Set(d.variants.map((v) => v.id))]));
  const stray = Object.keys(ENGLISH).flatMap((id) => {
    const en = englishOf(id)!;
    if (!ids.has(id)) return [id];
    return Object.keys(en.variants).filter((v) => !ids.get(id)!.has(v)).map((v) => id + "/" + v);
  });
  assert.deepEqual(stray, []);
});

test("every English name reads as its own Ingredient or Variant, never another", () => {
  const wrong: string[] = [];
  for (const d of VOCABULARY) {
    const en = englishOf(d.id)!;
    for (const n of en.names) {
      const r = R.parse(n);
      if (r?.ingredient !== d.id || r.variant !== null) wrong.push(`${n} -> ${r?.ingredient}/${r?.variant}, not ${d.id}`);
    }
    for (const [v, ns] of Object.entries(en.variants)) for (const n of ns) {
      const r = R.parse(n);
      if (r?.ingredient !== d.id || r.variant !== v) wrong.push(`${n} -> ${r?.ingredient}/${r?.variant}, not ${d.id}/${v}`);
    }
  }
  assert.deepEqual(wrong, []);
});

test("English names do not change how a Dutch name reads", () => {
  const plain = createResolver({ ...catalogue, chains: [], vocabulary: catalogue.vocabulary.map(({ names, variants, ...d }: any) =>
    ({ ...d, variants: variants.map(({ names: _, ...v }: any) => v) })) });
  const changed: string[] = [];
  for (const d of VOCABULARY) for (const n of [d.name, d.id, ...d.also, ...d.variants.map((v) => v.name)]) {
    const a = plain.parse(n), b = R.parse(n);
    if (a?.ingredient !== b?.ingredient || a?.variant !== b?.variant) changed.push(`${n}: ${a?.ingredient}/${a?.variant} -> ${b?.ingredient}/${b?.variant}`);
  }
  assert.deepEqual(changed, []);
});

test("English shopping reads as the same Requirements as Dutch", () => {
  const same: [string, string][] = [
    ["500 g ground beef", "500 g rundergehakt"], ["500 g minced beef", "500 g rundergehakt"],
    ["1 l semi-skimmed milk", "1 l halfvolle melk"], ["1 l low-fat milk", "1 l halfvolle melk"],
    ["6 free range eggs", "6 vrije-uitloopeieren"], ["2 zucchini", "2 courgettes"], ["1 eggplant", "1 aubergine"],
    ["1 kg potatoes", "1 kg aardappelen"], ["275 g smoked sausage", "275 g rookworst"], ["400 g fresh spinach", "400 g spinazie"],
  ];
  for (const [en, nl] of same) {
    const a = must(R.parse(en)), b = must(R.parse(nl));
    assert.deepEqual([a.ingredient, a.variant, a.unit, a.quantity], [b.ingredient, b.variant, b.unit, b.quantity], en);
  }
});

test("a Variant typed in English is named in English", () => {
  assert.equal(R.parse("500 g minced beef")?.noun, "ground beef");
  assert.equal(R.parse("500 g rundergehakt")?.noun, "rundergehakt");
});

test("English Preferences and units read", () => {
  const p = must(R.parse("400 g organic frozen spinach"));
  assert.equal(p.ingredient, "spinazie");
  assert.deepEqual({ ...p.preferences }, { biologisch: true, diepvries: true });
  assert.deepEqual({ ...R.parse("store brand peanut butter")?.preferences }, { huismerk: true });
  assert.deepEqual({ ...R.parse("name brand peanut butter")?.preferences }, { amerk: true });
  assert.deepEqual({ ...R.parse("canned corn")?.preferences }, { conserven: true });
  assert.deepEqual([R.parse("3 pieces garlic")?.unit, R.parse("2 litres milk")?.quantity], ["kg", 2]);
});

test("a misspelt English name gets a Spelling Hint", () => {
  assert.equal(R.parse("500 g ground beaf")?.suggestion, "ground beef");
  assert.equal(R.parse("brocolli")?.suggestion, "broccoli");
  assert.equal(R.parse("cucumbre")?.suggestion, "cucumber");
});

test("an Ingredient's label is in the language asked for, Dutch without one", () => {
  assert.equal(R.label("rookworst", null, "en"), "smoked sausage");
  assert.equal(R.label("gehakt", "rund", "en"), "ground beef");
  assert.equal(R.label("gehakt", "rund", "nl"), "rundergehakt");
  assert.equal(R.label("hagelslag", null, "en"), "hagelslag");
  assert.equal(R.label("rookworst", null, "ro"), "rookworst");
});
