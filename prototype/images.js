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
