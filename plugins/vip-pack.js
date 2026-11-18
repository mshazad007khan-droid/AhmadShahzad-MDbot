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
// Sab fake aur harmless. Animation edit hoti rehti hai; end mein kuch extra nahi aata.
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
const REVEAL = null;   // ab end mein "ye prank tha" nahi aata (user ki demand)

function prank({ pattern, alias, desc, build, delay = 1400 }) {
    cmd({ pattern, alias, desc, category: 'prank', react: '😈', use: `.${pattern} [@user / reply]`, filename: __filename },
        async (conn, mek, m, ctx) => {
            if (!(ctx.isCreator || ctx.isOwner || ctx.isAdmins)) return ctx.reply('*SIRF OWNER / ADMIN ❤️*');
            const jid = targetOf(m, mek, ctx);
            const mentions = jid ? [jid] : [];
            const who = jid ? '@' + numOf(jid) : 'Target';
            const frames = build(who).filter(Boolean);
            await animate(conn, ctx.from, mek, frames, delay, mentions);
        });
}
// progress-bar frames ko khud banane ka helper: steps = [[percent, 'text'], ...]
const steps = (head, list) => list.map(([p, t]) => `${head}\n\n${t}\n${bar(p)}`);
const ip = () => `${rnd(100, 199)}.${rnd(10, 250)}.${rnd(10, 250)}.${rnd(2, 250)}`;
const hex = (n) => Array.from({ length: n }, () => '0123456789ABCDEF'[rnd(0, 15)]).join('');

prank({
    pattern: 'hack', alias: ['hackprank', 'hacking', 'fakehack', 'hackme', 'hacker'], desc: 'Fake hacking animation (lambi)', delay: 1700,
    build: (who) => {
        const H = `💻 *HACKING TOOL v9.4* 💻\n🎯 Target ➜ ${who}`;
        return [
            ...steps(H, [
                [0, '🔌 Tool start ho raha hai…'],
                [4, '📶 Target phone dhoondha ja raha hai…'],
                [9, '🔌 Phone se connection ban raha hai…\n📶 Signal: Strong ✅'],
                [14, `📡 IP address mil gaya…\n🌐 ${ip()}`],
                [19, `🧬 Device scan: ${pick(['Samsung Galaxy', 'Infinix Hot', 'Tecno Spark', 'iPhone', 'Redmi Note', 'Oppo A-series'])}\n🔢 IMEI: ${rnd(350000, 359999)}${rnd(100000000, 999999999)}`],
                [25, '🛠️ Firewall bypass ho rahi hai…\n🔓 Port 8080 open\n🔓 Port 443 open'],
                [31, `🔑 Root access mil raha hai…\n📜 ${hex(24)}`],
                [37, `📂 Gallery access…\n📸 ${rnd(300, 999)} photos · 🎞️ ${rnd(20, 90)} videos mili`],
                [43, '📂 Gallery copy ho rahi hai…\n⬆️ Uploading photos…'],
                [49, `💬 WhatsApp database mil gaya…\n🗂️ ${rnd(80, 400)} chats · 👥 ${rnd(5, 40)} groups`],
                [55, '💬 Chats copy ho rahi hain…\n📤 msgstore.db → server'],
                [61, `📞 Contacts upload ho rahe hain…\n👥 ${rnd(150, 700)} contacts`],
                [67, '📞 Call history copy ho rahi hai…'],
                [73, `🔐 Saved passwords decrypt ho rahe hain…\n🔑 ${'*'.repeat(8)} ${'*'.repeat(6)}`],
                [79, '🔐 Facebook / Instagram sessions mil gaye…'],
                [85, '📍 Live location track ho rahi hai…'],
                [91, '📤 Sara data server par bheja ja raha hai…'],
                [96, '🧹 Traces mitaye ja rahe hain…'],
                [100, '✅ *HACK COMPLETE!* 😈\n🔒 Sara data mere paas hai']
            ]),
            `⏳ …ab phone ka sara data *delete* ho raha hai…\n🗑️ Photos… 🗑️ Chats… 🗑️ Contacts…`,
            `🗑️ Deleting… ${bar(35)}\n😨`,
            `🗑️ Deleting… ${bar(78)}\n😨😨`,
            `☠️ *SYSTEM DESTROYED* ☠️\n${bar(100)}\n📵 Phone 10 second mein restart hoga…`
        ];
    }
});
prank({
    pattern: 'virus', alias: ['virusprank', 'fakevirus', 'virusscan', 'viruss'], desc: 'Fake virus detected animation (lambi)', delay: 1600,
    build: (who) => {
        const H = `🛡️ *PHONE SECURITY SCAN*\n👤 ${who}`;
        return [
            ...steps(H, [
                [0, '🔍 Scan start…'],
                [8, `📁 System files scan ho rahi hain… (${rnd(1200, 4000)} files)`],
                [17, '📁 Apps scan ho rahe hain…'],
                [26, `⚠️ *WARNING!* Suspicious file mili\n🦠 Trojan.Agent.X`],
                [35, `⚠️ ${rnd(3, 9)} threats mile!\n🦠 Trojan.Agent.X\n🦠 Spy.Whats.Stealer`],
                [44, '🦠 Worm.Sms.Spread\n🦠 Keylogger.Android.7'],
                [53, '🚨 *DANGER!* Virus phone mein phail raha hai…\n🚨🚨🚨'],
                [62, '📵 Battery tezi se drain ho rahi hai…\n🔋 41% → 29% → 12%'],
                [71, '💾 Photos corrupt ho rahi hain…'],
                [79, '💬 WhatsApp chats lock ho rahi hain…'],
                [87, '📞 Contacts ko virus bheja ja raha hai…'],
                [94, '🧯 Antivirus fail ho gaya ❌'],
                [100, '☠️ *SYSTEM FAILURE* ☠️']
            ]),
            `🔴 Virus ne phone par control le liya…\n⚠️ Phone 1 minute mein band ho jayega!`,
            `📵 …\n⚠️ Phone ko foran band mat karna…`,
            `💀 *CRITICAL ERROR 0x${hex(6)}* 💀`
        ];
    }
});
prank({
    pattern: 'bomb', alias: ['bombprank', 'fakebomb'], desc: 'Fake bomb countdown (lambi)', delay: 1300,
    build: (who) => [
        `💣 *BOMB ACTIVATED* 💣\n🎯 ${who}\n⏱️ Timer set: 20 sec`,
        `🔴 Timer chalu ho gaya…\n📡 Detonator connect ho gaya`,
        ...[20, 19, 18, 17, 16, 15, 14, 13, 12, 11].map(n => `💣 ${n}…  ${n > 15 ? '😏' : '😬'}`),
        ...[10, 9, 8, 7, 6].map(n => `💣 ${n}…  😨\n${bar((20 - n) * 5)}`),
        ...[5, 4, 3, 2, 1].map((n, i) => `💣 *${n}…*  ${['😱', '😰', '🥶', '😭', '💀'][i]}\n${'🔴'.repeat(6 - n)}`),
        `⚡ ⚡ ⚡`,
        `💥💥💥 *BOOOOOOM!* 💥💥💥`,
        `🔥🔥🔥🔥🔥🔥\n🌫️ Dhuan hi dhuan…\n💀 ${who} ka phone udd gaya 💀`
    ]
});
prank({
    pattern: 'ghost', alias: ['ghostprank', 'scareprank', 'darao', 'scare'], desc: 'Darawna ghost sequence (lambi)', delay: 2000,
    build: (who) => [
        `🌑 Andhera ho raha hai…`,
        `🌑🌑 Bijli chali gayi…`,
        `🕯️ ${who}… kya tumne kuch suna?`,
        `👂 Door se kisi ke ronay ki awaaz aa rahi hai…`,
        `🕯️ Mombatti khud-ba-khud bujh gayi…`,
        `👂 Peeche se kisi ke chalne ki awaaz aa rahi hai…`,
        `🦶 …qadmon ki awaaz qareeb aa rahi hai…`,
        `🚪 Darwaza khud-ba-khud khul gaya…`,
        `🌬️ Thandi hawa ka jhonka…`,
        `👁️ …koi tumhe dekh raha hai…`,
        `🩸 Pichhe mudh ke mat dekhna 😶`,
        `😨 Wo bilkul tumhare peeche hai…`,
        `😨😨 Uski saansein tumhari gardan par mehsoos ho rahi hain…`,
        `💀 Wo kuch keh raha hai…\n"${who}… ${who}…"`,
        `👻 *BHOOOOOO!!!* 👻👻👻`,
        `👻👻👻👻👻👻👻👻\n😱 *Wo tumhare saath hi hai* 😱`
    ]
});
prank({
    pattern: 'track', alias: ['locationprank', 'trackprank', 'fakelocation', 'tracker'], desc: 'Fake location tracking (lambi)', delay: 1700,
    build: (who) => {
        const H = `📍 *LIVE TRACKER*\n🎯 ${who}`;
        const lat = (24 + Math.random() * 8).toFixed(4), lng = (66 + Math.random() * 9).toFixed(4);
        return [
            ...steps(H, [
                [3, '🛰️ Satellite se connect ho raha hai…'],
                [12, '🛰️ 4 satellites mil gaye…'],
                [22, '📡 Phone ka signal pakda gaya…'],
                [33, `📡 Tower triangulation…\n🗼 Tower ID: ${rnd(1000, 9999)}-${rnd(10, 99)}`],
                [45, `🌍 Country: Pakistan 🇵🇰\n🏙️ Shehar dhoondha ja raha hai…`],
                [58, `🗺️ Lat: ${lat}  Lng: ${lng}`],
                [70, '🗺️ Gali / mohalla dhoondha ja raha hai…'],
                [82, '🏠 Location mil gayi: *tumhare ghar ke bilkul paas* 👀'],
                [92, '📸 Camera access try ho raha hai…'],
                [100, '📌 *LOCATION LOCKED* — Main tumhe dekh sakta hoon 😈']
            ]),
            `👁️ Tum abhi apne phone ko dekh rahe ho…\n😶 Hilna mat…`,
            `📍 Live tracking *ON* hai…\n🔴 Recording…`
        ];
    }
});
prank({
    pattern: 'police', alias: ['policeprank', 'fir', 'fakepolice', 'arrestprank'], desc: 'Fake police notice (lambi)', delay: 1900,
    build: (who) => [
        `🚓 *POLICE ALERT* 🚓\n👤 ${who}`,
        `🚨 Cyber Crime Wing se message aa raha hai…`,
        `📋 Aap ke number ke khilaf *shikayat* darj hui hai…`,
        `📋 FIR No: ${rnd(100, 999)}/${rnd(23, 26)}\n⚖️ Dafa: PECA 2016 – Cyber Crime`,
        `🔎 Aap ke number ki detail check ho rahi hai…\n${bar(30)}`,
        `📞 SIM ka record nikala ja raha hai…\n${bar(55)}`,
        `📍 Aap ki location trace ho rahi hai…\n${bar(78)}`,
        `🚔 Gaari rawana kar di gayi hai…\n${bar(92)}`,
        `😨 Aap ko *5 minute* ke andar thane aana hoga!`,
        `⏳ Time bacha: 04:00…`,
        `⏳ Time bacha: 02:30…  😰`,
        `🚓🚓 Police aap ke ghar ke bahar hai…\n🚨🚨🚨`
    ]
});
prank({
    pattern: 'simblock', alias: ['simprank', 'numberblock', 'fakeblock', 'blockprank'], desc: 'Fake SIM block warning (lambi)', delay: 1700,
    build: (who) => [
        `📵 *SIM STATUS CHECK*\n👤 ${who}`,
        `🔍 SIM verification check chal raha hai…\n${bar(15)}`,
        `⚠️ Aap ki SIM *24 ghante mein block* hone wali hai!\n${bar(30)}`,
        `📄 Wajah: CNIC verification pending…\n${bar(45)}`,
        `📶 Network band hone ka time shuru…\n${bar(60)}`,
        `⏳ Block hone mein: 00:10:00…\n${bar(70)}`,
        `⏳ Block hone mein: 00:02:00…\n${bar(82)}`,
        `⏳ Block hone mein: 00:00:30…  😰\n${bar(92)}`,
        `⏳ 00:00:10…`,
        `⏳ 00:00:03…  😱`,
        `📵 *SIM BLOCKED* 📵\n❌ Calls · ❌ SMS · ❌ Internet`
    ]
});
prank({
    pattern: 'battery', alias: ['batteryprank', 'phoneblast', 'blastprank'], desc: 'Fake phone overheating (lambi)', delay: 1600,
    build: (who) => [
        `🔋 *BATTERY MONITOR*\n👤 ${who}\n${bar(70)}`,
        `🔋 Battery: 68%  ↘️\n🌡️ Temperature: ${rnd(38, 40)}°C`,
        `🌡️ Temperature: ${rnd(41, 44)}°C ⚠️\nPhone thora garam hai…`,
        `🌡️ Temperature: ${rnd(45, 48)}°C ⚠️⚠️\nCharging ruk gayi…`,
        `🔥 Temperature: ${rnd(49, 55)}°C 🔥\nPhone garam ho raha hai!`,
        `🔥🔥 Temperature: ${rnd(56, 62)}°C 🔥🔥\nBattery phool rahi hai…`,
        `🚨 *OVERHEATING!* 🚨\nPhone ko foran band karo!`,
        `🚨🚨 Hath se phone chhod do!! 🚨🚨`,
        `💥 5…`, `💥 4…`, `💥 3…`, `💥 2…`, `💥 1…`,
        `💥💥💥 *BLAST!* 💥💥💥\n🔥🔥🔥`
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

`;
    try {
        const cm = require('./carousel-menu');
        if (cm.sendLinkCard && await cm.sendLinkCard(conn, mek, ctx.from, body)) return;
    } catch (e) { console.error('prank menu card error:', e && e.message); }
    return ctx.reply(body + `\n\n📢 ${config.CHANNEL_LINK || ''}`);
});
