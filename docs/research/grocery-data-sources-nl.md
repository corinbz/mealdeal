# Dutch Grocery Price Data: Source Viability Assessment

**Research date / access date for all sources: 2026-10-13.** All claims dated this way unless stated otherwise.

> **Correction, 2026-10-13 (added after publication).** Albert Heijn was **under attack** during the research window. That is why every request to AH failed, and it means this document established no posture for AH at all — neither that it resists a server-side crawler nor that it welcomes one. Flag 2, the acquisition-tier table, the per-chain table's AH row and open question 1 are all corrected inline below. The original observations are kept as recorded; only the conclusions drawn from them are withdrawn.

**Scope.** Whether the data foundation for a Dutch multi-chain grocery price aggregator ("mealdeal") is obtainable, legally defensible, and matchable across chains. This document evaluates *facts about data sources*, not the product idea or the business case.

**Method note.** Where possible I hit endpoints and `robots.txt` directly from this machine and recorded the live responses. Where a chain blocked me, I say so and fall back to open-source client code as evidence of endpoint *shape*, marked as such. Raw live-response evidence is quoted inline. One caveat applies throughout: my requests came from a datacenter IP, which some chains treat differently than a residential or mobile-app client.

---

## Bottom line

### (a) Can price data be obtained, for which chains, by what mechanism?

**Yes, for the large majority of the market, and for two major chains it is close to trivial.**

The single strongest finding: **Jumbo operates an unauthenticated, unthrottled public GraphQL endpoint at `https://www.jumbo.com/api/graphql` that returns, in one query, the EAN-13, current price, promotional price, normalised unit price, and promotion mechanics for any product — plus a forward-looking weekly offers feed.** I verified this live. Example response (abridged, live 2026-10-13):

```json
{"sku":"59938PAK","title":"Heineken Premium Pilsener Bier Draaidop Fles 12 x 250ml",
 "ean":"8712000030957",
 "price":{"price":1399,"promoPrice":1049,"pricePerUnit":{"price":350,"unit":"l"}},
 "promotions":[{"id":"3020974","tags":[{"text":"25% korting"}]}]}
```

The top-level `promotions` query returned offers whose `endDate` was `2026-10-20` — i.e. **next week's offers are visible before they start**, which is exactly what an offer-driven recipe feature needs.

**Dirk van den Broek** is the second near-trivial case: `https://t1-web-gateway.dirk.nl/graphql` is unauthenticated **with GraphQL introspection left enabled**, exposing a 44-field query root including `searchProducts`, `productsAssortment`, `listOffers`, and — notably — `productsByDate(priceDate, ...)` and `listOffersByDate`, i.e. a **historical price** facility. I retrieved live per-store prices.

Breaking the twelve target chains into tiers by acquisition difficulty:

| Tier | Chains | Mechanism |
|---|---|---|
| **Trivial** (open API, verified live) | Jumbo, Dirk | Unauthenticated GraphQL |
| **Straightforward** (server-rendered structured data, verified live) | Vomar, Spar | Vomar: `primaryEan`/`additionalEans`/`price` in SSR Nuxt payload. Spar: schema.org `gtin13` + full product sitemap |
| **Unassessed** (chain was under attack; see correction at flag 2) | Albert Heijn | `api.ah.nl` mobile API is well documented by third-party clients. Every request from this machine failed, but AH was under attack at the time, so **nothing was learned about its normal posture** |
| **Reachable, bot-managed** | Jumbo's legacy `mobileapi.jumbo.com` | Akamai Bot Manager cookies observed; superseded by the open web GraphQL anyway |
| **Requires an authenticated customer account** | Picnic | Login + possible 2FA; no EAN exposed |
| **Opaque SPA, no endpoint found** | Plus, Coop, Hoogvliet | Platform identified, API not recovered within this investigation |
| **No online price data exists to obtain** | Lidl, Aldi, Nettorama | These chains do not publish shelf prices online |

The last row is the most important structural finding and is covered under project-killers below.

### (b) Is cross-chain product matching tractable?

**For branded goods: yes, and better than expected — because several chains expose GTIN/EAN directly.** I verified EAN exposure live for Jumbo (GraphQL `ean` field *and* schema.org `gtin13`), Spar (`gtin13`), and Vomar (`primaryEan` plus an `additionalEans` array). Albert Heijn has a **dedicated GTIN lookup endpoint** (`/mobile-services/product/search/v1/gtin/{barcode}`) and its web search API returns a `gtins` array. Where EANs are present on both sides, matching is a database join, not an ML problem.

**For own-brand (huismerk) goods: no, and there is no shortcut.** This is matching by construction impossible on identifiers — AH Basic, Jumbo Huismerk and Lidl own-brand products have disjoint EAN ranges and no shared referent. I searched for an existing dataset or published method for own-brand equivalence and **found none that is usable**: the closest artefact, the Retail-786k visual entity-matching dataset, is licensed CC BY-NC-ND 4.0 (non-commercial, no derivatives) and its own paper does not address private label at all.

**And a separate, nastier problem:** Dirk — one of the two chains with the most open data — **does not expose EAN at all.** Its `ProductDto` carries only `productId` and `productNumber`. Picnic likewise exposes no EAN. So the two chains that are easiest to *acquire* sit at opposite ends of the *matchability* spectrum.

Net: matching is tractable for the branded core of the basket, and requires a hand-maintained equivalence table (or accepted imprecision) for own-brand. Every operating competitor I examined resolves this the same way — by fuzzy name matching with an explicit "comparable products" mode, not by identifier.

---

## Flags: project-killers and forced changes of approach

These are ordered by how much they should change the plan.

### 1. "All big Dutch supermarket chains" is not achievable. Lidl, Aldi and Nettorama do not publish prices online.

This is a scope-defining constraint, not a technical obstacle to be engineered around.

- **Lidl**: its product pages render schema.org `Product` JSON-LD with `"availability": "InStoreOnly"` and **no `price` field at all**. I parsed the Nuxt payload for `https://www.lidl.nl/p/appelmoes/p10000029` and found the product object *has* an `eans` key — but it was an empty array, and the `price` object carried currency metadata with no amount:
  ```json
  "price":{"currencyCode":"EUR","currencySymbol":"€","hasStar":false,"hasVat":false,
           "variantsHaveDifferentPrices":false}
  ```
  Lidl's own internal category JSON API (`/q/api/category/...`, discoverable from the Nuxt payload) returned **HTTP 401**.
- **Aldi**: `https://www.aldi.nl/producten.html` exposes no `ld+json` and no price markup. A live JSON backend does exist at `https://webservice.aldi.nl/api/v1/` — it returned a structured error naming an Adobe Experience Manager content path (`/content/aldi/netherlands/nl/web-consumer/producten`) — but I could not find a working product path.
- **Nettorama**: has no webshop. Its "actiefolder" is a **Publitas** iframe (`view.publitas.com/bv-nettorama-verbruikersmarkten/...`). Its sitemap contained no product URLs.

This is independently corroborated by the most mature open-source competitor, whose README lists exclusions with reasons: "LIDL — No online assortment", "Nettorama — No online assortment", and for ALDI "limited assortment due to not all products being available online" ([checkjebon README](https://github.com/supermarkt/checkjebon)).

**Consequence:** a claim of covering "all big Dutch chains" would be false for three of them, including the two discounters a price-conscious user most wants compared. Prices for these chains are only obtainable from the weekly leaflet (PDF/Publitas/Lidl Plus app), which is a fundamentally different and much weaker acquisition problem — covering promoted lines only, not the shelf.

### 2. Albert Heijn — the market leader — could not be assessed at all, because it was under attack.

> **Correction, 2026-10-13 (added after publication).** This flag was originally titled *"is behind Akamai and blocked every request I made"* and read as a forced change of approach. It is not one. AH was **under attack during the research window**, which explains every failure recorded below and invalidates the inferences I drew from them. The heading and the conclusion paragraph are rewritten; the observations are untouched. AH's correct position in this document is **unmeasured**, not hostile — and because it is unmeasured rather than hard, it is the **first** chain to retest, not a deferred one.

Three independent observations from this machine:

- `POST https://api.ah.nl/mobile-auth/v1/auth/token/anonymous` → **HTTP 503** with an Akamai error body: `<P>https://errors.edgesuite.net/102.e9d31702...</P>`. Reproduced with the exact app headers (`x-application: AHWEBSHOP`, `User-Agent: Appie/8.8.2 ...`) used by published clients.
- `GET https://www.ah.nl/producten` → **HTTP 403**.
- `GET https://www.ah.nl/robots.txt` → served an HTML outage page, `<title>Storing - Albert Heijn</title>`, rather than a robots file. A fetch via a second, independent egress also failed (HTTP 500, then 403).

**This was a genuine AH outage: the chain was under attack.** I originally could not distinguish that from IP-based blocking of datacenter traffic and flagged the ambiguity; it is now resolved, and the resolution removes the basis for what I inferred.

Two inferences are **withdrawn**:

- That *"a naive server-side crawler from cloud infrastructure does not get through."* Unsupported. A chain that is down returns 503 to every client, residential or datacenter alike. These responses discriminate nothing.
- That *"any AH integration must budget for bot-management evasion (residential/mobile egress, TLS fingerprint matching, pacing) as an ongoing operational cost."* **Do not design around this.** It is an expensive architectural commitment and nothing observed here supports it. It may still prove necessary — AH does sit behind Akamai, which is a fact about its infrastructure, not about its tolerance of crawlers — but that has to be established by a retest, not assumed from an outage.

What remains true is narrower: AH is fronted by Akamai, and its posture toward automated access is **unknown in both directions**.

**I also could not read AH's `robots.txt` or terms of use at all.** The AH legal posture in this document is therefore a gap, not a finding.

### 3. Innoweb (C-202/12) is squarely aimed at the architecture a comparison aggregator would naturally choose.

The CJEU held that a **dedicated meta search engine** that relays user queries to a protected database "in real time" and re-presents the results **re-utilises the whole or a substantial part** of that database under Art. 7(1) of Directive 96/9/EC. The facts (GasPedaal.nl querying AutoTrack.nl) are a direct structural analogue to a live grocery price comparator.

This forces an architectural decision up front: **a real-time query-passthrough design is the legally worst option.** It is the exact fact pattern the Court condemned. A periodic-snapshot design that builds an independent index is not immune, but it is further from the holding and lets you reason separately about substantiality and about harm to normal exploitation.

### 4. Jumbo's and Picnic's terms of service prohibit precisely this activity, in database-right language.

Jumbo's Algemene Voorwaarden, Article 9(3), is not boilerplate — it is drafted against the Database Directive. Verbatim ([jumbo.com/service/algemene-voorwaarden](https://www.jumbo.com/service/algemene-voorwaarden)):

> "Het is verder niet toegestaan: i. een substantieel gedeelte van de inhoud van de Website en/of Applicaties op te vragen en her te gebruiken en/of niet-substantiële delen van de inhoud van de Websites en/of Applicaties herhaald en systematisch op te vragen en her te gebruiken; en/of ii. enige soft- en/of hardware matige tools en/of oplossingen (in eigen beheer of beschikbaar gesteld door derden) te gebruiken, voor zover deze gericht zijn op het overnemen van enige via de Website en/of Applicaties toegankelijke gemaakte informatie, dan wel om de Website en/of Applicaties via robots of op enigerlei andere wijze te spideren, scrapen, doorzoeken of op andere oneigenlijke wijze te gebruiken."

Picnic's Article 13 is almost word-for-word identical ([picnic.app/nl/algemene-voorwaarden](https://picnic.app/nl/algemene-voorwaarden/)):

> "(a) een substantieel gedeelte van de inhoud van de app en/of website opvragen en hergebruiken en/of niet-substantiële delen van de inhoud van de app en/of website herhaald en systematisch opvragen en hergebruiken; en/of (b) soft- of hardwaretools (laten) gebruiken die erop gericht zijn door Picnic toegankelijk gemaakte informatie over [...]"

Why this matters more than it looks: **Ryanair v PR Aviation (C-30/14) makes these clauses enforceable even if the underlying database turns out to be unprotected.** See §2. The result is a pincer — protection or no protection, there is a route to liability. The open technical door at `www.jumbo.com/api/graphql` is not a legal permission.

Note the internal tension worth recording: Jumbo's `robots.txt` **explicitly permits** product-listing pagination (`Allow: /producten/*?offSet=`) while its ToS bans scraping. Robots permission is not a licence, but the inconsistency is a real fact about Jumbo's posture.

### 5. GS1 Data Source is not available to you, so there is no canonical master-data backstop.

I had expected GS1 to be the fallback for a clean EAN→product master. It is not. GS1 Netherlands' own description of the product defines the roles narrowly ([gs1.nl](https://www.gs1.nl/producten-services/data-exchange/gs1-data-source/)):

> "Met de GS1 datapool deel je als fabrikant of groothandel eenvoudig productinformatie met al je afnemers. En als retailer, groothandel of zorginstelling heb je snel alle productinformatie die je nodig hebt."

and, decisively, for the recipient side:

> "Met GS1 Data Source beschik je altijd over actuele artikelgegevens van **je eigen leveranciers**." *(emphasis added)*

A price-comparison app is neither a manufacturer/wholesaler nor a retailer with its own suppliers. The data flows only along existing trading relationships, and suppliers publish to a specific recipient's GLN. **The cost is not the barrier** — for the lowest revenue band the published tariff is €291 one-off plus €291/year, plus a €28/year GS1 Contribution ([gs1.nl tariffs](https://www.gs1.nl/producten-services/data-exchange/tarieven/)) — **eligibility is.** Treat GDSN as unavailable unless you can establish a genuine wholesale role.

### 6. The market is saturated with working products that already solved this.

This is not a data-foundation finding, but it emerged from the prior-art work and is too material to bury. I verified **at least eight live Dutch grocery price comparators** on 2026-10-13, several with capabilities beyond what was scoped here (barcode scanning, receipt OCR, price history, basket optimisation across multiple stores). See §3. One of them publishes its entire multi-chain price dataset under MIT licence.

---

## Per-chain summary table

Confidence reflects how directly I verified the mechanism, not how good the chain's data is.

| Chain | Price data mechanism | EAN exposed? | Offers feed? | robots / ToS posture | Confidence |
|---|---|---|---|---|---|
| **Jumbo** | **Open unauthenticated GraphQL** `www.jumbo.com/api/graphql`; also schema.org `gtin13` + `AggregateOffer` on PDPs | **Yes** — `Product.ean` (EAN-13) and JSON-LD `gtin13` | **Yes** — top-level `promotions{id title startDate endDate tags{text} products{sku}}`, incl. next week | robots *allows* `/producten/*?offSet=`; **ToS Art. 9(3) explicitly bans scraping** in database-right terms | **High** (live-verified) |
| **Dirk van den Broek** | **Open unauthenticated GraphQL** `t1-web-gateway.dirk.nl/graphql`, **introspection enabled**; per-store prices; `productsByDate` historical | **No** — only `productId`/`productNumber` | **Yes** — `listOffers`, `listOffersByDate`, `listOffersBySection`; `OfferDto_Response` has `normalPrice`/`offerPrice`/`startDate`/`endDate`/`promotionText` | `robots.txt`: `Allow: /` + sitemap. ToS page not located | **High** (live-verified) |
| **Albert Heijn** | `api.ah.nl/mobile-services/...` with anonymous bearer token; also `www.ah.nl/zoeken/api/products/search` | **Yes** — `/product/search/v1/gtin/{barcode}` lookup; web API returns `gtins[]` | **Yes** — `bonuspage/v1/metadata` → periods → `bonuspage/v1/segment` | **Chain was under attack; all my requests failed (503/403), so posture is unknown — not hostile.** Fronted by Akamai. `robots.txt` and ToS **unreadable** | **Medium** — endpoint shape from library source; **not live-verified** |
| **Picnic** | `storefront-prod.nl.picnicinternational.com/api/15/...`; **requires account login, possibly 2FA** | **No** — zero hits for gtin/ean/barcode across the maintained client's source | Partial — `promo-group-deep-dive` RSC pages | `robots.txt` **disallows `/api/` for GPTBot, ClaudeBot, Google-Extended** et al. **ToS Art. 13 bans scraping** | **Medium** — unauth probe returned `NOT_FOUND`; auth path from active library |
| **Vomar** | **Server-rendered Nuxt payload** on category pages carries full product objects | **Yes** — `primaryEan` + `additionalEans[]` | Folder-driven (`/folders`, "Actiefolder week 42"); no structured feed found | `robots.txt`: `Allow: /`, blocks only MJ12bot/Mirago + `/misc/*`. No ToS found | **High** (live-verified) |
| **Spar** | schema.org `Product` JSON-LD + price in HTML (split across `<span>`s, absent from JSON-LD) | **Yes** — `gtin13` in JSON-LD | Not located; `c-offer__*` markup suggests offer rendering | `robots.txt`: `Allow: /`, `Allow: *channable`, full product sitemap. ToS has no scraping/database clause | **High** (live-verified) |
| **Plus** | Opaque **OutSystems ("ECOP")** SPA; 12.7 KB shell, no JSON-LD. Legacy middleware `pls-sprmrkt-mw.prd.vdc1.plus.nl` is **NXDOMAIN** (dead) | Unknown | Unknown | `robots.txt` served from `/ECP_Robots_API/rest/robots/index`; blocks backoffice paths only. Full product sitemap exists | **Low** — platform identified, API not recovered |
| **Coop** | Opaque **OutSystems** SPA (same ECOP platform as Plus — the two merged). Legacy `api.coop.nl` Intershop REST is **NXDOMAIN** (dead) | Unknown | Unknown | **No `robots.txt`** — `/robots.txt` returns the SPA shell (HTTP 200 HTML) | **Low** |
| **Hoogvliet** | **Next.js** (`__NEXT_DATA__`); sitemap has categories only, no product URLs; `/api/*` probes 404 | Unknown | `sitemap-folders.xml` exists | `robots.txt` disallows `/INTERSHOP/`, `/search`; blocks AhrefsBot, Yandex, Baidu, **CFNetwork**. ToS Art. 9 is generic IP, **no scraping clause** | **Low** |
| **Lidl** | **No online shelf prices.** JSON-LD `Product` has `availability: InStoreOnly`, **no `price`**. Internal `/q/api/category/...` → **HTTP 401** | Field exists (`eans`) but **was empty** for the product tested | Leaflet only (`/c/aanbiedingen/a10008785`) | `robots.txt` disallows `/user-api/*`, `*search?q=*`, `*?offset=*`, `*sort=*` — i.e. the crawl patterns you'd need | **High** that prices are absent |
| **Aldi** | **No online shelf prices** on `aldi.nl`. `webservice.aldi.nl/api/v1/` is live (AEM-backed) but product path not found | Unknown | Leaflet | `robots.txt`: sitemap + narrow disallows; `Disallow: /*?*filters` | **Medium** |
| **Nettorama** | **No webshop.** Leaflet via Publitas iframe | No | Publitas digital leaflet only | `robots.txt`: `Allow: /`, `Disallow: /webcore`. ToS bans reproducing site content | **High** that prices are absent |

---

## 1. Per-chain data acquisition — detail

### No first-party public product/price API exists for any chain

I found no developer portal, partner API, or documented public product/price API for any of the twelve chains. Everything below is either an undocumented app/web backend or structured data embedded in the public site. Treat "official API" as a closed question: there isn't one.

### Albert Heijn

**Endpoint shape** (from source, not live-verified — see flag 2). The canonical flow, consistent across clients from 2022 to 2026:

1. `POST https://api.ah.nl/mobile-auth/v1/auth/token/anonymous` with body `{"clientId":"appie"}` → bearer token. **No user account needed.**
2. `GET /mobile-services/product/search/v2?sortOn=…&page=…&size=…&taxonomyId=…` (page size up to 1000)
3. `GET /mobile-services/product/search/v1/gtin/{barcode}` — **GTIN lookup**
4. `GET /mobile-services/product/detail/v4/fir/{webshopId}`
5. `GET /mobile-services/v1/product-shelves/categories` (+ `/{id}/sub-categories`) for taxonomy crawl
6. Bonus: `GET /mobile-services/bonuspage/v1/metadata` → periods with `urlMetadataList` → `GET /mobile-services/bonuspage/v1/segment?date=…&segmentId=…`

Required headers include `x-application: AHWEBSHOP` and an `Appie/…` user agent.

Evidence, with currency assessed:
- [`bartmachielsen/SupermarktConnector`](https://github.com/bartmachielsen/SupermarktConnector) — MIT, 152 stars, on PyPI as `supermarktconnector`. **Last commit on `master`: 2022-12-06.** Source: [`supermarktconnector/ah.py`](https://github.com/bartmachielsen/SupermarktConnector/blob/master/supermarktconnector/ah.py). Gives the full endpoint set including the bonus iteration.
- [`RashadAnsari/KortingKlok`](https://github.com/RashadAnsari/KortingKlok) — MIT, **pushed 2026-09-14**, Django/Celery scrapers for AH, Jumbo, Lidl. Its [`scrapers/impls/ah.py`](https://github.com/RashadAnsari/KortingKlok/blob/master/backend/apps/products/scrapers/impls/ah.py) uses the identical anonymous-token flow with `User-Agent: Appie/8.22.3`, crawling by `taxonomyId` at `PAGE_SIZE = 1000`. **This is the best evidence that the flow still worked in late 2026.**

**Web search API and field inventory.** A separate client documents `https://www.ah.nl/zoeken/api/products/search` (params `query`, `size` up to 1000, `page`) with a recorded response showing fields highly relevant here — `gtins` as an **array** of EAN-13s, a unit-price block, and Nutri-Score:

```json
"price": {"unitInfo": {"price": 8.3, "description": "KG"}, "now": 2.49, "unitSize": "300 g"},
"itemCatalogId": 603158, "brand": "Lay's", "hqId": 30920,
"gtins": [8710398526694, 8710398526410],
"properties": {"nutriscore": "C", "lifestyle": ["zonder_melk"]}
```

Source: [`JariRoossien/SupermarketScraper/api.md`](https://github.com/JariRoossien/SupermarketScraper/blob/master/api.md). **Caveat: that repo was last pushed 2024-01-20, and I could not confirm the shape live.** Note `gtins` is plural — AH maps one webshop item to multiple barcodes, which is good for matching recall and means your schema should model EAN as many-to-one from the start.

Other AH clients found, for completeness: [`rkalis/AppiePy`](https://github.com/rkalis/AppiePy) (**archived 2021-08-31**), [`MHilhorst/albertheijn`](https://github.com/MHilhorst/albertheijn), [`LouayCoding/albert-heijn-api`](https://github.com/LouayCoding/albert-heijn-api), [`TobiasS1402/appieSniper`](https://github.com/TobiasS1402/appieSniper), [`Forceu/barcodebuddy`](https://github.com/Forceu/barcodebuddy) (`incl/lookupProviders/ProviderAlbertHeijn.php`).

**robots.txt / ToS: could not retrieve.** See flag 2.

### Jumbo

**The legacy mobile API is bot-managed; the current web GraphQL is wide open.** This distinction is the single most useful operational fact in this document.

`https://mobileapi.jumbo.com/v17/...` (the endpoint in the 2022-era `SupermarktConnector`) timed out or failed for me; a `HEAD` request returned 404 **plus Akamai Bot Manager cookies**:

```
Set-Cookie: _abck=AC576B7A87B7B23C82103BD67C902500~-1~YAAQhkd7XFRKIvGgAQAAewRgNBCE…
Set-Cookie: bm_sz=3D2BAD57EE5C5D67860CB26C5B0B54A2~YAAQhkd7XFVKIvGgAQAAewRgNAFgjJ3…
```

(`_abck` and `bm_sz` are Akamai Bot Manager's signature cookies.)

By contrast `https://www.jumbo.com/api/graphql` answered plain `curl` immediately, with no bot challenge. The endpoint and header set came from [KortingKlok's `jumbo.py`](https://github.com/RashadAnsari/KortingKlok/blob/master/backend/apps/products/scrapers/impls/jumbo.py) (`apollographql-client-name: JUMBO_WEB-cms`, `x-source: JUMBO_WEB-cms`); I then extended it.

**Introspection is disabled** (`{"errors":[{"message":"introspection has been disabled","extensions":{"code":"INTROSPECTION_DISABLED"}}]}`), but field existence is still discoverable: GraphQL validation errors distinguish a field that exists from one that doesn't. Probing confirmed `ean` **exists** on `Product`, while `gtin`, `gtin13`, `barcode` and `globalTradeItemNumber` all returned `Cannot query field … on type "Product"`.

Verified-working queries:

- **Products with everything needed.** `searchProducts(input: ProductSearchInput!)` — requires `searchType` (e.g. `"keyword"`), plus `searchTerms`, `offSet`, `limit`. Selecting `{sku title ean price{price promoPrice pricePerUnit{price unit}} promotions{id tags{text}}}` returns all of it. Prices are integer cents. **`pricePerUnit` means unit-price normalisation is solved for Jumbo at source** — no pack-size parsing needed.
- **Category tree.** `categoriesTree(exclusions: [String!], depth: Int)`.
- **Weekly offers.** Top-level `promotions{id title subtitle startDate endDate tags{text} products{sku}}`. Live sample:
  ```json
  {"id":"3021014","title":"Redefine Meat, Oma's of Impossible Meat vleesvervangers",
   "startDate":"2026-10-07T00:01:00+02:00[Europe/Amsterdam]",
   "endDate":"2026-10-13T23:59:59+02:00[Europe/Amsterdam]",
   "tags":[{"text":"1+1 gratis"}],
   "products":[{"sku":"620416TRA"},{"sku":"710779STK"}, …]}
  ```
  `promotionTabs` also exists. Crucially, the result set included promotions running `2026-10-14` to `2026-10-20` — **next week, retrieved on 2026-10-13.** Offer mechanics arrive as human-readable tags (`"1+1 gratis"`, `"25% korting"`, `"voor 19,99"`, `"Alleen online"`), so you will need a parser for these, not a clean numeric discount field.
- **Recipes.** `recipes`, `recipe(id: String!)` and `searchRecipes(input: RecipeSearchInput!)` all exist on the query root.

**Fallback: schema.org on product pages.** PDPs carry clean `Product` JSON-LD:

```json
{"@type":"Product","brand":{"@type":"Brand","name":"Jumbo"},
 "category":"Zuivel, boter en eieren","gtin13":"8717228611711",
 "name":"Jumbo Verse Halfvolle Melk 1 L","sku":"498518PAK",
 "offers":{"@type":"AggregateOffer","highPrice":1.29,"lowPrice":1.29,"priceCurrency":"EUR"}}
```

**robots.txt** (full, 2026-10-13) — note it *permits* the pagination you'd crawl:

```
User-agent: *
# 1. Pagination
Allow: /recepten/*?offset=
Allow: /producten/*?offSet=
# 2. Internal search
Disallow: /producten/*?searchType=keyword&searchTerms=
Disallow: /recepten/*?searchTerms=
# 3. Log-in / personal pages
Disallow: /mandje/
Disallow: /mijn/
Disallow: /bestellingen/
Disallow: /recepten/favorieten/categorieen/
```

**ToS: prohibits scraping.** See flag 4 for the verbatim Article 9(3).

### Dirk van den Broek

**The most open chain found, and with capabilities no other chain offers.**

`robots.txt` is maximally permissive:
```
User-agent: *
Allow: /
Sitemap: https://www.dirk.nl/sitemap.xml
```
The sitemap index yields `products-sitemap.xml` with complete product URLs and `lastmod` timestamps (sampled entries carried `2026-10-13T04:01+02:00`, i.e. refreshed daily).

I found the GraphQL gateway by reading the Nuxt bundle `https://www.dirk.nl/_nuxt/BSpN6Jmb.js`, which contains `var od = "https://t1-web-gateway.dirk.nl/graphql"`. (A stale host, `web-dirk-gateway.detailresult.nl`, is NXDOMAIN.) Dirk's site is built by Snakeware — as is Vomar's.

**Introspection is enabled.** `{__schema{queryType{fields{name}}}}` returned 44 root fields:

```
autoCompleteLocation, autoCompleteSearchProducts, basketId, batchPublications,
batchRecipes, batchStores, captchaChallenge, check, filterPublications, filterRecipes,
filterStores, geocodeLocation, getThemeList, giftcardBalance, listDepartments,
listOffers, listOffersByDate, listOffersByIds, listOffersByIdsByDate,
listOffersByImportIds, listOffersBySection, listOffersBySectionByDate, listProducts,
listSingleProduct, listWebGroupProducts, listWebSubGroupProducts, newSearchProducts,
product, productAssortment, productAssortmentByDate, productFilters,
productNumberAssortment, productOffer, products, productsAssortment, productsByDate,
profile, recipe, redirectUrl, savedProducts, searchProducts, shoppingListItems,
shoppingLists, webGroups
```

Key types:
- `ProductDto`: `brand, department, headerText, image, isWeightProduct, logos, maxAmount, packaging, productAssortment, productId, productNumber, subText, webgroup` — **no EAN/GTIN field.**
- `GetProductAssortment_Response`: `endDate, isSingleUsePlastic, normalPrice, offerPrice, priceDate, productId, productInformation, productNumber, productOffer, singleUsePlasticValue, startDate, storeId`
- `OfferDto_Response`: `disclaimerEndDate, disclaimerStartDate, embargoDate, endDate, headerText, image, key, normalPrice, offerId, offerPrice, packaging, priceDate, productIds, products, promotionText, startDate, storeId, subText, textPriceSign, textPriceSign1, textPriceSign2, type`

Note `embargoDate` on offers — Dirk, like Jumbo, models pre-announcement of upcoming offers.

**Prices require a `storeId`** (`productAssortment` returns `null` without one — prices are per-store). Live, with `storeId: 66`:
```json
{"productId":101229,"normalPrice":1.5400,"offerPrice":0.0,
 "priceDate":"2026-10-13T10:34:49.785+02:00","storeId":66,
 "startDate":"2026-10-05T00:00:00.000+02:00","endDate":"2049-12-31T23:59:59.000+01:00",
 "productInformation":{"brand":"Zuivelmeester","headerText":"Zuivelmeester Halfvolle melk",
                       "packaging":"2 liter"}}
```

`packaging` arrives as free text (`"2 liter"`, `"1,5 liter"`, `"6 liter"`) with **no numeric unit-price field** — so unlike Jumbo, Dirk requires pack-size parsing for per-litre/per-kg comparison.

**`productsByDate(priceDate, productIds, storeId)` and `listOffersByDate(priceDate, …)` accept an arbitrary date** — a historical price facility no other chain exposes. Worth validating how far back it reaches before relying on it.

**Recipes with machine-linked ingredients.** This is the best offer-driven-recipe substrate found anywhere:
- `RecipeDetailDto`: `courses, filename, id, ingredients, ingredientsInStock, kitchens, meetsDietGuidelines, metaDescription, persons, preparationTime, steps, tags, tip, title, vegetableScore, vegetarian`
- `IngredientDetail`: `description, position, **productNumber**, quantity, rankNumber`
- `IngredientInStockDetail`: `id, name, **productNumbers**`

Ingredients are already joined to purchasable products by `productNumber`, and recipes carry `meetsDietGuidelines`, `vegetableScore` and `vegetarian` — directly usable for the nutritional-preference angle without building your own classifier.

**ToS:** I could not locate Dirk's algemene voorwaarden (candidate URLs 404'd; the homepage footer exposed no voorwaarden/disclaimer link to my fetch). **Unverified.**

### Picnic

**Authentication is mandatory, and that changes the legal character of access.**

Base URL `https://storefront-prod.nl.picnicinternational.com/api/{version}` (default version `15`), with `x-picnic-agent` and `x-picnic-did` headers. My unauthenticated probes of `/api/15/search` and `/api/15/my_store` both returned:
```json
{"error":{"code":"NOT_FOUND","message":"Not Found","details":{}}}
```

[`MRVDH/picnic-api`](https://github.com/MRVDH/picnic-api) — MIT, 111 stars, **pushed 2026-10-09**, on npm as `picnic-api` — is actively maintained and documents why: "Most endpoints require authentication. Call `auth.login()` to obtain an auth key". If the login returns `second_factor_authentication_required: true`, the flow requires `auth.generate2FACode("SMS")` then `auth.verify2FA(code)`.

Current catalogue endpoints from [`src/domains/catalog/service.ts`](https://github.com/MRVDH/picnic-api/blob/master/src/domains/catalog/service.ts):
- search: `GET /pages/search-page-results?search_term=…`, results extracted via JSONPath `$..sellingUnit`
- suggestions: `GET /suggest?search_term=…`
- product detail: `GET /pages/product-details-page-root?id=…`

Some pages are now **React Server Components** payloads rather than Picnic's "Fusion" JSON, and the library has to branch on which format comes back (`UnexpectedPageFormatError`) — a sign the surface is actively churning and an integration would need maintenance.

**No EAN.** A GitHub code search across the repo for `gtin OR ean OR barcode` returned `total_count: 0`, and the `catalog/types.ts` price fields are `pricePerUnit`, `unitPrice` (a *display string*, e.g. `"€4.81/l"`), `displayPrice` (cents), `priceRanges` — identifiers are Picnic-internal (`s11295810`). Picnic products can only be matched by name/attributes.

**robots.txt is the most pointed of any chain** — it disallows `/api/` and `/{lang}/consumer/` for an explicit list of agents including **`GPTBot`, `Google-Extended` and `ClaudeBot`** alongside Googlebot, Bingbot, Slurp, DuckDuckBot, Baiduspider, YandexBot and ScreamingFrog. Picnic is deliberately signalling against automated and AI-related collection.

**ToS Art. 13 bans scraping** — verbatim in flag 4. Because Picnic access requires accepting those terms to create an account, the contractual position here is the strongest of any chain: you would be a *party* to the contract, not merely a visitor.

### Vomar

**Prices and EANs are already in the server-rendered HTML** — no API reverse-engineering needed. The leaf category page `https://www.vomar.nl/producten/vers/aardappelen` embeds product objects in its Nuxt payload:

```js
mainGroupProducts:[{id:"8454168f-a9c4-4fbd-ac47-35511be2e465", articleNumber:738859,
  description:"Voordeel Aardappelen", contents:"5000", unit:q, price:1.89,
  inWebshop:d, pieceWeight:o, primaryEan:"8717472020932", brand:p,
  additionalEans:["8716401998038","8716447500455","8710251013019", …],
  labels:[], images:[…]}]
```

This is the richest shape of any chain: `price`, **`primaryEan` plus an `additionalEans` array**, `contents` + `unit` (so unit-price normalisation is computable), `articleNumber`, `brand`, `pieceWeight`. Vomar runs on `vomar.snakeware.net`.

Caveats: Vomar is a small regional chain, and [checkjebon's dataset](https://github.com/supermarkt/checkjebon) carries only **887** Vomar products versus 16–17k for AH and Jumbo — so either coverage is genuinely thin or the crawl is partial. `/aanbiedingen` 301-redirects and offers appear folder-driven (`/folders`, "Actiefolder week 42"); I found no structured offers feed.

`robots.txt` blocks only `HenryTheMiragoRobot`, `Mirago`, `MJ12bot` and a few `/misc/*` paths, then `Allow: /`. No algemene voorwaarden page found (`/algemene-voorwaarden` empty; footer exposed only `/privacyverklaring`) — **ToS unverified.**

### Spar

Full product sitemap at `https://www.spar.nl/sitemap/products.xml` (plus `recipes.xml`, `categories.xml`, `stores.xml`), and PDPs carry schema.org `Product` **with `gtin13`**:

```json
{"@type":"Product","brand":"Hak","name":"Hak rode bieten sticks",
 "category":"Groenteconserven, Appelmoes","gtin13":"8720600608834","sku":"1296159",
 "offers":{"@type":"Offer","priceCurrency":"EUR","priceValidUntil":"2026-10-15",
           "availability":"http://schema.org/InStock","seller":{"@type":"Organization","name":"SPAR"}}}
```

**The JSON-LD `Offer` deliberately omits `price`.** The price is in the HTML, split across elements:

```html
<div class="c-offer__price"><div class="c-price">
  <span class="c-price__euro">2</span><span class="c-price__sep">.</span>
  <span class="c-price__cent">95</span>
</div></div>
```

So €2.95 is obtainable but requires DOM assembly, and the JSON-LD alone is insufficient. Note `priceValidUntil` is present and short-dated, implying frequent revalidation. Pack size appears as a separate heading (`<h2 class="c-offer__subtitle">355 Gram</h2>`).

`robots.txt`: `Allow: /`, blocks `/remote/*`, `/betalen/*`, `/build/*`, and interestingly `Allow: *channable` — Channable is a product-feed syndication tool, hinting that Spar already syndicates feeds to third parties (worth pursuing as a *licensed* route). The algemene voorwaarden page contains **no** scraping or database clause — my regex over the full page text for `scrap|spider|geautomatiseerd|robot|crawl|databank|substanti|hergebruik|verveelvoudig|intellectuele eigendom` returned zero matches.

### Plus and Coop — one platform, both opaque

**These two should be treated as a single integration problem.** Plus Holding and Coop Nederland merged, and both now run the same OutSystems application, internally branded **"ECOP"**: both serve `window.OutSystemsApp`, `/scripts/ECOP.appDefinition.js`, `/scripts/ECOP.Init.js`, `/scripts/ECOP.index.js`.

Both legacy APIs documented by [`Repsay/supermarket-mobile-api-connector`](https://github.com/Repsay/supermarket-mobile-api-connector) (MIT, last pushed 2022-11-23) are **dead**:
- Plus: `https://pls-sprmrkt-mw.prd.vdc1.plus.nl/api/v3/` → **NXDOMAIN**
- Coop: `https://api.coop.nl/INTERSHOP/rest/WFS/COOP-COOPBase-Site/-;loc=nl_NL;cur=EUR/` → **NXDOMAIN**

Current state:
- **Plus**: PDP `https://www.plus.nl/product/bokma-graanjenever-fles-1000-ml-100028` returns a **12.7 KB SPA shell** with no `ld+json`. But a **complete product sitemap exists** at `https://www.plus.nl/ECP_Sitemap_Engine/rest/Sitemap/product` (sampled `lastmod` `2026-10-13T01:00:18+00:00`, refreshed daily), and `robots.txt` is served from `https://www.plus.nl/ECP_Robots_API/rest/robots/index`, disallowing only backoffice paths (`/ServiceCenter`, `/Commercetools_Backoffice`, `/ContentfulBackoffice`, `/ECOP_BackOffice`, `/SQL`, …). The `Commercetools_Backoffice` entry indicates **commercetools** as the commerce engine, which usually implies a reachable commercetools HTTP API behind an OAuth client — a concrete next lead.
- **Coop**: `https://www.coop.nl/robots.txt` returns **HTTP 200 with the SPA shell**, i.e. Coop effectively publishes **no `robots.txt`**. Inline JS reveals a GraphQL-ish payload shape (`payload?.data?.Checkout?.LineItemList?.List`).

Both are reachable in principle via OutSystems `POST /screenservices/...` calls, which are discoverable only from live browser traffic. **I did not recover a working product endpoint for either.** Given Plus is a top-5 chain, this is the highest-value remaining technical unknown.

### Hoogvliet

Next.js app (`__NEXT_DATA__`, `buildId: jVQUkDgiSXiMXxUXg0nIz`). `sitemap-catalog.xml` has 10,304 URLs but they are **category pages only** — I found no product URLs and `/product/{id}` 404'd. Probes of `/api/products?q=`, `/api/search?q=`, `/api/product/search?query=` all returned 404 HTML. There *is* an internal `/api/media/file/...` route, so Next.js API routes exist; I didn't find the product one.

`robots.txt` disallows `/INTERSHOP/`, `/intershop*`, `/search`, and sort params — the Intershop paths indicate Hoogvliet runs **Intershop**, the same platform as Coop's dead API, which suggests an `INTERSHOP/rest/WFS/...` endpoint may exist. My two guessed base URLs failed (`api.hoogvliet.com` connection reset; `www.hoogvliet.com/INTERSHOP/rest/WFS/HOOGVLIET-Site/-/categories` → 301). Also notable: it blocks `MJ12bot`, `Vagabondo`, `BaiDuSpider`, `Exabot`, `Yandex`, `AhrefsBot`, **`CFNetwork`** and `TwengaBot` — `CFNetwork` is Apple's HTTP stack default UA, so naive iOS/macOS clients are blocked.

ToS Article 9 is a generic IP reservation ("Alle intellectuele eigendomsrechten met betrekking tot de websites en Webwinkel … berusten bij de Ondernemer") with **no scraping prohibition and no database-right language.**

That said, [checkjebon](https://github.com/supermarkt/checkjebon) carries **7,410 Hoogvliet products**, so a working route demonstrably exists — I just didn't find it.

### Lidl, Aldi, Nettorama

Covered in flag 1. Summary of the live evidence:

- **Lidl** `robots.txt` disallows exactly what you'd need: `/user-api/*`, `*search?q=*`, `*?offset=*`, `*idsOnly=*`, `*productsOnly=*`, `*sort=*`. A gzipped product sitemap *is* published (`https://www.lidl.nl/p/export/NL/nl/product_sitemap.xml.gz`) — so the assortment is enumerable, just not priced. One oddity worth noting: [spaartje.com](https://spaartje.com/supermarkt) claims "Lidl — 18.879 + producten" and checkjebon carries 22,070 Lidl products attributed to **"Lidl (via boodschaapje.nl)"**. So *someone* has a Lidl price source. `boodschaapje.nl` serves a 453-byte Vue SPA titled "Lidl Producten" whose bundle references `openfoodfacts.org/product/`; I could not find its data endpoint (`/api/products` and `/api/lidl` → 404; other paths return the SPA shell). **How Lidl prices are being obtained is an open question** — plausibly the Lidl Plus app or leaflet OCR, but I have no evidence.
- **Aldi** `robots.txt` is permissive but there is nothing priced to crawl. `webservice.aldi.nl/api/v1/` is alive — `products.json` returned a well-formed JSON error (`code: 9021`) rather than a 404 — so an API exists; path unknown.
- **Nettorama** `robots.txt`: `Allow: /`, `Disallow: /webcore`. Its ToS reserves IP generally: "het is niet toegestaan om zonder onze toestemming de op de website vermelde informatie, logo's en afbeeldingen openbaar te maken, te verveelvoudigen en/of te bewerken" ([nettorama.nl/algemene-voorwaarden](https://www.nettorama.nl/algemene-voorwaarden)).

---

## 2. Legal posture for price scraping in the Netherlands / EU

### What is settled, and what is not

**Settled:**
1. Investment in *creating* data does not earn the sui generis database right. Only investment in *obtaining*, *verifying* or *presenting* pre-existing data counts.
2. If a database is **not** protected by copyright or the sui generis right, the Database Directive does not stop the owner restricting its use **by contract**.
3. A real-time dedicated meta search engine over a **protected** database commits "re-utilisation" of a substantial part.

**Not settled:**
- Whether a *specific* Dutch supermarket's product-and-price catalogue qualifies for the sui generis right. This has, as far as I can find, never been litigated. It turns on a factual investment analysis that nobody has run in public.
- Whether a ToS-breach scraping claim against a Dutch grocery aggregator would succeed in practice. **I found no enforcement history at all** (see below).

### The sui generis right and the creating/obtaining distinction

Directive 96/9/EC Art. 7(1) grants the right to a maker who shows "qualitatively and/or quantitatively a substantial investment in either the obtaining, verification or presentation of the contents". Implemented in the Netherlands as the **Databankenwet** ([wetten.overheid.nl BWBR0010591](https://wetten.overheid.nl/BWBR0010591/)), Art. 1(1)(a), which folds the investment test into the definition itself:

> "databank: een verzameling van werken, gegevens of andere zelfstandige elementen die systematisch of methodisch geordend en afzonderlijk met elektronische middelen of anderszins toegankelijk zijn en waarvan **de verkrijging, de controle of de presentatie** van de inhoud in kwalitatief of kwantitatief opzicht getuigt van een **substantiële investering**"

Art. 2(1) grants the producer the exclusive right to authorise:

> "a. het opvragen of hergebruiken van het geheel of een in kwalitatief of kwantitatief opzicht substantieel deel van de inhoud van de databank; b. het herhaald en systematisch opvragen of hergebruiken van in kwalitatief of in kwantitatief opzicht niet-substantiële delen van de inhoud van een databank, voorzover dit in strijd is met de normale exploitatie van die databank of ongerechtvaardigde schade toebrengt aan de rechtmatige belangen van de producent"

(Note: Jumbo's and Picnic's ToS clauses are near-transcriptions of Art. 2(1)(a)–(b). They are asserting the database right contractually.)

**The "spin-off" limit.** Three Grand Chamber judgments of 9 November 2004 settled that investment in *generating* the data doesn't count. The clearest operative text, from **Fixtures Marketing v Oy Veikkaus, C-46/02** ([CELEX 62002CJ0046](http://publications.europa.eu/resource/celex/62002CJ0046)):

> "The expression 'investment in … the obtaining … of the contents' of a database in Article 7(1) of Directive 96/9/EC … must be understood to refer to the resources used to seek out existing independent materials and collect them in the database. **It does not cover the resources used for the creation of materials which make up the contents of a database.**"

Identical holding in **Fixtures Marketing v Svenska Spel, C-338/02** ([CELEX 62002CJ0338](http://publications.europa.eu/resource/celex/62002CJ0338)). **British Horseracing Board v William Hill, C-203/02** ([CELEX 62002CJ0203](http://publications.europa.eu/resource/celex/62002CJ0203)) adds the verification limb:

> "The expression 'investment in … the … verification … of the contents' … must be understood to refer to the resources used, with a view to ensuring the reliability of the information contained in that database, to monitor the accuracy of the materials collected when the database was created and during its operation. **The resources used for verification during the stage of creation of materials which are subsequently collected in a database do not fall within that definition.**"

**Why this matters here, and where it stops helping.** A supermarket's *prices* are data it creates — it sets them. On the Fixtures/BHB reasoning, the cost of running a pricing department is investment in *creation*, not *obtaining*, and so does not count toward the right. That is a genuinely good argument that the price layer specifically is thin ground for a sui generis claim.

But do not over-read it. The catalogue is not only prices. Product descriptions, nutrition data, allergen data, images and GTINs are **obtained** from suppliers (in practice via GDSN), and the cost of ingesting, cleaning and verifying that supplier data is squarely "obtaining" and "verification". So the realistic position is that the catalogue is a **mixed** database, where the obtained/verified portions may well attract protection while the price layer alone probably does not. A court has not tested this, and the analysis would be chain-specific. **Treat "prices aren't protected" as an argument you'd have to win, not a fact you can rely on.**

### Ryanair v PR Aviation (C-30/14) — why ToS survives even without database protection

Judgment of the Second Chamber, **15 January 2015**, on a reference from the **Hoge Raad der Nederlanden** (decision of 17 January 2014). Full text: [CELEX 62014CJ0030](http://publications.europa.eu/resource/celex/62014CJ0030) · [curia docid 161388](https://curia.europa.eu/juris/document/document.jsf?docid=161388&doclang=EN).

The facts are the closest analogue in EU case law to what mealdeal would do (para. 15):

> "PR Aviation operates a website on which consumers can search through the flight data of low-cost air companies, compare prices and, on payment of commission, book a flight. It obtains the necessary data to respond to an individual query by automated means, inter alia, from a dataset linked to the Ryanair website also accessible to consumers."

Ryanair's terms — accepted by ticking a box (para. 16) — prohibited "[t]he use of automated systems or software to extract data from this website … for commercial purposes, ('screen scraping') … unless the third party has directly concluded a written licence agreement with Ryanair".

**Operative part, verbatim:**

> "Directive 96/9/EC … must be interpreted as meaning that it is not applicable to a database which is not protected either by copyright or by the sui generis right under that directive, so that Articles 6(1), 8 and 15 of that directive do not preclude the author of such a database from laying down contractual limitations on its use by third parties, without prejudice to the applicable national law."

Reasoning (paras. 36–39): Art. 6(1) sits in the copyright chapter and so doesn't apply to databases not protected by copyright; Art. 8 sits in the sui generis chapter and so doesn't apply absent that right; and Art. 15 — which voids contrary contractual provisions — "explicitly refers only to Articles 6(1) and 8". Therefore (para. 39):

> "it is clear from the purpose and structure of Directive 96/9 that Articles 6(1), 8 and 15 thereof, which establish mandatory rights for lawful users of databases, are not applicable to a database which is not protected either by copyright or by the sui generis right under that directive, so that it does not prevent the adoption of contractual clauses concerning the conditions of use of such a database."

**The pincer.** Databankenwet Art. 3 gives a lawful user a floor — the producer "mag de rechtmatige gebruiker … niet verhinderen in kwalitatief of kwantitatief opzicht niet-substantiële delen van de inhoud ervan op te vragen of te hergebruiken", and Art. 3(2) makes that non-derogable by contract. **But Ryanair establishes that this floor only exists if the database is protected in the first place.** So:

- Database **protected** → Art. 3 floor applies, but Art. 2(1) exposes you to an infringement claim for substantial or repeated-systematic extraction, and Innoweb applies to a live meta-search design.
- Database **not protected** → no Art. 3 floor, and the ToS prohibition is enforceable as plain contract.

Winning the "it's not a protected database" argument therefore does not get you out; it moves you from an IP claim to a contract claim. This is the central legal finding of this document.

One mitigating nuance worth noting and testing with counsel: Ryanair's clause bound a user who had **ticked a box**. For a chain whose ToS you never affirmatively accepted (no account, no click-through), formation of contract is a live question — browsewrap enforceability is weaker than clickwrap. This cuts differently per chain: **Picnic requires an account, so you would unambiguously be contractually bound**; Jumbo's webshop terms are click-accepted at order time but arguably not merely by fetching `api/graphql`. I have not researched Dutch formation doctrine on browsewrap and flag it as an open legal question.

### Innoweb v Wegener (C-202/12) — the meta-search holding

Judgment of the Fifth Chamber, **19 December 2013**, on a reference from the **Gerechtshof te 's-Gravenhage**. Full text: [CELEX 62012CJ0202](http://publications.europa.eu/resource/celex/62012CJ0202).

Facts (paras. 8–9): Wegener's AutoTrack.nl carried a daily-updated list of 190,000–200,000 second-hand cars, ~40,000 of them exclusive to the site. Innoweb's GasPedaal.nl was a meta search engine that "uses search engines from other websites, transferring queries from its users to those other search engines".

**Operative part, verbatim:**

> "Article 7(1) of Directive 96/9/EC … must be interpreted as meaning that an operator who makes available on the Internet a dedicated meta search engine such as that at issue in the main proceedings **re-utilises the whole or a substantial part of the contents of a database protected under Article 7**, where that dedicated meta engine:
> — provides the end user with a search form which essentially offers the same range of functionality as the search form on the database site;
> — 'translates' queries from end users into the search engine for the database site 'in real time', so that all the information on that database is searched through; and
> — presents the results to the end user using the format of its website, grouping duplications together into a single block item but in an order that reflects criteria comparable to those used by the search engine of the database site concerned for presenting results."

The Court read "re-utilisation" broadly (paras. 33–38) and grounded it in recitals 39, 42 and 48 — including the concern that the right covers "not only … the manufacture of a parasitical competing product but also … any user who, through his acts, causes significant detriment … to the investment".

Critically, the Court **rejected the "we only link, users still click through" defence** (paras. 44–45):

> "The risk that the making available on the Internet of a dedicated meta search engine … deprives the database maker of revenue cannot be ruled out by force of the argument that, in order to have access to all the information relating to a result found in a database … it is still necessary, as a rule, to follow the hyperlink to the original page on which the result was displayed."

— because the displayed information "enables the end user, to some extent, to sort the results found and to decide that he does not need further information on a particular result."

**Reading this across to mealdeal.** A grocery comparator that shows name, price and pack size satisfies exactly the substitution concern the Court identified: the user gets what they need and never visits the chain's site. Two distinctions limit the damage, and both should inform the design:
1. Innoweb is expressly conditioned on the source being "a database **protected under Article 7**". If the catalogue isn't protected, Innoweb doesn't bite (though Ryanair then does).
2. The holding is tightly drawn around **real-time query translation**. A periodic-snapshot aggregator with its own index and its own ranking does not match limbs two and three of the operative part. This is the single most actionable legal point in this document: **do not build live query passthrough.**

### Are prices copyrightable? And what about photos and descriptions?

Three distinct layers, with sharply different risk:

- **Raw prices and EANs: not copyrightable.** A price is a fact, and a 13-digit GTIN is a fact. Copyright protects original expression; neither qualifies. (Database *right* is the separate question above — and under Fixtures/BHB, prices as self-created data are the weakest candidate for it.)
- **Product photographs: protected, and the clearest infringement risk in the whole project.** Photographs attract copyright as a matter of course, and the ToS clauses expressly reserve them — Jumbo Art. 9(2) names "de teksten, foto's, filmpjes en software"; Picnic Art. 13 names "logo's, software, teksten en beelden". **Do not copy or hotlink chain product images.** This is the easiest claim for a chain to bring, needs no database-right theory, and is trivially provable. Use your own imagery, or CC-BY-SA images from Open Food Facts with correct attribution.
- **Product descriptions: probably protected, and often not even the chain's to license.** Marketing copy is plausibly an original work. Worse, descriptions usually originate from the *manufacturer* via GDSN, so the chain may be a licensee rather than the owner — meaning permission from the chain wouldn't clear it anyway. Store identifiers, prices and sizes; do not republish description text.

The practical conclusion: **a price-and-identifier-only dataset is dramatically safer than one that mirrors the full product page.** Let that shape the schema from day one.

### Enforcement history

**I found no evidence of any Dutch supermarket suing or publicly sending a cease-and-desist to a grocery price comparison site or scraper.** Searches of rechtspraak.nl results surfaced Dutch supermarket litigation on unrelated matters (franchise disputes, a Heineken/Jumbo supply dispute) and database-right cases in other sectors, but nothing on grocery price scraping.

This negative finding is meaningful but should be read carefully. It is consistent with at least eight comparators operating openly (§3) — if chains were enforcing aggressively, that market would not look as it does. But absence of litigation is **not** absence of legal risk; it may equally reflect that no target has yet grown large enough to be worth suing, or that disputes were settled privately. The closest *adjacent* enforcement is Ryanair's own campaign, which produced C-30/14 — an airline, not a grocer, but a plaintiff who litigated this exact theory to the CJEU and substantially won.

I did **not** find a reliable primary-source account of the enforcement history of any individual Dutch comparator. Treat this section as "no evidence found", not "no enforcement occurred".

### Additional legal exposure not in the original brief

Flagging two items that fall outside the scraping question but attach to this specific product:

- **Price accuracy and misleading-practice risk.** Telling a consumer that chain X is cheapest, on stale or mismatched data, is a consumer-protection exposure under unfair commercial practices rules, independent of how the data was acquired. Note Dirk's price objects carry an explicit `priceDate` and Spar's JSON-LD a `priceValidUntil` — surface freshness to users rather than hiding it.
- **Own-brand "equivalence" claims.** Asserting that AH Basic product A is equivalent to Jumbo Huismerk product B is your editorial claim, not a fact from any source, and is the kind of comparison a chain could challenge as misleading. The comparators I examined hedge this explicitly — allesupers.nl separates "Exact dezelfde producten" from "Ook vergelijkbare producten" and shows different winners for each. That UI distinction is a legal defence as much as a UX nicety.

---

## 3. Prior art — this already exists, repeatedly

**All verified live 2026-10-13 unless noted.** The original brief's candidate list turned out to be substantially wrong, so I verified each and then found the actual incumbents.

### Candidates from the brief

| Candidate | Status | Finding |
|---|---|---|
| **Superlist** | **Dead / never verified** | `superlist.nl` serves "Dovendi - Domain for sale". **I could not confirm it was ever a Dutch grocery price comparator** — searches surfaced only an unrelated to-do app of the same name. Treat the premise as unverified; I have no evidence of what it was or why it ended. |
| **Questionmark** | **Pivoted away** | `questionmark.nl` redirects to `thequestionmark.org`, now "Independent think tank for a healthy, sustainable, and fair food system". Not a price comparator. |
| **Supermarktaanbiedingen.com** | **Live** | Self-describes as "De enige site in Nederland met alle aanbiedingen van alle supermarkten!" Covers Lidl, AH, Jumbo, Aldi, Plus, Dirk, **Nettorama, Boni**, Vomar, Hoogvliet, Dekamarkt, Spar, Poiesz. **Offers/folders only, not shelf prices** — which is consistent with Lidl/Aldi/Nettorama publishing only leaflets. |
| **Reclamefolder** | **Live, DPG Media** | Redirects to `myprivacy.dpgmedia.nl/consent`. Leaflet aggregator, not prices. |
| **Aanbiedingen.nl** | **Live but neglected** | **TLS certificate has expired** (`curl` error 60). DPG-affiliated. |
| **Wisebuy** | **Unreachable** | TLS handshake failure (`error:0A000438:SSL routines::tlsv1 alert internal error`). Could not assess. |
| **Tweakers Pricewatch** | **Live, not groceries** | DPG consent gate; Pricewatch is electronics. No grocery coverage found. |
| **Prijsvergelijken** | **Not assessed** | Too generic a name to resolve to a specific operator. |

### The actual incumbents — and they are strong

| Product | Chains | Capabilities | Data sourcing evidence |
|---|---|---|---|
| **[checkjebon.nl](https://www.checkjebon.nl/)** | 10 live | Shopping list, basket comparison, **receipt OCR** (Tesseract.js), multi-store optimisation, **shareable lists**, embeddable JS library | **Publishes its whole dataset.** [`supermarkt/checkjebon`](https://github.com/supermarkt/checkjebon), MIT, 247 stars, **pushed 2026-10-12** |
| **[allesupers.nl](https://allesupers.nl/)** | 8+ | **Exact vs. comparable product modes with different winners**, barcode scan, receipt scan, favourites, "Onderzoeken" | Not stated |
| **[supermarktscanner.nl](https://www.supermarktscanner.nl/product-vergelijken/)** | 8 | **Price history** — "de enige website waar je gratis inzicht krijgt in de prijshistorie van een product" — plus folder offers and price-drop tracking | Not stated |
| **[spaartje.com](https://spaartje.com/supermarkt)** | **13** | Claims **206,707+ products analysed**, per-chain counts and average prices, incl. **Lidl (18,879) and Aldi (6,919)** | Not stated |
| [voordly.com](https://voordly.com/goedkoopste-supermarkt), [superprijsvergelijker.nl](https://www.superprijsvergelijker.nl/goedkoopste-supermarkt), [prijsprofeet.nl](https://www.prijsprofeet.nl/), PingPrice | various | Various | Not stated |

**None of the live comparators publishes a statement of how it obtains data** (checkjebon excepted, and even there only the output is published, not the collector). I found **no evidence of any partnership or licensing arrangement** with any chain. The absence of any "in samenwerking met" claim, combined with the chains' lack of public APIs, is strong circumstantial evidence that the entire sector scrapes — but it is circumstantial, and I mark it as such.

### checkjebon's dataset — directly usable, with a caveat

The most immediately actionable artefact found. `data/supermarkets.json` (10,088,956 bytes) is committed to an MIT-licensed repo and refreshed daily. I downloaded and analysed it:

| Chain | Products | Chain | Products |
|---|---|---|---|
| Jumbo | 17,081 | Hoogvliet | 7,410 |
| AH | 16,173 | Dirk | 7,438 |
| PLUS | 16,129 | Poiesz | 1,687 |
| Lidl *(via boodschaapje.nl)* | 22,070 | Vomar | 887 |
| DekaMarkt | 10,728 | ALDI | **0** |
| SPAR | 7,704 | Ekoplaza | **0** |
| | | **Total** | **107,307** |

Schema is minimal — four keys only:
```json
{"n": "100% Coconut grove", "l": "wi415202/100-coconut-grove", "p": 2.49, "s": "1 l"}
```
`n` name, `l` link fragment, `p` price in euros, `s` size.

**No EAN, no category, no promotion flag, no timestamp.** That absence explains their matching approach, documented candidly in their README: exact name match, then a subsequence fuzzy match ("`milk` will find `skiM mILK`"), then filter by amount, then order by match length and price. They also note: "When no prices are found for a specific product for any of the given supermarkets, **a price estimate is used** based on the average price for that product among other supermarkets."

Two caveats before leaning on this:
1. **The repo's MIT licence covers their code and compilation; it cannot grant rights in the underlying data they collected from the chains.** Using it does not launder the upstream legal question — it may change who bears it, which is a question for counsel, not an answer.
2. Coop and Picnic are absent, and the README's supported-list is out of date relative to the data (README lists Coop and Picnic; the data has DekaMarkt, Poiesz, Ekoplaza instead).

### Commercial scrapers exist as a productised service

Apify hosts maintained Dutch grocery scrapers, which is independent evidence that this acquisition is commercially routine. [`harvestedge/dutch-supermarkets-all-11`](https://apify.com/harvestedge/dutch-supermarkets-all-11) claims coverage of "Albert Heijn, Jumbo, Dirk, SPAR, Hoogvliet, Aldi, Lidl, Vomar, Poiesz, Plus, DekaMarkt" at **$5.00 / 1,000 results**, outputting name, current price, **normalised unit price**, unit type, packaging size, discount info and URLs — but **no EAN/GTIN**, and with the caveat that "discounts may be less comprehensive than all other variables". Adoption is low (162 total users, 6 monthly). Sibling actors exist for AH specifically and for Jumbo.

Interesting that a paid commercial product claims Aldi and Lidl coverage while checkjebon reports them as unavailable — this may be assortment-without-prices, or leaflet-derived. I could not verify the output.

---

## 4. Cross-chain product matching

### EAN/GTIN exposure per chain — the decisive table

| Chain | EAN/GTIN exposed? | Where, and how verified |
|---|---|---|
| **Jumbo** | **Yes** | `Product.ean` in GraphQL (live-verified: `"ean":"8712000030957"`) **and** `gtin13` in PDP JSON-LD. Belt and braces. |
| **Albert Heijn** | **Yes, plural** | Dedicated `/mobile-services/product/search/v1/gtin/{barcode}` endpoint; web search API returns `"gtins": [8710398526694, 8710398526410]`. *Library/doc evidence; not live-verified.* |
| **Vomar** | **Yes, plural** | `primaryEan` + `additionalEans[]` in SSR payload (live-verified) |
| **Spar** | **Yes** | `gtin13` in JSON-LD (live-verified: `"gtin13":"8720600608834"`) |
| **Dirk** | **No** | `ProductDto` introspected: only `productId`, `productNumber`. No EAN field in the schema. |
| **Picnic** | **No** | Code search for gtin/ean/barcode across the maintained client: 0 results |
| **Lidl** | Field exists, empty | Nuxt product object has an `eans` key; it was `[]` for the product tested |
| **Plus, Coop, Hoogvliet, Aldi, Nettorama** | **Unknown** | No product data recovered |

**So: EANs available for 4 chains (3 verified live), definitively absent for 2, unknown for 5.** Where present on both sides, matching is a join. Note that two chains return *arrays* of EANs per product — model this as many-to-one, not one-to-one, from the start.

### No canonical Dutch master-data source is available to you

**GS1 Netherlands / GDSN is out of reach.** Covered in flag 5. The structural problem is eligibility, not cost: the datapool moves data from manufacturers/wholesalers to "retailer, groothandel of zorginstelling", and a recipient receives data only "van je eigen leveranciers". A comparison app has no suppliers. Published tariffs for the lowest revenue band are €291 one-off + €291/year + €28/year contribution ([tariffs](https://www.gs1.nl/producten-services/data-exchange/tarieven/)) — affordable, but irrelevant if you cannot qualify.

### Open Food Facts — real coverage numbers

Queried live via the OFF API v2 on 2026-10-13:

| Metric | Count | Query |
|---|---|---|
| **Products tagged Netherlands** | **112,104** | `countries_tags_en=netherlands` |
| Global total | 4,809,796 | — |
| NL with a Nutri-Score grade | **23,708** (~21%) | sum of `nutrition_grades_tags=a..e` |

Nutri-Score breakdown for NL: a=4,358 · b=2,826 · c=5,265 · d=5,396 · e=5,863.

**Caveat on reliability:** the OFF API was intermittently returning "Page temporarily unavailable" HTML during my queries — two of my grade requests initially returned 0 and succeeded on retry. The grade figures are from successful calls, but treat them as ±a few percent, and do not build a hard dependency on OFF's live API without caching.

- **Keyed on EAN**: yes — the product code *is* the barcode (`{"code":"7300400481700"}`), which makes it a natural join partner for Jumbo/AH/Vomar/Spar data.
- **Nutrition data**: yes, but only ~21% of Dutch products carry a Nutri-Score. Nutriment-level completeness I could not measure (the `states_tags` query failed repeatedly).
- **Licence — and this is a genuine constraint.** From [OFF's own terms of use](https://world.openfoodfacts.org/terms-of-use) and [data page](https://world.openfoodfacts.org/data): the database is **ODbL**, individual contents **DbCL**, images **CC-BY-SA**. OFF's own summary of the share-alike obligation: *"If you publicly use any adapted version of this database, or works produced from an adapted database, you must also offer that adapted database under the ODbL and share your modifications."*

  **Read that carefully before designing the data model.** If OFF data is merged into your product master, a share-alike obligation may attach to the derived database. The standard mitigation is architectural: keep OFF data in a separate, clearly-bounded table joined at read time rather than merged into a single master, so that what you'd have to share back is the OFF-derived portion only. This is a decision to make before writing the schema, not after. Attribution is also mandatory ("Contains data from Open Food Facts, available under the Open Database License").

### The own-brand (huismerk) problem

**There is no identifier-based solution, by construction.** AH Basic, Jumbo Huismerk and Lidl own-brand items have retailer-specific EANs and no shared referent — no amount of barcode data will match them, because there is nothing to match *to*.

**I searched for an existing dataset or published method and found nothing usable:**

- **Retail-786k** ([arXiv 2309.17164](https://arxiv.org/html/2309.17164v2)) is the closest artefact and is genuinely on point in framing: 786,179 images across 3,298 entities from ~130 European retailers' printed leaflets (2016–2022), where "each entity forms an equivalence class of comparable products" defined by a **price comparison task**. That is exactly the right problem framing. But: (1) it is licensed **CC BY-NC-ND 4.0** — non-commercial *and* no-derivatives, so it cannot be used in a commercial product or fine-tuned; (2) it is **image**-based, whereas the chain data available here is text; (3) **the paper does not address private label at all.** Dataset at [retail-786k.org](https://www.retail-786k.org/) / [Zenodo 10.5281/zenodo.7970566](https://zenodo.org/record/7970567).
- Generic product-matching literature exists (e.g. [Supervised Contrastive Learning for Product Matching](https://arxiv.org/pdf/2202.02098)) but is not grocery- or private-label-specific.
- Practitioner accounts describe hand-maintained equivalence tables with rules-based attribute normalisation as the fallback when EANs diverge. **I found only secondary sources for this (vendor blogs) and mark it unverified as a documented method.**

**What incumbents actually do** — and this is the most useful evidence available, since it's revealed practice rather than theory:
- **checkjebon** uses subsequence fuzzy name matching plus amount filtering, ordered by match length then price, with **average-price estimation** when a chain has no match. Their README is unusually honest that this misfires on generic queries: "generic names like `milk` are not well suited for this".
- **allesupers.nl** surfaces the ambiguity in the UI rather than hiding it, running two parallel comparisons — "Exact dezelfde producten" and "Ook vergelijkbare producten" — which produce **different winners** (in the live example: Dirk €13.11 exact vs. Vomar €10.95 comparable). It also reports completeness explicitly ("Aldi — Niet compleet · 5 producten ontbreken").

**Conclusion: plan for a curated equivalence table for own-brand staples plus an explicit "comparable" mode in the UI.** Do not plan for an automated solution; none exists in usable form. The honest framing is that own-brand comparison is a product/editorial problem, not a data problem.

### Unit-price normalisation

Varies sharply by chain, and determines how much parsing you own:

| Chain | Unit price available? |
|---|---|
| **Jumbo** | **Pre-computed.** `price.pricePerUnit{price unit}` — live: `{"price":350,"unit":"l"}` |
| **Albert Heijn** | **Pre-computed.** `price.unitInfo{price, description}` — e.g. `{"price": 8.3, "description": "KG"}`, plus `unitSize: "300 g"` *(doc evidence)* |
| **Vomar** | **Computable.** `contents:"5000"` + `unit` fields |
| **Dirk** | **Must parse.** `packaging` is free text: `"2 liter"`, `"1,5 liter"`, `"6 liter"` |
| **Spar** | **Must parse.** Pack size in a separate heading: `"355 Gram"` |

Note Dutch decimal commas (`"1,5 liter"`) and multipack forms (`"2 x 35 g"`, `"24 x 300ml"`) — both appear in live data and both break naive parsers. Where a chain pre-computes, prefer its figure over your own: it is what the chain legally represents to the consumer.

---

## 5. Nutrition and recipe data sources

### NEVO (RIVM)

Official Dutch food composition database. Source: [rivm.nl/nederlands-voedingsstoffenbestand](https://www.rivm.nl/nederlands-voedingsstoffenbestand).

- **Version**: NEVO-online 2025/9.0
- **Coverage**: "ruim 2300 voedingsmiddelen" with "meer dan 130 voedingsstoffen"
- **Access**: free download, gated behind accepting terms ([download page](https://www.rivm.nl/nederlands-voedingsstoffenbestand/gebruik-nevo-online/download-bestand)): "De voedingswaarde en bijbehorende broninformatie van alle voedingsmiddelen aanwezig in NEVO-online versie 2025/9.0 is gratis te downloaden via onderstaande link. Voordat u de gegevens downloadt, moet u akkoord gaan met de voorwaarden"
- **Licence — restrictive in a way that matters.** From the [copyright page](https://www.rivm.nl/nederlands-voedingsstoffenbestand/gebruik-nevo-online/copyright-en-disclaimer):

  > "Alle intellectuele (eigendoms)rechten met betrekking tot het Nederlands Voedingsstoffenbestand … behoren toe aan RIVM/de Staat der Nederlanden. **Gebruik van de informatie van NEVO-online is alleen toegestaan in ongewijzigde vorm** en met vermelding van bron en versienummer. U dient hiervoor de volgende referentie te gebruiken: NEVO-online versie 2025/9.0, RIVM, Bilthoven."

  "Alleen in ongewijzigde vorm" is a real problem for an app: scaling per-100g values to a portion, or summing nutrients across a recipe's ingredients, is arguably modification. **Get legal advice before building nutrition calculations on NEVO**, and note that RIVM also disclaims all liability for "foutief gebruik of verkeerde interpretatie van de gegevens".

**The structural limitation is bigger than the licence, though: NEVO is keyed on NEVO codes for *generic foods*, not on EAN for retail products.** "NEVO staan voedingsmiddelen die in Nederland regelmatig gebruikt worden" — ~2,300 generic foods, versus ~107k retail SKUs. NEVO is the right source for *recipe-level* nutrition (ingredient "halfvolle melk" → nutrients) and the wrong source for *product-level* nutrition. For product-level you need OFF (~21% Nutri-Score coverage) or the chains' own fields.

### Nutri-Score

- **Status in NL**: legally designated as the Dutch voedselkeuzelogo in April 2023; voluntary use by manufacturers from 1 January 2024 ([rijksoverheid.nl announcement](https://www.rijksoverheid.nl/actueel/nieuws/2023/04/25/nutri-score-definitief-het-nieuwe-voedselkeuzelogo-in-nederland)).
- **Who computes it**: the algorithm is set by the international Scientific Committee / Steering Committee; **manufacturers compute and apply it voluntarily**. There is no central registry, which means coverage is inherently partial and inconsistent — absence of a Nutri-Score is not information about a product.
- **Algorithm is public**: the 2023 updates are published as Dutch government documents, e.g. [Update of the Nutri-Score algorithm for beverages — Second update report (2023-03-30)](https://www.rijksoverheid.nl/documenten/2023/03/30/second-update-report-from-the-scientific-committee-of-the-nutri-score-2023) and [Wijzigingen in algoritme Nutri-Score — update 2023](https://www.rijksoverheid.nl/documenten/2023/12/26/wijzigingen-in-algoritme-nutri-score-update-2023-engels). So you *can* compute it yourself from nutriment data — but note that publishing a self-computed score that differs from a manufacturer's is a misleading-information risk.
- **Present in chain product data?** **Yes for AH** — its web search API returns `"properties": {"nutriscore": "C"}` and a `highlight.name: "nutriscore-c"` ([api.md](https://github.com/JariRoossien/SupermarketScraper/blob/master/api.md); *doc evidence, 2024-era, not live-verified*). For other chains, **not determined** — I did not probe Jumbo's GraphQL for a Nutri-Score field. Easy follow-up.
- Note `nutriscore.eu` returned **HTTP 403** to my fetch; I relied on the Dutch government documents instead.

### Voedingscentrum / Schijf van Vijf

**No machine-readable form found.** `voedingscentrum.nl/robots.txt` resolves and allows general crawling (disallowing `/App_*`, `/shared/pages/`, `/nl/zoek.aspx?*`), but every API/open-data path I probed — `/api`, `/nl/service/open-data.aspx`, `/encyclopedie` — returned **HTTP 302** redirects, and the Nutri-Score theme page 404'd. There is a sitemap (`https://www.voedingscentrum.nl/sitemap.xml`).

**Conclusion: Schijf van Vijf guidance would have to be scraped from HTML or hand-encoded.** Given it is a small, slow-changing rule set (food groups and daily recommended amounts), hand-encoding is likely the right call — it is a handful of tables, not a dataset.

### Recipe data — the chains are the best source

**The strongest recipe source found is Dirk's open GraphQL**, because its ingredients are already joined to purchasable products. Repeating the key schema from §1:

- `RecipeDetailDto`: `courses, ingredients, ingredientsInStock, kitchens, **meetsDietGuidelines**, persons, preparationTime, steps, tags, tip, title, **vegetableScore**, **vegetarian**`
- `IngredientDetail`: `description, position, **productNumber**, quantity, rankNumber`

`productNumber` on each ingredient means the recipe→product join is **given, not inferred** — which is precisely the hard part of an offer-driven recipe feature. Combined with `listOffersByDate`, you could compute "recipes whose ingredients are on offer this week" against Dirk alone with no NLP at all. `meetsDietGuidelines` and `vegetableScore` additionally give you dietary filtering for free.

Other chain recipe sources: **Jumbo** exposes `recipes`, `recipe(id)` and `searchRecipes(input)` on its GraphQL root (field existence verified live), and its `robots.txt` explicitly allows `/recepten/*?offset=`. **Spar** and **Plus** both publish recipe sitemaps (`spar.nl/sitemap/recipes.xml`, `plus.nl/ECP_Sitemap_Engine/rest/Sitemap/recipe`). All of these are subject to the same ToS and copyright analysis as product data — and recipe *text* is much more clearly a copyrightable work than a price is, so treat chain recipe content as higher copyright risk than chain price data.

### Open recipe datasets

| Dataset | Size | Licence | Commercial use | Notes |
|---|---|---|---|---|
| **RecipeNLG** | 2,231,142 recipes | **CC BY-NC-SA 4.0** | **No** | Poznań Univ. of Technology; extends Recipe1M+ |
| **Food.com recipes** | 500k+ recipes | **CC0** (claimed) | Yes | Includes raw *and* cleaned ingredient lists |
| Recipe1M+ | 1M+ recipes, 13M images | — | — | Dataset not distributed; only image URLs to scrape |
| "Free, simple, open recipe dataset" | 5,000 | CC BY-SA 3.0 | Share-alike | Title, ingredients, instructions |

**Licence caveat: these licence terms come from Kaggle dataset pages, which are secondary sources.** I attempted to verify RecipeNLG's licence from its own site ([recipenlg.cs.put.poznan.pl](https://recipenlg.cs.put.poznan.pl/)) but it is a JavaScript SPA that served no readable content. **Verify every licence from the dataset's own documentation before use** — a Kaggle uploader's licence field is not authoritative.

**The bigger problem with all of these is that they are English-language and US-centric.** Ingredient strings like "1 cup all-purpose flour" do not match Dutch grocery products, and the ingredient→product matching problem would have to be solved from scratch in a second language. Against that, Dirk's recipes are Dutch *and* pre-joined to products. **The chain recipe data is more useful than the open datasets for this specific application, despite the worse legal position.**

---

## Open questions / could not verify

Ordered roughly by how much they affect a go/no-go decision.

1. **Albert Heijn's entire posture — endpoint liveness, `robots.txt`, and ToS.** All three still unverified, and this remains **the most important gap**: AH is the market leader and the data model benefits most from its `gtins` array and Nutri-Score. *Corrected 2026-10-13:* the sub-question "was this an outage or IP-based blocking?" is **answered — it was an outage, because AH was under attack.** So the retest does not need to be engineered around suspected bot-blocking; an ordinary request once the attack has subsided is the right first move, and only if *that* fails is a residential-egress retest informative. Read `ah.nl/robots.txt` and the gebruiksvoorwaarden at the same time. Everything about AH's tolerance of automated access is still open.

2. **Plus and Coop product endpoints.** Both run OutSystems/ECOP; both legacy APIs are NXDOMAIN; I recovered no working product endpoint. Plus is a top-5 chain and checkjebon carries 16,129 Plus products, so a route exists. The `Commercetools_Backoffice` reference in Plus's `robots.txt` is the strongest lead. **Resolvable with an hour of browser DevTools work that I could not do headlessly.**

3. **Hoogvliet's product endpoint.** Next.js with API routes, Intershop references in `robots.txt`, 7,410 products in checkjebon — so a route exists; my guesses missed.

4. **How anyone gets Lidl prices.** checkjebon attributes 22,070 Lidl products to `boodschaapje.nl`; spaartje.com claims 18,879. Lidl's own site publishes no prices and its internal API returns 401. I could not find boodschaapje's data endpoint. Plausible explanations are the Lidl Plus app API or leaflet OCR, but **I have no evidence.** Worth resolving: it would unlock the largest missing chain.

5. **Whether Jumbo/Dirk's open endpoints are rate-limited or will be closed.** I made dozens of requests without throttling or challenge, but I did not load-test, and I deliberately did not attempt bulk extraction. Dirk leaving introspection enabled suggests the gateway was not hardened for public exposure — **which also means it could be hardened at any time.** Any plan depending on these should assume they may close without notice.

6. **Whether a Dutch supermarket's catalogue qualifies for the sui generis database right.** Never litigated, as far as I can find. Fixtures/BHB make the price layer a weak candidate, but the supplier-obtained layer (descriptions, nutrition, GTINs) is a much stronger one, and the mixed-database analysis would be chain-specific and fact-heavy. **Needs a Dutch IP lawyer, not more desk research.**

7. **Whether browsewrap ToS binds a scraper who never created an account.** Ryanair's clause was clickwrap (a ticked box). I did not research Dutch contract-formation doctrine on browsewrap. This materially changes exposure for Jumbo and Dirk (no account needed) versus Picnic (account mandatory, therefore clearly bound).

8. **Enforcement history for individual Dutch comparators.** "No evidence found" is my finding; it is not proof that no cease-and-desist was ever sent. Private settlements would not surface in search. The death of `superlist.nl` is **entirely unexplained** — I could not even confirm it was a grocery comparator.

9. **ToS text for Dirk, Vomar, Aldi, Lidl, Plus, Coop.** Not located (404s, or footers with no voorwaarden link). Dirk and Vomar matter most, since they are the two most technically open chains. **Absence of a located clause is not absence of a clause.**

10. **Whether checkjebon's MIT-licensed dataset can lawfully be used commercially.** The repo licence covers their code and compilation; it cannot convey rights in data collected from the chains. Whether reuse shifts, shares or avoids liability is a legal question I am not qualified to answer.

11. **Nutri-Score field presence outside AH.** I verified AH only (and that from 2024-era docs). Did not probe Jumbo's GraphQL for a Nutri-Score field — a five-minute follow-up.

12. **OFF nutriment-level completeness for NL.** The `states_tags=nutrition-facts-completed` query failed repeatedly against a flaky API. I have Nutri-Score coverage (~21%) but not raw nutriment coverage, which is what actually matters for recipe nutrition.

13. **Whether NEVO's "alleen in ongewijzigde vorm" permits portion scaling and recipe summation.** Plain reading suggests not. A direct question to RIVM would settle it cheaply.

14. **Aldi's `webservice.aldi.nl/api/v1/` product path.** API is alive (returned structured JSON errors, not 404s); path not found. Low priority since Aldi publishes no prices anyway.

15. **Recipe dataset licences from primary sources.** All taken from Kaggle pages. RecipeNLG's own site is an unreadable SPA. **Verify before use.**

---

## Appendix: evidence inventory

**Live-verified by direct request on 2026-10-13** (highest confidence):
- `robots.txt` for jumbo.com, lidl.nl, aldi.nl, plus.nl, dirk.nl, picnic.app, hoogvliet.com, vomar.nl, spar.nl, nettorama.nl, voedingscentrum.nl — and the *absence* of a usable one for ah.nl and coop.nl
- Jumbo GraphQL: `searchProducts` with `ean`/`price`/`pricePerUnit`/`promotions`; top-level `promotions` and `promotionTabs`; `categoriesTree`; existence of `recipes`/`recipe`/`searchRecipes`; introspection disabled; field-existence probes for `ean` vs `gtin`/`gtin13`/`barcode`/`globalTradeItemNumber`
- Jumbo PDP schema.org JSON-LD with `gtin13`
- Dirk GraphQL: introspection enabled, 44 root fields, `ProductDto`/`OfferDto_Response`/`GetProductAssortment_Response`/`SearchProductsResponse`/`RecipeDetailDto`/`IngredientDetail`/`IngredientInStockDetail`, live per-store prices with `storeId: 66`
- Vomar SSR payload with `primaryEan`/`additionalEans`/`price`/`contents`
- Spar PDP JSON-LD `gtin13` + split-span price markup + product sitemap
- Lidl PDP JSON-LD (`InStoreOnly`, no price), Nuxt `eans: []`, `/q/api/category` → 401
- Akamai evidence: AH 503 (`errors.edgesuite.net`), AH 403; Jumbo `mobileapi` `_abck`/`bm_sz` cookies
- Dead hosts: `pls-sprmrkt-mw.prd.vdc1.plus.nl`, `api.coop.nl`, `web-dirk-gateway.detailresult.nl` (all NXDOMAIN)
- Product sitemaps: dirk.nl, spar.nl, plus.nl, lidl.nl (gz), hoogvliet.nl (categories only)
- ToS text: Jumbo Art. 9(3), Picnic Art. 13, Hoogvliet Art. 9, Nettorama
- checkjebon `data/supermarkets.json` downloaded and analysed (10,088,956 bytes; 107,307 products; 4-key schema)
- OFF API v2 counts (NL 112,104; global 4,809,796; Nutri-Score a–e)
- Judgment texts via the EU Cellar API: C-30/14, C-202/12, C-203/02, C-46/02, C-338/02
- Databankenwet Arts. 1–4 via wetten.overheid.nl
- NEVO version, coverage, copyright and download terms via rivm.nl
- GS1 NL Data Source role description and tariff tables
- Liveness/title checks on 9 prior-art domains

**Source-code / documentation evidence, not live-verified** (medium confidence — endpoint *shape* only):
- AH mobile API flow: `bartmachielsen/SupermarktConnector` (last commit 2022-12-06) corroborated by `RashadAnsari/KortingKlok` (pushed 2026-09-14)
- AH web search API response shape incl. `gtins` and `nutriscore`: `JariRoossien/SupermarketScraper/api.md` (pushed 2024-01-20)
- Picnic authenticated endpoints: `MRVDH/picnic-api` (pushed 2026-10-09)
- Legacy Plus/Coop/Aldi API base URLs: `Repsay/supermarket-mobile-api-connector` (pushed 2022-11-23) — two of three now dead

**Secondary sources, explicitly marked unverified** (low confidence):
- Recipe dataset licences (Kaggle pages, not dataset documentation)
- Apify actor capabilities (vendor listing, output not inspected)
- Practitioner accounts of rules-based private-label equivalence tables (vendor blogs)
