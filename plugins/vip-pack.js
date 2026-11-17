// plugins/vip-pack.js — .fancyname / .vipsymbols  +  PRANK commands (sab fake aur harmless, aakhir mein "PRANK!" bata dete hain)
const { cmd } = require('../arslan');
const config = require('../config');
const vip = require('../lib/vipfonts');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ════════════════ FANCY NAME GENERATOR ════════════════
cmd({
    pattern: 'fancyname',
    alias: ['fancy', 'vipname', 'namegen', 'stylename', 'namestyle', 'vipfont', 'vipfonts'],
    desc: 'Naam ke 40+ VIP fancy styles (fonts + symbols)',
    category: 'name',
    react: '✍️',
    use: '.fancyname <naam>',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const name = String(ctx.q || (m.quoted && m.quoted.text) || '').trim().slice(0, 40);
    if (!name) return ctx.reply('✍️ *FANCY NAME GENERATOR*\n\nNaam likho: `.fancyname Ahmad`\nYa kisi text par reply karke `.fancyname`');
    const list = vip.generate(name);
    const fonts = list.filter(x => !x.label.startsWith('VIP'));
    const frames = list.filter(x => x.label.startsWith('VIP'));
    const head = `╭━━━〔 ✍️ 𝐅𝐀𝐍𝐂𝐘 𝐍𝐀𝐌𝐄 〕━━━╮\n┃ 👤 ${name}\n╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
    const t1 = head + '┏━═❲ 𝐅𝐎𝐍𝐓𝐒 ❳\n' + fonts.map(x => `┋ ${x.text}`).join('\n') + '\n┗───────────────────𒁍';
    const t2 = '┏━═❲ 𝐕𝐈𝐏 𝐒𝐓𝐘𝐋𝐄𝐒 ❳\n' + frames.map(x => `┋ ${x.text}`).join('\n') + '\n┗───────────────────𒁍\n\n_Copy karke bio / name / group mein lagao_ 💎';
    await conn.sendMessage(ctx.from, { text: t1 }, { quoted: mek });
    await conn.sendMessage(ctx.from, { text: t2 }, { quoted: mek });
});

cmd({
    pattern: 'vipsymbols',
    alias: ['symbols', 'vipsymbol', 'symbol', 'stylesymbols'],
    desc: 'VIP symbols ki list (copy karke use karo)',
    category: 'name',
    react: '💎',
    use: '.vipsymbols',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const body = Object.entries(vip.SYMBOLS).map(([k, v]) => `┏━═❲ ${k}\n┋ ${v}\n┗───────────────────𒁍`).join('\n\n');
    await ctx.reply(`╭━━━〔 💎 𝐕𝐈𝐏 𝐒𝐘𝐌𝐁𝐎𝐋𝐒 〕━━━╮\n┃ Copy karke kahin bhi lagao\n╰━━━━━━━━━━━━━━━━━━━━╯\n\n${body}`);
});

// ════════════════ PRANKS ════════════════
// Sab fake aur harmless. Animation edit hoti rehti hai; end mein "ye prank tha — just for fun 😊" aata hai.
async function animate(conn, chat, quoted, frames, delayMs, mentions) {
    let sent = await conn.sendMessage(chat, { text: frames[0], mentions }, { quoted });
    for (let i = 1; i < frames.length; i++) {
        await sleep(delayMs);
        try { await conn.sendMessage(chat, { text: frames[i], edit: sent.key, mentions }); }
        catch (_) { sent = await conn.sendMessage(chat, { text: frames[i], mentions }); }
    }
}
const bar = (p) => { const f = Math.round(p / 10); return '▰'.repeat(f) + '▱'.repeat(10 - f) + ` ${p}%`; };
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function targetOf(m, mek, ctx) {
    const ctxInfo = (mek.message && (mek.message.extendedTextMessage || {}).contextInfo) || {};
    const jid = (ctxInfo.mentionedJid && ctxInfo.mentionedJid[0]) || (m.quoted && (m.quoted.sender || m.quoted.participant)) || (!ctx.isGroup ? ctx.from : null);
    return jid || null;
}
const numOf = (jid) => String(jid || '').split('@')[0].split(':')[0];
const BOTN = () => config.BOT_NAME || '𝐀𝐡𝐦𝐚𝐝𝐒𝐡𝐚𝐡𝐳𝐚𝐝-𝐌𝐃';
const REVEAL = '╭━━━〔 😂 𝐏𝐑𝐀𝐍𝐊 〕━━━╮\n┃ Ye sirf *prank* tha 🤭\n┃ Koi hack / virus / khatra nahi hai\n┃ Darna mat dost ❤️\n╰━━━━━━━━━━━━━━━━━━━╯\n\n🎭 *Just for fun* 😊';

function prank({ pattern, alias, desc, build, delay = 1400 }) {
    cmd({ pattern, alias, desc, category: 'prank', react: '😈', use: `.${pattern} [@user / reply]`, filename: __filename },
        async (conn, mek, m, ctx) => {
            if (!(ctx.isCreator || ctx.isOwner || ctx.isAdmins)) return ctx.reply('*SIRF OWNER / ADMIN ❤️*');
            const jid = targetOf(m, mek, ctx);
            const mentions = jid ? [jid] : [];
            const who = jid ? '@' + numOf(jid) : 'Target';
            await animate(conn, ctx.from, mek, build(who), delay, mentions);
        });
}

prank({
    pattern: 'hack', alias: ['hackprank', 'hacking', 'fakehack', 'hackme', 'hacker'], desc: 'Fake hacking animation', delay: 1600,
    build: (who) => [
        `💻 *HACKING TOOL v9.4* 💻\n🎯 Target ➜ ${who}\n${bar(0)}`,
        `🔌 Phone se connect ho raha hai…\n📶 Signal: Strong\n${bar(8)}`,
        `📡 IP address mil gaya…\n🌐 ${rnd(100, 199)}.${rnd(10, 250)}.${rnd(10, 250)}.${rnd(2, 250)}\n${bar(18)}`,
        `🛠️ Firewall bypass ho rahi hai…\n🔓 Port 8080 open\n${bar(29)}`,
        `📂 Gallery access…\n📸 ${rnd(300, 999)} photos · 🎞️ ${rnd(20, 90)} videos mili\n${bar(41)}`,
        `💬 WhatsApp chats copy ho rahi hain…\n🗂️ ${rnd(80, 400)} chats\n${bar(55)}`,
        `📞 Contacts upload ho rahe hain…\n👥 ${rnd(150, 700)} contacts\n${bar(67)}`,
        `🔐 Passwords decrypt ho rahe hain…\n🔑 ******** ******\n${bar(80)}`,
        `📤 Data server par bheja ja raha hai…\n${bar(93)}`,
        `✅ *HACK COMPLETE!* 😈\n${bar(100)}`,
        `⏳ …aur ab sab kuch delete ho raha hai…\n😨😨😨`,
        REVEAL
    ]
});
prank({
    pattern: 'virus', alias: ['virusprank', 'fakevirus', 'virusscan', 'viruss'], desc: 'Fake virus detected animation', delay: 1500,
    build: (who) => [
        `🛡️ *PHONE SECURITY SCAN*\n👤 ${who}\n${bar(0)}`,
        `🔍 Files scan ho rahi hain…\n${bar(22)}`,
        `⚠️ *WARNING!* ${rnd(3, 9)} threats mile!\n🦠 Trojan.Agent.X\n🦠 Spy.Whats.Stealer\n🦠 Worm.Sms.Spread\n${bar(48)}`,
        `🚨 *DANGER!* Virus phone mein phail raha hai…\n🚨🚨🚨\n${bar(71)}`,
        `💾 Photos corrupt ho rahi hain…\n📵 Battery drain ho rahi hai…\n${bar(90)}`,
        `☠️ *SYSTEM FAILURE* ☠️\n${bar(100)}`,
        REVEAL
    ]
});
prank({
    pattern: 'bomb', alias: ['bombprank', 'fakebomb'], desc: 'Fake bomb countdown', delay: 1200,
    build: (who) => [
        `💣 *BOMB ACTIVATED* 💣\n🎯 ${who}\n⏱️ Timer set: 10 sec`,
        '💣 10…', '💣 9…', '💣 8…', '💣 7… 😬', '💣 6… 😨', '💣 5… 😱', '💣 4… 😰', '💣 3… 🥶', '💣 2… 😭', '💣 1… 💀',
        `💥💥💥 *BOOOOOOM!* 💥💥💥`,
        REVEAL
    ]
});
prank({
    pattern: 'ghost', alias: ['ghostprank', 'scareprank', 'darao', 'scare'], desc: 'Darawna ghost sequence', delay: 1800,
    build: (who) => [
        `🌑 Andhera ho raha hai…`,
        `🕯️ ${who}… kya tumne kuch suna?`,
        `👂 Peeche se kisi ke chalne ki awaaz aa rahi hai…`,
        `🚪 Darwaza khud-ba-khud khul gaya…`,
        `👁️ …koi tumhe dekh raha hai…`,
        `🩸 Pichhe mudh ke mat dekhna 😶`,
        `😨 Wo bilkul tumhare peeche hai…`,
        `👻 *BHOOOOOO!!!* 👻👻👻`,
        REVEAL
    ]
});
prank({
    pattern: 'track', alias: ['locationprank', 'trackprank', 'fakelocation', 'tracker'], desc: 'Fake location tracking', delay: 1600,
    build: (who) => [
        `📍 *LIVE TRACKER*\n🎯 ${who}\n${bar(5)}`,
        `🛰️ Satellite connect ho rahi hai…\n${bar(30)}`,
        `📡 Signal lock ho gaya…\n🗺️ Lat: ${(24 + Math.random() * 8).toFixed(4)}  Lng: ${(66 + Math.random() * 9).toFixed(4)}\n${bar(58)}`,
        `🏠 Location mil gayi: *tumhare ghar ke bilkul paas* 👀\n${bar(86)}`,
        `📌 Main tumhe dekh sakta hoon 😈\n${bar(100)}`,
        REVEAL
    ]
});
prank({
    pattern: 'police', alias: ['policeprank', 'fir', 'fakepolice', 'arrestprank'], desc: 'Fake police notice', delay: 1700,
    build: (who) => [
        `🚓 *POLICE ALERT* 🚓\n👤 ${who}`,
        `🚨 Aap ke khilaf shikayat darj ho gayi hai…`,
        `📋 FIR No: ${rnd(100, 999)}/${rnd(21, 26)}\n⚖️ Dafa: Cyber Crime`,
        `📞 Cyber Crime team aap ka number trace kar rahi hai…`,
        `😨 Aap ko 5 minute mein thane aana hoga!`,
        REVEAL
    ]
});
prank({
    pattern: 'simblock', alias: ['simprank', 'numberblock', 'fakeblock', 'blockprank'], desc: 'Fake SIM block warning', delay: 1500,
    build: (who) => [
        `📵 *SIM STATUS CHECK*\n👤 ${who}`,
        `⚠️ Aap ki SIM *24 ghante mein block* hone wali hai!\n${bar(30)}`,
        `📄 Wajah: CNIC verification pending…\n${bar(55)}`,
        `⏳ Block hone mein: 00:00:10…\n${bar(80)}`,
        `⏳ 00:00:03…  😰`,
        REVEAL
    ]
});
prank({
    pattern: 'battery', alias: ['batteryprank', 'phoneblast', 'blastprank'], desc: 'Fake phone overheating', delay: 1500,
    build: (who) => [
        `🔋 *BATTERY MONITOR*\n👤 ${who}\n${bar(70)}`,
        `🌡️ Temperature: ${rnd(41, 44)}°C ⚠️`,
        `🔥 Temperature: ${rnd(49, 55)}°C 🔥\nPhone garam ho raha hai!`,
        `🚨 *OVERHEATING!* 🚨\nPhone ko foran band karo!`,
        `💥 3… 2… 1…`,
        REVEAL
    ]
});

// ════════════════ .prank  (PRANK MENU) ════════════════
const PRANK_LIST = [
    ['hack',   '💻', 'Fake hacking animation'],
    ['virus',  '🦠', 'Fake virus alert'],
    ['bomb',   '💣', 'Fake bomb countdown'],
    ['ghost',  '👻', 'Darawna ghost scene'],
    ['track',  '📍', 'Fake location tracker'],
    ['police', '🚓', 'Fake police notice'],
    ['simblock','📵', 'Fake SIM block warning'],
    ['battery','🔋', 'Fake phone overheating']
];
cmd({
    pattern: 'prank', alias: ['pranks', 'prankmenu'], desc: 'Prank commands ka menu', category: 'prank', react: '😈', use: '.prank', filename: __filename
}, async (conn, mek, m, ctx) => {
    const p = config.PREFIX || '.';
    const body =
`╭━━━━〔 😈 𝐏𝐑𝐀𝐍𝐊 𝐌𝐄𝐍𝐔 😈 〕━━━━╮
┃
${PRANK_LIST.map(([c, e, d]) => `┃ ${e} *${p}${c}*  ➜ ${d}`).join('\n')}
┃
┃ 🎯 Use: *${p}hack @user* ya kisi ke msg par reply karke
╰━━━━━━━━━━━━━━━━━━━━━━╯

🎭 _Ye sab prank hain — just for fun_ 😊`;
    try {
        const cm = require('./carousel-menu');
        if (cm.sendLinkCard && await cm.sendLinkCard(conn, mek, ctx.from, body)) return;
    } catch (e) { console.error('prank menu card error:', e && e.message); }
    return ctx.reply(body + `\n\n📢 ${config.CHANNEL_LINK || ''}`);
});
