// lib/vipfonts.js — VIP unicode fonts + decorations (fancy name generator, symbols)
const UP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', LO = 'abcdefghijklmnopqrstuvwxyz', DG = '0123456789';

// start code point ke saath alphabet banao (kuch fonts mein "holes" hain, un ke liye overrides)
function range(upStart, loStart, dgStart, over = {}) {
    const m = {};
    for (let i = 0; i < 26; i++) {
        if (upStart != null) m[UP[i]] = String.fromCodePoint(upStart + i);
        if (loStart != null) m[LO[i]] = String.fromCodePoint(loStart + i);
    }
    if (dgStart != null) for (let i = 0; i < 10; i++) m[DG[i]] = String.fromCodePoint(dgStart + i);
    return Object.assign(m, over);
}
const fromStrings = (up, lo, dg) => {
    const m = {};
    const U = Array.from(up || ''), L = Array.from(lo || ''), D = Array.from(dg || '');
    U.forEach((c, i) => { m[UP[i]] = c; });
    L.forEach((c, i) => { m[LO[i]] = c; });
    D.forEach((c, i) => { m[DG[i]] = c; });
    return m;
};

const FONTS = [
    ['𝐁𝐨𝐥𝐝', range(0x1D400, 0x1D41A, 0x1D7CE)],
    ['𝘐𝘵𝘢𝘭𝘪𝘤', range(0x1D608, 0x1D622, null)],
    ['𝑩𝒐𝒍𝒅 𝑰𝒕𝒂𝒍𝒊𝒄', range(0x1D468, 0x1D482, 0x1D7CE)],
    ['𝓢𝓬𝓻𝓲𝓹𝓽 𝓑𝓸𝓵𝓭', range(0x1D4D0, 0x1D4EA, 0x1D7CE)],
    ['𝒮𝒸𝓇𝒾𝓅𝓉', range(0x1D49C, 0x1D4B6, 0x1D7CE, { B: 'ℬ', E: 'ℰ', F: 'ℱ', H: 'ℋ', I: 'ℐ', L: 'ℒ', M: 'ℳ', R: 'ℛ', e: 'ℯ', g: 'ℊ', o: 'ℴ' })],
    ['𝕱𝖗𝖆𝖐𝖙𝖚𝖗 𝕭𝖔𝖑𝖉', range(0x1D56C, 0x1D586, 0x1D7CE)],
    ['𝔉𝔯𝔞𝔨𝔱𝔲𝔯', range(0x1D504, 0x1D51E, 0x1D7CE, { C: 'ℭ', H: 'ℌ', I: 'ℑ', R: 'ℜ', Z: 'ℨ' })],
    ['𝔻𝕠𝕦𝕓𝕝𝕖', range(0x1D538, 0x1D552, 0x1D7D8, { C: 'ℂ', H: 'ℍ', N: 'ℕ', P: 'ℙ', Q: 'ℚ', R: 'ℝ', Z: 'ℤ' })],
    ['𝗦𝗮𝗻𝘀 𝗕𝗼𝗹𝗱', range(0x1D5D4, 0x1D5EE, 0x1D7EC)],
    ['𝙎𝙖𝙣𝙨 𝘽𝙤𝙡𝙙 𝙄𝙩𝙖𝙡𝙞𝙘', range(0x1D63C, 0x1D656, 0x1D7EC)],
    ['𝙼𝚘𝚗𝚘', range(0x1D670, 0x1D68A, 0x1D7F6)],
    ['ꜱᴍᴀʟʟ ᴄᴀᴘs', fromStrings('ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ', 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ', '')],
    ['Ⓒⓘⓡⓒⓛⓔⓓ', range(0x24B6, 0x24D0, null, { '0': '⓪', '1': '①', '2': '②', '3': '③', '4': '④', '5': '⑤', '6': '⑥', '7': '⑦', '8': '⑧', '9': '⑨' })],
    ['🅒🅘🅡🅒🅛🅔 🅑🅛🅐🅒🅚', range(0x1F150, 0x1F150, null), 'black-circle'],
    ['🄲🄾🅁🄽🄴🅁', range(0x1F130, 0x1F130, null), 'square'],
    ['🅂🅀🅄🄰🅁🄴 🄱🄻🄰🄲🄺', range(0x1F170, 0x1F170, null), 'square'],
    ['Ｆｕｌｌ Ｗｉｄｔｈ', range(0xFF21, 0xFF41, 0xFF10)]
];
// ye entries ke liye lowercase bhi upper wale set se
function applyMap(text, map, caseFold) {
    return Array.from(String(text)).map(ch => {
        if (map[ch]) return map[ch];
        if (caseFold && /[a-z]/i.test(ch)) return map[ch.toUpperCase()] || ch;
        return ch;
    }).join('');
}
const FLIP = fromStrings('∀qƆpƎℲפHIſʞ˥WNOԀQɹS┴∩ΛMXʎZ', 'ɐqɔpǝɟƃɥᴉɾʞlɯuodbɹsʇnʌʍxʎz', '0ƖᄅƐㄣϛ9ㄥ86');
const flip = t => Array.from(String(t)).map(c => FLIP[c] || c).reverse().join('');
const smallCaps = t => Array.from(String(t)).map(c => (/[a-z]/i.test(c) ? 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ'[c.toLowerCase().charCodeAt(0) - 97] : c)).join('');
const comb = (t, mark) => Array.from(String(t)).map(c => (c === ' ' ? c : c + mark)).join('');

const FRAMES = [
    n => `꧁༒☬ ${n} ☬༒꧂`, n => `★彡[ ${n} ]彡★`, n => `『 ${n} 』`, n => `༺ ${n} ༻`, n => `✦•······•✦ ${n} ✦•······•✦`,
    n => `╰┈➤ ${n} ✿`, n => `⚔️ ${n} ⚔️`, n => `【 ${n} 】`, n => `♛ ${n} ♛`, n => `҉ ${n} ҉`, n => `☠️ ${n} ☠️`,
    n => `💎 ${n} 💎`, n => `⋆｡°✩ ${n} ✩°｡⋆`, n => `ꜜ ${n} ꜜ`, n => `⸙͎ ${n} ⸙͎`, n => `᯽ ${n} ᯽`, n => `⟬ ${n} ⟭`,
    n => `「 ${n} 」`, n => `❝ ${n} ❞`, n => `✧･ﾟ: *✧･ﾟ:* ${n} *:･ﾟ✧*:･ﾟ✧`
];

// name -> [{label, text}]
function generate(name) {
    const out = [];
    for (const [label, map, caseFold] of FONTS) out.push({ label, text: applyMap(name, map, caseFold === true || caseFold === 'black-circle' || caseFold === 'square') });
    out.push({ label: 'ɯıɹɹoɹ (Flip)', text: flip(name) });
    out.push({ label: 'S̶t̶r̶i̶k̶e̶', text: comb(name, '̶') });
    out.push({ label: 'U̲n̲d̲e̲r̲l̲i̲n̲e̲', text: comb(name, '̲') });
    out.push({ label: 'S͓͓l͓͓a͓͓s͓͓h͓͓', text: comb(name, '̸') });
    // VIP frames: bold-script + bold + small caps naam ke saath
    const base = [applyMap(name, FONTS[3][1]), applyMap(name, FONTS[0][1]), smallCaps(name), applyMap(name, FONTS[5][1])];
    FRAMES.forEach((f, i) => out.push({ label: `VIP ${i + 1}`, text: f(base[i % base.length]) }));
    return out;
}

const SYMBOLS = {
    'Stars ✨': '★ ☆ ✦ ✧ ✩ ✪ ✫ ✬ ✭ ✮ ✯ ✰ ⭐ 🌟 💫 ✨ ⚝ ⍟ ❂ ✴ ✵ ✶ ✷ ✸ ✹',
    'Hearts 💞': '❤ ♡ ♥ ❣ ❥ ❦ ❧ ღ ❤️ 💖 💗 💓 💞 💕 💘 💝 🖤 🤍 💙 💚 💛 🧡 💜 ❣️',
    'Arrows ➤': '➤ ➥ ➦ ➧ ➨ ➩ ➪ ➫ ➬ ➭ ➮ ➯ ➱ ➲ ➳ ➵ ➸ ➺ ➻ ➼ ➽ ➾ ⇒ ⇨ ⟹ ⟶ ↪ ↠ ↣ ⤳ ⤷',
    'Crowns 👑': '♛ ♔ 👑 ♕ ♚ ⚜ ⚜️ 🔱 ☬ ༒ ꧁ ꧂ ❖ ✠ ✙ ✚ ✜ ✢ ✣ ✤ ✥',
    'Brackets 「」': '『 』 「 」 【 】 〖 〗 〔 〕 《 》 〈 〉 ❨ ❩ ❪ ❫ ❬ ❭ ❮ ❯ ❰ ❱ ⟦ ⟧ ⟬ ⟭ ༺ ༻ ༼ ༽',
    'Lines ━': '━ ═ ─ ┄ ┈ ╍ ╌ ┅ ┉ ▬ ▭ ▰ ▱ ░ ▒ ▓ █ ■ □ ▪ ▫ ◆ ◇ ◈ ◉ ◎ ● ○ ◐ ◑ ◒ ◓',
    'Boxes ╔╗': '╔ ╗ ╚ ╝ ║ ═ ╭ ╮ ╰ ╯ │ ─ ┏ ┓ ┗ ┛ ┃ ━ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼ ╠ ╣ ╦ ╩ ╬',
    'Flowers 🌸': '❀ ✿ ❁ ❃ ❋ ✾ ✽ ✻ ✼ ❊ ❉ ❈ ❇ ❆ ❅ ❄ 🌸 🌺 🌹 🌷 🌼 🌻 💮 🏵️ 🥀',
    'VIP ☬': '☬ ༒ ᯽ ꧁ ꧂ ⸙ ۞ ۩ ߷ ༄ ࿐ ࿆ ༗ ༘ ༙ ཐི༏ཋྀ ᭄ ꨄ ๛ ❖ ⌘ ⍟ ⚔ ☠ ☯ ☮ ♾ ⚡ 🔥 💎 👑',
    'Islamic ☪': '☪ ﷽ ﷺ ﷻ ۞ ﴾ ﴿ ☽ ☾ 🕌 🕋 📿 🤲 🌙 ✨ ﷲ ۩ ❁ ❀ ♡',
    'Music 🎵': '♩ ♪ ♫ ♬ ♭ ♮ ♯ 🎵 🎶 🎼 🎧 🎤 🎹 🎸 🥁 🎻 🎷 🎺',
    'Cute ☺': 'ʚɞ ˚₊‧ ꒰ ꒱ ᵔᴥᵔ ʕ•ᴥ•ʔ ෆ ꕤ ꕥ ᰔ ᥫ᭡ ˗ˏˋ ˎˊ˗ ⋆ ˚｡ ⋆ ౨ৎ ♡̷ 𓆩 𓆪 𓂃 𓏲 ‧₊˚',
    'Weather ☁': '☀ ☁ ☂ ☃ ☄ ⛅ ⛈ 🌈 ⚡ ❄ 🌊 🔥 🌙 🌞 🌝 🌛 🌜 ⭐ 🌌'
};

module.exports = { generate, SYMBOLS, applyMap, FONTS, flip, smallCaps, FRAMES };
