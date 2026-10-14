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

### Vomar — working, verified live, honest agent accepted

Added on 2026-10-14 (#10). Vomar answers our honest, self-identifying agent,
so no override is needed or sent.

**Access and terms, checked the same day:**

- `robots.txt` on `www.vomar.nl` and `api.vomar.nl` blocks three named crawlers
  (HenryTheMiragoRobot, Mirago, MJ12bot) and four `/misc/*` paths, then
  `Allow: /`. `gateway.vomar.nl`, which is what we call, has no `robots.txt`
  (404).
- **No terms of use exist to read.** `/algemene-voorwaarden`, `/disclaimer`
  and `/gebruiksvoorwaarden` are all 404, and the footer links only a
  `/privacyverklaring`, which concerns shoppers' personal data and says
  nothing about automated access. The site's own small print says only that
  prices may change and that Offers are not meant for resellers. This
  confirms the research's "ToS unverified": there is nothing to verify.

**What is archived.** The research found product objects in the Nuxt payload
of Vomar's category pages. Those pages are built from a JSON gateway, and the
archive records the gateway instead: the same data, without a page of HTML and
script around it, and the same requests Vomar's own pages make.

- `GET https://gateway.vomar.nl/departments`: the whole tree, 10 departments
  and 85 main groups with their subgroups. Step `departments`.
- `GET /products?departmentNumber=…&mainGroupNumber=…&pageSize=1000&page=…`:
  every Product in one main group. Step `products/dept-50/mg-500`. No main
  group came near 1000 on 2026-10-14, but the pager is followed anyway.

A full day is 86 requests, about two minutes at the default pacing, and
644 KiB stored: **6,268 Products, every one with a primary EAN.** Prices are
national; no endpoint takes a Store.

**What it sends that we did not ask for.** A GET has no selection set, so the
guard in `src/archive/guard.ts` has nothing to check. Every Product carries
`images`, a list of Vomar-hosted file names. They are archived as part of the
response, verbatim like everything else, but no image is ever fetched and
ingest never reads the field (ADR-0003; a test holds it to that).

**No Offers.** `/aanbiedingen` redirects to `/folders`, which embeds a
Publitas leaflet: pictures of pages. Its hotspot data holds links, not
products, and reading prices off the pictures would be both unreliable and
Chain media (ADR-0003). `api.vomar.nl/api/v1/article/getAllDiscountDealArticles`
answered `[]`; the `discountDeal` flag the page code checks marks everyday low
prices and was absent from every Product. So Vomar's prices are always Shelf
Prices.

### Plus — working, verified live, honest agent accepted

Added on 2026-10-14 (#27). The research rated Plus "Low": an OutSystems app
whose pages arrive as an empty shell, with its old mobile API gone. Watching
a product page load in headless Chromium found the route. The pages fetch
their data from OutSystems "screen services", and those answer a plain POST
from our honest agent, with no browser, cookie or login:

- `POST /screenservices/ECP_Product_CW/Categories/CategoryList_TF/DataActionGetMenuCategories`:
  the category tree, step `categories`.
- `POST /screenservices/ECP_Composition_CW/ProductLists/PLP_Content/DataActionGetProductListAndCategoryInfo`
  with `{CategorySlug, PageNumber}`: 12 Products per page of a top-level
  category, step `products/<slug>`. Each row has price, **Offer price,
  Offer wording and dates**, brand, pack and category path.

Every request needs two things from Plus's own pages:

- **`X-CSRFToken`**, OutSystems' fixed token for anonymous visitors. Without
  it the answer is 403 "Invalid Login".
- **`versionInfo`**: the module version, and each action's API version. These
  change whenever Plus deploys, and a stale pair is answered with no data and
  `hasApiVersionChanged: true`. So each run reads the current ones first. The
  module version comes from `/moduleservices/moduleinfo`, and each action's
  from the `callDataAction(...)` in the script that calls it. These are not
  archived (they are code); every archived request records the versions it
  sent. A step answered with a version change fails loudly.

A full day is **1,468 requests, about 37 minutes**, and 5.4 MB stored: 17,473
Products in 18 top-level categories, 17,249 distinct. Prices are national:
setting a Store number changed no price in any Store sampled; a Store only
stocks less.

**Access and terms.** `robots.txt` (served from
`/ECP_Robots_API/rest/robots/index`) disallows only back-office paths.
Plus's terms for account holders (*Algemene voorwaarden*, 5.1) forbid
reproducing, publishing or adapting the website's information without
permission, except for personal household use. That is a general copyright
clause, not Jumbo's Database Directive one, and we hold no account.
**Decision, 2026-10-14:** the project owner, shown it, chose to archive Plus.

**No EANs, by decision.** Only the product-detail action carries an EAN, and
its answer also holds ingredients, nutrients and supplier marketing text, which
a screen service cannot leave out. It is not archived (ADR-0003). Plus joins
Exact Products only as likely the same, as Dirk does. The list and menu
answers name Plus-hosted image URLs; they are archived verbatim and never
fetched or read.

**Plus's own figures can disagree with its wording.** Pears labelled
"1.69 PER KILO" carry an Offer price of 1.49, on Plus's own product page too.
Both are stored as sent, and no price is derived from wording (ADR-0002).
"Gratis bezorging BIJ 10.00 EURO" appears as a promotion on Products and is a
delivery term, not an Offer; ingest drops it, as for Jumbo.

### Lidl — Offers only, verified live, honest agent accepted

Added on 2026-10-14 (#28). **Lidl publishes no regular prices online.** Its
product sitemap (`/p/export/NL/nl/product_sitemap.xml.gz`) lists 13,255 pages,
food included, and each says `"availability": "InStoreOnly"` with no price.
The one place Lidl prices food is its offers page, which is what is archived:

- `GET /c/aanbiedingen/a10008785` (`/aanbiedingen` redirects there): one
  server-rendered page, step `offers`. Every product tile carries a
  `data-grid-data` attribute holding JSON: title, Lidl's article numbers
  (`erpNumber`, `ians`), category path, pack, the price, the price it was,
  discount, first and last day in store, and a separate Lidl Plus price.

A day is **one request, about 90 KB stored**: 142 products on 2026-10-14, 134
of them food. The page loads nothing more in a browser and has no paging.
Prices are national: all six of Lidl's regions name one price list.

**Access and terms.** `robots.txt` allows the page; it disallows
`/user-api/`, `?offset=`, `?id=` and search. Lidl's general terms are
webshop sales terms, with nothing on reuse or automated access.

**Three kinds of product on the page**, read in `src/ingest/readers/lidl.ts`:

- Reduced: the price it was is the Shelf Price, the price the Offer price.
- At its price, nothing struck through (a week's bakery, a themed range): a
  Shelf Price, and no Offer.
- **Reduced with the Lidl Plus app** (48 of 142 only with it): a Lidl Plus
  price and the price it was. The Shelf Price is the price it was, and the
  Offer price the Lidl Plus one, wherever it is lower than the price for
  everyone. **Decision, 2026-10-14:** the owner chose to count every Chain's
  card and app prices as if the shopper held them, and to say so on the page
  and in the digest ("Gerekend alsof je Lidl Plus hebt"). The wording names
  the app ("-35% · 1.29 met Lidl Plus").

An Offer not yet in store (from Thursday or Friday) keeps today's price, and
its own price only in its wording. About a third of the products state no
pack anywhere, on this page or their product page (fresh produce, soups),
so they have no Unit Price. Lidl's key facts list the pack as a bullet of its
own ("355 g"); only such a bullet is read, never the rest of the text
(ADR-0003). Image URLs are on every tile, archived verbatim and never read.

**Regular prices from a third party, not archived.** boodschaapje.nl indexes
about 21,700 Lidl products with prices, and checkjebon.nl republishes them.
Its names are till-receipt style ("Halfvolle melk houd.") and its prices match
Lidl's regular price, some out of date, so they appear to come from receipts.
They are not what Lidl said. **Decision, 2026-10-14:** the owner wants Lidl's
own source, so only the offers page is archived.

### Hoogvliet — working, verified live, honest agent accepted

Added on 2026-10-14 (#29). hoogvliet.com now redirects to **hoogvliet.nl**, a
Next.js storefront over Magento, served by Vercel. Its category listings come
from a search service (Tweakwise) rendered into each page, and the pages then
ask Magento's GraphQL, proxied at `/api/graphql`, for those Products by sku.
That GraphQL answers only a sku filter (a search, a category or an empty
filter returns `products: null`), so the Sweep lists every sku first:

- `GET /sitemap-catalog.xml`, step `sitemap`: every category page and
  product page; a product page's URL ends in its nine-digit sku. 9,490 skus
  on 2026-10-14.
- `POST /api/graphql`, steps `products/from-<first sku>`: `GetProducts`
  filtered by `sku: { in: [...] }`, a hundred skus at a time.

A day is **96 requests, about 2.5 minutes at the default pace, 1.5 MB
stored**. Prices are national: no request names a Store.

**Only the fields we use are asked for.** Every per-Product fact sits in a
`metadata` blob that also holds ingredients, nutrients and supplier text.
`metafield(key: "...")` returns one of them by key, so the query names
twelve (EAN, brand, pack, Hoogvliet's own Unit Price, online only, ...) and
never the blob; the guard refuses `metadata`, `voedingswaardetabel`,
`supplier_info` and Magento's image fields (ADR-0003).

**Two kinds of row.** A SimpleProduct is a Product (8,283). A GroupedProduct
is a tile in the weekly folder (1,206): sku 202642031 is 2026, week 42, tile
31, with its headline ("Hak"), wording, price and dates, from last week to
seven weeks ahead. A Product on Offer names its tile in `promotion_id`; the
tile lists no Products, so a tile for a later week is an Offer with none
until its week begins. Offer days are Wednesday to Tuesday.

**Access and terms.** `robots.txt` disallows `/INTERSHOP/` and
`/intershop*` (the old storefront), `/search` and sorted listings, and
blocks a list of named crawlers; neither path used here is disallowed.
Hoogvliet's *Algemene voorwaarden*, Article 9, forbid reproducing,
publishing or adapting the websites' information without permission, except
for personal use: the same general copyright clause as Plus's, not Jumbo's
Database Directive one. **Decision, 2026-10-14:** the project owner, shown
it, chose to archive Hoogvliet.

**Online only.** One Product (a sunscreen) is marked
`productkenmerken_online_only`, and ingest passes it over. `webshop` 0 or 2
means not orderable online, and those Products are in Stores.

### DekaMarkt — working, verified live, honest agent accepted

Added on 2026-10-14 (#30). DekaMarkt belongs to Detailresult Groep, as Dirk
does, and its Nuxt site asks the same gateway software at
`https://web-deka-gateway.dekamarkt.nl/graphql`. The Sweep is Dirk's, from
the shared `src/archive/chains/detailresult.ts`: departments, then each web
group's Product ids priced at one Store, then each department's Offers.
Introspection is off here; the fields were read from the site's scripts and
each was tried. Dirk's `singleUsePlasticValue` does not exist on this
gateway and is not asked for.

**Store 283 is no shop.** It is the site's default, "Volledig assortiment",
shown before a visitor picks a Store: every Product any DekaMarkt stocks.
**Prices are national.** Six real Stores (1, 117, 118, 119, 120, 200)
priced every Product they stock as 283 does, and listed the same 138 Offers.
So the Sweep asks for 283 only, and ingest records no Store.

**The two gateways share one catalogue**: the same departments, web groups
and Product ids. Prices are DekaMarkt's own. Of 188 Products sold at both
(a sample from 12 web groups, mostly fresh produce, 2026-10-14), 54 cost
the same, 119 less at Dirk and 15 less at DekaMarkt. Del Monte bananas cost
EUR 1.15 a kilo at Dirk and EUR 1.99 at DekaMarkt.

Web groups list about 122,000 Product ids between them, about one in nine
stocked; the rest come back `null` and are kept, as at Dirk. The gateway
prices a thousand ids in about 50 ms, so a request asks for a thousand:
about 330 requests a day, where Dirk's hundred would be 1,400.

**Access and terms.** `robots.txt` blocks a list of named crawlers,
disallows four `/misc/` pages and allows the rest; the gateway is on
another host. DekaMarkt's *Algemene voorwaarden* cover its WiFi, self-scan
and gift cards and say nothing of the website. Its disclaimer
(`/meer/over-ons/disclaimer`) says only that the intellectual property in
the site's materials rests with DekaMarkt and its licensors; no clause
addresses automated access or reuse. **Decision, 2026-10-14:** the project
owner, shown it, chose to archive DekaMarkt.

### Aldi — working, verified live, honest agent accepted

Added on 2026-10-14 (#31). aldi.nl is Aldi Nord's Next.js storefront. Its
Products live in an Algolia index (`an_prd_nl_nl_products2`, application
`2HU29PF6BH`), which the pages query from the browser with a public,
search-only key in the site's own scripts; each category page and both
Offer pages (`/aanbiedingen.html`, `/aanbiedingen-volgende-week.html`)
embed the hits of such a query. The Sweep asks the index itself, with no
filter, a thousand hits a page: **four requests a day**, about 300 KiB, a
few seconds.

Why not the pages: the 214 category pages list 2,568 Products and miss
1,224 of the index's 3,794. Action articles ("OP=OP", while stock lasts)
are filed under an `offer` category no page lists, and only this and next
week's appear on the Offer pages; the rest would be one product page each.
The records are the same ones the pages embed.

Only the fields used are asked for (`attributesToRetrieve`), never `assets`
(Aldi-hosted images) nor `longDescription` (ADR-0003). A record carries the
price now (`currentPrice`, with the Shelf Price as a strike price under an
Offer, and Aldi's own Unit Price) and every Offer it is in from last week to
weeks ahead (`promotionPrices`, with dates). **Prices are national**:
nothing on the site chooses a Store. **No EAN** is published.

**Access and terms.** `robots.txt` on www.aldi.nl allows everything but a
few registration and job pages and filtered URLs; the index is on Algolia's
host, asked with the key Aldi ships to every visitor. aldi.nl has **no
terms of use for the website**: its *Algemene voorwaarden* cover Shop&Go,
the app and competitions, and its disclaimer only sets the conditions of
Offers ("Actieprijzen gelden per stuk bij een multibuy", while stocks last).
No clause addresses automated access or reuse. **Decision, 2026-10-14:** the
project owner, shown it, chose to archive Aldi.

### Spar — assessed, not archived

Assessed on 2026-10-14 (#11) and dropped by the owner the same day: Spar is
among the most expensive Chains, and its prices differ per Store, so it adds
little to a comparison meant to find where to shop cheaply. What was found,
so it need not be found again:

- `robots.txt` allows `/` and explicitly `/remote/store/select/*`; it disallows
  the rest of `/remote/*`, `/betalen/*`, `/build/*` and search (`*?term`).
- Category pages (`/boodschappen/<category>/?p=N`, cumulative, 36 per page)
  carry every Product's price, brand, name, pack and category path in each
  tile's `data-ga-product-data` JSON. About 9,000 Products in 16 categories,
  so a day would be roughly 30 requests.
- **EANs are only on product pages** (schema.org `gtin13`), one page per
  Product, about 60 KB each: 8,829 in the product sitemap.
- **Prices are per Store.** The listing with no Store chosen is the full range
  at Spar's standard prices. Selecting a Store (`GET /remote/store/select/<id>/`,
  a cookie) narrows the range to what it stocks (184 to 488 dairy Products in
  a sample of eight) and changes some prices: up to 18 of 247 dairy Products,
  halfvolle melk EUR 0.83 by default against EUR 1.09 in Heelsum.
- **No Offers are readable.** Product pages say Offers "are not shown with
  the products but are applied in the basket", and the Offers page lists
  nothing, with or without a Store.

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

### Which machine runs it

GitHub's own runners, until the repository variable `ARCHIVE_RUNNER` says
otherwise. The repository is private, and GitHub Free gives private
repositories 2,000 Actions minutes a month. A full day of Dirk and Jumbo bills
about 100, since each Chain's job is billed separately; Vomar's job adds about
3 more, mostly setup, and Plus's about 40. So a daily schedule
would be blocked around the 20th of each month. Every blocked day is price
history lost for good (#24).

So the owner's Raspberry Pi runs it as a self-hosted runner, where minutes
are free. Only the machine changes: the workflow, schedule, logs and usage
guard are the same, and R2 stays the durable copy. On the Pi, as the user
the runners should run as:

```sh
./scripts/setup-pi-runner.sh
```

It checks the OS is 64-bit, installs the AWS CLI and the runner's
dependencies, and registers one runner per Chain as a service. Each runner
takes one job at a time, so with one runner per Chain they sweep in parallel.
It then sets `ARCHIVE_RUNNER` to `["self-hosted","pi"]` and starts a run.
`gh variable delete ARCHIVE_RUNNER` moves the archive back to GitHub's runners.

### When a morning is missed

`.github/workflows/archive-watch.yml` runs at 08:00 UTC on GitHub's runners
(about a minute a day) and goes red unless each Chain's manifest for today is
in R2 and passes `archive:check`. GitHub emails the owner about a failed
scheduled run. It exists because the archive cannot report its own absence:

- GitHub started the first scheduled run 5 hours 10 minutes late, on
  2026-10-14: due at 04:30, created at 09:40 UTC. Scheduled runs are best
  effort, and a delay that long looks the same as a skip until it ends.
- A job waiting for a Pi that is off sits queued with no error until GitHub
  drops it.

The Chains still serve that day's prices when it fires, so the day can still be
captured: `gh workflow run archive.yml -f chain=all`. That is safe even if the
scheduled run is only late: runs queue behind each other, and each resumes
whatever part of the day is already in R2, carrying the manifest's steps and
request counts forward. The watchdog's list of Chains must match the
archive workflow's.

Do **not** commit the archive to git — `.gitignore` excludes `/archive/`
(root-anchored, so it does not also swallow `src/archive/`), and `.env`.
