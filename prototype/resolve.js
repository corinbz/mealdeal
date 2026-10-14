// Resolution: reading a typed item as a Requirement, and choosing which of a
// Chain's Products satisfy it (#14). Shared by the basket page and the weekly
// digest (scripts/digest.ts), so a staple resolves the same way in both. A
// plain script, not a module, so the page still works opened from disk.
//
// A typed item names an Ingredient from the catalogue's vocabulary, perhaps a
// Variant ("halfvolle melk"), and perhaps Preferences ("bio", "huismerk",
// "diepvries"). Its candidates are that Chain's Products of the Ingredient,
// within the Variant and Preferences, fresh unless a Preference allows
// otherwise, cheapest per unit first. An item the vocabulary does not know is
// still resolved, by the old word matching on Product names, and says so.
(function (global) {
  const W = global.MealdealWords;

  /** Words that set a Preference, removed before the Ingredient is read. */
  const PREFERENCES = [
    [/\b(bio|biologisch|biologische)\b/g, "biologisch"],
    [/\bhuismerk\b/g, "huismerk"],
    [/\ba-?merk\b/g, "amerk"],
    [/\b(diepvries|bevroren)\b/g, "diepvries"],
    [/\b(uit (blik|pot)|blik|pot|conserven)\b/g, "conserven"],
  ];

  function createResolver(data) {
    const C = Object.fromEntries(data.columns.map((name, i) => [name, i]));
    const at = (r, name) => (C[name] === undefined ? null : r[C[name]] ?? null);
    const vocabulary = new Map((data.vocabulary || []).map((d) => [d.id, d]));

    const products = {}, searchable = {}, byIngredient = {};
    for (const c of data.chains) {
      products[c.id] = {}; byIngredient[c.id] = {};
      searchable[c.id] = data.catalogue[c.id].map((r) => {
        const id = c.id + "-" + at(r, "ref"), flags = at(r, "flags") || 0;
        const p = products[c.id][id] = {
          id, chainId: c.id, name: at(r, "name"), packaging: at(r, "packaging"),
          packQuantity: at(r, "packQuantity"), packUnit: at(r, "packUnit"), comparisonUnit: at(r, "comparisonUnit"),
          shelfPriceCents: at(r, "shelfPriceCents"), offerPriceCents: at(r, "offerPriceCents"), unitPriceCents: at(r, "unitPriceCents"),
          offerWording: at(r, "offerWording"), offerEndsOn: at(r, "offerEndsOn"),
          // The next Offer, kept apart from the running one (#8). It has no price until it runs.
          nextWording: at(r, "nextWording"), nextStartsOn: at(r, "nextStartsOn"),
          ingredient: at(r, "ingredient"), variant: at(r, "variant"), form: at(r, "form"),
          biologisch: (flags & 1) !== 0, huismerk: (flags & 2) !== 0,
          ingredientUnitPriceCents: at(r, "ingredientUnitPriceCents"), ingredientPack: at(r, "ingredientPack"),
          // Absent from a catalogue built without history (scripts/apply-history.ts).
          referenceLowCents: at(r, "referenceLowCents"), referenceDays: at(r, "referenceDays"),
        };
        if (p.ingredient) (byIngredient[c.id][p.ingredient] ??= []).push(p);
        return { id, unit: p.comparisonUnit, words: W.nameWords(p.name) };
      });
    }

    // Every name a shopper may type for an Ingredient or one of its Variants,
    // stemmed, so "kruimige aardappelen" and "aardappel" both read.
    const names = new Map();
    const key = (text) => W.wordsOf(text).join(" ");
    for (const d of vocabulary.values()) {
      for (const n of [d.name, d.id, ...d.also]) if (!names.has(key(n))) names.set(key(n), { ingredient: d.id, variant: null });
      for (const v of d.variants) names.set(key(v.name), { ingredient: d.id, variant: v.id });
    }

    const matching = (chainId, unit, words) => searchable[chainId].filter((p) =>
      (unit === null || p.unit === unit) && W.matches(words, p.words));
    const tally = (words) => {
      const counts = { kg: 0, l: 0, piece: 0 };
      for (const c of data.chains) for (const p of matching(c.id, null, words)) counts[p.unit]++;
      return counts;
    };

    /** The Ingredient and Variant a noun names: the whole of it, or its last words ("verse spinazie"). */
    function lookup(noun) {
      const words = W.wordsOf(noun);
      for (let i = 0; i < words.length; i++) {
        const found = names.get(words.slice(i).join(" "));
        if (found) return found;
      }
      return null;
    }

    /** "500 g bio rundergehakt" -> a Requirement with its Ingredient, Variant and Preferences. */
    function parse(text) {
      const preferences = {};
      let rest = " " + text.toLowerCase() + " ";
      for (const [pattern, name] of PREFERENCES) rest = rest.replace(pattern, () => { preferences[name] = true; return " "; });
      const item = W.parse(rest, tally);
      if (!item) return null;
      const found = lookup(item.noun), def = found && vocabulary.get(found.ingredient);
      const base = { ...item, text: text.trim().replace(/\s+/g, " "), preferences };
      if (!def) return { ...base, ingredient: null, variant: null };
      let { quantity, unit, guessed } = item;
      if (unit !== def.unit) {
        // Written in another unit than the Ingredient compares by: convert
        // where the vocabulary says how ("500 g courgette" is about 1.7), and
        // otherwise keep the number in the Ingredient's unit, marked a guess.
        const x = def.equals && def.equals[unit];
        if (x) quantity = Math.round((quantity / x) * 1000) / 1000;
        else guessed = true;
        unit = def.unit;
      }
      return { ...base, noun: found.variant ? def.variants.find((v) => v.id === found.variant).name : item.noun,
        quantity, unit, guessed, ingredient: def.id, variant: found.variant };
    }

    /** Whether a Product may satisfy a Requirement. */
    function satisfies(p, item) {
      if (p.ingredient !== item.ingredient || p.ingredientUnitPriceCents === null) return false;
      if (item.variant && p.variant !== item.variant) return false;
      const prefs = item.preferences || {}, def = vocabulary.get(item.ingredient);
      // Fresh is assumed where an Ingredient is sold fresh.
      if (def && def.fresh && (p.form === "diepvries" ? !prefs.diepvries : p.form === "conserven" ? !prefs.conserven : false)) return false;
      if (prefs.biologisch && !p.biologisch) return false;
      if (prefs.huismerk && !p.huismerk) return false;
      if (prefs.amerk && p.huismerk) return false;
      return true;
    }

    /** What a Product costs per unit of this Requirement. */
    const unitPrice = (p, item) => (item.ingredient ? p.ingredientUnitPriceCents : p.unitPriceCents);

    /** A Chain's candidates, cheapest per unit first; ties go to the cheaper pack. */
    function candidates(chainId, item) {
      const list = item.ingredient
        ? (byIngredient[chainId][item.ingredient] || []).filter((p) => satisfies(p, item))
        : matching(chainId, item.unit, W.wordsOf(item.noun)).map((s) => products[chainId][s.id]);
      return list.sort((a, b) => unitPrice(a, item) - unitPrice(b, item) || a.shelfPriceCents - b.shelfPriceCents);
    }

    /** Packs to buy for a Requirement, and whether the pack size made that sum possible. */
    function packsFor(p, item) {
      const pack = item.ingredient ? p.ingredientPack : p.packUnit === item.unit ? p.packQuantity : null;
      // A pack in another unit than the item (3 soup sachets for a
      // requirement in kg) is no usable arithmetic: one pack is all we can say.
      const known = pack > 0;
      return { known, packs: known ? Math.max(1, Math.ceil(item.quantity / pack)) : 1, pack };
    }

    /** The key a Correction is kept under: per Chain and Ingredient (and Variant), so it applies everywhere. */
    const correctionKey = (chainId, item) => item.ingredient
      ? chainId + "|i|" + item.ingredient + "|" + (item.variant || "")
      : chainId + "|" + item.unit + "|" + item.noun.toLowerCase();

    return { products, vocabulary, parse, candidates, satisfies, packsFor, unitPrice, correctionKey };
  }

  global.MealdealResolve = { createResolver };
})(typeof window !== "undefined" ? window : globalThis);
