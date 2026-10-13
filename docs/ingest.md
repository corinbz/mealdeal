# Ingest

Reads a day out of the archive and records it as Products, price observations
and Offers in Postgres. This is the data foundation Basket comparison reads.

```sh
npm run db:up          # local Postgres in Docker, on :5433
npm run db:migrate
npm run ingest -- --chain dirk --date 2026-10-13
npm test
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
and its prices are national. **Its reader is NOT proved against real data.**
Jumbo's edge tarpits an honest client (see `docs/archive.md`), so no Jumbo
response has ever been archived. The field names are the archiver's verified
selection set; the response envelope around them is the part the edge refused
to confirm, and the fixture is built to the documented shape rather than
recorded from the Chain. A test passing against a fixture of our own invention
proves less than one recorded live, and that limit is stated in the test file
rather than papered over.

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

Test files share one database and each truncates, so they must not interleave:
the suite runs with `--test-concurrency=1`.

## Not built here

No Basket, Basket Item, Resolution or Coverage. No cross-Chain matching. No
own-brand equivalence. No modelling of Offer mechanics. No Albert Heijn. See
issue #1's Out of Scope.
