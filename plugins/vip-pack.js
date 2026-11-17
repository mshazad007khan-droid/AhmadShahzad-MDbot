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
// animation: pehla message bhejo, phir edit karte jao (edit na chale to naya message)
async function animate(conn, chat, quoted, frames, delayMs, mentions) {
    let sent = await conn.sendMessage(chat, { text: frames[0], mentions }, { quoted });
    for (let i = 1; i < frames.length; i++) {
        await sleep(delayMs);
        try { await conn.sendMessage(chat, { text: frames[i], edit: sent.key, mentions }); }
        catch (_) { sent = await conn.sendMessage(chat, { text: frames[i], mentions }); }
    }
}
const bar = (p) => { const f = Math.round(p / 10); return '█'.repeat(f) + '░'.repeat(10 - f) + ` ${p}%`; };

// target: reply kiya hua banda / mention / jis chat mein ho
function targetOf(m, mek, ctx) {
    const ctxInfo = (mek.message && (mek.message.extendedTextMessage || {}).contextInfo) || {};
    const jid = (ctxInfo.mentionedJid && ctxInfo.mentionedJid[0]) || (m.quoted && (m.quoted.sender || m.quoted.participant)) || (!ctx.isGroup ? ctx.from : null);
    return jid || null;
}
const numOf = (jid) => String(jid || '').split('@')[0].split(':')[0];
const REVEAL = '😂 *PRANK!* 😂\nDarna mat — ye sab *fake* tha, koi hack / virus / khatra nahi hai 🤭';

function prank({ pattern, alias, desc, build, delay = 1500 }) {
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
    pattern: 'hackprank', alias: ['hacking', 'fakehack', 'hackme'], desc: 'Fake hacking animation (prank)',
    build: (who) => [
        `💻 *HACKING STARTED…*\n🎯 Target: ${who}\n${bar(0)}`,
        `💻 Phone connect ho raha hai…\n${bar(15)}`,
        `📡 IP address nikal raha hai…\n🌐 192.168.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}\n${bar(30)}`,
        `📂 Gallery access kar raha hoon…\n📸 ${100 + Math.floor(Math.random() * 900)} photos mili\n${bar(52)}`,
        `💬 WhatsApp chats copy ho rahi hain…\n${bar(74)}`,
        `🔓 Passwords decrypt ho rahe hain…\n${bar(91)}`,
        `✅ *HACK COMPLETE!* ${bar(100)}\n\n${REVEAL}`
    ]
});
prank({
    pattern: 'virusprank', alias: ['fakevirus', 'virusscan', 'viruss'], desc: 'Fake virus detected animation (prank)',
    build: (who) => [
        `🛡️ *PHONE SCAN* — ${who}\n${bar(0)}`,
        `🛡️ Scanning…\n${bar(40)}`,
        `⚠️ *WARNING!* ${3 + Math.floor(Math.random() * 6)} virus mile hain!\n🦠 Trojan.Agent.X\n🦠 Spy.Whats.Stealer\n${bar(70)}`,
        `🚨 *DANGER!* Phone ka data leak ho raha hai…\n🚨🚨🚨\n${bar(95)}`,
        `✅ Scan complete\n\n${REVEAL}`
    ]
});
prank({
    pattern: 'bombprank', alias: ['bomb', 'fakebomb'], desc: 'Fake bomb countdown (prank)', delay: 1300,
    build: (who) => [
        `💣 *BOMB ACTIVATED* — ${who}`,
        '💣 10…', '💣 9…', '💣 8…', '💣 7…', '💣 6…', '💣 5… 😨', '💣 4… 😱', '💣 3… 😰', '💣 2… 🥶', '💣 1… 💀',
        `💥💥 *BOOOOM!* 💥💥\n\n${REVEAL}`
    ]
});
prank({
    pattern: 'ghostprank', alias: ['ghost', 'scareprank', 'darao', 'scare'], desc: 'Darawna ghost sequence (prank)', delay: 1700,
    build: (who) => [
        `🌑 Andhera ho raha hai…`,
        `🕯️ ${who}… kya tumne kuch suna?`,
        `👂 Peeche se kisi ke chalne ki awaaz aa rahi hai…`,
        `👁️ …wo tumhe dekh raha hai…`,
        `🩸 Pichhe mudh ke mat dekhna 😶`,
        `👻 *BHOOOOOO!!!* 👻👻👻\n\n${REVEAL}`
    ]
});
prank({
    pattern: 'locationprank', alias: ['trackprank', 'fakelocation', 'tracker'], desc: 'Fake location tracking (prank)',
    build: (who) => [
        `📍 *TRACKING ${who}…*\n${bar(10)}`,
        `🛰️ Satellite connect ho gayi…\n${bar(45)}`,
        `🗺️ Location mil gayi: *tumhare ghar ke bilkul paas* 👀\n${bar(85)}`,
        `📌 Main tumhe dekh sakta hoon 😈\n\n${REVEAL}`
    ]
});
prank({
    pattern: 'policeprank', alias: ['fir', 'fakepolice', 'arrestprank'], desc: 'Fake police notice (prank)', delay: 1800,
    build: (who) => [
        `🚓 *POLICE ALERT* — ${who}`,
        `🚨 Aap ke khilaf shikayat darj ho gayi hai…`,
        `📞 Cyber Crime team aap ke number ko trace kar rahi hai…`,
        `😨 Aap ko 5 minute mein thane aana hoga!`,
        `😂 *PRANK!* Dost mazak tha 🤭\nKoi police nahi aa rahi — fake message tha.`
    ]
});
prank({
    pattern: 'simprank', alias: ['numberblock', 'fakeblock', 'blockprank'], desc: 'Fake SIM block warning (prank)',
    build: (who) => [
        `📵 *SIM STATUS* — ${who}`,
        `⚠️ Aap ki SIM *24 ghante mein block* hone wali hai!\n${bar(30)}`,
        `⏳ Block hone mein: 00:00:10…\n${bar(80)}`,
        `😂 Sirf mazak! SIM bilkul theek hai 🤭\n\n${REVEAL}`
    ]
});
