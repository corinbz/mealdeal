# Basket Items are requirements, not Products

A Basket Item names a requirement ("500g peanut butter"), and each Chain
resolves it to a Product of its own. We deliberately do not model a Basket as a
list of specific Products shared across Chains.

The alternative — identifying a Product and then finding its equivalent in
every other Chain — requires cross-Chain product equivalence, which does not
exist for own-brand (huismerk) goods by construction: AH Basic and Jumbo's
huismerk carry different EANs and no authority maps between them. Requirements
sidestep this entirely: we need per-Chain category resolution, not SKU
equivalence. The cost is that a Basket total depends on our Resolution choices,
so Coverage must always be reported alongside it.
