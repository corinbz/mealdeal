/**
 * Looks for what the vocabulary is missing, without asking anyone: reads a
 * long shopping list (scripts/shopping-list.txt) with the app's own reader,
 * and groups the Products no Ingredient matched by the words in their names.
 *
 *   node scripts/check-reading.ts --built prototype/catalogue.js [--list scripts/shopping-list.txt]
 *
 * Writes Markdown to stdout:
 *  - list items that read as nothing, or only as a name search, and what that
 *    search finds: mostly another Ingredient's Products (a missing name), or
 *    unmatched ones (a missing Ingredient, as eiwit was);
 *  - list items read as an Ingredient while ignoring some of their words
 *    ("witte bonen in tomatensaus" as witte bonen), or that nothing satisfies;
 *  - words of unmatched Product names sold at several Chains, with or without
 *    an Ingredient of that name.
 */

import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { parseCatalogueScript } from "../src/catalogue/format.ts";

function usage(): never {
  console.error("Usage: node scripts/check-reading.ts --built <file> [--list <file>]");
  process.exit(2);
}

const argv = process.argv.slice(2);
let built = "", listFile = new URL("./shopping-list.txt", import.meta.url).pathname;
for (let i = 0; i < argv.length; i++) {
  const next = argv[i + 1] ?? "";
  switch (argv[i]) {
    case "--built": built = next; i++; break;
    case "--list": listFile = next; i++; break;
    case "--help": case "-h": usage();
    default: console.error(`Unknown argument: ${argv[i]}`); usage();
  }
}
if (!built) usage();

const data = parseCatalogueScript(await readFile(built, "utf8")) as any;
const context: Record<string, any> = {};
for (const f of ["words.js", "resolve.js"]) {
  runInNewContext(await readFile(new URL(`../prototype/${f}`, import.meta.url), "utf8"), context);
}
const W = context.MealdealWords, R = context.MealdealResolve.createResolver(data);
const chains: string[] = data.chains.map((c: any) => c.id);
const vocabulary: any[] = data.vocabulary;

// Every stem any name of an Ingredient uses, in any language.
const stemsOf = (d: any) => {
  const texts = [d.id, d.name, ...(d.also || []), ...(d.words || []), ...Object.values(d.names || {}).flat(),
    ...d.variants.flatMap((v: any) => [v.id, v.name, ...Object.values(v.names || {}).flat()])] as string[];
  return new Set(texts.flatMap((t) => W.wordsOf(t)));
};
const ingredientStems = new Map(vocabulary.map((d) => [d.id, stemsOf(d)]));
const anyIngredientStem = new Map<string, string>();
for (const [id, stems] of ingredientStems) for (const s of stems) if (!anyIngredientStem.has(s)) anyIngredientStem.set(s, id);
// The one-word Dutch names an Ingredient is itself called by, not its Variants or flavours.
const ownStem = new Map<string, string>();
for (const d of vocabulary) {
  for (const t of [d.id, d.name, ...(d.also || [])] as string[]) {
    const ws = W.wordsOf(t);
    if (ws.length === 1 && !ownStem.has(ws[0])) ownStem.set(ws[0], d.id);
  }
}

// Words a list item may hold besides the Ingredient's names: Preferences and filler.
const FILLER = new Set(["in", "met", "van", "de", "het", "een", "and", "of", "the", "uit", "voor", "a", "fresh", "vers", "verse",
  "bio", "biologisch", "biologische", "organic", "huismerk", "diepvries", "frozen", "blik", "canned", "tinned", "pot", "zak", "pak"]
  .map(W.stem));

const euro = (cents: number) => "€" + (cents / 100).toFixed(2);
const out: string[] = [];

// ---- The shopping list ----------------------------------------------------

type Line = { text: string; section: string };
const lines: Line[] = [];
let section = "";
const seen = new Set<string>();
for (const raw of (await readFile(listFile, "utf8")).split("\n")) {
  const t = raw.trim();
  if (t.startsWith("#")) { section = t.slice(1).trim(); continue; }
  if (!t || seen.has(t.toLowerCase())) continue;
  seen.add(t.toLowerCase());
  lines.push({ text: t, section });
}

const unread: string[] = [], searched: string[] = [], ignoring: string[] = [], unsold: string[] = [], nonfood: string[] = [];
let readCount = 0;
for (const { text, section } of lines) {
  const r = R.parse(text);
  const expectNothing = section === "=nonfood";
  if (!r) { if (!expectNothing) unread.push(`| ${text} | could not read |`); continue; }
  const found = chains.flatMap((c) => R.candidates(c, r).map((p: any) => p));
  if (expectNothing) {
    if (r.ingredient) nonfood.push(`| ${text} | ${R.label(r.ingredient, r.variant, "nl")} |`);
    continue;
  }
  if (r.ingredient) {
    readCount++;
    const label = R.label(r.ingredient, r.variant, "nl");
    const known = ingredientStems.get(r.ingredient)!;
    // Words of what was typed, quantity and unit aside, that the reading did not use.
    const noun = W.parse(text.toLowerCase(), () => ({ kg: 0, l: 0, piece: 0 }))?.noun ?? text;
    const ignored = [...new Set(W.wordsOf(noun).filter((w: string) => !known.has(w) && !FILLER.has(w) && !/^\d/.test(w)))];
    if (ignored.length) ignoring.push(`| ${text} | ${label} | ${ignored.join(", ")} |`);
    if (!found.length) unsold.push(`| ${text} | ${label} |`);
    continue;
  }
  if (!W.wordsOf(r.noun).length) { unread.push(`| ${text} | no word the search can use: it matches every Product |`); continue; }
  if (!found.length) { unread.push(`| ${text} | nothing${r.suggestion ? `; hint "${r.suggestion}"` : ""} |`); continue; }
  // A name search: what it finds, and what that says.
  const byIngredient = new Map<string, number>();
  for (const p of found) byIngredient.set(p.ingredient ?? "—", (byIngredient.get(p.ingredient ?? "—") ?? 0) + 1);
  const [top, topCount] = [...byIngredient].sort((a, b) => b[1] - a[1])[0]!;
  const at = new Set(found.map((p: any) => p.chainId)).size;
  const cheapest = found.slice().sort((a: any, b: any) => a.unitPriceCents - b.unitPriceCents).slice(0, 2)
    .map((p: any) => `${p.name} (${p.chainId}, ${euro(p.unitPriceCents)}/${p.comparisonUnit})`).join("; ");
  const share = Math.round((topCount / found.length) * 100);
  const verdict = top === "—" ? (share >= 50 ? "**no Ingredient** for most" : "mixed") : share >= 50 ? `mostly **${top}**` : "mixed";
  searched.push(`| ${text} | ${found.length} at ${at} | ${verdict} (${share}%) | ${cheapest} |`);
}

out.push(`## Shopping list read by the app`, "",
  `${lines.length} items: ${readCount} read as an Ingredient, ${searched.length} only as a name search, ${unread.length} as nothing.`, "");
out.push(`### Read as nothing, or a search that finds nothing (${unread.length})`, "", "| Typed | Result |", "|---|---|", ...unread, "");
out.push(`### Only a name search (${searched.length})`, "",
  "Mostly one Ingredient: probably a name that Ingredient lacks. No Ingredient: a group no Ingredient covers.", "",
  "| Typed | Products found | What they are | Cheapest |", "|---|---|---|---|", ...searched, "");
out.push(`### Read as an Ingredient, ignoring words (${ignoring.length})`, "", "| Typed | Read as | Words ignored |", "|---|---|---|", ...ignoring, "");
out.push(`### Read as an Ingredient nothing satisfies (${unsold.length})`, "", "| Typed | Read as |", "|---|---|", ...unsold, "");
out.push(`### Non-food read as an Ingredient (${nonfood.length})`, "", "| Typed | Read as |", "|---|---|", ...nonfood, "");

// ---- Unmatched Products, grouped by name words ----------------------------

const STOP = new Set(["met", "van", "voor", "zonder", "en", "de", "het", "in", "op", "uit", "per", "mini", "maxi", "groot", "grote", "klein",
  "kleine", "extra", "original", "origineel", "classic", "klassiek", "light", "zero", "pak", "stuk", "stuks", "zak", "doos", "fles", "blik",
  "pot", "multipack", "voordeel", "voordeelpak", "family", "familie", "naturel", "lekker", "heerlijk", "smaak", "mix", "vers", "verse",
  "bio", "biologisch", "biologische", "ah", "plus", "jumbo", "dirk", "vomar", "deka", "dekamarkt", "hoogvliet", "aldi", "lidl", "g", "ml",
  "kg", "cl", "liter", "gram", "the", "and", "of", "with", "x", "pack", "high", "crispy", "spicy", "style", "stijl", "fijn", "fijne", "zacht",
  "luxe", "premium", "gesneden", "plak", "plakken", "plakjes", "chef", "special", "goed", "minder", "lichte", "licht", "romig", "romige",
  "krokant", "krokante", "pittig", "pittige", "pikant", "gevuld", "gevulde", "gekruid", "gekruide", "halve", "half", "heel", "rond", "frisse",
  "fris", "zoet", "zuur", "zoete", "gegrilde", "gedroogde", "roasted", "clear", "cuisine", "topping", "bites", "adult", "senior", "junior",
  "oven", "airfryer", "boeren", "hollandse", "italiaanse", "turkse", "japanse", "indiase", "thaise", "thai", "melange", "tropical", "tropisch",
  "blond", "blue", "roze", "wild", "maanden", "jaar", "smaken", "diverse", "assorti", "zero", "sugar", "free", "suikervrij"].map(W.stem));

type Group = { stem: string; forms: Map<string, number>; chains: Set<string>; products: number; first: number; examples: Map<string, string> };
const groups = new Map<string, Group>();
let unmatched = 0;
for (const c of chains) {
  for (const p of Object.values(R.products[c]) as any[]) {
    if (p.ingredient) continue;
    unmatched++;
    const raw = p.name.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);
    const stems = new Set<string>();
    raw.forEach((w: string, i: number) => {
      const s = W.stem(w);
      if (s.length < 4 || STOP.has(s) || stems.has(s)) return;
      stems.add(s);
      const g = groups.get(s) ?? { stem: s, forms: new Map(), chains: new Set(), products: 0, first: 0, examples: new Map() };
      g.forms.set(w, (g.forms.get(w) ?? 0) + 1);
      g.chains.add(c); g.products++;
      if (i === 0) g.first++;
      if (!g.examples.has(c)) g.examples.set(c, p.name);
      groups.set(s, g);
    });
  }
}
// A word that mostly opens the name is a brand ("Lay's", "Unox"), not a kind of thing.
// So is a word nearly all of whose Products one Chain sells ("1 de Beste").
const perChain = new Map<string, Map<string, number>>();
for (const c of chains) {
  for (const p of Object.values(R.products[c]) as any[]) {
    if (p.ingredient) continue;
    for (const s of new Set(p.name.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean).map(W.stem)) as Set<string>) {
      const m = perChain.get(s) ?? new Map(); m.set(c, (m.get(c) ?? 0) + 1); perChain.set(s, m);
    }
  }
}
const oneChain = (g: Group) => Math.max(...perChain.get(g.stem)!.values()) / g.products >= 0.7;
const ranked = [...groups.values()]
  .filter((g) => g.chains.size >= 4 && g.products >= 8 && g.first / g.products < 0.6 && !oneChain(g))
  .sort((a, b) => b.chains.size - a.chains.size || b.products - a.products);
const row = (g: Group) => {
  const form = [...g.forms].sort((a, b) => b[1] - a[1])[0]![0];
  const ex = [...g.examples.values()].slice(0, 3).join("; ");
  return `| ${form} | ${g.chains.size} | ${g.products} | ${ex} |`;
};
const fresh = ranked.filter((g) => !anyIngredientStem.has(g.stem)).slice(0, 150);
const named = ranked.filter((g) => ownStem.has(g.stem)).slice(0, 60);
out.push(`## Products no Ingredient matches`, "", `${unmatched} Products. Name words sold at 4 or more Chains, brands left out.`, "");
out.push(`### Words no Ingredient uses (top ${fresh.length})`, "", "| Word | Chains | Products | Examples |", "|---|---|---|---|", ...fresh.map(row), "");
out.push(`### Words an Ingredient uses, on Products it does not match (top ${named.length})`, "",
  "Excluded on purpose (a mix, a `not` word) or missed.", "",
  "| Word | Chains | Products | Examples |", "|---|---|---|---|",
  ...named.map((g) => row(g).replace(/^\| ([^|]+) \|/, `| $1 (${ownStem.get(g.stem)}) |`)), "");

process.stdout.write(out.join("\n") + "\n");
