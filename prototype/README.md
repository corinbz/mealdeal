# Basket comparison prototype

A throwaway UI prototype for the one screen the whole product rests on: a
Basket, priced at every Chain, with Coverage inseparable from the total.

```sh
node scripts/build-ui-fixture.ts > prototype/fixture.json
# then inline fixture.json into the __FIXTURE__ slot in basket.html
```

## What it is testing

Three domain decisions that are easy to agree with on paper and easy to design
away by accident:

1. **A Basket Item is a requirement, not a Product** (ADR-0001). The left
   column is "500 g rundergehakt", and each Chain resolves it independently.
2. **A total means nothing without Coverage** (glossary). Coverage lives
   *inside* the same bordered block as the total, above a hairline, so the two
   cannot be read apart. When items are missing the total reads "at least
   EUR x" — because an incomplete basket's total is a floor, not a price — and
   the page refuses to name a winner at all.
3. **Offers are shown verbatim** (ADR-0002). `1+1 gratis` appears as those
   words. Nothing converts it to a percentage, because the true effective
   price depends on how many you buy.

The design inverts a real shelf label: Dutch law already puts a unit price on
every label, in grey small print under the headline deal. That small print is
the only number that compares, so it is the largest figure in every cell and
the pack price is the footnote.

## Where the data comes from

**Dirk is real** — product names, pack sizes, Shelf Prices and Offer wording
read straight out of `archive/<date>/dirk`, one Store on one morning, as the
Chain sent it. 963 products, 264 Offers.

**Jumbo is simulated** and every field says so. Jumbo's endpoint tarpits an
honest client (see `docs/archive.md`), so there is nothing real to show. Its
prices are anchored to realistic market unit prices — deliberately NOT to
Dirk's resolved Products, since several of those resolutions misfire onto
something cheap and unrelated, which made the simulated Chain absurdly cheap
across the board. Two requirements are left unresolvable on purpose: Coverage
below 100% is the normal case, and a UI that never shows it is lying.

## The wrong answers are the point

Resolution here is the crude substring rule every incumbent falls back on, and
it is left crude so its failures are visible:

| Requirement | Resolves to | Why it is wrong |
| --- | --- | --- |
| 1 kg appels | Aardappelen kruimig | "appel" also matches "aard**appel**" |
| 500 g wortelen | Doperwten en wortelen | tinned peas, not fresh carrots |
| 500 g snoeptomaatjes | Zongedroogde tomaatjes op olie | sun-dried, in oil |
| 1 komkommer | Snoepkomkommer 10 stuks | cheapest per piece, but forces a 10-pack |

Correcting one is the demonstration, not a workaround: Corrections are the
asset a competitor cannot scrape (ADR-0004), and they only exist because
automated resolution is this imperfect. The last row also surfaced a design
problem worth keeping: the lowest Unit Price can force a pack many times
larger than the requirement, so cells flag "pack is 10x what you need".

## Not built here

No persistence, no accounts, no real Jumbo, no Recipes, and no attempt at
own-brand equivalence. This is a design probe, not a slice of the product.
