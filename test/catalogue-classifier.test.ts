import { test } from "node:test";
import assert from "node:assert/strict";
import { assessClassifier, features, NaiveBayes, outOfFold, type LabelledProduct } from "../src/catalogue/classifier.ts";

/**
 * The classifier's opinion: learnt from the vocabulary's own mappings, it
 * reports a mapped Product it places far more surely elsewhere, and an
 * unmapped one it places somewhere. It changes no mapping.
 */

test("a word's ending, its shelf and its unit are what the model sees", () => {
  const fs = features({ name: "PLUS Extra aardbeienjam", brand: "PLUS", categories: ["Ontbijt > Broodbeleg > Jam"], unit: "kg" });
  for (const f of ["e:jam", "s:jam", "leaf:jam", "u:kg"]) assert.ok(fs.includes(f), f);
});

test("naive Bayes ranks the Ingredient whose Products a name is most like first", () => {
  const nb = new NaiveBayes();
  for (const n of ["aardbeienjam", "kersenjam", "abrikozenjam"]) nb.learn(features({ name: n, brand: null, categories: [], unit: "kg" }), "jam");
  for (const n of ["paprikachips", "naturel chips", "ribbelchips"]) nb.learn(features({ name: n, brand: null, categories: [], unit: "kg" }), "chips");
  assert.equal(nb.scores(features({ name: "frambozenjam", brand: null, categories: [], unit: "kg" }))[0]!.label, "jam");
});

const shelf = (ingredient: string | null, name: string, i: number): LabelledProduct =>
  ({ chainId: "plus", ref: name + i, name, brand: null, categories: ["Ontbijt > Broodbeleg > Jam"], unit: "kg", ingredient });

const products: LabelledProduct[] = [
  ...["aardbeienjam", "kersenjam", "abrikozenjam", "frambozenjam", "bosvruchtenjam", "pruimenjam"].flatMap((n) => [1, 2, 3, 4, 5].map((i) => shelf("jam", `Merk ${n}`, i))),
  shelf("bloem", "Merk bramenjam", 0),
  shelf(null, "Merk perzikjam", 0),
];

test("each Product is judged by a model that never saw it", () => {
  const p = outOfFold(products).find((x) => x.product.name === "Merk bramenjam")!;
  assert.equal(p.label, "jam", "its own label, bloem, is not there to vouch for it");
});

test("a mapped Product placed far more surely elsewhere, and an unmapped one placed somewhere, are reported", () => {
  const o = assessClassifier(products, 5);
  assert.deepEqual(o.disagree.map((x) => [x.product.name, x.label]), [["Merk bramenjam", "jam"]]);
  assert.deepEqual(o.suggest.map((x) => [x.product.name, x.label]), [["Merk perzikjam", "jam"]]);
});
