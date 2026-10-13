/**
 * Emits the JSON the UI prototype runs on.
 *
 *   node scripts/build-ui-fixture.ts > prototype/fixture.json
 *
 * Dirk is real, read from the archive. Jumbo is simulated and every field
 * says so, because Jumbo's endpoint is not currently archivable and a
 * comparison needs two sides. The UI labels the simulated column; invented
 * prices that look real are the one outcome worth engineering against.
 */

import {
  readDirkProducts,
  readDirkOffers,
  packSizeFor,
  unitPriceCents,
  type ComparisonUnit,
} from "./ui-fixture.ts";

const ARCHIVE = process.env.ARCHIVE_ROOT ?? "archive";
const DATE = process.env.ARCHIVE_DATE ?? "2026-10-13";
const STORE_ID = 66;

/**
 * The Basket. Each Item is a requirement — a quantity of a thing — and NOT a
 * Product (ADR-0001). Each Chain resolves it against its own assortment
 * independently, which is the only approach that survives own-brand goods
 * having no shared identifier across Chains.
 *
 * `match` is deliberately the crude substring rule every incumbent falls back
 * on. It is left crude on purpose: "appel" also matches "aardappel", so the
 * apples row resolves to potato purée. That misfire is the honest reason
 * Corrections exist in the domain model, and a prototype that hid it would be
 * selling a resolution quality nobody has.
 */
const REQUIREMENTS: {
  id: string;
  /** What the shopper wrote, e.g. "500 g rundergehakt". */
  text: string;
  /** The thing itself, without the quantity. Stored rather than derived: a
   *  regex that strips "<number> <word>" turns "2 courgettes" into nothing. */
  noun: string;
  quantity: number;
  unit: ComparisonUnit;
  match: string;
  /**
   * A realistic market Unit Price in cents, used only to anchor the simulated
   * Chain. It must NOT be derived from the real Chain's resolved Product:
   * several of those resolutions misfire onto something cheap and unrelated,
   * and anchoring to them made the simulated Chain absurdly cheap across the
   * board. Anchoring to a sane figure keeps the comparison plausible in both
   * directions, which is the whole point of having two columns.
   */
  anchorUnitCents: number;
}[] = [
  { id: "aardappelen", text: "1 kg kruimige aardappelen", noun: "kruimige aardappelen", quantity: 1, unit: "kg", match: "aardappelen kruimig", anchorUnitCents: 130 },
  { id: "champignons", text: "250 g champignons", noun: "champignons", quantity: 0.25, unit: "kg", match: "champignons", anchorUnitCents: 520 },
  { id: "appels", text: "1 kg appels", noun: "appels", quantity: 1, unit: "kg", match: "appel", anchorUnitCents: 250 },
  { id: "courgette", text: "2 courgettes", noun: "courgettes", quantity: 2, unit: "piece", match: "courgette", anchorUnitCents: 92 },
  { id: "gehakt", text: "500 g rundergehakt", noun: "rundergehakt", quantity: 0.5, unit: "kg", match: "rundergehakt", anchorUnitCents: 920 },
  { id: "broccoli", text: "400 g broccoli", noun: "broccoli", quantity: 0.4, unit: "kg", match: "broccoli", anchorUnitCents: 310 },
  { id: "wortelen", text: "500 g wortelen", noun: "wortelen", quantity: 0.5, unit: "kg", match: "wortel", anchorUnitCents: 145 },
  { id: "komkommer", text: "1 komkommer", noun: "komkommer", quantity: 1, unit: "piece", match: "komkommer", anchorUnitCents: 105 },
  { id: "zalm", text: "300 g zalmfilet", noun: "zalmfilet", quantity: 0.3, unit: "kg", match: "zalmfilet", anchorUnitCents: 2450 },
  { id: "uien", text: "1 kg uien", noun: "uien", quantity: 1, unit: "kg", match: "uien", anchorUnitCents: 125 },
  { id: "tomaten", text: "500 g snoeptomaatjes", noun: "snoeptomaatjes", quantity: 0.5, unit: "kg", match: "tomaat", anchorUnitCents: 620 },
  { id: "spinazie", text: "400 g spinazie", noun: "spinazie", quantity: 0.4, unit: "kg", match: "spinazie", anchorUnitCents: 480 },
];

interface UiProduct {
  id: string;
  name: string;
  brand: string | null;
  packaging: string | null;
  packQuantity: number;
  comparisonUnit: ComparisonUnit;
  shelfPriceCents: number;
  offerPriceCents: number | null;
  unitPriceCents: number;
  simulated: boolean;
}

/** Deterministic, so the fixture is stable between builds. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const dirkRaw = await readDirkProducts(ARCHIVE, DATE);
const dirkOffers = await readDirkOffers(ARCHIVE, DATE);

// Index the real offers by Product, so a Resolution can show the Chain's own
// advertised wording rather than anything we derived (ADR-0002).
const offerByProduct = new Map<number, (typeof dirkOffers)[number]>();
for (const offer of dirkOffers) {
  for (const id of offer.productIds) {
    if (!offerByProduct.has(id)) offerByProduct.set(id, offer);
  }
}

const dirkProducts: UiProduct[] = [];
for (const raw of dirkRaw) {
  const pack = packSizeFor(raw);
  if (!pack) continue; // No derivable Unit Price: not a comparison candidate.
  const effective = raw.offerPriceCents ?? raw.shelfPriceCents;
  const unit = unitPriceCents(effective, pack);
  if (unit === null) continue;
  dirkProducts.push({
    id: `dirk-${raw.productId}`,
    name: raw.name,
    brand: raw.brand,
    packaging: raw.packaging,
    packQuantity: pack.quantity,
    comparisonUnit: pack.unit,
    shelfPriceCents: raw.shelfPriceCents,
    offerPriceCents: raw.offerPriceCents,
    unitPriceCents: unit,
    simulated: false,
  });
}

/** Lowest Unit Price wins, among Products sharing the requirement's unit. */
function resolve(
  candidates: UiProduct[],
  requirement: (typeof REQUIREMENTS)[number],
): { chosenId: string; candidateIds: string[] } | null {
  const viable = candidates
    .filter((p) => p.comparisonUnit === requirement.unit)
    .sort((a, b) => a.unitPriceCents - b.unitPriceCents);
  if (!viable.length) return null;
  return {
    chosenId: viable[0]!.id,
    candidateIds: viable.slice(0, 8).map((p) => p.id),
  };
}

// ── Simulated Jumbo ───────────────────────────────────────────────────────
// Prices are anchored to Dirk's resolved Unit Price and perturbed, so the
// comparison is plausible in both directions rather than one chain always
// winning. Two requirements are left unresolvable on purpose: Coverage below
// 100% is the normal case, and a UI that never shows it is lying.
const UNRESOLVABLE_AT_JUMBO = new Set(["tomaten", "zalm"]);
const JUMBO_PACKS: Record<string, { label: string; quantity: number }[]> = {
  kg: [
    { label: "500 g", quantity: 0.5 },
    { label: "1 kg", quantity: 1 },
    { label: "750 g", quantity: 0.75 },
  ],
  l: [{ label: "1 l", quantity: 1 }],
  piece: [
    { label: "per stuk", quantity: 1 },
    { label: "2 stuks", quantity: 2 },
  ],
};
const JUMBO_BRANDS = ["Jumbo", "Jumbo Huismerk", "Jumbo Biologisch", null];

const random = seeded(20261013);
const jumboProducts: UiProduct[] = [];
const jumboResolutions: Record<string, { chosenId: string; candidateIds: string[] } | null> = {};

for (const requirement of REQUIREMENTS) {
  if (UNRESOLVABLE_AT_JUMBO.has(requirement.id)) {
    jumboResolutions[requirement.id] = null;
    continue;
  }
  const made: UiProduct[] = [];
  const count = 2 + Math.floor(random() * 3);
  const noun = requirement.noun;
  for (let i = 0; i < count; i++) {
    const packs = JUMBO_PACKS[requirement.unit]!;
    const pack = packs[i % packs.length]!;
    const brand = JUMBO_BRANDS[Math.floor(random() * JUMBO_BRANDS.length)]!;
    // 0.78x to 1.26x of Dirk's unit price.
    const factor = 0.78 + random() * 0.48;
    const unit = Math.round(requirement.anchorUnitCents * factor);
    const shelf = Math.max(25, Math.round(unit * pack.quantity));
    // Roughly one in five carries an Offer.
    const onOffer = random() < 0.2;
    const offer = onOffer ? Math.round(shelf * 0.75) : null;
    const title = `${brand ? `${brand} ` : ""}${noun.charAt(0).toUpperCase()}${noun.slice(1)} ${pack.label}`;
    made.push({
      id: `jumbo-${requirement.id}-${i}`,
      name: title,
      brand,
      packaging: pack.label,
      packQuantity: pack.quantity,
      comparisonUnit: requirement.unit,
      shelfPriceCents: shelf,
      offerPriceCents: offer,
      unitPriceCents: unitPriceCents(offer ?? shelf, {
        quantity: pack.quantity,
        unit: requirement.unit,
      })!,
      simulated: true,
    });
  }
  jumboProducts.push(...made);
  jumboResolutions[requirement.id] = resolve(made, requirement);
}

// ── Dirk resolutions, over the real catalogue ─────────────────────────────
const dirkResolutions: Record<string, { chosenId: string; candidateIds: string[] } | null> = {};
for (const requirement of REQUIREMENTS) {
  const candidates = dirkProducts.filter((p) =>
    p.name.toLowerCase().includes(requirement.match),
  );
  dirkResolutions[requirement.id] = resolve(candidates, requirement);
}

const byId = (list: UiProduct[]) =>
  Object.fromEntries(list.map((p) => [p.id, p]));

const referenced = new Set<string>();
for (const table of [dirkResolutions, jumboResolutions]) {
  for (const entry of Object.values(table)) {
    if (entry) for (const id of entry.candidateIds) referenced.add(id);
  }
}

const fixture = {
  generatedAt: new Date().toISOString(),
  basket: {
    name: "Weekboodschappen",
    items: REQUIREMENTS.map(({ id, text, noun, quantity, unit }) => ({
      id,
      text,
      noun,
      quantity,
      unit,
    })),
  },
  chains: [
    {
      id: "dirk",
      name: "Dirk",
      kind: "Regional Chain",
      provenance: "archived",
      store: `Store ${STORE_ID}`,
      observedAt: DATE,
      catalogueSize: dirkProducts.length,
    },
    {
      id: "jumbo",
      name: "Jumbo",
      kind: "National Chain",
      provenance: "simulated",
      store: null,
      observedAt: null,
      catalogueSize: jumboProducts.length,
    },
  ],
  products: {
    dirk: byId(dirkProducts.filter((p) => referenced.has(p.id))),
    jumbo: byId(jumboProducts),
  },
  resolutions: { dirk: dirkResolutions, jumbo: jumboResolutions },
  offers: {
    dirk: Object.fromEntries(
      dirkProducts
        .filter((p) => referenced.has(p.id) && p.offerPriceCents !== null)
        .map((p) => {
          const numeric = Number(p.id.replace("dirk-", ""));
          const offer = offerByProduct.get(numeric);
          return [
            p.id,
            {
              wording: offer?.wording ?? null,
              headline: offer?.headline ?? null,
              endDate: offer?.endDate ?? null,
              upcoming: offer?.upcoming ?? false,
              simulated: false,
            },
          ];
        }),
    ),
    jumbo: Object.fromEntries(
      jumboProducts
        .filter((p) => p.offerPriceCents !== null)
        .map((p, i) => [
          p.id,
          {
            // Verbatim-style Dutch Offer wording. Nothing is derived from it
            // (ADR-0002): the UI shows the words, never a computed percentage.
            wording: ["1+1 gratis", "2e halve prijs", "25% korting", "3 voor 5,00"][i % 4]!,
            headline: null,
            endDate: null,
            upcoming: i % 5 === 0,
            simulated: true,
          },
        ]),
    ),
  },
};

process.stdout.write(`${JSON.stringify(fixture, null, 2)}\n`);
