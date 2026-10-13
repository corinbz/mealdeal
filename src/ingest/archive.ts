import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";

/**
 * Reading back what the archiver wrote.
 *
 * Ingest deliberately reads the archive rather than the Chains. One network
 * path (the archiver) and one parse path (this) means Jumbo's category paging
 * and Dirk's per-Store batching exist once, our traffic is not doubled, and a
 * parser fixed in three months can be re-run over every day already captured
 * -- which is the whole premise of keeping raw responses (ADR-0002).
 */

export interface ArchivedResponse {
  readonly seq: number;
  readonly at: string;
  readonly label: string;
  readonly variables: Record<string, unknown> | undefined;
  readonly status: number;
  /** The response body as the Chain sent it, still a string. */
  readonly body: string;
}

async function* walk(dir: string): AsyncGenerator<string> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return; // A step the archiver never wrote is absent, not an error.
  }
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (entry.name.endsWith(".ndjson.gz")) yield path;
  }
}

async function* linesOf(file: string): AsyncGenerator<ArchivedResponse> {
  const text = gunzipSync(await readFile(file)).toString("utf8");
  for (const line of text.split("\n")) {
    if (line.trim()) yield JSON.parse(line) as ArchivedResponse;
  }
}

/**
 * Every archived response for one step, in file order.
 *
 * A step is either a single file -- `promotions.ndjson.gz`, `departments.ndjson.gz`
 * -- or a directory of them, as `products/store-66/wg-1.ndjson.gz` is. Both
 * forms must be read: handling only the directory form silently skipped
 * Jumbo's entire Offer feed, with no error anywhere, which is precisely the
 * failure this codebase keeps meeting. Absence of a step is not an error (the
 * archiver may never have written it), so the distinction between "no step"
 * and "step read as nothing" has to live in the caller's counts.
 */
export async function* readStep(
  archiveRoot: string,
  date: string,
  chain: string,
  step: string,
): AsyncGenerator<ArchivedResponse> {
  const base = join(archiveRoot, date, chain, step);

  const single = `${base}.ndjson.gz`;
  if (existsSync(single)) yield* linesOf(single);

  for await (const file of walk(base)) yield* linesOf(file);
}

/**
 * The parsed GraphQL payload, or null when the body is not usable.
 *
 * A body carrying GraphQL `errors` is returned as null rather than thrown:
 * the archiver stores validation errors on purpose, and a run should report
 * them as parse failures while still recording every step that did work.
 */
export function payloadOf(record: ArchivedResponse): Record<string, unknown> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(record.body);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const envelope = parsed as { data?: unknown; errors?: unknown[] };
  if (Array.isArray(envelope.errors) && envelope.errors.length) return null;
  if (typeof envelope.data !== "object" || envelope.data === null) return null;
  return envelope.data as Record<string, unknown>;
}
