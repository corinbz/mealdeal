# Ingest

Reads a Sweep out of the archive and records it as Products, Observations and
Offers in Postgres. This is the data foundation Basket comparison reads, and
the reason it reads the archive rather than the Chains is ADR-0005.

```sh
npm run db:up          # local Postgres in Docker, on :5433
npm run db:migrate
npm run ingest -- --chain dirk --date 2026-10-13
npm test               # runs against mealdeal_test, never the working data
```

## It reads the archive, not the Chains

**This is a deliberate deviation from the spec in issue #1**, which had ingest
fetch from each Chain with the test seam at HTTP.

Once the archiver existed, a second network traversal would have meant Jumbo's
category paging and Dirk's per-Store batching living in two places, twice the
traffic to the Chains, and an ingest that could only ever see today. Reading
the archive gives one network path and one parse path — and makes ADR-0002's
reasoning real: a parser improved in three months can be re-run over every day
already captured, which is the entire reason for keeping raw responses.

The seam stays singular, just at a directory instead of a socket:

```
test ───► reader(archive, date) ───► normalise ───► record ───► Postgres
               │                                                   ▲
               └── fixture archive dir                      assert here
```

No HTTP is faked anywhere, because no HTTP happens. Ingest never contacts a
Chain, which is also the architecture Innoweb (C-202/12) argues for: a
periodic independent index, never a live query relay.

## What gets stored

| Table | What it holds |
| --- | --- |
| `product` | One Chain's Product, by that Chain's own reference. Current description, not history. |
| `product_ean` | Many-to-one from the start: two assessed Chains return arrays. |
| `price_observation` | **Append only.** One row per Product per Store per run. |
| `offer_observation` | Offer wording verbatim, with start/end and an upcoming flag. |
| `offer_product` | Which Products an Offer applies to, by Chain reference. |
| `ingest_run` | The counts a run needs to be trusted. |

Four decisions the schema enforces rather than hopes for:

- **Append-only is a trigger, not a convention.** `UPDATE` and `DELETE` on
  either observation table raise. Price history cannot be backfilled, so an
  overwrite destroys something unrecoverable, and "every future caller will
  remember" is not a plan.
- **Price scope is explicit.** A row carries a `store_ref` or `NULL`, where
  `NULL` means the price applies across the Chain. Jumbo publishes national
  prices; Dirk's are genuinely per-Store. Neither is forced into the other's
  shape, and no placeholder Store is invented for Jumbo.
- **`unit_price_source` records whose figure it is** — `chain` where the Chain
  published its own Unit Price, `derived` where we computed one from pack text.
  The Chain's own figure is what it legally represents at the shelf, so the
  distinction has to survive storage.
- **No cross-Chain Product identity**, not even between Products sharing an
  EAN (ADR-0001). Basket Items resolve per Chain.

## The two Chains are opposite cases

**Dirk** publishes no EAN and no Unit Price, so every comparison figure is
derived from free-text pack wording, and prices are per-Store. Verified
against the real archived day: **963 products, 960 with a derivable Unit
Price, 264 Offers of which 104 had not started yet.** The three without a Unit
Price are all `Per bos` — a bunch, with no quantity stated anywhere. They are
recorded with a Shelf Price and no Unit Price: not comparison candidates, but
never dropped, and their wording is kept so a better parser can recover them
without re-scraping a day that has passed.

Two sentinel values are translated in the Dirk reader and never reach the
store: an offer price of `0` means "no Offer" rather than free, and an end date
in 2049 means "open-ended" rather than a twenty-three year promotion.

**Jumbo** is the opposite: it publishes an EAN and a pre-computed Unit Price,
and its prices are national — so where Dirk's Unit Price is always `derived`,
Jumbo's is usually `chain`.

The exception is the comparison rule: **by weight or volume whenever one is
known, by the piece only when none is** (issue #3). Jumbo prices some packs per
piece whose title states a weight ("Tortilla Wraps 8 Stuks 320 g"); those are
compared on a per-kg figure derived from the title and marked `derived`. A
Product with no Jumbo figure gets one derived from its title the same way.

`product.pack_unit` says what `pack_quantity` counts. It can differ from
`comparison_unit`, which is the Unit Price's unit: Jumbo prices "Kop Champignon
Soep 3 Stuks" per kg, and its pack is 3 pieces. Pack arithmetic (packs needed
for a requirement) may only use `pack_quantity` when `pack_unit` matches.

Its reader is now proved against real data. Every product row the Jumbo tests
assert against was **recorded** from the live endpoint on 2026-10-13, bar one:
across 254 recorded rows `pricePerUnit` was never null, so "a Chain publishes
no Unit Price for this Product" is a case we have not observed and cannot
record. That single row is marked constructed in the fixture. The offer
fixtures are three of the 359 promotions Jumbo actually returned.

Those recordings earned their place immediately. Jumbo spells the piece unit
**`pieces`**, and the mapper — written against an earlier, wholly invented
fixture that guessed `stuk` — silently dropped the Comparison Unit for every
piece-priced Product. Nothing failed; the rows simply stopped being comparison
candidates. One real response caught what twelve passing tests had agreed
about, which is the argument for recording fixtures rather than writing them.

What the real data also settled, which guesses had not:

- Jumbo's category tree has **1134 leaf categories**, so a full catalogue walk
  is a long, deliberately slow job rather than a quick one.
- The promotions feed returns **359 Offers in one call**, 112 of them not yet
  started.
- Offer tag wording is more varied than "a percentage or a multibuy":
  `1+1 gratis`, `25% korting`, `Vanaf € 12,00`, `2 voor 3,99`,
  `Gratis bezorging`, `Alleen in de winkel`. Several are not discounts at all
  — a channel restriction is not a price — which is the clearest case yet for
  ADR-0002's refusal to derive anything from them.
- EAN coverage is total where Dirk's is nil: **76 of 76** ingested Jumbo
  Products carried one, against 0 of 963 for Dirk.

## A run that records nothing must not look like success

`ingest_run` counts products seen, products recorded, prices, offers, products
with no derivable Unit Price, and parse failures. Three guards sit on top:

- **The volume alarm.** A run recording less than half the previous run's
  Products is *rejected* — nothing is ingested, and the rejection itself is
  written to `ingest_run` so the silence is visible. A Chain changing its API
  shape looks exactly like missing data. `--force` accepts it when a catalogue
  genuinely shrank; the first run for a Chain is exempt, since there is
  nothing to compare against.
- **Zero products is a non-zero exit**, even when every step "succeeded".
- **A GraphQL error in an archived response is counted, not swallowed.** The
  archiver stores validation errors on purpose — that is how we learn a field
  was renamed — and one failing category does not take a working one down.

This is the third time this failure mode has come up in this codebase: Dirk's
`listOffers` answers HTTP 200 with empty lists when called without a
`department`, and the archiver's `readStep` originally read only directory-form
steps, silently skipping Jumbo's whole Offer feed. Both were found by asking
"what would an empty success look like here?" rather than by a crash.

## Testing

One seam, at the archive directory. Each test drives a full run — read,
normalise, persist — and asserts what ended up in Postgres. Nothing asserts
how many files were opened or which function was called.

Tests run against **real Postgres**, not a fake. The things most worth proving
are things only Postgres does: the append-only triggers, the foreign keys, and
numeric handling of prices. A fake would only prove our mocks behave.

Fixtures live as readable JSON in `test/fixtures` and are gzipped into a temp
archive at test time, so a reviewer can see what each test asserts against;
`_why` and `_case` keys explain each row and are ignored by the readers. The
Dirk fixtures are trimmed from real archived responses. They cover the forms
that actually break parsers: Dutch decimal commas, `24 x 300ml` multipacks,
piece counts, a parenthetical to ignore, a pack size stated only in the name,
a container with no quantity at all, both Dirk sentinels, a weight-priced
Product, a Product with no EAN, one with several, a duplicate across
categories, and a GraphQL error body.

Pack-size parsing also gets narrow unit tests — the one deliberate exception
to testing at the top seam, because it is a pure function over a large awkward
input space and enumerating that through full runs would be clumsy for no
benefit. The end-to-end tests still cover it in context.

Tests run in a database of their own — `mealdeal_test`, created on demand,
derived from the working connection string or set explicitly with
`TEST_DATABASE_URL`. This is not tidiness: every test file truncates in
`beforeEach`, and while the two shared one database, running `npm test`
silently destroyed 18,067 ingested Products. A guard refuses to start if the
two ever resolve to the same database, because that failure is invisible
otherwise.

Test files still share that one test database and each truncates it, so they
must not interleave: the suite runs with `--test-concurrency=1`.

## Not built here

No Basket, Basket Item, Resolution or Coverage. No cross-Chain matching. No
own-brand equivalence. No modelling of Offer mechanics. No Albert Heijn. See
issue #1's Out of Scope.
