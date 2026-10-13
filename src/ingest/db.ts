import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

/**
 * Postgres amounts arrive as strings by default for numeric types, which is
 * correct (a JS number cannot hold every numeric) but awkward. We keep that
 * behaviour and convert deliberately at the edges rather than globally
 * registering a parser that would quietly round a price somewhere later.
 */
export type Db = pg.Pool;

export function connectionString(): string {
  return (
    process.env.DATABASE_URL ??
    "postgres://mealdeal:mealdeal@localhost:5433/mealdeal"
  );
}

export function connect(url = connectionString()): Db {
  return new pg.Pool({ connectionString: url, max: 4 });
}

export async function migrate(db: Db): Promise<void> {
  const here = dirname(fileURLToPath(import.meta.url));
  const sql = await readFile(join(here, "schema.sql"), "utf8");
  await db.query(sql);
}

/**
 * Empties the observation tables. Test-only: the append-only triggers refuse
 * DELETE, so this uses TRUNCATE, which is exactly why the triggers alone are
 * not a security boundary -- they are a guard against an ordinary mistake in
 * application code, which is what actually threatens the history.
 */
export async function truncateAll(db: Db): Promise<void> {
  await db.query(
    `TRUNCATE offer_product, offer_observation, price_observation,
              product_ean, product, ingest_run RESTART IDENTITY CASCADE`,
  );
}
