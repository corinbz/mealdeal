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

  /** `prices` is window.PRICES (scripts/daily-prices.ts), or nothing when there is no history. */
  function createResolver(data, prices) {
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

    /**
     * The name of the Ingredient or Variant an unrecognised noun is probably a
     * typo of ("kipdijfillet" -> "kipdijfilet"), or null. Close means one
     * letter off, or two in a longer name: closer than that is a different
     * word, and a guess would be worse than "not recognised".
     */
    const display = new Map();
    for (const d of vocabulary.values()) {
      for (const n of [d.name, ...d.also]) if (!display.has(key(n))) display.set(key(n), n);
      for (const v of d.variants) display.set(key(v.name), v.name);
    }
    function suggest(noun) {
      const typed = W.wordsOf(noun).join(" ");
      if (!typed || names.has(typed)) return null;
      const allowed = typed.length > 7 ? 2 : 1;
      let best = null, bestDistance = allowed + 1;
      for (const [k, name] of display) {
        if (Math.abs(k.length - typed.length) > allowed) continue;
        const d = distance(typed, k);
        if (d < bestDistance) { best = name; bestDistance = d; }
      }
      return best;
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
        if (found) return { ...found, partial: i > 0 };
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
      if (!def) return { ...base, ingredient: null, variant: null, suggestion: suggest(item.noun) };
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
      // Read from its last words only ("halfvole melk" as melk), a misspelt
      // Variant would be dropped without a word: suggest it.
      return { ...base, noun: found.variant ? def.variants.find((v) => v.id === found.variant).name : item.noun,
        quantity, unit, guessed, ingredient: def.id, variant: found.variant, ...(found.partial ? { suggestion: suggest(item.noun) } : {}) };
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

    /**
     * The Daily Price of a Requirement at one Chain, per day (#16): the lowest
     * price per unit among the Products that satisfy it, at the Offer price
     * while a priced Offer ran. A day none of them was observed is null, a
     * gap, never filled in from its neighbours.
     */
    function dailyPrices(chainId, item) {
      const dates = (prices && prices.dates) || [];
      const series = (prices && prices.series[chainId]) || {};
      const days = dates.map(() => null);
      for (const p of candidates(chainId, item)) {
        const s = series[p.id.slice(chainId.length + 1)];
        if (!s) continue;
        s.forEach((day, i) => {
          if (day === null) return;
          const cents = Array.isArray(day) ? day[0] : day;
          if (days[i] === null || cents < days[i].cents) days[i] = { cents, offer: Array.isArray(day), product: p.name };
        });
      }
      return { dates, days };
    }

    /** A staple's Price Drop at one Chain today (#19), or null; see priceDrop. */
    const priceDropAt = (chainId, item) => priceDrop(dailyPrices(chainId, item).days);

    // ── Exact Products (#15) ─────────────────────────────────────────────
    // One branded item at one Pack Size, proven at each Chain by a shared EAN
    // (src/catalogue/exact.ts). A Chain publishing no EANs (Dirk) may have a
    // Product that is only likely the same: shown, never counted as exact.
    const fold = (t) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    const exact = new Map(), exactOf = {};
    for (const g of data.exact || []) {
      const member = (c, ref) => products[c] && products[c][c + "-" + ref];
      const members = Object.entries(g.members).map(([c, ref]) => member(c, ref)).filter(Boolean);
      if (members.length < 2) continue;
      const pack = members.find((p) => p.packUnit && p.packQuantity) || null;
      exact.set(g.id, { ...g, pack, words: members.map((p) => W.nameWords(fold(p.name))) });
      for (const p of members) (exactOf[p.chainId] ??= {})[p.id] = g.id;
    }
    /** The Exact Product a Product is, or null. */
    const exactIdOf = (p) => (exactOf[p.chainId] && exactOf[p.chainId][p.id]) || null;
    /** A Chain's own Product of an Exact Product, proven by EAN; null when it does not sell it. */
    function exactProduct(chainId, id) {
      const g = exact.get(id), ref = g && g.members[chainId];
      return (ref && products[chainId][chainId + "-" + ref]) || null;
    }
    /** A Product only likely the same, at a Chain publishing no EANs; null when none is. */
    function likelyProduct(chainId, id) {
      const g = exact.get(id), ref = g && g.likely[chainId];
      return (ref && products[chainId][chainId + "-" + ref]) || null;
    }
    /**
     * Exact Products a typed item may mean: "calvé pindakaas 350 g". At least
     * two words, a brand and what it is, each a word of some member's name
     * (or its start), and a stated weight or volume within 10% of the pack.
     * The closest names first.
     */
    const MEASURE = /(\d+(?:[.,]\d+)?)\s*(g|gr|gram|kg|kilo|ml|cl|l|liter)\b/;
    const TO_BASE = { g: ["kg", 0.001], gr: ["kg", 0.001], gram: ["kg", 0.001], kg: ["kg", 1], kilo: ["kg", 1],
      ml: ["l", 0.001], cl: ["l", 0.01], l: ["l", 1], liter: ["l", 1] };
    function exactMatches(text, limit = 4) {
      // The pack is often typed after the name ("pindakaas 350 g"), which
      // the list's own reading takes for part of the noun: read it anywhere.
      let rest = " " + fold(text) + " ", stated = null;
      const m = rest.match(MEASURE);
      if (m) {
        const [unit, x] = TO_BASE[m[2]];
        stated = { unit, quantity: Number(m[1].replace(",", ".")) * x };
        rest = rest.replace(m[0], " ");
      }
      const item = W.parse(rest, tally);
      const typed = item ? W.wordsOf(item.noun) : [];
      if (typed.length < 2) return [];
      if (!stated && !item.guessed && item.unit !== "piece") stated = item;
      const out = [];
      for (const g of exact.values()) {
        let extra = Infinity;
        for (const ws of g.words) {
          if (!typed.every((t) => ws.some((w) => w === t || (t.length >= 4 && w.startsWith(t))))) continue;
          extra = Math.min(extra, ws.length - typed.length);
        }
        if (extra === Infinity) continue;
        if (stated && g.pack && g.pack.packUnit === stated.unit) {
          const ratio = stated.quantity / g.pack.packQuantity;
          if (ratio < 1 / 1.1 || ratio > 1.1) continue;
        }
        out.push({ id: g.id, name: g.name, extra });
      }
      return out.sort((a, b) => a.extra - b.extra || a.name.localeCompare(b.name)).slice(0, limit);
    }

    /**
     * Where the Chain makes the most difference (#36), for Bladeren and the
     * morning coverage report alike. Per Ingredient, each Chain's cheapest
     * Product in the Ingredient's unit, priced Offers included; `share` is how
     * far the cheapest Chain is below the middle one. `worth` is every priced
     * Offer below each other Chain's cheapest, the best per Chain and Ingredient.
     *
     * A difference over SPREAD_CHECK is more often a wrong match or a slipped
     * unit than a bargain, so it is `unchecked` until data.checked names that
     * very Product as looked at (src/catalogue/checked-spreads.ts).
     */
    function spreads() {
      const checked = new Set((data.checked || []).map((k) => k.chain + "-" + k.ref + "|" + k.ingredient));
      const unchecked = (p, share) => share > SPREAD_CHECK && !checked.has(p.id + "|" + p.ingredient);
      const ingredients = (data.vocabulary || []).map((d) => {
        const item = { ingredient: d.id, variant: null, preferences: {} };
        const by = {};
        for (const c of data.chains) { const p = candidates(c.id, item)[0]; if (p) by[c.id] = { p, cost: p.ingredientUnitPriceCents }; }
        const avail = data.chains.filter((c) => by[c.id]).sort((a, b) => by[a.id].cost - by[b.id].cost);
        const min = avail.length ? by[avail[0].id].cost : null, max = avail.length ? by[avail.at(-1).id].cost : null;
        // Against the middle Chain, not the dearest: one odd Product at one
        // Chain (bouillon powder against cubes) would otherwise top the list.
        // An offers-only Chain is in the line but not the middle, which it would only pull down.
        const mids = avail.filter((c) => !c.offersOnly).map((c) => by[c.id].cost), n = mids.length;
        const mid = n ? (n % 2 ? mids[n >> 1] : Math.round((mids[n / 2 - 1] + mids[n / 2]) / 2)) : null;
        const share = n > 1 && mid ? Math.max(0, (mid - min) / mid) : 0;
        return { d, by, avail, min, max, mid, share, unchecked: avail.length > 0 && unchecked(by[avail[0].id].p, share) };
      });
      const byId = new Map(ingredients.map((g) => [g.d.id, g]));
      // An Offer worth it is priced and beats every other Chain's cheapest of
      // its Ingredient today: a Chain's own "was" price says little about that.
      // One with no price of its own ("1+1 gratis") cannot be ranked (ADR-0002).
      const best = new Map();
      for (const c of data.chains) for (const p of Object.values(products[c.id])) {
        if (!p.ingredient || p.offerPriceCents === null || !satisfies(p, { ingredient: p.ingredient, variant: null, preferences: {} })) continue;
        const g = byId.get(p.ingredient); if (!g) continue;
        const rival = g.avail.find((x) => x.id !== c.id);
        if (!rival || p.ingredientUnitPriceCents >= g.by[rival.id].cost) continue;
        const share = 1 - p.ingredientUnitPriceCents / g.by[rival.id].cost;
        // The cheapest per Chain and Ingredient: six Jumbo pumpkins on Offer are one find.
        const k = c.id + "|" + g.d.id;
        if (!best.has(k) || share > best.get(k).share) best.set(k, { p, c, g, rival, rivalCost: g.by[rival.id].cost, share, unchecked: unchecked(p, share) });
      }
      return { ingredients, worth: [...best.values()].sort((a, b) => b.share - a.share) };
    }

    return { products, vocabulary, parse, suggest, candidates, satisfies, packsFor, unitPrice, correctionKey, dailyPrices, priceDropAt,
      exact, exactIdOf, exactProduct, likelyProduct, exactMatches, spreads };
  }

  /**
   * The Price Drop rule (#19, CONTEXT.md). The Usual Price is the median of the
   * Daily Prices observed before today, Offer days included, so a staple that
   * is often on Offer is usually that cheap and does not alert. A Price Drop
   * is today's Daily Price at least DROP_SHARE below it. Fewer than
   * USUAL_MIN_DAYS observed days before today is not enough to judge, and a
   * Chain not observed today has no price to alert on.
   */
  const USUAL_MIN_DAYS = 14, DROP_SHARE = 0.15;
  function priceDrop(days) {
    const now = days[days.length - 1];
    const before = days.slice(0, -1).filter(Boolean).map((d) => d.cents).sort((a, b) => a - b);
    if (!now || before.length < USUAL_MIN_DAYS) return null;
    const mid = before.length >> 1;
    const usualCents = before.length % 2 ? before[mid] : Math.round((before[mid - 1] + before[mid]) / 2);
    if (now.cents > usualCents * (1 - DROP_SHARE)) return null;
    return { cents: now.cents, usualCents, percent: Math.round((1 - now.cents / usualCents) * 100), offer: now.offer, product: now.product };
  }

  /** Edits between two strings, a swap of neighbours counting as one ("kpi" for "kip"). */
  function distance(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
    return d[a.length][b.length];
  }

  /** A difference between Chains larger than this is checked before it is shown as a bargain. */
  const SPREAD_CHECK = 0.7;

  global.MealdealResolve = { createResolver, priceDrop, USUAL_MIN_DAYS, DROP_SHARE, SPREAD_CHECK };
})(typeof window !== "undefined" ? window : globalThis);
