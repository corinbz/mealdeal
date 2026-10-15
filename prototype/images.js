// Ingredient images (#32): stickers we draw ourselves, so they are ours
// outright (ADR-0003). One drawing per Ingredient where there is one, else one
// per aisle, else a shopping bag. A drawing is shapes in a 64×64 box, tagged
// a/b/c (fills), d (small fills), e (thin lines) and s (stalks); its colours
// are set on the drawing, and the sticker look (ink outline, die-cut edge)
// is CSS in basket.html. A plain script, like words.js.
(function (global) {
  const ART = {
    aardappelen: ["--a:#cf9a5c;--d:#8a5c2e",
      '<ellipse class="a" cx="42" cy="32" rx="13" ry="10" transform="rotate(20 42 32)"/>' +
      '<ellipse class="a" cx="24" cy="41" rx="15" ry="11" transform="rotate(-15 24 41)"/>' +
      '<circle class="d" cx="19" cy="38" r="1.3"/><circle class="d" cx="29" cy="45" r="1.3"/><circle class="d" cx="25" cy="40" r="1.1"/><circle class="d" cx="40" cy="28" r="1.3"/><circle class="d" cx="47" cy="35" r="1.3"/>'],
    champignons: ["--a:#a77d5c;--b:#f1e4cf;--d:#d9bfa3",
      '<path class="b" d="M43 40h8l-1 11h-6z"/><path class="a" d="M35 41c0-7 6-12 12-12s12 5 12 12z"/>' +
      '<path class="b" d="M20 34h11l-1 17h-9z"/><path class="a" d="M9 35c0-11 8-18 17-18s17 7 17 18z"/>' +
      '<circle class="d" cx="19" cy="25" r="1.8"/><circle class="d" cx="30" cy="23" r="1.5"/><circle class="d" cx="25" cy="30" r="1.3"/><circle class="d" cx="49" cy="34" r="1.3"/>'],
    courgette: ["--a:#4f8a3a;--b:#b9c47a;--e:#86b862",
      '<g transform="rotate(-30 32 34)"><rect class="a" x="8" y="27" width="44" height="14" rx="7"/>' +
      '<path class="e" d="M16 31.5h22M18 36.5h26"/><rect class="b" x="50" y="30" width="7" height="8" rx="2"/></g>'],
    gehakt: ["--a:#d9636b;--b:#cfd8dc;--d:#f6c0b8",
      '<rect class="b" x="7" y="33" width="50" height="19" rx="7"/>' +
      '<path class="a" d="M11 37c-2-7 4-12 10-10 1-6 10-8 13-2 3-5 12-3 13 3 6-1 10 5 7 9z"/>' +
      '<circle class="d" cx="20" cy="31" r="1.7"/><circle class="d" cx="30" cy="28" r="1.7"/><circle class="d" cx="40" cy="30" r="1.7"/><circle class="d" cx="25" cy="34" r="1.5"/><circle class="d" cx="45" cy="34" r="1.5"/><circle class="d" cx="35" cy="33" r="1.4"/>'],
    broccoli: ["--a:#3d8b45;--b:#9cc768;--d:#2c6a33",
      '<path class="b" d="M27 36h10l3 18h-16z"/>' +
      '<circle class="a" cx="21" cy="31" r="9"/><circle class="a" cx="43" cy="31" r="9"/><circle class="a" cx="32" cy="23" r="10"/><circle class="a" cx="32" cy="35" r="8"/>' +
      '<circle class="d" cx="20" cy="29" r="1.5"/><circle class="d" cx="30" cy="20" r="1.5"/><circle class="d" cx="36" cy="25" r="1.5"/><circle class="d" cx="44" cy="29" r="1.5"/><circle class="d" cx="30" cy="35" r="1.4"/>'],
    komkommer: ["--a:#3f7a35;--c:#d9ecb0;--d:#86b862",
      '<g transform="rotate(-35 28 30)"><rect class="a" x="4" y="23" width="46" height="13" rx="6.5"/>' +
      '<circle class="d" cx="14" cy="27" r="1.2"/><circle class="d" cx="24" cy="32" r="1.2"/><circle class="d" cx="34" cy="27" r="1.2"/><circle class="d" cx="42" cy="32" r="1.2"/></g>' +
      '<circle class="a" cx="46" cy="46" r="11"/><circle class="c" cx="46" cy="46" r="8"/>' +
      '<circle class="d" cx="46" cy="42" r="1.2"/><circle class="d" cx="42.5" cy="48" r="1.2"/><circle class="d" cx="49.5" cy="48" r="1.2"/>'],
    melk: ["--a:#f7f4ec;--b:#3a6fb8;--c:#e2dccd",
      '<rect class="c" x="26" y="8" width="12" height="5" rx="1"/><path class="c" d="M20 23l6-10h12l6 10z"/>' +
      '<rect class="a" x="20" y="23" width="24" height="33" rx="2"/><rect class="b" x="20" y="35" width="24" height="12"/>'],
    uien: ["--a:#c8743a;--e:#9a5426;--s:#8a6a4a",
      '<path class="s" d="M28 56l-2 3M32 56v4M36 56l2 3"/>' +
      '<path class="a" d="M32 12c2 6 4 9 10 13 8 5 11 12 9 19-2 8-10 12-19 12s-17-4-19-12c-2-7 1-14 9-19 6-4 8-7 10-13z"/>' +
      '<path class="e" d="M32 18c-7 9-9 22-4 36M32 18c7 9 9 22 4 36"/>'],
    pindakaas: ["--a:#b9783a;--b:#d94b3d;--c:#f7efdc;--d:#b9783a",
      '<rect class="a" x="16" y="20" width="32" height="36" rx="6"/><rect class="b" x="18" y="11" width="28" height="9" rx="2"/>' +
      '<rect class="c" x="16" y="30" width="32" height="16"/>' +
      '<ellipse class="d" cx="29" cy="38" rx="4" ry="3.2"/><ellipse class="d" cx="35.5" cy="38" rx="4" ry="3.2"/>'],
    spinazie: ["--a:#2f7a3a;--e:#6fb46a",
      '<path class="a" d="M32 56C18 50 11 34 19 17c10 6 17 23 13 39z"/>' +
      '<path class="a" d="M32 56c4-14 12-26 25-30 2 15-9 29-25 30z"/>' +
      '<path class="a" d="M32 56c-3-15 1-34 8-45 7 11 5 31-8 45z"/>' +
      '<path class="e" d="M32 54L22 24M32 54l20-25M32 54l7-38"/>'],
    eieren: ["--a:#f6ead2;--b:#d9a066;--d:#b57a3e",
      '<ellipse class="a" cx="22" cy="38" rx="11" ry="14"/><ellipse class="b" cx="42" cy="36" rx="11" ry="14"/>' +
      '<circle class="d" cx="39" cy="30" r="1"/><circle class="d" cx="46" cy="38" r="1"/><circle class="d" cx="40" cy="43" r="1"/>'],
    wortelen: ["--a:#f08a24;--b:#5c9e3a;--e:#c76a12",
      '<path class="b" d="M43 21c-3-6-1-11 3-13 1 5 0 9-3 13z"/><path class="b" d="M45 22c4-4 9-5 12-3-3 3-7 4-12 3z"/>' +
      '<path class="a" d="M14 52L40 20c4-3 9 0 8 5L18 55c-2 1-5-1-4-3z"/>' +
      '<path class="e" d="M24 44l4-1M31 36l4-1M37 29l3-1"/>'],
    kipfilet: ["--a:#f2c6a8;--e:#d99a7c",
      '<path class="a" d="M9 40c0-12 15-20 29-18 10 1 18 7 17 14-2 8-12 10-22 14-11 4-24 2-24-10z"/>' +
      '<path class="e" d="M19 36c6-4 14-6 22-5M21 44c6-2 12-4 18-5"/>'],
    zalm: ["--a:#f08060;--e:#fbd2c0",
      '<path class="a" d="M9 34c2-10 14-16 26-14 11 2 19 8 19 16s-10 14-23 14S7 44 9 34z"/>' +
      '<path class="e" d="M18 28c7 5 9 13 7 21M29 23c7 6 9 16 7 26M41 24c5 6 5 15 3 23"/>'],
    kaas: ["--a:#f2c84b;--c:#f8dc7a;--d:#d9a72c",
      '<path class="c" d="M8 32L44 18l14 14z"/><path class="a" d="M8 32h50v20H8z"/>' +
      '<circle class="d" cx="18" cy="42" r="3"/><circle class="d" cx="36" cy="46" r="2.5"/><circle class="d" cx="48" cy="39" r="2"/><circle class="d" cx="28" cy="37" r="1.6"/>'],
    brood: ["--a:#c98b4a;--e:#8f5a28",
      '<path class="a" d="M8 40c0-12 10-20 24-20s24 8 24 20v12a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4z"/>' +
      '<path class="e" d="M19 28l6 8M30 25l6 8M41 27l6 8"/>'],
    pasta: ["--a:#f0cf6e;--b:#2f6db5;--e:#c49a32",
      '<g transform="rotate(-35 32 33)"><rect class="a" x="24" y="7" width="16" height="52" rx="5"/>' +
      '<path class="e" d="M28.5 10v14M32 10v14M35.5 10v14M28.5 41v15M32 41v15M35.5 41v15"/>' +
      '<rect class="b" x="21.5" y="26" width="21" height="13" rx="3"/></g>'],
    bananen: ["--a:#f5cf3c;--s:#6b4a2a",
      '<path class="s" d="M10 22l-3-4M14 14l-3-4"/>' +
      '<path class="a" d="M14 15c8 16 24 22 40 16 2-1 1-4-1-4-14 2-26-4-33-14-2-2-6-1-6 2z"/>' +
      '<path class="a" d="M10 23c4 18 20 28 40 22 2-1 2-4-1-4-16 2-28-6-34-20-1-2-5-1-5 2z"/>'],
    appels: ["--a:#d94b3d;--b:#5c9e3a;--d:#f08a7a",
      '<path class="s" d="M32 22c0-4 1-7 3-9"/><path class="b" d="M34 18c3-6 9-7 13-6-2 5-8 8-13 6z"/>' +
      '<path class="a" d="M32 22c-6-4-18-4-20 8-2 12 6 26 14 26 3 0 4-2 6-2s3 2 6 2c8 0 16-14 14-26-2-12-14-12-20-8z"/>' +
      '<circle class="d" cx="21" cy="32" r="3"/>'],
    tomaten: ["--a:#e0453a;--b:#4f8a3a;--d:#f2826f",
      '<ellipse class="a" cx="32" cy="38" rx="21" ry="17"/>' +
      '<path class="b" d="M21 24c4 2 7 2 11 0 4 2 7 2 11 0-2 5-6 7-11 7s-9-2-11-7z"/><path class="s" d="M32 23v-6"/>' +
      '<circle class="d" cx="23" cy="34" r="3"/>'],
    mandarijnen: ["--a:#f28c28;--b:#5c9e3a;--d:#c76a12",
      '<circle class="a" cx="24" cy="40" r="14"/><circle class="a" cx="41" cy="35" r="13"/>' +
      '<path class="b" d="M41 22c3-7 10-9 14-7-1 5-6 9-14 7z"/>' +
      '<circle class="d" cx="20" cy="44" r="1.1"/><circle class="d" cx="28" cy="36" r="1.1"/><circle class="d" cx="45" cy="40" r="1.1"/><circle class="d" cx="37" cy="31" r="1.1"/>'],
    druiven: ["--a:#a9c64b;--b:#5c9e3a;--d:#e3f0b0",
      '<path class="s" d="M32 21l1-8"/><path class="b" d="M33 15c5-7 13-6 16-3-4 5-11 6-16 3z"/>' +
      '<circle class="a" cx="21" cy="27" r="7"/><circle class="a" cx="32" cy="26" r="7"/><circle class="a" cx="43" cy="27" r="7"/>' +
      '<circle class="a" cx="26.5" cy="38" r="7"/><circle class="a" cx="37.5" cy="38" r="7"/><circle class="a" cx="32" cy="49" r="7"/>' +
      '<circle class="d" cx="19" cy="25" r="1.6"/><circle class="d" cx="30" cy="24" r="1.6"/><circle class="d" cx="41" cy="25" r="1.6"/><circle class="d" cx="24.5" cy="36" r="1.6"/><circle class="d" cx="35.5" cy="36" r="1.6"/><circle class="d" cx="30" cy="47" r="1.6"/>'],
    "zoete aardappelen": ["--a:#b5524a;--c:#f08a3a;--d:#7e3530",
      '<path class="s" d="M9 30l-4-1"/><path class="a" d="M8 30c6-8 18-12 30-10 8 1 13 5 12 9-1 5-8 8-17 9-10 1-20 0-25-8z"/>' +
      '<circle class="d" cx="22" cy="28" r="1.3"/><circle class="d" cx="33" cy="25" r="1.3"/><circle class="d" cx="40" cy="31" r="1.3"/>' +
      '<ellipse class="a" cx="41" cy="46" rx="15" ry="10"/><ellipse class="c" cx="41" cy="46" rx="11.5" ry="7"/>'],
    friet: ["--a:#f2c84b;--b:#d94b3d;--d:#f7e3a3",
      '<rect class="a" x="17" y="14" width="5.5" height="24" rx="1" transform="rotate(-14 20 26)"/><rect class="a" x="24" y="9" width="5.5" height="26" rx="1" transform="rotate(-5 27 22)"/>' +
      '<rect class="a" x="31" y="11" width="5.5" height="26" rx="1" transform="rotate(4 34 24)"/><rect class="a" x="38" y="13" width="5.5" height="24" rx="1" transform="rotate(13 41 25)"/><rect class="a" x="28" y="17" width="5.5" height="20" rx="1"/>' +
      '<path class="b" d="M13 29c6 3 32 3 38 0l-5 27H18z"/><circle class="d" cx="32" cy="42" r="4"/>'],
    aardappelpuree: ["--a:#f3dc94;--b:#7fa6c4;--d:#f2c13b",
      '<path class="a" d="M12 39c-2-9 5-15 12-12 2-8 15-9 18-1 7-2 13 4 10 13z"/>' +
      '<path class="e" d="M21 34c4-3 12-4 18-1M27 28c3-2 7-2 9 0"/>' +
      '<rect class="d" x="28" y="18" width="9" height="7" rx="1.5" transform="rotate(-10 32 22)"/>' +
      '<path class="b" d="M6 38h52c0 10-11 18-26 18S6 48 6 38z"/>'],
    bosui: ["--a:#5c9e3a;--b:#f4f1e4",
      '<g transform="rotate(-20 32 55)"><rect class="a" x="29" y="8" width="6" height="32" rx="3"/><rect class="b" x="28.5" y="36" width="7" height="16" rx="3.5"/><path class="s" d="M30 54l-1 4M34 54l1 4"/></g>' +
      '<g transform="rotate(20 32 55)"><rect class="a" x="29" y="8" width="6" height="32" rx="3"/><rect class="b" x="28.5" y="36" width="7" height="16" rx="3.5"/><path class="s" d="M30 54l-1 4M34 54l1 4"/></g>' +
      '<g transform="rotate(0 32 55)"><rect class="a" x="29" y="8" width="6" height="32" rx="3"/><rect class="b" x="28.5" y="36" width="7" height="16" rx="3.5"/><path class="s" d="M30 54l-1 4M34 54l1 4"/></g>'],
    sjalotten: ["--a:#c0785a",
      '<g transform="translate(22 35) rotate(-14)"><path class="s" d="M-3 12l-1 3M3 12l1 3"/><path class="a" d="M0-21c3 6 10 10 10 21 0 7-4 12-10 12s-10-5-10-12c0-11 7-15 10-21z"/><path class="e" d="M0-15c-4 8-5 17-2 26M3-8c2 6 2 12 1 18"/></g>' +
      '<g transform="translate(43 34) rotate(12)"><path class="s" d="M-3 12l-1 3M3 12l1 3"/><path class="a" d="M0-21c3 6 10 10 10 21 0 7-4 12-10 12s-10-5-10-12c0-11 7-15 10-21z"/><path class="e" d="M0-15c-4 8-5 17-2 26M3-8c2 6 2 12 1 18"/></g>'],
    zilveruitjes: ["--a:#f7f4ec;--b:#c9a24a;--c:#cfe0d8",
      '<rect class="c" x="14" y="18" width="36" height="38" rx="7"/><rect class="b" x="16" y="9" width="32" height="10" rx="2"/>' +
      '<circle class="a" cx="24" cy="30" r="5.2"/><circle class="a" cx="37" cy="29" r="5.2"/><circle class="a" cx="30" cy="39" r="5.2"/><circle class="a" cx="42" cy="41" r="5.2"/><circle class="a" cx="22" cy="48" r="5.2"/><circle class="a" cx="35" cy="49" r="5.2"/>'],
    knoflook: ["--a:#f1e8d6",
      '<path class="s" d="M32 11V6M27 57l-1 3M32 57v3M37 57l1 3"/>' +
      '<path class="a" d="M32 10c1 5 3 8 8 11 9 4 14 11 13 20-1 9-10 15-21 15s-20-6-21-15c-1-9 4-16 13-20 5-3 7-6 8-11z"/>' +
      '<path class="e" d="M32 20c-6 8-8 20-5 35M32 20c6 8 8 20 5 35M23 27c-6 6-8 16-5 26M41 27c6 6 8 16 5 26"/>'],
    prei: ["--a:#3d7a3a;--b:#f2efd9;--c:#a9c96a",
      '<g transform="translate(32 33) scale(.88) rotate(-45) translate(-32 -32)"><path class="a" d="M36 29c7-4 13-8 20-10l2 6c-7 2-13 6-20 9z"/><path class="a" d="M36 35c7 0 13 1 20 4l-2 6c-6-3-12-4-18-4z"/>' +
      '<rect class="c" x="25" y="26.5" width="14" height="11" rx="2"/><rect class="b" x="5" y="26.5" width="24" height="11" rx="5.5"/>' +
      '<path class="e" d="M10 30h16M10 34h12M5 29l-3-1M5 32h-3M5 35l-3 1"/></g>'],
    snoepkomkommers: ["--a:#4f8f3a;--d:#a9cf7a",
      '<g transform="rotate(-40 24 22)"><rect class="a" x="11" y="16" width="26" height="12" rx="6"/><path class="s" d="M37 22h3"/><circle class="d" cx="18" cy="20" r="1.2"/><circle class="d" cx="25" cy="24" r="1.2"/><circle class="d" cx="31" cy="20" r="1.2"/></g>' +
      '<g transform="rotate(-40 32 32)"><rect class="a" x="19" y="26" width="26" height="12" rx="6"/><path class="s" d="M45 32h3"/><circle class="d" cx="26" cy="30" r="1.2"/><circle class="d" cx="33" cy="34" r="1.2"/><circle class="d" cx="39" cy="30" r="1.2"/></g>' +
      '<g transform="rotate(-40 40 42)"><rect class="a" x="27" y="36" width="26" height="12" rx="6"/><path class="s" d="M53 42h3"/><circle class="d" cx="34" cy="40" r="1.2"/><circle class="d" cx="41" cy="44" r="1.2"/><circle class="d" cx="47" cy="40" r="1.2"/></g>'],
    paprika: ["--a:#d93a2f;--b:#4f8a3a;--d:#f2826f",
      '<path class="a" d="M11 29c0-7 7-11 13-9 4-2 12-2 16 0 6-2 13 2 13 9 0 9-2 18-6 24-3 4-8 4-11 1-2 1-4 1-6 0-3 3-8 3-11-1-5-6-8-15-8-24z"/>' +
      '<path class="e" d="M26 25c-2 10-2 20 0 29M38 25c2 10 2 20 0 29"/><ellipse class="d" cx="19" cy="33" rx="2.5" ry="5"/>' +
      '<path class="b" d="M23 22c4-4 14-4 18 0-5 3-13 3-18 0z"/><path class="s" d="M32 21c0-5 2-9 6-11"/>'],
    puntpaprika: ["--a:#c8302a;--b:#4f8a3a;--d:#ef7d6c",
      '<path class="a" d="M12 21c4-6 12-7 17-2 10 10 21 21 27 33 1 3-1 5-4 3C39 48 22 41 12 31c-3-3-3-7 0-10z"/>' +
      '<path class="e" d="M22 26c9 9 19 17 30 25"/><ellipse class="d" cx="19" cy="27" rx="2" ry="3.5" transform="rotate(-45 19 27)"/>' +
      '<path class="b" d="M10 23c1-5 5-8 10-7-1 5-5 8-10 7z"/><path class="s" d="M12 19c-2-4-3-8-2-11"/>'],
    tomatenblokjes: ["--a:#f3e3c3;--b:#d93a2f;--c:#b9bfc4",
      '<rect class="c" x="15" y="15" width="34" height="42" rx="4"/><ellipse class="c" cx="32" cy="15" rx="17" ry="5"/><path class="e" d="M19 15.5c4 2 22 2 26 0"/>' +
      '<rect class="a" x="15" y="24" width="34" height="21"/>' +
      '<rect class="b" x="19" y="28" width="10" height="10" rx="1.5"/><rect class="b" x="33" y="27" width="10" height="10" rx="1.5" transform="rotate(10 38 32)"/><rect class="b" x="25" y="37" width="10" height="10" rx="1.5" transform="rotate(-8 30 42)"/>'],
    "gepelde tomaten": ["--a:#8fbf62;--b:#d93a2f;--c:#b9bfc4;--d:#f2826f",
      '<rect class="c" x="15" y="15" width="34" height="42" rx="4"/><ellipse class="c" cx="32" cy="15" rx="17" ry="5"/><path class="e" d="M19 15.5c4 2 22 2 26 0"/>' +
      '<rect class="a" x="15" y="24" width="34" height="21"/>' +
      '<ellipse class="b" cx="32" cy="36" rx="11" ry="8" transform="rotate(-25 32 36)"/><ellipse class="d" cx="28" cy="33" rx="3" ry="1.8" transform="rotate(-25 28 33)"/>'],
    passata: ["--a:#c8302a;--b:#c9a24a;--c:#f3e3c3;--d:#d93a2f",
      '<path class="a" d="M27 10h10v7c0 3 10 6 10 14v21a4 4 0 0 1-4 4H21a4 4 0 0 1-4-4V31c0-8 10-11 10-14z"/>' +
      '<rect class="b" x="25.5" y="5" width="13" height="7" rx="1.5"/><rect class="c" x="17" y="33" width="30" height="14"/>' +
      '<circle class="d" cx="32" cy="40.5" r="4"/>'],
    tomatenpuree: ["--a:#d93a2f;--b:#f2efe6;--c:#f3e3c3;--d:#d93a2f",
      '<g transform="rotate(-30 32 32)"><path class="a" d="M7 21h31c4 0 7 5 9 7v8c-2 2-5 7-9 7H7z"/><path class="e" d="M10 21v22M13 21v22"/>' +
      '<rect class="b" x="46" y="27" width="9" height="10" rx="1.5"/><rect class="c" x="18" y="25" width="16" height="14" rx="2"/><circle class="d" cx="26" cy="32" r="3.5"/></g>'],
    bloemkool: ["--a:#f3ecd6;--b:#5c9e3a;--d:#ddd0a8",
      '<path class="b" d="M5 44c2-13 12-19 19-14-3 11-9 18-19 14z"/><path class="b" d="M59 44c-2-13-12-19-19-14 3 11 9 18 19 14z"/><path class="b" d="M16 52c7-6 25-6 32 0-5 6-27 6-32 0z"/>' +
      '<path class="a" d="M49 34A6.1 6.1 0 0 1 45 43A6.9 6.9 0 0 1 35 47.8A7.2 7.2 0 0 1 23.5 46.1A6.5 6.5 0 0 1 16 38.8A5.9 5.9 0 0 1 16 29.2A6.5 6.5 0 0 1 23.5 21.9A7.2 7.2 0 0 1 35 20.2A6.9 6.9 0 0 1 45 25A6.1 6.1 0 0 1 49 34z"/>' +
      '<circle class="d" cx="25" cy="30" r="1.6"/><circle class="d" cx="34" cy="27" r="1.6"/><circle class="d" cx="40" cy="35" r="1.6"/><circle class="d" cx="29" cy="39" r="1.6"/><circle class="d" cx="22" cy="36" r="1.3"/><circle class="d" cx="37" cy="42" r="1.3"/>'],
    andijvie: ["--a:#6a9e3e;--b:#dfe38f",
      '<path class="a" d="M30 57C17 52 9 40 11 22l3 3 2-5 3 4 2-5 2 5 2-3c2 12 4 24 5 36z"/><path class="a" d="M34 57c13-5 21-17 19-35l-3 3-2-5-3 4-2-5-2 5-2-3c-2 12-4 24-5 36z"/>' +
      '<path class="b" d="M32 57c-7-11-9-26-5-42l2 3 3-4 3 4 2-3c4 16 2 31-5 42z"/>' +
      '<path class="e" d="M29 55L18 28M35 55l11-27M32 55V22"/>'],
    boerenkool: ["--a:#3f6e45;--b:#5f8f55",
      '<path class="s" d="M32 58V40"/>' +
      '<path class="b" d="M30 44A3.1 3.1 0 0 1 25 45A3.1 3.1 0 0 1 20 46A3 3 0 0 1 16 43A3 3 0 0 1 12 40A3.2 3.2 0 0 1 10 35A3.2 3.2 0 0 1 8 30A3.1 3.1 0 0 1 9 25A3.1 3.1 0 0 1 10 20A2.5 2.5 0 0 1 13 17A2.5 2.5 0 0 1 16 14A3 3 0 0 1 20 17A3 3 0 0 1 24 20A3.2 3.2 0 0 1 26 25A3.2 3.2 0 0 1 28 30A4.2 4.2 0 0 1 29 37A4.2 4.2 0 0 1 30 44z"/>' +
      '<path class="b" d="M34 44A3.6 3.6 0 0 1 35 38A3.6 3.6 0 0 1 36 32A3.2 3.2 0 0 1 38 27A3.2 3.2 0 0 1 40 22A3.4 3.4 0 0 1 44 18A3.4 3.4 0 0 1 48 14A3.2 3.2 0 0 1 51.5 18A3.2 3.2 0 0 1 55 22A3 3 0 0 1 55.5 27A3 3 0 0 1 56 32A2.7 2.7 0 0 1 54 36A2.7 2.7 0 0 1 52 40A3 3 0 0 1 48 43A3 3 0 0 1 44 46A3.1 3.1 0 0 1 39 45A3.1 3.1 0 0 1 34 44z"/>' +
      '<path class="a" d="M32 46A3 3 0 0 1 28 43A3 3 0 0 1 24 40A3.1 3.1 0 0 1 23 35A3.1 3.1 0 0 1 22 30A3.1 3.1 0 0 1 23 25A3.1 3.1 0 0 1 24 20A2.8 2.8 0 0 1 26.5 16A2.8 2.8 0 0 1 29 12A1.8 1.8 0 0 1 32 12A1.8 1.8 0 0 1 35 12A2.8 2.8 0 0 1 37.5 16A2.8 2.8 0 0 1 40 20A3.1 3.1 0 0 1 41 25A3.1 3.1 0 0 1 42 30A3.1 3.1 0 0 1 41 35A3.1 3.1 0 0 1 40 40A3 3 0 0 1 36 43A3 3 0 0 1 32 46z"/>' +
      '<path class="e" d="M32 44V18M32 34l-5-5M32 28l5-5M32 38l5-4"/>'],
    zuurkool: ["--a:#ebe0a2;--b:#b07a45",
      '<path class="a" d="M10 34c0-8 8-12 14-9 3-6 13-6 16 0 6-3 14 1 14 9z"/>' +
      '<path class="e" d="M16 30c3-2 6 1 9-1s5 1 8-1M28 27c3-1 5 1 8-1M33 31c3-2 6 1 9-1s4 0 6-1"/>' +
      '<path class="b" d="M9 34h46l-4 21a3 3 0 0 1-3 2H16a3 3 0 0 1-3-2z"/><path class="e" d="M11 42h42M12.5 50h39"/>'],
    spruiten: ["--a:#7aa848",
      '<circle class="a" cx="21" cy="41" r="11"/><path class="e" d="M12.8 37.7c4.4 7.7 12.1 11 16.5 8.3M28.7 36.1c-1.1 6.6 -5.5 11 -11 12.1"/>' +
      '<circle class="a" cx="43" cy="41" r="11"/><path class="e" d="M34.8 37.7c4.4 7.7 12.1 11 16.5 8.3M50.7 36.1c-1.1 6.6 -5.5 11 -11 12.1"/>' +
      '<circle class="a" cx="32" cy="23" r="11"/><path class="e" d="M23.8 19.7c4.4 7.7 12.1 11 16.5 8.3M39.7 18.1c-1.1 6.6 -5.5 11 -11 12.1"/>'],
    sperziebonen: ["--a:#5a9a3e",
      '<g transform="translate(0 0)"><path class="a" d="M9 46c12-6 26-18 37-31 1-2 4-1 3 1C40 30 26 43 12 51c-2 1-4-3-3-5z"/><path class="s" d="M47 15l3-4"/></g>' +
      '<g transform="translate(7 4)"><path class="a" d="M9 46c12-6 26-18 37-31 1-2 4-1 3 1C40 30 26 43 12 51c-2 1-4-3-3-5z"/><path class="s" d="M47 15l3-4"/></g>' +
      '<g transform="translate(-6 6)"><path class="a" d="M9 46c12-6 26-18 37-31 1-2 4-1 3 1C40 30 26 43 12 51c-2 1-4-3-3-5z"/><path class="s" d="M47 15l3-4"/></g>'],
    snijbonen: ["--a:#8cbf55;--d:#b8dc8a",
      '<path class="a" d="M5 34c12-4 26-12 36-24 2-2 7 0 6 3-8 14-22 24-36 28-4 1-9-5-6-7z"/><path class="e" d="M11 36c12-4 24-12 32-22"/>' +
      '<path class="a" d="M18 51l4-8h8l-4 8z"/><path class="a" d="M30 49l4-8h8l-4 8z"/><path class="a" d="M42 47l4-8h8l-4 8z"/><path class="a" d="M24 59l4-8h8l-4 8z"/><path class="a" d="M36 58l4-8h8l-4 8z"/>'],
    peultjes: ["--a:#9cc65a;--d:#c9e39a;--b:#5c9e3a",
      '<g transform="translate(0 0)"><path class="a" d="M8 30c10 6 30 6 44-6 2 2 2 5 0 7C40 42 18 42 8 34c-2-1-1-4 0-4z"/><circle class="d" cx="20" cy="35" r="2.6"/><circle class="d" cx="29" cy="36" r="2.6"/><circle class="d" cx="38" cy="34" r="2.6"/><path class="b" d="M5 28l6 1-2 6z"/></g>' +
      '<g transform="translate(4 14)"><path class="a" d="M8 30c10 6 30 6 44-6 2 2 2 5 0 7C40 42 18 42 8 34c-2-1-1-4 0-4z"/><circle class="d" cx="20" cy="35" r="2.6"/><circle class="d" cx="29" cy="36" r="2.6"/><circle class="d" cx="38" cy="34" r="2.6"/><path class="b" d="M5 28l6 1-2 6z"/></g>'],
    doperwten: ["--a:#6cb33f;--d:#b8e08a",
      '<circle class="a" cx="20" cy="46" r="6"/><circle class="d" cx="18" cy="44" r="1.5"/>' +
      '<circle class="a" cx="32" cy="46" r="6"/><circle class="d" cx="30" cy="44" r="1.5"/>' +
      '<circle class="a" cx="44" cy="46" r="6"/><circle class="d" cx="42" cy="44" r="1.5"/>' +
      '<circle class="a" cx="26" cy="36" r="6"/><circle class="d" cx="24" cy="34" r="1.5"/>' +
      '<circle class="a" cx="38" cy="36" r="6"/><circle class="d" cx="36" cy="34" r="1.5"/>' +
      '<circle class="a" cx="32" cy="26" r="6"/><circle class="d" cx="30" cy="24" r="1.5"/>' +
      '<circle class="a" cx="14" cy="36" r="6"/><circle class="d" cx="12" cy="34" r="1.5"/>' +
      '<circle class="a" cx="50" cy="36" r="6"/><circle class="d" cx="48" cy="34" r="1.5"/>'],
    "doperwten en wortelen": ["--a:#6cb33f;--b:#f08a24;--d:#b8e08a",
      '<rect class="b" x="12" y="38" width="10" height="10" rx="1.5" transform="rotate(-12 17 43)"/><rect class="b" x="36" y="22" width="10" height="10" rx="1.5" transform="rotate(15 41 27)"/><rect class="b" x="40" y="41" width="10" height="10" rx="1.5" transform="rotate(-5 45 46)"/>' +
      '<circle class="a" cx="26" cy="46" r="5.5"/><circle class="d" cx="24.2" cy="44.2" r="1.3"/><circle class="a" cx="32" cy="36" r="5.5"/><circle class="d" cx="30.2" cy="34.2" r="1.3"/><circle class="a" cx="20" cy="27" r="5.5"/><circle class="d" cx="18.2" cy="25.2" r="1.3"/><circle class="a" cx="26" cy="26" r="5.5"/><circle class="d" cx="24.2" cy="24.2" r="1.3"/><circle class="a" cx="46" cy="35" r="5.5"/><circle class="d" cx="44.2" cy="33.2" r="1.3"/><circle class="a" cx="16" cy="52" r="5.5"/><circle class="d" cx="14.2" cy="50.2" r="1.3"/><circle class="a" cx="36" cy="52" r="5.5"/><circle class="d" cx="34.2" cy="50.2" r="1.3"/>'],
    mais: ["--a:#f5cf3c;--b:#7fae4a;--d:#e0a822",
      '<g transform="rotate(35 32 32)"><ellipse class="a" cx="32" cy="28" rx="10" ry="22"/>' +
      '<path class="e" d="M24 18h16M23 25h18M23 32h18M24 39h16M28 9v38M36 9v38"/>' +
      '<path class="b" d="M32 58c-8-4-14-16-12-30 3 8 7 14 12 18z"/><path class="b" d="M32 58c8-4 14-16 12-30-3 8-7 14-12 18z"/></g>'],
    paddenstoelen: ["--a:#6b4a33;--b:#efe3cc;--c:#e8a23a;--d:#a8805c",
      '<path class="b" d="M18 36h8l-1 18h-6z"/><path class="a" d="M6 38c0-10 7-16 16-16s16 6 16 16c-5 3-27 3-32 0z"/><circle class="d" cx="16" cy="30" r="1.8"/><circle class="d" cx="25" cy="27" r="1.5"/>' +
      '<path class="c" d="M36 22c6-4 18-4 22 0-2 6-7 8-9 12l-1 20h-5l-1-20c-2-4-6-6-6-12z"/><path class="e" d="M41 25l3 6M46 24v7M51 25l-2 6"/>'],
    aubergine: ["--a:#5b2d5e;--b:#5c9e3a;--d:#8d5a90",
      '<path class="a" d="M38 18c8 2 12 9 10 16-3 12-14 22-26 22-8 0-13-6-11-13 2-9 10-12 15-18 3-4 6-8 12-7z"/>' +
      '<ellipse class="d" cx="22" cy="44" rx="2.5" ry="5" transform="rotate(40 22 44)"/>' +
      '<path class="b" d="M34 19c3-4 10-6 15-3-1 4 0 9-2 12-3-5-8-7-13-9z"/><path class="s" d="M46 16l5-6"/>'],
    pompoen: ["--a:#e8792a;--b:#5c9e3a",
      '<path class="s" d="M32 20c0-5 2-9 6-11"/><path class="b" d="M34 18c4-5 11-5 14-2-4 4-9 5-14 2z"/>' +
      '<ellipse class="a" cx="20" cy="38" rx="12" ry="16"/><ellipse class="a" cx="44" cy="38" rx="12" ry="16"/><ellipse class="a" cx="32" cy="38" rx="11" ry="17"/>'],
    knolselderij: ["--a:#d8c9a3;--b:#7fae4a;--d:#a8956a",
      '<path class="b" d="M26 22c-2-6-1-12 1-15l4 1c-1 4-1 9 0 14zM36 22c1-6 4-11 8-13l2 4c-3 2-5 6-6 10z"/>' +
      '<path class="a" d="M51 36A5.4 5.4 0 0 1 48.8 43.4A5.8 5.8 0 0 1 42.8 49.2A6.2 6.2 0 0 1 34.3 51.9A6.4 6.4 0 0 1 25.3 51A6.1 6.1 0 0 1 17.8 46.6A5.6 5.6 0 0 1 13.6 39.8A5.4 5.4 0 0 1 13.6 32.2A5.6 5.6 0 0 1 17.8 25.4A6.1 6.1 0 0 1 25.3 21A6.4 6.4 0 0 1 34.3 20.1A6.2 6.2 0 0 1 42.8 22.8A5.8 5.8 0 0 1 48.8 28.6A5.4 5.4 0 0 1 51 36z"/>' +
      '<path class="s" d="M24 51l-3 6M32 52v6M40 51l3 6"/><circle class="d" cx="24" cy="34" r="1.6"/><circle class="d" cx="35" cy="30" r="1.6"/><circle class="d" cx="40" cy="40" r="1.6"/><circle class="d" cx="28" cy="42" r="1.4"/>'],
    bleekselderij: ["--a:#a9cf6e;--b:#5c9e3a;--d:#cfe6a0",
      '<path class="b" d="M47 15A3.7 3.7 0 0 1 43.5 20.1A5.6 5.6 0 0 1 34.6 22.9A6.1 6.1 0 0 1 24.5 21.9A4.7 4.7 0 0 1 17.9 17.7A3.3 3.3 0 0 1 17.9 12.3A4.7 4.7 0 0 1 24.5 8.1A6.1 6.1 0 0 1 34.6 7.1A5.6 5.6 0 0 1 43.5 9.9A3.7 3.7 0 0 1 47 15z"/>' +
      '<g transform="rotate(-10 32 58)"><path class="a" d="M27 16h10l1 38c0 3-12 3-12 0z"/><path class="e" d="M30 22v30M34 22v30"/></g><g transform="rotate(10 32 58)"><path class="a" d="M27 16h10l1 38c0 3-12 3-12 0z"/><path class="e" d="M30 22v30M34 22v30"/></g><g transform="rotate(0 32 58)"><path class="a" d="M27 16h10l1 38c0 3-12 3-12 0z"/><path class="e" d="M30 22v30M34 22v30"/></g>'],
    venkel: ["--a:#eef0d6;--b:#9cc768;--c:#6fa046",
      '<g transform="translate(32 33) scale(0.9) translate(-32 -32)"><path class="b" d="M25 28l-6-18h5l6 18zM39 28l6-18h-5l-6 18zM30 28l1-20h3l1 20z"/>' +
      '<path class="c" d="M26 10A3.3 3.3 0 0 1 22.5 14.3A4.2 4.2 0 0 1 15.5 14.3A3.3 3.3 0 0 1 12 10A3.3 3.3 0 0 1 15.5 5.7A4.2 4.2 0 0 1 22.5 5.7A3.3 3.3 0 0 1 26 10z"/><path class="c" d="M52 10A3.3 3.3 0 0 1 48.5 14.3A4.2 4.2 0 0 1 41.5 14.3A3.3 3.3 0 0 1 38 10A3.3 3.3 0 0 1 41.5 5.7A4.2 4.2 0 0 1 48.5 5.7A3.3 3.3 0 0 1 52 10z"/><path class="c" d="M38 8A3.4 3.4 0 0 1 33.9 11.8A4.1 4.1 0 0 1 27.1 10.4A2.8 2.8 0 0 1 27.1 5.6A4.1 4.1 0 0 1 33.9 4.2A3.4 3.4 0 0 1 38 8z"/>' +
      '<path class="a" d="M24 27c5-2 11-2 16 0 8 3 14 10 13 18-1 8-10 12-21 12s-20-4-21-12c-1-8 5-15 13-18z"/><path class="e" d="M32 28c-6 6-8 18-4 28M32 28c6 6 8 18 4 28"/></g>'],
    "rode kool": ["--a:#7a3a78;--c:#d9b3dc",
      '<circle class="a" cx="32" cy="34" r="22"/><circle class="c" cx="32" cy="34" r="16"/>' +
      '<path class="e" d="M32 50V36M24 22c6 4 8 10 8 14 0-6 4-12 10-14M18 32c6 0 10 2 14 6 4-4 8-6 14-6M20 44c4-4 8-6 12-6 4 0 8 2 12 6"/>'],
    "witte kool": ["--a:#dfe8b8;--b:#a9c96a",
      '<circle class="b" cx="32" cy="35" r="21"/><circle class="a" cx="32" cy="35" r="15"/>' +
      '<path class="e" d="M17 30c4-8 10-12 15-12M47 30c-4-8-10-12-15-12M32 21c-3 8-3 16 0 26M24 40c3 4 6 6 8 7M40 40c-3 4-6 6-8 7"/>'],
    spitskool: ["--a:#a9c96a;--b:#7fae4a",
      '<path class="b" d="M32 6c-10 8-18 24-17 36 1 10 7 15 17 15s16-5 17-15C50 30 42 14 32 6z"/>' +
      '<path class="a" d="M32 12c-6 8-11 20-10 30 1 8 4 12 10 12s9-4 10-12c1-10-4-22-10-30z"/>' +
      '<path class="e" d="M32 14v38M32 28l-6-5M32 36l7-6M32 44l-7-5"/>'],
    "chinese kool": ["--a:#f1edc8;--b:#9cc768;--d:#d8dba0",
      '<g transform="translate(32 33) scale(.88) rotate(-30) translate(-32 -32)"><path class="b" d="M20 18c-3-8 2-14 8-14 2-3 6-3 8 0 6 0 11 6 8 14z"/>' +
      '<path class="a" d="M20 18c-2 12-2 26 2 34 3 5 17 5 20 0 4-8 4-22 2-34-6 3-18 3-24 0z"/>' +
      '<path class="e" d="M32 20v32M26 20c-1 10-1 22 1 30M38 20c1 10 1 22-1 30"/></g>'],
    paksoi: ["--a:#f2f2e4;--b:#2f7a3a",
      '<g transform="rotate(-16 32 58)"><path class="b" d="M32 32c-9-3-13-12-11-22 4-6 18-6 22 0 2 10-2 19-11 22z"/><path class="a" d="M28 30h8l2 24c0 4-12 4-12 0z"/><path class="e" d="M32 30V12"/></g>' +
      '<g transform="rotate(16 32 58)"><path class="b" d="M32 32c-9-3-13-12-11-22 4-6 18-6 22 0 2 10-2 19-11 22z"/><path class="a" d="M28 30h8l2 24c0 4-12 4-12 0z"/><path class="e" d="M32 30V12"/></g>' +
      '<g transform="rotate(0 32 58)"><path class="b" d="M32 32c-9-3-13-12-11-22 4-6 18-6 22 0 2 10-2 19-11 22z"/><path class="a" d="M28 30h8l2 24c0 4-12 4-12 0z"/><path class="e" d="M32 30V12"/></g>'],
    witlof: ["--a:#f3f0dc;--b:#e8dc6e",
      '<g transform="rotate(-10 22 34)"><path class="a" d="M22 8c-8 6-11 18-10 30 1 10 4 18 10 18s9-8 10-18c1-12-2-24-10-30z"/><path class="b" d="M22 8c-5 4-8 9-9 15 4-2 6-2 9 0 3-2 5-2 9 0-1-6-4-11-9-15z"/><path class="e" d="M22 24v28M17 30c1 8 2 14 3 20M27 30c-1 8-2 14-3 20"/></g>' +
      '<g transform="rotate(10 42 34)"><path class="a" d="M42 8c-8 6-11 18-10 30 1 10 4 18 10 18s9-8 10-18c1-12-2-24-10-30z"/><path class="b" d="M42 8c-5 4-8 9-9 15 4-2 6-2 9 0 3-2 5-2 9 0-1-6-4-11-9-15z"/><path class="e" d="M42 24v28M37 30c1 8 2 14 3 20M47 30c-1 8-2 14-3 20"/></g>'],
    koolrabi: ["--a:#cfe0a0;--b:#7fae4a;--d:#a9c47a",
      '<g transform="translate(32 33) scale(0.9) translate(-32 -32)"><path class="s" d="M26 28L18 16M32 25V12M38 28l8-12"/>' +
      '<path class="b" d="M18 17c-8 0-12-5-11-10 6-1 11 3 11 10zM32 13c-5-3-5-9-1-12 4 3 5 8 1 12zM46 17c8 0 12-5 11-10-6-1-11 3-11 10z"/>' +
      '<circle class="a" cx="32" cy="40" r="16"/><path class="s" d="M32 56v3"/><circle class="d" cx="22" cy="40" r="2"/><circle class="d" cx="42" cy="38" r="2"/><circle class="d" cx="33" cy="48" r="2"/></g>'],
    "rode bieten": ["--a:#8a1f3a;--b:#5c9e3a;--c:#a3284a;--d:#c4506a",
      '<path class="c" d="M27 24l-8-12 3-2 8 13zM31 23l1-14h3l-1 14zM36 24l7-12 3 2-7 11z"/>' +
      '<path class="b" d="M14 12c2-6 9-7 10-2-2 4-6 5-10 2zM29 8c3-5 9-3 9 1-3 3-7 3-9-1zM41 11c4-5 10-3 9 2-3 3-7 3-9-2z"/>' +
      '<path class="a" d="M32 22c11 0 18 7 18 16 0 9-8 14-15 16l-3 5-3-5c-7-2-15-7-15-16 0-9 7-16 18-16z"/>' +
      '<ellipse class="d" cx="24" cy="34" rx="3" ry="5" transform="rotate(25 24 34)"/>'],
    radijs: ["--a:#d63a5a;--b:#5c9e3a;--c:#f6eef0",
      '<g transform="translate(32 34) scale(0.9) translate(-32 -32)"><path class="s" d="M24 26l-4-10M40 26l4-12"/><path class="b" d="M20 18C23.4 12.6 21.4 7.1 15.6 5.8C12 10.5 14 16 20 18z"/><path class="b" d="M44 15C50 13 52 7.5 48.4 2.8C42.6 4.1 40.6 9.6 44 15z"/>' +
      '<path class="c" d="M17 44l-4 11 9-6z"/><circle class="a" cx="21" cy="38" r="10"/><path class="c" d="M41 42l2 13 5-11z"/><circle class="a" cx="43" cy="35" r="10"/></g>'],
    pastinaak: ["--a:#ead9b0;--b:#7fae4a",
      '<path class="b" d="M44 20c-1-7 2-12 6-13 1 5-1 10-6 13zM46 22c5-5 10-5 13-2-3 3-8 4-13 2z"/>' +
      '<path class="a" d="M10 56L37 22c5-5 12-1 10 5L15 58c-2 1-6 0-5-2z"/>' +
      '<path class="e" d="M21 47l4 1M28 38l4 1M35 30l4 1M18 52h2"/>'],
    asperges: ["--a:#f3eed6;--b:#7a5ea8",
      '<g transform="rotate(-16 32 60)"><path class="a" d="M28 12c1-5 7-5 8 0v42h-8z"/><path class="e" d="M28.5 21l2.5 2M35.5 28l-2.5 2"/></g><g transform="rotate(-8 32 60)"><path class="a" d="M28 16c1-5 7-5 8 0v42h-8z"/><path class="e" d="M28.5 25l2.5 2M35.5 32l-2.5 2"/></g><g transform="rotate(0 32 60)"><path class="a" d="M28 12c1-5 7-5 8 0v42h-8z"/><path class="e" d="M28.5 21l2.5 2M35.5 28l-2.5 2"/></g><g transform="rotate(8 32 60)"><path class="a" d="M28 16c1-5 7-5 8 0v42h-8z"/><path class="e" d="M28.5 25l2.5 2M35.5 32l-2.5 2"/></g><g transform="rotate(16 32 60)"><path class="a" d="M28 12c1-5 7-5 8 0v42h-8z"/><path class="e" d="M28.5 21l2.5 2M35.5 28l-2.5 2"/></g>' +
      '<rect class="b" x="16" y="40" width="32" height="7" rx="2"/>'],
    avocado: ["--a:#3e5a2a;--c:#cfe08a;--b:#8a5a32",
      '<path class="a" d="M32 6c8 0 11 8 13 16 2 6 10 12 10 22 0 9-10 15-23 15S9 53 9 44c0-10 8-16 10-22 2-8 5-16 13-16z"/>' +
      '<path class="c" d="M32 11c5 0 8 6 9 13 2 6 9 11 9 20 0 7-8 11-18 11s-18-4-18-11c0-9 7-14 9-20 1-7 4-13 9-13z"/>' +
      '<circle class="b" cx="32" cy="41" r="8"/>'],
    "taugé": ["--a:#f6f2de;--b:#e3d870",
      '<path class="a" d="M9 49.2L10.9 47.6L12.7 46L14.4 44.2L15.9 42.3L17.4 40.4L18.7 38.4L19.9 36.3L21 34.2L21.9 32L22.6 29.7L23.2 27.5L23.6 25.2L23.9 22.8L24 20.5L23.9 18.1L23.6 15.7L20.4 16.3L20.7 18.4L20.8 20.5L20.7 22.6L20.5 24.7L20.1 26.8L19.6 28.8L18.9 30.9L18 32.8L17.1 34.8L16 36.7L14.8 38.5L13.4 40.3L12 42L10.4 43.7L8.8 45.3L7 46.8z"/>' +
      '<ellipse class="b" cx="22" cy="16" rx="3.5" ry="4.5"/><path class="a" d="M21.5 54.6L22.6 52.1L23.8 49.6L25.1 47.2L26.4 44.9L27.7 42.5L29 40.2L30.3 37.8L31.4 35.4L32.5 33L33.5 30.5L34.4 28L35.1 25.4L35.5 22.7L35.8 19.8L35.8 16.9L35.6 13.8L32.4 14.2L32.6 17L32.6 19.7L32.4 22.2L31.9 24.7L31.3 27.1L30.5 29.4L29.6 31.8L28.6 34.1L27.4 36.3L26.2 38.6L24.9 41L23.6 43.3L22.3 45.7L21 48.2L19.7 50.7L18.5 53.4z"/>' +
      '<ellipse class="b" cx="34" cy="14" rx="3.5" ry="4.5"/><path class="a" d="M31.1 57.1L33 55.1L34.8 53L36.4 50.7L37.9 48.4L39.3 46L40.6 43.6L41.8 41.1L43 38.7L44.1 36.2L45.1 33.8L46.2 31.4L47.2 29.1L48.2 26.9L49.3 24.7L50.3 22.7L51.4 20.8L48.6 19.2L47.5 21.2L46.4 23.3L45.3 25.5L44.3 27.8L43.3 30.1L42.2 32.5L41.1 34.9L40 37.3L38.9 39.7L37.7 42.1L36.5 44.5L35.1 46.7L33.7 48.9L32.2 51L30.6 53L28.9 54.9z"/>' +
      '<ellipse class="b" cx="50" cy="20" rx="3.5" ry="4.5"/><path class="a" d="M11.7 35.6L13.5 36L15.3 36.5L17.2 37.2L19.2 38L21.2 39L23.2 40L25.3 41.1L27.4 42.4L29.6 43.7L31.7 45.1L33.9 46.6L36.1 48.2L38.3 49.9L40.5 51.6L42.7 53.4L45 55.2L47 52.8L44.8 50.9L42.5 49.1L40.2 47.3L38 45.6L35.7 44L33.5 42.5L31.3 41L29.1 39.6L26.9 38.3L24.7 37.2L22.6 36.1L20.5 35.1L18.4 34.2L16.3 33.5L14.3 32.9L12.3 32.4z"/>' +
      '<ellipse class="b" cx="46" cy="54" rx="3.5" ry="4.5"/><path class="a" d="M41.5 58.6L42.2 56.9L43.1 55.3L44.1 53.9L45.2 52.5L46.3 51.1L47.5 49.9L48.7 48.6L49.9 47.4L51.1 46.2L52.3 44.9L53.4 43.7L54.5 42.4L55.5 41L56.3 39.6L57 38L57.6 36.4L54.4 35.6L54 36.9L53.5 38.1L52.8 39.3L52 40.4L51 41.6L49.9 42.7L48.8 43.9L47.6 45.1L46.4 46.4L45.1 47.7L43.9 49L42.7 50.5L41.5 52L40.4 53.7L39.4 55.5L38.5 57.4z"/>' +
      '<ellipse class="b" cx="56" cy="36" rx="3.5" ry="4.5"/>'],
    ijsbergsla: ["--a:#cfe6a0;--b:#8dbf5a",
      '<circle class="a" cx="32" cy="32" r="21"/>' +
      '<path class="b" d="M11 34c0 13 10 22 21 22s21-9 21-22c-5 6-11 9-21 9s-16-3-21-9z"/>' +
      '<path class="e" d="M24 14c-6 8-6 18 0 26M40 14c6 8 6 18 0 26M32 12v28"/>'],
    kropsla: ["--a:#7fb24e;--b:#b8d77a;--d:#e3eba0",
      '<path class="a" d="M56 34A6.8 6.8 0 0 1 52.8 44.5A7.2 7.2 0 0 1 44 52.2A7.6 7.6 0 0 1 32 55A7.6 7.6 0 0 1 20 52.2A7.2 7.2 0 0 1 11.2 44.5A6.8 6.8 0 0 1 8 34A6.8 6.8 0 0 1 11.2 23.5A7.2 7.2 0 0 1 20 15.8A7.6 7.6 0 0 1 32 13A7.6 7.6 0 0 1 44 15.8A7.2 7.2 0 0 1 52.8 23.5A6.8 6.8 0 0 1 56 34z"/>' +
      '<path class="b" d="M46.1 38.4A5.9 5.9 0 0 1 39.5 45.3A6.3 6.3 0 0 1 29.4 46.8A6.2 6.2 0 0 1 20.5 42.4A5.6 5.6 0 0 1 17 34A5.6 5.6 0 0 1 20.5 25.6A6.2 6.2 0 0 1 29.4 21.2A6.3 6.3 0 0 1 39.5 22.7A5.9 5.9 0 0 1 46.1 29.6A5.5 5.5 0 0 1 46.1 38.4z"/>' +
      '<circle class="d" cx="32" cy="34" r="6"/><path class="e" d="M32 34L14 22M32 34l18-12M32 34L16 48M32 34l16 14"/>'],
    sla: ["--a:#6cb33f;--d:#b8e08a",
      '<path class="a" d="M30 58A8.3 8.3 0 0 1 18 52A8.9 8.9 0 0 1 10 40A7.5 7.5 0 0 1 9 28A8.1 8.1 0 0 1 14 16A7.9 7.9 0 0 1 24 8A7.5 7.5 0 0 1 36 7A8.1 8.1 0 0 1 48 12A8.6 8.6 0 0 1 55 24A8.7 8.7 0 0 1 54 38A8.9 8.9 0 0 1 46 50A7.9 7.9 0 0 1 36 58A3.7 3.7 0 0 1 30 58z"/>' +
      '<path class="e" d="M32 56C30 40 30 24 34 10M31 44l-10-8M31 34l-12-12M32 26l12-10M31 40l13-6"/>'],
    rucola: ["--a:#3f7a35",
      '<g transform="translate(32 30) scale(0.86) translate(-32 -32)"><path class="a" d="M22 58L20.1 48L23.2 42.4L18 40.2L20.4 32.8L15.2 30.5L14.1 22.4L4.8 15.3L3 26.9L7.8 33.5L5.6 38.7L12.5 42.4L10.3 47.6L16.4 49.5z"/><path class="e" d="M20.5 54.3L7 20.9"/>' +
      '<path class="a" d="M32 58L34 48L39 44L35 40L40 34L36 30L38 22L32 12L26 22L28 30L24 34L29 40L25 44L30 48z"/><path class="e" d="M32 54L32 18"/>' +
      '<path class="a" d="M42 58L47.6 49.5L53.7 47.6L51.5 42.4L58.4 38.7L56.2 33.5L61 26.9L59.2 15.3L49.9 22.4L48.8 30.5L43.6 32.8L46 40.2L40.8 42.4L43.9 48z"/><path class="e" d="M43.5 54.3L57 20.9"/></g>'],
    veldsla: ["--a:#3f7a35;--d:#2c5a28",
      '<path class="a" d="M20 40C26 35.5 26 28.8 20 25C14 28.8 14 35.5 20 40z"/><path class="a" d="M20 40C26.1 44.3 32.6 42.2 34.3 35.4C28.8 30.8 22.4 32.9 20 40z"/><path class="a" d="M20 40C17.8 47.2 21.8 52.6 28.8 52.1C31.5 45.6 27.5 40.1 20 40z"/><path class="a" d="M20 40C12.5 40.1 8.5 45.6 11.2 52.1C18.2 52.6 22.2 47.2 20 40z"/><path class="a" d="M20 40C17.6 32.9 11.2 30.8 5.7 35.4C7.4 42.2 13.9 44.3 20 40z"/><circle class="d" cx="20" cy="40" r="2.5"/>' +
      '<path class="a" d="M42 30C48 25.5 48 18.8 42 15C36 18.8 36 25.5 42 30z"/><path class="a" d="M42 30C48.1 34.3 54.6 32.2 56.3 25.4C50.8 20.8 44.4 22.9 42 30z"/><path class="a" d="M42 30C39.8 37.2 43.8 42.6 50.8 42.1C53.5 35.6 49.5 30.1 42 30z"/><path class="a" d="M42 30C34.5 30.1 30.5 35.6 33.2 42.1C40.2 42.6 44.2 37.2 42 30z"/><path class="a" d="M42 30C39.6 22.9 33.2 20.8 27.7 25.4C29.4 32.2 35.9 34.3 42 30z"/><circle class="d" cx="42" cy="30" r="2.5"/>'],
    rauwkost: ["--a:#f3eed6;--b:#7fa6c4;--d:#f08a24;--c:#b8d77a",
      '<path class="c" d="M11 38c0-9 8-14 15-11 3-6 13-6 16 0 7-2 13 3 12 11z"/>' +
      '<rect class="d" x="13" y="31.8" width="10" height="2.4" rx="1.2" transform="rotate(-20 18 33)"/><rect class="d" x="21" y="28.8" width="10" height="2.4" rx="1.2" transform="rotate(30 26 30)"/><rect class="d" x="29" y="26.8" width="10" height="2.4" rx="1.2" transform="rotate(-10 34 28)"/><rect class="d" x="37" y="31.8" width="10" height="2.4" rx="1.2" transform="rotate(40 42 33)"/><rect class="d" x="25" y="33.8" width="10" height="2.4" rx="1.2" transform="rotate(10 30 35)"/><rect class="d" x="41" y="28.8" width="10" height="2.4" rx="1.2" transform="rotate(-30 46 30)"/><rect class="d" x="17" y="34.8" width="10" height="2.4" rx="1.2" transform="rotate(60 22 36)"/>' +
      '<path class="e" d="M20 30c3-2 5 0 7-2M36 32c2-2 5 0 7-2"/>' +
      '<path class="b" d="M6 38h52c0 10-11 18-26 18S6 48 6 38z"/>'],
    roerbakgroente: ["--a:#3a3a3e;--b:#d93a2f;--c:#5c9e3a;--d:#f2c84b",
      '<g transform="translate(32 30) scale(0.9) translate(-32 -32)"><path class="a" d="M46 40l14-6 1 3-13 7z"/>' +
      '<g transform="translate(0 -5) scale(1.1) translate(-3 0)"><path class="b" d="M12 34c4-6 10-8 16-6l-1 4c-5-1-9 0-12 4z"/><path class="c" d="M43 28A3.8 3.8 0 0 1 39.5 33.2A4.2 4.2 0 0 1 32.5 33.2A3.8 3.8 0 0 1 29 28A3.8 3.8 0 0 1 32.5 22.8A4.2 4.2 0 0 1 39.5 22.8A3.8 3.8 0 0 1 43 28z"/>' +
      '<rect class="d" x="24" y="24" width="12" height="4" rx="2" transform="rotate(-20 30 26)"/><path class="b" d="M38 36c4-4 9-5 12-3l-1 3c-3-1-6 0-9 3z"/></g>' +
      '<path class="a" d="M5 35h50c-1 12-11 20-25 20S6 47 5 35z"/></g>'],
    soepgroente: ["--a:#b8433a;--b:#f08a24;--c:#f2efd9;--d:#7fae4a",
      '<circle class="b" cx="22" cy="20" r="6"/><circle class="c" cx="35" cy="17" r="6"/><circle class="d" cx="35" cy="17" r="2.5"/><circle class="b" cx="44" cy="22" r="5.5"/><rect class="c" x="26" y="22" width="9" height="9" rx="1.5"/>' +
      '<path class="a" d="M10 28h44v20c0 5-4 8-9 8H19c-5 0-9-3-9-8z"/><path class="a" d="M10 33H5v6h5M54 33h5v6h-5"/><path class="e" d="M10 32h44"/>'],
    stamppotgroente: ["--a:#f1e2a8;--c:#f6f1e4;--b:#8a5a32;--d:#3f7a35",
      '<ellipse class="c" cx="32" cy="44" rx="27" ry="11"/>' +
      '<path class="a" d="M12 43c-2-10 6-17 14-15 2-7 14-7 17 0 8-2 13 6 10 15-8 4-34 4-41 0z"/>' +
      '<ellipse class="b" cx="32" cy="31" rx="6" ry="3"/>' +
      '<path class="d" d="M20 38l2-1 1 2-2 1z" transform="rotate(20 20 38)"/><circle class="d" cx="23" cy="37" r="1.2"/><path class="d" d="M26 34l2-1 1 2-2 1z" transform="rotate(20 26 34)"/><circle class="d" cx="29" cy="33" r="1.2"/><path class="d" d="M38 36l2-1 1 2-2 1z" transform="rotate(20 38 36)"/><circle class="d" cx="41" cy="35" r="1.2"/><path class="d" d="M44 40l2-1 1 2-2 1z" transform="rotate(20 44 40)"/><circle class="d" cx="47" cy="39" r="1.2"/><path class="d" d="M30 40l2-1 1 2-2 1z" transform="rotate(20 30 40)"/><circle class="d" cx="33" cy="39" r="1.2"/><path class="d" d="M22 43l2-1 1 2-2 1z" transform="rotate(20 22 43)"/><circle class="d" cx="25" cy="42" r="1.2"/><path class="d" d="M40 43l2-1 1 2-2 1z" transform="rotate(20 40 43)"/><circle class="d" cx="43" cy="42" r="1.2"/><path class="d" d="M34 26l2-1 1 2-2 1z" transform="rotate(20 34 26)"/><circle class="d" cx="37" cy="25" r="1.2"/>'],
    gember: ["--a:#d8b27a;--d:#b88a50",
      '<path class="a" d="M8 40c0-6 6-8 10-6 2-6 8-8 12-4 3-5 10-6 13-1 4-3 10-2 11 3 4 0 6 5 3 8-2 3-6 3-8 1-2 3-6 4-9 2-3 4-10 5-14 2-3 3-9 4-12 1-4 1-6-2-6-6z"/>' +
      '<path class="a" d="M30 30c-2-6 0-12 5-13 4 0 5 5 3 9z"/><path class="a" d="M43 29c1-5 5-8 8-6 2 3 0 6-4 8z"/>' +
      '<path class="e" d="M18 38v4M30 36v5M42 37v4M24 44h3M37 44h3"/>'],
    "rode peper": ["--a:#d1281f;--b:#4f8a3a;--d:#f07a6a",
      '<g transform="translate(32 30) scale(0.9) translate(-32 -32)"><g transform="translate(0 0)"><path class="a" d="M14.6 20L16.6 19.6L18.7 19.6L21 19.9L23.3 20.5L25.7 21.5L28 22.8L30.3 24.4L32.6 26.3L34.7 28.5L36.6 30.9L38.4 33.6L39.9 36.5L41.2 39.6L42.3 42.9L43 46.4L43.4 50L44.6 50L44.6 46.2L44.3 42.5L43.6 38.9L42.6 35.4L41.3 32.1L39.8 28.9L38 26L35.9 23.2L33.7 20.7L31.3 18.4L28.6 16.4L25.9 14.8L22.9 13.5L19.9 12.5L16.7 12L13.4 12z"/><path class="b" d="M9 17c2-4 6-5 9-3-1 4-5 6-9 3z"/><path class="s" d="M10 16l-4-4"/></g>' +
      '<g transform="translate(10 8)"><path class="a" d="M14.6 20L16.6 19.6L18.7 19.6L21 19.9L23.3 20.5L25.7 21.5L28 22.8L30.3 24.4L32.6 26.3L34.7 28.5L36.6 30.9L38.4 33.6L39.9 36.5L41.2 39.6L42.3 42.9L43 46.4L43.4 50L44.6 50L44.6 46.2L44.3 42.5L43.6 38.9L42.6 35.4L41.3 32.1L39.8 28.9L38 26L35.9 23.2L33.7 20.7L31.3 18.4L28.6 16.4L25.9 14.8L22.9 13.5L19.9 12.5L16.7 12L13.4 12z"/><path class="b" d="M9 17c2-4 6-5 9-3-1 4-5 6-9 3z"/><path class="s" d="M10 16l-4-4"/></g></g>'],
    peterselie: ["--a:#3f8a3a",
      '<path class="s" d="M32 58V40M32 58l-12-18M32 58l12-18"/>' +
      '<path class="a" d="M26 34A3.9 3.9 0 0 1 23 39.5A4.3 4.3 0 0 1 16.2 40.8A4.1 4.1 0 0 1 10.8 37A3.8 3.8 0 0 1 10.8 31A4.1 4.1 0 0 1 16.2 27.2A4.3 4.3 0 0 1 23 28.5A3.9 3.9 0 0 1 26 34z"/><path class="a" d="M54 34A3.9 3.9 0 0 1 51 39.5A4.3 4.3 0 0 1 44.2 40.8A4.1 4.1 0 0 1 38.8 37A3.8 3.8 0 0 1 38.8 31A4.1 4.1 0 0 1 44.2 27.2A4.3 4.3 0 0 1 51 28.5A3.9 3.9 0 0 1 54 34z"/><path class="a" d="M40 28A3.9 3.9 0 0 1 37 33.5A4.3 4.3 0 0 1 30.2 34.8A4.1 4.1 0 0 1 24.8 31A3.8 3.8 0 0 1 24.8 25A4.1 4.1 0 0 1 30.2 21.2A4.3 4.3 0 0 1 37 22.5A3.9 3.9 0 0 1 40 28z"/><path class="a" d="M32 22A3.9 3.9 0 0 1 29 27.5A4.3 4.3 0 0 1 22.2 28.8A4.1 4.1 0 0 1 16.8 25A3.8 3.8 0 0 1 16.8 19A4.1 4.1 0 0 1 22.2 15.2A4.3 4.3 0 0 1 29 16.5A3.9 3.9 0 0 1 32 22z"/><path class="a" d="M48 22A3.9 3.9 0 0 1 45 27.5A4.3 4.3 0 0 1 38.2 28.8A4.1 4.1 0 0 1 32.8 25A3.8 3.8 0 0 1 32.8 19A4.1 4.1 0 0 1 38.2 15.2A4.3 4.3 0 0 1 45 16.5A3.9 3.9 0 0 1 48 22z"/><path class="a" d="M40 14A3.9 3.9 0 0 1 37 19.5A4.3 4.3 0 0 1 30.2 20.8A4.1 4.1 0 0 1 24.8 17A3.8 3.8 0 0 1 24.8 11A4.1 4.1 0 0 1 30.2 7.2A4.3 4.3 0 0 1 37 8.5A3.9 3.9 0 0 1 40 14z"/>'],
    koriander: ["--a:#6aaa48",
      '<path class="s" d="M32 58V34M32 58L18 36M32 58l14-22"/>' +
      '<path class="a" d="M16 23.5A8.8 8.8 0 0 1 22.5 33.3A9.7 9.7 0 0 1 9.5 33.3A8.8 8.8 0 0 1 16 23.5z"/><path class="a" d="M48 23.5A8.8 8.8 0 0 1 54.5 33.3A9.7 9.7 0 0 1 41.5 33.3A8.8 8.8 0 0 1 48 23.5z"/><path class="a" d="M32 13.5A8.8 8.8 0 0 1 38.5 23.3A9.7 9.7 0 0 1 25.5 23.3A8.8 8.8 0 0 1 32 13.5z"/><path class="a" d="M22 9.5A8.8 8.8 0 0 1 28.5 19.3A9.7 9.7 0 0 1 15.5 19.3A8.8 8.8 0 0 1 22 9.5z"/><path class="a" d="M42 9.5A8.8 8.8 0 0 1 48.5 19.3A9.7 9.7 0 0 1 35.5 19.3A8.8 8.8 0 0 1 42 9.5z"/>'],
    basilicum: ["--a:#4caa3e",
      '<path class="s" d="M32 58V20"/>' +
      '<path class="a" d="M32 40C29.4 29.5 21 26.4 13.2 33.2C14.8 43.3 23.3 46.4 32 40z"/><path class="a" d="M32 40C40.7 46.4 49.2 43.3 50.8 33.2C43 26.4 34.6 29.5 32 40z"/><path class="a" d="M32 26C32.4 17.1 26.5 13 18.9 16.8C17.9 25.3 23.8 29.4 32 26z"/><path class="a" d="M32 26C40.2 29.4 46.1 25.3 45.1 16.8C37.5 13 31.6 17.1 32 26z"/><path class="a" d="M32 22C39 17.5 39 10.8 32 7C25 10.8 25 17.5 32 22z"/>' +
      '<path class="e" d="M29.2 39L17 34.5M34.8 39L47 34.5M30 24.6L21.5 18.7M34 24.6L42.5 18.7"/>'],
    bieslook: ["--a:#4f9a3e;--b:#b78ac8;--c:#d9c7a0",
      '<g transform="translate(32 30) scale(0.88) translate(-32 -32)"><rect class="a" x="29.5" y="12" width="5" height="46" rx="2.5" transform="rotate(-18 32 56)"/><rect class="a" x="29.5" y="17" width="5" height="46" rx="2.5" transform="rotate(-12 32 56)"/><rect class="a" x="29.5" y="12" width="5" height="46" rx="2.5" transform="rotate(-6 32 56)"/><rect class="a" x="29.5" y="17" width="5" height="46" rx="2.5" transform="rotate(0 32 56)"/><rect class="a" x="29.5" y="12" width="5" height="46" rx="2.5" transform="rotate(6 32 56)"/><rect class="a" x="29.5" y="17" width="5" height="46" rx="2.5" transform="rotate(12 32 56)"/><rect class="a" x="29.5" y="12" width="5" height="46" rx="2.5" transform="rotate(18 32 56)"/>' +
      '<circle class="b" cx="47" cy="15" r="7"/><circle class="b" cx="18" cy="17" r="5.5"/><rect class="c" x="20" y="42" width="24" height="7" rx="2"/></g>'],
  };

  // Where an Ingredient has no drawing of its own, its aisle stands in.
  const AISLE = {
    produce: ["--a:#d94b3d;--b:#c08a4f;--c:#f08a24;--d:#5c9e3a;--e:#8a5c2e;--s:#6b4a2a",
      '<path class="s" d="M22 22l2-5"/><circle class="a" cx="21" cy="31" r="9"/>' +
      '<path class="c" d="M31 35l20-14-8 17z"/><path class="d" d="M50 22c2-5 6-6 8-5-1 3-4 5-8 5z"/>' +
      '<rect class="b" x="7" y="34" width="50" height="20" rx="3"/><path class="e" d="M7 44h50M19 34v20M32 34v20M45 34v20"/>'],
    meat: ["--a:#c94f4f;--c:#f6efe2;--e:#e98a8a",
      '<path class="a" d="M10 34c0-12 12-18 24-16 12 2 22 10 20 20s-12 16-24 14S10 46 10 34z"/>' +
      '<path class="e" d="M18 30c6 2 10 6 12 12M24 24c6 1 10 3 14 6"/><circle class="c" cx="41" cy="36" r="5"/>'],
    fish: ["--a:#7fa6c4;--d:#2b2118;--e:#4f7a9a",
      '<path class="a" d="M7 34c8-12 22-16 34-10l13-8v32l-13-8C29 46 15 46 7 34z"/>' +
      '<circle class="d" cx="15" cy="32" r="2"/><path class="e" d="M26 28c3 3 3 9 0 12M33 27c3 4 3 10 0 14"/>'],
    dairy: ["--a:#f7f4ec;--b:#3a6fb8;--c:#f2c84b;--d:#d9a72c",
      '<rect class="b" x="17" y="13" width="12" height="5" rx="1.5"/>' +
      '<path class="a" d="M18 18h10v6l4 7v25H14V31l4-7z"/>' +
      '<path class="c" d="M33 56V43l23-9v22z"/><circle class="d" cx="41" cy="47" r="2.2"/><circle class="d" cx="50" cy="43" r="1.8"/><circle class="d" cx="49" cy="51" r="1.6"/>'],
    pantry: ["--a:#c94f6a;--b:#5c9e3a;--c:#ece6da",
      '<rect class="c" x="16" y="18" width="32" height="38" rx="7"/><path class="a" d="M16 34h32v15a7 7 0 0 1-7 7H23a7 7 0 0 1-7-7z"/>' +
      '<rect class="b" x="18" y="10" width="28" height="9" rx="2"/>'],
    bakery: ["--a:#d4a05a;--b:#c98b4a;--e:#8f5a28",
      '<g transform="rotate(-30 30 30)"><rect class="a" x="6" y="22" width="48" height="13" rx="6.5"/><path class="e" d="M14 25l4 7M24 25l4 7M34 25l4 7M44 25l4 7"/></g>' +
      '<circle class="b" cx="44" cy="44" r="12"/><path class="e" d="M38 40c4 2 8 2 12 0"/>'],
  };
  // An item no Ingredient was found for.
  const BAG = ["--a:#d9b88a;--e:#a07a4a", '<path class="s" d="M24 24c0-9 16-9 16 0"/><path class="a" d="M13 24h38l-3 32H16z"/><path class="e" d="M13 30h38"/>'];

  const FILTER =
    '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
    '<filter id="sticker-edge" x="-25%" y="-25%" width="150%" height="150%">' +
    '<feMorphology in="SourceAlpha" operator="dilate" radius="3.2" result="grown"/>' +
    '<feFlood class="sticker-flood"/><feComposite in2="grown" operator="in" result="edge"/>' +
    '<feOffset in="grown" dy="1.6" result="drop"/><feFlood flood-color="#000" flood-opacity=".18"/>' +
    '<feComposite in2="drop" operator="in" result="shadow"/>' +
    '<feMerge><feMergeNode in="shadow"/><feMergeNode in="edge"/><feMergeNode in="SourceGraphic"/></feMerge>' +
    "</filter></defs></svg>";
  let filterAdded = false;

  /** The sticker for an Ingredient (by id and aisle), or the bag for none. */
  function sticker(ingredient, aisle) {
    if (!filterAdded && global.document) { global.document.body.insertAdjacentHTML("afterbegin", FILTER); filterAdded = true; }
    const [vars, shapes] = (ingredient && ART[ingredient]) || (ingredient && AISLE[aisle]) || BAG;
    return '<svg class="pic" viewBox="0 0 64 64" aria-hidden="true" style="' + vars + '"><g class="art">' + shapes + "</g></svg>";
  }

  global.IMAGES = { sticker, drawn: Object.keys(ART), aisles: Object.keys(AISLE) };
})(typeof window !== "undefined" ? window : globalThis);
