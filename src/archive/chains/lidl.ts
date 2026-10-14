import type { Chain, RunContext } from "./types.ts";
import { createRecorder } from "./types.ts";

/**
 * Lidl: its Offers only.
 *
 * Verified live on 2026-10-14, answering our honest agent string (#28).
 * Lidl publishes no regular prices online: each of the 13,255 product pages
 * in its sitemap says "InStoreOnly" and states no price. The one place it
 * prices food is the offers page, rendered on the server:
 *
 *   GET /c/aanbiedingen/a10008785
 *        one HTML page; every product on it carries a `data-grid-data`
 *        attribute holding JSON: title, Lidl's article numbers, category,
 *        pack, the Offer price and the price it was, its dates, and a
 *        separate Lidl Plus price
 *
 * The page loads nothing further in a browser and has no paging; robots.txt
 * allows it, and disallows the `?offset=` and `/user-api/` paths. Prices are
 * national: all six of Lidl's regions share one price list.
 *
 * Third-party indexes of Lidl's regular prices exist (boodschaapje.nl, and
 * checkjebon.nl through it), apparently built from till receipts. They are
 * not what Lidl said and are not archived; the owner wants Lidl's own words.
 *
 * The page is archived whole, verbatim like every other response. It also
 * holds Lidl-hosted image URLs and Lidl's own banners; those are never
 * fetched or read (ADR-0003). See docs/archive.md.
 */

const ENDPOINT = "https://www.lidl.nl";

const HEADERS = {
  "user-agent": "mealdeal-archiver/0.1 (+https://github.com/corinbz/mealdeal)",
};

const OFFERS_PATH = "/c/aanbiedingen/a10008785";

export const lidl: Chain = {
  name: "lidl",
  endpoint: ENDPOINT,
  headers: HEADERS,

  async run({ client, sink, log }: RunContext) {
    const step = "offers";
    if (sink.done(step)) {
      log(`  ${step}: skipped (already archived)`);
      return;
    }
    const recorder = createRecorder(client);
    await recorder.get(step, OFFERS_PATH);
    const report = await sink.writeStep(step, recorder.records);
    // An HTML page that renders but lists no products would otherwise
    // archive a day of nothing, green.
    const products = (recorder.records[0]?.body.match(/data-grid-data="/g) ?? []).length;
    if (!products) {
      await sink.noteFailure(step, "the offers page lists no products");
      throw new Error("Lidl's offers page lists no products: Lidl has changed its page");
    }
    log(`  ${step}: ${products} products, ${report.storedBytes} B stored`);
  },
};
