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

## Each Chain is its own case

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
- Wording is still kept verbatim, but some text a Chain sends is not wording
  for a deal and is left out:
  - **Dirk's `ACTIE_` price sign** is a template marker, not wording. Its
    other signs ("VR, ZA & ZO") are kept.
  - **A Jumbo tag that only repeats the promotion's title** is a brand
    page's label ("Red Band" tagged "Red Band").
  - **Jumbo delivery perks** ("Gratis bezorging · Vanaf € 12,00",
    "€ 1,50 bezorgkorting · Bij elke 2 stuks") change no Product's price, so a
    promotion that is only a perk is not recorded as an Offer at all (issue
    #5): 37 of the 359 on 2026-10-13.
- EAN coverage is total where Dirk's is nil: **76 of 76** ingested Jumbo
  Products carried one, against 0 of 963 for Dirk.

**Vomar** (issue #10) sits between them. Like Jumbo it prices nationally
and sends EANs: a primary one on every Product, often with additional ones.
Like Dirk it publishes no Unit Price, so every figure is `derived`. Its pack
comes in two fields, `contents` and `unit` ("500" and "gram"), stored together
as the pack wording, and that reads cleanly far more often than Dirk's free
text: **6,268 Products on 2026-10-14, one without a Unit Price.** Weighed
goods are marked: `pieceWeight` 2 is loose produce priced per kg, 1 a weighed
pre-packed item such as cheese. Vomar publishes **no Offers** in a readable
form, so its prices are always Shelf Prices, and the basket page says so.

**Plus** (#27) prices nationally and publishes Offers in the same list as
its prices: the wording verbatim, Plus's own Offer price where it states one
("25 % KORTING" comes as `0.8925` and is stored as 89 cents; "1+1 GRATIS"
has none), and start and end as bare dates, which are read as whole
Amsterdam days. The list carries no promotion id, so Products sharing wording
and days are recorded as one Offer. Every Unit Price is derived from the pack
("Per 500 g", "Per 4 st", "Per kilo"). Packaging "Kg" marks a Product sold by
the kilo. No EANs: see docs/archive.md. 17,249 Products on 2026-10-14, 94
without a Unit Price, all of them non-food: socks, laces, gloves.

Two things in Vomar's data that look like they help and do not:

- **A measure in a piece-counted name is each piece's size, not the pack's.**
  In all 18 such Products it was the capacity of a bin bag ("G'woon
  Huisvuilzak 60l", 20 stuks), so unlike Jumbo the name never overrides
  Vomar's own pack fields. It is read only when they are empty.
- **An EAN starting with 2 is an in-store code**, from GS1's restricted range:
  loose apples carry `2221230000000`. It is stored as sent, but it identifies
  nothing outside Vomar and must never join Products across Chains (#15).

Stored EANs feed the Exact Products the catalogue build groups (#15,
`src/catalogue/exact.ts`). Ingest itself still asserts no identity across
Chains: the grouping happens over the catalogue, where its rules can change
without re-ingesting anything. They are:

- **In-store codes never join.** An EAN starting with 2 (or written as UPC,
  02 or 04) is from GS1's restricted range.
- **Own brands never join**, though Jumbo's own Kropsla carries the supplier's
  EAN that Vomar's plain one does (ADR-0006).
- **One EAN on two packs does not join them.** Vomar keeps old EANs, and one
  Crodino EAN is a 6 x 175 ml pack at Jumbo and a 105 ml bottle at Vomar, so
  packs in one unit must agree within 10%. Of 2,584 Jumbo-Vomar EAN matches,
  473 state their packs differently, nearly all the same pack written another
  way ("4 x 16,8 g" against "68 gram"). Those still join.
- **A Chain with two Products on one group drops out of it**: that is no proof
  of which one is the item.

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

## Products to Ingredients

Each Chain files a Product in its own category tree, and ingest records
where: Dirk's department and web group, the path of names to every Jumbo
category a Product was listed under, and Vomar's department, main group and
subgroup. The mapper (`src/ingredients/`) reads
that and the name, and says which Ingredient a Product is, its Variant and
form, and whether it is biologisch or huismerk. It may also say that the
Product is no single Ingredient. The catalogue build runs it on every
Product and reports, per Chain, how many mapped and how many compare in the
Ingredient's own unit.

- **Categories become aisles.** A few hundred category leaves are classified
  once into about a dozen aisles (produce, conserves, frozen, baby, pet...).
  Each Ingredient says which aisles it is sold in, and the aisle gives the
  form: carrots in Groente are fresh, in Groenteconserven jarred, and in
  Babyvoeding not carrots at all. A Product filed with ready meals, baby food
  or pet food anywhere is that, whatever else it is filed under. This, not a
  list of excluded words, is what rules out the misfires.
- **A name word belongs to the longest Ingredient word it ends with**, across
  the whole vocabulary: "aardappel" is aardappelen even where only appels are
  sold. Words of three letters or fewer must match whole, since "ui" ends
  "slagerhuis".
- **A name naming several Ingredients is a mix.** It maps to a mix Ingredient
  (wokgroente, rauwkost) if it names one, and otherwise to none. Only what
  comes before "met", "in", "op", "zonder" or "minder" names the Product, so
  "Tonijnstukken in olijfolie" is tuna.
- **Units convert where the vocabulary says how**: a courgette is about
  0.3 kg, so a per-kg price compares per piece.

On 2026-10-14 about 1,700 of Dirk's, 3,650 of Jumbo's, 1,450 of Vomar's and
2,980 of Plus's food Products mapped. Vomar's huismerk is its own label and the Superunie
lines it sells as its own: G'woon, Melkan, Bio+ and Daily Chef. Plus's is
PLUS with its own lines (PLUS Boerentrots, Biologisch PLUS, "Uit de keuken
van PLUS"), and Melkan and Bio+. Most of the rest are processed, seasoned or mixed. The vocabulary
(`src/ingredients/vocabulary.ts`, about 230 Ingredients) grows by adding
words, and Corrections cover what it misses in the meantime. To see what it
does with a real day without the R2 keys, export one with
`.github/workflows/archive-export.yml` and ingest it locally.

## Every morning, with no laptop

`.github/workflows/catalogue.yml` runs after each archive run on `main` (and
by hand, for a given day). It downloads that day from R2, ingests it into a
throwaway Postgres, builds the catalogue the basket page runs on, and
publishes it to `catalogue/latest.js` in the same private bucket. The archive
stays the system of record (ADR-0005), so the database is discarded with the
runner. To use this morning's prices locally:

```sh
./scripts/pull-catalogue.sh   # writes prototype/catalogue.js from R2
```

It publishes nothing unless all of these hold, and goes red otherwise:

- **Every Chain's day is complete**, by its manifest and `archive:check`. A
  catalogue with one Chain from today and nothing for the other would make
  Basket comparison quietly one-sided. A failed archive run is skipped, since
  it is red already.
- **Ingest exits clean**, which includes recording at least one Product.
- **Every Chain's prices are from the day swept**, and an older day never
  replaces a newer catalogue.
- **No Chain shrank below half of the published catalogue's comparable
  Products.** This stands in for ingest's volume alarm, which cannot fire in a
  throwaway database: there, every run is a Chain's first.
  `scripts/check-catalogue.ts` does this check and the two above.

It also judges every Offer against its Product's **Reference Price**, the
lowest price of the 30 days before the reduction began (#18). The refresh's
database holds only one day, so `catalogue/history.json` carries each
Product's price per day, for 45 days, from one morning to the next.
`scripts/apply-history.ts` adds the day and appends the reference to each
catalogue row. Days already on the same Offer at the same price are not the
Offer's own reference, or an Offer in its second week would look like no Offer
at all. A Product with no recorded days before the Offer gets no verdict. An
Offer with no price of its own (`1+1 gratis`) is not turned into one
(ADR-0002): only its normal price is judged, which is where an inflated "was"
price shows. The history is derived from catalogues and holds nothing the
archive does not. If it is lost, or past days should read differently after
a mapping or parser change, `.github/workflows/history-rebuild.yml` replays
every archived day since a given date, in order, each into a fresh database
as the refresh does, and publishes the result.

From it the refresh also builds `catalogue/prices.js`: each mapped Product's
price per day for the last 30 calendar days, in its Ingredient's unit. The
pack price is divided by the pack size, or scaled by today's unit price when
the pack size is unknown. The page takes each item's **Daily Price** from it
(#16): per Chain and day, the lowest of those prices among the Products that
satisfy the item, so the line respects its Variant and Preferences. A day
nothing satisfying was observed is a gap, and so is a day the refresh never
ran at all.

It runs on GitHub's runners, at roughly 5 minutes a day against the private
repository's 2,000 free a month (see "Which machine runs it" in
`docs/archive.md`).

## Weekly digest

`.github/workflows/digest.yml` emails the owner this week's real discounts on
their staples (#22). It sends once per week, after the first good refresh from
Wednesday on, when most Offer weeks begin. For one owner until there are
accounts (#21): staples are the `DIGEST_STAPLES` repository variable, one per
line, written as on the basket page.

It only names a discount the real-discount check supports: an Offer with a
price of its own, below the Product's Reference Price. An Offer with no price
(`1+1 gratis`), or with no recorded days before it, is never claimed. A staple
with nothing real is named as such. The email says which day each Chain's
prices are from, and links to the site's recipes. Staples match Products with
the page's own code (`prototype/words.js`), so the email and the list agree.

It is off until opted into:

```sh
./scripts/setup-digest.sh    # Resend key, your address, your staples
```

Resend's shared sender delivers only to the address its account was made
with, which is all one owner needs, and no domain has to be set up.
Unsubscribing is one click: *Disable workflow* on the digest's Actions page,
which every email links to. A dry run by hand (the default) writes the digest
into the run summary instead of sending it, and works before opting in:
`gh workflow run digest.yml -f staples="500 g rundergehakt,6 eieren"`.

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
