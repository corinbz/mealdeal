# Basket comparison prototype

The basket app in the chosen **Tassen** design (issue #4): every Chain is a
shopping bag holding your whole list. Four pages share one shell, with tabs on
top on a desktop and a bar at the bottom on a phone:

- **Recepten**: example recipes built on this week's real Offers. Cooking
  steps open only when a recipe is opened, and one tap puts the ingredients on
  the list.
- **Lijst**: the Basket. Staples and one-offs, and per item the cheapest
  Chain and a price line with one dot per Chain.
- **Vergelijk**: Chains ranked as bags (total, difference to the cheapest,
  Coverage), the best two-Chain combination, and where the differences are.
  Corrections live here.
- **Winkelen**: a checklist per bag for the chosen plan.

Light is Kraft and dark is Donker, following the device; the button top right
overrides it. The design history (every rejected direction, and the Tassen
prototype this page was rebuilt from) is on the `prototype/basket-design`
branch.

```sh
./scripts/pull-catalogue.sh         # this morning's catalogue, published by the daily refresh
node scripts/catalogue-from-db.ts   # or build it from your own database after an ingest
# either writes prototype/catalogue.js; then open prototype/basket.html straight from disk
```

The list is editable: type "500 g rundergehakt" and every Chain resolves it
in the browser against its whole comparable catalogue. Items can be marked
staples, which survive **Done shopping**; the list and any Corrections are kept
in this browser's storage, for one user, with no server.

## Hosting

The same page is served from Cloudflare Pages at an unlisted
`https://mealdeal-<random>.pages.dev`, so it opens on a phone in the shop
(#17). `.github/workflows/app.yml` deploys it after every catalogue the morning
refresh publishes, and whenever the page changes. One-time setup, from the
repository root:

```sh
./scripts/setup-pages.sh
```

That creates a Pages-only API token and the project, and stores
`CLOUDFLARE_API_TOKEN` and `PAGES_PROJECT` for the workflow. Until it has run,
the deploy is skipped rather than failing.

**Unlisted, not private.** Anyone with the address can open it. It is in no
search engine (`noindex`), and no certificate log, because `*.pages.dev` uses
one wildcard certificate. There are no accounts, and the list stays in each
browser, so the address shows prices and nothing of yours. Cloudflare Access
can put a sign-in in front of it if that changes.

**Offline.** `sw.js` keeps the last page and catalogue a phone loaded. Online,
it fetches fresh copies first, but gives up after 3 seconds: a shop's single bar
that never answers is worse than no signal. Offline, the last copy opens and
says so next to the date its prices are from. The list was never on the
network. Opened from disk, the page skips this and works as before.

## What it is testing

Three domain decisions that are easy to agree with on paper and easy to design
away by accident:

1. **A Basket Item is a requirement, not a Product** (ADR-0001). The left
   column is "500 g rundergehakt", and each Chain resolves it independently.
2. **A total means nothing without Coverage** (glossary). Coverage lives
   *inside* the same bag as the total, as a bar with one segment per item, so
   the two cannot be read apart. A Chain that cannot fill the list shows
   "≥ €x", because an incomplete basket's total is a floor, not a price, and it
   is ranked after every Chain that can.
3. **Offers are shown verbatim** (ADR-0002). `1+1 gratis` appears as those
   words. Nothing converts it to a percentage, because the true effective
   price depends on how many you buy.

Comparison is on what you actually pay for the quantity you need: whole packs,
at the Offer price where one applies. Unit Prices still drive which Product a
Chain resolves to, and a pack far larger than the requirement is flagged
("pak is 4× wat je nodig hebt").

## Where the data comes from

**Both Chains are real.** The fixture is resolved against the ingested
database, so every name, Pack Size, Shelf Price and Offer wording came from a
Sweep: 7,359 Dirk products from Store 66 and 17,104 Jumbo products, which Jumbo
prices nationally. Coverage happens to be 12 of 12 at both today; the UI still
shows it beside every total, because a Basket a Chain cannot fill is the normal
case.

## The wrong answers are the point

Resolution here is the crude substring rule every incumbent falls back on, and
it is left crude so its failures are visible:

| Requirement | Resolves to | Why it is wrong |
| --- | --- | --- |
| 1 kg appels | Aardappelen kruimig | "appel" also matches "aard**appel**" |
| 500 g wortelen | Doperwten en wortelen | tinned peas, not fresh carrots |
| 1 komkommer | Snoepkomkommer 10 stuks | cheapest per piece, but forces a 10-pack |

Correcting one is the demonstration, not a workaround: Corrections are the
asset a competitor cannot scrape (ADR-0004), and they only exist because
automated resolution is this imperfect. The last row also surfaced a design
problem worth keeping: the lowest Unit Price can force a pack many times
larger than the requirement, so cells flag "pack is 10x what you need".

## Not built here

No server, no accounts, no sharing between devices, no real recipe data (the
six recipes are examples, marked so; their prices and Offers are real), no
Suggestions, and no attempt at own-brand equivalence. Corrections stay in one
browser rather than being folded back into a shared vocabulary (ADR-0004).
