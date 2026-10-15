/**
 * Ingredients a Chain really does not sell, so the coverage report (#35)
 * stops listing them. Each says why, and the report names any the Chain sells
 * after all, so an entry does not outlive its reason.
 */

import type { KnownGap } from "./coverage.ts";

export const KNOWN_GAPS: readonly KnownGap[] = [
  { chain: "aldi", ingredient: "zure room", why: "no zure room or sour cream in Aldi's range (checked 2026-10-14, #33)" },
  { chain: "aldi", ingredient: "witte bonen", why: "only witte bonen in tomatensaus, no plain ones (checked 2026-10-14, #33)" },
  { chain: "dirk", ingredient: "gehakt/half-om-half", why: "Dirk's only half-om-half is organic and filed with cold cuts (checked 2026-10-14, #33)" },
  { chain: "aldi", ingredient: "peultjes", why: "no peultjes or sugar snaps in Aldi's range (checked 2026-10-15)" },
  { chain: "aldi", ingredient: "venkel", why: "no venkel in Aldi's range (checked 2026-10-15)" },
  { chain: "aldi", ingredient: "peterselie", why: "Aldi's fresh parsley is filed with the dried spices, which the aisle cannot tell apart (checked 2026-10-15)" },
  { chain: "aldi", ingredient: "koriander", why: "Aldi's fresh coriander is filed with the dried spices, which the aisle cannot tell apart (checked 2026-10-15)" },
  { chain: "aldi", ingredient: "dille", why: "Aldi's fresh dill is filed with the dried spices, which the aisle cannot tell apart (checked 2026-10-15)" },
  { chain: "aldi", ingredient: "munt", why: "Aldi's fresh mint is filed with the dried spices, which the aisle cannot tell apart (checked 2026-10-15)" },
  { chain: "aldi", ingredient: "tijm", why: "no fresh tijm in Aldi's range (checked 2026-10-15)" },
  { chain: "aldi", ingredient: "rozemarijn", why: "no fresh rozemarijn in Aldi's range (checked 2026-10-15)" },
  { chain: "aldi", ingredient: "kersen", why: "only kersen op siroop and jam, no fresh cherries (checked 2026-10-15)" },
  { chain: "aldi", ingredient: "granaatappel", why: "only a drink with pomegranate, no fruit (checked 2026-10-15)" },
  { chain: "aldi", ingredient: "rundvlees reepjes", why: "only shoarma-, kip- and spekreepjes, no beef strips (checked 2026-10-15)" },
  { chain: "aldi", ingredient: "halloumi", why: "no halloumi or grillkaas in Aldi's range (checked 2026-10-15)" },
  { chain: "aldi", ingredient: "brood/meergranen", why: "multigrain only as baguettes and rolls, no loaf (checked 2026-10-15)" },
  { chain: "aldi", ingredient: "quinoa", why: "no quinoa in Aldi's range (checked 2026-10-15)" },
  { chain: "aldi", ingredient: "suiker/basterd", why: "only kristal-, poeder- and rietsuiker (checked 2026-10-15)" },
  { chain: "aldi", ingredient: "gist", why: "no yeast in Aldi's range (checked 2026-10-15)" },
  { chain: "hoogvliet", ingredient: "peultjes", why: "no peultjes or sugar snaps in Hoogvliet's range (checked 2026-10-15)" },
  { chain: "hoogvliet", ingredient: "paddenstoelen", why: "only champignons; other mushrooms only in soups and sauces (checked 2026-10-15)" },
  { chain: "hoogvliet", ingredient: "pastinaak", why: "pastinaak only in baby food (checked 2026-10-15)" },
  { chain: "hoogvliet", ingredient: "grapefruit", why: "grapefruit only as drinks (checked 2026-10-15)" },
  { chain: "hoogvliet", ingredient: "pruimen", why: "only dried prunes and jam, no fresh plums (checked 2026-10-15)" },
  { chain: "hoogvliet", ingredient: "quinoa", why: "quinoa only in baby food (checked 2026-10-15)" },
  { chain: "dirk", ingredient: "varkenshaas", why: "no varkenshaas in Dirk's range (checked 2026-10-15)" },
  { chain: "dirk", ingredient: "halloumi", why: "no halloumi or grillkaas in Dirk's range (checked 2026-10-15)" },
  { chain: "dekamarkt", ingredient: "dille", why: "only dried Silvo dille (checked 2026-10-15)" },
  { chain: "dekamarkt", ingredient: "rozemarijn", why: "only dried Silvo rozemarijn (checked 2026-10-15)" },
  { chain: "vomar", ingredient: "kalkoenfilet", why: "turkey only in pet food (checked 2026-10-15)" },
  { chain: "vomar", ingredient: "rundvlees reepjes", why: "no beef strips in Vomar's range (checked 2026-10-15)" },
  { chain: "vomar", ingredient: "gehakt/kip", why: "no kipgehakt in Vomar's range (checked 2026-10-15)" },
  { chain: "aldi", ingredient: "paksoi", why: "no paksoi in Aldi's range (checked 2026-10-15)" },
  { chain: "aldi", ingredient: "surimi", why: "only a surimi krabsalade, no sticks (checked 2026-10-15)" },
  { chain: "aldi", ingredient: "pasta/tagliatelle", why: "only a weekly choice of tagliatelle or gnocchi (checked 2026-10-15)" },
  { chain: "aldi", ingredient: "oregano", why: "only crackers with oregano, no herb (checked 2026-10-15)" },
  { chain: "aldi", ingredient: "sriracha", why: "only a choice of sriracha- or truffelmayonaise (checked 2026-10-15)" },
];
