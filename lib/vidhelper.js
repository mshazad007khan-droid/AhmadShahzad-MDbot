// lib/vidhelper.js — YouTube search + download helper (cartoon / movie / romance / couple / islamic video commands)
const yts = require('yt-search');
const mediaDl = require('./media-dl');
const config = require('../config');

const BOT = () => config.BOT_NAME || '𝐀𝐡𝐦𝐚𝐝𝐒𝐡𝐚𝐡𝐳𝐚𝐝-𝐌𝐃';
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(x => x[1]);

// kai queries try karo; duration filter ke andar wali videos mein se RANDOM chuno (har baar nayi)
async function findVideo(queries, { minSec = 0, maxSec = 1e9, random = true, top = 8 } = {}) {
    const seen = new Set();
    let pool = [];
    for (const q of queries) {
        try {
            const r = await yts(q);
            for (const v of r.videos || []) {
                if (seen.has(v.videoId)) continue;
                seen.add(v.videoId);
                if (v.seconds >= minSec && v.seconds <= maxSec) pool.push(v);
            }
        } catch (e) { console.warn('[VIDHELPER] search failed:', q, e.message); }
        if (pool.length >= top) break;
    }
    if (!pool.length) return null;
    pool = pool.slice(0, Math.max(top, 3));
    return random ? pick(pool) : pool[0];
}

const fmtViews = (n) => Number(n || 0).toLocaleString();

function infoCaption(icon, title, v, extra = []) {
    const desc = String(v.description || '').replace(/\s+/g, ' ').trim();
    const lines = [
        `╭━❰ ${icon} ${title} ❱━━━━━━╮`,
        `┃`,
        `┃ 🎞️ *${v.title}*`,
        `┃`,
        `┃ ⏱️ Duration   : ${v.timestamp || 'Unknown'}`,
        `┃ 📺 Channel    : ${(v.author && v.author.name) || 'Unknown'}`,
        `┃ 👁️ Views      : ${fmtViews(v.views)}`,
        v.ago ? `┃ 📅 Uploaded   : ${v.ago}` : null,
        desc ? `┃` : null,
        desc ? `┃ 📝 ${desc.slice(0, 140)}${desc.length > 140 ? '…' : ''}` : null,
        ...extra.map(x => `┃ ${x}`),
        `┃`,
        `╰━━━━━━━━━━━━━━━━━━━━━━━╯`,
        `⚡ ${BOT()}`
    ].filter(Boolean);
    return lines.join('\n');
}

// chhoti video -> buffer; lambi (movie/episode) -> file
async function sendShort(conn, chat, quoted, v, caption, maxHeight = 480) {
    const { buffer } = await mediaDl.downloadVideo(v.url, maxHeight);
    if (buffer.length > mediaDl.MAX_BYTES) throw new Error('TOO_BIG');
    await conn.sendMessage(chat, { video: await require('./safevideo').fix(buffer), mimetype: 'video/mp4', caption }, { quoted });
}
async function sendLong(conn, chat, quoted, v, caption, maxBytes = 400 * 1024 * 1024) {
    let dl = null;
    try {
        dl = await mediaDl.downloadFullVideoFile(v.url, { maxBytes });
        const cap = `${caption}\n📦 ${(dl.size / 1048576).toFixed(0)} MB · ${dl.height}p`;
        try { await conn.sendMessage(chat, { video: { url: dl.path }, mimetype: 'video/mp4', caption: cap }, { quoted }); }
        catch (e) {
            console.warn('[VIDHELPER] video send failed, document fallback:', e.message);
            await conn.sendMessage(chat, { document: { url: dl.path }, mimetype: 'video/mp4', fileName: String(v.title).replace(/[\\/:*?"<>|]/g, '').slice(0, 80) + '.mp4', caption: cap }, { quoted });
        }
    } finally { if (dl && dl.cleanup) dl.cleanup(); }
}

module.exports = { findVideo, infoCaption, sendShort, sendLong, pick, shuffle, BOT };
