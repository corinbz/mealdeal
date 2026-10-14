/**
 * Archives raw responses from a Chain's public endpoint.
 *
 * This is deliberately NOT the ingest pipeline. It parses nothing, derives
 * nothing, and populates no schema -- it writes down exactly what each Chain
 * said today, so that a parser written later can be pointed at it. The reason
 * it exists before the pipeline is timing: price history cannot be backfilled,
 * so every day without a recording is a day gone for good, whereas a day's raw
 * responses can be re-read as often as we like.
 *
 *   npm run archive -- --chain dirk
 *   npm run archive -- --chain jumbo --max-product-steps 2
 *
 * Needs no `npm install`: Node 22.18+ runs TypeScript directly and this has no
 * dependencies.
 */

import { createClient, EdgeDenied } from "./http.ts";
import { createSink } from "./sink.ts";
import { dirk } from "./chains/dirk.ts";
import { jumbo } from "./chains/jumbo.ts";
import { vomar } from "./chains/vomar.ts";
import type { Chain } from "./chains/types.ts";

const CHAINS: Record<string, Chain> = { dirk, jumbo, vomar };

/** Dirk prices are per-Store. Store 66 is the one the research verified. */
const DEFAULT_STORE_IDS = [66];

interface Options {
  chains: Chain[];
  out: string;
  date: string;
  storeIds: number[];
  minIntervalMs: number;
  maxRetries: number;
  timeoutMs: number;
  maxProductSteps: number | undefined;
  userAgent: string | undefined;
}

function usage(): never {
  console.error(
    `Usage: npm run archive -- --chain <${Object.keys(CHAINS).join("|")}|all> [options]

  --chain <name>             Chain to archive, or "all". Repeatable. Required.
  --out <dir>                Archive root. Default: ./archive
  --date <YYYY-MM-DD>        Archive under this date. Default: today.
  --store <id>               Dirk Store id. Repeatable. Default: ${DEFAULT_STORE_IDS.join(",")}
  --min-interval-ms <n>      Minimum gap between requests. Default: 1500
  --max-retries <n>          Retries per request. Default: 3
  --timeout-ms <n>           Per-request timeout. Default: 20000
  --max-product-steps <n>    Archive only the first n product steps (smoke test).
  --user-agent <string>      Override the agent string sent to every Chain.
                             Jumbo's edge tarpits our honest agent and answers
                             a browser one; overriding it is a deliberate
                             choice, so it has to be typed out. See
                             src/archive/chains/jumbo.ts.`,
  );
  process.exit(2);
}

function parseArgs(argv: readonly string[]): Options {
  const names: string[] = [];
  const storeIds: number[] = [];
  let out = "archive";
  let date = new Date().toISOString().slice(0, 10);
  let minIntervalMs = 1500;
  let maxRetries = 2;
  let timeoutMs = 20_000;
  let maxProductSteps: number | undefined;
  let userAgent: string | undefined;

  const number = (raw: string | undefined, flag: string): number => {
    const value = Number(raw);
    if (!Number.isFinite(value)) {
      console.error(`${flag} needs a number, got ${raw ?? "nothing"}`);
      usage();
    }
    return value;
  };

  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const next = argv[i + 1];
    switch (flag) {
      case "--chain": names.push(next ?? ""); i++; break;
      case "--out": out = next ?? out; i++; break;
      case "--date": date = next ?? date; i++; break;
      case "--store": storeIds.push(number(next, flag)); i++; break;
      case "--min-interval-ms": minIntervalMs = number(next, flag); i++; break;
      case "--max-retries": maxRetries = number(next, flag); i++; break;
      case "--timeout-ms": timeoutMs = number(next, flag); i++; break;
      case "--max-product-steps": maxProductSteps = number(next, flag); i++; break;
      case "--user-agent": userAgent = next; i++; break;
      case "--help": case "-h": usage();
      default:
        console.error(`Unknown argument: ${flag}`);
        usage();
    }
  }

  if (names.length === 0) usage();
  const requested = names.includes("all") ? Object.keys(CHAINS) : names;
  const chains = requested.map((name) => {
    const chain = CHAINS[name];
    if (!chain) {
      console.error(`Unknown chain: ${name}`);
      usage();
    }
    return chain;
  });

  return {
    chains,
    out,
    date,
    storeIds: storeIds.length ? storeIds : DEFAULT_STORE_IDS,
    minIntervalMs,
    maxRetries,
    timeoutMs,
    maxProductSteps,
    userAgent,
  };
}

async function archiveChain(chain: Chain, options: Options): Promise<boolean> {
  const started = Date.now();
  console.log(`\n${chain.name} -> ${options.out}/${options.date}/${chain.name}`);

  const sink = await createSink(options.out, chain.name, options.date);
  const client = createClient({
    endpoint: chain.endpoint,
    headers: options.userAgent
      ? { ...chain.headers, "user-agent": options.userAgent }
      : chain.headers,
    minIntervalMs: options.minIntervalMs,
    maxRetries: options.maxRetries,
    timeoutMs: options.timeoutMs,
  });

  try {
    await chain.run({
      client,
      sink,
      storeIds: options.storeIds,
      maxProductSteps: options.maxProductSteps,
      log: (message) => console.log(message),
    });
  } catch (error) {
    const stats = client.stats();
    const reason = error instanceof Error ? error.message : String(error);
    // An edge denial is not a bug to retry past. Stop, keep what we have, and
    // make the run's outcome say why -- hammering a Chain that has just
    // refused us is how a transient block becomes a permanent one.
    const outcome = error instanceof EdgeDenied ? "aborted" : "failed";
    await sink.finish(outcome, {
      abortReason: reason,
      requests: stats.requests,
      retries: stats.retries,
    });
    console.error(`  ${outcome.toUpperCase()}: ${reason}`);
    // A Chain that accepts the connection and then never answers is being
    // tarpitted on the agent string rather than failing. Say so, because the
    // symptom on its own looks like an unrelated network problem.
    if (/timed out|timeout|aborted/i.test(reason)) {
      console.error(
        `  Every request to ${chain.name} timed out. If the endpoint is up, ` +
          `it may be refusing this agent string specifically -- see ` +
          `src/archive/chains/jumbo.ts and the --user-agent flag.`,
      );
    }
    return false;
  }

  const stats = client.stats();
  const manifest = await sink.finish("complete", {
    requests: stats.requests,
    retries: stats.retries,
  });

  const failed = manifest.steps.filter((s) => s.failed);
  const stored = manifest.steps.reduce((n, s) => n + s.storedBytes, 0);
  console.log(
    `  ${manifest.steps.length} steps, ${stats.requests} requests, ` +
      `${stats.retries} retries, ${(stored / 1024).toFixed(0)} KiB stored, ` +
      `${((Date.now() - started) / 1000).toFixed(1)}s`,
  );
  if (failed.length) {
    console.log(`  ${failed.length} step(s) reported errors:`);
    for (const step of failed.slice(0, 5)) {
      console.log(`    ${step.step}: ${step.failed}`);
    }
  }
  return failed.length === 0;
}

const options = parseArgs(process.argv.slice(2));
let clean = true;
for (const chain of options.chains) {
  // One Chain's failure must not stop another's recording: a day of Dirk is
  // worth having even on a day Jumbo refuses us.
  clean = (await archiveChain(chain, options)) && clean;
}
process.exit(clean ? 0 : 1);
