import { assortmentQuery, detailresultChain } from "./detailresult.ts";

/**
 * DekaMarkt.
 *
 * Verified live on 2026-10-14, answering our honest agent string (#30).
 * DekaMarkt belongs to Detailresult Groep, as Dirk does, and its site asks
 * the same gateway software at its own address, so the Sweep is Dirk's (see
 * `detailresult.ts`). Introspection is off here; the fields were taken from
 * the site's own scripts and each was tried. Dirk's `singleUsePlasticValue`
 * does not exist on this gateway, so it is not asked for.
 *
 * Store 283 is no shop. It is the site's default, "Volledig assortiment",
 * which a visitor sees before choosing one: every Product any DekaMarkt
 * stocks. Prices are national. Six real Stores (1, 117, 118, 119, 120, 200)
 * returned the same price as 283 for every Product they stock, and the same
 * 138 Offers. So one Store is asked for, and it is that one.
 *
 * Web groups list about 122,000 Product ids between them, of which about one
 * in nine is stocked; the rest come back null (kept, as at Dirk). The gateway
 * prices a thousand ids in about 50 ms, so a request asks for a thousand:
 * about 330 requests a day where a hundred to a request would be 1,400.
 *
 * robots.txt allows everything but a few `/misc/` pages. The site's
 * disclaimer says only that its materials' intellectual property rests with
 * DekaMarkt; no clause addresses automated access. See docs/archive.md.
 */
export const dekamarkt = detailresultChain({
  name: "dekamarkt",
  endpoint: "https://web-deka-gateway.dekamarkt.nl/graphql",
  defaultStoreIds: [283],
  batchSize: 1000,
  assortment: assortmentQuery(),
});
