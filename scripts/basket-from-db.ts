/**
 * Resolves a Basket against every Chain in the database and emits the fixture
 * the prototype page runs on.
 *
 *   node scripts/basket-from-db.ts > prototype/fixture.json
 *
 * This replaces the earlier generator, which read the archive directly and
 * simulated Jumbo because no real Jumbo data existed. Both Chains are now
 * genuinely ingested, so nothing here is invented: every price, name, Pack
 * Size and Offer wording came from a Sweep.
 *
 * Resolution is deliberately the crude substring rule every incumbent falls
 * back on, and it is left crude. Across 18,067 real Products it misfires in
 * ways worth seeing — that is the honest reason Corrections exist (ADR-0004),
 * and a prototype that hid it would be selling a resolution quality nobody
 * has.
 */

import { connect } from "../src/ingest/db.ts";
import type { ComparisonUnit } from "../src/ingest/normalise.ts";

interface Requirement {
  readonly id: string;
  readonly text: string;
  readonly noun: string;
  readonly quantity: number;
  readonly unit: ComparisonUnit;
  /** The words we match on. Crude on purpose. */
  readonly match: string;
}

const BASKET: Requirement[] = [
  { id: "aardappelen", text: "1 kg kruimige aardappelen", noun: "kruimige aardappelen", quantity: 1, unit: "kg", match: "aardappelen kruimig" },
  { id: "champignons", text: "250 g champignons", noun: "champignons", quantity: 0.25, unit: "kg", match: "champignons" },
  { id: "appels", text: "1 kg appels", noun: "appels", quantity: 1, unit: "kg", match: "appel" },
  { id: "courgette", text: "2 courgettes", noun: "courgettes", quantity: 2, unit: "piece", match: "courgette" },
  { id: "gehakt", text: "500 g rundergehakt", noun: "rundergehakt", quantity: 0.5, unit: "kg", match: "rundergehakt" },
  { id: "broccoli", text: "400 g broccoli", noun: "broccoli", quantity: 0.4, unit: "kg", match: "broccoli" },
  { id: "wortelen", text: "500 g wortelen", noun: "wortelen", quantity: 0.5, unit: "kg", match: "wortel" },
  { id: "komkommer", text: "1 komkommer", noun: "komkommer", quantity: 1, unit: "piece", match: "komkommer" },
  { id: "melk", text: "1 l halfvolle melk", noun: "halfvolle melk", quantity: 1, unit: "l", match: "halfvolle melk" },
  { id: "uien", text: "1 kg uien", noun: "uien", quantity: 1, unit: "kg", match: "uien" },
  { id: "pindakaas", text: "350 g pindakaas", noun: "pindakaas", quantity: 0.35, unit: "kg", match: "pindakaas" },
  { id: "spinazie", text: "400 g spinazie", noun: "spinazie", quantity: 0.4, unit: "kg", match: "spinazie" },
];

interface Candidate {
  id: string;
  name: string;
  brand: string | null;
  packaging: string | null;
  packQuantity: number | null;
  comparisonUnit: ComparisonUnit;
  shelfPriceCents: number;
  offerPriceCents: number | null;
  unitPriceCents: number;
  unitPriceSource: "chain" | "derived";
  offerWording: string | null;
  offerUpcoming: boolean;
}

const db = connect();

const { rows: chains } = await db.query<{ id: string; name: string; kind: string }>(
  `SELECT c.id, c.name, c.kind FROM chain c
    WHERE EXISTS (SELECT 1 FROM product p WHERE p.chain_id = c.id)
    ORDER BY c.name`,
);

/**
 * The latest Observation per Product, joined to any Offer naming it.
 *
 * Only Products sharing the requirement's Comparison Unit are eligible, and
 * only those carrying a Unit Price at all — a Product without one is not a
 * comparison candidate, which is exactly why that count is reported per run.
 */
async function candidatesFor(chainId: string, requirement: Requirement) {
  const { rows } = await db.query<{
    chain_product_ref: string; name: string; brand: string | null;
    pack_text: string | null; pack_quantity: string | null; comparison_unit: ComparisonUnit;
    shelf_price_cents: number; offer_price_cents: number | null; unit_price_cents: number;
    unit_price_source: "chain" | "derived"; wording: string | null; is_upcoming: boolean | null;
  }>(
    `WITH latest AS (
       SELECT DISTINCT ON (o.chain_product_ref) o.*
         FROM price_observation o
        WHERE o.chain_id = $1
          AND o.comparison_unit = $2
          AND o.unit_price_cents IS NOT NULL
        ORDER BY o.chain_product_ref, o.observed_at DESC
     )
     SELECT p.chain_product_ref, p.name, p.brand, p.pack_text, p.pack_quantity,
            l.comparison_unit, l.shelf_price_cents, l.offer_price_cents,
            l.unit_price_cents, l.unit_price_source,
            off.wording, off.is_upcoming
       FROM latest l
       JOIN product p USING (chain_id, chain_product_ref)
       LEFT JOIN LATERAL (
         SELECT oo.wording, oo.is_upcoming
           FROM offer_product op
           JOIN offer_observation oo ON oo.id = op.offer_observation_id
          WHERE oo.chain_id = $1 AND op.chain_product_ref = p.chain_product_ref
          ORDER BY oo.is_upcoming, oo.id DESC
          LIMIT 1
       ) off ON true
      WHERE p.name ILIKE $3
      ORDER BY l.unit_price_cents
      LIMIT 10`,
    [chainId, requirement.unit, `%${requirement.match}%`],
  );

  return rows.map<Candidate>((r) => ({
    id: `${chainId}-${r.chain_product_ref}`,
    name: r.name,
    brand: r.brand,
    packaging: r.pack_text,
    packQuantity: r.pack_quantity === null ? null : Number(r.pack_quantity),
    comparisonUnit: r.comparison_unit,
    shelfPriceCents: r.shelf_price_cents,
    offerPriceCents: r.offer_price_cents,
    unitPriceCents: r.unit_price_cents,
    unitPriceSource: r.unit_price_source,
    offerWording: r.wording,
    offerUpcoming: r.is_upcoming === true,
  }));
}

const products: Record<string, Record<string, Candidate>> = {};
const resolutions: Record<string, Record<string, { chosenId: string; candidateIds: string[] } | null>> = {};
const offers: Record<string, Record<string, { wording: string | null; upcoming: boolean; simulated: false }>> = {};

for (const chain of chains) {
  products[chain.id] = {};
  resolutions[chain.id] = {};
  offers[chain.id] = {};

  for (const requirement of BASKET) {
    const candidates = await candidatesFor(chain.id, requirement);
    if (!candidates.length) {
      resolutions[chain.id]![requirement.id] = null;
      continue;
    }
    for (const candidate of candidates) {
      products[chain.id]![candidate.id] = candidate;
      if (candidate.offerPriceCents !== null || candidate.offerWording) {
        offers[chain.id]![candidate.id] = {
          wording: candidate.offerWording,
          upcoming: candidate.offerUpcoming,
          simulated: false,
        };
      }
    }
    // Lowest Unit Price wins, which is the default Resolution rule.
    resolutions[chain.id]![requirement.id] = {
      chosenId: candidates[0]!.id,
      candidateIds: candidates.map((c) => c.id),
    };
  }
}

const { rows: meta } = await db.query<{
  chain_id: string; archive_date: string; products_recorded: number;
}>(
  `SELECT DISTINCT ON (chain_id) chain_id, archive_date, products_recorded
     FROM ingest_run WHERE outcome = 'complete'
    ORDER BY chain_id, id DESC`,
);
const byChain = Object.fromEntries(meta.map((m) => [m.chain_id, m]));

const fixture = {
  generatedAt: new Date().toISOString(),
  basket: {
    name: "Weekboodschappen",
    items: BASKET.map(({ id, text, noun, quantity, unit }) => ({ id, text, noun, quantity, unit })),
  },
  chains: chains.map((c) => ({
    id: c.id,
    name: c.name,
    kind: c.kind,
    // Nothing is simulated any more. Both Chains were swept and ingested.
    provenance: "archived" as const,
    store: c.id === "dirk" ? "Store 66" : null,
    observedAt: byChain[c.id]?.archive_date
      ? new Date(byChain[c.id]!.archive_date).toISOString().slice(0, 10)
      : null,
    catalogueSize: Number(byChain[c.id]?.products_recorded ?? 0),
  })),
  products,
  resolutions,
  offers,
};

process.stdout.write(`${JSON.stringify(fixture, null, 2)}\n`);
await db.end();
