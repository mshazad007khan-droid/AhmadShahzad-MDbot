// lib/movie-dl.js (v12) — MOVIE FINDER + DOWNLOADER
//
// Source 1 (asli, kabhi kharab nahi hota): Internet Archive (archive.org) — free, bina API-key, public-domain / free feature
//   films ka bohat bada collection. Search API + direct MP4 download, resume support ke saath.
// Source 2 (fallback): YouTube par free/legal "full movie" (yt-dlp) — plugin (zz-movie.js) is ko khud chalata hai.
//
// Sirf legal/free sources use hote hain (pirate sites ki APIs aksar band ho jati hain aur copyright ka masla bhi hai).
//
// Optional env:
//   MOVIE_MAX_MB       sabse badi file (default 1500 = 1.5GB; WhatsApp document limit 2GB hai)
//   MOVIE_MIN_MIN      kam az kam lambai minutes mein (default 40) — chhoti clips ko movie na samjho
//   ARCHIVE_BASE       default https://archive.org (mirror / test ke liye)

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');

const ARCHIVE = String(process.env.ARCHIVE_BASE || 'https://archive.org').replace(/\/+$/, '');
const MAX_BYTES = Math.max(50, Number(process.env.MOVIE_MAX_MB || 1500)) * 1024 * 1024;
const MIN_SEC = Math.max(5, Number(process.env.MOVIE_MIN_MIN || 40)) * 60;
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36';
const TMP_PREFIX = 'ahmad-movie-';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const STOP = new Set(['the', 'a', 'an', 'of', 'movie', 'film', 'full', 'hd', 'hindi', 'english', 'urdu', 'dubbed', 'dub', 'free', 'online', 'download',
    '2160p', '1080p', '720p', '480p', '360p', 'bluray', 'webrip', 'mp4']);
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9؀-ۿऀ-ॿ ]+/g, ' ').replace(/\s+/g, ' ').trim();
const tokens = (s) => norm(s).split(' ').filter(w => w && !STOP.has(w));

// ─────────────── tiny helpers ───────────────
function withQuery(url, params) {
    if (!params) return url;
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) { if (Array.isArray(v)) v.forEach(x => u.append(k, String(x))); else u.append(k, String(v)); }
    return url + (url.includes('?') ? '&' : '?') + u.toString();
}
async function getJSON(url, params, tries = 3, timeout = 20000) {
    let lastErr;
    for (let i = 0; i < tries; i++) {
        try {
            const r = await axios.get(withQuery(url, params), { timeout, headers: { 'User-Agent': UA, Accept: 'application/json' } });
            if (r && r.data && typeof r.data === 'object') return r.data;
            throw new Error('bad json');
        } catch (e) {
            lastErr = e;
            const code = e && e.response && e.response.status;
            if (code && code >= 400 && code < 500 && code !== 429) break;   // 404/400 par dobara koshish bekaar
            await sleep(800 * Math.pow(2, i));
        }
    }
    throw lastErr || new Error('request failed');
}

// stale temp folders (crash ke baad bache hue) saaf karo
function sweepOldTemp() {
    try {
        const base = os.tmpdir();
        for (const d of fs.readdirSync(base)) {
            if (!d.startsWith(TMP_PREFIX)) continue;
            const full = path.join(base, d);
            try { if (Date.now() - fs.statSync(full).mtimeMs > 2 * 3600 * 1000) fs.rmSync(full, { recursive: true, force: true }); } catch (_) {}
        }
    } catch (_) {}
}
sweepOldTemp();

function freeBytes(dir) {
    try { const s = fs.statfsSync(dir); return Number(s.bavail) * Number(s.bsize); } catch (_) { return Infinity; }
}

// ─────────────── Internet Archive search ───────────────
const searchCache = new Map();   // key -> { at, list }
const SEARCH_TTL = 60 * 60 * 1000;

function scoreTitle(qTokens, title) {
    const t = new Set(tokens(title));
    if (!qTokens.length || !t.size) return { cover: 0, score: 0 };
    let hit = 0;
    for (const w of qTokens) if (t.has(w)) hit++;
    const cover = hit / qTokens.length;                 // query ke kitne lafz title mein hain
    const extra = Math.max(0, t.size - qTokens.length); // title mein faltu lafz (jaise "trailer", "making of")
    return { cover, score: cover - Math.min(0.3, extra * 0.03) };
}

async function searchArchive(name, limit = 8) {
    const qTokens = tokens(name);
    if (!qTokens.length) return [];
    const key = qTokens.join(' ');
    const hit = searchCache.get(key);
    if (hit && Date.now() - hit.at < SEARCH_TTL) return hit.list.slice(0, limit);

    const safe = qTokens.map(w => w.replace(/[^a-z0-9؀-ۿऀ-ॿ]/g, '')).filter(Boolean);
    const attempts = [
        `title:(${safe.join(' AND ')}) AND mediatype:movies`,
        `(${safe.join(' AND ')}) AND mediatype:movies AND (collection:feature_films OR collection:moviesandfilms OR collection:classic_cinema OR collection:silent_films OR collection:film_noir OR collection:scifi_horror OR collection:bollywood)`
    ];
    let docs = [];
    let lastErr = null;
    for (const q of attempts) {
        try {
            const d = await getJSON(`${ARCHIVE}/advancedsearch.php`, {
                q, 'fl[]': ['identifier', 'title', 'year', 'downloads', 'item_size', 'runtime'], rows: 30, page: 1, output: 'json', 'sort[]': 'downloads desc'
            });
            docs = (d.response && d.response.docs) || [];
            if (docs.length) break;
        } catch (e) { lastErr = e; }
    }
    if (!docs.length && lastErr) {
        // 2nd endpoint (scrape API) — pehla endpoint down ho to
        try {
            const d = await getJSON(`${ARCHIVE}/services/search/v1/scrape`, { q: `title:(${safe.join(' AND ')}) AND mediatype:movies`, fields: 'identifier,title,year,downloads,item_size', count: 30 });
            docs = d.items || [];
        } catch (e) { lastErr = e; }
    }
    if (!docs.length && lastErr) throw lastErr;

    const list = docs.map(d => {
        const title = Array.isArray(d.title) ? d.title[0] : d.title;
        const sc = scoreTitle(qTokens, title);
        return { id: d.identifier, title, year: Array.isArray(d.year) ? d.year[0] : d.year,
            downloads: Number(d.downloads || 0), itemSize: Number(d.item_size || 0), cover: sc.cover, score: sc.score };
    }).filter(x => x.id && x.title && x.cover >= (qTokens.length === 1 ? 1 : 0.6))
        .filter(x => !/\b(trailer|teaser|promo|clip|scene|review|reaction|soundtrack)\b/i.test(x.title))
        .sort((a, b) => (b.score - a.score) || (b.downloads - a.downloads));
    searchCache.set(key, { at: Date.now(), list });
    if (searchCache.size > 300) searchCache.delete(searchCache.keys().next().value);
    return list.slice(0, limit);
}

// ek item ki sabse achi MP4 file chuno (h.264 = har phone par chalti hai)
async function pickFile(id) {
    const meta = await getJSON(`${ARCHIVE}/metadata/${encodeURIComponent(id)}`);
    const files = Array.isArray(meta.files) ? meta.files : [];
    const cands = [];
    for (const f of files) {
        const name = String(f.name || '');
        if (!/\.mp4$/i.test(name)) continue;
        if (/(_thumb|sample|trailer|preview)/i.test(name)) continue;
        const size = Number(f.size || 0);
        if (!size || size < 5 * 1048576) continue;
        const length = parseFloat(f.length || 0) || 0;
        const compat = /h\.?264|mpeg4/i.test(String(f.format || '')) ? 1 : 0;
        cands.push({ name, size, length, compat, format: f.format || '', original: f.source === 'original' });
    }
    if (!cands.length) return { meta, file: null, reason: 'NO_MP4' };
    const ok = cands.filter(c => c.size <= MAX_BYTES);
    if (!ok.length) return { meta, file: null, reason: 'TOO_BIG', smallest: Math.min(...cands.map(c => c.size)) };
    // pehle compatible (h.264) phir sabse bari (best quality jo limit mein aaye)
    ok.sort((a, b) => (b.compat - a.compat) || (b.size - a.size));
    const file = ok[0];
    const m = meta.metadata || {};
    return {
        meta, file, reason: null,
        title: Array.isArray(m.title) ? m.title[0] : m.title,
        year: Array.isArray(m.year) ? m.year[0] : (m.year || (m.date ? String(m.date).slice(0, 4) : '')),
        description: String(Array.isArray(m.description) ? m.description[0] : (m.description || '')).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
        url: `${ARCHIVE}/download/${encodeURIComponent(id)}/${file.name.split('/').map(encodeURIComponent).join('/')}`,
        thumb: `${ARCHIVE}/services/img/${encodeURIComponent(id)}`
    };
}

// Naam se movie dhoondo. index = 0 (best) / 1 / 2 ... (.movie naam #2).
// Return: { source:'archive', id, title, year, size, minutes, url, thumb, description } ya null; TOO_BIG par { tooBig:true }
async function findMovie(name, { index = 0 } = {}) {
    const list = await searchArchive(name, 8);
    if (!list.length) return null;
    let tooBig = false, tried = 0;
    for (let i = index; i < list.length && tried < 5; i++, tried++) {
        let r;
        try { r = await pickFile(list[i].id); } catch (_) { continue; }
        if (!r.file) { if (r.reason === 'TOO_BIG') tooBig = true; continue; }
        const minutes = r.file.length ? Math.round(r.file.length / 60) : 0;
        // chhoti clip (trailer / short) ko movie na samjho
        if (r.file.length ? r.file.length < MIN_SEC : r.file.size < 120 * 1048576) continue;
        return { source: 'archive', id: list[i].id, title: r.title || list[i].title, year: r.year || list[i].year, size: r.file.size, minutes,
            url: r.url, thumb: r.thumb, description: r.description, fileName: r.file.name, pageUrl: `${ARCHIVE}/details/${list[i].id}` };
    }
    return tooBig ? { tooBig: true } : null;
}

// ─────────────── resumable download (disk par, RAM nahi) ───────────────
// onProgress({ done, total, pct })  — har ~1s se zyada ke gap par
async function downloadFile(url, { expectedSize = 0, onProgress, timeoutMs = 45 * 60 * 1000, maxRetries = 6 } = {}) {
    const dir = path.join(os.tmpdir(), TMP_PREFIX + crypto.randomBytes(6).toString('hex'));
    fs.mkdirSync(dir, { recursive: true });
    const cleanup = () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {} };
    const file = path.join(dir, 'movie.mp4');

    if (expectedSize && freeBytes(dir) < expectedSize * 1.15) { cleanup(); const e = new Error('DISK_FULL'); throw e; }

    const startedAt = Date.now();
    let done = 0, total = expectedSize || 0, lastEmit = 0, attempt = 0;
    try {
        while (true) {
            if (Date.now() - startedAt > timeoutMs) throw new Error('DOWNLOAD_TIMEOUT');
            try {
                const headers = { 'User-Agent': UA };
                if (done > 0) headers.Range = `bytes=${done}-`;
                const res = await axios.get(url, { responseType: 'stream', headers, timeout: 30000, maxRedirects: 8, validateStatus: s => s === 200 || s === 206 });
                if (res.status === 200 && done > 0) { done = 0; try { fs.truncateSync(file, 0); } catch (_) {} }   // server ne Range nahi mana -> shuru se
                const cl = Number(res.headers['content-length'] || 0);
                if (cl) total = res.status === 206 ? done + cl : cl;
                if (total && total > MAX_BYTES) { try { res.data.destroy(); } catch (_) {} throw new Error('TOO_BIG'); }
                await new Promise((resolve, reject) => {
                    const w = fs.createWriteStream(file, { flags: done > 0 ? 'a' : 'w' });
                    let idle = setTimeout(() => { res.data.destroy(new Error('STALLED')); }, 60000);
                    res.data.on('data', (chunk) => {
                        done += chunk.length;
                        clearTimeout(idle); idle = setTimeout(() => { res.data.destroy(new Error('STALLED')); }, 60000);
                        const now = Date.now();
                        if (onProgress && now - lastEmit > 1000) { lastEmit = now; try { onProgress({ done, total, pct: total ? Math.min(100, Math.floor(done * 100 / total)) : 0 }); } catch (_) {} }
                    });
                    res.data.on('error', (e) => { clearTimeout(idle); w.destroy(); reject(e); });
                    w.on('error', (e) => { clearTimeout(idle); reject(e); });
                    w.on('finish', () => { clearTimeout(idle); resolve(); });
                    res.data.pipe(w);
                });
                if (total && done < total) throw new Error('INCOMPLETE');
                break;
            } catch (e) {
                if (/TOO_BIG|DISK_FULL|ENOSPC/.test(String(e && e.message))) throw e;
                attempt++;
                if (attempt > maxRetries) throw e;
                try { done = fs.statSync(file).size; } catch (_) { done = 0; }   // jahan tak file likhi hai wahin se resume
                await sleep(Math.min(15000, 1500 * attempt));
            }
        }
        const size = fs.statSync(file).size;
        if (size < 1048576) throw new Error('EMPTY_FILE');
        if (size > MAX_BYTES) throw new Error('TOO_BIG');
        return { path: file, size, cleanup };
    } catch (e) { cleanup(); throw e; }
}

// ─────────────── ek waqt mein kitni movies (server bachane ke liye) ───────────────
const LIMIT = Math.max(1, Number(process.env.MOVIE_CONCURRENCY || 2));
let running = 0;
const waiters = [];
function queueLength() { return waiters.length; }
async function acquire() {
    if (running < LIMIT) { running++; return; }
    await new Promise(r => waiters.push(r));
}
function release() {
    const n = waiters.shift();
    if (n) n(); else running = Math.max(0, running - 1);
}

module.exports = { searchArchive, pickFile, findMovie, downloadFile, acquire, release, queueLength, tokens, norm, MAX_BYTES, MIN_SEC };
