// plugins/vip-system.js — VIP system: .vip .vipmenu .addvip .delvip .viplist .vipcheck
const { cmd } = require('../arslan');
const config = require('../config');
const vip = require('../lib/vipstore');
const { getBotPic } = require('../lib/botpic');
const { tag } = require('../lib/v10util');

const SECTION_ICONS = { prank: '😈', fun: '🎭', voicechange: '🎙️', photoedit: '🖼️', videoedit: '🎬', audioedit: '🎧', textfx: '✨', tools: '🧰', games: '🎮', group: '👥', love: '💞' };

function vipCardText(conn, ctx) {
    const p = config.PREFIX || '.';
    const by = {};
    for (const c of vip.registry) (by[c.category] = by[c.category] || []).push(c.pattern);
    const total = vip.registry.length;
    const me = vip.isVip(conn, ctx);
    let t = `╭━━━━〔 💎 𝐕𝐈𝐏 𝐂𝐀𝐑𝐃 💎 〕━━━━╮\n`;
    t += `┃ 👤 ${ctx.pushname || 'User'}\n┃ 🎖️ Status: ${me ? '✅ VIP ACTIVE' : '❌ Normal User'}\n┃ 💎 VIP Commands: ${total}\n╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;
    for (const [cat, list] of Object.entries(by)) {
        t += `${SECTION_ICONS[cat] || '📌'} *${cat.toUpperCase()}*\n`;
        t += list.map(x => `  ◦ ${p}${x}`).join('\n') + '\n\n';
    }
    t += `⚙️ *VIP Manage (owner):*\n  ◦ ${p}addvip @user [din]\n  ◦ ${p}delvip @user\n  ◦ ${p}viplist\n  ◦ ${p}vipcheck [@user]\n\n`;
    t += `👑 VIP lene ke liye: ${p}owner\n✦ Powered By ${config.BOT_NAME || 'AhmadShahzad-MD'} ✦`;
    return t;
}

async function sendCard(conn, mek, ctx) {
    const text = vipCardText(conn, ctx);
    try { return await conn.sendMessage(ctx.from, { image: getBotPic(conn), caption: text }, { quoted: mek }); }
    catch (_) { return ctx.reply(text); }
}

cmd({ pattern: 'vipmenu', alias: ['vip', 'vipcard', 'vipcmds', 'viphelp'], desc: '💎 VIP card — saari VIP commands', category: 'vip', react: '💎', use: '.vipmenu', filename: __filename },
    async (conn, mek, m, ctx) => sendCard(conn, mek, ctx));

function parseTarget(ctx, args) {
    if (ctx.mentionedJid && ctx.mentionedJid[0]) return ctx.mentionedJid[0];
    if (ctx.quotedTarget) return ctx.quotedTarget;
    const n = args.find(a => /^\+?\d{7,15}$/.test(a));
    return n ? n.replace(/\D/g, '') + '@s.whatsapp.net' : null;
}

cmd({ pattern: 'addvip', alias: ['vipadd', 'setvip', 'givevip'], desc: '💎 User ko VIP banao (owner) — .addvip @user 30', category: 'vip', react: '💎', use: '.addvip @user [din]', filename: __filename },
    async (conn, mek, m, ctx) => {
        if (!(ctx.isOwner || ctx.isCreator)) return ctx.reply('⛔ Yeh command sirf bot owner ke liye hai.');
        const jid = parseTarget(ctx, ctx.args);
        if (!jid) return ctx.reply('📌 Use: `.addvip @user 30` (30 din) ya `.addvip 923001234567` (lifetime) ya kisi ke message par reply.');
        const daysArg = ctx.args.map(a => String(a).replace(/\D/g, '')).filter(a => a && a.length <= 4).pop();
        const days = daysArg ? Math.min(3650, parseInt(daysArg, 10)) : 0;
        const r = vip.add(conn, jid, days);
        if (!r) return ctx.reply('❌ Number samajh nahi aaya.');
        await conn.sendMessage(ctx.from, { text: `💎 *VIP ACTIVATED*\n\n👤 ${tag(jid)}\n⏳ ${vip.fmtExpiry(r.expires)}\n\nAb ye VIP commands chala sakta hai: \`.vipmenu\``, mentions: [jid] }, { quoted: mek });
    });

cmd({ pattern: 'delvip', alias: ['vipdel', 'removevip', 'rmvip'], desc: '💎 VIP hata do (owner)', category: 'vip', react: '🗑️', use: '.delvip @user', filename: __filename },
    async (conn, mek, m, ctx) => {
        if (!(ctx.isOwner || ctx.isCreator)) return ctx.reply('⛔ Yeh command sirf bot owner ke liye hai.');
        const jid = parseTarget(ctx, ctx.args);
        if (!jid) return ctx.reply('📌 Use: `.delvip @user` ya number ya reply.');
        const ok = vip.remove(conn, jid);
        await conn.sendMessage(ctx.from, { text: ok ? `🗑️ ${tag(jid)} ka VIP khatam.` : `ℹ️ ${tag(jid)} VIP list me nahi tha.`, mentions: [jid] }, { quoted: mek });
    });

cmd({ pattern: 'viplist', alias: ['vips', 'vipusers', 'listvip'], desc: '💎 Saare VIP users ki list (owner)', category: 'vip', react: '📋', use: '.viplist', filename: __filename },
    async (conn, mek, m, ctx) => {
        if (!(ctx.isOwner || ctx.isCreator)) return ctx.reply('⛔ Yeh command sirf bot owner ke liye hai.');
        const l = vip.list(conn);
        if (!l.length) return ctx.reply('📋 Abhi koi VIP nahi hai.\n`.addvip @user 30` se banao.');
        const jids = l.map(x => x.user + '@s.whatsapp.net');
        await conn.sendMessage(ctx.from, { text: `💎 *VIP LIST (${l.length})*\n\n` + l.map((x, i) => `${i + 1}. @${x.user} — ${vip.fmtExpiry(x.expires)}`).join('\n'), mentions: jids }, { quoted: mek });
    });

cmd({ pattern: 'vipcheck', alias: ['isvip', 'vipstatus', 'checkvip'], desc: '💎 VIP status check karo', category: 'vip', react: '🔎', use: '.vipcheck [@user]', filename: __filename },
    async (conn, mek, m, ctx) => {
        const jid = parseTarget(ctx, ctx.args);
        if (!jid) return ctx.reply(vip.isVip(conn, ctx) ? '✅ Aap VIP ho 💎' : '❌ Aap VIP nahi ho. VIP ke liye `.owner`');
        const i = vip.info(conn, jid);
        await conn.sendMessage(ctx.from, { text: i ? `✅ ${tag(jid)} VIP hai — ${vip.fmtExpiry(i.expires)}` : `❌ ${tag(jid)} VIP nahi hai.`, mentions: [jid] }, { quoted: mek });
    });
