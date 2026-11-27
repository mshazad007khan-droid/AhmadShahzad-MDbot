// plugins2/zz-movie.js (v12) — MOVIE commands
//   .movie <naam>        -> info card (poster, rating) + POORI MOVIE DOCUMENT (file) ki shakal mein
//   .movie <naam> #2     -> search ka 2nd result (#3, #4 ... bhi)
//   .movies <naam>       -> milne wali movies ki list
//   .movieinfo <naam>    -> sirf info (poster, rating, kahani)
//
// Movie kyun document mein: movie lambi hoti hai (1 GB tak) — WhatsApp video ki tarah bhejne par compress/fail hoti hai,
// document mein bheji hui file asli quality mein rehti hai aur 2 GB tak jati hai.
//
// Source 1: Internet Archive (archive.org) — free, bina key, stable API, resume wala download  (lib/movie-dl.js)
// Source 2: YouTube par free full movie (yt-dlp) — agar archive.org par na mile
// Server bachane ke liye: ek waqt mein MOVIE_CONCURRENCY (default 2) movies, baqi qatar mein; ek banda ek waqt mein ek movie.
const axios = require('axios');
const yts = require('yt-search');
const { cmd } = require('../ahmadcore');
const config = require('../config');
const mediaDl = require('../lib/media-dl');
const vh = require('../lib/vidhelper');
const movieDl = require('../lib/movie-dl');

const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36';
const BOT = () => config.BOT_NAME || '𝐀𝐡𝐦𝐚𝐝𝐒𝐡𝐚𝐡𝐳𝐚𝐝-𝐌𝐃';
const get = (url, params) => axios.get(url, { params, headers: { 'User-Agent': UA }, timeout: 9000 }).then(r => r.data);
const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const mb = (n) => (n / 1048576).toFixed(n > 1073741824 ? 0 : 0);
const safeName = (s) => clean(String(s || 'movie').replace(/[\\/:*?"<>|]/g, ' ')).slice(0, 90) || 'movie';

// ---------- movie info: 3 sources, jo pehle chale ----------
async function movieInfo(name) {
    const tries = [
        async () => {   // imdbapi.dev
            const d = await get('https://api.imdbapi.dev/search/titles', { query: name, limit: 3 });
            const t = (d.titles || [])[0];
            if (!t) throw new Error('empty');
            return { title: t.primaryTitle || t.originalTitle, year: t.startYear, rating: t.rating && t.rating.aggregateRating, votes: t.rating && t.rating.voteCount,
                type: t.type, poster: t.primaryImage && t.primaryImage.url, id: t.id, plot: t.plot, genres: (t.genres || []).join(', ') };
        },
        async () => {   // imdb.iamidiotareyoutoo.com
            const d = await get('https://imdb.iamidiotareyoutoo.com/search', { q: name });
            const t = (d.description || [])[0];
            if (!t) throw new Error('empty');
            return { title: t['#TITLE'], year: t['#YEAR'], rating: null, poster: t['#IMG_POSTER'], id: t['#IMDB_ID'], plot: '', cast: t['#ACTORS'], type: '' };
        },
        async () => {   // OMDb (agar OMDB_KEY env set ho)
            if (!process.env.OMDB_KEY) throw new Error('no key');
            const t = await get('https://www.omdbapi.com/', { apikey: process.env.OMDB_KEY, t: name });
            if (!t || t.Response === 'False') throw new Error('empty');
            return { title: t.Title, year: t.Year, rating: t.imdbRating, votes: t.imdbVotes, poster: t.Poster !== 'N/A' ? t.Poster : '', id: t.imdbID, plot: t.Plot, genres: t.Genre, cast: t.Actors, type: t.Type };
        }
    ];
    for (const fn of tries) { try { const r = await fn(); if (r && r.title) return r; } catch (_) {} }
    return null;
}

function infoCaption(i, extra) {
    const lines = [
        `╭━━〔 🎬 MOVIE INFO 〕━━╮`,
        `┃ 🎞️ *${i.title}*${i.year ? ` (${i.year})` : ''}`,
        i.type ? `┃ 📺 Type: ${i.type}` : null,
        i.rating ? `┃ ⭐ IMDb: ${i.rating}/10${i.votes ? ` (${Number(String(i.votes).replace(/,/g, '')).toLocaleString()} votes)` : ''}` : null,
        i.genres ? `┃ 🎭 Genre: ${i.genres}` : null,
        i.cast ? `┃ 👥 Cast: ${clean(i.cast).slice(0, 90)}` : null,
        i.plot ? `┃ 📝 ${clean(i.plot).slice(0, 220)}${clean(i.plot).length > 220 ? '…' : ''}` : null,
        i.id ? `┃ 🔗 https://www.imdb.com/title/${i.id}/` : null,
        ...(extra || []).map(x => `┃ ${x}`),
        `╰━━━━━━━━━━━━━━━╯`,
        `⚡ ${BOT()}`
    ].filter(Boolean);
    return lines.join('\n');
}

async function sendInfo(conn, chat, mek, info, extra) {
    const caption = infoCaption(info, extra);
    if (info.poster) {
        try { await conn.sendMessage(chat, { image: { url: info.poster }, caption }, { quoted: mek }); return; } catch (_) {}
    }
    await conn.sendMessage(chat, { text: caption }, { quoted: mek });
}

const USAGE = (p) =>
`╭━━〔 🎥 MOVIE 〕━━╮
┃ 📌 *${p}movie <naam>*
┃    jaise: *${p}movie Nosferatu*
┃    movie *document (file)* ki shakal mein aayegi
┃ 📌 *${p}movie <naam> #2*
┃    2nd result chahiye to (#3, #4 ...)
┃ 📌 *${p}movies <naam>*
┃    milne wali movies ki list
┃ 📌 *${p}movieinfo <naam>*
┃    sirf poster, rating, kahani
┃
┃ ℹ️ Free / legal movies (Internet Archive
┃ aur YouTube) hi milti hain. Nayi paid
┃ movies free source par nahi hoti.
╰━━━━━━━━━━━━━━╯`;

// "naam #2" -> { name, index }
function parseQuery(q) {
    let name = clean(q), index = 0;
    const m = name.match(/\s*#\s*(\d{1,2})\s*$/);
    if (m) { index = Math.max(0, parseInt(m[1], 10) - 1); name = clean(name.slice(0, m.index)); }
    return { name, index };
}

// ek banda ek waqt mein ek movie
const busy = new Set();

cmd({
    pattern: 'movieinfo',
    alias: ['imdb', 'mvinfo', 'filminfo'],
    desc: 'Movie ka poster, rating aur kahani: .movieinfo <naam>',
    category: 'video', react: '🎬', use: '.movieinfo <naam>', filename: __filename
}, async (conn, mek, m, ctx) => {
    const name = clean(ctx.q);
    if (!name) return ctx.reply(USAGE(config.PREFIX || '.'));
    const info = await movieInfo(name);
    if (!info) return ctx.reply('❌ Is naam ki movie ki info nahi mili. Spelling check karo (English naam likho).');
    return sendInfo(conn, ctx.from || mek.key.remoteJid, mek, info);
});

cmd({
    pattern: 'movies',
    alias: ['moviesearch', 'searchmovie', 'findmovie'],
    desc: 'Movies ki list dhoondo: .movies <naam>',
    category: 'video', react: '🔎', use: '.movies <naam>', filename: __filename
}, async (conn, mek, m, ctx) => {
    const { name } = parseQuery(ctx.q);
    if (!name) return ctx.reply(USAGE(config.PREFIX || '.'));
    const p = config.PREFIX || '.';
    let list = [];
    try { list = await movieDl.searchArchive(name, 8); } catch (_) {}
    let yt = [];
    try { const r = await yts(`${name} full movie`); yt = (r.videos || []).filter(v => v.seconds >= 40 * 60).slice(0, 4); } catch (_) {}
    if (!list.length && !yt.length) return ctx.reply(`❌ *${name}* naam ki koi free movie nahi mili. Spelling check karo ya doosra naam try karo.`);
    const rows = [];
    list.forEach((x, i) => rows.push(`${i + 1}. ${x.title}${x.year ? ` (${x.year})` : ''}`));
    const ytRows = yt.map(v => `• ${v.title.slice(0, 55)} (${v.timestamp})`);
    return ctx.reply(
        `╭━━〔 🎥 MOVIES 〕━━╮\n` +
        (rows.length ? `┃ 📚 *Internet Archive:*\n${rows.map(r => `┃ ${r}`).join('\n')}\n┃\n┃ 👉 *${p}movie ${name} #2* — number se chuno\n` : '') +
        (ytRows.length ? `┃\n┃ ▶️ *YouTube (fallback):*\n${ytRows.map(r => `┃ ${r}`).join('\n')}\n` : '') +
        `╰━━━━━━━━━━━━━━╯`);
});

cmd({
    pattern: 'movie',
    alias: ['film', 'fullmovie', 'moviedl'],
    desc: 'Poori movie DOCUMENT mein: .movie <naam>',
    category: 'video', react: '🎥', use: '.movie <naam>', filename: __filename
}, async (conn, mek, m, ctx) => {
    const chat = ctx.from || mek.key.remoteJid;
    const reply = ctx.reply;
    const { name, index } = parseQuery(ctx.q);
    if (!name) return reply(USAGE(config.PREFIX || '.'));

    const who = `${chat}|${ctx.sender || ''}`;
    if (busy.has(who)) return reply('⏳ Aapki ek movie pehle se download ho rahi hai. Wo khatam hone dein, phir dusri mangwayein.');
    busy.add(who);
    const react = (e) => conn.sendMessage(chat, { react: { text: e, key: mek.key } }).catch(() => {});
    let slot = false, dl = null, statusKey = null;
    try {
        react('🔎');
        const infoP = movieInfo(name).catch(() => null);

        // 1) Internet Archive
        let found = null, archiveErr = null;
        try { found = await movieDl.findMovie(name, { index }); } catch (e) { archiveErr = e; console.warn('[MOVIE] archive search failed:', e && e.message); }
        let tooBig = !!(found && found.tooBig);
        if (found && found.tooBig) found = null;

        // 2) YouTube (agar archive par nahi mili)
        let yt = null;
        if (!found) {
            try { yt = await vh.findVideo([`${name} full movie`, `${name} full movie hd`, `${name} movie`], { minSec: 40 * 60, maxSec: 4 * 3600, random: false }); }
            catch (_) {}
        }
        const info = await infoP;

        if (!found && !yt) {
            if (info) await sendInfo(conn, chat, mek, info, ['❌ Free full movie nahi mili']).catch(() => {});
            react('❌');
            const why = tooBig ? `Movie mili lekin bohat bari hai (${mb(movieDl.MAX_BYTES)}MB se zyada).`
                : archiveErr ? 'Search server abhi jawab nahi de raha, thori der baad dobara try karo.'
                : `*${name}* ki free/legal movie nahi mili. Nayi (paid) movies free sources par nahi hoti.`;
            return reply(`❌ ${why}\n\n💡 *${config.PREFIX || '.'}movies ${name}* se list dekho, ya English spelling / puri naam likho.`);
        }

        const title = found ? (found.title || name) : yt.title;
        const year = found ? found.year : '';
        const meta = found
            ? [`📦 ${mb(found.size)} MB${found.minutes ? ` · ⏱️ ${found.minutes} min` : ''}`, `📚 Source: Internet Archive`]
            : [`📦 YouTube · ⏱️ ${yt.timestamp}`];

        // info card + "download ho rahi hai"
        const queued = movieDl.queueLength();
        const waitLine = queued > 0 ? `⏳ Qatar mein number ${queued + 1} — thora intezar…` : '⏳ Download shuru… (movie lambi hoti hai, kuch minute lagenge)';
        if (info) await sendInfo(conn, chat, mek, info, [...meta, waitLine]).catch(() => {});
        else await conn.sendMessage(chat, { text: infoCaption({ title, year, plot: found && found.description }, [...meta, waitLine]) }, { quoted: mek }).catch(() => {});

        react('⏳');
        await movieDl.acquire(); slot = true;

        // live progress (har ~25 second mein ek hi message edit hota hai)
        let lastEdit = 0;
        try {
            const sent = await conn.sendMessage(chat, { text: `⬇️ *Downloading:* ${title}\n▱▱▱▱▱▱▱▱▱▱ 0%` }, { quoted: mek });
            statusKey = sent && sent.key;
        } catch (_) {}
        const bar = (pct) => { const f = Math.round(pct / 10); return '▰'.repeat(f) + '▱'.repeat(10 - f); };
        const onProgress = ({ done, total, pct }) => {
            if (!statusKey || Date.now() - lastEdit < 25000) return;
            lastEdit = Date.now();
            conn.sendMessage(chat, { text: `⬇️ *Downloading:* ${title}\n${bar(pct)} ${pct}%  (${mb(done)}${total ? '/' + mb(total) : ''} MB)`, edit: statusKey }).catch(() => {});
        };

        let size = 0, filePath = null, fileExt = 'mp4';
        if (found) {
            try {
                dl = await movieDl.downloadFile(found.url, { expectedSize: found.size, onProgress });
                size = dl.size; filePath = dl.path;
            } catch (e) {
                console.warn('[MOVIE] archive download failed:', e && e.message);
                if (/DISK_FULL|ENOSPC/.test(String(e && e.message))) throw e;
                // archive se download na ho paye to YouTube try karo
                try { yt = await vh.findVideo([`${name} full movie`, `${name} movie`], { minSec: 40 * 60, maxSec: 4 * 3600, random: false }); } catch (_) {}
                if (!yt) throw e;
            }
        }
        if (!dl && yt) {
            const y = await mediaDl.downloadFullVideoFile(yt.url, { maxBytes: movieDl.MAX_BYTES });
            dl = y; size = y.size; filePath = y.path;
        }
        if (!dl) throw new Error('NO_FILE');

        if (statusKey) conn.sendMessage(chat, { text: `⬆️ *Upload ho rahi hai:* ${title}\n▰▰▰▰▰▰▰▰▰▰ 100%  (${mb(size)} MB)`, edit: statusKey }).catch(() => {});
        const fileName = `${safeName(title)}${year ? ` (${year})` : ''}.${fileExt}`;
        const caption = `🎬 *${title}*${year ? ` (${year})` : ''}\n📦 ${mb(size)} MB\n⚡ ${BOT()}`;
        await conn.sendMessage(chat, { document: { url: filePath }, mimetype: 'video/mp4', fileName, caption }, { quoted: mek });
        if (statusKey) conn.sendMessage(chat, { text: `✅ *${title}* — bhej di gayi!`, edit: statusKey }).catch(() => {});
        react('✅');
    } catch (e) {
        console.error('[MOVIE]', (e.details && e.details.join && e.details.join(' | ')) || e.message);
        react('❌');
        const msg = String((e && e.message) || '') + JSON.stringify((e && e.details) || []);
        let out;
        if (/TOO_BIG|max-filesize/i.test(msg)) out = `Movie bohat bari hai (${mb(movieDl.MAX_BYTES)}MB se zyada), WhatsApp par nahi bheji ja sakti.`;
        else if (/DISK_FULL|ENOSPC/i.test(msg)) out = 'Server ki disk bhar gayi hai, thori der baad try karo.';
        else if (/DOWNLOAD_TIMEOUT|STALLED|INCOMPLETE|ECONN|ETIMEDOUT|EAI_AGAIN/i.test(msg)) out = 'Download beech mein ruk gaya (network). Dobara try karo.';
        else out = mediaDl.explainError(e) || 'Thori der baad dobara try karo.';
        try { await ctx.reply(`❌ Movie nahi bheji ja saki.\n\n💡 ${out}`); } catch (_) {}
    } finally {
        if (slot) movieDl.release();
        if (dl && dl.cleanup) dl.cleanup();
        busy.delete(who);
    }
});
