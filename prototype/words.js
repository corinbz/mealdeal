// Reading what a shopper typed, and which Product names it matches. Shared by
// the basket page and the weekly digest (scripts/digest.ts), so a staple
// matches the same Products in the email as on the page. A plain script, not
// a module: the page must still work opened straight from disk.
(function (global) {
  const UNITS = {
    g: ["kg", 0.001], gr: ["kg", 0.001], gram: ["kg", 0.001], grams: ["kg", 0.001], kg: ["kg", 1], kilo: ["kg", 1], kilos: ["kg", 1],
    ml: ["l", 0.001], cl: ["l", 0.01], l: ["l", 1], liter: ["l", 1], litre: ["l", 1], liters: ["l", 1], litres: ["l", 1],
    x: ["piece", 1], "×": ["piece", 1], st: ["piece", 1], stuk: ["piece", 1], stuks: ["piece", 1],
    pc: ["piece", 1], pcs: ["piece", 1], piece: ["piece", 1], pieces: ["piece", 1],
  };

  function stem(w) {
    // Repeated, so singular and plural meet: courgettes -> courgette -> courgett.
    // Diminutives lose their t as well: aardappeltjes -> aardappel, so they
    // meet the plain word rather than a shorter one (appel).
    let before;
    do { before = w; if (w.length > 4) w = w.replace(/(tjes|tje|jes|je|en|e|s)$/, ""); } while (w !== before);
    return w;
  }
  /** The stems a typed noun must match, and any percentage in it ("yoghurt 10%"), which names a Variant. */
  const wordsOf = (noun) => (noun.toLowerCase().match(/\d+(?:[.,]\d+)?%|\p{L}+/gu) || []).filter((w) => w.length > 1).map(stem);
  /** The stems of a Product name. */
  const nameWords = (name) => name.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean).map(stem);

  /**
   * Every typed word must END some word of the name. A Dutch compound names
   * its kind last: koffiemelk is milk, melkbiscuits are biscuits. Still
   * crude ("appel" ends "aardappel"); that is what Corrections are for.
   */
  const matches = (words, names) => words.every((w) => names.some((n) => n.endsWith(w)));

  /**
   * "500 g rundergehakt" -> { quantity: 0.5, unit: "kg", noun: "rundergehakt" }.
   * `tally(words)` counts the matching Products per Comparison Unit, to guess
   * a unit nobody wrote.
   */
  function parse(text, tally) {
    const t = text.trim().replace(/\s+/g, " ");
    if (!t) return null;
    let quantity = null, unit = null, noun = t;
    // Not a percentage: "2% yoghurt" is a kind of yoghurt, not two of them.
    const m = t.match(/^(\d+(?:[.,]\d+)?)(?![\d.,]|\s*%)\s*(.*)$/);
    if (m) {
      quantity = Number(m[1].replace(",", "."));
      noun = m[2];
      const [first, ...rest] = noun.split(" ");
      const u = UNITS[first.toLowerCase().replace(/\.$/, "")];
      if (u && rest.length) { unit = u[0]; quantity *= u[1]; noun = rest.join(" "); }
    }
    if (!noun || UNITS[noun.toLowerCase()] || !(quantity === null || quantity > 0)) return null;
    let guessed = false;
    if (unit === null) {
      // No unit written. A count ("2 courgettes") means pieces when the chains
      // sell it by the piece; otherwise the unit most matching products use.
      const counts = tally(wordsOf(noun));
      if (quantity !== null && counts.piece > 0) unit = "piece";
      else {
        unit = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
        if (counts[unit] === 0) unit = "piece";
        guessed = true;
      }
      if (quantity === null) { quantity = 1; guessed = true; }
    }
    return { text: t, noun, quantity: Math.round(quantity * 1000) / 1000, unit, guessed };
  }

  global.MealdealWords = { UNITS, stem, wordsOf, nameWords, matches, parse };
})(typeof window !== "undefined" ? window : globalThis);
