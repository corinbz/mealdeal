# Offers are recorded verbatim, not modelled

Comparison runs on Unit Price derived from Shelf Price. We store whatever each Chain gives us about
an Offer — structured mechanics where the Chain exposes them, the advertised
text verbatim otherwise — and derive nothing from it.

Dutch Offers are frequently conditional — `1+1 gratis`, `2e halve prijs`,
`3 voor EUR 5` — so an Offer's true effective unit price is a function of
purchase quantity rather than a single number. Modelling that correctly is real
work and v1 does not need it: offer-driven meal planning only needs to know
*that* something is discounted, which the raw text provides. Keeping whatever we are given is the cheap insurance that matters, because price history cannot be
backfilled; discarding it would make modelling mechanics later impossible
without re-scraping time that has already passed.
