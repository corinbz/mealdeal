# Recipes are our own, or adapted from Wikibooks and credited

Recipes come from two sources, and from no other. Most are **our own**,
written for mealdeal in our own words: Dutch weeknight meals, drafted and then
reviewed by the project owner. The rest are **adapted from the Dutch Wikibooks
Kookboek** (nl.wikibooks.org/wiki/Kookboek, over 600 recipes, CC BY-SA 4.0),
chosen one at a time and rewritten to our format. Decided by the project owner
on 2026-10-14 (#9).

A Chain's recipes were rejected. Dirk's gateway serves recipes whose
ingredients are already joined to its products, which would make offer-driven
matching nearly free, but the text is Dirk's copyright. Taking it is the
supplier-text exposure ADR-0003 rules out, and the joins only reach Dirk's
shelves. Showing a Chain's recipe title and ingredients and linking to it
for the steps was rejected too: it depends on someone else's site, and
copying its ingredient lists systematically draws on its database right.
English open datasets (scraped sites, US measures) were not considered
worth adapting.

Our own recipes cost writing effort, so they start at a few dozen and grow.
Wikibooks adds variety sooner, at the price of a second licence and uneven
quality, which is why its recipes are picked and adapted rather than imported
wholesale.

## Licence and copyright

- **Our own recipes** are ours outright: text, steps and anything else we
  write. Nothing restricts selling the app later.
- **A Wikibooks recipe** is an adaptation of CC BY-SA 4.0 material. Its
  adapted text, and only that, is licensed CC BY-SA 4.0 in turn (share-alike).
  The app around it is a collection, not an adaptation, and stays ours.
  Wherever the recipe is shown, it carries a credit line: the original
  page's title linking to that page (whose history lists its authors), "CC
  BY-SA 4.0" linking to the licence, and a note that we changed it, such as
  "Bewerkt naar *Stamppot* op Wikibooks, CC BY-SA 4.0". The page's revision
  we adapted is stored with the recipe.
- An ingredient list is a set of facts; the method's wording is what is
  protected. Our own recipes are written from scratch, never paraphrased from
  a source we have no licence for.

## How recipes relate to the Ingredient model

A Recipe is a list of **Requirements** (CONTEXT.md), the same thing a Basket
Item is, so it is costed like a Basket: "500 g andijvie", "275 g rookworst",
each resolved per Chain through the Ingredient vocabulary. Pantry basics
(salt, oil, a stock cube) are listed apart from the Requirements and not
priced. Every Requirement must name an Ingredient the vocabulary knows; an
adapted recipe whose ingredients cannot be written that way is changed or
not taken. A Recipe that a Chain cannot resolve in full is shown as
incomplete there, never ranked as if the missing part were free (#20).

Recipes are stored in the repository as data, one record per recipe: name,
persons, minutes, Requirements, pantry, steps, and its source (`own`, or
`wikibooks` with page URL and revision id). They change by review like code,
and no database is needed.

## What may be displayed

- **Text and steps**: all of our own; a Wikibooks recipe's adapted text with
  its credit line.
- **Images**: one photo per recipe, either our own or licensed for
  commercial use (CC0, or CC BY with its credit shown), stored with its
  licence and credit and served by us. Never a Chain's image, nor one
  hotlinked from Wikibooks or Wikimedia Commons without its licence checked
  and recorded. Until a recipe has such a photo, it is shown without one.
- Never a Chain's recipe text, title list or photos, as ADR-0003 already says
  of product media.
