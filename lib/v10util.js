// lib/v10util.js — naye commands ke shared helpers (media download, ffmpeg, animation, target user)
const fs = require('fs');
const os = require('os');
const path = require('path');
const ffq = require('./ffq');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// reply kiya hua ya current message ka media: { buffer, kind }  (kinds: ['image','video','audio','sticker'])
async function getMedia(m, mek, kinds) {
    const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
    const tryMsg = async (msg) => {
        if (!msg) return null;
        let inner = msg;
        for (let i = 0; i < 4; i++) {
            const nx = (inner.viewOnceMessageV2 || inner.viewOnceMessage || inner.viewOnceMessageV2Extension || inner.ephemeralMessage || inner.documentWithCaptionMessage || {}).message;
            if (!nx) break; inner = nx;
        }
        const type = Object.keys(inner).find(k => /^(image|video|audio|sticker)Message$/.test(k));
        if (!type) return null;
        const kind = type.replace('Message', '');
        if (kinds && !kinds.includes(kind)) return null;
        const stream = await downloadContentFromMessage(inner[type], kind);
        const chunks = []; for await (const c of stream) chunks.push(c);
        return { buffer: Buffer.concat(chunks), kind };
    };
    if (m && m.quoted && m.quoted.message) { const r = await tryMsg(m.quoted.message); if (r) return r; }
    return tryMsg(mek.message);
}

// buffer -> ffmpeg -> buffer. args mein INPUT / OUTPUT ki jagah {in} {out} likho
async function ffmpegBuffer(buf, argsFn, outExt, inExt = 'bin', timeout = 90000) {
    const id = Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const inp = path.join(os.tmpdir(), `v10in_${id}.${inExt}`);
    const out = path.join(os.tmpdir(), `v10_${id}.${outExt}`);
    fs.writeFileSync(inp, buf);
    try {
        await ffq.run(ffq.ffmpegBin(), ['-y', '-hide_banner', '-loglevel', 'error', ...argsFn(inp, out)], timeout);
        return fs.readFileSync(out);
    } finally { for (const f of [inp, out]) { try { fs.unlinkSync(f); } catch (_) {} } }
}

// text frames ko ek hi message mein edit kar kar ke chalata hai
async function animate(conn, chat, quoted, frames, delayMs = 1300, mentions) {
    let sent = await conn.sendMessage(chat, { text: frames[0], mentions }, { quoted });
    for (let i = 1; i < frames.length; i++) {
        await sleep(delayMs);
        try { await conn.sendMessage(chat, { text: frames[i], edit: sent.key, mentions }); }
        catch (_) { sent = await conn.sendMessage(chat, { text: frames[i], mentions }); }
    }
}
const bar = (p, n = 10) => { const f = Math.round(p / 100 * n); return '▰'.repeat(f) + '▱'.repeat(n - f) + ` ${p}%`; };

// @mention / reply / (private chat mein) us chat ka user
function targetOf(ctx, mek, m) {
    if (ctx.mentionedJid && ctx.mentionedJid[0]) return ctx.mentionedJid[0];
    if (ctx.quotedTarget) return ctx.quotedTarget;
    if (!ctx.isGroup) return ctx.from;
    return null;
}
const tag = (jid) => '@' + String(jid || '').split('@')[0].split(':')[0];

module.exports = { sleep, rnd, pick, getMedia, ffmpegBuffer, animate, bar, targetOf, tag };
