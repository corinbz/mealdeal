import type { Chain, RunContext } from "./types.ts";
import { createRecorder } from "./types.ts";

/**
 * Hoogvliet.
 *
 * Verified live on 2026-10-14, answering our honest agent string (#29).
 * hoogvliet.com now redirects to hoogvliet.nl, a Next.js storefront over
 * Magento. Its pages ask Magento's GraphQL, proxied at `/api/graphql`, for
 * Products by sku; the category listings themselves come from a search
 * service (Tweakwise) rendered into each page. So the Sweep takes every sku
 * from the catalogue sitemap and asks GraphQL for them, a hundred at a time:
 *
 *   GET  /sitemap-catalog.xml   every category and product page; a product
 *                               page's URL ends in its nine-digit sku
 *   POST /api/graphql           GetProducts, filtered by `sku: { in: [...] }`
 *
 * About 95 requests a day. robots.txt disallows only `/INTERSHOP/` (the old
 * storefront), `/search` and sorted listings; neither path used here is one.
 *
 * Two kinds of row come back. A SimpleProduct is a Product: name, price, its
 * Offer if one runs now, and per-Product facts in `metafield`s (EAN, brand,
 * pack, Hoogvliet's own Unit Price, online only). A GroupedProduct is a tile
 * in the weekly folder (sku 202642031 is week 42 of 2026, tile 31): an Offer
 * with its wording, price and dates, published weeks ahead. A Product on
 * Offer names its tile in `promotion_id`; the tile lists no Products.
 *
 * The selection asks for single metafields by key rather than `metadata`,
 * the blob holding all of them, which also carries ingredients, nutrients and
 * supplier text that the archive has no use for (ADR-0003). Prices are
 * national: no request names a Store. See docs/archive.md.
 */

const ENDPOINT = "https://hoogvliet.nl/api/graphql";

const HEADERS = {
  "user-agent": "mealdeal-archiver/0.1 (+https://github.com/corinbz/mealdeal)",
};

const SITEMAP_PATH = "/sitemap-catalog.xml";

/** Hoogvliet's own pages ask for 20; a hundred answers in a quarter second. */
export const BATCH = 100;

/** The per-Product facts read; every other metafield is left unasked. */
export const METAFIELDS = [
  "ean", "merk", "catplan", "eenheid", "inhoud_ce", "verpakking",
  "volume_eenheid", "prijs_per_volume_eenheid", "webshop",
  "productkenmerken_online_only", "productkenmerken_biologisch", "productkenmerken_diepvries",
] as const;

export const PRODUCTS_QUERY = `query GetProducts($pageSize: Int!, $currentPage: Int!, $filters: ProductAttributeFilterInput!) {
  products(pageSize: $pageSize, currentPage: $currentPage, filter: $filters) {
    items {
      __typename sku name stock_status url_key is_promotion catch_weight_item_code
      categories { name level url_path }
      promotion_meta_data { korting_label raw_discount_label { text price full_label } valid_from valid_to promotion_id prijs promotie_prijs }
      price_range { minimum_price { regular_price { value } final_price { value } discount { percent_off } } }
      ${METAFIELDS.map((k) => `${k}: metafield(key: "${k}") { value }`).join("\n      ")}
    }
  }
}`;

/** Every sku in the catalogue sitemap: the nine digits a product page's URL ends in. */
export function skusOf(sitemap: string): string[] {
  const skus = new Set<string>();
  for (const m of sitemap.matchAll(/<loc>https:\/\/hoogvliet\.nl\/[^/<]+-(\d{9})<\/loc>/g)) skus.add(m[1]!);
  return [...skus].sort();
}

export const hoogvliet: Chain = {
  name: "hoogvliet",
  endpoint: ENDPOINT,
  headers: HEADERS,

  async run({ client, sink, maxProductSteps, log }: RunContext) {
    // Step 1: the sitemap, fetched every run, since it is the list of skus.
    const mapStep = "sitemap";
    const map = createRecorder(client);
    await map.get(mapStep, SITEMAP_PATH);
    const skus = skusOf(map.records[0]?.body ?? "");
    await sink.writeStep(mapStep, map.records);
    if (!skus.length) {
      // A sitemap with no product pages would otherwise archive nothing, green.
      await sink.noteFailure(mapStep, "no product pages in the catalogue sitemap");
      throw new Error("Cannot traverse Hoogvliet: no product pages in the catalogue sitemap");
    }
    log(`  ${mapStep}: ${skus.length} skus`);

    // Step 2: the skus, a hundred to a request.
    const batches: string[][] = [];
    for (let i = 0; i < skus.length; i += BATCH) batches.push(skus.slice(i, i + BATCH));
    const selected = maxProductSteps === undefined ? batches : batches.slice(0, maxProductSteps);
    log(`  asking for ${selected.length} of ${batches.length} batches`);

    for (const [n, batch] of selected.entries()) {
      // Named by the first sku, so a resumed run on a changed sitemap asks
      // again for what moved rather than trusting a batch number.
      const step = `products/from-${batch[0]}`;
      if (sink.done(step)) {
        log(`  ${step}: skipped (already archived)`);
        continue;
      }
      const recorder = createRecorder(client);
      const result = (await recorder.request(step, PRODUCTS_QUERY, {
        filters: { sku: { in: batch } }, pageSize: BATCH, currentPage: 1,
      })) as { data?: { products?: { items?: unknown } | null } } | null;
      const report = await sink.writeStep(step, recorder.records);
      const failure = recorder.errors[0] ?? (Array.isArray(result?.data?.products?.items) ? null : "response has no items list");
      if (failure) {
        await sink.noteFailure(step, failure);
        log(`  ${step}: FAILED -- ${failure}`);
      } else {
        log(`  ${step} (${n + 1}/${selected.length}): ${report.storedBytes} B stored`);
      }
    }
  },
};
