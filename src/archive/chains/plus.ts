import type { Chain, RunContext } from "./types.ts";
import { createRecorder } from "./types.ts";

/**
 * Plus.
 *
 * Verified live on 2026-10-14, answering our honest agent string (#27). The
 * source research rated Plus "Low": an OutSystems app whose pages arrive as
 * an empty shell, and whose old mobile API no longer resolves. The pages
 * fetch their data from OutSystems "screen services", which answer a plain
 * POST:
 *
 *   POST /screenservices/ECP_Product_CW/Categories/CategoryList_TF/DataActionGetMenuCategories
 *        the category tree, as a JSON string inside the JSON
 *   POST /screenservices/ECP_Composition_CW/ProductLists/PLP_Content/DataActionGetProductListAndCategoryInfo
 *        one page of 12 Products of a category, with price, Offer price,
 *        Offer wording and dates, and the category path
 *
 * Three things a request must carry, all found by watching the site's own
 * traffic:
 *
 *   - `X-CSRFToken` with OutSystems' fixed token for anonymous visitors.
 *     Without it the answer is 403 "Invalid Login". No cookie and no login
 *     are needed.
 *   - `versionInfo`: the module version, and each action's own API version.
 *     They change whenever Plus deploys, and a stale one is answered with no
 *     data and `hasApiVersionChanged`. So every run reads the current ones
 *     first: the module version from `/moduleservices/moduleinfo`, and each
 *     action's from the controller script that calls it. A step answered
 *     with a version change fails loudly rather than archiving nothing.
 *   - `screenData.variables`: only `CategorySlug` and `PageNumber` matter.
 *
 * Prices are national: setting a Store number changed no price in any Store
 * sampled; a Store only stocks less.
 *
 * Not archived, by decision (#27): the product-detail action, the only one
 * carrying an EAN, because it also returns ingredients, nutrients and
 * supplier marketing text (ADR-0003). Plus therefore has no EANs. Both
 * actions archived here also name Plus-hosted image URLs; they are kept
 * verbatim as part of the response and never fetched or read.
 *
 * Plus's terms for account holders forbid reproducing the site's information
 * without permission (5.1); the owner accepted that on 2026-10-14. See
 * docs/archive.md.
 */

const ENDPOINT = "https://www.plus.nl";

const HEADERS = {
  "user-agent": "mealdeal-archiver/0.1 (+https://github.com/corinbz/mealdeal)",
  // OutSystems' token for a visitor who is not logged in. Fixed, public, and
  // what Plus's own pages send before anyone signs in.
  "x-csrftoken": "T6C+9iB49TLra4jEsMeSckDMNhQ=",
};

const MENU = {
  script: "/ECOP/scripts/ECP_Product_CW.Categories.CategoryList_TF.mvc.js",
  action: "DataActionGetMenuCategories",
  path: "/screenservices/ECP_Product_CW/Categories/CategoryList_TF/DataActionGetMenuCategories",
  viewName: "MainFlow.ProductListPage",
};
const LIST = {
  script: "/ECOP/scripts/ECP_Composition_CW.ProductLists.PLP_Content.mvc.js",
  action: "DataActionGetProductListAndCategoryInfo",
  path: "/screenservices/ECP_Composition_CW/ProductLists/PLP_Content/DataActionGetProductListAndCategoryInfo",
  viewName: "MainFlow.ProductListPage",
};

/** Stop paging a category after this many pages, as a runaway guard. The largest had 145. */
const MAX_PAGES = 400;

interface Answer {
  versionInfo?: { hasModuleVersionChanged?: boolean; hasApiVersionChanged?: boolean };
  data?: {
    CategoriesJson?: string;
    TotalPages?: number;
    ProductList?: { List?: unknown[] };
  };
  exception?: { message?: string };
}

/** Why an answer is unusable, or null when it is fine. */
function problemWith(answer: Answer | null): string | null {
  if (!answer) return "answer is not JSON";
  if (answer.exception) return `exception: ${answer.exception.message ?? "unknown"}`;
  if (answer.versionInfo?.hasApiVersionChanged || answer.versionInfo?.hasModuleVersionChanged) {
    return "Plus deployed a new version mid-run (versionInfo changed); re-run to read the new one";
  }
  if (!answer.data) return "answer has no data";
  return null;
}

/** The API version a controller script passes for one action: callDataAction("Name", "path", "version", ...). */
export function apiVersionIn(script: string, action: string): string | null {
  const escaped = action.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return script.match(new RegExp(`callDataAction\\("${escaped}",\\s*"[^"]*",\\s*"([^"]+)"`))?.[1] ?? null;
}

export const plus: Chain = {
  name: "plus",
  endpoint: ENDPOINT,
  headers: HEADERS,

  async run({ client, sink, maxProductSteps, log }: RunContext) {
    // Step 0, not archived: today's version codes. They are code, not
    // prices, and every archived request records the ones it sent.
    const info = (await client.get("/moduleservices/moduleinfo")).json as
      { manifest?: { versionToken?: string; urlVersions?: Record<string, string> } } | null;
    const moduleVersion = info?.manifest?.versionToken;
    if (!moduleVersion) throw new Error("Cannot read Plus's module version from /moduleservices/moduleinfo");
    const versionOf = async (a: typeof MENU) => {
      const script = (await client.get(a.script + (info?.manifest?.urlVersions?.[a.script] ?? ""))).raw;
      const apiVersion = apiVersionIn(script, a.action);
      if (!apiVersion) throw new Error(`Cannot find ${a.action}'s API version in ${a.script}: Plus has changed its app`);
      return { moduleVersion, apiVersion };
    };
    const menuVersion = await versionOf(MENU);
    const listVersion = await versionOf(LIST);
    log(`  versions: module ${moduleVersion}, menu ${menuVersion.apiVersion}, list ${listVersion.apiVersion}`);

    // Step 1: the category tree.
    const treeStep = "categories";
    const tree = createRecorder(client);
    const menu = (await tree.post(treeStep, MENU.path, {
      versionInfo: menuVersion, viewName: MENU.viewName, screenData: { variables: {} },
    })) as Answer | null;
    await sink.writeStep(treeStep, tree.records);
    const treeProblem = problemWith(menu);
    let tops: string[] = [];
    try {
      const all = JSON.parse(menu?.data?.CategoriesJson ?? "[]") as
        { Category_str?: { Slug?: string; ExternalId?: number; ParentExternalId?: number } }[];
      // Top-level categories: an ExternalId and no parent. "Aanbiedingen"
      // has neither and lists Offers only; every Product is under a top.
      tops = all.map((c) => c.Category_str ?? {})
        .filter((c) => c.ExternalId && c.ParentExternalId === undefined && c.Slug)
        .map((c) => c.Slug!);
    } catch { /* reported below */ }
    if (treeProblem || !tops.length) {
      const reason = treeProblem ?? "no top-level categories in the tree";
      await sink.noteFailure(treeStep, reason);
      throw new Error(`Cannot traverse Plus: ${reason}`);
    }
    log(`  ${treeStep}: ${tops.length} top-level categories`);

    // Step 2: every page of every top-level category.
    const selected = maxProductSteps === undefined ? tops : tops.slice(0, maxProductSteps);
    for (const slug of selected) {
      const step = `products/${slug}`;
      if (sink.done(step)) {
        log(`  ${step}: skipped (already archived)`);
        continue;
      }
      const recorder = createRecorder(client);
      let failure: string | null = null;
      for (let page = 1; page <= MAX_PAGES; page++) {
        const answer = (await recorder.post(step, LIST.path, {
          versionInfo: listVersion, viewName: LIST.viewName,
          screenData: { variables: { CategorySlug: slug, PageNumber: page } },
        })) as Answer | null;
        failure = problemWith(answer);
        if (failure) break;
        if (!Array.isArray(answer?.data?.ProductList?.List)) { failure = "answer has no product list"; break; }
        if (page >= (answer!.data!.TotalPages ?? 1)) break;
      }
      const report = await sink.writeStep(step, recorder.records);
      if (failure) {
        await sink.noteFailure(step, failure);
        log(`  ${step}: FAILED -- ${failure}`);
      } else {
        log(`  ${step}: ${report.records} pages, ${report.storedBytes} B stored`);
      }
    }
  },
};
