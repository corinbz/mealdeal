# Raw response archive

A scheduled job that records, once a day, exactly what each Chain's public
endpoint said. It parses nothing and derives nothing.

## Why this exists before the ingest pipeline

Price history cannot be backfilled. A day that passes without a recording is
gone permanently, whereas a day's raw responses can be re-read as often as we
like — so the cheapest correct move is to start capturing now and write the
parser later, against real archived data rather than guesses about its shape.

Two further reasons, both from `docs/research/grocery-data-sources-nl.md`:

- Neither endpoint is a committed public API. Dirk left GraphQL introspection
  enabled, which is a gateway that was never hardened for public exposure and
  could be closed at any time. Whatever is captured before that happens is
  kept; whatever is not, is not.
- The archive is the fixture source for the ingest tests in issue #1. Fixtures
  recorded from live responses beat hand-written ones, and they come free here.

## Running it

Needs no `npm install` — Node 22.18+ runs TypeScript directly and this has no
dependencies. (`npm install` is only for `npm run typecheck`.)

```sh
npm run archive -- --chain dirk                      # a full day of Dirk
npm run archive -- --chain dirk --max-product-steps 3   # smoke test
npm run archive -- --chain all
```

Useful flags: `--out <dir>` (default `./archive`), `--date <YYYY-MM-DD>`,
`--store <id>` (repeatable), `--min-interval-ms`, `--max-product-steps`,
`--user-agent`. `--help` lists them all.

A run is **resumable**: a step whose file already exists is skipped, so
re-running after a failure picks up where it stopped rather than starting the
day again. Re-running a completed day is therefore nearly free.

## Output

```
archive/2026-10-13/dirk/manifest.json
archive/2026-10-13/dirk/departments.ndjson.gz
archive/2026-10-13/dirk/products/store-66/wg-1.ndjson.gz
archive/2026-10-13/dirk/offers/store-66/dept-1.ndjson.gz
```

Each `.ndjson.gz` line is one request/response pair:
`{seq, at, label, variables, status, body}`, where `body` is the response **as
a string**, exactly as it arrived. It is stored unparsed on purpose — Dirk
returns prices like `1.5400`, and parsing to a JS number would silently
discard the trailing zeros the Chain chose to send. Reading the archive
therefore means parsing twice, which is the price of an archive that has not
already rounded its own prices.

`manifest.json` carries the run report: per-step record counts and byte
totals, any step whose response contained GraphQL errors, request and retry
counts, and the outcome (`complete` / `aborted` / `failed`).

Roughly 300 KB of raw response compresses to 40 KB. A full daily Dirk run is
146 web groups × each configured Store, plus 17 Offer steps per Store.

### What is deliberately NOT captured

`src/archive/guard.ts` refuses to send any query selecting Chain-hosted media
(`image`, `logos`, …) or supplier-authored text (nutrition, allergens), per
**ADR-0003**. Both Chains offer these fields; the only thing keeping them out
of the archive is that we never ask. The guard fails the run loudly rather
than quietly accumulating an exposure we decided not to take. An archive is
exactly where that rule is easiest to break by accident, because the instinct
when capturing raw data is to grab everything available.

Offer wording is captured verbatim and nothing is derived from it
(**ADR-0002**). No cross-Chain Product identity is asserted (**ADR-0001**) —
each Chain's responses are archived in their own right.

## Chain status

### Dirk — working, fully verified

Every query was verified live on 2026-10-13, with field lists from schema
introspection rather than guesswork. Dirk accepts our honest, self-identifying
user agent and needs no special headers.

Two corrections to the research, both load-bearing:

- **`listOffers` needs BOTH `department` and `store`.** With `store` alone it
  answers `{currentOffers: [], upcomingOffers: []}` — a successful-looking
  empty response, not an error. That is the shape of bug that archives nothing
  for months without anyone noticing.
- **The dated queries are not public.** `listOffersByDate` returns
  `Unauthorized` and `productsByDate` returns nulls for a past date, so the
  "historical price facility" the research credited to Dirk is not available
  to us. Nothing can be backfilled here either, which sharpens the case for
  archiving daily from now.

Two characteristics of Dirk's data worth knowing before writing a parser:

- `listWebGroupProducts` returns a **superset** including delisted Products.
  In web group 1, only 35 of 421 ids resolved to a price at store 66. The
  `null` entries are archived rather than dropped: "this Store does not carry
  this Product today" is a real observation, and discarding it would make
  Coverage unmeasurable later.
- **Per-Store variation is real.** Of 20 Products stocked at store 66, store
  30 carried 16 and store 1 carried only 4. Store 66 is the default because it
  had the best hit rate of those sampled.

### Jumbo — blocked on a decision only you can make

The archiver supports Jumbo, but **it will not work as shipped**, and the
reason is deliberate.

Verified on 2026-10-13, from one machine, same IP, same other headers, same
minute: a **browser** user agent was answered HTTP 200; our **honest** one was
tarpitted — the connection accepted, then never answered until the client
timed out. Jumbo's edge is discriminating on the agent string specifically,
not on the address.

So archiving Jumbo means choosing to send a user agent that misrepresents what
we are. That carries weight beyond the technical: Jumbo's terms (Article 9(3))
prohibit automated collection in Database Directive language, and presenting
as a browser *after* being refused as a robot is a fact that reads badly if
this is ever argued. It is therefore not the default, and not hidden inside a
header constant. To make that choice, type it out:

```sh
npm run archive -- --chain jumbo --user-agent "Mozilla/5.0 (...)"
```

Three further Jumbo findings that contradict the research:

1. **HTTP/2 is refused** — every h2 request died with a stream
   `INTERNAL_ERROR`, while the identical request over HTTP/1.1 was answered.
   Node's `fetch` is HTTP/1.1, which is why this works at all. Do not swap in
   an HTTP/2-capable client without retesting Jumbo.
2. **Client headers are mandatory** — without `apollographql-client-name` AND
   `apollographql-client-version`, the endpoint answers
   `401 {"errors":[{"message":"No client headers set"}]}`. The research's
   "answered plain curl immediately" no longer reproduces.
3. **The edge began denying requests part-way through a short probing
   session** (an Akamai "Access Denied" page). Jumbo is not the
   "unauthenticated, unthrottled" surface the research described, so the
   pacing below is not optional politeness.

Consequence: **Jumbo's product-listing query is unverified.** The edge cut
probing short before it could be confirmed. `searchProducts` exists and
`searchType` is a required enum field, but the enum's legal values and the
field wrapping the product list are unknown. The query is marked UNVERIFIED in
`src/archive/chains/jumbo.ts`, and a failing step archives the GraphQL
validation error rather than discarding it — so the first successful run names
the exact problem in its manifest. Jumbo's `categories` and `promotions` steps
are fine.

## Politeness

One request at a time, no concurrency option, with a configurable gap
(default 1.5s). Retries back off on timeouts, 429s and 5xx. An **edge denial
is never retried** — the run aborts and keeps what it already wrote, because
repeating a request that was just refused is how a transient block becomes a
durable one.

## Where this should run

Right now it runs wherever you run it, writing to a local directory. That is
fine for today and not fine as a daily job, because a laptop that is closed
does not archive anything, and the whole point is not missing days.

The next decision is hosting. The managed option, in keeping with the rest of
the project: a **GitHub Actions scheduled workflow** (cron, no servers to
operate) writing to **Cloudflare R2 or Backblaze B2** (S3-compatible object
storage, both cheap at this volume). Do **not** commit the archive to git —
`.gitignore` excludes `archive/` for that reason. At ~40 KB/day per Chain
compressed, a year of both Chains is on the order of tens of megabytes, so
cost is not a constraint; durability and running unattended are.
