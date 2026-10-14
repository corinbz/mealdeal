import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

/**
 * Materialises a fixture archive on disk, in the exact layout the archiver
 * writes, so a test drives the real ingest path end to end.
 *
 * Fixtures are stored as readable JSON and gzipped here rather than committed
 * as binaries: a reviewer has to be able to see what a test asserts against,
 * and `_why`/`_case` keys in the fixtures explain each row. Those keys are
 * ignored by the readers, which only look at the fields the Chain sends.
 */

export const FIXTURE_DATE = "2026-10-13";

export interface StepFixtures {
  /** Step path (may contain slashes) to the fixture file(s) feeding it. */
  readonly [step: string]: readonly string[];
}

export interface ArchiveFixtures {
  readonly [chain: string]: StepFixtures;
}

export async function writeFixtureArchive(
  fixtures: ArchiveFixtures,
  date = FIXTURE_DATE,
): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "mealdeal-archive-"));

  for (const [chain, steps] of Object.entries(fixtures)) {
    for (const [step, files] of Object.entries(steps)) {
      // A JSON fixture is an array of response bodies; an HTML one (Lidl)
      // is one page, stored as the Chain sent it.
      const bodies: string[] = [];
      for (const file of files) {
        const content = await readFile(join("test/fixtures", file), "utf8");
        if (file.endsWith(".html")) bodies.push(content);
        else bodies.push(...(JSON.parse(content) as unknown[]).map((body) => JSON.stringify(body)));
      }

      const records = bodies.map((body, seq) => ({
        seq,
        at: `${date}T08:15:00.000Z`,
        label: step,
        variables: undefined,
        status: 200,
        body,
      }));

      const path = join(root, date, chain, `${step}.ndjson.gz`);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(
        path,
        gzipSync(`${records.map((r) => JSON.stringify(r)).join("\n")}\n`),
      );
    }
  }
  return root;
}

/** An archive directory with no responses at all, for the empty-run case. */
export async function writeEmptyArchive(date = FIXTURE_DATE): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "mealdeal-archive-"));
  await mkdir(join(root, date, "dirk"), { recursive: true });
  return root;
}
