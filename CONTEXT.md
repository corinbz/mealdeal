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

### Products and prices

**Product**:
One purchasable item in a Chain's assortment, at a single Pack Size.
_Avoid_: Item, SKU, article

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

**Comparison Unit**:
The quantity an Ingredient is compared by — per kilogram, per litre, or per
piece. Products are only ever compared against others sharing one.
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

**Basket Item**:
A requirement to satisfy, such as "500g peanut butter" — not a particular
Product. Each Chain resolves it to a Product of its own independently.
_Avoid_: Line item, cart item, product

**Resolution**:
Choosing which of a Chain's Products satisfies a Basket Item. Picks the lowest
Unit Price by default.
_Avoid_: Matching, mapping, substitution

**Suggestion**:
An Ingredient the app offers for quick adding, drawn from what this user buys
often or bought recently.
_Avoid_: Recommendation, autocomplete, prediction

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
Ingredients and steps for one meal.
_Avoid_: Dish, meal

**Ingredient**:
A quantity of a food requirement inside a Recipe, expressed in the same
vocabulary as a Basket Item so that Recipes can be costed.
_Avoid_: Component, element
