import type { Chain, RunContext } from "./types.ts";
import { createRecorder } from "./types.ts";

/**
 * Vomar.
 *
 * Verified live on 2026-10-14, answering our honest agent string. The source
 * research found product objects in the Nuxt payload of the category pages;
 * those pages are built from a JSON gateway, and that gateway is what is
 * archived here. It is the same data without a page of HTML and script
 * around it, and is what Vomar's own pages request in the browser.
 *
 *   GET /departments                     the whole tree: 10 departments,
 *                                        85 main groups, their subgroups
 *   GET /products?departmentNumber=50&mainGroupNumber=500&pageSize=1000
 *                                        every Product in one main group
 *
 * Prices are national: no endpoint takes a Store. Each Product carries
 * `primaryEan` plus `additionalEans`, the richest identifiers of any Chain.
 *
 * Two things the gateway sends that we did not ask for, because a GET has no
 * selection set: `images`, a list of Vomar-hosted file names, and nothing
 * else of the kind. The names are archived as part of the response, verbatim
 * like everything else, but no image is ever fetched and ingest never reads
 * the field (ADR-0003).
 *
 * Vomar publishes no Offers in a form a program can read. `/aanbiedingen`
 * redirects to `/folders`, which embeds a Publitas leaflet: pictures of
 * pages, with no product hotspots. The `discountDeal` flag the page code
 * checks for marks Vomar's everyday low prices, and was absent from every
 * Product sampled. So a Vomar Sweep records Shelf Prices only. See
 * docs/archive.md.
 */

const ENDPOINT = "https://gateway.vomar.nl";

const HEADERS = {
  "user-agent": "mealdeal-archiver/0.1 (+https://github.com/corinbz/mealdeal)",
};

/** Vomar's own pages ask for 1000 at a time; the largest main group is far smaller. */
const PAGE_SIZE = 1000;
/** Stop paging a main group after this many pages, as a runaway guard. */
const MAX_PAGES = 20;

interface DepartmentsPayload {
  departments?: {
    departmentNumber?: number;
    mainGroups?: { mainGroupNumber?: number }[];
  }[];
}

interface ProductsPayload {
  products?: unknown[];
  totalPages?: number;
}

export const vomar: Chain = {
  name: "vomar",
  endpoint: ENDPOINT,
  headers: HEADERS,

  async run({ client, sink, maxProductSteps, log }: RunContext) {
    // Step 1: the department tree, which is also every Product's category.
    const treeStep = "departments";
    const tree = createRecorder(client);
    const payload = (await tree.get(treeStep, "/departments")) as DepartmentsPayload | null;
    const groups = (payload?.departments ?? []).flatMap((d) =>
      (d.mainGroups ?? [])
        .filter((m) => typeof m.mainGroupNumber === "number")
        .map((m) => ({ department: d.departmentNumber!, mainGroup: m.mainGroupNumber! })),
    ).filter((g) => typeof g.department === "number");
    await sink.writeStep(treeStep, tree.records);
    if (!groups.length) {
      // An answer with no groups would otherwise archive nothing, green.
      await sink.noteFailure(treeStep, "no main groups in the department tree");
      throw new Error("Cannot traverse Vomar: no main groups in the department tree");
    }
    log(`  ${treeStep}: ${groups.length} main groups`);

    // Step 2: the Products of each main group.
    const selected = maxProductSteps === undefined ? groups : groups.slice(0, maxProductSteps);
    log(`  walking ${selected.length} of ${groups.length} main groups`);

    for (const group of selected) {
      const step = `products/dept-${group.department}/mg-${group.mainGroup}`;
      if (sink.done(step)) {
        log(`  ${step}: skipped (already archived)`);
        continue;
      }

      const recorder = createRecorder(client);
      let failure: string | null = null;
      for (let page = 1; page <= MAX_PAGES; page++) {
        const result = (await recorder.get(step, "/products", {
          departmentNumber: group.department,
          mainGroupNumber: group.mainGroup,
          pageSize: PAGE_SIZE,
          page,
        })) as ProductsPayload | null;
        if (!Array.isArray(result?.products)) {
          failure = "response has no products list";
          break;
        }
        if (page >= (result.totalPages ?? 1)) break;
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
