// Resolution: reading a typed item as a Requirement, and choosing which of a
// Chain's Products satisfy it (#14); and Basket pricing, what those Products
// cost. Shared by the basket page and the weekly digest (scripts/digest.ts),
// so a staple resolves and prices the same way in both. A plain script, not a
// module, so the page still works opened from disk.
//
// A typed item names an Ingredient from the catalogue's vocabulary, perhaps a
// Variant ("halfvolle melk"), and perhaps Preferences ("bio", "huismerk",
// "diepvries"). Its candidates are that Chain's Products of the Ingredient,
// within the Variant and Preferences, fresh unless a Preference allows
// otherwise, cheapest per unit first. An item the vocabulary does not know is
// still resolved, by the old word matching on Product names, and says so.
// Every language the vocabulary has names in is read, whatever the page's
// language (#25): "500 g ground beef" is rundergehakt.
(function (global) {
  const W = global.MealdealWords;

  /** Words that set a Preference, removed before the Ingredient is read. */
  const PREFERENCES = [
    [/\b(bio|biologisch|biologische|organic)\b/g, "biologisch"],
    [/\b(huismerk|(store|own|house)[ -]brand)\b/g, "huismerk"],
    [/\b(a-?merk|name[ -]brand|brand[ -]name)\b/g, "amerk"],
    [/\b(diepvries|bevroren|frozen)\b/g, "diepvries"],
    [/\b(uit (blik|pot)|blik|pot|conserven|canned|tinned|jarred)\b/g, "conserven"],
  ];

  const NOT_ITSELF = new Set(["met", "voor", "in", "op", "au", "with", "vega", "vegan", "vegetarisch", "vegetarische", "plantaardig",
    "plantaardige", "veggie", "plant", "vegetarian"].map((w) => W.stem(w)));
  // Words a name search does without: "rijstwafels met chocolade" finds "Rijstwafels chocolade".
  const JOINING = new Set(["met", "with", "en", "and"].map((w) => W.stem(w)));

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
    // stemmed, so "kruimige aardappelen" and "aardappel" both read, and in
    // which language. Dutch first; another language never takes a Dutch name.
    const names = new Map();
    const key = (text) => W.wordsOf(text).join(" ");
    for (const d of vocabulary.values()) {
      for (const n of [d.name, d.id, ...d.also]) if (!names.has(key(n))) names.set(key(n), { ingredient: d.id, variant: null, lang: "nl" });
      for (const v of d.variants) names.set(key(v.name), { ingredient: d.id, variant: v.id, lang: "nl" });
    }
    for (const d of vocabulary.values()) for (const [lang, ns] of Object.entries(d.names || {})) {
      for (const v of d.variants) for (const n of (v.names && v.names[lang]) || []) if (!names.has(key(n))) names.set(key(n), { ingredient: d.id, variant: v.id, lang });
      for (const n of ns) if (!names.has(key(n))) names.set(key(n), { ingredient: d.id, variant: null, lang });
    }
    // The words its Products are named by read as it too ("winterpeen",
    // "halvarine"), where no other Ingredient's Products are named so and no
    // name above is the same.
    const owners = new Map();
    for (const d of vocabulary.values()) for (const w of d.words || []) {
      const k = key(w);
      if (k) owners.set(k, (owners.get(k) || new Set()).add(d.id));
    }
    for (const [k, ids] of owners) if (ids.size === 1 && !names.has(k)) names.set(k, { ingredient: [...ids][0], variant: null, lang: "nl" });
    /**
     * What the page calls an Ingredient, or its Variants, in a language; Dutch
     * where it has none in that one. Several Variants ("grieks+mager+aardbei")
     * share the Ingredient's name: what comes before it in each Variant's name
     * goes before it, what comes after after, "magere griekse yoghurt aardbei";
     * a Variant named without it (skyr) takes its place.
     */
    function label(ingredient, variant, lang) {
      const d = vocabulary.get(ingredient); if (!d) return null;
      const nameOf = (own) => (lang !== "nl" && own.names && own.names[lang] && own.names[lang][0]) || own.name;
      const vs = variantsOf(variant).map((id) => d.variants.find((x) => x.id === id)).filter(Boolean);
      if (vs.length < 2) return nameOf(vs[0] || d);
      const base = nameOf(d), before = [], after = [];
      let head = base;
      for (const v of vs) {
        const n = nameOf(v), i = n.indexOf(base);
        if (i < 0) { head = n; continue; }
        if (n.slice(0, i).trim()) before.unshift(n.slice(0, i).trim());
        if (n.slice(i + base.length).trim()) after.push(n.slice(i + base.length).trim());
      }
      return [...before, head, ...after].join(" ");
    }
    /** The Variants a Product or Requirement names, one per aspect. */
    function variantsOf(variant) { return variant ? String(variant).split("+") : []; }
    /** Variants in the order of their aspects, joined as a Product's are. */
    function joinVariants(ingredient, ids) {
      const d = vocabulary.get(ingredient), order = (id) => d.variants.findIndex((v) => v.id === id);
      return ids.length ? [...ids].sort((a, b) => order(a) - order(b)).join("+") : null;
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
    for (const d of vocabulary.values()) for (const [lang, ns] of Object.entries(d.names || {})) {
      for (const n of [...ns, ...d.variants.flatMap((v) => (v.names && v.names[lang]) || [])]) if (!display.has(key(n))) display.set(key(n), n);
    }
    function suggest(noun) {
      const typed = W.wordsOf(noun).join(" ");
      if (!typed || names.has(typed)) return null;
      const allowed = typed.length > 7 ? 2 : 1;
      let best = null, bestDistance = allowed + 1;
      for (const [k, name] of display) {
        if (Math.abs(k.length - typed.length) > allowed) continue;
        const d = distance(typed, k, bestDistance - 1);
        if (d < bestDistance) { best = name; bestDistance = d; }
      }
      return best;
    }

    // No word to search on ("m&m's") matches nothing, not everything.
    const matching = (chainId, unit, typed) => { const words = typed.filter((w) => !JOINING.has(w)); return !words.length ? [] : searchable[chainId].filter((p) =>
      (unit === null || p.unit === unit) && W.matches(words, p.words)); };
    const tally = (words) => {
      // Product names are Dutch: a name in another language counts the
      // Products of its Ingredient's Dutch name.
      for (let i = 0; i < words.length; i++) {
        const found = names.get(words.slice(i).join(" "));
        if (found && found.lang !== "nl") { words = W.wordsOf(vocabulary.get(found.ingredient).name); break; }
      }
      const counts = { kg: 0, l: 0, piece: 0 };
      for (const c of data.chains) for (const p of matching(c.id, null, words)) counts[p.unit]++;
      return counts;
    };

    /**
     * The Ingredient and Variants a noun names: the whole of it, several
     * Variants' names together ("griekse yoghurt 10% aardbei"), or its last
     * words ("verse spinazie").
     */
    function lookup(noun) {
      const words = W.wordsOf(noun);
      const whole = names.get(words.join(" "));
      if (whole) return { ...whole, partial: false };
      const several = combined(words);
      if (several) return several;
      for (let i = 1; i < words.length; i++) {
        const found = names.get(words.slice(i).join(" "));
        // Not past a word that makes the rest a part of something else
        // ("rijstwafels met chocolade", "mix voor spaghetti") or not it at all ("vega gehakt").
        if (found) return words.slice(0, i).some((w) => NOT_ITSELF.has(w)) ? null : { ...found, partial: true };
      }
      return null;
    }
    /**
     * Every word read as the name of an Ingredient and its Variants in
     * different aspects, or null: the Ingredient's longest name among the
     * words, and for each aspect the Variant whose own words are all there.
     */
    function combined(words) {
      const typed = new Set(words);
      let base = null;
      for (const [k, f] of names) {
        const ws = k.split(" ");
        if (ws.every((w) => typed.has(w)) && (!base || ws.length > base.ws.length)) base = { f, ws };
      }
      if (!base) return null;
      const d = vocabulary.get(base.f.ingredient), picked = {};
      const aspectOf = (id) => (d.variants.find((v) => v.id === id) || {}).aspect || "soort";
      if (base.f.variant) picked[aspectOf(base.f.variant)] = { id: base.f.variant, n: base.ws.length };
      // A Variant's own words: its name without the Ingredient's ("aardbei" of "yoghurt aardbei").
      const plain = new Set([...names].filter(([, f]) => f.ingredient === d.id && !f.variant).flatMap(([k]) => k.split(" ")));
      for (const [k, f] of names) {
        if (f.ingredient !== d.id || !f.variant || f.variant === base.f.variant) continue;
        const own = k.split(" ").filter((w) => !plain.has(w));
        if (!own.length || !own.every((w) => typed.has(w))) continue;
        const a = aspectOf(f.variant);
        if (!picked[a] || own.length > picked[a].n) picked[a] = { id: f.variant, n: own.length };
      }
      const ids = Object.values(picked).map((p) => p.id);
      // Only worth it for more than one Variant: one is read by its whole name above.
      if (ids.length < 2) return null;
      // Every typed word must be accounted for, or it is a dish named after them.
      const covered = new Set(base.ws);
      for (const id of ids) for (const [k, f] of names) if (f.ingredient === d.id && f.variant === id) k.split(" ").forEach((w) => covered.add(w));
      if (!words.every((w) => covered.has(w))) return null;
      return { ingredient: d.id, variant: joinVariants(d.id, ids), lang: base.f.lang, partial: false };
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
      if (guessed && def.unit === "piece" && unit !== "piece") {
        // No unit written for an Ingredient counted in pieces: the number counts
        // them, so "brood" is one loaf and "2 brood" two, never 1.25 loaves'
        // worth of the kilo most bread is priced by.
        unit = "piece"; guessed = !/\d/.test(rest);
      } else if (unit !== def.unit) {
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
      // Where organic is a Variant of its own (eggs), "bio eieren" names it, not a Preference.
      let variant = found.variant;
      if (!variant && preferences.biologisch && def.variants.some((v) => v.id === "bio")) { variant = "bio"; delete preferences.biologisch; }
      // So too frozen, where it is a kind of the Ingredient: "diepvries pizza".
      if (preferences.diepvries && def.variants.some((v) => v.id === "diepvries") && !variantsOf(variant).includes("diepvries")) {
        variant = joinVariants(def.id, [...variantsOf(variant), "diepvries"]); delete preferences.diepvries;
      }
      return { ...base, noun: variant ? label(def.id, variant, found.lang) : item.noun,
        quantity, unit, guessed, ingredient: def.id, variant, ...(found.partial ? { suggestion: suggest(item.noun) } : {}) };
    }

    /** Whether a Product may satisfy a Requirement. */
    function satisfies(p, item) {
      if (p.ingredient !== item.ingredient || p.ingredientUnitPriceCents === null) return false;
      // Every Variant asked for, in whichever aspects it names: "grieks" is any Greek yoghurt.
      if (item.variant) { const has = variantsOf(p.variant); if (!variantsOf(item.variant).every((v) => has.includes(v))) return false; }
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
      // With no amount typed, one pack: the one cheapest per unit, whatever it holds.
      return { known, packs: known && !item.guessed ? Math.max(1, Math.ceil(item.quantity / pack)) : 1, pack };
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

    // ── Basket pricing ───────────────────────────────────────────────────
    // What a Basket Item, a Recipe or a whole list costs at each Chain, this
    // week or next: whole packs, priced Offers paid, Corrections honoured.
    // The basket page renders it and the digest reads it; neither prices
    // anything itself.

    /** Whether an Offer runs on the day swept. An upcoming one is never in this slot. */
    const isOnOffer = (p) => p.offerPriceCents !== null || !!p.offerWording;

    // Chains announce next week's Offers before they start (#8). Next week,
    // per Chain, begins on the first day its announced Offers do.
    const nextStarts = {};
    for (const c of data.chains) for (const p of Object.values(products[c.id])) {
      if (p.nextStartsOn && (!nextStarts[c.id] || p.nextStartsOn < nextStarts[c.id])) nextStarts[c.id] = p.nextStartsOn;
    }

    /**
     * The Offer a Product has in a week, "nu" or "volgende", or null. Next
     * week's counts if it starts then, or if this week's still runs then. One
     * that has not started has no price yet, and none is derived from its
     * wording (ADR-0002), so it is paid at the Shelf Price.
     */
    function offerFor(p, week = "nu") {
      if (week === "volgende") {
        if (p.nextWording !== null) return { wording: p.nextWording || "aanbieding", priceCents: null, startsOn: p.nextStartsOn };
        const from = nextStarts[p.chainId];
        if (!isOnOffer(p) || !from || (p.offerEndsOn && p.offerEndsOn < from)) return null;
        return { wording: p.offerWording || "aanbieding", priceCents: p.offerPriceCents, startsOn: null, continues: true };
      }
      return isOnOffer(p) ? { wording: p.offerWording || "aanbieding", priceCents: p.offerPriceCents, startsOn: null } : null;
    }

    /** What one pack costs under an Offer from offerFor, or without one. */
    const packCents = (p, o) => (o && o.priceCents ? o.priceCents : p.shelfPriceCents);

    /**
     * Whether a running Offer is a real low (#18): judged per Product against
     * the lowest price paid in the days recorded before it began. null when
     * there is no Offer or no such history. An Offer with no price of its own
     * ("1+1 gratis") is not converted into one (ADR-0002): its Shelf Price is
     * judged instead, which is where an inflated "was" price would show.
     *   lowest      the Offer price is below every recorded price
     *   not-lower   it is not
     *   shelf-up    no Offer price, and the Shelf Price is above the recorded low
     *   shelf-same  no Offer price, and the Shelf Price was not raised
     */
    function verdict(p) {
      const lowCents = p.referenceLowCents, days = p.referenceDays;
      if (!isOnOffer(p) || lowCents === null) return null;
      const kind = p.offerPriceCents === null
        ? (p.shelfPriceCents > lowCents ? "shelf-up" : "shelf-same")
        : (p.offerPriceCents < lowCents ? "lowest" : "not-lower");
      return { kind, lowCents, days };
    }

    /** The Product a Correction chose for a Requirement at a Chain, if it is still sold there. */
    function correctedProduct(chainId, item, corrections) {
      const id = corrections && corrections[correctionKey(chainId, item)];
      return (id && products[chainId][id]) || null;
    }

    /** One Product bought for a Requirement: whole packs, because you cannot buy 0.4 of one. */
    function buy(p, item, week) {
      const o = offerFor(p, week), price = packCents(p, o);
      const { known, packs, pack } = packsFor(p, item);
      return {
        p, o, offer: o ? o.wording : null, onOffer: !!o, packs, cost: packs * price,
        // How many times what was asked for is bought, in whole packs: "je koopt 2× wat je nodig hebt". null where the pack is in another unit.
        over: known ? (packs * pack) / item.quantity : null,
        // The part of what is bought that is used, which a Recipe is costed on. All of it where the pack is in another unit.
        share: known ? Math.min(1, item.quantity / (packs * pack)) : 1,
        // The packs at the Shelf Price, where the Offer price is below it.
        was: o && o.priceCents && o.priceCents < p.shelfPriceCents ? packs * p.shelfPriceCents : null,
      };
    }

    const lines = new Map();
    /**
     * A Requirement at one Chain, or null where it has no candidate: the
     * Resolution, the cheapest per unit, for the list and recipes alike
     * (owner's decision, 2026-10-15), bought in whole packs. A larger pack
     * than needed is not avoided but shown (`over`). A Correction wins.
     */
    function line(chainId, item, { week = "nu", corrections = null } = {}) {
      const fixed = correctedProduct(chainId, item, corrections);
      const key = [chainId, week, fixed ? fixed.id : "", correctionKey(chainId, item), item.unit, item.quantity, JSON.stringify(item.preferences || {})].join("|");
      if (lines.has(key)) return lines.get(key);
      let out = null;
      if (fixed) out = buy(fixed, item, week);
      else { const p = candidates(chainId, item)[0]; out = p ? buy(p, item, week) : null; }
      lines.set(key, out);
      return out;
    }

    /**
     * An item naming one Exact Product (#15), bought as `item.quantity` packs
     * at the Chain's own one of it, or with `likely`, at a Chain publishing no
     * EANs, the Product only likely the same. Always this week's prices.
     */
    function exactLine(chainId, item, likely = false) {
      const p = likely ? likelyProduct(chainId, item.exact) : exactProduct(chainId, item.exact);
      if (!p) return null;
      const o = offerFor(p, "nu");
      return { p, o, offer: o ? o.wording : null, onOffer: !!o, packs: item.quantity, cost: item.quantity * packCents(p, o) };
    }

    /**
     * A whole list compared across Chains. Each Chain that is more than its
     * Offers is a bag: its total, and how many items it sells (Coverage). An
     * Exact Product is compared apart and never in a bag (ADR-0006).
     *   rows    per item: each Chain's line, the Chains selling it cheapest first, min and max
     *   totals  per bag, the full ones cheapest first
     *   best    the cheapest full bag, or null
     *   combo   the best two Chains together, only where it fills the list,
     *           beats one shop and really uses both: { ids, cost, filled, from }
     *   exact   { rows, totals } for the Exact Products, at Chains with EANs
     */
    function compare(items, { week = "nu", corrections = null } = {}) {
      const chains = data.chains, bagChains = chains.filter((c) => !c.offersOnly);
      const rows = items.filter((i) => !i.exact).map((item) => {
        const by = Object.fromEntries(chains.map((c) => [c.id, line(c.id, item, { week, corrections })]));
        const avail = chains.filter((c) => by[c.id]).sort((a, b) => by[a.id].cost - by[b.id].cost);
        return { item, by, avail, min: avail.length ? by[avail[0].id].cost : null, max: avail.length ? by[avail.at(-1).id].cost : null };
      });
      const totals = bagTotals(rows, bagChains);
      const best = totals.find((t) => t.full) || null;
      let combo = null;
      for (let i = 0; i < chains.length; i++) for (let j = i + 1; j < chains.length; j++) {
        const a = chains[i], b = chains[j]; let cost = 0, filled = 0; const from = {};
        if (a.offersOnly && b.offersOnly) continue;
        for (const r of rows) {
          const la = r.by[a.id], lb = r.by[b.id];
          if (!la && !lb) continue;
          const pick = !lb || (la && la.cost <= lb.cost) ? a : b;
          filled++; from[r.item.id] = pick.id; cost += r.by[pick.id].cost;
        }
        const cand = { ids: [a.id, b.id], cost, filled, from };
        if (!combo || cand.filled > combo.filled || (cand.filled === combo.filled && cand.cost < combo.cost)) combo = cand;
      }
      if (combo && (combo.filled < rows.length || (best && combo.cost >= best.cost) || new Set(Object.values(combo.from)).size < 2)) combo = null;

      const eanChains = chains.filter((c) => c.eans !== false), noEanChains = chains.filter((c) => c.eans === false);
      const exactRows = items.filter((i) => i.exact).map((item) => {
        const by = Object.fromEntries(eanChains.map((c) => [c.id, exactLine(c.id, item)]));
        const likely = Object.fromEntries(noEanChains.map((c) => [c.id, exactLine(c.id, item, true)]));
        const avail = eanChains.filter((c) => by[c.id]).sort((a, b) => by[a.id].cost - by[b.id].cost);
        return { item, by, likely, avail, min: avail.length ? by[avail[0].id].cost : null };
      });
      return { rows, totals, best, combo, exact: { rows: exactRows, totals: bagTotals(exactRows, eanChains) } };
    }
    function bagTotals(rows, chains) {
      return chains.map((c) => {
        let cost = 0, filled = 0;
        for (const r of rows) if (r.by[c.id]) { filled++; cost += r.by[c.id].cost; }
        return { chain: c, cost, filled, total: rows.length, full: filled === rows.length && rows.length > 0 };
      }).sort((a, b) => b.full - a.full || a.cost - b.cost);
    }

    /**
     * A Recipe's ingredients priced at each Chain that is a bag, each
     * resolved as a list item would be, and costed on what the Recipe uses
     * of the packs bought (owner's decision, 2026-10-15): 100 g from a 1 kg
     * block is a tenth of it. The list, which is what is paid, buys whole packs. The Chains missing least,
     * then cheapest, first; complete where one sells every ingredient. One
     * that does not is never ranked as if the missing part were free.
     *   at  per Chain: lines, cost, missing, deals (ingredients on Offer), saving
     */
    /** What a line costs for the part of it that is used. */
    const usedCents = (l) => Math.round(l.cost * l.share);
    function priceRecipe(requirements, { week = "nu", corrections = null } = {}) {
      const at = data.chains.filter((c) => !c.offersOnly).map((c) => {
        const ls = requirements.map((g) => line(c.id, g, { week, corrections })), have = ls.filter(Boolean);
        return { chain: c, lines: ls, cost: have.reduce((n, l) => n + usedCents(l), 0), missing: ls.length - have.length,
          deals: have.filter((l) => l.onOffer).length, saving: have.reduce((n, l) => n + (l.was ? Math.round((l.was - l.cost) * l.share) : 0), 0) };
      }).sort((a, b) => a.missing - b.missing || a.cost - b.cost);
      return { at, best: at[0], complete: !!at[0] && at[0].missing === 0 };
    }

    /**
     * How many Products of an Ingredient are sold with each set of Variants,
     * across every Chain: which kinds there are to choose from.
     */
    function kindsSold(ingredient) {
      const sold = new Map();
      for (const c of data.chains) for (const p of byIngredient[c.id][ingredient] || []) sold.set(p.variant, (sold.get(p.variant) || 0) + 1);
      return sold;
    }

    // ── Which kind (#43) ─────────────────────────────────────────────────
    // An item whose Ingredient comes in Variants but that names none is asked
    // which one, until the shopper picks one or answers "any" (`anyKind`).
    // Variants may differ in several aspects (type, fat, flavour), each asked
    // on its own, and only those sold with what is already chosen are offered:
    // Greek yoghurt shows the fats Greek yoghurt comes in.
    const aspectIn = (d, id) => (d.variants.find((v) => v.id === id) || {}).aspect || "soort";

    /** Whether any Chain sells the Variants an item names together: "griekse yoghurt 10% aardbei" is sold nowhere. */
    function soldAs(item) {
      const want = variantsOf(item.variant);
      for (const k of kindsSold(item.ingredient).keys()) { const has = variantsOf(k); if (want.every((v) => has.includes(v))) return true; }
      return false;
    }

    /**
     * The kinds an item may be, or null when there is nothing to choose (no
     * Variants, an Exact Product, or one kind on sale in every aspect).
     *   aspects  per aspect: options { v, n } (n Products sold with it and
     *            what is chosen in the other aspects), flavours most sold
     *            first and plain ahead of them, and the one chosen or null
     *   sold     whether the Variants named are sold together anywhere
     *   asks     whether to ask now: sold nowhere as named, or an aspect left
     *            open with a choice and not answered "any"
     */
    function kinds(item) {
      const d = item.ingredient && !item.exact && vocabulary.get(item.ingredient);
      if (!d || !d.variants.length) return null;
      const chosen = variantsOf(item.variant), sold = kindsSold(d.id);
      const aspects = [...new Set(d.variants.map((v) => aspectIn(d, v.id)))].map((a) => {
        const others = chosen.filter((id) => aspectIn(d, id) !== a);
        // How many Products have this Variant and every one chosen in the other aspects.
        const count = (v) => { let n = 0; for (const [k, c] of sold) { const has = variantsOf(k); if (has.includes(v.id) && others.every((o) => has.includes(o))) n += c; } return n; };
        let options = d.variants.filter((v) => aspectIn(d, v.id) === a).map((v) => ({ v, n: count(v) })).filter((o) => o.n > 0 || chosen.includes(o.v.id));
        if (a === "smaak") options = options.sort((x, y) => (y.v.id === "naturel") - (x.v.id === "naturel") || y.n - x.n);
        return { aspect: a, options, value: chosen.find((id) => options.some((o) => o.v.id === id)) || null };
      });
      // An aspect with one kind on sale has nothing to ask; a Variant typed in it still shows.
      const shown = aspects.filter((x) => x.options.length > 1 || x.value);
      if (!shown.length) return null;
      const isSold = soldAs(item);
      return { aspects: shown, sold: isSold, asks: !isSold || (!item.anyKind && shown.some((x) => !x.value && x.options.length > 1)) };
    }

    /**
     * An item's Variants and `anyKind` once the shopper taps a kind, or "any"
     * (null). One Variant per aspect: a kind replaces the other of its aspect,
     * and tapping it again takes it off. With several aspects, "any" leaves
     * what was chosen and makes the rest any; with one, it clears the choice.
     * `answered`: nothing is left to ask, since the Ingredient varies in one
     * aspect only, or every aspect with a choice is settled.
     */
    function chooseKind(item, variant) {
      const d = vocabulary.get(item.ingredient), several = new Set(d.variants.map((v) => aspectIn(d, v.id))).size > 1;
      let next;
      if (!variant) next = { variant: several ? item.variant : null, anyKind: true };
      else {
        const had = variantsOf(item.variant), kept = had.filter((id) => aspectIn(d, id) !== aspectIn(d, variant));
        next = { variant: joinVariants(item.ingredient, had.includes(variant) ? kept : [...kept, variant]), anyKind: several ? !!item.anyKind : false };
      }
      const after = kinds({ ...item, ...next });
      return { ...next, answered: !several || !after || !after.asks };
    }

    return { products, vocabulary, parse, suggest, label, variantsOf, joinVariants, kindsSold, kinds, chooseKind, candidates, satisfies, packsFor, unitPrice, correctionKey, dailyPrices, priceDropAt,
      exact, exactIdOf, exactProduct, likelyProduct, exactMatches, spreads,
      isOnOffer, nextStarts, offerFor, packCents, verdict, correctedProduct, line, compare, priceRecipe, usedCents };
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
  // Three rows at a time; stops once every way on is further than `max`.
  function distance(a, b, max = Infinity) {
    let older = [], prev = Array.from({ length: b.length + 1 }, (_, j) => j), row = [];
    for (let i = 1; i <= a.length; i++) {
      row = [i];
      let least = i;
      for (let j = 1; j <= b.length; j++) {
        let v = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, older[j - 2] + 1);
        row[j] = v;
        if (v < least) least = v;
      }
      if (least > max) return max + 1;
      older = prev; prev = row;
    }
    return prev[b.length];
  }

  /** A difference between Chains larger than this is checked before it is shown as a bargain. */
  const SPREAD_CHECK = 0.7;

  global.MealdealResolve = { createResolver, priceDrop, USUAL_MIN_DAYS, DROP_SHARE, SPREAD_CHECK };
})(typeof window !== "undefined" ? window : globalThis);
