import type { Chain, RunContext } from "./types.ts";
import { createRecorder } from "./types.ts";

/**
 * Dirk van den Broek.
 *
 * Every query below was verified live against the gateway on 2026-10-13, and
 * the field lists come from schema introspection rather than guesswork --
 * Dirk has introspection enabled, which is also a hint that this gateway was
 * never hardened for public use and could be closed without notice. That is
 * the case for archiving now rather than later.
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
 */

const ENDPOINT = "https://t1-web-gateway.dirk.nl/graphql";

/** Verified live. Yields the department and web-group tree used to traverse. */
const DEPARTMENTS = `query Departments {
  listDepartments {
    departments {
      id
      description
      webGroups { webGroupId description webSubGroups { webSubGroupId description } }
    }
  }
}`;

/** Verified live. `productIds` is the complete membership of a web group. */
const WEB_GROUP_PRODUCTS = `query WebGroupProducts($webGroupId: Int!) {
  listWebGroupProducts(webGroupId: $webGroupId) { productIds }
}`;

/**
 * Verified live. Prices are per-Store and the Chain returns `null` in place of
 * any Product the Store does not stock, positionally. Those nulls are kept:
 * "Store 66 does not carry Product 4443 today" is a real observation about
 * assortment, and discarding it would make Coverage unmeasurable later.
 *
 * `image` and `logos` exist on `ProductDto` and are deliberately not selected
 * (ADR-0003). `src/archive/guard.ts` enforces that.
 */
const ASSORTMENT = `query Assortment($storeId: Int!, $productIds: [Int!]!) {
  productsAssortment(storeId: $storeId, productIds: $productIds) {
    productId
    productNumber
    storeId
    normalPrice
    offerPrice
    priceDate
    startDate
    endDate
    isSingleUsePlastic
    singleUsePlasticValue
    productInformation {
      productId
      productNumber
      brand
      headerText
      subText
      packaging
      isWeightProduct
      maxAmount
      department
      webgroup
    }
    productOffer {
      productOfferId
      productId
      startDate
      endDate
      disclaimerStartDate
      disclaimerEndDate
      textPriceSign
    }
  }
}`;

/**
 * Verified live with department 1 and store 66.
 *
 * `upcomingOffers` is the reason this step matters: Offers are visible before
 * they start, which is what offer-driven meal planning needs. The advertised
 * wording (`promotionText`, the `textPriceSign*` fields) is captured as the
 * Chain wrote it and nothing is derived from it (ADR-0002).
 *
 * `products` is available on the offer type but omitted: it repeats the
 * Product detail the assortment step already archives. `image` is omitted
 * under ADR-0003.
 */
const OFFER_FIELDS = `offerId
    key
    storeId
    headerText
    subText
    packaging
    promotionText
    normalPrice
    offerPrice
    priceDate
    startDate
    endDate
    embargoDate
    disclaimerStartDate
    disclaimerEndDate
    type
    textPriceSign
    textPriceSign1
    textPriceSign2
    productIds`;

const OFFERS = `query Offers($department: Int!, $store: Int!) {
  listOffers(department: $department, store: $store) {
    key
    importId
    currentOffers { ${OFFER_FIELDS} }
    upcomingOffers { ${OFFER_FIELDS} }
  }
}`;

/**
 * How many Product ids to price per request. Dirk accepts a list and answers
 * positionally; 100 keeps a single response to a sane size and means one
 * failure costs one batch rather than a whole web group.
 */
const BATCH_SIZE = 100;

interface DepartmentsPayload {
  data?: {
    listDepartments?: {
      departments?: { id: number; webGroups?: { webGroupId: number }[] }[];
    };
  };
}

interface WebGroupPayload {
  data?: { listWebGroupProducts?: { productIds?: number[] } };
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export const dirk: Chain = {
  name: "dirk",
  endpoint: ENDPOINT,
  // Verified accepted on 2026-10-13: Dirk answers an honest, attributable
  // agent string normally, so there is no reason to send anything else.
  headers: {
    "user-agent": "mealdeal-archiver/0.1 (+https://github.com/corinbz/mealdeal)",
  },

  async run({ client, sink, storeIds, maxProductSteps, log }: RunContext) {
    // Step 1: the department and web-group tree, which drives everything else.
    let departments: { id: number; webGroups?: { webGroupId: number }[] }[] = [];

    const treeStep = "departments";
    if (sink.done(treeStep)) {
      log(`  ${treeStep}: already archived today, re-fetching for traversal only`);
    }
    const tree = createRecorder(client);
    const treePayload = (await tree.request(treeStep, DEPARTMENTS)) as DepartmentsPayload;
    departments = treePayload.data?.listDepartments?.departments ?? [];
    if (!sink.done(treeStep)) {
      const report = await sink.writeStep(treeStep, tree.records);
      log(`  ${treeStep}: ${departments.length} departments, ${report.storedBytes} B stored`);
    }
    if (tree.errors.length) {
      await sink.noteFailure(treeStep, tree.errors.join(" | "));
      throw new Error(`Cannot traverse Dirk: ${tree.errors.join(" | ")}`);
    }

    // Step 2: prices per web group, per Store.
    const webGroupIds = departments.flatMap((d) =>
      (d.webGroups ?? []).map((g) => g.webGroupId),
    );
    const groups = maxProductSteps === undefined
      ? webGroupIds
      : webGroupIds.slice(0, maxProductSteps);
    log(`  walking ${groups.length} of ${webGroupIds.length} web groups`);

    for (const webGroupId of groups) {
      for (const storeId of storeIds) {
        const step = `products/store-${storeId}/wg-${webGroupId}`;
        if (sink.done(step)) {
          log(`  ${step}: skipped (already archived)`);
          continue;
        }

        const recorder = createRecorder(client);
        const listing = (await recorder.request(step, WEB_GROUP_PRODUCTS, {
          webGroupId,
        })) as WebGroupPayload;
        const productIds = listing.data?.listWebGroupProducts?.productIds ?? [];

        for (const batch of chunk(productIds, BATCH_SIZE)) {
          await recorder.request(step, ASSORTMENT, { storeId, productIds: batch });
        }

        const report = await sink.writeStep(step, recorder.records);
        if (recorder.errors.length) {
          await sink.noteFailure(step, recorder.errors.join(" | "));
        }
        log(
          `  ${step}: ${productIds.length} products in ${report.records} responses, ` +
            `${report.storedBytes} B stored${recorder.errors.length ? " (with errors)" : ""}`,
        );
      }
    }

    // Step 3: Offers, which need department and Store together.
    for (const department of departments) {
      for (const storeId of storeIds) {
        const step = `offers/store-${storeId}/dept-${department.id}`;
        if (sink.done(step)) {
          log(`  ${step}: skipped (already archived)`);
          continue;
        }
        const recorder = createRecorder(client);
        await recorder.request(step, OFFERS, {
          department: department.id,
          store: storeId,
        });
        const report = await sink.writeStep(step, recorder.records);
        if (recorder.errors.length) {
          await sink.noteFailure(step, recorder.errors.join(" | "));
        }
        log(`  ${step}: ${report.storedBytes} B stored`);
      }
    }
  },
};
