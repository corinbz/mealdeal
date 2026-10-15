import { test } from "node:test";
import assert from "node:assert/strict";
import { createResolver, priceDrop, RECIPES, SPREAD_CHECK, USUAL_MIN_DAYS, words, type Resolver, type Words } from "../src/page.ts";

/**
 * src/page.ts types the page's own scripts for everything outside the
 * browser. The scripts are the truth: every function those types name must
 * be one they define, or a caller here would compile against something the
 * page does not have. Each list below must name every member of its type,
 * or this file does not compile.
 */

const RESOLVER: Record<keyof Resolver, true> = {
  products: true, vocabulary: true, nextStarts: true, parse: true, suggest: true, label: true, variantsOf: true, joinVariants: true,
  kindsSold: true, candidates: true, satisfies: true, packsFor: true, unitPrice: true, correctionKey: true, dailyPrices: true,
  priceDropAt: true, exactIdOf: true, exactProduct: true, likelyProduct: true, exactMatches: true, spreads: true, isOnOffer: true,
  offerFor: true, packCents: true, verdict: true, correctedProduct: true, line: true, compare: true, priceRecipe: true, usedCents: true,
};
const WORDS: Record<keyof Words, true> = { stem: true, wordsOf: true, nameWords: true, matches: true, parse: true };

test("every member the types name is one the page's scripts define", () => {
  const R = createResolver({ chains: [], columns: ["ref"], vocabulary: [], catalogue: {} });
  for (const name of Object.keys(RESOLVER)) assert.ok(name in R, `resolve.js returns no ${name}`);
  for (const name of Object.keys(WORDS)) assert.equal(typeof words[name as keyof Words], "function", `words.js defines no ${name}`);
  assert.equal(typeof priceDrop, "function");
  assert.ok(USUAL_MIN_DAYS > 0 && SPREAD_CHECK > 0);
  assert.ok(RECIPES.length > 0);
});
