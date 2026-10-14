/**
 * Exact Products (#15, ADR-0006): one branded item at one Pack Size, as sold
 * by several Chains, proven by a shared EAN.
 *
 * Three things the real data showed an EAN join alone gets wrong, each
 * guarded here:
 *
 *   - An EAN starting with 2 is an in-store code from GS1's restricted range
 *     (Vomar's loose apples carry 2221230000000). It names nothing outside
 *     one Chain, so it never joins.
 *   - A Chain's own brand can share a supplier's EAN with another Chain's
 *     unbranded Product ("Jumbo Kropsla" and Vomar's "Kropsla"). Own-brand
 *     goods are never an Exact Product (ADR-0006), so they never join.
 *   - Vomar keeps old EANs as `additionalEans`, and an EAN is sometimes
 *     reused for a different pack: one Crodino EAN is a 6 x 175 ml pack at
 *     Jumbo and one 105 ml bottle at Vomar. Packs in the same unit must agree
 *     within 10%. Packs stated in different units ("4 x 80 g" against
 *     "4 stuks") cannot be compared and do not block a join.
 *
 * A Chain that publishes no EANs at all (Dirk) can only join by brand, name
 * and Pack Size, and is then only ever "likely" the same: shown, never
 * counted in an exact total.
 */

export interface ExactCandidate {
  readonly chainId: string;
  readonly ref: string;
  readonly name: string;
  readonly brand: string | null;
  readonly eans: readonly string[];
  readonly packQuantity: number | null;
  readonly packUnit: string | null;
  readonly huismerk: boolean;
}

export interface ExactProduct {
  /** The lowest EAN its members share. */
  readonly id: string;
  /** The most descriptive member name, which usually states the pack. */
  readonly name: string;
  /** Chain id to that Chain's own Product, proven by EAN. */
  readonly members: Readonly<Record<string, string>>;
  /** Chain id to a Product that is only likely the same (no EANs to prove it). */
  readonly likely: Readonly<Record<string, string>>;
}

/** An EAN that identifies a trade item everywhere, normalised to 13 digits; null for an in-store code. */
export function globalEan(ean: string): string | null {
  if (!/^\d{8}$|^\d{12,14}$/.test(ean)) return null;
  const e = ean.length === 14 ? ean.slice(1) : ean.length === 12 ? "0" + ean : ean;
  // 2xxxxxx: restricted circulation (weighed and in-store items). 02 and 04
  // are the same ranges written as UPC.
  if (e.length === 13 && /^(2|02|04)/.test(e)) return null;
  return e;
}

/** Whether two packs may be the same trade item. */
function packsAgree(a: ExactCandidate, b: ExactCandidate): boolean {
  if (a.packQuantity === null || b.packQuantity === null || !a.packUnit || a.packUnit !== b.packUnit) return true;
  const ratio = a.packQuantity / b.packQuantity;
  return ratio >= 1 / 1.1 && ratio <= 1.1;
}

/** Lowercase, accents and punctuation gone: "Calvé" and "Calve" are one brand. */
const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** The words of a name that say what it is, without its pack ("350 g", "4x", "12x"). */
function nameWords(name: string): Set<string> {
  return new Set(
    fold(name).split(/[^\p{L}0-9%]+/u)
      .filter((w) => w && !/^\d+([.,]\d+)?(g|gr|gram|kg|ml|cl|l|ltr|liter|x|st|stuks?)?$/.test(w))
      .filter((w) => !["g", "gr", "gram", "kg", "ml", "cl", "l", "liter", "x", "st", "stuk", "stuks"].includes(w)),
  );
}

export function groupExactProducts(candidates: readonly ExactCandidate[]): ExactProduct[] {
  const key = (c: ExactCandidate) => c.chainId + "\u0000" + c.ref;
  const byEan = new Map<string, ExactCandidate[]>();
  for (const c of candidates) {
    if (c.huismerk) continue;
    for (const raw of new Set(c.eans)) {
      const ean = globalEan(raw);
      if (ean) (byEan.get(ean) ?? byEan.set(ean, []).get(ean)!).push(c);
    }
  }

  // Union-find over Products, joined by an EAN shared across Chains.
  const parent = new Map<string, string>();
  const find = (k: string): string => {
    let r = k;
    while (parent.get(r) !== r) r = parent.get(r)!;
    parent.set(k, r);
    return r;
  };
  const node = new Map<string, ExactCandidate>();
  const shared = new Map<string, string>(); // root -> lowest EAN
  for (const [ean, cs] of byEan) {
    if (new Set(cs.map((c) => c.chainId)).size < 2) continue;
    for (const c of cs) if (!parent.has(key(c))) { parent.set(key(c), key(c)); node.set(key(c), c); }
    for (let i = 1; i < cs.length; i++) {
      if (cs[i]!.chainId === cs[0]!.chainId || !packsAgree(cs[0]!, cs[i]!)) continue;
      parent.set(find(key(cs[i]!)), find(key(cs[0]!)));
    }
  }
  for (const [ean, cs] of byEan) {
    for (const c of cs) {
      if (!parent.has(key(c))) continue;
      const root = find(key(c));
      const was = shared.get(root);
      if (cs.some((o) => o.chainId !== c.chainId && find(key(o)) === root) && (!was || ean < was)) shared.set(root, ean);
    }
  }

  const groups = new Map<string, ExactCandidate[]>();
  for (const k of parent.keys()) {
    const root = find(k);
    (groups.get(root) ?? groups.set(root, []).get(root)!).push(node.get(k)!);
  }

  const out: { id: string; name: string; members: Record<string, string>; brand: string | null; pack: ExactCandidate; words: Set<string>[] }[] = [];
  for (const [root, cs] of groups) {
    // Two Products of one Chain in one group is no proof of which is the
    // item: that Chain drops out of it.
    const perChain = new Map<string, ExactCandidate[]>();
    for (const c of cs) (perChain.get(c.chainId) ?? perChain.set(c.chainId, []).get(c.chainId)!).push(c);
    const kept = [...perChain.values()].filter((x) => x.length === 1).map((x) => x[0]!);
    if (kept.length < 2) continue;
    // Joined through a chain of EANs, the ends must still agree on the pack.
    if (kept.some((a) => kept.some((b) => !packsAgree(a, b)))) continue;
    const id = shared.get(root);
    if (!id) continue;
    out.push({
      id,
      name: kept.map((c) => c.name).sort((a, b) => b.length - a.length || a.localeCompare(b))[0]!,
      members: Object.fromEntries(kept.map((c) => [c.chainId, c.ref])),
      brand: kept.map((c) => c.brand).find((b): b is string => !!b) ?? null,
      pack: kept.find((c) => c.packQuantity !== null) ?? kept[0]!,
      words: kept.map((c) => nameWords(c.name)),
    });
  }

  // Likely the same, for Chains that publish no EANs: same brand, same pack
  // exactly, and every word of its name in some member's name. The group
  // whose member adds the fewest other words wins; a tie is no match, and so
  // is a Product two groups would claim equally.
  const withEans = new Set(candidates.filter((c) => c.eans.length).map((c) => c.chainId));
  const likely = new Map<number, Record<string, string>>();
  const byBrand = new Map<string, number[]>();
  out.forEach((g, i) => { if (g.brand) (byBrand.get(fold(g.brand)) ?? byBrand.set(fold(g.brand), []).get(fold(g.brand))!).push(i); });
  const claims = new Map<number, { c: ExactCandidate; extra: number }[]>();
  for (const c of candidates) {
    if (withEans.has(c.chainId) || c.huismerk || !c.brand || c.packQuantity === null) continue;
    const brand = fold(c.brand), mine = nameWords(c.name);
    for (const w of nameWords(c.brand)) mine.delete(w);
    if (!mine.size) continue;
    let best: { i: number; extra: number } | null = null, tie = false;
    for (const i of byBrand.get(brand) ?? []) {
      const g = out[i]!;
      if (g.pack.packUnit !== c.packUnit || g.pack.packQuantity !== c.packQuantity) continue;
      const extras = g.words.filter((ws) => [...mine].every((w) => ws.has(w)))
        .map((ws) => [...ws].filter((w) => !mine.has(w) && !nameWords(c.brand!).has(w)).length);
      if (!extras.length) continue;
      const extra = Math.min(...extras);
      if (!best || extra < best.extra) { best = { i, extra }; tie = false; }
      else if (extra === best.extra) tie = true;
    }
    if (best && !tie) (claims.get(best.i) ?? claims.set(best.i, []).get(best.i)!).push({ c, extra: best.extra });
  }
  for (const [i, cs] of claims) {
    for (const chainId of new Set(cs.map((x) => x.c.chainId))) {
      const mine = cs.filter((x) => x.c.chainId === chainId).sort((a, b) => a.extra - b.extra);
      if (mine.length > 1 && mine[0]!.extra === mine[1]!.extra) continue;
      (likely.get(i) ?? likely.set(i, {}).get(i)!)[chainId] = mine[0]!.c.ref;
    }
  }

  return out
    .map((g, i) => ({ id: g.id, name: g.name, members: g.members, likely: likely.get(i) ?? {} }))
    .sort((a, b) => a.id.localeCompare(b.id));
}
