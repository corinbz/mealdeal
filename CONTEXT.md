# mealdeal

Grocery price aggregation across Dutch supermarket chains, and meal planning
driven by what is currently discounted.

## Language

### Chains and stores

**Chain**:
A supermarket brand operating under one assortment and pricing policy, such as
Albert Heijn or Jumbo.
_Avoid_: Supermarket, retailer, shop

**Store**:
A single physical location belonging to a Chain, at a street address.
_Avoid_: Branch, location, outlet, shop

**National Chain**:
A Chain with Stores throughout the Netherlands, such as Albert Heijn or Jumbo.
_Avoid_: Big chain, major chain

**Regional Chain**:
A Chain whose Stores cluster in part of the country, such as Dirk or Vomar.
_Avoid_: Local chain, small chain

**Offers-only Chain**:
A Chain that prices online only what it has on Offer that week, such as
Lidl. Its Products compete item by item, but it is never a Basket's whole
shop, because what it does not list may well be on its shelves.
_Avoid_: Partial chain, folder chain

### Products and prices

**Product**:
One purchasable item in a Chain's assortment, at a single Pack Size.
_Avoid_: Item, SKU, article

**Ingredient**:
A kind of food regardless of brand, Pack Size or Chain, such as melk or
pindakaas. Each Chain's Products map onto Ingredients; a Product that is not
one food, such as a ready meal, maps to none.
_Avoid_: Food, category, product type, grocery

**Variant**:
A kind of an Ingredient, in one of three aspects: its type (meat, texture,
cut: rundergehakt, griekse yoghurt), its fat (halfvolle melk, yoghurt 10%) or
its flavour (yoghurt aardbei, paprikachips). A Product has at most one Variant
in each aspect, so Griekse yoghurt 10% aardbei has three; one that names no
flavour is naturel. A Requirement may name Variants in any of the aspects and
is satisfied by any Product that has them all, whatever its others.
A Basket Item that leaves an aspect unnamed is asked about it, offered only the
Variants sold with what it already names, until the shopper picks one or
answers that the rest is "any", which is then its choice.
_Avoid_: Subtype, sort

**Exact Product**:
One branded item at one Pack Size, as sold by several Chains: the same
Calvé pindakaas 350 g wherever it is. Proven by a shared EAN; a Product
without one, such as every Product at Dirk, joins by brand, name and Pack Size
and is then only ever shown as likely the same. Own-brand goods are never an
Exact Product, since no two Chains share one: they compete only as Products of
one Ingredient.
_Avoid_: Same product, equivalent, identical product, match

**Chain Reference**:
The identifier a Chain uses for one of its own Products. It is meaningful only
inside that Chain and asserts nothing across Chains, unlike an EAN.
_Avoid_: SKU, article number, product id, barcode

**Pack Size**:
The quantity of a Product in one package, as the Chain states it. Kept as
written even when it names no quantity, since a Product whose Pack Size cannot
be read has no Unit Price and so is not a comparison candidate.
_Avoid_: Packaging, unit size, content, volume

**Shelf Price**:
What a Chain charges for a Product when no Offer applies.
_Avoid_: List price, normal price, base price

**Offer**:
A price reduction a Chain advertises on a Product for a bounded period, often
conditional on buying a given quantity. Known Offers may start in the future.
_Avoid_: Discount, deal, promotion, bonus, aanbieding

**Reference Price**:
The lowest price a Product was sold for in the 30 days before an Offer on it
began, from recorded Observations only. An Offer is a real low only when it
is below this. It is per Product, never per Ingredient, and when less than 30
days are recorded it states how many it covers.
_Avoid_: Was price, original price, previous price, van-prijs

**Unit Price**:
A Product's price normalised to a comparable quantity, such as per kilogram or
per litre. The figure all comparison is done on.
_Avoid_: Price per kg, normalised price, unit cost

**Daily Price**:
For one Chain on one day, the lowest Unit Price a shopper could pay in a Store for an
Ingredient, at the Offer price while a priced Offer runs. Within one Variant
when one is named, otherwise across all of them; within any Preferences; and
per Store where a Chain prices per Store. A day without an Observation is a
gap, never filled.
_Avoid_: Average price, index price (and Usual Price, which is a different thing)

**Usual Price**:
For one Basket Item at one Chain, the median of its Daily Prices on the days
observed before today, within the days the page keeps (up to 30), Offer days
included: an item that is often on Offer is usually that cheap. With fewer
than 14 days observed there is no Usual Price.
_Avoid_: Average price, normal price, regular price

**Price Drop**:
A staple whose Daily Price at a Chain today is at least 15% below its Usual
Price there, shown when the app opens so a shopper can stock up (#19). No
Usual Price, or no Observation today, means no Price Drop.
_Avoid_: Deal, alert, bargain

**Comparison Unit**:
The one quantity an Ingredient is compared by — per kilogram, per litre, or
per piece. A Product priced in another unit compares only through a stated
conversion (about 250 g to a courgette), and without one it is not a
comparison candidate for that Ingredient.
_Avoid_: Measure, uom, denomination

### Recording

**Sweep**:
One pass over a Chain's catalogue, capturing everything it published at that
moment. Prices are only ever read from a Sweep already taken, never fetched
while a user waits.
_Avoid_: Run, scrape, crawl, job, import

**Observation**:
What one Sweep recorded about one Product — its Shelf Price, Unit Price and
any Offer — at one moment and one scope. Observations accumulate and are never
revised: a price not recorded on the day cannot be recovered afterwards.
_Avoid_: Sample, datapoint, snapshot, price record

### Baskets and comparison

**Basket**:
A named, saved set of Basket Items. A user may keep several. Each Item is
either a staple, kept between trips, or a one-off, cleared once a trip is done.
_Avoid_: Cart, list, order

**Requirement**:
A quantity of an Ingredient, of one of its Variants, or of one Exact Product,
such as "500 g pindakaas". What a Basket Item and a Recipe both consist of, so
that a Recipe can be costed like a Basket.
_Avoid_: Ingredient (for the quantified form), line, need

**Basket Item**:
A Requirement on a Basket, with any Preferences — not a particular Product.
Each Chain resolves it to a Product of its own independently.
_Avoid_: Line item, cart item, product

**Preference**:
A constraint on a Basket Item about how its food was produced or who made
it, such as biologisch, A-merk, huismerk, scharrel or diepvries. It narrows
which Products may satisfy the Item without changing its Ingredient or
Variant. Fresh is assumed wherever an Ingredient is sold fresh: frozen, tinned
and jarred count only when a Preference allows them.
_Avoid_: Filter, qualifier, option

**Resolution**:
Choosing which of a Chain's Products satisfies a Basket Item. By default, the
lowest Unit Price among that Chain's Products of its Ingredient, within its
Variant and Preferences; for an Exact Product, that Chain's own one of it.
_Avoid_: Matching, mapping, substitution

**Suggestion**:
An Ingredient the app offers for quick adding, drawn from what this user buys
often or bought recently.
_Avoid_: Recommendation, autocomplete, prediction

**Spelling Hint**:
The Ingredient or Variant that a typed name the app did not recognise is
probably a misspelling of, offered as "Bedoel je …?". Not a Suggestion: it
corrects what was typed rather than proposing something to add.
_Avoid_: Suggestion, typo suggestion, autocorrect

**Coverage**:
How many of a Basket's Items a Chain could resolve at all. A Basket total means
nothing without it.
_Avoid_: Match rate, completeness, hit rate

**Correction**:
A user's replacement of the Product a Resolution chose. Corrections are
reviewed and folded back into the shared vocabulary, not kept private to one
user.
_Avoid_: Override, fix, remap

### Meal planning

**Recipe**:
The Requirements and steps for one meal.
_Avoid_: Dish, meal
