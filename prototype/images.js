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
    dille: ["--a:#9ccf7a;--d:#b5dc96",
      '<path class="s" d="M32 60V36M32 48L20 30M32 48l12-18M32 36l-2-14M32 36l4-16"/>' +
      '<circle class="d" cx="18" cy="24" r="9"/><circle class="d" cx="46" cy="24" r="9"/><circle class="d" cx="28" cy="14" r="8"/><circle class="d" cx="38" cy="13" r="7"/><circle class="d" cx="32" cy="30" r="6"/>' +
      '<path class="e" d="M18 24L27 24M18 24L24.4 30.4M18 24L18 33M18 24L11.6 30.4M18 24L9 24M18 24L11.6 17.6M18 24L18 15M18 24L24.4 17.6M46 24L55 24M46 24L52.4 30.4M46 24L46 33M46 24L39.6 30.4M46 24L37 24M46 24L39.6 17.6M46 24L46 15M46 24L52.4 17.6M28 14L36 14M28 14L33.7 19.7M28 14L28 22M28 14L22.3 19.7M28 14L20 14M28 14L22.3 8.3M28 14L28 6M28 14L33.7 8.3M38 13L45 13M38 13L42.9 17.9M38 13L38 20M38 13L33.1 17.9M38 13L31 13M38 13L33.1 8.1M38 13L38 6M38 13L42.9 8.1M32 30L38 30M32 30L36.2 34.2M32 30L32 36M32 30L27.8 34.2M32 30L26 30M32 30L27.8 25.8M32 30L32 24M32 30L36.2 25.8"/>'],
    munt: ["--a:#6cbf5a",
      '<path class="s" d="M32 60V14"/>' +
      '<path class="a" d="M32 46A3.3 3.3 0 0 1 31.3 40.5A2.1 2.1 0 0 1 29.7 37.4A1.6 1.6 0 0 1 27.5 35.8A1.6 1.6 0 0 1 24.8 35.7A1.9 1.9 0 0 1 21.8 36.5A2.2 2.2 0 0 1 18.5 38A2.3 2.3 0 0 1 15.1 39.8A2.3 2.3 0 0 1 16.5 43.4A2.2 2.2 0 0 1 18.1 46.7A1.9 1.9 0 0 1 19.9 49.3A1.6 1.6 0 0 1 22 50.9A1.6 1.6 0 0 1 24.7 51.1A2.1 2.1 0 0 1 27.9 49.7A3.3 3.3 0 0 1 32 46z"/><path class="e" d="M29.5 45.1L18.5 41.1"/><path class="a" d="M32 46A3.3 3.3 0 0 1 36.1 49.7A2.1 2.1 0 0 1 39.3 51.1A1.6 1.6 0 0 1 42 50.9A1.6 1.6 0 0 1 44.1 49.3A1.9 1.9 0 0 1 45.9 46.7A2.2 2.2 0 0 1 47.5 43.4A2.3 2.3 0 0 1 48.9 39.8A2.3 2.3 0 0 1 45.5 38A2.2 2.2 0 0 1 42.2 36.5A1.9 1.9 0 0 1 39.2 35.7A1.6 1.6 0 0 1 36.5 35.8A1.6 1.6 0 0 1 34.3 37.4A2.1 2.1 0 0 1 32.7 40.5A3.3 3.3 0 0 1 32 46z"/><path class="e" d="M34.5 45.1L45.5 41.1"/><path class="a" d="M32 32A2.9 2.9 0 0 1 32.3 27.2A1.8 1.8 0 0 1 31.5 24.3A1.3 1.3 0 0 1 29.9 22.7A1.3 1.3 0 0 1 27.7 22.2A1.6 1.6 0 0 1 25.1 22.5A1.9 1.9 0 0 1 22.1 23.4A2 2 0 0 1 19 24.5A2 2 0 0 1 19.6 27.7A1.9 1.9 0 0 1 20.4 30.7A1.6 1.6 0 0 1 21.4 33.2A1.3 1.3 0 0 1 22.9 34.8A1.3 1.3 0 0 1 25.1 35.4A1.8 1.8 0 0 1 28 34.7A2.9 2.9 0 0 1 32 32z"/><path class="e" d="M30.1 30.9L21.6 26"/><path class="a" d="M32 32A2.9 2.9 0 0 1 36 34.7A1.8 1.8 0 0 1 38.9 35.4A1.3 1.3 0 0 1 41.1 34.8A1.3 1.3 0 0 1 42.6 33.2A1.6 1.6 0 0 1 43.6 30.7A1.9 1.9 0 0 1 44.4 27.7A2 2 0 0 1 45 24.5A2 2 0 0 1 41.9 23.4A1.9 1.9 0 0 1 38.9 22.5A1.6 1.6 0 0 1 36.3 22.2A1.3 1.3 0 0 1 34.1 22.7A1.3 1.3 0 0 1 32.5 24.3A1.8 1.8 0 0 1 31.7 27.2A2.9 2.9 0 0 1 32 32z"/><path class="e" d="M33.9 30.9L42.4 26"/><path class="a" d="M32 20A2.4 2.4 0 0 1 34 16.5A1.5 1.5 0 0 1 34.5 14A1.1 1.1 0 0 1 34 12.3A1.1 1.1 0 0 1 32.5 11.3A1.3 1.3 0 0 1 30.4 10.7A1.5 1.5 0 0 1 27.9 10.3A1.6 1.6 0 0 1 25.1 10.2A1.6 1.6 0 0 1 24.3 12.8A1.5 1.5 0 0 1 23.8 15.3A1.3 1.3 0 0 1 23.6 17.5A1.1 1.1 0 0 1 24.1 19.2A1.1 1.1 0 0 1 25.5 20.3A1.5 1.5 0 0 1 28 20.7A2.4 2.4 0 0 1 32 20z"/><path class="e" d="M31 18.5L26.5 12.1"/><path class="a" d="M32 20A2.4 2.4 0 0 1 36 20.7A1.5 1.5 0 0 1 38.5 20.3A1.1 1.1 0 0 1 39.9 19.2A1.1 1.1 0 0 1 40.4 17.5A1.3 1.3 0 0 1 40.2 15.3A1.5 1.5 0 0 1 39.7 12.8A1.6 1.6 0 0 1 38.9 10.2A1.6 1.6 0 0 1 36.1 10.3A1.5 1.5 0 0 1 33.6 10.7A1.3 1.3 0 0 1 31.5 11.3A1.1 1.1 0 0 1 30 12.3A1.1 1.1 0 0 1 29.5 14A1.5 1.5 0 0 1 30 16.5A2.4 2.4 0 0 1 32 20z"/><path class="e" d="M33 18.5L37.5 12.1"/>'],
    tijm: ["--a:#7f9a6a;--s:#7a5a3a",
      '<path class="s" d="M30 60C28 46 18 30 12 14"/><ellipse class="a" cx="23.2" cy="46.9" rx="3" ry="2"/><ellipse class="a" cx="29.6" cy="46.9" rx="3" ry="2"/><ellipse class="a" cx="19.3" cy="37.8" rx="3" ry="2"/><ellipse class="a" cx="25.7" cy="37.8" rx="3" ry="2"/><ellipse class="a" cx="15" cy="28.3" rx="3" ry="2"/><ellipse class="a" cx="21.4" cy="28.3" rx="3" ry="2"/><ellipse class="a" cx="10.7" cy="18.8" rx="3" ry="2"/><ellipse class="a" cx="17.1" cy="18.8" rx="3" ry="2"/>' +
      '<path class="s" d="M32 60C34 44 34 26 36 8"/><ellipse class="a" cx="30.2" cy="45.1" rx="3" ry="2"/><ellipse class="a" cx="36.6" cy="45.1" rx="3" ry="2"/><ellipse class="a" cx="30.8" cy="34.8" rx="3" ry="2"/><ellipse class="a" cx="37.2" cy="34.8" rx="3" ry="2"/><ellipse class="a" cx="31.4" cy="24.1" rx="3" ry="2"/><ellipse class="a" cx="37.8" cy="24.1" rx="3" ry="2"/><ellipse class="a" cx="32.3" cy="13.4" rx="3" ry="2"/><ellipse class="a" cx="38.7" cy="13.4" rx="3" ry="2"/>' +
      '<path class="s" d="M34 60C38 48 46 34 54 22"/><ellipse class="a" cx="35.4" cy="48.8" rx="3" ry="2"/><ellipse class="a" cx="41.8" cy="48.8" rx="3" ry="2"/><ellipse class="a" cx="39.3" cy="41" rx="3" ry="2"/><ellipse class="a" cx="45.7" cy="41" rx="3" ry="2"/><ellipse class="a" cx="43.7" cy="33.2" rx="3" ry="2"/><ellipse class="a" cx="50.1" cy="33.2" rx="3" ry="2"/><ellipse class="a" cx="48.4" cy="25.7" rx="3" ry="2"/><ellipse class="a" cx="54.8" cy="25.7" rx="3" ry="2"/>'],
    rozemarijn: ["--a:#5f8a6a",
      '<g transform="translate(32 33) scale(0.9) translate(-32 -32)"><path class="s" d="M20 60C21 42 22 26 24 8"/><path class="a" d="M20.9 45.3C18.5 42.4 14.2 41.2 11.2 42.7C13 45.4 17.4 46.6 20.9 45.3z"/><path class="a" d="M20.9 45.3C24.3 46.6 28.7 45.4 30.5 42.7C27.5 41.2 23.2 42.4 20.9 45.3z"/><path class="a" d="M21.4 37.1C19.1 34.2 14.7 33 11.7 34.5C13.6 37.2 17.9 38.4 21.4 37.1z"/><path class="a" d="M21.4 37.1C24.9 38.4 29.2 37.2 31.1 34.5C28.1 33 23.7 34.2 21.4 37.1z"/><path class="a" d="M22 28.9C19.7 26 15.3 24.8 12.4 26.3C14.2 29.1 18.5 30.2 22 28.9z"/><path class="a" d="M22 28.9C25.5 30.2 29.8 29.1 31.7 26.3C28.7 24.8 24.3 26 22 28.9z"/><path class="a" d="M22.7 20.7C20.4 17.8 16 16.6 13.1 18.1C14.9 20.9 19.3 22 22.7 20.7z"/><path class="a" d="M22.7 20.7C26.2 22 30.5 20.9 32.4 18.1C29.4 16.6 25 17.8 22.7 20.7z"/><path class="a" d="M23.5 12.3C21.2 9.4 16.9 8.2 13.9 9.7C15.7 12.5 20.1 13.6 23.5 12.3z"/><path class="a" d="M23.5 12.3C27 13.6 31.4 12.5 33.2 9.7C30.2 8.2 25.9 9.4 23.5 12.3z"/>' +
      '<path class="s" d="M32 60C36 42 42 28 50 12"/><path class="a" d="M35.8 45.7C33.5 42.8 29.2 41.6 26.2 43.1C28 45.9 32.4 47 35.8 45.7z"/><path class="a" d="M35.8 45.7C39.3 47 43.6 45.9 45.5 43.1C42.5 41.6 38.2 42.8 35.8 45.7z"/><path class="a" d="M38.4 38.1C36.1 35.2 31.8 34 28.8 35.5C30.6 38.2 35 39.4 38.4 38.1z"/><path class="a" d="M38.4 38.1C41.9 39.4 46.3 38.2 48.1 35.5C45.1 34 40.8 35.2 38.4 38.1z"/><path class="a" d="M41.4 30.6C39 27.7 34.7 26.6 31.7 28C33.5 30.8 37.9 32 41.4 30.6z"/><path class="a" d="M41.4 30.6C44.8 32 49.2 30.8 51 28C48 26.6 43.7 27.7 41.4 30.6z"/><path class="a" d="M44.6 23.3C42.3 20.4 37.9 19.2 34.9 20.7C36.8 23.4 41.1 24.6 44.6 23.3z"/><path class="a" d="M44.6 23.3C48.1 24.6 52.4 23.4 54.2 20.7C51.3 19.2 46.9 20.4 44.6 23.3z"/><path class="a" d="M48.1 15.8C45.8 12.9 41.4 11.7 38.5 13.2C40.3 16 44.7 17.2 48.1 15.8z"/><path class="a" d="M48.1 15.8C51.6 17.2 55.9 16 57.8 13.2C54.8 11.7 50.4 12.9 48.1 15.8z"/></g>'],
    peren: ["--a:#c8cf4a;--b:#5c9e3a;--d:#e3e88a",
      '<path class="s" d="M32 18c0-4 1-8 4-11"/><path class="b" d="M35 12C40.2 14.9 45.7 12.9 47.2 7.6C42.6 4.4 37.1 6.4 35 12z"/>' +
      '<path class="a" d="M32 16c5 0 7 5 7 10 0 5 4 8 7 12 4 6 3 18-14 18s-18-12-14-18c3-4 7-7 7-12 0-5 2-10 7-10z"/>' +
      '<ellipse class="d" cx="24" cy="44" rx="3" ry="5" transform="rotate(20 24 44)"/>'],
    sinaasappels: ["--a:#f08a24;--c:#fbc56a;--d:#c76a12;--b:#5c9e3a",
      '<circle class="a" cx="24" cy="30" r="17"/><path class="b" d="M26 14C31.4 16.1 36 13.4 36.4 8C31.5 5.6 26.9 8.3 26 14z"/>' +
      '<circle class="d" cx="18" cy="26" r="1"/><circle class="d" cx="28" cy="36" r="1"/><circle class="d" cx="16" cy="36" r="1"/>' +
      '<circle class="a" cx="43" cy="43" r="15"/><circle class="c" cx="43" cy="43" r="11.5"/>' +
      '<path class="e" d="M43 43V32M43 43l9.5-5.5M43 43l9.5 5.5M43 43v11M43 43l-9.5 5.5M43 43l-9.5-5.5"/>'],
    citroenen: ["--a:#f5d63c;--c:#fbeea0;--b:#5c9e3a;--d:#d9b42a",
      '<path class="a" d="M8 34c3-2 4-5 7-8 8-7 22-7 30 0 3 3 4 6 7 8-3 2-4 5-7 8-8 7-22 7-30 0-3-3-4-6-7-8z" transform="rotate(-20 30 34)"/>' +
      '<path class="b" d="M36 20C42.4 21.1 47.3 17.1 46.7 11C40.8 9.4 36 13.5 36 20z"/><circle class="d" cx="22" cy="34" r="1"/><circle class="d" cx="30" cy="40" r="1"/>' +
      '<path class="a" d="M36 58a14 14 0 0 1 22-18z"/><path class="c" d="M38.5 55a10.5 10.5 0 0 1 16.5-13.5z"/><path class="e" d="M47 49l-6-1M47 49l1-6M47 49l4-5"/>'],
    limoenen: ["--a:#6aa83a;--c:#c9e38a;--d:#4f8a2a",
      '<circle class="a" cx="24" cy="28" r="16"/><circle class="d" cx="18" cy="24" r="1"/><circle class="d" cx="28" cy="34" r="1"/><circle class="d" cx="30" cy="22" r="1"/>' +
      '<circle class="a" cx="43" cy="44" r="14"/><circle class="c" cx="43" cy="44" r="10.5"/>' +
      '<path class="e" d="M43 44V34M43 44l8.7-5M43 44l8.7 5M43 44v10M43 44l-8.7 5M43 44l-8.7-5"/>'],
    grapefruit: ["--a:#f2a640;--c:#f58a7a;--d:#fbd0b0",
      '<circle class="a" cx="32" cy="34" r="24"/><circle class="c" cx="32" cy="34" r="19"/>' +
      '<path class="e" d="M32 34V15M32 34l13.4-13.4M32 34h19M32 34l13.4 13.4M32 34v19M32 34l-13.4 13.4M32 34H13M32 34L18.6 20.6"/>' +
      '<circle class="d" cx="32" cy="34" r="3"/>'],
    aardbeien: ["--a:#d9343a;--b:#4f8a3a;--d:#f7d36a",
      '<g transform="translate(22 38) rotate(-15) scale(1)"><path class="a" d="M0 18C-10 14-15 2-14-6c1-6 6-8 14-8s13 2 14 8c1 8-4 20-14 24z"/><path class="b" d="M-11-9l5 1 5-5 2 5 6-3-1 5 6 1c-6 4-17 4-23-4z"/><ellipse class="d" cx="-7" cy="0" rx="1" ry="1.5"/><ellipse class="d" cx="0" cy="-2" rx="1" ry="1.5"/><ellipse class="d" cx="7" cy="0" rx="1" ry="1.5"/><ellipse class="d" cx="-4" cy="7" rx="1" ry="1.5"/><ellipse class="d" cx="4" cy="7" rx="1" ry="1.5"/><ellipse class="d" cx="0" cy="13" rx="1" ry="1.5"/></g>' +
      '<g transform="translate(42 36) rotate(15) scale(0.9)"><path class="a" d="M0 18C-10 14-15 2-14-6c1-6 6-8 14-8s13 2 14 8c1 8-4 20-14 24z"/><path class="b" d="M-11-9l5 1 5-5 2 5 6-3-1 5 6 1c-6 4-17 4-23-4z"/><ellipse class="d" cx="-7" cy="0" rx="1" ry="1.5"/><ellipse class="d" cx="0" cy="-2" rx="1" ry="1.5"/><ellipse class="d" cx="7" cy="0" rx="1" ry="1.5"/><ellipse class="d" cx="-4" cy="7" rx="1" ry="1.5"/><ellipse class="d" cx="4" cy="7" rx="1" ry="1.5"/><ellipse class="d" cx="0" cy="13" rx="1" ry="1.5"/></g>'],
    "blauwe bessen": ["--a:#3d4f8a;--d:#7f8fc0",
      '<circle class="a" cx="20" cy="40" r="10"/><path class="e" d="M17.5 37.5l5 5M22.5 37.5l-5 5"/><circle class="d" cx="15" cy="36" r="1.6"/>' +
      '<circle class="a" cx="42" cy="42" r="10"/><path class="e" d="M39.5 39.5l5 5M44.5 39.5l-5 5"/><circle class="d" cx="37" cy="38" r="1.6"/>' +
      '<circle class="a" cx="31" cy="24" r="10"/><path class="e" d="M28.5 21.5l5 5M33.5 21.5l-5 5"/><circle class="d" cx="26" cy="20" r="1.6"/>'],
    frambozen: ["--a:#d93a5a;--d:#f08aa0",
      '<circle class="a" cx="16" cy="28" r="4"/><circle class="a" cx="22" cy="27" r="4"/><circle class="a" cx="28" cy="28" r="4"/><circle class="a" cx="13" cy="34" r="4"/><circle class="a" cx="19" cy="33" r="4"/><circle class="a" cx="25" cy="33" r="4"/><circle class="a" cx="31" cy="34" r="4"/><circle class="a" cx="15" cy="40" r="4"/><circle class="a" cx="22" cy="39" r="4"/><circle class="a" cx="29" cy="40" r="4"/><circle class="a" cx="18" cy="46" r="4"/><circle class="a" cx="26" cy="46" r="4"/><circle class="a" cx="22" cy="51" r="4"/>' +
      '<circle class="a" cx="37" cy="26" r="4"/><circle class="a" cx="43" cy="25" r="4"/><circle class="a" cx="49" cy="26" r="4"/><circle class="a" cx="34" cy="32" r="4"/><circle class="a" cx="40" cy="31" r="4"/><circle class="a" cx="46" cy="31" r="4"/><circle class="a" cx="52" cy="32" r="4"/><circle class="a" cx="36" cy="38" r="4"/><circle class="a" cx="43" cy="37" r="4"/><circle class="a" cx="50" cy="38" r="4"/><circle class="a" cx="39" cy="44" r="4"/><circle class="a" cx="47" cy="44" r="4"/><circle class="a" cx="43" cy="49" r="4"/>'],
    kersen: ["--a:#b51f2e;--b:#5c9e3a;--d:#e06070",
      '<path class="s" d="M20 42c2-14 8-24 18-32M44 40c-2-12-4-22-6-30"/><path class="b" d="M38 10C43.7 14.6 50.8 13.3 53.8 7.2C48.9 2.5 41.8 3.8 38 10z"/>' +
      '<circle class="a" cx="20" cy="44" r="10"/><circle class="a" cx="44" cy="44" r="10"/><circle class="d" cx="16" cy="41" r="2.4"/><circle class="d" cx="40" cy="41" r="2.4"/>'],
    "kiwi's": ["--a:#8a6a3e;--c:#7fb53a;--b:#f2f0d0;--d:#2b2118",
      '<g transform="translate(32 32) scale(0.92) translate(-32 -32)"><ellipse class="a" cx="24" cy="28" rx="17" ry="14" transform="rotate(-20 24 28)"/>' +
      '<circle class="a" cx="42" cy="42" r="16"/><circle class="c" cx="42" cy="42" r="12.5"/><ellipse class="b" cx="42" cy="42" rx="4.5" ry="3.5"/>' +
      '<circle class="d" cx="49.5" cy="42" r=".9"/><circle class="d" cx="47.7" cy="46.8" r=".9"/><circle class="d" cx="43.3" cy="49.4" r=".9"/><circle class="d" cx="38.3" cy="48.5" r=".9"/><circle class="d" cx="35" cy="44.6" r=".9"/><circle class="d" cx="35" cy="39.4" r=".9"/><circle class="d" cx="38.3" cy="35.5" r=".9"/><circle class="d" cx="43.3" cy="34.6" r=".9"/><circle class="d" cx="47.7" cy="37.2" r=".9"/></g>'],
    mango: ["--a:#f2b33a;--d:#e0603a;--b:#5c9e3a",
      '<path class="a" d="M14 40c-4-14 6-28 22-30 12-1 20 8 18 20-2 14-14 26-26 26-7 0-12-6-14-16z"/>' +
      '<path class="d" d="M42 13c8 2 12 9 10 18-1 8-6 15-12 19 4-8 6-20 2-37z"/><path class="s" d="M42 12l3-4"/>'],
    ananas: ["--a:#e8b03a;--b:#4f8a3a",
      '<path class="b" d="M32 22l-4-14 4 6 2-9 2 9 5-6-3 14zM26 22l-10-8 5 1-2-6 9 9zM38 22l10-8-5 1 2-6-9 9z"/>' +
      '<ellipse class="a" cx="32" cy="40" rx="14" ry="18"/>' +
      '<path class="e" d="M21 31l18 18M21 40l12 12M24 26l18 18M30 23l13 13M43 31L25 49M43 40L31 52M40 26L22 44M34 23L21 36"/>'],
    meloen: ["--a:#f2a65a;--b:#b9c86a;--d:#f7e3b0",
      '<path class="b" d="M5 26c6 18 20 28 27 28s21-10 27-28z"/>' +
      '<path class="a" d="M10 26c6 14 16 22 22 22s16-8 22-22z"/>' +
      '<ellipse class="d" cx="20" cy="32" rx="1.4" ry="2.4"/><ellipse class="d" cx="26" cy="36" rx="1.4" ry="2.4"/><ellipse class="d" cx="32" cy="38" rx="1.4" ry="2.4"/><ellipse class="d" cx="38" cy="36" rx="1.4" ry="2.4"/><ellipse class="d" cx="44" cy="32" rx="1.4" ry="2.4"/>'],
    pruimen: ["--a:#6a3a7a;--d:#9a6aa8",
      '<g transform="rotate(-10 22 38)"><path class="s" d="M22 24l1-5"/><ellipse class="a" cx="22" cy="38" rx="12" ry="14"/><path class="e" d="M22 25c-4 6-4 18 0 26"/><ellipse class="d" cx="27" cy="34" rx="2" ry="3.5"/></g>' +
      '<g transform="rotate(10 42 34)"><path class="s" d="M42 20l1-5"/><ellipse class="a" cx="42" cy="34" rx="12" ry="14"/><path class="e" d="M42 21c-4 6-4 18 0 26"/><ellipse class="d" cx="47" cy="30" rx="2" ry="3.5"/></g>'],
    nectarines: ["--a:#e0603a;--c:#f2b33a;--d:#f9d27a",
      '<circle class="c" cx="32" cy="36" r="20"/><path class="a" d="M17 49c-8-12-4-27 9-31 10-3 20 2 24 10-12-3-28 6-33 21z"/>' +
      '<path class="e" d="M32 17c-4 10-4 26 0 38"/><ellipse class="d" cx="42" cy="44" rx="3" ry="4.5"/><path class="s" d="M32 17l2-6"/>'],
    granaatappel: ["--a:#c22a3a;--c:#f6dccf;--d:#e2304a",
      '<path class="a" d="M24 14l2-6 3 4 3-5 3 5 3-4 2 6z"/><circle class="a" cx="32" cy="35" r="21"/>' +
      '<path class="c" d="M32 56c-9 0-16-6-17-14 6-3 28-3 34 0-1 8-8 14-17 14z"/>' +
      '<circle class="d" cx="22" cy="46" r="2"/><circle class="d" cx="27" cy="49" r="2"/><circle class="d" cx="32" cy="46" r="2"/><circle class="d" cx="37" cy="49" r="2"/><circle class="d" cx="42" cy="46" r="2"/><circle class="d" cx="25" cy="52" r="2"/><circle class="d" cx="32" cy="52" r="2"/><circle class="d" cx="39" cy="52" r="2"/>'],
    fruitsalade: ["--a:#f2b33a;--b:#f2f0e6;--c:#7fb53a;--d:#d9343a",
      '<circle class="c" cx="22" cy="30" r="8"/><circle class="b" cx="22" cy="30" r="2.5"/><path class="a" d="M30 28c4-8 14-10 20-4-6 0-14 2-20 4z"/>' +
      '<circle class="d" cx="38" cy="32" r="5"/><circle class="c" cx="46" cy="34" r="4.5"/><path class="d" d="M28 36c-2-5 2-8 5-6 3-2 7 1 5 6z"/>' +
      '<path class="b" d="M6 36h52c0 11-11 20-26 20S6 47 6 36z"/><path class="e" d="M14 44c10 4 26 4 36 0"/>'],
    appelmoes: ["--a:#f2e2a0;--b:#d94b3d;--c:#e8e2cc;--d:#d94b3d",
      '<rect class="a" x="15" y="18" width="34" height="38" rx="6"/><rect class="b" x="17" y="9" width="30" height="10" rx="2"/>' +
      '<rect class="c" x="15" y="30" width="34" height="16"/><path class="d" d="M32 34c-2-1.5-6-1-6 3s3 6 4 6 1-.5 2-.5 1 .5 2 .5 4-2 4-6-4-4.5-6-3z"/>'],
    rozijnen: ["--a:#5a2e3a;--d:#8a5a6a",
      '<g transform="rotate(-20 20 44)"><path class="a" d="M13 44c0-5 4-6 7-6s7 1 7 6-4 6-7 6-7-1-7-6z"/><path class="e" d="M17 41c1 2 1 4 0 6M22 42c-1 2-1 3 0 5"/></g>' +
      '<g transform="rotate(10 34 46)"><path class="a" d="M27 46c0-5 4-6 7-6s7 1 7 6-4 6-7 6-7-1-7-6z"/><path class="e" d="M31 43c1 2 1 4 0 6M36 44c-1 2-1 3 0 5"/></g>' +
      '<g transform="rotate(30 46 42)"><path class="a" d="M39 42c0-5 4-6 7-6s7 1 7 6-4 6-7 6-7-1-7-6z"/><path class="e" d="M43 39c1 2 1 4 0 6M48 40c-1 2-1 3 0 5"/></g>' +
      '<g transform="rotate(40 26 32)"><path class="a" d="M19 32c0-5 4-6 7-6s7 1 7 6-4 6-7 6-7-1-7-6z"/><path class="e" d="M23 29c1 2 1 4 0 6M28 30c-1 2-1 3 0 5"/></g>' +
      '<g transform="rotate(-10 40 32)"><path class="a" d="M33 32c0-5 4-6 7-6s7 1 7 6-4 6-7 6-7-1-7-6z"/><path class="e" d="M37 29c1 2 1 4 0 6M42 30c-1 2-1 3 0 5"/></g>' +
      '<g transform="rotate(20 32 22)"><path class="a" d="M25 22c0-5 4-6 7-6s7 1 7 6-4 6-7 6-7-1-7-6z"/><path class="e" d="M29 19c1 2 1 4 0 6M34 20c-1 2-1 3 0 5"/></g>' +
      '<g transform="rotate(-60 16 32)"><path class="a" d="M9 32c0-5 4-6 7-6s7 1 7 6-4 6-7 6-7-1-7-6z"/><path class="e" d="M13 29c1 2 1 4 0 6M18 30c-1 2-1 3 0 5"/></g>'],
    dadels: ["--a:#7a4022;--d:#b06a3a",
      '<g transform="rotate(-35 22 40)"><ellipse class="a" cx="22" cy="40" rx="14" ry="7"/><ellipse class="d" cx="19" cy="37" rx="6" ry="1.5"/><path class="e" d="M28 43c-3-1-6-1-9 0"/></g>' +
      '<g transform="rotate(-35 34 30)"><ellipse class="a" cx="34" cy="30" rx="14" ry="7"/><ellipse class="d" cx="31" cy="27" rx="6" ry="1.5"/><path class="e" d="M40 33c-3-1-6-1-9 0"/></g>' +
      '<g transform="rotate(-35 44 44)"><ellipse class="a" cx="44" cy="44" rx="14" ry="7"/><ellipse class="d" cx="41" cy="41" rx="6" ry="1.5"/><path class="e" d="M50 47c-3-1-6-1-9 0"/></g>'],
    gehaktballen: ["--a:#8a4a2a;--d:#b8764a",
      '<circle class="a" cx="20" cy="42" r="12"/><ellipse class="d" cx="16" cy="37" rx="4" ry="2.5" transform="rotate(-30 16 37)"/><circle class="d" cx="24" cy="45" r="1.2"/><circle class="d" cx="18" cy="47" r="1.2"/>' +
      '<circle class="a" cx="44" cy="42" r="12"/><ellipse class="d" cx="40" cy="37" rx="4" ry="2.5" transform="rotate(-30 40 37)"/><circle class="d" cx="48" cy="45" r="1.2"/><circle class="d" cx="42" cy="47" r="1.2"/>' +
      '<circle class="a" cx="32" cy="24" r="12"/><ellipse class="d" cx="28" cy="19" rx="4" ry="2.5" transform="rotate(-30 28 19)"/><circle class="d" cx="36" cy="27" r="1.2"/><circle class="d" cx="30" cy="29" r="1.2"/>'],
    hamburgers: ["--a:#d16a6a;--b:#a8424a;--c:#cfd8dc;--d:#ef9c9a",
      '<ellipse class="c" cx="32" cy="46" rx="27" ry="11"/>' +
      '<path class="b" d="M10 38v6c0 5 10 9 22 9s22-4 22-9v-6z"/><ellipse class="a" cx="32" cy="38" rx="22" ry="9"/>' +
      '<path class="b" d="M12 24v6c0 5 9 8 20 8s20-3 20-8v-6z"/><ellipse class="a" cx="32" cy="24" rx="20" ry="8"/>' +
      '<circle class="d" cx="24" cy="22" r="1.5"/><circle class="d" cx="34" cy="20" r="1.5"/><circle class="d" cx="40" cy="25" r="1.5"/><circle class="d" cx="29" cy="27" r="1.5"/>'],
    kipdijfilet: ["--a:#e8a08a;--d:#f6e0a8",
      '<path class="a" d="M6 34c0-8 6-12 12-11 2-5 9-7 13-3 5-3 12-1 13 5 6 0 9 6 7 11-1 6-7 9-12 8-3 5-11 6-15 2-5 3-12 1-14-4-4-1-4-5-4-8z" transform="rotate(-8 32 34)"/>' +
      '<path class="d" d="M14 31c4-2 8-1 10 2-4 1-7 1-10-2zM32 26c4-1 7 1 8 4-4 0-6-1-8-4zM26 40c5 0 8 2 9 5-4 0-7-2-9-5zM42 38c3-1 6 0 7 3-3 0-5-1-7-3z"/>' +
      '<path class="e" d="M20 38c4 2 6 6 6 9M34 32c2 3 6 5 10 5"/>'],
    kippenpoten: ["--a:#f0b890;--c:#f6efe2;--d:#f8d8bc",
      '<g transform="translate(-4 -4)"><path class="c" d="M32 36l9 9c2-1 5 0 5 3 0 2-2 3-3 3 0 2-2 4-4 3-3 0-3-3-2-5l-9-9z"/><path class="a" d="M10 20c4-8 16-10 23 0 5 7 4 14 0 17-4 3-10 2-16-3-6-4-9-9-7-14z"/><ellipse class="d" cx="17" cy="20" rx="4" ry="2" transform="rotate(-30 17 20)"/></g>' +
      '<g transform="translate(10 6)"><path class="c" d="M32 36l9 9c2-1 5 0 5 3 0 2-2 3-3 3 0 2-2 4-4 3-3 0-3-3-2-5l-9-9z"/><path class="a" d="M10 20c4-8 16-10 23 0 5 7 4 14 0 17-4 3-10 2-16-3-6-4-9-9-7-14z"/><ellipse class="d" cx="17" cy="20" rx="4" ry="2" transform="rotate(-30 17 20)"/></g>'],
    kipvleugels: ["--a:#f0b890;--d:#f8d8bc",
      '<g transform="translate(32 30) scale(0.86) translate(-32 -32)"><g transform="translate(0 0)"><path class="a" d="M6 22c6-6 14-8 22-6l6 2c6-2 14-6 22-6 2 0 3 3 1 4l-18 12c-5 3-10 3-14 1L8 28c-3-1-4-4-2-6z"/><path class="e" d="M30 18c1 4 2 8 4 11"/><ellipse class="d" cx="16" cy="20" rx="4" ry="1.6" transform="rotate(-20 16 20)"/></g>' +
      '<g transform="translate(6 20)"><path class="a" d="M6 22c6-6 14-8 22-6l6 2c6-2 14-6 22-6 2 0 3 3 1 4l-18 12c-5 3-10 3-14 1L8 28c-3-1-4-4-2-6z"/><path class="e" d="M30 18c1 4 2 8 4 11"/><ellipse class="d" cx="16" cy="20" rx="4" ry="1.6" transform="rotate(-20 16 20)"/></g></g>'],
    "hele kip": ["--a:#f2c8a2;--c:#f6efe2;--d:#f8dfc4",
      '<path class="a" d="M14 30c-6-4-8-12-4-16 4-3 10 0 12 6l2 8z"/><path class="a" d="M50 30c6-4 8-12 4-16-4-3-10 0-12 6l-2 8z"/>' +
      '<circle class="c" cx="11" cy="12" r="3.5"/><circle class="c" cx="15" cy="10" r="3.5"/><circle class="c" cx="53" cy="12" r="3.5"/><circle class="c" cx="49" cy="10" r="3.5"/>' +
      '<path class="a" d="M32 24c14 0 24 8 24 18s-10 15-24 15S8 52 8 42s10-18 24-18z"/>' +
      '<path class="e" d="M22 32c3 5 3 13 0 18M42 32c-3 5-3 13 0 18"/><ellipse class="d" cx="32" cy="33" rx="8" ry="3"/>'],
    kalkoenfilet: ["--a:#f2bfa6;--c:#f7d8c6",
      '<path class="a" d="M6 30c0-10 12-16 26-16 12 0 22 6 22 14 0 10-12 14-26 16-12 2-22-4-22-14z"/>' +
      '<path class="e" d="M14 26c8-4 18-5 26-3M14 34c8-2 16-3 24-2"/>' +
      '<path class="c" d="M30 44c2-6 10-8 18-7 7 1 11 5 10 10-1 5-7 8-14 8-9 0-15-5-14-11z"/><path class="e" d="M36 46c4-2 10-2 14 0"/>'],
    speklappen: ["--a:#e89a98;--c:#f8efe6;--b:#c27a5a",
      '<g transform="rotate(-8 28 22)"><rect class="b" x="4" y="12" width="48" height="20" rx="3"/><rect class="c" x="4" y="15" width="48" height="17" rx="2"/><rect class="a" x="4" y="19" width="48" height="5"/><rect class="a" x="4" y="27" width="48" height="5" rx="2"/></g>' +
      '<g transform="rotate(-8 36 38)"><rect class="b" x="12" y="28" width="48" height="20" rx="3"/><rect class="c" x="12" y="31" width="48" height="17" rx="2"/><rect class="a" x="12" y="35" width="48" height="5"/><rect class="a" x="12" y="43" width="48" height="5" rx="2"/></g>'],
    spekblokjes: ["--a:#e07f86;--b:#c4606a;--c:#f8efe6",
      '<path class="a" d="M8 30l10 -5l10 5l-10 5z"/><path class="b" d="M8 30l10 5v10l-10 -5z"/><path class="b" d="M28 30l-10 5v10l10 -5z"/><path class="c" d="M8 34l10 5v3l-10-5z"/><path class="c" d="M28 34l-10 5v3l10-5z"/>' +
      '<path class="a" d="M26 38l10 -5l10 5l-10 5z"/><path class="b" d="M26 38l10 5v10l-10 -5z"/><path class="b" d="M46 38l-10 5v10l10 -5z"/><path class="c" d="M26 42l10 5v3l-10-5z"/><path class="c" d="M46 42l-10 5v3l10-5z"/>' +
      '<path class="a" d="M30 22l10 -5l10 5l-10 5z"/><path class="b" d="M30 22l10 5v10l-10 -5z"/><path class="b" d="M50 22l-10 5v10l10 -5z"/><path class="c" d="M30 26l10 5v3l-10-5z"/><path class="c" d="M50 26l-10 5v3l10-5z"/>' +
      '<path class="a" d="M14 46l10 -5l10 5l-10 5z"/><path class="b" d="M14 46l10 5v10l-10 -5z"/><path class="b" d="M34 46l-10 5v10l10 -5z"/><path class="c" d="M14 50l10 5v3l-10-5z"/><path class="c" d="M34 50l-10 5v3l10-5z"/>'],
    ontbijtspek: ["--a:#d9606a;--c:#f8efe6",
      '<g transform="translate(-1 6)"><path class="a" d="M6 22c6-6 12 4 18-2s12 4 18-2 8 2 8 2v8s-2-4-8 2-12-4-18 2-12-4-18 2z"/><path class="c" d="M6 26c6-6 12 4 18-2s12 4 18-2 8 2 8 2v2s-2-4-8 2-12-4-18 2-12-4-18 2z"/></g>' +
      '<g transform="translate(5 22)"><path class="a" d="M6 22c6-6 12 4 18-2s12 4 18-2 8 2 8 2v8s-2-4-8 2-12-4-18 2-12-4-18 2z"/><path class="c" d="M6 26c6-6 12 4 18-2s12 4 18-2 8 2 8 2v2s-2-4-8 2-12-4-18 2-12-4-18 2z"/></g>'],
    varkenshaas: ["--a:#e8a0a0;--d:#f6d6d0",
      '<path class="a" d="M6 40c2-8 12-14 26-16 10-2 20-2 24 2 3 3 1 8-4 10-8 4-20 8-34 10-8 1-13-1-12-6z"/>' +
      '<path class="d" d="M16 36c8-4 18-6 28-7-6 3-18 5-28 7z"/><path class="e" d="M18 42c2-3 2-6 0-8M30 40c2-3 2-7 0-10M42 36c2-3 2-6 0-8"/>'],
    karbonade: ["--a:#e8a0a0;--c:#f8efe6;--d:#f6d6d0",
      '<path class="c" d="M10 28c0-10 10-16 22-16 14 0 24 8 24 20 0 10-8 18-22 18-6 0-10 4-14 6-4 2-8-1-7-5 1-4 2-6 0-9-2-4-3-8-3-14z"/>' +
      '<path class="a" d="M16 29c0-7 7-12 16-12 11 0 19 6 19 15 0 7-6 13-16 13-7 0-12-2-15-6s-4-6-4-10z"/>' +
      '<path class="c" d="M14 52l6-12h5l-4 14z"/><ellipse class="d" cx="36" cy="28" rx="6" ry="3"/>'],
    schnitzels: ["--a:#d99a3e;--d:#b8742a;--b:#f5d63c",
      '<path class="a" d="M6 34c0-12 12-20 26-20 13 0 24 8 24 18 0 11-10 18-24 18-14 0-26-4-26-16z"/>' +
      '<circle class="d" cx="16" cy="28" r="1.4"/><circle class="d" cx="24" cy="22" r="1.4"/><circle class="d" cx="34" cy="20" r="1.4"/><circle class="d" cx="44" cy="26" r="1.4"/><circle class="d" cx="20" cy="38" r="1.4"/><circle class="d" cx="30" cy="32" r="1.4"/><circle class="d" cx="40" cy="36" r="1.4"/><circle class="d" cx="48" cy="32" r="1.4"/><circle class="d" cx="28" cy="42" r="1.4"/>' +
      '<path class="b" d="M40 56a12 12 0 0 1 18-12z"/><path class="e" d="M45 52l7-5"/>'],
    varkensvlees: ["--a:#ec9e9e;--c:#f8efe6;--d:#f6d0cc",
      '<path class="a" d="M8 34c0-8 10-14 24-14s24 6 24 14v8c0 7-10 12-24 12S8 49 8 42z"/>' +
      '<path class="c" d="M8 34c0-8 10-14 24-14s24 6 24 14c0 6-10 10-24 10S8 40 8 34z"/>' +
      '<path class="s" d="M18 22v30M32 20v34M46 22v30"/><ellipse class="d" cx="32" cy="30" rx="12" ry="4"/>'],
    biefstuk: ["--a:#b52f3a;--b:#8a1f2a;--c:#f8efe6;--d:#d9606a",
      '<path class="b" d="M8 34v8c0 8 10 14 24 14s24-6 24-14v-8z"/>' +
      '<path class="a" d="M32 18c14 0 24 7 24 16s-10 16-24 16S8 43 8 34s10-16 24-16z"/>' +
      '<path class="c" d="M44 21c7 2 12 7 12 13 0 4-2 8-6 11-1-8-3-17-6-24z"/>' +
      '<path class="d" d="M18 32c4-3 8-2 10 0-4 1-7 1-10 0zM26 40c4-2 8-1 10 1-4 1-7 1-10-1z"/>'],
    stoofvlees: ["--a:#a8323a;--b:#7a1f28",
      '<path class="a" d="M10 36l9 -4.5l9 4.5l-9 4.5z"/><path class="b" d="M10 36l9 4.5v9l-9 -4.5z"/><path class="b" d="M28 36l-9 4.5v9l9 -4.5z"/>' +
      '<path class="a" d="M28 40l9 -4.5l9 4.5l-9 4.5z"/><path class="b" d="M28 40l9 4.5v9l-9 -4.5z"/><path class="b" d="M46 40l-9 4.5v9l9 -4.5z"/>' +
      '<path class="a" d="M20 20l9 -4.5l9 4.5l-9 4.5z"/><path class="b" d="M20 20l9 4.5v9l-9 -4.5z"/><path class="b" d="M38 20l-9 4.5v9l9 -4.5z"/>' +
      '<path class="a" d="M36 24l9 -4.5l9 4.5l-9 4.5z"/><path class="b" d="M36 24l9 4.5v9l-9 -4.5z"/><path class="b" d="M54 24l-9 4.5v9l9 -4.5z"/>'],
    "rundvlees reepjes": ["--a:#b53a3e;--d:#d9707a",
      '<g transform="rotate(-30 32 58)"><path class="a" d="M29 12c2-2 5-1 6 1l1 36c0 2-8 2-8 0z"/><path class="d" d="M31 18l1 10"/></g><g transform="rotate(-15 32 58)"><path class="a" d="M29 18c2-2 5-1 6 1l1 36c0 2-8 2-8 0z"/><path class="d" d="M31 24l1 10"/></g><g transform="rotate(0 32 58)"><path class="a" d="M29 12c2-2 5-1 6 1l1 36c0 2-8 2-8 0z"/><path class="d" d="M31 18l1 10"/></g><g transform="rotate(15 32 58)"><path class="a" d="M29 18c2-2 5-1 6 1l1 36c0 2-8 2-8 0z"/><path class="d" d="M31 24l1 10"/></g><g transform="rotate(30 32 58)"><path class="a" d="M29 12c2-2 5-1 6 1l1 36c0 2-8 2-8 0z"/><path class="d" d="M31 18l1 10"/></g>'],
    rookworst: ["--a:#a8432e;--d:#d9784a",
      '<path class="a" d="M10 42C6 26 16 10 32 10s26 16 22 32c-1 4-8 4-9 0 2-10-4-20-13-20s-15 10-13 20c-1 4-8 4-9 0z"/>' +
      '<path class="s" d="M14 46l-2 6M50 46l2 6"/><path class="d" d="M18 26c3-6 8-9 14-10"/>'],
    braadworst: ["--a:#e6b88a;--d:#f4d8b0",
      '<g transform="translate(0 0)"><path class="a" d="M10 26c0-4 4-6 8-6h28c4 0 8 2 8 6s-4 6-8 6H18c-4 0-8-2-8-6z"/><path class="s" d="M10 26H6M54 26h4"/><path class="d" d="M20 23h22"/></g>' +
      '<g transform="translate(0 16)"><path class="a" d="M10 26c0-4 4-6 8-6h28c4 0 8 2 8 6s-4 6-8 6H18c-4 0-8-2-8-6z"/><path class="s" d="M10 26H6M54 26h4"/><path class="d" d="M20 23h22"/></g>'],
    shoarma: ["--a:#b8743a;--b:#d9a05a;--c:#cfd8dc",
      '<rect class="c" x="30" y="4" width="4" height="56" rx="2"/>' +
      '<path class="a" d="M16 12h32l-6 40H22z"/>' +
      '<path class="e" d="M17 18h30M18 26h28M19 34h26M20 42h24"/>' +
      '<path class="b" d="M44 20l4 2-5 6zM45 34l3 2-5 5zM18 28l-3 3 5 3z"/>'],
    lamsvlees: ["--a:#c8505a;--c:#f8efe6;--d:#e48a8a",
      '<g transform="rotate(25 20 34)"><rect class="c" x="17" y="8" width="6" height="28" rx="3"/></g><g transform="rotate(25 31 34)"><rect class="c" x="28" y="8" width="6" height="28" rx="3"/></g><g transform="rotate(25 42 34)"><rect class="c" x="39" y="8" width="6" height="28" rx="3"/></g>' +
      '<path class="a" d="M8 44c0-8 6-14 14-14h22c7 0 12 5 12 11v4c0 7-5 11-12 11H20c-7 0-12-4-12-12z"/>' +
      '<path class="c" d="M9 40c1-6 6-10 13-10h22c7 0 12 4 12 10-4-3-8-4-12-4H22c-6 0-10 1-13 4z"/><ellipse class="d" cx="22" cy="46" rx="6" ry="3"/>'],
    kabeljauw: ["--a:#f6f1e6;--b:#a8a090",
      '<path class="b" d="M6 38c2 8 12 12 24 12 12 0 22-6 28-14l-2-2c-8 8-16 12-26 12-10 0-18-4-24-8z"/>' +
      '<path class="a" d="M6 34c0-12 12-18 26-18 12 0 20 6 26 16-6 8-14 14-28 14-14 0-24-4-24-12z"/>' +
      '<path class="e" d="M12 32c6-5 12-5 18 0M22 40c6-5 12-5 18 0M28 25c6-4 12-4 18 0M38 34c5-4 10-4 14 0"/>'],
    pangasius: ["--a:#8a929a;--b:#c9ced2;--d:#2b2118",
      '<path class="b" d="M44 32l13-10c1 0 2 1 2 2l-4 8 4 8c0 1-1 2-2 2z"/><path class="a" d="M5 32c6-10 18-14 30-12 6 1 10 5 12 12-2 7-6 11-12 12-12 2-24-2-30-12z"/><circle class="d" cx="13" cy="30" r="1.8"/>' +
      '<path class="b" d="M14 38c6 4 14 5 22 4-6-1-14-2-22-4z"/><path class="s" d="M9 34c-3 2-5 6-6 10M10 35c0 4-1 8-2 11"/>'],
    koolvis: ["--a:#4e5a5a;--b:#cdd3d0;--d:#f2f0e6",
      '<path class="a" d="M44 32l13-10c1 0 2 1 2 2l-4 8 4 8c0 1-1 2-2 2z"/><path class="a" d="M5 32c6-10 18-14 30-12 6 1 10 5 12 12-2 7-6 11-12 12-12 2-24-2-30-12z"/><circle class="d" cx="13" cy="30" r="1.8"/>' +
      '<path class="b" d="M8 34c8 6 18 9 28 9 5 0 9-3 11-7-12 2-26 2-39-2z"/><path class="e" d="M16 33c8 1 18 1 28-1"/>'],
    tilapia: ["--a:#b88a8a;--b:#d9b0aa;--d:#2b2118",
      '<path class="b" d="M16 22c4-8 18-10 26-4l-2 4z"/>' +
      '<path class="b" d="M44 32l13-10c1 0 2 1 2 2l-4 8 4 8c0 1-1 2-2 2z"/><path class="a" d="M5 32c6-10 18-14 30-12 6 1 10 5 12 12-2 7-6 11-12 12-12 2-24-2-30-12z"/><circle class="d" cx="13" cy="30" r="1.8"/>' +
      '<path class="e" d="M22 22v20M30 21v22M38 23v18"/>'],
    vissticks: ["--a:#e8a23a;--d:#c47a1a",
      '<rect class="a" x="10" y="18" width="30" height="10" rx="2"/><circle class="d" cx="16" cy="22.5" r="1.1"/><circle class="d" cx="22" cy="22.5" r="1.1"/><circle class="d" cx="28" cy="22.5" r="1.1"/><circle class="d" cx="34" cy="22.5" r="1.1"/>' +
      '<rect class="a" x="18" y="30" width="30" height="10" rx="2"/><circle class="d" cx="24" cy="34.5" r="1.1"/><circle class="d" cx="30" cy="34.5" r="1.1"/><circle class="d" cx="36" cy="34.5" r="1.1"/><circle class="d" cx="42" cy="34.5" r="1.1"/>' +
      '<rect class="a" x="26" y="42" width="30" height="10" rx="2"/><circle class="d" cx="32" cy="46.5" r="1.1"/><circle class="d" cx="38" cy="46.5" r="1.1"/><circle class="d" cx="44" cy="46.5" r="1.1"/><circle class="d" cx="50" cy="46.5" r="1.1"/>'],
    garnalen: ["--a:#f08a6a;--b:#e05a3a;--d:#f8c0a8",
      '<path class="b" d="M44 46l10 6-2-10z"/>' +
      '<path class="a" d="M14 30c0-12 10-20 22-20s20 8 20 18c0 8-5 14-12 18-3-5-3-11 2-14 1-6-4-10-10-10-8 0-12 6-12 12 0 3 1 5 3 7-5 3-13 1-13-11z"/>' +
      '<path class="e" d="M22 20l4 5M32 14v6M42 16l-3 6M50 26h-6"/><path class="s" d="M14 30c-4 2-8 2-10 0M16 24c-4-1-7-4-8-7"/><circle class="d" cx="18" cy="26" r="1.6"/>'],
    mosselen: ["--a:#2f3550;--b:#f2a65a;--d:#5a6290;--c:#e8e2d6",
      '<path class="a" d="M8 44c2-14 12-26 24-30 6-2 10 2 8 8-4 12-14 22-26 26-4 1-6-1-6-4z"/><path class="d" d="M18 38c4-8 10-14 16-18-2 6-8 14-16 18z"/>' +
      '<path class="c" d="M28 54c4-12 14-22 26-24 4 0 6 3 4 7-4 10-14 18-26 20-3 1-5-1-4-3z"/><path class="b" d="M32 51c4-8 12-14 21-16-3 8-12 14-21 16z"/>'],
    haring: ["--a:#9fb4c4;--b:#5a7a94;--d:#2b2118;--c:#f6f2e8",
      '<g transform="translate(32 31) scale(0.9) translate(-32 -32)"><g transform="rotate(-30 32 32)"><path class="b" d="M44 32l13-10c1 0 2 1 2 2l-4 8 4 8c0 1-1 2-2 2z"/><path class="a" d="M5 32c6-10 18-14 30-12 6 1 10 5 12 12-2 7-6 11-12 12-12 2-24-2-30-12z"/><circle class="d" cx="13" cy="30" r="1.8"/><path class="b" d="M10 28c8-6 20-8 32-4-12 0-22 2-32 4z"/></g>' +
      '<rect class="c" x="16" y="50" width="5" height="5" rx="1"/><rect class="c" x="24" y="54" width="5" height="5" rx="1"/><rect class="c" x="30" y="48" width="5" height="5" rx="1"/><rect class="c" x="40" y="54" width="5" height="5" rx="1"/><rect class="c" x="46" y="48" width="5" height="5" rx="1"/></g>'],
    makreel: ["--a:#4f8a8a;--b:#dfe6e6;--d:#2b2118",
      '<path class="a" d="M44 32l13-10c1 0 2 1 2 2l-4 8 4 8c0 1-1 2-2 2z"/><path class="a" d="M5 32c6-10 18-14 30-12 6 1 10 5 12 12-2 7-6 11-12 12-12 2-24-2-30-12z"/><circle class="d" cx="13" cy="30" r="1.8"/>' +
      '<path class="b" d="M8 34c8 6 18 9 28 9 5 0 9-3 11-7-12 2-26 2-39-2z"/><path class="e" d="M18 22c2 3 0 6 2 9M24 21c2 3 0 6 2 9M30 20c2 3 0 6 2 9M36 21c2 3 0 6 2 9M42 24c1 2 0 4 1 6"/>'],
    tonijn: ["--a:#3a6fb8;--c:#b9bfc4;--b:#f2b0a0;--d:#e88a7a",
      '<path class="c" d="M8 30v14c0 5 11 9 24 9s24-4 24-9V30z"/><rect class="a" x="8" y="34" width="48" height="10"/>' +
      '<ellipse class="c" cx="32" cy="30" rx="24" ry="9"/><ellipse class="b" cx="32" cy="30" rx="18" ry="6"/>' +
      '<path class="e" d="M22 28c4 2 8 2 12 0M30 32c4 1 8 0 10-2"/>'],
    sardines: ["--a:#c9ced2;--c:#b9bfc4;--b:#d9a05a;--d:#8a9aa8",
      '<rect class="c" x="6" y="22" width="44" height="30" rx="8"/>' +
      '<rect class="b" x="9" y="25" width="38" height="24" rx="6"/>' +
      '<path class="a" d="M12 29c6-4 22-4 30 0l4-3v8l-4-3c-8 4-24 4-30 0z" transform="translate(0 -1)"/><path class="a" d="M12 37c6-4 22-4 30 0l4-3v8l-4-3c-8 4-24 4-30 0z" transform="translate(0 -1)"/><path class="a" d="M12 45c6-4 22-4 30 0l4-3v8l-4-3c-8 4-24 4-30 0z" transform="translate(0 -1)"/>' +
      '<path class="c" d="M44 22c4-10 12-14 16-12l-2 6c-4 0-8 4-10 8z"/><circle class="c" cx="56" cy="13" r="3"/>'],
    tofu: ["--a:#f4efdc;--b:#e3dcc4;--c:#d8d0b4",
      '<path class="a" d="M8 30l20-10 26 8-20 10z"/><path class="b" d="M8 30l26 8v18L8 48z"/><path class="c" d="M34 38l20-10v18L34 56z"/>'],
    tempeh: ["--a:#d8b874;--b:#b8944a;--d:#f4e6c0",
      '<path class="b" d="M8 32l22-10 26 8v10L32 50 8 42z"/><path class="a" d="M8 32l22-10 26 8-24 10z"/>' +
      '<ellipse class="d" cx="16" cy="31" rx="2.2" ry="1.4"/><ellipse class="d" cx="22" cy="29" rx="2.2" ry="1.4"/><ellipse class="d" cx="28" cy="27" rx="2.2" ry="1.4"/><ellipse class="d" cx="34" cy="25" rx="2.2" ry="1.4"/><ellipse class="d" cx="22" cy="34" rx="2.2" ry="1.4"/><ellipse class="d" cx="28" cy="32" rx="2.2" ry="1.4"/><ellipse class="d" cx="34" cy="30" rx="2.2" ry="1.4"/><ellipse class="d" cx="40" cy="28" rx="2.2" ry="1.4"/><ellipse class="d" cx="28" cy="37" rx="2.2" ry="1.4"/><ellipse class="d" cx="34" cy="35" rx="2.2" ry="1.4"/><ellipse class="d" cx="40" cy="33" rx="2.2" ry="1.4"/><ellipse class="d" cx="46" cy="31" rx="2.2" ry="1.4"/><ellipse class="d" cx="20" cy="26" rx="2.2" ry="1.4"/><ellipse class="d" cx="26" cy="24" rx="2.2" ry="1.4"/>' +
      '<path class="e" d="M12 40l18 6M36 44l16-8"/>'],
    "vegetarisch gehakt": ["--a:#a8744a;--b:#9cc768;--c:#5c9e3a;--d:#d9a87a",
      '<rect class="b" x="7" y="33" width="50" height="19" rx="7"/>' +
      '<path class="a" d="M11 37c-2-7 4-12 10-10 1-6 10-8 13-2 3-5 12-3 13 3 6-1 10 5 7 9z"/>' +
      '<circle class="d" cx="20" cy="31" r="1.7"/><circle class="d" cx="30" cy="28" r="1.7"/><circle class="d" cx="25" cy="34" r="1.5"/><circle class="d" cx="45" cy="34" r="1.5"/>' +
      '<path class="c" d="M36 24C44.1 23.7 49.3 17.5 47.6 10.2C40.1 9.8 34.9 16 36 24z"/>'],
    karnemelk: ["--a:#f7f4ec;--b:#e8c84a;--c:#e2dccd;--d:#f7f4ec",
      '<rect class="c" x="26" y="8" width="12" height="5" rx="1"/><path class="c" d="M20 23l6-10h12l6 10z"/><rect class="a" x="20" y="23" width="24" height="33" rx="2"/>' +
      '<rect class="b" x="20" y="35" width="24" height="12"/><circle class="d" cx="27" cy="41" r="2"/><circle class="d" cx="33" cy="40" r="1.5"/><circle class="d" cx="38" cy="42" r="2"/>'],
    chocolademelk: ["--a:#7a4a2e;--b:#f2e6d0;--c:#5c3420;--d:#7a4a2e",
      '<rect class="c" x="26" y="8" width="12" height="5" rx="1"/><path class="c" d="M20 23l6-10h12l6 10z"/><rect class="a" x="20" y="23" width="24" height="33" rx="2"/>' +
      '<rect class="b" x="20" y="35" width="24" height="12"/><path class="d" d="M28 38h8v6h-8z"/><path class="e" d="M32 38v6M28 41h8"/>'],
    koffiemelk: ["--a:#f7f4ec;--b:#8a5a32;--c:#d9b98a;--d:#5c3420",
      '<rect class="b" x="25" y="9" width="14" height="7" rx="2"/><path class="a" d="M27 16h10v5c6 3 9 7 9 13v18c0 3-2 5-5 5H23c-3 0-5-2-5-5V34c0-6 3-10 9-13z"/>' +
      '<rect class="c" x="18" y="36" width="28" height="12"/><ellipse class="d" cx="32" cy="42" rx="4" ry="3"/><path class="e" d="M32 39.5c-1 1.5-1 3.5 0 5"/>'],
    havermelk: ["--a:#f3ead2;--b:#d9b45a;--c:#c8a24a",
      '<rect class="c" x="34" y="7" width="7" height="5" rx="1"/><path class="c" d="M19 14l2-4h22l2 4z"/><rect class="a" x="19" y="14" width="26" height="42" rx="2"/>' +
      '<path class="s" d="M32 52V28"/>' +
      '<path class="b" d="M32 30C32.4 26.6 30.1 23.8 26.9 23.9C26.2 27 28.5 29.8 32 30z"/><path class="b" d="M32 30C35.5 29.8 37.8 27 37.1 23.9C33.9 23.8 31.6 26.6 32 30z"/><path class="b" d="M32 36C32.4 32.6 30.1 29.8 26.9 29.9C26.2 33 28.5 35.8 32 36z"/><path class="b" d="M32 36C35.5 35.8 37.8 33 37.1 29.9C33.9 29.8 31.6 32.6 32 36z"/><path class="b" d="M32 42C32.4 38.6 30.1 35.8 26.9 35.9C26.2 39 28.5 41.8 32 42z"/><path class="b" d="M32 42C35.5 41.8 37.8 39 37.1 35.9C33.9 35.8 31.6 38.6 32 42z"/><path class="b" d="M32 26C34.5 23.9 34.5 20.8 32 19C29.5 20.8 29.5 23.9 32 26z"/>'],
    sojamelk: ["--a:#eef3dc;--b:#7fae4a;--c:#5c9e3a;--d:#d9e8a8",
      '<rect class="c" x="34" y="7" width="7" height="5" rx="1"/><path class="c" d="M19 14l2-4h22l2 4z"/><rect class="a" x="19" y="14" width="26" height="42" rx="2"/>' +
      '<path class="b" d="M22 46c4-10 12-16 22-18 0 8-8 16-20 20z"/><circle class="d" cx="29" cy="41" r="2.2"/><circle class="d" cx="34" cy="37" r="2.2"/><circle class="d" cx="39" cy="33" r="2.2"/>'],
    amandelmelk: ["--a:#f5ece0;--b:#b07a4a;--c:#8a5a32",
      '<rect class="c" x="34" y="7" width="7" height="5" rx="1"/><path class="c" d="M19 14l2-4h22l2 4z"/><rect class="a" x="19" y="14" width="26" height="42" rx="2"/>' +
      '<path class="b" d="M32 24c6 4 9 11 7 18-1 4-4 6-7 6s-6-2-7-6c-2-7 1-14 7-18z"/><path class="e" d="M30 32c-1 3-1 6 0 9M34 30c1 4 1 7 0 10"/>'],
    kokosmelk: ["--a:#6a4a32;--c:#f7f4ec;--b:#8a6a4a;--d:#3a2a1e",
      '<circle class="b" cx="40" cy="24" r="16"/><path class="e" d="M30 14l4 3M44 10l-1 4M52 20l-4 1M48 32l-3-2"/><circle class="d" cx="36" cy="22" r="1.8"/><circle class="d" cx="42" cy="22" r="1.8"/><circle class="d" cx="39" cy="27" r="1.8"/>' +
      '<path class="a" d="M6 36c0 12 10 20 22 20s22-8 22-20z"/><path class="c" d="M10 36c0 9 8 16 18 16s18-7 18-16z"/>' +
      '<ellipse class="c" cx="28" cy="36" rx="22" ry="5"/>'],
    yoghurt: ["--a:#f7f4ec;--b:#8ab0d8;--c:#e2e6ea;--d:#f7f4ec",
      '<path class="a" d="M24 22c0-6 4-10 8-10 0 3 3 3 5 4 3 1 4 4 3 6z"/>' +
      '<path class="a" d="M16 26h32l-3 30H19z"/><rect class="b" x="17" y="36.5" width="30" height="10.5"/><rect class="c" x="14" y="22" width="36" height="5" rx="2"/>' +
      '<path class="e" d="M26 18c3 0 6-1 8-3"/>'],
    kwark: ["--a:#f7f4ec;--b:#e8a04a;--c:#e2e6ea",
      '<path class="a" d="M14 32c0-8 8-12 14-10 4-6 14-4 16 2 6 0 8 4 8 8z"/>' +
      '<path class="a" d="M10 36h44l-3 20H13z"/><rect class="b" x="11" y="43" width="42" height="7"/><rect class="c" x="8" y="32" width="48" height="5" rx="2"/>'],
    vla: ["--a:#f5d65a;--b:#f2efe6;--c:#c9ced2;--d:#8a5a32",
      '<path class="c" d="M36 32l16-22c1-2 4 0 3 2L41 34z"/>' +
      '<path class="a" d="M10 37c0-6 10-10 22-10s22 4 22 10z"/><path class="d" d="M16 34c4-3 10-4 14-2 4 2 10 2 14 0-1 3-8 6-14 5-5-1-10-1-14-3z"/>' +
      '<path class="b" d="M6 36h52c0 11-11 20-26 20S6 47 6 36z"/>'],
    slagroom: ["--a:#fbf8f0;--b:#7fa6c4",
      '<path class="a" d="M14 44c-4-4-2-10 4-10-2-6 4-10 9-8 0-6 6-10 11-8 4 1 4 5 2 8 6 0 8 6 4 9 6 1 8 6 4 9z"/>' +
      '<path class="e" d="M20 38c4 2 10 2 16 0M24 30c4 2 8 2 12 0"/>' +
      '<path class="b" d="M8 44h48c0 8-10 13-24 13S8 52 8 44z"/>'],
    kookroom: ["--a:#f7f0dc;--b:#d9a05a;--c:#e2dccd;--d:#f7f0dc",
      '<rect class="c" x="34" y="15" width="6" height="4" rx="1"/><path class="c" d="M18 22l2-4h24l2 4z"/><rect class="a" x="18" y="22" width="28" height="34" rx="2"/>' +
      '<rect class="b" x="18" y="32" width="28" height="14"/><path class="d" d="M32 34c3 4 4 6 4 8a4 4 0 0 1-8 0c0-2 1-4 4-8z"/>'],
    "crème fraîche": ["--a:#f7f4ec;--b:#6fae6a;--c:#e2e6ea",
      '<path class="a" d="M20 30c0-6 6-9 12-8 4-4 12-2 12 4 2 1 2 3 2 4z"/>' +
      '<path class="a" d="M14 32h36l-3 22H17z"/><rect class="b" x="15" y="39.7" width="34" height="7.699999999999999"/><rect class="c" x="12" y="28" width="40" height="5" rx="2"/>' +
      '<path class="s" d="M44 22l12-14"/><ellipse class="c" cx="44" cy="24" rx="4" ry="6" transform="rotate(40 44 24)"/>'],
    "zure room": ["--a:#f7f4ec;--b:#7ab0d0;--c:#f2f4f6;--d:#f5d63c",
      '<path class="a" d="M14 26h36l-3 28H17z"/><rect class="b" x="15" y="35.8" width="34" height="9.799999999999999"/><ellipse class="c" cx="32" cy="24" rx="20" ry="5"/>' +
      '<path class="d" d="M32 40l7 0a7 7 0 0 0-7-7z"/><path class="e" d="M32 40l7-0M32 40l5-5"/>'],
    roomboter: ["--a:#f8e08a;--b:#d9b04a;--c:#f6f1e4",
      '<path class="b" d="M6 34l14-10h30l8 8v10l-14 10H14L6 46z"/>' +
      '<path class="a" d="M14 34l12-8h26l-12 8z"/><path class="a" d="M14 34h26v14H14z"/><path class="a" d="M40 34l12-8v14l-12 8z"/>' +
      '<path class="c" d="M6 34l8 0v12l-8 0z"/>'],
    margarine: ["--a:#f5e07a;--b:#7fb24e;--c:#f7f4ec",
      '<path class="b" d="M12 22c-2-6 2-10 8-10h24c6 0 10 4 8 10z" transform="rotate(-14 20 22)"/>' +
      '<path class="c" d="M8 30h48l-4 24H12z"/><ellipse class="a" cx="32" cy="30" rx="24" ry="5"/>' +
      '<path class="e" d="M18 30c4-2 10-2 14 0s10 2 14 0"/>'],
    "bak- en braadboter": ["--a:#3a3a3e;--b:#f5d65a;--d:#fbe9a0",
      '<path class="a" d="M42 40l16-4 1 4-16 5z"/><ellipse class="a" cx="26" cy="40" rx="22" ry="12"/>' +
      '<path class="b" d="M10 40c0-4 6-6 12-6 4 0 4-3 8-3 6 0 12 4 12 9 0 4-8 6-16 6s-16-2-16-6z"/>' +
      '<path class="b" d="M20 36l6-8h10l-2 9z"/><ellipse class="d" cx="18" cy="40" rx="3" ry="1.2"/>'],
    "geraspte kaas": ["--a:#f2c84b;--c:#c9ced2;--d:#d9a72c",
      '<g transform="translate(32 32) scale(0.9) translate(-32 -32)"><path class="c" d="M18 8h20l6 42H12z"/><rect class="c" x="22" y="4" width="12" height="5" rx="2"/>' +
      '<path class="e" d="M18 18h3"/><path class="e" d="M24 18h3"/><path class="e" d="M30 18h3"/><path class="e" d="M20 26h3"/><path class="e" d="M26 26h3"/><path class="e" d="M32 26h3"/><path class="e" d="M18 34h3"/><path class="e" d="M24 34h3"/><path class="e" d="M30 34h3"/><path class="e" d="M36 34h3"/>' +
      '<rect class="a" x="26" y="48.4" width="12" height="3.2" rx="1.6" transform="rotate(-30 32 50)"/><rect class="a" x="32" y="50.4" width="12" height="3.2" rx="1.6" transform="rotate(20 38 52)"/><rect class="a" x="38" y="46.4" width="12" height="3.2" rx="1.6" transform="rotate(-10 44 48)"/><rect class="a" x="42" y="52.4" width="12" height="3.2" rx="1.6" transform="rotate(40 48 54)"/><rect class="a" x="22" y="54.4" width="12" height="3.2" rx="1.6" transform="rotate(10 28 56)"/><rect class="a" x="34" y="55.4" width="12" height="3.2" rx="1.6" transform="rotate(-40 40 57)"/><rect class="a" x="46" y="48.4" width="12" height="3.2" rx="1.6" transform="rotate(60 52 50)"/></g>'],
    geitenkaas: ["--a:#f8f6ee;--b:#e4e0d4;--c:#f2eee2;--d:#d8d4c6",
      '<g transform="translate(32 32) scale(0.9) translate(-32 -32)"><path class="a" d="M8 24h30c4 0 6 6 6 12s-2 12-6 12H8z"/><ellipse class="b" cx="8" cy="36" rx="5" ry="12"/>' +
      '<ellipse class="a" cx="46" cy="40" rx="8" ry="13"/><ellipse class="c" cx="47" cy="40" rx="5" ry="10"/>' +
      '<circle class="d" cx="7" cy="32" r="1.3"/><circle class="d" cx="9" cy="40" r="1.3"/></g>'],
    mozzarella: ["--a:#fbfaf4;--b:#4caa3e;--d:#e8e6dc",
      '<circle class="a" cx="28" cy="38" r="18"/><circle class="a" cx="46" cy="24" r="11"/>' +
      '<ellipse class="d" cx="22" cy="32" rx="5" ry="3" transform="rotate(-30 22 32)"/><ellipse class="d" cx="43" cy="20" rx="3" ry="2" transform="rotate(-30 43 20)"/>' +
      '<path class="b" d="M36 48C43.1 51.8 50.7 49 52.9 41.8C46.6 37.7 39 40.5 36 48z"/><path class="e" d="M38.5 47.1L49.5 43.1"/>'],
    feta: ["--a:#fbf9f0;--b:#e8e4d6;--c:#f2eee2",
      '<g transform="translate(32 32) scale(0.9) translate(-32 -32)"><path class="b" d="M8 30l18-8 26 6v18l-18 10L8 48z"/>' +
      '<path class="a" d="M8 30l18-8 26 6-18 8z"/><path class="c" d="M34 36l18-8v18l-18 10z"/>' +
      '<path class="e" d="M14 36l2 2M20 42l2-1M26 38l1 2M40 40l2 1M46 34l-1 2"/>' +
      '<rect class="a" x="44" y="46" width="9" height="9" rx="1.5" transform="rotate(12 48 50)"/><rect class="a" x="4" y="50" width="8" height="8" rx="1.5" transform="rotate(-10 8 54)"/></g>'],
    "parmezaanse kaas": ["--a:#f0dca0;--b:#c99a3a;--d:#d9bf7a",
      '<path class="b" d="M6 44L26 14l32 18-8 18z"/>' +
      '<path class="a" d="M10 44l17-25 26 15-5 13z"/>' +
      '<path class="e" d="M18 38l4-3M26 28l3 2M36 32l-2 4M42 40l3-2M24 42l3 1"/><circle class="d" cx="30" cy="36" r="1.4"/><circle class="d" cx="20" cy="34" r="1.2"/><circle class="d" cx="40" cy="36" r="1.2"/>'],
    roomkaas: ["--a:#fbfaf4;--b:#7ab0d0;--c:#c9ced2",
      '<path class="b" d="M8 34h48l-3 18c0 3-4 5-8 5H19c-4 0-8-2-8-5z"/><ellipse class="a" cx="32" cy="34" rx="24" ry="7"/>' +
      '<path class="e" d="M18 34c4-3 10-3 16-1s10 2 14-1"/>' +
      '<path class="c" d="M34 30l20-22c2-2 5 0 4 2L40 34z"/>'],
    brie: ["--a:#fbf8ee;--c:#f6e3a0;--d:#e4ddc8",
      '<path class="a" d="M8 28v14c0 6 11 10 24 10s24-4 24-10V28z"/><ellipse class="a" cx="32" cy="28" rx="24" ry="10"/>' +
      '<path class="c" d="M32 28l8 9.6V52l-8-10z"/><path class="c" d="M32 28l18 6.6V48L32 42z" transform="translate(0 0)"/>' +
      '<path class="c" d="M32 28l8 9.6L50 34.6z"/>' +
      '<circle class="d" cx="20" cy="26" r="1.4"/><circle class="d" cx="30" cy="22" r="1.4"/><circle class="d" cx="42" cy="24" r="1.4"/>'],
    halloumi: ["--a:#f7f1de;--d:#b8742a",
      '<g transform="rotate(-8 28 24)"><rect class="a" x="10" y="16" width="36" height="16" rx="3"/><path class="d" d="M17 19h4l-3 10h-4z"/><path class="d" d="M27 19h4l-3 10h-4z"/><path class="d" d="M37 19h4l-3 10h-4z"/></g>' +
      '<g transform="rotate(-8 36 42)"><rect class="a" x="18" y="34" width="36" height="16" rx="3"/><path class="d" d="M25 37h4l-3 10h-4z"/><path class="d" d="M35 37h4l-3 10h-4z"/><path class="d" d="M45 37h4l-3 10h-4z"/></g>'],
    ham: ["--a:#f2a0a6;--c:#fbe6e4;--d:#f8c4c4",
      '<path class="c" d="M8 40c0-12 10-22 24-22 10 0 20 6 24 16-8-4-18-6-26-4-10 2-16 6-22 10z"/>' +
      '<path class="a" d="M11 40c2-10 10-18 21-18 8 0 16 4 20 10-8-2-16-2-24 0-8 2-12 4-17 8z"/>' +
      '<path class="c" d="M6 44c6-8 16-12 28-12 10 0 18 4 24 10-4 8-14 14-26 14S8 52 6 44z"/>' +
      '<path class="a" d="M10 44c6-6 14-9 24-9 8 0 15 3 20 8-4 6-12 10-22 10S12 50 10 44z"/><ellipse class="d" cx="26" cy="44" rx="6" ry="2.5"/>'],
    "kipfilet beleg": ["--a:#f6e8d6;--c:#ead2b4",
      '<ellipse class="a" cx="18" cy="40" rx="14" ry="11"/><path class="e" d="M11 38c3-3 9-3 12 0M13 43c3-2 7-2 10 0"/>' +
      '<ellipse class="a" cx="30" cy="34" rx="14" ry="11"/><path class="e" d="M23 32c3-3 9-3 12 0M25 37c3-2 7-2 10 0"/>' +
      '<ellipse class="a" cx="42" cy="28" rx="14" ry="11"/><path class="e" d="M35 26c3-3 9-3 12 0M37 31c3-2 7-2 10 0"/>'],
    salami: ["--a:#b53a3e;--b:#8a3a2a;--d:#f6e0d6",
      '<g transform="translate(32 32) scale(0.9) translate(-32 -32)"><g transform="rotate(-25 40 26)"><rect class="b" x="24" y="16" width="34" height="20" rx="10"/></g>' +
      '<circle class="a" cx="20" cy="42" r="11"/><circle class="d" cx="16" cy="39" r="1.4"/><circle class="d" cx="23" cy="38" r="1.4"/><circle class="d" cx="25" cy="45" r="1.4"/><circle class="d" cx="17" cy="46" r="1.4"/><circle class="d" cx="20" cy="42" r="1.4"/><circle class="a" cx="34" cy="46" r="11"/><circle class="d" cx="30" cy="43" r="1.4"/><circle class="d" cx="37" cy="42" r="1.4"/><circle class="d" cx="39" cy="49" r="1.4"/><circle class="d" cx="31" cy="50" r="1.4"/><circle class="d" cx="34" cy="46" r="1.4"/><circle class="a" cx="46" cy="40" r="11"/><circle class="d" cx="42" cy="37" r="1.4"/><circle class="d" cx="49" cy="36" r="1.4"/><circle class="d" cx="51" cy="43" r="1.4"/><circle class="d" cx="43" cy="44" r="1.4"/><circle class="d" cx="46" cy="40" r="1.4"/></g>'],
    "filet americain": ["--a:#e86a6a;--b:#f2efe6;--c:#c9ced2;--d:#f49a9a",
      '<path class="b" d="M8 34h48l-3 18c0 3-4 5-8 5H19c-4 0-8-2-8-5z"/><ellipse class="a" cx="32" cy="34" rx="24" ry="7"/>' +
      '<path class="d" d="M18 33c4-3 10-3 16-1s10 2 14-1c-2 3-8 5-14 4s-12-1-16-2z"/>' +
      '<path class="c" d="M34 30l20-22c2-2 5 0 4 2L40 34z"/>'],
    leverworst: ["--a:#b89a8a;--b:#c8303a;--c:#d9c4b4;--d:#a88878",
      '<path class="a" d="M10 30c0-6 4-10 10-10h22c4 0 6 4 6 10s-2 10-6 10H20c-6 0-10-4-10-10z"/>' +
      '<path class="b" d="M10 30c0-5 3-9 7-10v20c-4-1-7-5-7-10z"/><path class="s" d="M10 30H5"/>' +
      '<ellipse class="a" cx="44" cy="42" rx="11" ry="12"/><ellipse class="c" cx="45" cy="42" rx="8" ry="9.5"/><circle class="d" cx="43" cy="40" r="1.4"/><circle class="d" cx="48" cy="45" r="1.2"/>'],
    hummus: ["--a:#e6cc96;--b:#c8743a;--d:#d93a2f;--c:#d9b46a",
      '<path class="a" d="M10 37c0-6 10-10 22-10s22 4 22 10z"/><path class="e" d="M18 33c6-3 12-3 18-1"/>' +
      '<circle class="c" cx="36" cy="31" r="3"/><circle class="d" cx="22" cy="31" r="1.2"/><circle class="d" cx="28" cy="34" r="1.2"/><circle class="d" cx="44" cy="33" r="1.2"/>' +
      '<path class="b" d="M6 36h52c0 11-11 20-26 20S6 47 6 36z"/>'],
    stokbrood: ["--a:#d9a05a",
      '<g transform="rotate(-40 32 32)"><rect class="a" x="2" y="25" width="60" height="14" rx="7"/><path class="e" d="M12 28l5 8M22 28l5 8M32 28l5 8M42 28l5 8M52 28l4 7"/></g>'],
    afbakbroodjes: ["--a:#f0dcb0;--d:#fbefd6",
      '<g transform="translate(32 32) scale(0.86) translate(-32 -32)"><g transform="rotate(-20 20 26)"><path class="a" d="M3 26c0-7 8-11 17-11s17 4 17 11-8 10-17 10-17-3-17-10z"/><path class="e" d="M10 25c6-2 14-2 20 0"/><ellipse class="d" cx="14" cy="20" rx="5" ry="1.5"/></g>' +
      '<g transform="rotate(-20 40 42)"><path class="a" d="M23 42c0-7 8-11 17-11s17 4 17 11-8 10-17 10-17-3-17-10z"/><path class="e" d="M30 41c6-2 14-2 20 0"/><ellipse class="d" cx="34" cy="36" rx="5" ry="1.5"/></g></g>'],
    bolletjes: ["--a:#c98b4a;--d:#f6e6c0",
      '<path class="a" d="M8 46c0-10 5-15 12-15s12 5 12 15c0 3-5 5-12 5s-12-2-12-5z"/><ellipse class="d" cx="16" cy="38" rx=".8" ry="1.4" transform="rotate(30 16 38)"/><ellipse class="d" cx="22" cy="36" rx=".8" ry="1.4" transform="rotate(30 22 36)"/><ellipse class="d" cx="25" cy="41" rx=".8" ry="1.4" transform="rotate(30 25 41)"/><ellipse class="d" cx="19" cy="42" rx=".8" ry="1.4" transform="rotate(30 19 42)"/><ellipse class="d" cx="14" cy="43" rx=".8" ry="1.4" transform="rotate(30 14 43)"/>' +
      '<path class="a" d="M32 46c0-10 5-15 12-15s12 5 12 15c0 3-5 5-12 5s-12-2-12-5z"/><ellipse class="d" cx="40" cy="38" rx=".8" ry="1.4" transform="rotate(30 40 38)"/><ellipse class="d" cx="46" cy="36" rx=".8" ry="1.4" transform="rotate(30 46 36)"/><ellipse class="d" cx="49" cy="41" rx=".8" ry="1.4" transform="rotate(30 49 41)"/><ellipse class="d" cx="43" cy="42" rx=".8" ry="1.4" transform="rotate(30 43 42)"/><ellipse class="d" cx="38" cy="43" rx=".8" ry="1.4" transform="rotate(30 38 43)"/>' +
      '<path class="a" d="M20 28c0-10 5-15 12-15s12 5 12 15c0 3-5 5-12 5s-12-2-12-5z"/><ellipse class="d" cx="28" cy="20" rx=".8" ry="1.4" transform="rotate(30 28 20)"/><ellipse class="d" cx="34" cy="18" rx=".8" ry="1.4" transform="rotate(30 34 18)"/><ellipse class="d" cx="37" cy="23" rx=".8" ry="1.4" transform="rotate(30 37 23)"/><ellipse class="d" cx="31" cy="24" rx=".8" ry="1.4" transform="rotate(30 31 24)"/><ellipse class="d" cx="26" cy="25" rx=".8" ry="1.4" transform="rotate(30 26 25)"/>'],
    "tortilla's": ["--a:#f2deaa;--b:#6cb33f;--c:#d93a2f;--d:#d9b06a",
      '<g transform="translate(32 32) scale(0.9) translate(-32 -32)"><g transform="rotate(-35 32 32)"><path class="b" d="M20 14c2-6 22-6 24 0l-2 4H22z"/><circle class="c" cx="28" cy="15" r="3"/><circle class="c" cx="37" cy="14" r="3"/>' +
      '<path class="a" d="M19 16h26l-3 40c-1 3-19 3-20 0z"/><path class="a" d="M19 16c8 6 18 14 23 40-6-2-14-10-20-20z"/>' +
      '<circle class="d" cx="26" cy="30" r="1.4"/><circle class="d" cx="38" cy="26" r="1.4"/><circle class="d" cx="34" cy="44" r="1.4"/><circle class="d" cx="26" cy="46" r="1.4"/></g></g>'],
    pitabroodjes: ["--a:#ecd2a0;--c:#c9a46a;--d:#d9b06a",
      '<g transform="translate(32 30) scale(0.9) translate(-32 -32)"><ellipse class="a" cx="36" cy="26" rx="22" ry="14" transform="rotate(-15 36 26)"/>' +
      '<path class="a" d="M6 50a22 18 0 0 1 44 0z"/><path class="c" d="M10 50c4-3 10-4 18-4s14 1 18 4z"/>' +
      '<circle class="d" cx="30" cy="20" r="1.3"/><circle class="d" cx="42" cy="24" r="1.3"/><circle class="d" cx="22" cy="40" r="1.3"/><circle class="d" cx="34" cy="38" r="1.3"/></g>'],
    croissants: ["--a:#dc9a48;--d:#f2c27a",
      '<path class="a" d="M6 42c0-4 4-6 8-5l4-10c6-6 22-6 28 0l4 10c4-1 8 1 8 5-2 6-8 8-12 6-6 4-24 4-28 0-4 2-10 0-12-6z"/>' +
      '<path class="e" d="M18 27c0 8 2 14 6 20M32 24v24M46 27c0 8-2 14-6 20M10 42c2 2 4 3 6 3M54 42c-2 2-4 3-6 3"/>' +
      '<ellipse class="d" cx="32" cy="30" rx="4" ry="2"/>'],
    beschuit: ["--a:#e8c07a;--b:#c98b4a;--d:#c98b4a",
      '<path class="a" d="M10 44v4c0 4 10 7 22 7s22-3 22-7v-4z"/><path class="a" d="M10 36v4c0 4 10 7 22 7s22-3 22-7v-4z"/><path class="a" d="M10 28v4c0 4 10 7 22 7s22-3 22-7v-4z"/><path class="a" d="M10 20v4c0 4 10 7 22 7s22-3 22-7v-4z"/><ellipse class="b" cx="32" cy="20" rx="22" ry="7"/>' +
      '<circle class="e" cx="22" cy="20" r="1.1"/><circle class="e" cx="30" cy="18" r="1.1"/><circle class="e" cx="38" cy="21" r="1.1"/><circle class="e" cx="44" cy="19" r="1.1"/><circle class="e" cx="28" cy="22" r="1.1"/>'],
    crackers: ["--a:#e8c88a;--d:#b8904a",
      '<g transform="rotate(-10 23 29)"><rect class="a" x="8" y="14" width="30" height="30" rx="3"/><circle class="d" cx="15" cy="21" r="1.4"/><circle class="d" cx="15" cy="29" r="1.4"/><circle class="d" cx="15" cy="37" r="1.4"/><circle class="d" cx="23" cy="21" r="1.4"/><circle class="d" cx="23" cy="29" r="1.4"/><circle class="d" cx="23" cy="37" r="1.4"/><circle class="d" cx="31" cy="21" r="1.4"/><circle class="d" cx="31" cy="29" r="1.4"/><circle class="d" cx="31" cy="37" r="1.4"/></g>' +
      '<g transform="rotate(8 37 41)"><rect class="a" x="22" y="26" width="30" height="30" rx="3"/><circle class="d" cx="29" cy="33" r="1.4"/><circle class="d" cx="29" cy="41" r="1.4"/><circle class="d" cx="29" cy="49" r="1.4"/><circle class="d" cx="37" cy="33" r="1.4"/><circle class="d" cx="37" cy="41" r="1.4"/><circle class="d" cx="37" cy="49" r="1.4"/><circle class="d" cx="45" cy="33" r="1.4"/><circle class="d" cx="45" cy="41" r="1.4"/><circle class="d" cx="45" cy="49" r="1.4"/></g>'],
    rijst: ["--a:#fbfaf4;--b:#e8dcc0;--c:#7fb24e;--d:#cfc6ae",
      '<path class="b" d="M14 14c4-3 32-3 36 0l-2 40c0 3-4 4-16 4s-16-1-16-4z"/><rect class="c" x="15" y="18" width="34" height="10"/>' +
      '<ellipse class="a" cx="32" cy="42" rx="11" ry="9"/>' +
      '<ellipse class="d" cx="28" cy="39" rx="2.2" ry="1" transform="rotate(30 28 39)"/><ellipse class="d" cx="34" cy="38" rx="2.2" ry="1" transform="rotate(-20 34 38)"/><ellipse class="d" cx="30" cy="45" rx="2.2" ry="1" transform="rotate(-40 30 45)"/><ellipse class="d" cx="36" cy="44" rx="2.2" ry="1" transform="rotate(10 36 44)"/><ellipse class="d" cx="26" cy="44" rx="2.2" ry="1" transform="rotate(70 26 44)"/>'],
    mie: ["--a:#f2c860;--b:#c9ced2",
      '<ellipse class="b" cx="32" cy="44" rx="26" ry="10"/>' +
      '<path class="a" d="M10 38c0-10 10-18 22-18s22 8 22 18c0 6-10 10-22 10s-22-4-22-10z"/>' +
      '<path class="e" d="M14 36c3-4 5 4 8 0s5 4 8 0 5 4 8 0 5 4 8 0M16 30c3-4 5 4 8 0s5 4 8 0 5 4 8 0 5 4 6 0M22 24c3-3 5 3 8 0s5 3 8 0 4 3 6 0M14 42c3-4 5 4 8 0s5 4 8 0 5 4 8 0 5 4 8 0"/>'],
    couscous: ["--a:#f2d27a;--b:#c8743a;--d:#d9a83a",
      '<path class="b" d="M4 46c0-4 12-6 28-6s28 2 28 6-12 8-28 8S4 50 4 46z"/>' +
      '<path class="a" d="M12 44c2-14 10-22 20-22s18 8 20 22z"/>' +
      '<circle class="d" cx="22" cy="36" r="1"/><circle class="d" cx="28" cy="32" r="1"/><circle class="d" cx="34" cy="28" r="1"/><circle class="d" cx="40" cy="36" r="1"/><circle class="d" cx="30" cy="40" r="1"/><circle class="d" cx="36" cy="42" r="1"/><circle class="d" cx="24" cy="42" r="1"/><circle class="d" cx="44" cy="42" r="1"/><circle class="d" cx="32" cy="34" r="1"/><circle class="d" cx="26" cy="26" r="1"/><circle class="d" cx="38" cy="31" r="1"/><circle class="d" cx="18" cy="40" r="1"/>'],
    quinoa: ["--a:#e8d6a8;--b:#b07a4a;--d:#a8423a;--c:#f6efe0",
      '<g transform="translate(32 32) scale(0.9) translate(-32 -32)"><path class="b" d="M44 36l14-16c2-2 5 1 3 3L48 40z"/>' +
      '<path class="b" d="M6 36c0 12 10 20 22 20s22-8 22-20z"/><ellipse class="a" cx="28" cy="36" rx="22" ry="7"/>' +
      '<circle class="d" cx="14" cy="35" r="1.6"/><circle class="c" cx="20" cy="33" r="1.6"/><circle class="d" cx="26" cy="35" r="1.6"/><circle class="c" cx="32" cy="33" r="1.6"/><circle class="d" cx="38" cy="35" r="1.6"/><circle class="c" cx="18" cy="38" r="1.6"/><circle class="d" cx="30" cy="38" r="1.6"/><circle class="c" cx="42" cy="37" r="1.6"/><circle class="d" cx="24" cy="31" r="1.6"/><circle class="c" cx="36" cy="31" r="1.6"/></g>'],
    havermout: ["--a:#e8a04a;--b:#f3e6c4;--c:#c98b4a;--d:#c8a25a",
      '<path class="a" d="M14 16v36c0 3 8 5 18 5s18-2 18-5V16z"/><ellipse class="c" cx="32" cy="16" rx="18" ry="5"/>' +
      '<rect class="b" x="14" y="26" width="36" height="20"/>' +
      '<path class="s" d="M32 44v-12"/><path class="d" d="M32 36C32.4 33.7 31 32 28.8 32.2C28.2 34.3 29.7 36 32 36z"/><path class="d" d="M32 36C34.3 36 35.8 34.3 35.2 32.2C33 32 31.6 33.7 32 36z"/><path class="d" d="M32 32C32.4 29.7 31 28 28.8 28.2C28.2 30.3 29.7 32 32 32z"/><path class="d" d="M32 32C34.3 32 35.8 30.3 35.2 28.2C33 28 31.6 29.7 32 32z"/><path class="d" d="M32 30C33.8 28.5 33.8 26.3 32 25C30.2 26.3 30.2 28.5 32 30z"/>'],
    muesli: ["--a:#e6c88a;--b:#7fa6c4;--c:#7a4a3a;--d:#c98b4a",
      '<path class="a" d="M10 37c0-6 10-10 22-10s22 4 22 10z"/>' +
      '<ellipse class="d" cx="18" cy="33" rx="2.4" ry="1.5" transform="rotate(126 18 33)"/><ellipse class="d" cx="26" cy="31" rx="2.4" ry="1.5" transform="rotate(182 26 31)"/><ellipse class="d" cx="34" cy="30" rx="2.4" ry="1.5" transform="rotate(238 34 30)"/><ellipse class="d" cx="40" cy="33" rx="2.4" ry="1.5" transform="rotate(280 40 33)"/><ellipse class="d" cx="30" cy="34" rx="2.4" ry="1.5" transform="rotate(210 30 34)"/><ellipse class="d" cx="46" cy="35" rx="2.4" ry="1.5" transform="rotate(322 46 35)"/><ellipse class="d" cx="22" cy="35" rx="2.4" ry="1.5" transform="rotate(154 22 35)"/>' +
      '<circle class="c" cx="28" cy="31" r="2"/><circle class="c" cx="40" cy="30" r="2"/><circle class="c" cx="20" cy="35" r="1.8"/>' +
      '<path class="b" d="M6 36h52c0 11-11 20-26 20S6 47 6 36z"/>'],
    cornflakes: ["--a:#f2a63a;--b:#c87a2a;--c:#f7d06a;--d:#f7d06a",
      '<path class="b" d="M42 12l8-4v42l-8 6z"/><path class="b" d="M14 12l8-4h28l-8 4z"/><rect class="a" x="14" y="12" width="28" height="44" rx="1"/>' +
      '<ellipse class="b" cx="28" cy="40" rx="9" ry="5"/>' +
      '<path class="c" d="M20 32c2-4 8-5 11-2 3-3 7-1 7 3-1 4-7 6-11 5-4 0-8-2-7-6z"/><path class="c" d="M24 26c3-3 7-2 8 1-2 3-6 3-8-1z"/>'],
    bloem: ["--a:#f6f2e8;--b:#e8dcc0;--d:#d9a83a",
      '<path class="a" d="M14 18l2-8h32l2 8v34c0 3-2 5-5 5H19c-3 0-5-2-5-5z"/><path class="e" d="M16 14h32M14 18h36"/>' +
      '<path class="s" d="M32 42v-12"/><path class="d" d="M32 34C32.4 31.7 31 30 28.8 30.2C28.2 32.3 29.7 34 32 34z"/><path class="d" d="M32 34C34.3 34 35.8 32.3 35.2 30.2C33 30 31.6 31.7 32 34z"/><path class="d" d="M32 30C32.4 27.7 31 26 28.8 26.2C28.2 28.3 29.7 30 32 30z"/><path class="d" d="M32 30C34.3 30 35.8 28.3 35.2 26.2C33 26 31.6 27.7 32 30z"/><path class="d" d="M32 28C33.8 26.5 33.8 24.3 32 23C30.2 24.3 30.2 26.5 32 28z"/>'],
    "zelfrijzend bakmeel": ["--a:#dbe8f2;--b:#f6f2e8;--c:#c98b4a;--d:#e8c07a",
      '<path class="a" d="M14 18l2-8h32l2 8v34c0 3-2 5-5 5H19c-3 0-5-2-5-5z"/><path class="e" d="M16 14h32M14 18h36"/>' +
      '<path class="c" d="M24 46h16l-2 6H26z"/><path class="d" d="M22 46c0-8 4-12 10-12s10 4 10 12z"/><path class="e" d="M32 30v-6M29 26l3-3 3 3"/>'],
    pannenkoekmix: ["--a:#f2c870;--b:#f2efe6;--c:#8a4a1a;--d:#fbe9a0",
      '<ellipse class="b" cx="32" cy="48" rx="28" ry="9"/>' +
      '<ellipse class="a" cx="32" cy="42" rx="22" ry="7"/><ellipse class="a" cx="32" cy="36" rx="22" ry="7"/><ellipse class="a" cx="32" cy="30" rx="22" ry="7"/>' +
      '<path class="c" d="M20 28c4-3 20-3 24 0 2 2 0 4-3 3l-1 6c0 2-2 2-2 0v-5c-4 1-10 1-14 0l-1 4c0 2-2 2-2 0z"/>' +
      '<rect class="d" x="28" y="23" width="8" height="5" rx="1"/>'],
    maizena: ["--a:#f2efe6;--b:#d9b04a;--c:#f5cf3c;--d:#7fae4a",
      '<path class="b" d="M42 12l8-4v42l-8 6z"/><path class="b" d="M14 12l8-4h28l-8 4z"/><rect class="a" x="14" y="12" width="28" height="44" rx="1"/>' +
      '<g transform="rotate(25 28 36)"><ellipse class="c" cx="28" cy="36" rx="5" ry="11"/><path class="e" d="M24 30h8M23 36h10M24 42h8"/><path class="d" d="M28 48c-3-2-6-8-5-14 1 4 3 7 5 9z"/></g>'],
    paneermeel: ["--a:#d9944a;--b:#e8c07a;--d:#a8642a",
      '<g transform="translate(32 32) scale(0.9) translate(-32 -32)"><path class="b" d="M38 12h16c4 0 6 4 4 8v14H40V20c-2-4-1-8-2-8z" transform="rotate(10 48 24)"/>' +
      '<path class="a" d="M6 52c2-14 12-24 26-24s24 10 26 24z"/>' +
      '<circle class="d" cx="16" cy="46" r="1.3"/><circle class="d" cx="22" cy="40" r="1.3"/><circle class="d" cx="28" cy="36" r="1.3"/><circle class="d" cx="34" cy="34" r="1.3"/><circle class="d" cx="40" cy="38" r="1.3"/><circle class="d" cx="46" cy="44" r="1.3"/><circle class="d" cx="24" cy="48" r="1.3"/><circle class="d" cx="32" cy="44" r="1.3"/><circle class="d" cx="40" cy="48" r="1.3"/><circle class="d" cx="50" cy="50" r="1.3"/><circle class="d" cx="14" cy="52" r="1.3"/><circle class="d" cx="30" cy="52" r="1.3"/></g>'],
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
