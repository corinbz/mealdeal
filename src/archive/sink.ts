import { gzipSync } from "node:zlib";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

/** One archived request/response pair. */
export interface ArchivedResponse {
  readonly seq: number;
  readonly at: string;
  readonly label: string;
  readonly variables: Record<string, unknown> | undefined;
  readonly status: number;
  /** The response body as a string, exactly as the Chain sent it. */
  readonly body: string;
}

export interface StepReport {
  readonly step: string;
  readonly records: number;
  readonly rawBytes: number;
  readonly storedBytes: number;
  readonly failed?: string;
}

export interface Manifest {
  readonly chain: string;
  readonly date: string;
  startedAt: string;
  finishedAt?: string;
  outcome: "running" | "complete" | "aborted" | "failed";
  abortReason?: string;
  steps: StepReport[];
  requests?: number;
  retries?: number;
}

/**
 * Writes one gzipped NDJSON file per step, plus a manifest for the run.
 *
 * Layout: `{root}/{date}/{chain}/{step}.ndjson.gz`, with `{step}` allowed to
 * contain slashes so a run can be archived at a useful granularity --
 * `products/wg-5` rather than one enormous `products`. That granularity is
 * what makes a run resumable: a step whose file already exists is skipped, so
 * an interrupted run picks up roughly where it stopped instead of starting
 * the day again.
 *
 * Nothing here parses or reshapes a response. The archive's whole value is
 * that it is what the Chain actually said, so that a parser written in three
 * months can be pointed at today's data -- and price history, unlike almost
 * everything else, cannot be backfilled once the day has passed.
 */
export async function createSink(root: string, chain: string, date: string) {
  const base = join(root, date, chain);
  await mkdir(base, { recursive: true });

  const manifestPath = join(base, "manifest.json");
  let manifest: Manifest = {
    chain,
    date,
    startedAt: new Date().toISOString(),
    outcome: "running",
    steps: [],
  };

  // Carry forward a previous attempt's step reports so a resumed run's
  // manifest describes the whole day, not just the part after the failure.
  if (existsSync(manifestPath)) {
    try {
      const previous = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;
      manifest = { ...manifest, startedAt: previous.startedAt, steps: previous.steps };
    } catch {
      // A corrupt manifest is not worth failing a run over; start a fresh one.
    }
  }

  const pathFor = (step: string) => join(base, `${step}.ndjson.gz`);

  async function save() {
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  return {
    base,

    /** True when a previous run already archived this step today. */
    done(step: string): boolean {
      return existsSync(pathFor(step));
    },

    async writeStep(step: string, records: ArchivedResponse[]): Promise<StepReport> {
      const path = pathFor(step);
      await mkdir(dirname(path), { recursive: true });
      const ndjson = records.map((r) => JSON.stringify(r)).join("\n");
      const compressed = gzipSync(`${ndjson}\n`);
      await writeFile(path, compressed);

      const report: StepReport = {
        step,
        records: records.length,
        rawBytes: records.reduce((n, r) => n + r.body.length, 0),
        storedBytes: compressed.byteLength,
      };
      manifest.steps = [...manifest.steps.filter((s) => s.step !== step), report];
      await save();
      return report;
    },

    async noteFailure(step: string, reason: string): Promise<void> {
      manifest.steps = [
        ...manifest.steps.filter((s) => s.step !== step),
        { step, records: 0, rawBytes: 0, storedBytes: 0, failed: reason },
      ];
      await save();
    },

    async finish(
      outcome: Manifest["outcome"],
      extra: { abortReason?: string; requests?: number; retries?: number } = {},
    ): Promise<Manifest> {
      manifest = {
        ...manifest,
        outcome,
        finishedAt: new Date().toISOString(),
        ...extra,
      };
      await save();
      return manifest;
    },

    manifest(): Manifest {
      return manifest;
    },
  };
}

export type Sink = Awaited<ReturnType<typeof createSink>>;
