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
A Chain with Stores throughout the Netherlands. Albert Heijn and Jumbo are the
two the project starts with.
_Avoid_: Big chain, major chain

**Regional Chain**:
A Chain whose Stores cluster in part of the country, such as Dirk or Vomar.
_Avoid_: Local chain, small chain

### Products and prices

**Product**:
One purchasable item in a Chain's assortment, at a single pack size.
_Avoid_: Item, SKU, article

**Shelf Price**:
What a Chain charges for a Product when no Offer applies.
_Avoid_: List price, normal price, base price

**Offer**:
A price reduction a Chain advertises on a Product for a bounded period, often
conditional on buying a given quantity. Known Offers may start in the future.
_Avoid_: Discount, deal, promotion, bonus, aanbieding

**Unit Price**:
A Product's price normalised to a comparable quantity, such as per kilogram or
per litre. The figure all comparison is done on.
_Avoid_: Price per kg, normalised price, unit cost

**Comparison Unit**:
The quantity an Ingredient is compared by — per kilogram, per litre, or per
piece. Products are only ever compared against others sharing one.
_Avoid_: Measure, uom, denomination

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
