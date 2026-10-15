import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assessClassifier, type LabelledProduct } from "../src/catalogue/classifier.ts";
import type { Check } from "../src/catalogue/build.ts";
import { opinionsMarkdown } from "../src/catalogue/opinions.ts";
import { VERDICTS, VERDICTS_FILE, verdictsJson, type Verdict } from "../src/catalogue/verdicts.ts";
import { VOCABULARY } from "../src/ingredients/vocabulary.ts";

/**
 * Verdicts: what a person looking found a Product to be. The file is data,
 * so it is checked here as code would be; the Gold Set among them measures
 * the vocabulary and the classifier in the morning report.
 */

const CHAINS = ["dirk", "jumbo", "vomar", "plus", "lidl", "hoogvliet", "dekamarkt", "aldi"];

test("every Verdict names a Chain, an Ingredient the vocabulary has, and a day, once each", () => {
  const ids = new Set(VOCABULARY.map((d) => d.id));
  const seen = new Set<string>();
  for (const v of VERDICTS) {
    const what = `${v.chain} ${v.ref} ${v.name}`;
    assert.ok(CHAINS.includes(v.chain), `${what}: no Chain ${v.chain}`);
    assert.ok(v.is === null || ids.has(v.is), `${what}: no Ingredient ${v.is}`);
    assert.ok(["sample", "opinion", "report"].includes(v.from), what);
    assert.match(v.on, /^\d{4}-\d{2}-\d{2}$/, what);
    assert.ok(!seen.has(v.chain + " " + v.ref), `${what}: twice`);
    seen.add(v.chain + " " + v.ref);
  }
  assert.equal(readFileSync(VERDICTS_FILE, "utf8"), verdictsJson(VERDICTS), "the file is kept sorted, one a line");
});

test("the file keeps Verdicts by Chain and ref, one a line", () => {
  const v = (chain: string, ref: string): Verdict => ({ chain, ref, name: "x", is: null, from: "sample", on: "2026-10-16" });
  const lines = verdictsJson([v("plus", "2"), v("dirk", "9"), v("plus", "1")]).split("\n");
  assert.deepEqual(lines.slice(1, 4).map((l) => { const x = JSON.parse(l.replace(/,$/, "")) as Verdict; return x.chain + " " + x.ref; }), ["dirk 9", "plus 1", "plus 2"]);
  assert.equal(verdictsJson([]), "[]\n");
});

const jam = (ingredient: string | null, name: string, i: number, checked = false): LabelledProduct =>
  ({ chainId: "plus", ref: name + i, name, brand: null, categories: ["Ontbijt > Broodbeleg > Jam"], unit: "kg", ingredient, checked });
const products: LabelledProduct[] = [
  ...["aardbeienjam", "kersenjam", "abrikozenjam", "frambozenjam", "bosvruchtenjam", "pruimenjam"].flatMap((n) => [1, 2, 3, 4, 5].map((i) => jam("jam", `Merk ${n}`, i))),
  jam("bloem", "Merk bramenjam", 0, true),
  jam(null, "Merk perzikjam", 0, true),
];

test("the classifier lists no Product with a Verdict, and still says what it makes of each", () => {
  const o = assessClassifier(products, 5);
  assert.deepEqual([o.disagree.length, o.suggest.length], [0, 0]);
  assert.equal(o.label("plus", "Merk perzikjam0"), "jam");
});

test("the morning report measures the vocabulary and the classifier on the Gold Set, and lists where the vocabulary was wrong", () => {
  const check = (name: string, is: string | null, unchecked: string | null, from: Check["from"] = "sample"): Check => ({ chainId: "plus", ref: name + "0", name, from, is, unchecked });
  const md = opinionsMarkdown({
    conflicts: [], shelves: [], classifier: assessClassifier(products, 5),
    checks: [check("Merk bramenjam", "jam", "bloem"), check("Merk perzikjam", "jam", "jam"), check("Merk kersenjam", "jam", null, "opinion")],
    stale: [{ verdict: { chain: "plus", ref: "9", name: "Oud", is: null, from: "report", on: "2026-10-16" }, nameNow: null }],
  }, () => "PLUS");
  assert.match(md, /### Checked by hand \(3, 2 drawn at random\)/);
  assert.match(md, /vocabulary alone is right on 1 of 2 \(50%\), the classifier on 2 of 2 \(100%\)\. Under 100/);
  assert.match(md, /- PLUS · Merk bramenjam: \*bloem\*, is \*\*jam\*\*\n- PLUS · Merk kersenjam: \*none\*, is \*\*jam\*\*/);
  assert.match(md, /- PLUS · Oud \(9\): gone/);
});
