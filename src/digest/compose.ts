/**
 * The weekly digest (#22): this week's real discounts on the owner's staples.
 *
 * It claims only what the real-discount check supports (#18): an Offer with a
 * price of its own, below its Product's Reference Price. An Offer with no
 * price ("1+1 gratis"), or with no recorded days before it, is never called a
 * discount here, however it is advertised. It says which day each Chain's
 * prices are from, because the email is read later than it is written.
 *
 * For one owner, until there are accounts (#21): the staples come from the
 * repository, not from a browser.
 */

import { createResolver } from "../words.ts";

/** The catalogue as scripts/catalogue-from-db.ts and apply-history.ts write it. */
export interface DigestCatalogue {
  readonly chains: readonly { readonly id: string; readonly name: string; readonly observedAt: string | null; readonly card?: string | null }[];
  readonly columns: readonly string[];
  readonly vocabulary?: readonly unknown[];
  readonly catalogue: Readonly<Record<string, readonly (readonly unknown[])[]>>;
}

export interface Deal {
  readonly chain: string;
  readonly name: string;
  readonly wording: string | null;
  readonly offerPriceCents: number;
  readonly shelfPriceCents: number;
  readonly referenceLowCents: number;
  readonly referenceDays: number;
}

export interface Digest {
  readonly subject: string;
  readonly html: string;
  readonly text: string;
  readonly deals: number;
}

/** At most this many deals per staple, the cheapest per unit first. */
const PER_STAPLE = 3;

/**
 * An item the vocabulary does not know is resolved by name, and "Bloemkool
 * Broccoli Gehaktbal met Gekookte Aardappelen" then matches broccoli. On the
 * page a Correction fixes that; an email cannot be corrected, so for such an
 * item a dish named "X met Y" is left out. An item read as an Ingredient needs
 * no such rule: a ready meal maps to no Ingredient (#14).
 */
const DISH = /\s(met|&)\s/i;

/** The deals the real-discount check supports, per staple, in the order given. */
export function realDeals(data: DigestCatalogue, staples: readonly string[]): { staple: string; suggestion: string | null; deals: Deal[] }[] {
  const resolver = createResolver(data);
  const chainName = new Map(data.chains.map((c) => [c.id, c.name]));
  return staples.flatMap((text) => {
    const item = resolver.parse(text);
    if (!item) return [];
    const deals = data.chains
      .flatMap((c) => resolver.candidates(c.id, item))
      .filter((p) => item.ingredient || DISH.test(item.noun) || !DISH.test(p.name))
      // The page's own real-low rule (#18): "laagste prijs in N dagen".
      .filter((p) => resolver.verdict(p)?.kind === "lowest")
      .sort((a, b) => resolver.unitPrice(a, item) - resolver.unitPrice(b, item))
      .slice(0, PER_STAPLE)
      .map((p) => ({
        chain: chainName.get(p.chainId)!, name: p.name, wording: p.offerWording, offerPriceCents: p.offerPriceCents!,
        shelfPriceCents: p.shelfPriceCents, referenceLowCents: p.referenceLowCents!, referenceDays: p.referenceDays!,
      }));
    return [{ staple: item.noun, suggestion: item.suggestion ?? null, deals }];
  });
}

/** The languages a digest can be written in (#25): Dutch unless the workflow says otherwise. */
export type DigestLang = "nl" | "en";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Everything the digest says, per language. Product names and Offer wording stay as the Chain wrote them (ADR-0002). */
const WORDS = {
  nl: {
    euro: (cents: number) => "€" + (cents / 100).toFixed(2).replace(".", ","),
    days: (n: number) => (n === 1 ? "1 dag" : `${n} dagen`),
    day: (d: Date) => d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Amsterdam" }),
    unknownDate: "datum onbekend",
    subject: (n: number) => (n ? `${n} echte ${n === 1 ? "korting" : "kortingen"} op je vaste boodschappen` : "Deze week geen echte kortingen op je vaste boodschappen"),
    pricesOf: "prijzen van", PricesOf: "Prijzen van",
    insteadOf: "in plaats van", lowest: "laagste prijs in", Lowest: "Laagste prijs in", atLeast: "daarvoor minstens",
    noneOn: "Geen echte korting deze week op:",
    card: (cards: string[]) => `Gerekend alsof je ${cards.join(" en ")} hebt: aanbiedingen die alleen met ${cards.length > 1 ? "een klantenkaart of app" : "de app"} gelden, tellen mee. Zonder betaal je daar de gewone prijs.`,
    typo: (staple: string, s: string) => `"${staple}" niet herkend; bedoel je "${s}"? Pas je vaste boodschappen aan.`,
    rule: "Alleen aanbiedingen onder de laagste prijs van de dagen ervoor staan hierin. Een actie zonder eigen prijs, zoals 1+1 gratis, of zonder prijsgeschiedenis, telt niet mee.",
    recipes: "Recepten van deze week", list: "Je lijst",
    off: "Afmelden: zet de wekelijkse mail uit met één klik op",
  },
  en: {
    euro: (cents: number) => "€" + (cents / 100).toFixed(2),
    days: (n: number) => (n === 1 ? "1 day" : `${n} days`),
    day: (d: Date) => {
      const part = (o: Intl.DateTimeFormatOptions) => d.toLocaleDateString("en-US", { ...o, timeZone: "Europe/Amsterdam" });
      return `${part({ weekday: "long" })}, ${part({ day: "numeric" })} ${part({ month: "long" })}`;
    },
    unknownDate: "date unknown",
    subject: (n: number) => (n ? `${n} real ${n === 1 ? "discount" : "discounts"} on your staples` : "No real discounts on your staples this week"),
    pricesOf: "prices from", PricesOf: "Prices from",
    insteadOf: "instead of", lowest: "lowest price in", Lowest: "Lowest price in", atLeast: "before that at least",
    noneOn: "No real discount this week on:",
    card: (cards: string[]) => `Counted as if you have ${cards.join(" and ")}: offers that need ${cards.length > 1 ? "a loyalty card or app" : "the app"} count. Without it, you pay the regular price there.`,
    typo: (staple: string, s: string) => `"${staple}" not recognized; did you mean "${s}"? Update your staples.`,
    rule: "Only offers below the lowest price of the days before are listed. An offer with no price of its own, such as 1+1 gratis, or with no price history, does not count.",
    recipes: "This week's recipes", list: "Your list",
    off: "Unsubscribe: turn the weekly email off with one click on",
  },
} as const;

export function composeDigest(data: DigestCatalogue, staples: readonly string[], site: string, disableUrl: string, lang: DigestLang = "nl"): Digest {
  const W = WORDS[lang], euro = W.euro, days = W.days;
  const dayText = (iso: string) => W.day(new Date(`${iso}T12:00:00Z`));
  const found = realDeals(data, staples);
  const total = found.reduce((n, s) => n + s.deals.length, 0);
  const swept = data.chains.map((c) => `${c.name}: ${c.observedAt ? dayText(c.observedAt) : W.unknownDate}`);
  const newest = data.chains.map((c) => c.observedAt).filter((d): d is string => !!d).sort().at(-1);
  const subject = W.subject(total);

  const line = (d: Deal) =>
    `${d.chain}: ${d.name}, ${euro(d.offerPriceCents)} ${W.insteadOf} ${euro(d.shelfPriceCents)}` +
    (d.wording ? ` (${d.wording})` : "") +
    `. ${W.Lowest} ${days(d.referenceDays)}; ${W.atLeast} ${euro(d.referenceLowCents)}.`;
  const withDeals = found.filter((s) => s.deals.length), without = found.filter((s) => !s.deals.length);
  // A staple that reads as a typo is said so, with the likely name, since a
  // misspelt staple is resolved by name only and may quietly match nothing.
  // Card and app prices count as paid, as on the page; said wherever they do.
  const cards = data.chains.map((c) => c.card).filter((c): c is string => !!c);
  const cardNote = cards.length ? W.card(cards) : null;
  const typos = found.filter((s) => s.suggestion).map((s) => W.typo(s.staple, s.suggestion!));

  const text = [
    subject + (newest ? `, ${W.pricesOf} ${dayText(newest)}.` : "."),
    "",
    ...withDeals.flatMap((s) => [s.staple, ...s.deals.map((d) => "  " + line(d)), ""]),
    ...(without.length ? [`${W.noneOn} ${without.map((s) => s.staple).join(", ")}.`, ""] : []),
    ...(typos.length ? [...typos, ""] : []),
    W.rule,
    ...(cardNote ? [cardNote] : []),
    "",
    `${W.recipes}: ${site}#recepten`,
    `${W.PricesOf} ${swept.join("; ")}.`,
    "",
    `${W.off} "Disable workflow": ${disableUrl}`,
  ].join("\n");

  const html = `<!doctype html><html lang="${lang}"><body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:16px;color:#2b2118;background:#fbf6ee">
<h1 style="font-size:20px">${esc(subject)}</h1>
<p style="color:#6b5b4b">${W.PricesOf} ${esc(swept.join(" · "))}.</p>
${withDeals.map((s) => `<h2 style="font-size:16px;margin:18px 0 6px">${esc(s.staple)}</h2><ul style="padding-left:18px;margin:0">${s.deals.map((d) =>
  `<li style="margin:4px 0"><b>${esc(d.chain)}</b> · ${esc(d.name)}: <b>${euro(d.offerPriceCents)}</b> <s style="color:#8a7a6a">${euro(d.shelfPriceCents)}</s>` +
  (d.wording ? ` <span style="background:#ffe9a3;border-radius:4px;padding:0 4px">${esc(d.wording)}</span>` : "") +
  `<br><span style="color:#2f7a3f;font-size:13px">${W.lowest} ${days(d.referenceDays)}; ${W.atLeast} ${euro(d.referenceLowCents)}</span></li>`).join("")}</ul>`).join("\n")}
${without.length ? `<p style="color:#6b5b4b">${W.noneOn} ${esc(without.map((s) => s.staple).join(", "))}.</p>` : ""}
${typos.map((t) => `<p style="color:#b8432f">${esc(t)}</p>`).join("\n")}
<p style="font-size:13px;color:#6b5b4b">${W.rule}</p>
${cardNote ? `<p style="font-size:13px;color:#6b5b4b">${esc(cardNote)}</p>` : ""}
<p><a href="${esc(site)}#recepten">${W.recipes}</a> · <a href="${esc(site)}#lijst">${W.list}</a></p>
<p style="font-size:12px;color:#8a7a6a">${W.off} <a href="${esc(disableUrl)}">Disable workflow</a>.</p>
</body></html>`;

  return { subject, html, text, deals: total };
}
