/**
 * Look at Products one by one and say which Ingredient each is, or none: a
 * Verdict, kept in src/catalogue/verdicts.json, which the next catalogue
 * build follows over whatever the vocabulary says.
 *
 *   node scripts/check-mappings.ts sample [--size 200]   the Gold Set: Products drawn at random
 *   node scripts/check-mappings.ts opinions              those the classifier is sure are mapped wrong, or missed
 *   node scripts/check-mappings.ts product <chain> <ref> one Product, as a Klopt niet report names it
 *
 * Add --fresh to read the database again rather than the copy kept from the
 * last time in .cache/ (reading it takes a minute or two). Each answer is
 * written straight away, so stopping anywhere loses nothing; commit
 * verdicts.json when done.
 *
 * The sample is drawn in an order fixed by each Product's Chain and ref, so a
 * second session goes on where the first stopped, and Products new since
 * take their place in it at random as well.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { buildCatalogue, type CatalogueSource, type SourceProduct } from "../src/catalogue/build.ts";
import { assessClassifier, type LabelledProduct } from "../src/catalogue/classifier.ts";
import { readVerdicts, writeVerdicts, type Verdict, type VerdictSource } from "../src/catalogue/verdicts.ts";
import { VOCABULARY } from "../src/ingredients/vocabulary.ts";

const USAGE = "usage: node scripts/check-mappings.ts sample [--size N] | opinions | product <chain> <ref>  [--fresh]";
const CACHE = new URL("../.cache/catalogue-source.json", import.meta.url);

const argv = process.argv.slice(2);
const fresh = argv.includes("--fresh");
const args = argv.filter((a) => a !== "--fresh");
const mode = args[0];
const at = args.indexOf("--size");
const size = at >= 0 ? Number(args[at + 1]) : 200;
if (!(mode === "sample" || mode === "opinions" || (mode === "product" && args[1] && args[2])) || !(size > 0)) {
  console.error(USAGE);
  process.exit(2);
}

async function readSource(): Promise<CatalogueSource> {
  if (!fresh && existsSync(CACHE)) return JSON.parse(readFileSync(CACHE, "utf8")) as CatalogueSource;
  console.error("Reading the database (a minute or two)…");
  const { connect } = await import("../src/ingest/db.ts");
  const { readCatalogueSource } = await import("../src/catalogue/source-db.ts");
  const db = connect();
  const source = await readCatalogueSource(db);
  await db.end();
  mkdirSync(new URL(".", CACHE), { recursive: true });
  writeFileSync(CACHE, JSON.stringify(source));
  return source;
}

const source = await readSource();
console.error(`Catalogue of ${source.chains.map((c) => `${c.name} ${c.observedAt ?? "?"}`).join(", ")}. Building…`);
const verdicts: Verdict[] = readVerdicts();
const built = buildCatalogue(source, { verdicts });
const classifier = assessClassifier(built.labelled);
const decisionOf = new Map(built.labelled.map((p, i) => [key(p.chainId, p.ref), i]));
const sourceOf = new Map(source.chains.flatMap((c) => (source.products[c.id] ?? []).map((p) => [key(c.id, p.ref), p] as const)));
const chainName = (id: string) => source.chains.find((c) => c.id === id)?.name ?? id;
const ids = new Set(VOCABULARY.map((d) => d.id));
const checked = () => new Set(verdicts.map((v) => key(v.chain, v.ref)));

function key(chainId: string, ref: string) {
  return chainId + "\u0000" + ref;
}

/** A stable place in the random order, by Chain and ref. */
function draw(p: LabelledProduct): number {
  let h = 2166136261;
  for (const ch of "gold\u0000" + p.chainId + "\u0000" + p.ref) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** The Products to look at, in order, with why each was picked. */
function queue(): { product: LabelledProduct; from: VerdictSource }[] {
  const done = checked();
  if (mode === "sample") {
    const gold = verdicts.filter((v) => v.from === "sample").length;
    return [...built.labelled].filter((p) => !done.has(key(p.chainId, p.ref))).sort((a, b) => draw(a) - draw(b))
      .slice(0, Math.max(0, size - gold)).map((product) => ({ product, from: "sample" }));
  }
  if (mode === "opinions") {
    return [...classifier.disagree, ...classifier.suggest].map((x) => ({ product: x.product, from: "opinion" }));
  }
  const i = decisionOf.get(key(args[1]!, args[2]!));
  if (i === undefined) {
    console.error(`No Product ${args[1]} ${args[2]} in the catalogue (non-food and wine are left out of it).`);
    process.exit(1);
  }
  return [{ product: built.labelled[i]!, from: "report" }];
}

function describe(p: LabelledProduct, s: SourceProduct | undefined): string[] {
  const euro = (c: number) => "€" + (c / 100).toFixed(2);
  const lines = [`  ${p.name}${p.brand ? `  (${p.brand})` : ""}`];
  if (p.categories.length) lines.push(`  Shelf: ${p.categories.join(" | ")}`);
  if (s) {
    const pack = s.packText && s.packText !== p.name ? s.packText : s.packQuantity !== null ? `${s.packQuantity} ${s.packUnit}` : "no pack size";
    lines.push(`  Pack: ${pack} · ${euro(s.offerPriceCents ?? s.shelfPriceCents)} · ${euro(s.unitPriceCents)} per ${s.comparisonUnit}`);
  }
  return lines;
}

// Lines read as they come, so answers typed ahead, or piped in, are kept.
const rl = createInterface({ input: process.stdin });
const lines = rl[Symbol.asyncIterator]();
async function ask(prompt: string): Promise<string> {
  process.stdout.write(prompt);
  const next = await lines.next();
  if (next.done) return "q";
  return next.value;
}
const items = queue();
const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
let saved = 0;
const made: Verdict[] = [];

for (let n = 0; n < items.length; n++) {
  const { product: p, from } = items[n]!;
  if (checked().has(key(p.chainId, p.ref)) && mode !== "product") continue;
  const vocabulary = p.ingredient;
  const guess = classifier.label(p.chainId, p.ref);
  const place = mode === "sample" ? `Gold Set ${verdicts.filter((v) => v.from === "sample").length + 1} of ${size}` : `${n + 1} of ${items.length}`;
  console.log(`\n${place} · ${chainName(p.chainId)} · ${p.ref}`);
  for (const line of describe(p, sourceOf.get(key(p.chainId, p.ref)))) console.log(line);
  console.log(`  Mapped to: ${vocabulary ?? "none"}    Classifier: ${guess ?? "none"}`);

  let answer: string | null | undefined;
  while (answer === undefined) {
    const typed = (await ask(`  [Enter] ${vocabulary ?? "none"} · [c] ${guess ?? "none"} · [n] none · an Ingredient · [s] skip · [u] undo · [q] quit > `)).trim().toLowerCase();
    if (typed === "") answer = vocabulary;
    else if (typed === "c") answer = guess;
    else if (typed === "n" || typed === "none") answer = null;
    else if (typed === "s") break;
    else if (typed === "q") { n = items.length; break; }
    else if (typed === "u") {
      const last = made.pop();
      if (!last) { console.log("  Nothing to undo in this session."); continue; }
      verdicts.splice(verdicts.indexOf(last), 1);
      writeVerdicts(verdicts);
      saved--;
      console.log(`  Undone: ${last.name}. It comes back next time.`);
    } else if (ids.has(typed)) answer = typed;
    else {
      const like = VOCABULARY.filter((d) => d.id.includes(typed) || d.name.toLowerCase().includes(typed) || d.words.some((w) => w.toLowerCase().startsWith(typed)));
      console.log(like.length ? `  Did you mean: ${like.slice(0, 20).map((d) => d.id).join(", ")}${like.length > 20 ? ", …" : ""}` : `  No Ingredient like "${typed}".`);
    }
  }
  if (answer === undefined) continue;
  const old = verdicts.findIndex((v) => v.chain === p.chainId && v.ref === p.ref);
  if (old >= 0) verdicts.splice(old, 1);
  const v: Verdict = { chain: p.chainId, ref: p.ref, name: p.name, is: answer, from, on: today };
  verdicts.push(v);
  made.push(v);
  writeVerdicts(verdicts);
  saved++;
}
rl.close();

const gold = verdicts.filter((v) => v.from === "sample").length;
console.log(`\n${saved} Verdicts saved, ${verdicts.length} in all; the Gold Set holds ${gold}.`);
if (saved) console.log("They take effect at the next catalogue build. Commit src/catalogue/verdicts.json to keep them.");
