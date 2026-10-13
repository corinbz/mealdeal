import { connect, migrate, truncateAll, type Db } from "../../src/ingest/db.ts";

/**
 * Tests run against a real Postgres, not a fake.
 *
 * The things most worth proving here are things only Postgres does: the
 * append-only triggers, the foreign keys, and the numeric handling of prices.
 * A fake would assert that our mocks behave, which is the one thing nobody
 * needs to know.
 */
export async function testDb(): Promise<Db> {
  const db = connect();
  try {
    await db.query("SELECT 1");
  } catch (error) {
    await db.end();
    throw new Error(
      "No Postgres on " +
        (process.env.DATABASE_URL ?? "localhost:5433") +
        ". Start one with `npm run db:up`, then re-run the tests. " +
        `Original error: ${(error as Error).message}`,
    );
  }
  await migrate(db);
  await truncateAll(db);
  return db;
}
