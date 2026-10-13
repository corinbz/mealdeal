import type { Chain, RunContext } from "./types.ts";
import { createRecorder } from "./types.ts";

/**
 * Jumbo.
 *
 * Read this before trusting the Jumbo half of the archive.
 *
 * Three findings from 2026-10-13 that contradict the source research:
 *
 *   1. HTTP/2 is refused. Every h2 request from this machine died with a
 *      stream INTERNAL_ERROR; the identical request over HTTP/1.1 was
 *      answered. Node's fetch is HTTP/1.1, which is why this works at all.
 *   2. Client headers are now mandatory. Without
 *      `apollographql-client-name` AND `apollographql-client-version` the
 *      endpoint answers `401 {"errors":[{"message":"No client headers set"}]}`.
 *      The research's "answered plain curl immediately" no longer reproduces.
 *   3. The edge started denying requests part-way through a short probing
 *      session (an Akamai "Access Denied" page). So the endpoint is not the
 *      "unauthenticated, unthrottled" surface the research described, and the
 *      pacing in `http.ts` is not optional politeness here.
 *
 * Because of (3) the product-listing query below could not be verified. The
 * category and promotion steps were. See PRODUCTS for what remains unknown.
 */

const ENDPOINT = "https://www.jumbo.com/api/graphql";

/**
 * The required client headers.
 *
 * The user agent names this project and links it, so our traffic is
 * attributable rather than anonymous. BE AWARE THAT THIS DOES NOT CURRENTLY
 * WORK, and that the reason is a decision for a human, not a bug to fix:
 *
 *   Tested on 2026-10-13 from one machine, same IP, same other headers, same
 *   minute -- a browser user agent was answered HTTP 200, and this honest one
 *   was tarpitted (the connection was accepted and then never answered, until
 *   the client timed out). Jumbo's edge is discriminating on the agent string
 *   specifically, not on the address.
 *
 * So archiving Jumbo means choosing to send a user agent that misrepresents
 * what we are. That is a real decision with legal weight: Jumbo's terms
 * (Article 9(3)) prohibit automated collection in Database Directive
 * language, and presenting as a browser after being refused as a robot is the
 * kind of fact that reads badly if this is ever argued. It is deliberately
 * NOT the default here, and it is deliberately not hidden inside a header
 * constant -- pass `--user-agent` to override it, and own the choice.
 *
 * Dirk needs none of this, which is why Dirk is the chain to archive today.
 */
const HEADERS = {
  "apollographql-client-name": "JUMBO_WEB-cms",
  "apollographql-client-version": "1.0.0",
  "x-source": "JUMBO_WEB-cms",
  "user-agent":
    "mealdeal-archiver/0.1 (+https://github.com/corinbz/mealdeal)",
};

/**
 * Verified live. `CategoryTreeNode` has `id`, `name` and `children` -- `title`
 * and `slug` do not exist on it. Introspection is disabled on this endpoint,
 * so field existence was established through validation errors.
 */
const CATEGORIES = `query Categories($depth: Int) {
  categoriesTree(exclusions: [], depth: $depth) {
    id
    name
    children { id name children { id name } }
  }
}`;

/**
 * Selection set from the source research, which verified it live. Not
 * re-verified here.
 *
 * This is the step that makes Jumbo worth archiving daily: the promotions feed
 * returns Offers that have not started yet, so next week's Offers are
 * available before the week begins. Mechanics arrive as human-readable tag
 * text (`1+1 gratis`, `25% korting`, `voor 19,99`) and are archived exactly as
 * written -- nothing is parsed out of them (ADR-0002).
 */
const PROMOTIONS = `query Promotions {
  promotions {
    id
    title
    subtitle
    startDate
    endDate
    tags { text }
    products { sku }
  }
}`;

/**
 * UNVERIFIED. The edge denied further probing before this could be confirmed,
 * so treat a failure of this step as expected rather than alarming, and read
 * the archived response to fix it -- the GraphQL validation error names the
 * exact problem, and the run records it rather than discarding it.
 *
 * What is known:
 *   - `searchProducts(input: ProductSearchInput!)` exists, and `searchType` is
 *     a required field of enum type `SearchTypeInput!` (a bogus value is
 *     rejected as "does not exist in SearchTypeInput enum").
 *   - `searchTerms`, `offSet` and `limit` are the other input fields the
 *     research used; `total` is NOT a field of `ProductSearchResult`.
 *   - The per-Product selection below is the research's verified one.
 *
 * What is not known: the enum's legal values, whether a category-scoped search
 * type exists, and the field that wraps the product list. The enum is passed
 * as a variable rather than inlined, because a JSON string coerces to a
 * GraphQL enum through variables -- so no quoting guesswork is needed here.
 *
 * Category traversal is preferred to keyword search on purpose: Jumbo's
 * robots.txt permits product-listing pagination (`Allow: /producten/*?offSet=`)
 * and disallows the internal-search URL patterns. If only keyword search turns
 * out to work, that is worth a deliberate decision rather than a default.
 */
const PRODUCTS = `query Products($input: ProductSearchInput!) {
  searchProducts(input: $input) {
    products {
      sku
      title
      ean
      price { price promoPrice pricePerUnit { price unit } }
      promotions { id tags { text } }
    }
  }
}`;

const SEARCH_TYPE = "keyword";
const PAGE_SIZE = 30;
/** Stop paging a category after this many pages, as a runaway guard. */
const MAX_PAGES = 40;

interface CategoryNode {
  id?: string;
  name?: string;
  children?: CategoryNode[];
}

interface CategoriesPayload {
  data?: { categoriesTree?: CategoryNode[] };
}

interface ProductsPayload {
  data?: { searchProducts?: { products?: unknown[] } };
}

/**
 * The leaves are what we page through. Jumbo's tree mixes real categories with
 * personalised tiles (`eerder-gekocht-custom-category-tile`) and dynamic
 * merchandising groups (`brg_dyn_*`); those are dropped, since they describe a
 * logged-in shopper's own history rather than the assortment.
 */
function leaves(nodes: readonly CategoryNode[]): { id: string; name: string }[] {
  const out: { id: string; name: string }[] = [];
  const walk = (node: CategoryNode) => {
    const id = node.id ?? "";
    if (!id || id.startsWith("brg_dyn_") || id.includes("custom-category-tile")) return;
    if (node.children?.length) {
      for (const child of node.children) walk(child);
      return;
    }
    out.push({ id, name: node.name ?? "" });
  };
  for (const node of nodes) walk(node);
  return out;
}

export const jumbo: Chain = {
  name: "jumbo",
  endpoint: ENDPOINT,
  headers: HEADERS,

  async run({ client, sink, maxProductSteps, log }: RunContext) {
    // Step 1: the category tree.
    const treeStep = "categories";
    const tree = createRecorder(client);
    const payload = (await tree.request(treeStep, CATEGORIES, {
      depth: 3,
    })) as CategoriesPayload;
    if (!sink.done(treeStep)) {
      await sink.writeStep(treeStep, tree.records);
    }
    if (tree.errors.length) {
      await sink.noteFailure(treeStep, tree.errors.join(" | "));
      throw new Error(`Cannot traverse Jumbo: ${tree.errors.join(" | ")}`);
    }
    const categories = leaves(payload.data?.categoriesTree ?? []);
    log(`  ${treeStep}: ${categories.length} leaf categories`);

    // Step 2: the Offer feed, including Offers that have not started.
    const promoStep = "promotions";
    if (sink.done(promoStep)) {
      log(`  ${promoStep}: skipped (already archived)`);
    } else {
      const promos = createRecorder(client);
      await promos.request(promoStep, PROMOTIONS);
      const report = await sink.writeStep(promoStep, promos.records);
      if (promos.errors.length) await sink.noteFailure(promoStep, promos.errors.join(" | "));
      log(`  ${promoStep}: ${report.storedBytes} B stored`);
    }

    // Step 3: products per category. See PRODUCTS -- this is the unverified part.
    const selected = maxProductSteps === undefined
      ? categories
      : categories.slice(0, maxProductSteps);
    log(`  walking ${selected.length} of ${categories.length} categories`);

    for (const category of selected) {
      const step = `products/cat-${category.id}`;
      if (sink.done(step)) {
        log(`  ${step}: skipped (already archived)`);
        continue;
      }

      const recorder = createRecorder(client);
      let offSet = 0;
      for (let page = 0; page < MAX_PAGES; page++) {
        const result = (await recorder.request(step, PRODUCTS, {
          input: {
            searchType: SEARCH_TYPE,
            searchTerms: category.name,
            offSet,
            limit: PAGE_SIZE,
          },
        })) as ProductsPayload;

        if (recorder.errors.length) break;
        const products = result.data?.searchProducts?.products ?? [];
        if (products.length < PAGE_SIZE) break;
        offSet += PAGE_SIZE;
      }

      const report = await sink.writeStep(step, recorder.records);
      if (recorder.errors.length) {
        await sink.noteFailure(step, recorder.errors.join(" | "));
        log(`  ${step}: FAILED -- ${recorder.errors[0]}`);
      } else {
        log(`  ${step}: ${report.records} pages, ${report.storedBytes} B stored`);
      }
    }
  },
};
