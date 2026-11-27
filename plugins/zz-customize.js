// plugins/zz-customize.js — 🎨 CUSTOMIZE section (menu mein alag category)
//  Har user (paired number) apne bot ko apna bana sakta hai — settings SIRF us ke session ki hoti hain:
//   .botname <naam>        .botpic (photo)         .botdescription <text>
//   .ownername <naam>      .ownerpic (photo)       .ownernumber <number>
//   .mybrand (dekho)       .resetbrand (sab default)
//  Naam ek baar set karo → menu, alive, video/song/search ke captions, footer, owner card — har message mein wahi naam.
//  Dobara pair (naya pairing / logout) karne par sab kuch khud reset ho jata hai (main.js).
const { cmd } = require('../ahmadcore');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const UB = require('../lib/userbrand');
const botpic = require('../lib/botpic');

const P = (ctx) => (ctx && ctx.config && ctx.config.PREFIX) || '.';
const CAT = 'customize';
const OWNER_ONLY = '⛔ Ye command sirf bot ke owner (jis number se bot paired hai) ke liye hai.';

// ───────── helpers ─────────
function unwrap(message) {
    let m = message || {};
    for (let i = 0; i < 4; i++) {
        const inner = m.ephemeralMessage?.message || m.viewOnceMessage?.message || m.viewOnceMessageV2?.message || m.documentWithCaptionMessage?.message;
        if (!inner) break;
        m = inner;
    }
    return m;
}
function pickImage(mek) {
    const m = unwrap(mek && mek.message);
    const ci = m.extendedTextMessage?.contextInfo || m.imageMessage?.contextInfo || null;
    return m.imageMessage || (ci && unwrap(ci.quotedMessage).imageMessage) || null;
}
async function downloadImage(imgMsg) {
    const stream = await downloadContentFromMessage(imgMsg, 'image');
    const chunks = [];
    for await (const c of stream) chunks.push(c);
    return Buffer.concat(chunks);
}
async function fetchImage(url) {
    const axios = require('axios');
    const r = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000, maxContentLength: 15 * 1024 * 1024, headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!/^image\//i.test(String(r.headers['content-type'] || ''))) throw new Error('link image nahi hai');
    return Buffer.from(r.data);
}
const firstUrl = (q) => ((String(q || '').match(/https?:\/\/\S+/)) || [])[0];
const isReset = (q) => /^(reset|default|off|remove|delete|hatao|clear)$/i.test(String(q || '').trim());
const guard = (ctx) => { if (!ctx.isOwner) { ctx.reply(OWNER_ONLY); return false; } return true; };
const show = (v, d) => v ? `*${v}*` : `${d} _(default)_`;

function summary(conn, ctx) {
    const b = UB.peek(conn), p = P(ctx);
    const hasBotPic = (() => { try { return require('fs').existsSync(require('path').join(process.env.DATA_DIR || require('path').join(__dirname, '..', 'data'), 'botpics', UB.numOf(conn) + '.jpg')); } catch (_) { return false; } })();
    return `🎨 *CUSTOMIZE — APNA BOT APNE NAAM SE*\n\n` +
        `🤖 Bot name: ${show(b.bot, UB.DEF_BOT)}\n` +
        `🖼️ Bot pic: ${hasBotPic ? '*custom*' : '_default_'}\n` +
        `📝 Description: ${b.desc ? `*${b.desc}*` : '_set nahi_'}\n` +
        `👑 Owner name: ${show(b.owner, UB.DEF_OWNER)}\n` +
        `🖼️ Owner pic: ${UB.getOwnerPicPath(conn) ? '*custom*' : '_default_'}\n` +
        `📞 Owner number: ${b.ownerNumber ? `*+${b.ownerNumber}*` : `+${UB.DEF_NUMBER} _(default)_`}\n\n` +
        `*Commands*\n` +
        `• ${p}botname <naam>\n• ${p}botpic (photo reply / link)\n• ${p}botdescription <text>\n` +
        `• ${p}ownername <naam>\n• ${p}ownerpic (photo reply / link)\n• ${p}ownernumber <number>\n` +
        `• ${p}resetbrand — sab default\n\n` +
        `_Har command ke saath "reset" likho to wo cheez default ho jayegi (jaise ${p}botname reset)._\n` +
        `_Aapka naam menu, alive, download / search ke captions aur footer — sab jagah aayega. Sirf aapke bot par, dusre users par nahi._`;
}

// ───────── .customize / .mybrand ─────────
cmd({
    pattern: 'customize',
    alias: ['custom', 'mybrand', 'brand', 'branding', 'customizemenu'],
    desc: 'Customize menu — bot name / pic / owner / description (aapke apne bot ke liye)',
    category: CAT,
    react: '🎨',
    use: '.customize',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    await UB.load(conn);
    return ctx.reply(summary(conn, ctx));
});

// ───────── .botname ─────────
cmd({
    pattern: 'botname',
    alias: ['setbotnamemenu', 'mybotname'],
    desc: 'Bot ka naam badlo (menu + sab captions mein aapka naam)',
    category: CAT,
    react: '✏️',
    use: '.botname Ali-MD',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    if (!guard(ctx)) return;
    const q = String(ctx.q || '').trim(), p = P(ctx);
    await UB.load(conn);
    if (!q) return ctx.reply(`✏️ *BOT NAME*\n\nAbhi: ${show(UB.peek(conn).bot, UB.DEF_BOT)}\n\nSet: *${p}botname Ali-MD*\nDefault: *${p}botname reset*`);
    if (isReset(q)) { await UB.setBotName(conn, ''); return ctx.reply('✅ Bot ka naam default par wapas aa gaya.'); }
    if (q.length > 40) return ctx.reply('❌ Naam 40 characters se chhota rakho.');
    await UB.setBotName(conn, q);
    return ctx.reply(`✅ *Bot ka naam set ho gaya:* ${q}\n\nAb menu, alive, video / song / search ke captions aur footer — sab mein yehi naam aayega.`);
});

// ───────── .botpic ─────────
cmd({
    pattern: 'botpic',
    alias: ['setbotpicture2', 'mybotpic'],
    desc: 'Bot ki menu / alive photo badlo (photo reply ya link)',
    category: CAT,
    react: '🖼️',
    use: '.botpic (photo reply)  |  .botpic <link>',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    if (!guard(ctx)) return;
    const p = P(ctx), q = String(ctx.q || '').trim();
    if (isReset(q)) { botpic.resetBotPic(conn); return ctx.reply('✅ Bot ki photo default par wapas aa gayi.'); }
    const imgMsg = pickImage(mek), url = firstUrl(q);
    if (!imgMsg && !url) return ctx.reply(`🖼️ *BOT PIC*\n\n• Kisi photo ko reply karke *${p}botpic*\n• Ya photo bhejte waqt caption mein *${p}botpic*\n• Ya link: *${p}botpic https://.../pic.jpg*\n• Default: *${p}botpic reset*\n\n(WhatsApp ki apni profile photo ke liye *${p}setpp* use karein.)`);
    try {
        await ctx.reply('⏳ Bot ki photo update ho rahi hai...');
        if (imgMsg) await botpic.setBotPicFromBuffer(conn, await downloadImage(imgMsg));
        else await botpic.setBotPicFromUrl(conn, url);
        await conn.sendMessage(ctx.from, { image: botpic.getBotPic(conn), caption: '✅ *Bot ki photo set ho gayi!*\nAb menu / alive mein yehi aayegi.' }, { quoted: mek });
    } catch (e) { return ctx.reply('❌ Photo set nahi hui: ' + String(e.message).slice(0, 160)); }
});

// ───────── .botdescription ─────────
cmd({
    pattern: 'botdescription',
    alias: ['botdesc', 'botdis', 'botdiscription', 'setbotdescription', 'setbotdesc'],
    desc: 'Bot ki description likho (menu profile card + alive mein dikhegi)',
    category: CAT,
    react: '📝',
    use: '.botdescription Mera apna WhatsApp bot',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    if (!guard(ctx)) return;
    const q = String(ctx.q || '').trim(), p = P(ctx);
    await UB.load(conn);
    if (!q) return ctx.reply(`📝 *BOT DESCRIPTION*\n\nAbhi: ${UB.peek(conn).desc ? `*${UB.peek(conn).desc}*` : '_set nahi_'}\n\nSet: *${p}botdescription Mera apna bot*\nHatana: *${p}botdescription reset*`);
    if (isReset(q)) { await UB.setDesc(conn, ''); return ctx.reply('✅ Description hata di.'); }
    if (q.length > 200) return ctx.reply('❌ Description 200 characters se chhoti rakho.');
    await UB.setDesc(conn, q);
    return ctx.reply(`✅ *Description set ho gayi:*\n${q}`);
});

// ───────── .ownername ─────────
cmd({
    pattern: 'ownername',
    alias: ['setownername', 'changeownername'],
    desc: 'Owner ka naam badlo (menu, alive, owner card)',
    category: CAT,
    react: '👑',
    use: '.ownername Ali Khan',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    if (!guard(ctx)) return;
    const q = String(ctx.q || '').trim(), p = P(ctx);
    await UB.load(conn);
    if (!q) return ctx.reply(`👑 *OWNER NAME*\n\nAbhi: ${show(UB.peek(conn).owner, UB.DEF_OWNER)}\n\nSet: *${p}ownername Ali Khan*\nDefault: *${p}ownername reset*`);
    if (isReset(q)) { await UB.setOwnerName(conn, ''); return ctx.reply('✅ Owner ka naam default par wapas aa gaya.'); }
    if (q.length > 40) return ctx.reply('❌ Naam 40 characters se chhota rakho.');
    await UB.setOwnerName(conn, q);
    return ctx.reply(`✅ *Owner ka naam set ho gaya:* ${q}`);
});

// ───────── .ownerpic ─────────
cmd({
    pattern: 'ownerpic',
    alias: ['setownerpic', 'ownerphoto', 'setownerphoto'],
    desc: 'Owner ki photo lagao (menu owner card, alive, welcome card)',
    category: CAT,
    react: '🖼️',
    use: '.ownerpic (photo reply)  |  .ownerpic <link>  |  .ownerpic on/off/reset',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    if (!guard(ctx)) return;
    const p = P(ctx), q = String(ctx.q || '').trim();
    const W = require('../lib/welcome');
    if (/^(on|off)$/i.test(q)) {   // purani on/off command: welcome card par owner photo
        if (!W.hasOwnerPic(conn)) return ctx.reply(`ℹ️ Pehle photo set karo: *${p}ownerpic* (photo reply karke)`);
        W.setOwnerPicEnabled(conn, /^on$/i.test(q));
        return ctx.reply(`✅ Welcome card par owner photo ab *${q.toUpperCase()}* hai.`);
    }
    if (isReset(q)) { UB.clearOwnerPic(conn); return ctx.reply('✅ Owner ki photo hata di (default wapas).'); }
    const imgMsg = pickImage(mek), url = firstUrl(q);
    if (!imgMsg && !url) return ctx.reply(`🖼️ *OWNER PIC*\n\n• Apni photo ko reply karke *${p}ownerpic*\n• Ya photo bhejte waqt caption mein *${p}ownerpic*\n• Ya link: *${p}ownerpic https://.../me.jpg*\n• Hatana: *${p}ownerpic reset*\n• Welcome card par on/off: *${p}ownerpic on* / *off*`);
    try {
        await ctx.reply('⏳ Owner ki photo set ho rahi hai...');
        const buf = imgMsg ? await downloadImage(imgMsg) : await fetchImage(url);
        const file = await UB.setOwnerPic(conn, buf);
        await conn.sendMessage(ctx.from, { image: { url: file }, caption: '✅ *Owner ki photo set ho gayi!*\nMenu ke owner card, alive aur welcome card par yehi aayegi.' }, { quoted: mek });
    } catch (e) { return ctx.reply('❌ Photo set nahi hui: ' + String(e.message).slice(0, 160)); }
});

// ───────── .ownernumber ─────────
cmd({
    pattern: 'ownernumber',
    alias: ['setownernumber', 'changeownernumber'],
    desc: 'Owner ka number badlo (menu, alive, owner card mein dikhne wala)',
    category: CAT,
    react: '📞',
    use: '.ownernumber 923001234567',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    if (!guard(ctx)) return;
    const q = String(ctx.q || '').trim(), p = P(ctx);
    await UB.load(conn);
    const cur = UB.peek(conn).ownerNumber;
    if (!q) return ctx.reply(`📞 *OWNER NUMBER*\n\nAbhi: *+${cur || UB.DEF_NUMBER}*${cur ? '' : ' _(default)_'}\n💬 https://wa.me/${cur || UB.DEF_NUMBER}\n\nSet: *${p}ownernumber 923001234567* (country code ke saath, bina +)\nDefault: *${p}ownernumber reset*\n\n_Ye sirf dikhne wala number hai — bot ko control karne ka haq isse nahi badalta._`);
    if (isReset(q)) { await UB.setOwnerNumber(conn, ''); return ctx.reply('✅ Owner number default par wapas aa gaya.'); }
    let n = q.replace(/\D/g, '');
    if (n.startsWith('00')) n = n.slice(2);
    if (n.startsWith('0')) n = String((ctx.config && ctx.config.DEFAULT_COUNTRY_CODE) || '92') + n.slice(1);
    if (n.length < 8 || n.length > 15) return ctx.reply(`❌ Sahi number likho, country code ke saath.\nMisal: *${p}ownernumber 923001234567*`);
    await UB.setOwnerNumber(conn, n);
    return ctx.reply(`✅ *Owner number set ho gaya:* +${n}\n💬 https://wa.me/${n}`);
});

// ───────── .resetbrand ─────────
cmd({
    pattern: 'resetbrand',
    alias: ['brandreset', 'resetcustom', 'resetcustomize', 'resetbranding'],
    desc: 'Customize ki saari settings default par (naam, pic, owner, description)',
    category: CAT,
    react: '♻️',
    use: '.resetbrand',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    if (!guard(ctx)) return;
    await UB.setKeys(conn, { MENU_BOT_NAME: '', MENU_OWNER_NAME: '', OWNER_NAME: '', BR_OWNER_NUMBER: '', BR_DESC: '' });
    botpic.resetBotPic(conn);
    UB.clearOwnerPic(conn);
    return ctx.reply('✅ *Customize reset ho gaya* — bot naam, photo, owner naam / photo / number aur description sab default par.');
});

console.log('[AhmadShahzad-MD] customize loaded');
