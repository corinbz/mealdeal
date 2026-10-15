/**
 * Twins: one item as several Chains sell it, for deciding which Ingredient it
 * is, so a mapping fixed at one Chain holds at all of them.
 *
 * Wider than an Exact Product (exact.ts, ADR-0006), because it claims nothing
 * to the shopper: it only lends an Ingredient. So it also joins
 *
 *   - own-brand goods sharing an EAN: Superunie's G'woon and Melkan are the
 *     same item at Vomar, Hoogvliet, DekaMarkt and Plus;
 *   - Products at Chains publishing no EANs (Plus, Dirk, DekaMarkt, Aldi)
 *     whose brand and name have the same words, at the same pack: "1 de Beste
 *     Halfvolle melk" at Dirk and at DekaMarkt.
 *
 * Words are compared as a set, stemmed, so "G'woon Mini Groente Loempias" and
 * "G'woon Mini loempia groente 24 st." are one. A name of fewer than two words
 * besides its pack says too little to join on.
 */

import { words as reading } from "../words.ts";
import { globalEan } from "./exact.ts";

export interface TwinCandidate {
  readonly chainId: string;
  readonly ref: string;
  readonly name: string;
  readonly brand: string | null;
  readonly eans: readonly string[];
  readonly packQuantity: number | null;
  readonly packUnit: string | null;
}

export interface Twin {
  /** The lowest shared EAN, or "name:" and the words that joined it. */
  readonly id: string;
  /** The longest member name. */
  readonly name: string;
  /** Chain id to that Chain's Product. */
  readonly members: Readonly<Record<string, string>>;
}

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const PACK = /^\d+([.,]\d+)?(g|gr|gram|kg|ml|cl|l|ltr|liter|x|st|stk|stuks?)?$/;
const PACK_WORDS = new Set(["g", "gr", "gram", "kg", "ml", "cl", "l", "ltr", "liter", "x", "st", "stk", "stuk", "stuks", "per", "ca", "circa"]);

/** The stemmed words of a brand and name together, without the pack: Hoogvliet leaves the brand out of a name, Jumbo has it only there. */
export function twinWords(brand: string | null, name: string): string[] {
  const all = fold((brand ?? "") + " " + name).replace(/['’]/g, "").split(/[^\p{L}0-9%+]+/u)
    .filter((w) => w && !PACK.test(w) && !PACK_WORDS.has(w))
    .map((w) => reading.nameWords(w).join("") || w);
  return [...new Set(all)].sort();
}

/** Two packs that may be one item: in different units they cannot be compared, so do not part them. */
function packsAgree(a: TwinCandidate, b: TwinCandidate): boolean {
  if (a.packQuantity === null || b.packQuantity === null || !a.packUnit || a.packUnit !== b.packUnit) return true;
  const ratio = a.packQuantity / b.packQuantity;
  return ratio >= 1 / 1.1 && ratio <= 1.1;
}

export function groupTwins(candidates: readonly TwinCandidate[]): Twin[] {
  const key = (c: TwinCandidate) => c.chainId + "\u0000" + c.ref;
  const node = new Map(candidates.map((c) => [key(c), c]));
  const parent = new Map<string, string>();
  const find = (k: string): string => {
    let r = k;
    while ((parent.get(r) ?? r) !== r) r = parent.get(r)!;
    parent.set(k, r);
    return r;
  };
  // Each group's Chains: a join that would put two Products of one Chain in
  // a group is refused, so one wrong join cannot sink a group. EANs join first.
  const chains = new Map<string, Set<string>>();
  const chainsOf = (root: string) => chains.get(root) ?? new Set([node.get(root)!.chainId]);
  const join = (a: TwinCandidate, b: TwinCandidate): boolean => {
    const ra = find(key(a)), rb = find(key(b));
    if (ra === rb) return true;
    if (!packsAgree(a, b)) return false;
    const ca = chainsOf(ra), cb = chainsOf(rb);
    if ([...cb].some((c) => ca.has(c))) return false;
    parent.set(ra, ra);
    parent.set(rb, ra);
    chains.set(ra, new Set([...ca, ...cb]));
    return true;
  };
  const proof = new Map<string, string>(); // a member's key -> what joined it

  const byEan = new Map<string, TwinCandidate[]>();
  for (const c of candidates) for (const raw of new Set(c.eans)) {
    const ean = globalEan(raw);
    if (ean) (byEan.get(ean) ?? byEan.set(ean, []).get(ean)!).push(c);
  }
  for (const [ean, cs] of byEan) {
    if (new Set(cs.map((c) => c.chainId)).size < 2) continue;
    for (const c of cs.slice(1)) if (join(cs[0]!, c)) for (const k of [key(cs[0]!), key(c)]) if (!proof.has(k) || ean < proof.get(k)!) proof.set(k, ean);
  }

  // By words: within one set of words, each pack size is its own item.
  const byWords = new Map<string, TwinCandidate[]>();
  for (const c of candidates) {
    const ws = twinWords(c.brand, c.name);
    if (ws.length < 2) continue;
    const k = ws.join(" ");
    (byWords.get(k) ?? byWords.set(k, []).get(k)!).push(c);
  }
  for (const [ws, cs] of byWords) {
    if (new Set(cs.map((c) => c.chainId)).size < 2) continue;
    for (const c of cs) {
      const other = cs.find((o) => o.chainId !== c.chainId && o.packUnit === c.packUnit && join(o, c));
      if (!other) continue;
      if (!proof.has(key(c))) proof.set(key(c), "name:" + ws);
      if (!proof.has(key(other))) proof.set(key(other), "name:" + ws);
    }
  }

  const groups = new Map<string, TwinCandidate[]>();
  for (const k of parent.keys()) (groups.get(find(k)) ?? groups.set(find(k), []).get(find(k))!).push(node.get(k)!);
  const out: Twin[] = [];
  for (const kept of groups.values()) {
    if (kept.length < 2) continue;
    const ids = kept.map((c) => proof.get(key(c))).filter((p): p is string => !!p);
    out.push({
      id: ids.filter((p) => !p.startsWith("name:")).sort()[0] ?? ids.sort()[0]!,
      name: kept.map((c) => c.name).sort((a, b) => b.length - a.length || a.localeCompare(b))[0]!,
      members: Object.fromEntries(kept.map((c) => [c.chainId, c.ref])),
    });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}
