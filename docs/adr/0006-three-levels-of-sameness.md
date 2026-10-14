# Products, Ingredients and Exact Products: three levels, kept apart

A Chain's Product is matched to other Chains' Products at two levels, and the
app never lets one pass for the other. An **Ingredient** (with its
**Variants**) is what comparison and Resolution run on: every Chain's Products
of halfvolle melk compete on Unit Price, whatever their brand. An **Exact
Product** is one branded item at one Pack Size, proven across Chains by a shared
EAN. Own-brand goods are matched at the Ingredient level only, and never called
the same as another Chain's.

Own-brand equivalence has no identifier by construction (ADR-0001): Jumbo's
huismerk and Dirk's 1 de Beste carry different EANs, and no authority maps
between them. A curated "equivalent own-brand" level was considered and
rejected. It would claim a sameness no one can prove, and someone would have to
maintain it. What a shopper actually wants from it, "the huismerk one at each
Chain", is a **Preference** on a Basket Item, which needs no curation. Keeping
"exactly the same" visibly apart from "comparable" is also the legal defence the
research recommends for a price comparison.

## Consequences

- Dirk publishes no EAN, so a Dirk Product can join an Exact Product only by
  brand, name and Pack Size, and it is then shown as likely the same, never as
  exactly the same. That is a second, weaker strength of sameness the
  interface has to carry.
- Ingredients are coarse, with Variants beneath them. A Requirement that names
  no Variant is satisfied by any of them, so "melk" may resolve to magere melk;
  the Variant chosen must be shown.
- The Daily Price is defined per Variant, or across all Variants when none is
  named. One line per Ingredient regardless of Variant was rejected: it would
  jump between rund and half-om-half gehakt from day to day.
