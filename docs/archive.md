# Raw response archive

Takes a **Sweep** of each Chain once a day — one pass over its catalogue,
recording exactly what its public endpoint said. It parses nothing and derives
nothing.

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

### Jumbo — queries verified, and it needs an explicit agent string

Verified on 2026-10-13, from one machine, same IP, same other headers, same
minute: a **browser** user agent was answered HTTP 200; our **honest** one was
tarpitted — the connection accepted, then never answered until the client
timed out. Jumbo's edge is discriminating on the agent string specifically,
not on the address.

So archiving Jumbo means choosing to send a user agent that misrepresents what
we are. That carries weight beyond the technical: Jumbo's terms (Article 9(3))
prohibit automated collection in Database Directive language, and presenting
as a browser *after* being refused as a robot is a fact that reads badly if
this is ever argued.

**Decision, 2026-10-13:** the project owner, having been shown the above, chose
to send a browser agent so real Jumbo data can be collected. The honest string
stays the **default**, and the browser one is passed per invocation — so the
choice is made explicitly each time rather than silently inherited by whoever
runs this next:

```sh
npm run archive -- --chain jumbo --user-agent "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
```

**Decision, later on 2026-10-13:** the project owner chose to archive Jumbo on
the daily schedule as well. The browser string is therefore written into
`.github/workflows/archive.yml`, as `JUMBO_USER_AGENT`, and passed to the
Jumbo job only. The CLI default is unchanged: a local run still sends the
honest string unless told otherwise, and Dirk is never sent the browser one.

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

**All three Jumbo steps are now verified live.** The product query was pinned
once an edge-accepted agent string was in use:

- `searchProducts(input: ProductSearchInput!)` returns
  `ProductSearchResult { products { … } }`.
- `searchType` is enum `SearchTypeInput`; `category`, `CATEGORY`, `keyword` and
  `KEYWORD` are all valid. `total` is **not** a field of `ProductSearchResult`.
- `searchTerms` is read whatever the search type is — absent it, the service
  throws on `getSearchTerms()` — so for a category search it carries the
  **category id**, not a phrase.
- We traverse by category, because `searchType: "keyword"` forwards the phrase
  to Jumbo's Bloomreach search backend, which is exactly what their
  `robots.txt` internal-search directives ask us not to drive.

One thing the live data corrected that a fixture could not: Jumbo spells the
piece unit **`pieces`**. The ingest reader had been written against an invented
fixture that guessed `stuk`, so every piece-priced Jumbo Product would have had
its Comparison Unit silently dropped — and a Product with no Comparison Unit is
not a comparison candidate at all. This is the clearest argument in the repo for
recording fixtures rather than writing them.

**Scale, measured rather than guessed.** The category tree has **1134 leaf
categories**, so a full Jumbo walk at the default pacing is roughly an hour —
a background job, not something to wait on. The promotions feed returns all
**359 Offers in a single call**, 112 of them not yet started, which is why the
offer step is cheap and the product step is not.

## Politeness

One request at a time, no concurrency option, with a configurable gap
(default 1.5s). Retries back off on timeouts, 429s and 5xx. An **edge denial
is never retried** — the run aborts and keeps what it already wrote, because
repeating a request that was just refused is how a transient block becomes a
durable one.

## Where it runs

`.github/workflows/archive.yml` runs it daily at 04:30 UTC, as one job per
Chain in parallel — 06:30 in
Amsterdam in summer, 05:30 in winter, both after Dirk's own ~04:01 local
refresh. GitHub Actions cron is UTC only, so that drifts with the seasons by
design. The archive is uploaded to a private Cloudflare R2 bucket; R2 is
S3-compatible, so the AWS CLI already on the runner can talk to it.

Nothing about the schedule needs a server to operate, which is the point. At
~40 KB/day per Chain compressed, a year of both Chains is tens of megabytes —
cost is not the constraint, running unattended is.

### One-time setup

```sh
./scripts/setup-r2-archive.sh
```

A seven-stage wizard that opens each Cloudflare page, says what to click,
captures the four values, writes them to `.env` **and** to the repository
secrets, verifies each one landed, and offers to trigger a small test run. It
is re-runnable: on a second pass, Enter keeps the value already saved.

The secrets it sets, all four read by the workflow: `R2_ACCOUNT_ID`,
`R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`. The API token wants
**Object Read & Write**, not Admin — the workflow only reads and writes
objects, and never needs to create or delete a bucket.

### How the scheduled run behaves

- **It will not start if the credentials are absent.** Archiving a day and
  then failing to upload it is worse than not running: it looks like success,
  and that day cannot be re-recorded.
- **It stops before writing anything if the bucket nears R2's free tier.**
  Normal use is about 2 MB and 1300 uploads a day: under 1 GB a year against
  10 GB free, and about 4% of the 1,000,000 free monthly writes. R2 has no
  spending cap, though, so a bug that uploads in a loop would only show up on
  the invoice. `npm run archive:usage` reads the bucket listing first: at half
  of either limit it puts a warning on the run, at 80% it fails the run. It
  counts this month's writes as objects modified this month, because the S3
  API cannot report operation counts.
- **It restores any partial archive for today before running**, so a retry
  resumes rather than re-requesting everything a failed attempt already got.
- **It uploads even when the run failed part-way.** A partial day is worth
  keeping, both as data and so the next attempt can resume from it.
- **It goes red when the archive is suspiciously small.** `npm run
  archive:check` enforces a floor on bytes written and fails on any step that
  reported GraphQL errors. This exists because of Dirk's `listOffers`: called
  without a `department` it returns empty offer lists and HTTP 200, so without
  this check the job would have reported success every morning while recording
  nothing. A green tick is not evidence.
- **Each Chain is its own job.** A full Sweep of either takes most of an
  hour, so back to back they would overrun the 90-minute timeout, and Jumbo's
  edge refusing the runner must not cost Dirk its day. Each job restores,
  uploads and checks only its own Chain's directory. A manual run picks one
  Chain, or `all`.
- **Manifests are attached to each run** for 30 days. They are small and are
  the only thing worth reading when a run looks wrong.

Do **not** commit the archive to git — `.gitignore` excludes `/archive/`
(root-anchored, so it does not also swallow `src/archive/`), and `.env`.
