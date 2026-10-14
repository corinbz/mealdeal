import { test } from "node:test";
import assert from "node:assert/strict";
import { assessSelfChecks, selfChecksMarkdown, type KnownSlip } from "../src/catalogue/self-checks.ts";
import type { CoverageCatalogue } from "../src/catalogue/coverage.ts";
import { COLUMNS, toRow } from "../src/catalogue/format.ts";

/**
 * The morning self-checks (#37): overnight jumps, the same Product mapped two
 * ways, and unit prices that do not follow from the pack.
 */

type R = { ref: string; name?: string; q?: number; unit?: string; shelf?: number; offer?: number | null; per?: number; ingredient?: string | null; form?: string | null };
const row = ({ ref, name = "Jonge kaas 500 g", q = 0.5, unit = "kg", shelf = 500, offer = null, per, ingredient = "kaas", form = null }: R) =>
  toRow({ ref, name, packQuantity: q, packUnit: unit, comparisonUnit: unit as "kg", shelfPriceCents: shelf, offerPriceCents: offer,
    unitPriceCents: per ?? Math.round((offer ?? shelf) / q), offerWording: offer === null ? null : "actie", ingredient, form });

function catalogue(rows: Record<string, R[]>): CoverageCatalogue {
  return {
    chains: Object.keys(rows).map((id) => ({ id, name: id })),
    columns: COLUMNS,
    vocabulary: [],
    catalogue: Object.fromEntries(Object.entries(rows).map(([id, rs]) => [id, rs.map(row)])),
  };
}

test("a shelf price up or down 40% overnight is a jump, unless an Offer runs either day", () => {
  const before = catalogue({ dirk: [{ ref: "1" }, { ref: "2" }, { ref: "3" }, { ref: "4" }] });
  const now = catalogue({ dirk: [{ ref: "1", shelf: 700 }, { ref: "2", shelf: 350 }, { ref: "3", shelf: 690 }, { ref: "4", shelf: 900, offer: 450 }] });
  assert.deepEqual(assessSelfChecks(now, before, []).jumps.map((j) => [j.ref, j.was, j.now]), [["2", 500, 350], ["1", 500, 700]]);
  assert.deepEqual(assessSelfChecks(now, null, []).jumps, []);
});

test("the same Product at two Chains mapped differently is a split, mapped ones first", () => {
  const c = catalogue({
    dirk: [{ ref: "d1", name: "Hak Mais 390 g", q: 0.39, ingredient: "mais" }, { ref: "d2", name: "Bieze Rauwkost 250 g", q: 0.25, ingredient: "rauwkost" }],
    plus: [{ ref: "p1", name: "HAK  mais 390 g", q: 0.39, ingredient: "doperwten" }, { ref: "p2", name: "Bieze Rauwkost 250 g", q: 0.25, ingredient: null }],
    vomar: [{ ref: "v1", name: "Hak Mais 390 g", q: 0.5, ingredient: null }],
  });
  const s = assessSelfChecks(c, null, []);
  assert.deepEqual(s.splits.map((g) => g.members.map((m) => `${m.chain}:${m.ingredient}`)), [["dirk:mais", "plus:doperwten"], ["dirk:rauwkost", "plus:null"]]);
});

test("a unit price off the pack's is a slip; one in liquid at up to 3x is counted as drained", () => {
  const c = catalogue({
    jumbo: [
      { ref: "ok" },
      { ref: "tray", name: "Melk 1 L", q: 1, unit: "l", shelf: 1074, per: 179, ingredient: "melk" },
      { ref: "jar", name: "Doperwten 680 g", q: 0.68, shelf: 93, per: 204, ingredient: "doperwten", form: "conserven" },
      { ref: "olives", name: "Groene olijven 200 g", q: 0.2, shelf: 125, per: 1471, ingredient: "olijven" },
      // A tissue at 0.3 cents a piece shown as 0 is rounding, not a slip.
      { ref: "tissue", name: "Tissues 300 stuks", q: 300, unit: "piece", shelf: 89, per: 0, ingredient: null },
    ],
  });
  assert.deepEqual(assessSelfChecks(c, null, []).units.map((u) => [u.ref, u.kind]), [["jar", "drained"], ["olives", "drained"], ["tray", "other"]]);
});

test("a known slip is not reported, and is named once it no longer applies", () => {
  const known: KnownSlip[] = [{ check: "unit", chain: "jumbo", ref: "tray", why: "test" }, { check: "split", chain: "plus", ref: "p1", why: "test" }];
  const c = catalogue({
    jumbo: [{ ref: "tray", name: "Melk 1 L", q: 1, unit: "l", shelf: 1074, per: 179 }],
    dirk: [{ ref: "d1", name: "Mais", ingredient: "mais" }],
    plus: [{ ref: "p1", name: "Mais", ingredient: "doperwten" }],
  });
  const s = assessSelfChecks(c, null, known);
  assert.deepEqual([s.units, s.splits, s.stale], [[], [], []]);
  const fixed = catalogue({ jumbo: [{ ref: "tray", name: "Melk 6 x 1 L", q: 6, unit: "l", shelf: 1074, per: 179 }], plus: [{ ref: "p1", name: "Mais", ingredient: "mais" }] });
  assert.deepEqual(assessSelfChecks(fixed, null, known).stale, known);
});

test("the report lists mapped slips and only counts unmapped ones", () => {
  const c = catalogue({ jumbo: [
    { ref: "a", name: "Melk 1 L", q: 1, unit: "l", shelf: 1074, per: 179, ingredient: "melk" },
    { ref: "b", name: "Paperclips 175 stuks", q: 175, unit: "piece", shelf: 149, per: 149, ingredient: null },
  ] });
  const md = selfChecksMarkdown(assessSelfChecks(c, null, []), c);
  assert.match(md, /\*\*Melk 1 L\*\* at jumbo \(ref a, \*melk\*\)/);
  assert.match(md, /only counted: jumbo 1 unmapped/);
  assert.doesNotMatch(md, /Paperclips/);
});
