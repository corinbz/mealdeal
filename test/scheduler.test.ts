import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import worker from "../scheduler/index.ts";
import { dispatch, REPO, SCHEDULE } from "../scheduler/dispatch.ts";

/**
 * The scheduler Worker (#2) starts the archive and its watch through
 * GitHub's workflow_dispatch API, on Cloudflare's crons rather than GitHub's.
 */

const noWait = async () => {};

function recorder(...statuses: number[]) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetcher = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const status = statuses.shift() ?? 204;
    return new Response(status === 204 ? null : "nope", { status });
  }) as unknown as typeof fetch;
  return { calls, fetcher };
}

test("every cron in wrangler.toml starts a workflow, and every workflow has a cron", async () => {
  const toml = await readFile(new URL("../scheduler/wrangler.toml", import.meta.url), "utf8");
  const crons = JSON.parse(/^crons = (\[.*\])$/m.exec(toml)?.[1] ?? "[]") as string[];
  assert.deepEqual(crons.sort(), Object.keys(SCHEDULE).sort());
});

test("the 04:30 cron archives every Chain, and the 08:00 cron runs the watch", () => {
  assert.deepEqual(SCHEDULE["30 4 * * *"], { workflow: "archive.yml", inputs: { chain: "all" } });
  assert.equal(SCHEDULE["0 8 * * *"]?.workflow, "archive-watch.yml");
});

test("a dispatch posts the inputs for main with the token", async () => {
  const { calls, fetcher } = recorder(204);
  await dispatch({ workflow: "archive.yml", inputs: { chain: "all" } }, "t0k", fetcher, noWait);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.url, `https://api.github.com/repos/${REPO}/actions/workflows/archive.yml/dispatches`);
  assert.equal(calls[0]?.init.method, "POST");
  assert.equal((calls[0]?.init.headers as Record<string, string>).Authorization, "Bearer t0k");
  assert.deepEqual(JSON.parse(String(calls[0]?.init.body)), { ref: "main", inputs: { chain: "all" } });
});

test("a GitHub hiccup is retried, a refused token is not", async () => {
  const flaky = recorder(502, 204);
  await dispatch({ workflow: "archive-watch.yml" }, "t", flaky.fetcher, noWait);
  assert.equal(flaky.calls.length, 2);

  const refused = recorder(401);
  await assert.rejects(dispatch({ workflow: "archive-watch.yml" }, "t", refused.fetcher, noWait), /HTTP 401/);
  assert.equal(refused.calls.length, 1);

  const down = recorder(500, 500, 500, 500);
  await assert.rejects(dispatch({ workflow: "archive.yml" }, "t", down.fetcher, noWait), /HTTP 500/);
  assert.equal(down.calls.length, 3);
});

test("an unknown cron or a missing token fails loudly", async () => {
  await assert.rejects(worker.scheduled({ cron: "1 2 * * *" }, { GITHUB_TOKEN: "t" }), /No workflow/);
  await assert.rejects(worker.scheduled({ cron: "30 4 * * *" }, {}), /GITHUB_TOKEN/);
});
