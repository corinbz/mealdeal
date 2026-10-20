import { assortmentQuery, detailresultChain } from "./detailresult.ts";

/**
 * Dirk van den Broek.
 *
 * Every query in `detailresult.ts` was verified live against Dirk's gateway
 * on 2026-10-13, and its field lists come from schema introspection rather
 * than guesswork -- Dirk has introspection enabled, which is also a hint that
 * this gateway was never hardened for public use and could be closed without
 * notice. That is the case for archiving now rather than later.
 *
 * Two things the research recorded did not hold up in practice, and both are
 * worth knowing before relying on them:
 *
 *   - `listOffers` needs BOTH `department` and `store`. With `store` alone it
 *     answers `{currentOffers: [], upcomingOffers: []}` -- a successful-looking
 *     empty response, not an error, which is exactly the shape of bug that
 *     quietly archives nothing for months.
 *   - The dated queries are not public. `listOffersByDate` returns
 *     `Unauthorized` and `productsByDate` returns nulls for a past date, so
 *     the "historical price facility" the research credited to Dirk is not
 *     available to us. Nothing can be backfilled here either.
 *
 * Until 2026-10-20 this archiver used `t1-web-gateway.dirk.nl`. That day the
 * t1 gateway got a new schema: `productOffer` and `listOffers` were gone,
 * every price request answered HTTP 400, and its new offer queries
 * (`filterOffers`, `batchOffers`) answer `Unauthorized` with a date and
 * nothing without one. `web-gateway.dirk.nl` is the gateway dirk.nl itself
 * calls, and it still answers every query here unchanged, with no key. If it
 * moves to the t1 schema too, offers will need a new route.
 */

/**
 * How many Product ids to price per request. Dirk accepts a list and answers
 * positionally; 100 keeps a single response to a sane size and means one
 * failure costs one batch rather than a whole web group.
 */
const BATCH_SIZE = 100;

export const dirk = detailresultChain({
  name: "dirk",
  endpoint: "https://web-gateway.dirk.nl/graphql",
  // Dirk prices are per-Store. Store 66 is the one the research verified.
  defaultStoreIds: [66],
  batchSize: BATCH_SIZE,
  assortment: assortmentQuery(["singleUsePlasticValue"]),
});
