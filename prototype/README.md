# Basket comparison prototype

The basket app in the chosen **Tassen** design (issue #4): every Chain is a
shopping bag holding your whole list. Five pages share one shell, with tabs on
top on a desktop and a bar at the bottom on a phone:

- **Recepten**: example recipes built on this week's real Offers. Cooking
  steps open only when a recipe is opened, and one tap puts the ingredients on
  the list.
- **Bladeren** (#36): what is cheap where, with no list. Per aisle, each
  Ingredient's cheapest Product per kg, liter or piece at every Chain, ranked
  by how far the cheapest Chain is below the middle one (not the dearest: one
  odd Product at one Chain would top the list). A difference over 70% waits at the
  foot under "Nog niet gecontroleerd" until it is checked (`src/catalogue/checked-spreads.ts`). "Aanbiedingen die lonen" are
  priced Offers beating every other Chain's cheapest of their Ingredient; an
  Offer with no price is not ranked. "Zelfde product" lists Exact Products by
  the difference in pack price, leaving out any whose dearer side has an
  unpriced Offer. One tap puts an Ingredient or Exact Product on the list.
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

**This week or next.** Recepten and Lijst switch between this week's Offers
and next week's, which Chains announce before they start (#8). Next week, per
Chain, begins on the first day its announced Offers do. An upcoming Offer is
always labelled with that day ("vanaf wo 21 okt"). One of this week's that
runs on is labelled "loopt al", and one that ends before then drops out.
An Offer that has not started has no price yet, and none is derived from its
wording, so next week is priced at today's Shelf Prices. Recipes are ranked on
how many ingredients will be on Offer. Vergelijk and Winkelen always show this
week, because that is where you shop.

Comparison is on what you actually pay for the quantity you need: whole packs,
at the Offer price where one applies. Unit Prices still drive which Product a
Chain resolves to, and a pack far larger than the requirement is flagged
("pak is 4× wat je nodig hebt").

## Where the data comes from

**All eight Chains are real.** The fixture is resolved against the ingested
database, so every name, Pack Size, Shelf Price and Offer wording came from a
Sweep: 7,359 Dirk products from Store 66, and 17,104 Jumbo, 17,249 Plus,
9,872 DekaMarkt, 8,282 Hoogvliet, 6,268 Vomar and 3,030 Aldi products,
priced nationally. Vomar publishes no Offers
online, so its bag is always at Shelf Prices, and the note under Vergelijk
says so. **Lidl** puts only its Offers online, about 90 comparable products a
week, so it gets no bag: one would only ever say what is missing, and an item
it does not list is not "not for sale" there. Its Offers compete item by item
on every page, can make up half of a two-shop plan, and appear among the
recipes' deals; Vergelijk names Lidl "niet in de aanbieding" where it lists
nothing.

**Card and app prices count as paid**, as if you held every card (the
owner's choice): today that is Lidl Plus. Each Chain whose Offers today need
one names it in the catalogue (`card`), and every page that adds up prices,
and the digest, says "Gerekend alsof je Lidl Plus hebt" under the dates. Coverage happens to be 12 of 12 at all four today; the UI still
shows it beside every total, because a Basket a Chain cannot fill is the normal
case.

## Resolution through Ingredients

What you type is read as a Requirement against the Ingredient vocabulary
(#14): "1 l halfvolle melk" is the Ingredient melk, Variant halfvol; "6 bio
eieren" adds the Preference biologisch; "diepvries", "uit pot", "huismerk"
and "a-merk" are Preferences too. Each Chain then picks among its own Products
of that Ingredient, within the Variant and Preferences, and fresh unless a
Preference allows otherwise, cheapest per unit first. The recipes are written
the same way, so they resolve exactly as the list does. `resolve.js` does
this, and the weekly digest runs the same file.

The word rule that came before still answers anything the vocabulary does not
know, and the item says so ("Niet herkend"). Its failures were the reason for
Ingredients:

| Requirement | Word matching chose | Now |
| --- | --- | --- |
| 1 kg appels | Aardappelen kruimig ("appel" ends "aard**appel**") | appels |
| 500 g wortelen | Doperwten en wortelen, or Olvarit baby food | fresh carrots |
| broccoli | a broccoli-meatball ready meal | broccoli |

Each list item has a small **price history** line per Chain, and tapping it
opens the full chart: the item's Daily Price per day for the last 30 days, the
lowest price per unit among the Products that satisfy it, with Offer days
marked. A gap in a line is a day nothing was measured; nothing is filled in.
There is a crosshair (arrow keys work too) and a table view. History starts on
the first day archived and cannot be backfilled. It comes from `prices.js`,
which `pull-catalogue.sh` also fetches; without it the page shows no history.

Each Chain's colour was checked for colour-blind readers when the chart was
added. Dirk's green and Jumbo's former maroon were nearly the same colour for
deuteranopes, so Jumbo is amber now. Vomar, the third, is purple rather than the
blue first in the palette: for tritanopes that blue sat beside Dirk's green
(ΔE 12). The purple stays at least ΔE 33 from both others under every type
simulated, and carries white text at 4.5:1 or better in both themes. Plus,
the fourth, is indigo (light `#4a3ad0`, dark `#7050f8`), at least ΔE 28 from
every other Chain under every type, and white text at 5:1 or better. Lidl,
the fifth, is red (light `#901000`, dark `#c00038`), at least ΔE 26 from
every other Chain under every type, and white text at 6:1 or better.
Hoogvliet, the sixth, is plum (light `#782860`, dark `#984080`), at least
ΔE 21 from every other Chain under every type, and white text at 6:1 or
better; the teal first in the palette for that slot sat ΔE 7 from Dirk's
green. DekaMarkt, the seventh, is burnt orange (`#a84000` in both
themes), at least ΔE 12 from every other Chain for normal vision and ΔE 6
under every type simulated, the most seven hues allow beside a Chain's name;
white text at 6:1. Aldi, the eighth, is mauve (light `#985078`, dark
`#b05888`), at least ΔE 11 (light) and ΔE 8 (dark) from every other Chain
under every type, white text at 5.6:1 and 4.6:1; Aldi's own blue sat
ΔE 4 from Plus's indigo. Each Chain's colour is fixed by its id, not its place in the list, so a Chain
added later never repaints another.

A **Correction** is kept per Chain and Ingredient (and Variant), so correcting
rundergehakt once holds for every list item and recipe that needs it.
Corrections made before Ingredients are moved over when the page loads.
Corrections are still the asset a competitor cannot scrape (ADR-0004): the
vocabulary maps about half of each Chain's food Products, and they cover what
it misses. The lowest Unit Price can still force a pack many times larger than
the requirement, so cells flag "pack is 10x what you need".

## Exact products

Some items are a particular branded product rather than a kind of food:
Calvé Pindakaas Regular 350 g, not just pindakaas (#15). Typing a brand and
product ("calve pindakaas 350 g") offers the matching **Exact Products**
under the input, and the "ander product" sheet offers one wherever a
candidate is one. Choosing it turns the item into that very product, counted
in packs.

An Exact Product is proven by a shared EAN (ADR-0006): 2,502 of them were
shared by Jumbo and Vomar on 2026-10-14. `src/catalogue/exact.ts` builds them
and refuses three joins the data showed to be wrong: in-store codes (EANs
starting with 2), own-brand Products, and one EAN on two packs that differ by
more than 10% (`docs/ingest.md`).

Exact items are compared **as themselves, in their own section, with their
own per-Chain totals**, on Lijst, Vergelijk and Winkelen. They are never added
to a bag's total, because the bags compare Ingredients and usually pick an own
brand, and the two can name different winners. Dirk publishes no EANs, so it
is never in an exact comparison. It says "niet vergelijkbaar", not "niet te
koop", and where a Dirk Product is likely the same (same brand, same pack,
the closest name, 772 of them) it is shown as "waarschijnlijk hetzelfde" and
counted nowhere.

## Not built here

No server, no accounts, no sharing between devices, no real recipe data (the
six recipes are examples, marked so; their prices and Offers are real), no
Suggestions, and no attempt at own-brand equivalence. Corrections stay in one
browser rather than being folded back into a shared vocabulary (ADR-0004).
