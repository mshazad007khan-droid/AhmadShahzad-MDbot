// lib/chforward.js (v13) — .chforward ka asli engine
//
// PURANA BUG: `forward: { key: <string>, message: quoted }` — Baileys ko key OBJECT chahiye, aur channel ki media
// ki mediaKey hoti hi nahi, isliye bot "forward ho gaya" likh deta tha magar message group mein pahunchta nahi tha.
// AB: replied message ki media (gaana / voice / video / photo / sticker / document) khud download karke
//     NAYI media ki tarah target par bheji jati hai (channel ki bina-key wali media seedha CDN se). Text bhi chalta hai.
const axios = require('axios');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function getContext(mek) {
    const msg = mek.message || {};
    for (const k of Object.keys(msg)) {
        const v = msg[k];
        if (v && typeof v === 'object' && v.contextInfo && v.contextInfo.quotedMessage) return v.contextInfo;
    }
    return null;
}
function unwrap(m) {
    let x = m || {};
    for (let i = 0; i < 5; i++) {
        const nx = (x.ephemeralMessage || x.viewOnceMessage || x.viewOnceMessageV2 || x.viewOnceMessageV2Extension || x.documentWithCaptionMessage || x.editedMessage || {}).message;
        if (!nx) break; x = nx;
    }
    return x;
}

// "1203630xxxx-1234@g.us" | "1203630xxxx" | "923001234567" | "@newsletter" | "https://chat.whatsapp.com/xxxx"
async function resolveTarget(conn, raw, here) {
    let t = String(raw || '').trim();
    if (!t) return null;
    if (/^(here|this|yahan|yaha)$/i.test(t)) return here;
    const inv = t.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/i);
    if (inv) { try { const info = await conn.groupGetInviteInfo(inv[1]); return info && info.id; } catch (_) { return null; } }
    if (t.includes('@')) return t;
    t = t.replace(/[^\d-]/g, '');
    if (!t) return null;
    if (t.includes('-')) return t + '@g.us';
    if (t.length >= 18) return t + '@g.us';          // lambi numeric id = group
    return t + '@s.whatsapp.net';
}

async function dl(node, kind) {
    try {
        const stream = await downloadContentFromMessage(node, kind);
        const chunks = []; for await (const c of stream) chunks.push(c);
        const b = Buffer.concat(chunks);
        if (b.length) return b;
    } catch (_) { /* newsletter media: neeche CDN se */ }
    const url = node.url && /^https?:/.test(node.url) ? node.url : (node.directPath ? 'https://mmg.whatsapp.net' + node.directPath : null);
    if (!url) throw new Error('media ka link nahi mila');
    const r = await axios.get(url, { responseType: 'arraybuffer', timeout: 90000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    return Buffer.from(r.data);
}

// replied message -> sendMessage ka content
async function buildContent(quoted) {
    const m = unwrap(quoted);
    if (m.conversation) return { text: m.conversation };
    if (m.extendedTextMessage) return { text: m.extendedTextMessage.text || '' };
    if (m.audioMessage) {
        const a = m.audioMessage;
        return { audio: await dl(a, 'audio'), mimetype: a.mimetype || 'audio/mp4', ptt: !!a.ptt };
    }
    if (m.videoMessage) {
        const v = m.videoMessage;
        return { video: await dl(v, 'video'), mimetype: v.mimetype || 'video/mp4', caption: v.caption || '', gifPlayback: !!v.gifPlayback };
    }
    if (m.imageMessage) {
        const i = m.imageMessage;
        return { image: await dl(i, 'image'), mimetype: i.mimetype || 'image/jpeg', caption: i.caption || '' };
    }
    if (m.stickerMessage) return { sticker: await dl(m.stickerMessage, 'sticker') };
    if (m.documentMessage) {
        const d = m.documentMessage;
        return { document: await dl(d, 'document'), mimetype: d.mimetype || 'application/octet-stream', fileName: d.fileName || 'file', caption: d.caption || '' };
    }
    return null;
}

// Main: mek = .chforward wala message; targets = [jid, ...]
async function run(conn, mek, ctx, argsRaw) {
    const here = ctx.from || mek.key.remoteJid;
    const ci = getContext(mek);
    if (!ci) return ctx.reply('❌ Jo post / gaana forward karna hai, usay *REPLY* karke likho:\n*.chforward <group jid / group link / number>*\n\nJaise: *.chforward 1203630xxxxxxxx@g.us*\nYa: *.chforward here*');
    const raw = String(argsRaw || '').split(/[\s,]+/).filter(Boolean);
    if (!raw.length) return ctx.reply('Use: *.chforward <group jid / invite link / number>*  (post ya gaane par reply karke)\nEk saath kai: *.chforward jid1 jid2 jid3*');

    const targets = [];
    for (const r of raw) { const j = await resolveTarget(conn, r, here); if (j) targets.push(j); else await ctx.reply(`⚠️ "${r}" samajh nahi aaya, chhod diya.`); }
    if (!targets.length) return ctx.reply('❌ Koi sahi target nahi mila.');

    let content;
    try { content = await buildContent(ci.quotedMessage); }
    catch (e) { return ctx.reply('❌ Media download nahi ho saki: ' + (e.message || e)); }
    if (!content) return ctx.reply('❌ Is message ki type forward nahi ho sakti (sirf text / audio / video / photo / sticker / document).');

    let ok = 0; const fails = [];
    for (const jid of targets) {
        try {
            const sent = await conn.sendMessage(jid, content);
            if (!sent || !sent.key) throw new Error('WhatsApp ne message accept nahi kiya');
            ok++;
        } catch (e) { fails.push(`${jid}: ${e.message || e}`); }
        if (targets.length > 1) await sleep(900);
    }
    if (ok && !fails.length) return ctx.reply(`✅ Forward ho gaya! (${ok}/${targets.length})\n📌 → ${targets.join(', ')}`);
    if (ok) return ctx.reply(`⚠️ ${ok}/${targets.length} par gaya.\n❌ Fail:\n${fails.join('\n')}`);
    return ctx.reply('❌ Forward nahi hua:\n' + fails.join('\n') + '\n\n💡 Bot us group/channel ka member hona chahiye (channel mein admin).');
}

module.exports = { run, buildContent, resolveTarget, getContext };
