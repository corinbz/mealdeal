import type { Chain, RunContext } from "./types.ts";
import { createRecorder } from "./types.ts";

/**
 * Aldi.
 *
 * Verified live on 2026-10-14, answering our honest agent string (#31).
 * aldi.nl is Aldi Nord's Next.js storefront over Magnolia; its Products live
 * in an Algolia index, which the pages query from the browser with a public,
 * search-only key in their own scripts. Each category page embeds the hits
 * of such a query, filtered to that category, and so do the two Offer pages.
 * The Sweep asks the index itself, with no filter, a thousand hits a page:
 *
 *   POST /1/indexes/an_prd_nl_nl_products2/query   pages 0 to 3
 *
 * Four requests a day. Category pages would take 214 and miss 1,224 of the
 * 3,794 Products: action articles ("OP=OP") are filed under `offer` alone,
 * which no category page lists, and only this and next week's are on the
 * Offer pages. The records are the same ones the pages embed.
 *
 * Only the fields used are asked for (`attributesToRetrieve`): never
 * `assets`, Aldi-hosted images, nor `longDescription` (ADR-0003). A Product
 * carries its price now, Aldi's own Unit Price, and every Offer it is in
 * from last week to the next, with dates. Prices are national: nothing on the
 * site chooses a Store. No EAN is published. See docs/archive.md.
 */

const ENDPOINT = "https://2HU29PF6BH-dsn.algolia.net";

const HEADERS = {
  "user-agent": "mealdeal-archiver/0.1 (+https://github.com/corinbz/mealdeal)",
  // aldi.nl's public search-only key, from the site's own scripts.
  "x-algolia-application-id": "2HU29PF6BH",
  "x-algolia-api-key": "686cf0c8ddcf740223d420d1115c94c1",
};

const QUERY_PATH = "/1/indexes/an_prd_nl_nl_products2/query";

/** The largest page Algolia serves; aldi.nl's own category pages ask for it. */
export const PAGE_SIZE = 1000;
/** Stop paging after this many, as a runaway guard: four were needed in 2026. */
const MAX_PAGES = 20;

export const ATTRIBUTES = [
  "objectID", "name", "brandName", "salesUnit", "shortDescription", "isAvailable",
  "categoryIDs", "mainCategoryID", "hierarchicalCategories", "productReferences",
  "currentPrice", "promotionPrices",
] as const;

export function pageQuery(page: number) {
  return {
    query: "",
    page,
    hitsPerPage: PAGE_SIZE,
    attributesToRetrieve: [...ATTRIBUTES],
    attributesToHighlight: [],
  };
}

interface QueryPayload {
  hits?: unknown[];
  nbHits?: number;
  nbPages?: number;
}

export const aldi: Chain = {
  name: "aldi",
  endpoint: ENDPOINT,
  headers: HEADERS,

  async run({ client, sink, maxProductSteps, log }: RunContext) {
    const limit = maxProductSteps ?? MAX_PAGES;
    let seen = 0;
    let total: number | undefined;
    for (let page = 0; page < Math.min(limit, MAX_PAGES); page++) {
      const step = `products/page-${page}`;
      const recorder = createRecorder(client);
      const result = (await recorder.post(step, QUERY_PATH, pageQuery(page))) as QueryPayload | null;
      const report = await sink.writeStep(step, recorder.records);
      if (!Array.isArray(result?.hits) || typeof result.nbHits !== "number") {
        await sink.noteFailure(step, "response has no hits list");
        throw new Error(`Cannot page Aldi's index: ${step} has no hits list`);
      }
      total = result.nbHits;
      seen += result.hits.length;
      log(`  ${step}: ${result.hits.length} of ${total} Products, ${report.storedBytes} B stored`);
      if (page + 1 >= (result.nbPages ?? 1)) break;
    }
    if (!total) {
      await sink.noteFailure("products/page-0", "the index answered no Products");
      throw new Error("Cannot traverse Aldi: the index answered no Products");
    }
    if (maxProductSteps === undefined && seen < total) {
      // Algolia caps how deep a query may page; if Aldi lowers that cap, the
      // rest of the range would be missing without a single error.
      await sink.noteFailure("products", `paged ${seen} of ${total} Products`);
    }
  },
};
