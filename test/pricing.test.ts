import { test } from "node:test";
import assert from "node:assert/strict";
import { createResolver, type Item, type Pricing, type Requirement, type ResolvedProduct } from "../src/page.ts";
import { must } from "./helpers/page.ts";
import { COLUMNS as BUILT, HISTORY_COLUMNS, toRow } from "../src/catalogue/format.ts";

/**
 * Basket pricing (prototype/resolve.js): what a list, a Recipe or one item
 * costs at each Chain, as the basket page shows it and the digest reads it.
 * Whole packs, priced Offers paid, Corrections honoured, next week's Offers
 * unpriced until they run (#8), and a real low judged per Product (#18).
 */


const COLUMNS = [...BUILT, ...HISTORY_COLUMNS];

interface P {
  ref: string; name: string; shelf: number; pack: number; ingredient: string; offer?: number | null; wording?: string | null;
  endsOn?: string | null; next?: string | null; nextOn?: string | null; low?: number | null; days?: number | null;
}
/** A row as scripts/catalogue-from-db.ts writes one, priced per unit at what is paid today. */
function row(p: P): unknown[] {
  const paid = p.offer ?? p.shelf;
  return toRow({
    ref: p.ref, name: p.name, comparisonUnit: "kg", shelfPriceCents: p.shelf, offerPriceCents: p.offer ?? null,
    unitPriceCents: Math.round(paid / p.pack), offerWording: p.wording ?? null, offerEndsOn: p.endsOn ?? null,
    nextWording: p.next ?? null, nextStartsOn: p.nextOn ?? null, packQuantity: p.pack, packUnit: "kg", ingredient: p.ingredient,
    variant: null, form: "vers", flags: 0, ingredientUnitPriceCents: Math.round(paid / p.pack), ingredientPack: p.pack,
    referenceLowCents: p.low ?? null, referenceDays: p.days ?? null,
  }, COLUMNS);
}

const vocabulary = ["kaas", "gehakt", "uien", "saffraan"].map((id) => ({ id, name: id, unit: "kg", also: [], equals: {}, fresh: false, variants: [] }));
const data = {
  chains: [
    { id: "dirk", name: "Dirk" },
    { id: "jumbo", name: "Jumbo" },
    { id: "lidl", name: "Lidl", offersOnly: true },
  ],
  columns: COLUMNS,
  vocabulary,
  catalogue: {
    dirk: [
      // A kilo block is the cheapest per kilo; the 150 g pack the cheapest for 100 g.
      row({ ref: "k1", name: "Kaas blok 1 kg", shelf: 900, pack: 1, ingredient: "kaas" }),
      row({ ref: "k2", name: "Kaas plakken 150 g", shelf: 199, pack: 0.15, ingredient: "kaas" }),
      row({ ref: "g1", name: "Gehakt 500 g", shelf: 500, pack: 0.5, ingredient: "gehakt" }),
      row({ ref: "u1", name: "Uien 1 kg", shelf: 150, pack: 1, ingredient: "uien" }),
    ],
    jumbo: [
      row({ ref: "g1", name: "Jumbo Gehakt 500 g", shelf: 600, offer: 400, wording: "2 voor 8", endsOn: "2026-10-20", pack: 0.5, ingredient: "gehakt", low: 550, days: 30 }),
      row({ ref: "g2", name: "Jumbo Gehakt bio 500 g", shelf: 700, pack: 0.5, ingredient: "gehakt" }),
      row({ ref: "u1", name: "Jumbo Uien 1 kg", shelf: 120, pack: 1, ingredient: "uien", next: "1+1 gratis", nextOn: "2026-10-19" }),
      row({ ref: "k1", name: "Jumbo Kaas 500 g", shelf: 600, pack: 0.5, ingredient: "kaas" }),
    ],
    lidl: [
      row({ ref: "u1", name: "Lidl Uien 1 kg", shelf: 99, offer: 49, wording: "-50%", pack: 1, ingredient: "uien" }),
    ],
  },
};
const R = createResolver(data);
/** A value from the script's own realm, as plain data, so deepEqual compares structure only. */
const plain = (x: unknown) => JSON.parse(JSON.stringify(x));
const item = (text: string, id = text): Item => ({ id, ...must(R.parse(text)) });
const line = (chainId: string, it: Requirement, pricing?: Pricing) => must(R.line(chainId, it, pricing));
const at = (r: ReturnType<typeof R.priceRecipe>, chainId: string) => must(r.at.find((x) => x.chain.id === chainId));

test("the cheapest per kilo is chosen, even when a smaller pack would cost less for the quantity", () => {
  const kaas = item("100 g kaas");
  assert.equal(line("dirk", kaas).p.name, "Kaas blok 1 kg");
  assert.equal(line("dirk", kaas).cost, 900);
  // A Recipe resolves its Requirements the same way.
  assert.equal(must(at(R.priceRecipe([kaas]), "dirk").lines[0]).p.name, "Kaas blok 1 kg");
});

test("whole packs are bought, and an oversized pack says by how much", () => {
  const l = line("dirk", item("1200 g gehakt"));
  assert.equal(l.packs, 3);
  assert.equal(l.cost, 1500);
  assert.equal(line("dirk", item("100 g kaas")).over, 10);
  // Three packs of 500 g for 1200 g: 1.25 times what was asked for.
  assert.equal(l.over, 1.25);
});

test("a Correction wins over the Resolution, for the list and for Recipes", () => {
  const gehakt = item("500 g gehakt"), corrections = { [R.correctionKey("jumbo", gehakt)]: "jumbo-g2" };
  assert.equal(line("jumbo", gehakt).p.name, "Jumbo Gehakt 500 g");
  assert.equal(line("jumbo", gehakt, { corrections }).p.name, "Jumbo Gehakt bio 500 g");
  assert.equal(must(at(R.priceRecipe([gehakt], { corrections }), "jumbo").lines[0]).p.name, "Jumbo Gehakt bio 500 g");
  // A Correction to a Product no longer sold falls back to the Resolution.
  assert.equal(line("jumbo", gehakt, { corrections: { [R.correctionKey("jumbo", gehakt)]: "jumbo-gone" } }).p.name, "Jumbo Gehakt 500 g");
});

test("a priced Offer is paid, with the Shelf Price kept as what it would have been", () => {
  const l = line("jumbo", item("500 g gehakt"));
  assert.equal(l.cost, 400);
  assert.equal(l.was, 600);
  assert.equal(l.offer, "2 voor 8");
  assert.equal(l.onOffer, true);
});

test("next week, an announced Offer has no price yet, and a running one counts if it still runs then", () => {
  assert.equal(R.nextStarts.jumbo, "2026-10-19");
  const uien = line("jumbo", item("1 kg uien"), { week: "volgende" });
  assert.equal(uien.offer, "1+1 gratis");
  assert.equal(uien.o?.startsOn, "2026-10-19");
  assert.equal(uien.cost, 120); // the Shelf Price: "1+1 gratis" is not converted (ADR-0002)
  const gehakt = line("jumbo", item("500 g gehakt"), { week: "volgende" });
  assert.equal(gehakt.o?.continues, true);
  assert.equal(gehakt.cost, 400);
  // This week the announced one is not yet an Offer.
  assert.equal(line("jumbo", item("1 kg uien")).onOffer, false);
});

test("a real low is judged per Product against the recorded days before it", () => {
  const p = (over: Partial<ResolvedProduct>): ResolvedProduct => ({ ...must(R.products.jumbo?.["jumbo-g1"]), ...over });
  assert.deepEqual(plain(R.verdict(p({}))), { kind: "lowest", lowCents: 550, days: 30 });
  assert.equal(R.verdict(p({ offerPriceCents: 550 }))?.kind, "not-lower");
  assert.equal(R.verdict(p({ offerPriceCents: null, shelfPriceCents: 600 }))?.kind, "shelf-up");
  assert.equal(R.verdict(p({ offerPriceCents: null, shelfPriceCents: 550 }))?.kind, "shelf-same");
  assert.equal(R.verdict(p({ referenceLowCents: null })), null, "no history, no claim");
  assert.equal(R.verdict(must(R.products.dirk?.["dirk-g1"])), null, "no Offer, no claim");
});

test("a list compares as bags; an offers-only Chain is no bag, but it can be half of a two-shop plan", () => {
  const s = R.compare([item("500 g gehakt", "a"), item("1 kg uien", "b")]);
  assert.deepEqual(plain(s.totals.map((t: any) => [t.chain.id, t.cost, t.full])), [["dirk", 650, true], ["jumbo", 520, true]].sort((a, b) => (a[1] as number) - (b[1] as number)));
  assert.equal(s.best?.chain.id, "jumbo");
  assert.deepEqual(plain(must(s.rows[1]).avail.map((c: any) => c.id)), ["lidl", "jumbo", "dirk"]);
  // Gehakt at Jumbo, uien on Offer at Lidl: cheaper than all at Jumbo, and both shops used.
  const combo = must(s.combo);
  assert.deepEqual(plain(combo.ids), ["jumbo", "lidl"]);
  assert.equal(combo.cost, 449);
  assert.deepEqual(plain(combo.from), { a: "jumbo", b: "lidl" });
});

test("a two-shop plan that saves nothing over the best bag is not offered", () => {
  const s = R.compare([item("500 g gehakt", "a")]);
  assert.equal(s.combo, null);
});

test("an item a bag lacks makes it partial, its total a floor", () => {
  const s = R.compare([item("1 g saffraan", "a"), item("1 kg uien", "b")]);
  assert.equal(s.best, null);
  assert.ok(s.totals.every((t: any) => !t.full && t.filled === 1 && t.total === 2));
});

test("a Recipe is complete where one Chain sells every ingredient, and ranks the Chains missing least first", () => {
  const r = R.priceRecipe([item("500 g gehakt"), item("100 g kaas")]);
  assert.equal(r.complete, true);
  assert.deepEqual(plain(r.at.map((x: any) => [x.chain.id, x.cost, x.missing, x.deals, x.saving])), [["jumbo", 520, 0, 1, 200], ["dirk", 590, 0, 0, 0]]);
  // Dirk's kaas is its 1 kg block, the cheapest per kilo, though only 100 g is
  // needed: bought whole, shown as 10 times the need, and costed at a tenth.
  const kaas = must(must(r.at[1]).lines[1]);
  assert.equal(kaas.cost, 900);
  assert.equal(kaas.over, 10);
  assert.equal(R.usedCents(kaas), 90);
  assert.ok(!r.at.some((x: any) => x.chain.id === "lidl"), "an offers-only Chain prices no whole Recipe");
  const partial = R.priceRecipe([item("1 g saffraan")]);
  assert.equal(partial.complete, false);
});
