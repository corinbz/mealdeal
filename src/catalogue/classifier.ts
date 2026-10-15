/**
 * A third opinion on which Ingredient a Product is: a naive Bayes classifier
 * learnt from the Products the vocabulary already maps, run on this machine,
 * with no service and nothing to pay.
 *
 * It learns from what a Product's name and shelf have in common with others
 * of each Ingredient: the words of its name and brand, the endings of those
 * words (Dutch puts the thing last: "aardbeienjam" ends in "jam"), the words
 * of its Chain's shelf, and its unit. Unmapped Products are learnt too, as
 * "none", since most rightly map to nothing.
 *
 * It never maps anything. Each Product is judged by a model trained on the
 * others only (k folds), so its own mapping cannot vouch for itself, and
 * where the model is sure and the vocabulary says otherwise, that is
 * reported: a mapped Product it places elsewhere, and an unmapped one it
 * places somewhere. Learnt from the vocabulary's own mappings, it repeats
 * the vocabulary's habits; what it adds is noticing a Product unlike the
 * rest of its Ingredient, and like another one.
 */

import { words as reading } from "../words.ts";

export interface LabelledProduct {
  readonly chainId: string;
  readonly ref: string;
  readonly name: string;
  readonly brand: string | null;
  readonly categories: readonly string[];
  readonly unit: string;
  /** The Ingredient the vocabulary maps it to, or null. */
  readonly ingredient: string | null;
}

export interface Prediction {
  readonly product: LabelledProduct;
  /** The Ingredient it is most likely, or null for none. */
  readonly label: string | null;
  /**
   * How far that label is ahead of what the vocabulary says (the Ingredient
   * it maps to, or none), in natural log: 3 is twenty times likelier. Naive
   * Bayes is sure of nearly everything, so only this difference ranks.
   */
  readonly margin: number;
}

const NONE = "";
const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const PACK = /^\d+([.,]\d+)?(g|gr|gram|kg|ml|cl|l|ltr|liter|x|st|stk|stuks?|pack|pak)?$/;

/** What the model sees of a Product. */
export function features(p: Pick<LabelledProduct, "name" | "brand" | "categories" | "unit">): string[] {
  const out = new Set<string>();
  const words = fold((p.brand ?? "") + " " + p.name).replace(/['’]/g, "").split(/[^\p{L}0-9%+]+/u).filter((w) => w && !PACK.test(w));
  for (const raw of words) {
    const w = reading.nameWords(raw).join("") || raw;
    out.add("w:" + w);
    // The end of a word names the thing; its start, often, what it is made of.
    for (let n = 3; n <= 6 && n < w.length; n++) out.add("e:" + w.slice(-n));
    if (w.length > 5) out.add("b:" + w.slice(0, 4));
  }
  const shelf = p.categories[0] ?? "";
  const parts = shelf.split(/\s*>\s*/).filter(Boolean);
  for (const part of parts) for (const w of fold(part).split(/[^\p{L}0-9]+/u)) if (w.length > 2) out.add("s:" + w);
  if (parts.length) out.add("leaf:" + fold(parts[parts.length - 1]!));
  out.add("u:" + p.unit);
  return [...out];
}

/** Multinomial naive Bayes over feature sets, with add-alpha smoothing. */
export class NaiveBayes {
  private readonly classCount = new Map<string, number>();
  private readonly featureTotal = new Map<string, number>();
  /** Feature to the classes it was seen with, and how often. */
  private readonly counts = new Map<string, Map<string, number>>();
  private readonly vocabulary = new Set<string>();
  private examples = 0;

  private readonly alpha: number;

  constructor(alpha = 0.1) {
    this.alpha = alpha;
  }

  learn(fs: readonly string[], label: string): void {
    this.examples++;
    this.classCount.set(label, (this.classCount.get(label) ?? 0) + 1);
    this.featureTotal.set(label, (this.featureTotal.get(label) ?? 0) + fs.length);
    for (const f of fs) {
      this.vocabulary.add(f);
      const m = this.counts.get(f) ?? this.counts.set(f, new Map()).get(f)!;
      m.set(label, (m.get(label) ?? 0) + 1);
    }
  }

  /** Each class's log likelihood, highest first: compare them by difference, not by size. */
  scores(fs: readonly string[]): { label: string; log: number }[] {
    const a = this.alpha, v = this.vocabulary.size;
    const known = fs.filter((f) => this.counts.has(f));
    // A class's log likelihood: every known feature at the smoothed floor,
    // then raised for the features the class was seen with.
    const log = new Map<string, number>();
    for (const [c, n] of this.classCount) {
      log.set(c, Math.log(n / this.examples) + known.length * Math.log(a / (this.featureTotal.get(c)! + a * v)));
    }
    for (const f of known) for (const [c, n] of this.counts.get(f)!) log.set(c, log.get(c)! + Math.log((n + a) / a));
    return [...log].map(([label, l]) => ({ label, log: l })).sort((x, y) => y.log - x.log);
  }
}

/** A stable fold for a Product, so a run is the same each time. */
function foldOf(p: LabelledProduct, k: number): number {
  let h = 2166136261;
  for (const ch of p.chainId + "\u0000" + p.ref) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0) % k;
}

/** Every Product's prediction by a model that never saw it. */
export function outOfFold(products: readonly LabelledProduct[], k = 5): Prediction[] {
  const fs = products.map(features);
  const folds = products.map((p) => foldOf(p, k));
  const out: Prediction[] = new Array(products.length);
  for (let f = 0; f < k; f++) {
    const model = new NaiveBayes();
    products.forEach((p, i) => { if (folds[i] !== f) model.learn(fs[i]!, p.ingredient ?? NONE); });
    products.forEach((p, i) => {
      if (folds[i] !== f) return;
      const scores = model.scores(fs[i]!);
      const best = scores[0]!;
      const said = scores.find((s) => s.label === (p.ingredient ?? NONE));
      out[i] = { product: p, label: best.label === NONE ? null : best.label, margin: said ? best.log - said.log : Infinity };
    });
  }
  return out;
}

export interface ClassifierOpinion {
  /** Share of mapped Products it places where the vocabulary does: how far to trust it. */
  readonly agreement: number;
  /** Mapped to one Ingredient, and the model is sure of another. */
  readonly disagree: readonly Prediction[];
  /** Unmapped, and the model is sure of an Ingredient. */
  readonly suggest: readonly Prediction[];
}

/**
 * How far ahead the model's label must be to be reported. On the catalogue
 * of 2026-10-14 the differences above 20 were nearly all the vocabulary's
 * mistakes ("Zonnebloem olijfolie" as bloem) or its misses (coffee capsules,
 * burrata); below it, more and more the model's own (tilapia as zalm).
 */
export const MIN_MARGIN = 20;

export function assessClassifier(products: readonly LabelledProduct[], minMargin = MIN_MARGIN): ClassifierOpinion {
  const predictions = outOfFold(products);
  const mapped = predictions.filter((x) => x.product.ingredient !== null);
  const agreement = mapped.length ? mapped.filter((x) => x.label === x.product.ingredient).length / mapped.length : 1;
  const byMargin = (a: Prediction, b: Prediction) => b.margin - a.margin || a.product.name.localeCompare(b.product.name);
  return {
    agreement,
    // A mapped Product it places nowhere is mostly a rare one, not a wrong one: only another Ingredient counts.
    disagree: mapped.filter((x) => x.label !== null && x.label !== x.product.ingredient && x.margin >= minMargin).sort(byMargin),
    suggest: predictions.filter((x) => x.product.ingredient === null && x.label !== null && x.margin >= minMargin).sort(byMargin),
  };
}
