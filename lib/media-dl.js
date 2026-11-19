// lib/media-dl.js
// API-FREE media downloader.
//   1) yt-dlp (local binary, auto-downloaded once from GitHub if missing)
//   2) @distube/ytdl-core / ytdl-core  (pure node, YouTube only)
// No third-party "converter" websites involved.
//
// Optional env:
//   YTDLP_PATH        full path of a yt-dlp binary you already have
//   YTDLP_COOKIES     path to cookies.txt (helps when YouTube shows "confirm you're not a bot")
//   YTDLP_EXTRA_ARGS  extra args, space separated

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const { spawn, spawnSync } = require('child_process');

const BIN_DIR = path.join(__dirname, 'bin');
const IS_WIN = process.platform === 'win32';
const BIN_NAME = IS_WIN ? 'yt-dlp.exe' : 'yt-dlp';
const MAX_BYTES = 100 * 1024 * 1024;

function ffmpegLocation() {
    try { return require('@ffmpeg-installer/ffmpeg').path; } catch (_) {}
    return 'ffmpeg';
}

// ─────────────── yt-dlp binary ───────────────
let ytdlpPromise = null;

function works(bin) {
    try {
        const r = spawnSync(bin, ['--version'], { timeout: 15000 });
        return r.status === 0;
    } catch (_) { return false; }
}

async function downloadYtDlp(dest) {
    let asset = 'yt-dlp_linux';
    if (IS_WIN) asset = 'yt-dlp.exe';
    else if (process.platform === 'darwin') asset = 'yt-dlp_macos';
    else if (process.arch === 'arm64') asset = 'yt-dlp_linux_aarch64';

    const url = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${asset}`;
    console.log(`[MEDIA-DL] Downloading yt-dlp (${asset}) ...`);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const tmp = dest + '.part';
    const res = await axios.get(url, { responseType: 'stream', timeout: 120000, maxRedirects: 10 });
    await new Promise((resolve, reject) => {
        const w = fs.createWriteStream(tmp);
        res.data.pipe(w);
        w.on('finish', resolve);
        w.on('error', reject);
        res.data.on('error', reject);
    });
    fs.renameSync(tmp, dest);
    if (!IS_WIN) fs.chmodSync(dest, 0o755);
}

// Naye yt-dlp ko YouTube ke liye ek JavaScript runtime chahiye (warna formats nahi milte).
// Bot Node.js par chalta hai, isliye wahi runtime yt-dlp ko de dete hain.
let JS_RUNTIME_ARGS = [];
function detectJsRuntime(bin) {
    try {
        const r = spawnSync(bin, ['--help'], { timeout: 15000, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
        if (/--js-runtimes/.test(String(r.stdout || ''))) {
            JS_RUNTIME_ARGS = ['--js-runtimes', 'node:' + process.execPath];
            return;
        }
    } catch (_) {}
    JS_RUNTIME_ARGS = [];
}

function ensureYtDlp() {
    if (ytdlpPromise) return ytdlpPromise;
    ytdlpPromise = (async () => {
        const candidates = [process.env.YTDLP_PATH, path.join(BIN_DIR, BIN_NAME), 'yt-dlp', 'yt-dlp_linux'].filter(Boolean);
        for (const c of candidates) if (works(c)) { detectJsRuntime(c); return c; }

        const dest = path.join(BIN_DIR, BIN_NAME);
        await downloadYtDlp(dest);
        if (works(dest)) { detectJsRuntime(dest); return dest; }
        throw new Error('YTDLP_UNAVAILABLE');
    })().catch(err => { ytdlpPromise = null; throw err; });
    return ytdlpPromise;
}

// Railway par file upload mushkil hoti hai, isliye cookies env variable se bhi le sakte hain:
//   YTDLP_COOKIES_B64  = cookies.txt ka base64      (ya)   YTDLP_COOKIES_TEXT = cookies.txt ka poora text
let cookiesTmp = null;
function cookiesFile() {
    if (process.env.YTDLP_COOKIES && fs.existsSync(process.env.YTDLP_COOKIES)) return process.env.YTDLP_COOKIES;
    // bot folder mein data/cookies.txt rakh do to khud use ho jati hai
    const dropIn = path.join(__dirname, '..', 'data', 'cookies.txt');
    try { if (fs.existsSync(dropIn) && fs.statSync(dropIn).size > 50) return dropIn; } catch (_) {}
    if (cookiesTmp && fs.existsSync(cookiesTmp)) return cookiesTmp;
    let raw = '';
    if (process.env.YTDLP_COOKIES_B64) {
        try { raw = Buffer.from(process.env.YTDLP_COOKIES_B64.trim(), 'base64').toString('utf8'); } catch (_) {}
    } else if (process.env.YTDLP_COOKIES_TEXT) {
        raw = String(process.env.YTDLP_COOKIES_TEXT).replace(/\\n/g, '\n');
    }
    if (!raw.trim()) return null;
    try {
        const f = path.join(os.tmpdir(), 'aman-yt-cookies.txt');
        fs.writeFileSync(f, raw, { mode: 0o600 });
        cookiesTmp = f;
        return f;
    } catch (_) { return null; }
}

// keep the binary fresh (YouTube changes often) — called at most once per 12h on failure
let lastUpdate = 0;
async function tryUpdateYtDlp() {
    if (Date.now() - lastUpdate < 12 * 3600 * 1000) return false;
    lastUpdate = Date.now();
    try {
        const bin = await ensureYtDlp();
        const r = await run(bin, ['-U'], 90000);
        const updated = /updated yt-dlp|updating to/i.test(String(r.out) + String(r.err));
        if (updated) console.log('[MEDIA-DL] yt-dlp updated');
        return updated;
    } catch (_) { return false; }
}

// Fail hone par yt-dlp update karke ek baar dobara try (YouTube aksar badalta rehta hai)
async function withUpdateRetry(fn) {
    try { return await fn(); }
    catch (e) {
        if (/TOO_BIG|YTDLP_UNAVAILABLE/.test(e.message + JSON.stringify(e.details || []))) throw e;
        if (await tryUpdateYtDlp()) return await fn();
        throw e;
    }
}

// yt-dlp badi file par download chhod deta hai (exit 0, file nahi) — usay saaf error banao
async function runDl(bin, args, timeoutMs) {
    const r = await run(bin, args, timeoutMs);
    if (/larger than max-filesize/i.test(String(r.out) + String(r.err))) throw new Error('TOO_BIG');
    return r;
}

function run(bin, args, timeoutMs) {
    return new Promise((resolve, reject) => {
        const p = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        let out = '', err = '';
        const timer = setTimeout(() => { try { p.kill('SIGKILL'); } catch (_) {} reject(new Error('TIMEOUT')); }, timeoutMs);
        p.stdout.on('data', d => { out += d; if (out.length > 200000) out = out.slice(-100000); });
        p.stderr.on('data', d => { err += d; if (err.length > 200000) err = err.slice(-100000); });
        p.on('error', e => { clearTimeout(timer); reject(e); });
        p.on('close', code => {
            clearTimeout(timer);
            if (code === 0) resolve({ out, err });
            else reject(Object.assign(new Error(`yt-dlp exit ${code}: ${err.trim().split('\n').pop() || ''}`), { stderr: err }));
        });
    });
}

function baseArgs() {
    const args = [
        '--no-playlist', '--no-warnings', '--no-progress',
        '--socket-timeout', '20', '--retries', '3',
        '--max-filesize', String(MAX_BYTES),
        '--ffmpeg-location', ffmpegLocation(),
        ...JS_RUNTIME_ARGS
    ];
    const ck = cookiesFile();
    if (ck) args.push('--cookies', ck);
    if (process.env.YTDLP_PROXY) args.push('--proxy', process.env.YTDLP_PROXY);   // datacenter IP block ho to residential/proxy
    if (process.env.YTDLP_EXTRA_ARGS) args.push(...process.env.YTDLP_EXTRA_ARGS.split(/\s+/).filter(Boolean));
    return args;
}

async function withTmpDir(fn) {
    const dir = path.join(os.tmpdir(), 'ahmad-dl-' + crypto.randomBytes(6).toString('hex'));
    fs.mkdirSync(dir, { recursive: true });
    try { return await fn(dir); }
    finally { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {} }
}

function pickOutput(dir, exts) {
    const files = fs.readdirSync(dir)
        .filter(f => exts.some(e => f.toLowerCase().endsWith(e)))
        .map(f => ({ f, s: fs.statSync(path.join(dir, f)).size }))
        .sort((a, b) => b.s - a.s);
    return files[0] ? path.join(dir, files[0].f) : null;
}

// ─────────────── WhatsApp-playable mp4 ───────────────
// "This video is not available because something is wrong with the video file" ka matlab aksar ye hota hai ke
// file AV1/VP9 codec ya webm/mkv me hai. WhatsApp ko H.264 (yuv420p) + AAC mp4 chahiye.
// Ye function codec check karta hai: theek ho to sirf faststart remux, warna H.264/AAC me convert.
function probeStreams(file) {
    try {
        const r = spawnSync(ffmpegLocation(), ['-hide_banner', '-i', file], { encoding: 'utf8', timeout: 30000, maxBuffer: 10 * 1024 * 1024 });
        const txt = String((r.stderr || '') + (r.stdout || ''));
        const v = txt.match(/Stream #[^\n]*Video:\s*([a-z0-9_]+)[^\n]*/i);
        const a = txt.match(/Stream #[^\n]*Audio:\s*([a-z0-9_]+)/i);
        return {
            vcodec: v ? v[1].toLowerCase() : null,
            vline: v ? v[0].toLowerCase() : '',
            acodec: a ? a[1].toLowerCase() : null
        };
    } catch (_) { return { vcodec: null, vline: '', acodec: null }; }
}

async function makeWhatsAppMp4(file) {
    const dir = path.dirname(file);
    const out = path.join(dir, 'wa_' + crypto.randomBytes(3).toString('hex') + '.mp4');
    const info = probeStreams(file);
    const h264ok = info.vcodec === 'h264' && /yuv420p/.test(info.vline) && !/yuv420p10|yuv444|yuv422/.test(info.vline);
    const aacok = !info.acodec || info.acodec === 'aac';
    const common = ['-y', '-hide_banner', '-loglevel', 'error', '-i', file, '-map', '0:v:0', '-map', '0:a:0?'];
    let args;
    if (h264ok && aacok) {
        args = [...common, '-c', 'copy', '-movflags', '+faststart', out];
    } else {
        console.log(`[MEDIA-DL] converting ${info.vcodec}/${info.acodec} -> h264/aac for WhatsApp`);
        args = [...common,
            '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-pix_fmt', 'yuv420p',
            '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
            '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
            '-movflags', '+faststart', out];
    }
    try {
        await run(ffmpegLocation(), args, 10 * 60 * 1000);
        if (fs.existsSync(out) && fs.statSync(out).size > 5000) return out;
    } catch (e) {
        console.warn('[MEDIA-DL] WhatsApp mp4 convert failed:', String(e.message).slice(0, 160));
    }
    return file; // convert na ho saka to original hi bhej do
}

// ─────────────── YouTube client ladder ───────────────
// Datacenter IPs are often refused by the default YouTube client ("confirm you're not a bot").
// Other player clients frequently still work without cookies, so we try them one by one.
const YT_CLIENTS = [null, 'android_vr', 'tv', 'web_safari', 'mweb', 'ios'];

function isYoutubeUrl(u) { return /(?:youtube\.com|youtu\.be|music\.youtube\.com)/i.test(String(u || '')); }

async function tryClients(url, fn) {
    const list = isYoutubeUrl(url) ? YT_CLIENTS : [null];
    const errors = [];
    for (const c of list) {
        try {
            return await fn(c ? ['--extractor-args', `youtube:player_client=${c}`] : []);
        } catch (e) {
            errors.push(`${c || 'default'}: ${String(e.message).slice(0, 200)}`);
            console.warn(`[MEDIA-DL] client ${c || 'default'} failed:`, String(e.message).slice(0, 160));
            if (/TIMEOUT|TOO_BIG|larger than max-filesize|YTDLP_UNAVAILABLE/i.test(e.message)) break;
        }
    }
    const err = new Error(errors[errors.length - 1] || 'yt-dlp failed');
    err.details = errors;
    throw err;
}

// ─────────────── yt-dlp: audio / video ───────────────
async function ytdlpAudio(url) {
    const bin = await ensureYtDlp();
    return tryClients(url, extra => withTmpDir(async dir => {
        await runDl(bin, [
            ...baseArgs(), ...extra,
            '-f', 'bestaudio/best',
            '-x', '--audio-format', 'mp3', '--audio-quality', '0',
            '-o', path.join(dir, 'audio.%(ext)s'),
            url
        ], 120000);
        const file = pickOutput(dir, ['.mp3', '.m4a', '.opus', '.ogg', '.webm']);
        if (!file) throw new Error('NO_OUTPUT_FILE');
        return { buffer: fs.readFileSync(file), ext: path.extname(file).slice(1) };
    }));
}

async function ytdlpVideo(url, maxHeight = 720) {
    const bin = await ensureYtDlp();
    return tryClients(url, extra => withTmpDir(async dir => {
        await runDl(bin, [
            ...baseArgs(), ...extra,
            '-f', `bv*[vcodec^=avc1][height<=${maxHeight}]+ba[ext=m4a]/b[vcodec^=avc1][height<=${maxHeight}][ext=mp4]/bv*[height<=${maxHeight}][ext=mp4]+ba[ext=m4a]/b[height<=${maxHeight}][ext=mp4]/b[height<=${maxHeight}]/b`,
            '--merge-output-format', 'mp4',
            '-o', path.join(dir, 'video.%(ext)s'),
            url
        ], 240000);
        let file = pickOutput(dir, ['.mp4', '.mkv', '.webm', '.mov']);
        if (!file) throw new Error('NO_OUTPUT_FILE');
        file = await makeWhatsAppMp4(file);
        return { buffer: fs.readFileSync(file), ext: 'mp4' };
    }));
}

// ─────────────── ytdl-core fallback (YouTube only) ───────────────
function loadYtdlCore() {
    for (const name of ['@distube/ytdl-core', 'ytdl-core']) {
        try { return require(name); } catch (_) {}
    }
    return null;
}

async function ytdlCoreAudio(url) {
    const ytdl = loadYtdlCore();
    if (!ytdl) throw new Error('YTDL_CORE_MISSING');
    const ffmpeg = require('fluent-ffmpeg');
    ffmpeg.setFfmpegPath(ffmpegLocation());

    return withTmpDir(async dir => {
        const out = path.join(dir, 'audio.mp3');
        await new Promise((resolve, reject) => {
            const stream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio', highWaterMark: 1 << 25 });
            stream.on('error', reject);
            ffmpeg(stream)
                .audioBitrate(192)
                .format('mp3')
                .on('error', reject)
                .on('end', resolve)
                .save(out);
        });
        const buffer = fs.readFileSync(out);
        if (buffer.length < 5000) throw new Error('TOO_SMALL');
        return { buffer, ext: 'mp3' };
    });
}


async function ytdlCoreVideo(url) {
    const ytdl = loadYtdlCore();
    if (!ytdl) throw new Error('YTDL_CORE_MISSING');
    return withTmpDir(async dir => {
        const out = path.join(dir, 'video.mp4');
        await new Promise((resolve, reject) => {
            // itag 22 (720p) / 18 (360p) = audio+video ek hi mp4 mein (H.264 + AAC)
            const stream = ytdl(url, { quality: '22/18', filter: f => f.hasVideo && f.hasAudio && f.container === 'mp4', highWaterMark: 1 << 25 });
            const w = fs.createWriteStream(out);
            stream.on('error', reject);
            w.on('error', reject);
            w.on('finish', resolve);
            stream.pipe(w);
        });
        const file = await makeWhatsAppMp4(out);
        const buffer = fs.readFileSync(file);
        if (buffer.length < 5000) throw new Error('TOO_SMALL');
        return { buffer, ext: 'mp4' };
    });
}


// ─────────────── LAST RESORT: public download APIs / Piped (jab YouTube server IP block kare) ───────────────
// YouTube datacenter IP block kar de to yt-dlp/ytdl-core dono fail hote hain. Tab ye alag servers se
// direct mp4 link maangta hai aur file khud download karta hai. (Cookies lagana sab se pakka hal hai.)
function ytId(u) {
    const m = String(u || '').match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
}
function findUrlDeep(o, depth = 0) {
    if (!o || depth > 5) return null;
    if (typeof o === 'string') return /^https?:\/\/\S+/i.test(o) && /(googlevideo|\.mp4|download|dl\.|cdn|stream|file)/i.test(o) ? o : null;
    if (Array.isArray(o)) { for (const x of o) { const r = findUrlDeep(x, depth + 1); if (r) return r; } return null; }
    if (typeof o === 'object') {
        for (const k of ['download_url', 'downloadUrl', 'dl', 'url', 'link', 'mp4', 'video', 'result', 'data', 'download']) {
            if (k in o) { const r = findUrlDeep(o[k], depth + 1); if (r) return r; }
        }
        for (const k of Object.keys(o)) { const r = findUrlDeep(o[k], depth + 1); if (r) return r; }
    }
    return null;
}
async function fetchToFile(link, dest, maxBytes) {
    const res = await axios.get(link, { responseType: 'stream', timeout: 60000, maxRedirects: 8, headers: { 'User-Agent': 'Mozilla/5.0' } });
    let got = 0;
    await new Promise((resolve, reject) => {
        const w = fs.createWriteStream(dest);
        res.data.on('data', c => { got += c.length; if (got > maxBytes) { res.data.destroy(new Error('TOO_BIG')); } });
        res.data.pipe(w);
        w.on('finish', resolve); w.on('error', reject); res.data.on('error', reject);
    });
    if (got < 20000) throw new Error('TOO_SMALL');
}
async function apiFallbackVideo(url, maxBytes = MAX_BYTES, budgetMs = 0) {
    const t0 = Date.now();
    const id = ytId(url);
    const enc = encodeURIComponent(url);
    const tries = [];
    if (id) {
        for (const host of ['https://pipedapi.kavin.rocks', 'https://pipedapi.adminforge.de', 'https://api.piped.private.coffee']) {
            tries.push({ name: 'piped ' + host.replace('https://', ''), get: async () => {
                const r = await axios.get(`${host}/streams/${id}`, { timeout: 15000 });
                const vs = (r.data.videoStreams || []).filter(v => !v.videoOnly && /mp4/i.test(v.mimeType || v.format || ''));
                vs.sort((a, b) => (b.height || 0) - (a.height || 0));
                const pick = vs.find(v => (v.height || 0) <= 720) || vs[0];
                return pick && pick.url;
            } });
        }
    }
    // Ye APIs ek dusre bot (AhmadShahzad-MDbot, jo user ne khud diya) ki asli, kaam karti hui code se
    // li gayi hain — isliye inpar bharosa zyada hai nisbatan khud-se-socha hue naamon ke.
    // backend1.tioo.eu.org sab se pehle, kyunke wo us dusre bot ki MAIN/primary API hai.
    for (const t of [
        { name: 'backend1.tioo.eu.org', get: async () => { const d = (await axios.get(`https://backend1.tioo.eu.org/YouTube?url=${enc}`, { timeout: 25000 })).data; return d && d.status && d.mp4; } },
        { name: 'eliteprotech-apis.zone.id', get: async () => { const d = (await axios.get(`https://eliteprotech-apis.zone.id/ytdown?url=${enc}&format=mp4`, { timeout: 25000 })).data; return d && d.success && d.downloadURL; } },
        { name: 'api.yupra.my.id', get: async () => { const d = (await axios.get(`https://api.yupra.my.id/api/downloader/ytmp4?url=${enc}`, { timeout: 25000 })).data; return d && d.success && d.data && d.data.download_url; } },
        { name: 'okatsu-rolezapiiz.vercel.app', get: async () => { const d = (await axios.get(`https://okatsu-rolezapiiz.vercel.app/downloader/ytmp4?url=${enc}`, { timeout: 25000 })).data; return d && d.result && d.result.mp4; } }
    ]) tries.push(t);
    for (const base of [
        `https://api.ryzendesu.vip/api/downloader/ytmp4?url=${enc}`,
        `https://api.siputzx.my.id/api/d/ytmp4?url=${enc}`,
        `https://api.vreden.my.id/api/ytmp4?url=${enc}`,
        `https://api.princetechn.com/api/download/ytmp4?apikey=prince&url=${enc}`,   // v7: doosre zip ki ytdl.js se
        `https://api.giftedtech.co.ke/api/download/ytmp4?apikey=gifted&url=${enc}`,
        ...String(process.env.YT_API_URLS || '').split(',').map(x => x.trim()).filter(Boolean).map(x => x.replace('{url}', enc))   // apni API: YT_API_URLS="https://x/api?url={url},..."
    ]) tries.push({ name: base.split('/')[2], get: async () => findUrlDeep((await axios.get(base, { timeout: 25000 })).data) });
    try {   // ruhend-scraper (package me pehle se hai)
        const rs = require('ruhend-scraper');
        if (rs && rs.ytmp4) tries.push({ name: 'ruhend-scraper', get: async () => findUrlDeep(await rs.ytmp4(url)) });
    } catch (_) {}

    const errors = [];
    for (const t of tries) {
        if (budgetMs && Date.now() - t0 > budgetMs) { errors.push('time budget khatam'); break; }
        try {
            const link = await t.get();
            if (!link) throw new Error('no link');
            return await withTmpDir(async dir => {
                const raw = path.join(dir, 'api.mp4');
                await fetchToFile(link, raw, maxBytes);
                const file = await makeWhatsAppMp4(raw);
                return { buffer: fs.readFileSync(file), ext: 'mp4', source: t.name };
            });
        } catch (e) { errors.push(`${t.name}: ${String(e.message).slice(0, 80)}`); }
    }
    const err = new Error('API_FALLBACK_FAILED'); err.details = errors; throw err;
}

// ─────────────── public API ───────────────
async function soundcloudAudio(query) {
    const bin = await ensureYtDlp();
    return withTmpDir(async dir => {
        await runDl(bin, [
            ...baseArgs(),
            '-f', 'bestaudio/best',
            '-x', '--audio-format', 'mp3', '--audio-quality', '0',
            '-o', path.join(dir, 'audio.%(ext)s'),
            `scsearch1:${query}`
        ], 120000);
        const file = pickOutput(dir, ['.mp3', '.m4a', '.opus', '.ogg', '.webm']);
        if (!file) throw new Error('NO_OUTPUT_FILE');
        return { buffer: fs.readFileSync(file), ext: path.extname(file).slice(1), source: 'soundcloud' };
    });
}

async function apiFallbackAudio(url, maxBytes = MAX_BYTES) {
    const id = ytId(url);
    const enc = encodeURIComponent(url);
    const tries = [];
    if (id) {
        for (const host of ['https://pipedapi.kavin.rocks', 'https://pipedapi.adminforge.de']) {
            tries.push({ name: 'piped ' + host.replace('https://', ''), get: async () => {
                const r = await axios.get(`${host}/streams/${id}`, { timeout: 15000 });
                const as = (r.data.audioStreams || []).sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
                return as[0] && as[0].url;
            } });
        }
    }
    // Ye bhi dusre (asli, chalte hue) bot se li hui APIs hain
    tries.push({ name: 'backend1.tioo.eu.org', get: async () => { const d = (await axios.get(`https://backend1.tioo.eu.org/YouTube?url=${enc}`, { timeout: 25000 })).data; return d && d.status && (d.mp3 || d.audio || d.mp4); } });
    tries.push({ name: 'eliteprotech-apis.zone.id', get: async () => { const d = (await axios.get(`https://eliteprotech-apis.zone.id/ytdown?url=${enc}&format=mp3`, { timeout: 25000 })).data; return d && d.success && d.downloadURL; } });
    tries.push({ name: 'api.yupra.my.id', get: async () => { const d = (await axios.get(`https://api.yupra.my.id/api/downloader/ytmp3?url=${enc}`, { timeout: 25000 })).data; return d && d.success && d.data && d.data.download_url; } });
    tries.push({ name: 'okatsu-rolezapiiz.vercel.app', get: async () => { const d = (await axios.get(`https://okatsu-rolezapiiz.vercel.app/downloader/ytmp3?url=${enc}`, { timeout: 25000 })).data; return d && d.result && (d.result.mp3 || d.result.url); } });
    for (const base of [   // v7: doosre zip ki ytdl.js se extra providers
        `https://api.princetechn.com/api/download/ytmp3?apikey=prince&url=${enc}`,
        `https://api.giftedtech.co.ke/api/download/ytmp3?apikey=gifted&url=${enc}`,
        `https://api.siputzx.my.id/api/d/ytmp3?url=${enc}`,
        `https://api.vreden.my.id/api/ytmp3?url=${enc}`,
    ]) tries.push({ name: base.split('/')[2], get: async () => findUrlDeep((await axios.get(base, { timeout: 25000 })).data) });
    tries.push({ name: 'izumiiiii.vercel.app', get: async () => { const d = (await axios.get(`https://izumiiiii.vercel.app/download/ytmp3?url=${enc}`, { timeout: 25000 })).data; return d && d.result && (d.result.downloadUrl || d.result.url); } });

    const errors = [];
    for (const t of tries) {
        try {
            const link = await t.get();
            if (!link) throw new Error('no link');
            return await withTmpDir(async dir => {
                const raw = path.join(dir, 'api.audio');
                await fetchToFile(link, raw, maxBytes);
                return { buffer: fs.readFileSync(raw), ext: 'mp3', source: t.name };
            });
        } catch (e) { errors.push(`${t.name}: ${String(e.message).slice(0, 80)}`); }
    }
    const err = new Error('API_FALLBACK_FAILED'); err.details = errors; throw err;
}

async function downloadAudio(url, opts = {}) {
    const errors = [];
    try { return await withUpdateRetry(() => ytdlpAudio(url)); }
    catch (e) { errors.push(...(e.details || ['yt-dlp: ' + e.message])); console.warn('[MEDIA-DL] yt-dlp audio failed:', e.message); }

    try { return await ytdlCoreAudio(url); }
    catch (e) { errors.push('ytdl-core: ' + e.message); console.warn('[MEDIA-DL] ytdl-core audio failed:', e.message); }

    try {
        const r = await apiFallbackAudio(url);
        if (r.buffer.length <= MAX_BYTES) { console.log('[MEDIA-DL] audio via fallback:', r.source); return r; }
    } catch (e) { errors.push(...(e.details || ['api: ' + e.message])); console.warn('[MEDIA-DL] api fallback (audio) failed'); }

    if (opts.fallbackQuery) {
        try { return await soundcloudAudio(opts.fallbackQuery); }
        catch (e) { errors.push('soundcloud: ' + e.message); console.warn('[MEDIA-DL] soundcloud failed:', e.message); }
    }

    const err = new Error('LOCAL_DOWNLOAD_FAILED');
    err.details = errors;
    throw err;
}

async function downloadVideo(url, maxHeight) {
    // FIX: Railway/cloud IP par YouTube aksar yt-dlp ko block karta hai aur har koshish mein minute-minute lag jata tha
    // (video "aati hi nahi" thi). Ab YouTube links ke liye PEHLE tez APIs (90s ka budget), phir yt-dlp.
    let apiDetails = [];
    if (isYoutubeUrl(url)) {
        try {
            const r = await apiFallbackVideo(url, MAX_BYTES, 90000);
            if (r.buffer.length <= MAX_BYTES) { console.log('[MEDIA-DL] video via API:', r.source); return r; }
            apiDetails.push('api: TOO_BIG');
        } catch (e) { apiDetails = (e.details || ['api: ' + e.message]).slice(); console.warn('[MEDIA-DL] API-first failed, yt-dlp try karta hu'); }
    }
    // badi file ho to quality kam karke dobara (720 -> 480 -> 360 -> 240)
    const ladder = [maxHeight || 720, 480, 360, 240].filter((h, i, a) => h <= (maxHeight || 720) && a.indexOf(h) === i);
    let last;
    for (const h of ladder) {
        try { return await withUpdateRetry(() => ytdlpVideo(url, h)); }
        catch (e) {
            last = e;
            console.warn(`[MEDIA-DL] yt-dlp video ${h}p failed:`, e.message);
            if (!/TOO_BIG/.test(e.message + JSON.stringify(e.details || []))) break;
        }
    }
    // yt-dlp sab fail: pure-node ytdl-core se ek aakhri koshish (sirf YouTube)
    const details = [...apiDetails, ...((last && last.details) || [last ? last.message : 'unknown'])];
    if (isYoutubeUrl(url)) {
        try {
            const r = await ytdlCoreVideo(url);
            if (r.buffer.length <= MAX_BYTES) return r;
            details.push('ytdl-core: TOO_BIG');
        } catch (e) { details.push('ytdl-core: ' + e.message); console.warn('[MEDIA-DL] ytdl-core video failed:', e.message); }
        try {
            const r = await apiFallbackVideo(url, MAX_BYTES, 45000);
            if (r.buffer.length <= MAX_BYTES) { console.log('[MEDIA-DL] video via fallback:', r.source); return r; }
        } catch (e) { details.push(...(e.details || ['api: ' + e.message])); console.warn('[MEDIA-DL] api fallback failed'); }
    }
    const err = new Error('LOCAL_DOWNLOAD_FAILED');
    err.details = details;
    throw err;
}

// Fail ki wajah ko chat ke liye asaan Roman Urdu hint mein badalta hai
function explainError(e) {
    const why = String((e && e.message) || '') + ' ' + JSON.stringify((e && e.details) || []);
    // asli error ki aakhri line (screenshot bhej kar wajah pata chal sake)
    const lastRaw = String(((e && e.details && e.details[e.details.length - 1]) || (e && e.message) || ''))
        .replace(/\s+/g, ' ').replace(/https?:\/\/\S+/g, '<link>').trim().slice(0, 170);
    const tail = lastRaw ? '\n📋 ' + lastRaw : '';

    if (/TOO_BIG|larger than max-filesize/i.test(why)) return 'Video bohat bari hai (WhatsApp limit).';
    if (/YTDLP_UNAVAILABLE/i.test(why)) return 'yt-dlp server par install nahi hua (shayad GitHub khul nahi raha). .dltest chalao.' + tail;
    if (/sign in to confirm|not a bot|login required|cookies|HTTP Error 4(03|29)|rate-limit|too many requests|requested content is not available/i.test(why)) return 'YouTube ne server ka IP block kiya hai. Browser se cookies.txt export karke YTDLP_COOKIES_B64 env mein daalo.' + tail;
    if (/n challenge|nsig|js runtime|javascript runtime|ejs|Signature solving/i.test(why)) return 'yt-dlp purana hai ya JS runtime nahi mila. Bot redeploy karo (yt-dlp update ho jayega).' + tail;
    if (/Private video|members-only|Video unavailable|has been removed|not available in your country/i.test(why)) return 'Video private/removed/region-blocked hai.' + tail;
    if (/ffmpeg|ffprobe/i.test(why)) return 'ffmpeg missing hai. .dltest chalao.' + tail;
    if (/NO_OUTPUT_FILE/i.test(why)) return 'Download se file nahi bani (link ya format support nahi). .dltest chalao.' + tail;
    if (/YTDL_CORE_MISSING|Status code: 4(10|29)|Could not extract functions/i.test(why)) return 'YouTube se video nahi mili (YouTube ne block kiya ya library purani hai). Cookies lagao ya redeploy karo.' + tail;
    if (/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ETIMEDOUT|getaddrinfo|Temporary failure in name resolution|Name or service not known|timed out|TIMEOUT/i.test(why)) return 'Server se internet/site nahi khul rahi (network ya timeout). .dltest chalao.' + tail;
    return (tail ? 'Wajah:' + tail : '') + '\n.dltest chalao.';
}

// .dltest: yt-dlp / ffmpeg / JS runtime / cookies ki haalat + ek asli test (download kiye bina)
async function diagnose(url) {
    const out = [];
    let bin = null;
    try { bin = await ensureYtDlp(); out.push('✅ yt-dlp: ' + bin); }
    catch (e) { out.push('❌ yt-dlp nahi mila/install nahi hua: ' + String(e.message).slice(0, 120)); }
    if (bin) {
        try {
            const v = spawnSync(bin, ['--version'], { encoding: 'utf8', timeout: 15000 });
            out.push('   version: ' + String(v.stdout || v.stderr || '?').trim().slice(0, 40));
        } catch (_) {}
        out.push(JS_RUNTIME_ARGS.length ? '✅ JS runtime: node' : '⚠️ JS runtime: yt-dlp ko --js-runtimes nahi mila (purana yt-dlp?)');
    }
    try {
        const f = ffmpegLocation();
        const r = spawnSync(f, ['-version'], { encoding: 'utf8', timeout: 10000 });
        out.push(r.status === 0 ? '✅ ffmpeg theek' : '❌ ffmpeg nahi chala');
    } catch (_) { out.push('❌ ffmpeg nahi mila'); }
    out.push(cookiesFile() ? '✅ cookies: lagi hui hain' : 'ℹ️ cookies: nahi (YouTube block kare to zaroori)');
    if (bin && url) {
        try {
            const r = await run(bin, [...baseArgs(), '--simulate', '-f', 'bestaudio/best', '--no-playlist', url], 60000);
            out.push('✅ YouTube test: video info mil gayi (download chal sakta hai)');
        } catch (e) {
            const tail = String(e.message || e).replace(/\s+/g, ' ').replace(/https?:\/\/\S+/g, '<link>').slice(-300);
            out.push('❌ YouTube test fail:\n' + tail);
        }
    }
    return out.join('\n');
}

// ─────────────── FULL-LENGTH video to a FILE (no RAM buffer, quality ladder) ───────────────
// Tries 480p -> 360p -> 240p -> 144p until the file fits `maxBytes`.
// Never uses any "converter" website, so you always get the real, full video.
function baseArgsFile(maxBytes) {
    return baseArgs().map((a, i, arr) => (arr[i - 1] === '--max-filesize' ? String(maxBytes) : a));
}

function probeDuration(file) {
    try {
        const r = spawnSync(ffmpegLocation(), ['-i', file], { encoding: 'utf8', timeout: 30000 });
        const m = String((r.stderr || '') + (r.stdout || '')).match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
        if (!m) return 0;
        return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
    } catch (_) { return 0; }
}

async function downloadFullVideoFile(url, opts = {}) {
    const maxBytes = opts.maxBytes || 250 * 1024 * 1024;
    const ladder = opts.heights || [480, 360, 240, 144];
    const bin = await ensureYtDlp();
    const dir = path.join(os.tmpdir(), 'ahmad-full-' + crypto.randomBytes(6).toString('hex'));
    fs.mkdirSync(dir, { recursive: true });
    const cleanup = () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {} };
    const errors = [];
    for (const h of ladder) {
        try {
            for (const f of fs.readdirSync(dir)) fs.rmSync(path.join(dir, f), { force: true });
            await tryClients(url, extra => runDl(bin, [
                ...baseArgsFile(maxBytes), ...extra,
                '-f', `bv*[vcodec^=avc1][height<=${h}]+ba[ext=m4a]/b[vcodec^=avc1][height<=${h}][ext=mp4]/bv*[height<=${h}][ext=mp4]+ba[ext=m4a]/b[height<=${h}][ext=mp4]/b[height<=${h}]/b`,
                '--merge-output-format', 'mp4',
                '-o', path.join(dir, 'video.%(ext)s'),
                url
            ], opts.timeoutMs || 20 * 60 * 1000));
            let file = pickOutput(dir, ['.mp4', '.mkv', '.webm', '.mov']);
            if (!file) throw new Error('NO_OUTPUT_FILE');
            file = await makeWhatsAppMp4(file);
            const size = fs.statSync(file).size;
            if (size > maxBytes) throw new Error('TOO_BIG');
            return { path: file, size, height: h, duration: probeDuration(file), cleanup };
        } catch (e) {
            errors.push(`${h}p: ${e.message}`);
            console.warn(`[MEDIA-DL] full video ${h}p failed:`, e.message);
        }
    }
    if (isYoutubeUrl(url)) {
        try {
            const r = await ytdlCoreVideo(url);
            const file = path.join(dir, 'core.mp4');
            fs.writeFileSync(file, r.buffer);
            if (r.buffer.length <= maxBytes) return { path: file, size: r.buffer.length, height: 360, duration: probeDuration(file), cleanup };
            errors.push('ytdl-core: TOO_BIG');
        } catch (e) { errors.push('ytdl-core: ' + e.message); }
        try {
            const r = await apiFallbackVideo(url, maxBytes);
            const file = path.join(dir, 'api_full.mp4');
            fs.writeFileSync(file, r.buffer);
            return { path: file, size: r.buffer.length, height: 360, duration: probeDuration(file), cleanup };
        } catch (e) { errors.push(...(e.details || ['api: ' + e.message])); }
    }
    cleanup();
    tryUpdateYtDlp();
    const err = new Error('LOCAL_DOWNLOAD_FAILED');
    err.details = errors;
    throw err;
}

// Any site yt-dlp supports (Instagram, Facebook, TikTok, X, ...) — returns mp4
async function downloadAnyVideo(url) {
    return downloadVideo(url, 720);
}

module.exports = { diagnose, explainError, ensureYtDlp, ffmpegLocation, isYoutubeUrl, downloadAudio, downloadVideo, downloadAnyVideo, downloadFullVideoFile, probeDuration, apiFallbackVideo, apiFallbackAudio, MAX_BYTES };
