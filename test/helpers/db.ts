import pg from "pg";
import {
  connect,
  connectionString,
  migrate,
  truncateAll,
  type Db,
} from "../../src/ingest/db.ts";

/**
 * Tests run against a real Postgres, in a database of their own.
 *
 * Real rather than a fake, because the things most worth proving here are
 * things only Postgres does: the append-only triggers, the foreign keys, and
 * numeric handling of prices. A fake would only prove our mocks behave.
 *
 * Of its own because every test file truncates in `beforeEach`, and for a
 * while that truncation landed on the same database a real ingest writes to —
 * so running the tests silently destroyed 18,067 ingested Products. Nothing
 * was lost for good (re-ingesting a Sweep takes about a second) but a test
 * run must not be able to touch working data at all.
 */

/** `…/mealdeal` becomes `…/mealdeal_test`, unless TEST_DATABASE_URL says otherwise. */
export function testConnectionString(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const url = new URL(connectionString());
  const name = url.pathname.replace(/^\//, "") || "mealdeal";
  url.pathname = `/${name}_test`;
  return url.toString();
}

/** Postgres has no CREATE DATABASE IF NOT EXISTS; 42P04 is "already exists". */
const ALREADY_EXISTS = "42P04";

async function ensureDatabaseExists(url: string): Promise<void> {
  const target = new URL(url);
  const name = target.pathname.replace(/^\//, "");
  const maintenance = new URL(url);
  maintenance.pathname = "/postgres";

  const client = new pg.Client({ connectionString: maintenance.toString() });
  await client.connect();
  try {
    // The name is derived from our own connection string, never from input,
    // and CREATE DATABASE cannot be parameterised.
    await client.query(`CREATE DATABASE "${name.replace(/"/g, '""')}"`);
  } catch (error) {
    if ((error as { code?: string }).code !== ALREADY_EXISTS) throw error;
  } finally {
    await client.end();
  }
}

export async function testDb(): Promise<Db> {
  const url = testConnectionString();

  // The guard that matters. If these ever resolve to the same database, the
  // next `beforeEach` wipes the working data, and it would do so quietly.
  if (url === connectionString()) {
    throw new Error(
      `The test database and the working database are the same (${url}). ` +
        `Refusing to run: the tests truncate every table. Set ` +
        `TEST_DATABASE_URL to something else.`,
    );
  }

  try {
    await ensureDatabaseExists(url);
  } catch (error) {
    throw new Error(
      `No Postgres at ${connectionString()}. Start one with \`npm run db:up\`, ` +
        `then re-run the tests. Original error: ${(error as Error).message}`,
    );
  }

  const db = connect(url);
  await migrate(db);
  await truncateAll(db);
  return db;
}
