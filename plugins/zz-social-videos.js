// plugins/zz-social-videos.js — TikTok / Facebook / Instagram category videos
//   .tiktok funny | romance | sad | islamic | attitude | <koi bhi keyword>   (link do to purani download wali command chalti hai)
//   .ttfunny .ttromance .ttsad .ttislamic .ttattitude
//   .fbfunny .fbromance .fbsad .fbislamic .fbattitude     (.fb funny bhi)
//   .igfunny .igromance .igsad .igislamic .igattitude     (.igdl funny bhi)
// Source: TikTok search (tikwm) — sab se pakka; na chale to YouTube Shorts. Facebook/Instagram ki apni
// koi free "search" API nahi hoti, isliye un commands mein reels-style videos (TikTok/Shorts) aati hain.
const axios = require('axios');
const { cmd, findCommand } = require('../arslan');
const config = require('../config');

const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36';
const BOT = () => config.BOT_NAME || '𝐀𝐡𝐦𝐚𝐝𝐒𝐡𝐚𝐡𝐳𝐚𝐝-𝐌𝐃';
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const MAX_BYTES = 90 * 1024 * 1024;

const CATS = {
    funny:    { icon: '😂', name: 'FUNNY',    q: ['funny video', 'funny comedy', 'funny pakistani', 'funny hindi comedy', 'try not to laugh', 'funny moments'] },
    romance:  { icon: '💕', name: 'ROMANCE',  q: ['romantic status', 'love status', 'romantic couple', 'romantic song status', 'love story status'] },
    sad:      { icon: '💔', name: 'SAD',      q: ['sad status', 'sad urdu poetry', 'sad song status', 'heart touching sad', 'broken heart status'] },
    islamic:  { icon: '🕌', name: 'ISLAMIC',  q: ['islamic status', 'naat sharif', 'quran recitation', 'islamic reminder', 'madina status'] },
    attitude: { icon: '😎', name: 'ATTITUDE', q: ['attitude status', 'boys attitude', 'girls attitude', 'savage status', 'power status'] }
};
const CAT_ALIASES = { comedy: 'funny', mazahiya: 'funny', mazaq: 'funny', love: 'romance', romantic: 'romance', pyar: 'romance', sadd: 'sad', dard: 'sad', udas: 'sad', deen: 'islamic', naat: 'islamic', islam: 'islamic', swag: 'attitude', att: 'attitude' };
const PLATFORMS = {
    tiktok:    { key: 'tt', icon: '🎵', name: 'TIKTOK',    suffix: [''] },
    facebook:  { key: 'fb', icon: '📘', name: 'FACEBOOK',  suffix: ['facebook reels', 'fb video'] },
    instagram: { key: 'ig', icon: '📸', name: 'INSTAGRAM', suffix: ['instagram reels', 'reels'] }
};

// har chat mein pichhli bheji hui videos dobara na aayen
const recent = new Map();
const seenIn = (chat) => { if (!recent.has(chat)) recent.set(chat, new Set()); return recent.get(chat); };
function remember(chat, id) { const s = seenIn(chat); s.add(id); if (s.size > 60) s.delete(s.values().next().value); }

// ───────── TikTok search (tikwm) ─────────
async function tikwmSearch(keywords) {
    const hosts = ['https://www.tikwm.com', 'https://tikwm.com'];
    let lastErr;
    for (const host of hosts) {
        try {
            const body = new URLSearchParams({ keywords, count: '20', cursor: String(rnd(0, 3) * 20), web: '1', hd: '1' });
            const r = await axios.post(`${host}/api/feed/search`, body.toString(), {
                timeout: 25000,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'User-Agent': UA, Accept: 'application/json' }
            });
            const vids = (r.data && r.data.data && r.data.data.videos) || [];
            if (vids.length) return vids.map(v => ({
                id: String(v.video_id || v.id || v.play),
                title: v.title || '',
                author: (v.author && (v.author.unique_id || v.author.nickname)) || '',
                duration: v.duration || 0,
                plays: v.play_count || 0,
                url: (p => (p && p.startsWith('/') ? host + p : p))(v.play || v.wmplay)
            })).filter(v => v.url && v.duration <= 240);
            lastErr = new Error('tikwm: empty');
        } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error('tikwm failed');
}
async function fetchBuffer(url) {
    const r = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000, maxContentLength: MAX_BYTES, headers: { 'User-Agent': UA, Referer: 'https://www.tikwm.com/' } });
    const b = Buffer.from(r.data);
    if (b.length < 5000) throw new Error('video khali aayi');
    return b;
}

// ───────── YouTube Shorts fallback ─────────
async function youtubeShort(queries, chat) {
    const vh = require('../lib/vidhelper');
    const mediaDl = require('../lib/media-dl');
    const v = await vh.findVideo(queries.map(q => q + ' shorts'), { minSec: 5, maxSec: 120, random: true, top: 12 });
    if (!v) throw new Error('koi short nahi mili');
    const { buffer } = await mediaDl.downloadVideo(v.url, 480);
    if (buffer.length > MAX_BYTES) throw new Error('TOO_BIG');
    return { buffer, title: v.title, author: (v.author && v.author.name) || '', id: 'yt' + v.videoId, source: 'YouTube Shorts' };
}

// ───────── main ─────────
async function sendCategory(conn, mek, chat, platformKey, catKey, customKeyword) {
    const plat = PLATFORMS[platformKey];
    const cat = CATS[catKey];
    const label = customKeyword ? customKeyword.toUpperCase().slice(0, 24) : cat.name;
    const icon = customKeyword ? '🔎' : cat.icon;
    const base = customKeyword ? [customKeyword] : cat.q;
    const queries = [];
    for (const q of [...base].sort(() => Math.random() - 0.5).slice(0, 3)) {
        for (const suf of plat.suffix) queries.push(customKeyword && !suf ? q : `${q} ${suf}`.trim());
    }
    conn.sendMessage(chat, { react: { text: '⏳', key: mek.key } }).catch(() => {});
    const seen = seenIn(chat);
    let result = null, errors = [];

    // 1) TikTok search
    for (const q of queries.slice(0, 3)) {
        try {
            const all = await tikwmSearch(q);
            let list = all.filter(v => !seen.has(v.id));
            if (!list.length) list = all;      // sab pehle bhej chuke hon tab bhi kuch to bhejo
            if (!list.length) continue;
            const v = pick(list.slice(0, 12));
            const buffer = await fetchBuffer(v.url);
            result = { buffer, title: v.title, author: v.author, id: v.id, source: 'TikTok' };
            break;
        } catch (e) { errors.push(String(e.message).slice(0, 60)); }
    }
    // 2) YouTube Shorts
    if (!result) {
        try { result = await youtubeShort(queries, chat); }
        catch (e) { errors.push('yt: ' + String(e.message).slice(0, 60)); }
    }
    if (!result) {
        conn.sendMessage(chat, { react: { text: '❌', key: mek.key } }).catch(() => {});
        throw Object.assign(new Error('NO_VIDEO'), { details: errors });
    }
    remember(chat, result.id);
    const title = String(result.title || '').replace(/\s+/g, ' ').trim().slice(0, 110);
    const caption =
`╭━❰ ${plat.icon} ${plat.name} · ${icon} ${label} ❱━╮
┃
${title ? `┃ 🎞️ *${title}*\n` : ''}${result.author ? `┃ 👤 ${result.author}\n` : ''}┃ 📡 Source: ${result.source}
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯
⚡ ${BOT()}`;
    await conn.sendMessage(chat, { video: result.buffer, mimetype: 'video/mp4', caption }, { quoted: mek });
    conn.sendMessage(chat, { react: { text: '✅', key: mek.key } }).catch(() => {});
}

function menuText(p, platformKey) {
    const plat = PLATFORMS[platformKey];
    const lines = Object.entries(CATS).map(([k, c]) => `┃ ${c.icon} *${p}${plat.key}${k}*  ➜ ${c.name.toLowerCase()} videos`).join('\n');
    return `╭━━━〔 ${plat.icon} ${plat.name} VIDEOS 〕━━━╮\n┃\n${lines}\n┃\n┃ 🔎 *${p}${platformKey} <kuch bhi likho>*  ➜ us topic ki video\n┃ 🔗 *${p}${platformKey} <link>*  ➜ link se download\n╰━━━━━━━━━━━━━━━━━━━━━━╯`;
}

async function run(conn, mek, ctx, platformKey, catKey, kw) {
    try { await sendCategory(conn, mek, ctx.from, platformKey, catKey, kw); }
    catch (e) {
        console.warn(`[SOCIAL ${platformKey}]`, e.message, e.details || '');
        const net = /ENOTFOUND|EAI_AGAIN|ECONN|ETIMEDOUT|timeout/i.test(JSON.stringify(e.details || []) + e.message);
        await ctx.reply(`❌ ${PLATFORMS[platformKey].name} video abhi nahi mil saki.` + (net ? '\n💡 Server se internet/site nahi khul rahi.' : '\n💡 Thori der baad dobara try karo ya dusri category/keyword likho.'));
    }
}

// ───────── dedicated commands: .ttfunny .fbsad .igromance ... (15) ─────────
for (const [platformKey, plat] of Object.entries(PLATFORMS)) {
    for (const [catKey, c] of Object.entries(CATS)) {
        cmd({
            pattern: `${plat.key}${catKey}`,
            alias: [`${platformKey}${catKey}`],
            desc: `${plat.name} ${c.name.toLowerCase()} video (random, har baar nayi)`,
            category: 'video', react: c.icon, use: `.${plat.key}${catKey}`, filename: __filename
        }, async (conn, mek, m, ctx) => run(conn, mek, ctx, platformKey, catKey, null));
    }
}

// ───────── .tiktok / .fb / .igdl : link ho to purani command, warna category / keyword ─────────
for (const [platformKey, oldPattern] of [['tiktok', 'tiktok'], ['facebook', 'fb'], ['instagram', 'igdl']]) {
    const old = findCommand(oldPattern);
    cmd({
        pattern: oldPattern,
        alias: [...(old ? old.alias : []), `${platformKey}video`, `${PLATFORMS[platformKey].key}video`],
        desc: old ? old.desc || `${PLATFORMS[platformKey].name} download / category video` : `${PLATFORMS[platformKey].name} video`,
        category: old ? old.category : 'download', react: old ? old.react : PLATFORMS[platformKey].icon,
        use: `.${oldPattern} <link>  |  .${oldPattern} funny|romance|sad|islamic|attitude`, filename: __filename
    }, async (conn, mek, m, ctx) => {
        const q = String(ctx.q || '').trim();
        const hasLink = /https?:\/\//i.test(q) || (!q && m.quoted && /https?:\/\//i.test(m.quoted.text || ''));
        if (hasLink && old) return old.function(conn, mek, m, ctx);
        if (!q) return ctx.reply(menuText(config.PREFIX || '.', platformKey));
        const w = q.toLowerCase().split(/\s+/)[0];
        const catKey = CATS[w] ? w : CAT_ALIASES[w];
        if (catKey && q.split(/\s+/).length === 1) return run(conn, mek, ctx, platformKey, catKey, null);
        return run(conn, mek, ctx, platformKey, 'funny', q);      // koi bhi keyword
    });
}

// ───────── .socialvideos : teeno ka menu ─────────
cmd({
    pattern: 'socialvideos', alias: ['reelsmenu', 'ttmenu', 'fbmenu', 'igmenu'], desc: 'TikTok / Facebook / Instagram video commands ki list',
    category: 'video', react: '🎬', use: '.socialvideos', filename: __filename
}, async (conn, mek, m, ctx) => {
    const p = config.PREFIX || '.';
    return ctx.reply(['tiktok', 'facebook', 'instagram'].map(k => menuText(p, k)).join('\n\n'));
});

module.exports = { CATS, tikwmSearch };
