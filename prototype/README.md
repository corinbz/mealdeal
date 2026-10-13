# Basket comparison prototype

A throwaway UI prototype for the one screen the whole product rests on: a
Basket, priced at every Chain, with Coverage inseparable from the total.

```sh
node scripts/basket-from-db.ts > prototype/fixture.json
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

No persistence, no accounts, no real Jumbo, no Recipes, and no attempt at
own-brand equivalence. This is a design probe, not a slice of the product.
