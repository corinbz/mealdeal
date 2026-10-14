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

import { words, type ComparisonUnit } from "./words.ts";

/** The catalogue as scripts/catalogue-from-db.ts and apply-history.ts write it. */
export interface DigestCatalogue {
  readonly chains: readonly { readonly id: string; readonly name: string; readonly observedAt: string | null }[];
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

/** At most this many deals per staple, the cheapest by Unit Price first. */
const PER_STAPLE = 3;

interface Product {
  readonly chain: string;
  readonly name: string;
  readonly words: string[];
  readonly unit: ComparisonUnit;
  readonly shelf: number;
  readonly offer: number | null;
  readonly unitPrice: number;
  readonly wording: string | null;
  readonly low: number | null;
  readonly days: number | null;
}

/** The deals the real-discount check supports, per staple, in the order given. */
export function realDeals(data: DigestCatalogue, staples: readonly string[]): { staple: string; deals: Deal[] }[] {
  const products: Product[] = data.chains.flatMap((c) =>
    (data.catalogue[c.id] ?? []).map((r) => ({
      chain: c.name,
      name: r[1] as string,
      words: words.nameWords(r[1] as string),
      unit: r[5] as ComparisonUnit,
      shelf: r[6] as number,
      offer: r[7] as number | null,
      unitPrice: r[8] as number,
      wording: r[9] as string | null,
      low: (r[13] as number | null | undefined) ?? null,
      days: (r[14] as number | null | undefined) ?? null,
    })),
  );
  const tally = (w: string[]) => {
    const counts = { kg: 0, l: 0, piece: 0 };
    for (const p of products) if (words.matches(w, p.words)) counts[p.unit]++;
    return counts;
  };

  return staples.flatMap((text) => {
    const item = words.parse(text, tally);
    if (!item) return [];
    const wanted = words.wordsOf(item.noun);
    const deals = products
      .filter((p) => p.unit === item.unit && words.matches(wanted, p.words))
      .filter((p) => p.offer !== null && p.low !== null && p.days !== null && p.offer < p.low)
      .sort((a, b) => a.unitPrice - b.unitPrice)
      .slice(0, PER_STAPLE)
      .map((p) => ({
        chain: p.chain, name: p.name, wording: p.wording, offerPriceCents: p.offer!,
        shelfPriceCents: p.shelf, referenceLowCents: p.low!, referenceDays: p.days!,
      }));
    return [{ staple: item.noun, deals }];
  });
}

const euro = (cents: number) => "€" + (cents / 100).toFixed(2).replace(".", ",");
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const days = (n: number) => (n === 1 ? "1 dag" : `${n} dagen`);
const dayText = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Amsterdam" });

export function composeDigest(data: DigestCatalogue, staples: readonly string[], site: string, disableUrl: string): Digest {
  const found = realDeals(data, staples);
  const total = found.reduce((n, s) => n + s.deals.length, 0);
  const swept = data.chains.map((c) => `${c.name}: ${c.observedAt ? dayText(c.observedAt) : "datum onbekend"}`);
  const newest = data.chains.map((c) => c.observedAt).filter((d): d is string => !!d).sort().at(-1);
  const subject = total
    ? `${total} echte ${total === 1 ? "korting" : "kortingen"} op je vaste boodschappen`
    : "Deze week geen echte kortingen op je vaste boodschappen";

  const line = (d: Deal) =>
    `${d.chain}: ${d.name}, ${euro(d.offerPriceCents)} in plaats van ${euro(d.shelfPriceCents)}` +
    (d.wording ? ` (${d.wording})` : "") +
    `. Laagste prijs in ${days(d.referenceDays)}; daarvoor minstens ${euro(d.referenceLowCents)}.`;
  const withDeals = found.filter((s) => s.deals.length), without = found.filter((s) => !s.deals.length);

  const text = [
    subject + (newest ? `, prijzen van ${dayText(newest)}.` : "."),
    "",
    ...withDeals.flatMap((s) => [s.staple, ...s.deals.map((d) => "  " + line(d)), ""]),
    ...(without.length ? [`Geen echte korting deze week op: ${without.map((s) => s.staple).join(", ")}.`, ""] : []),
    "Alleen aanbiedingen onder de laagste prijs van de dagen ervoor staan hierin. Een actie zonder eigen prijs, zoals 1+1 gratis, of zonder prijsgeschiedenis, telt niet mee.",
    "",
    `Recepten van deze week: ${site}#recepten`,
    `Prijzen van ${swept.join("; ")}.`,
    "",
    `Afmelden: zet de wekelijkse mail uit met één klik op "Disable workflow": ${disableUrl}`,
  ].join("\n");

  const html = `<!doctype html><html lang="nl"><body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:16px;color:#2b2118;background:#fbf6ee">
<h1 style="font-size:20px">${esc(subject)}</h1>
<p style="color:#6b5b4b">Prijzen van ${esc(swept.join(" · "))}.</p>
${withDeals.map((s) => `<h2 style="font-size:16px;margin:18px 0 6px">${esc(s.staple)}</h2><ul style="padding-left:18px;margin:0">${s.deals.map((d) =>
  `<li style="margin:4px 0"><b>${esc(d.chain)}</b> · ${esc(d.name)}: <b>${euro(d.offerPriceCents)}</b> <s style="color:#8a7a6a">${euro(d.shelfPriceCents)}</s>` +
  (d.wording ? ` <span style="background:#ffe9a3;border-radius:4px;padding:0 4px">${esc(d.wording)}</span>` : "") +
  `<br><span style="color:#2f7a3f;font-size:13px">laagste prijs in ${days(d.referenceDays)}; daarvoor minstens ${euro(d.referenceLowCents)}</span></li>`).join("")}</ul>`).join("\n")}
${without.length ? `<p style="color:#6b5b4b">Geen echte korting deze week op: ${esc(without.map((s) => s.staple).join(", "))}.</p>` : ""}
<p style="font-size:13px;color:#6b5b4b">Alleen aanbiedingen onder de laagste prijs van de dagen ervoor staan hierin. Een actie zonder eigen prijs, zoals 1+1 gratis, of zonder prijsgeschiedenis, telt niet mee.</p>
<p><a href="${esc(site)}#recepten">Recepten van deze week</a> · <a href="${esc(site)}#lijst">Je lijst</a></p>
<p style="font-size:12px;color:#8a7a6a">Afmelden: zet de wekelijkse mail uit met één klik op <a href="${esc(disableUrl)}">Disable workflow</a>.</p>
</body></html>`;

  return { subject, html, text, deals: total };
}
