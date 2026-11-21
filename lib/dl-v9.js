// lib/dl-v9.js — v9 downloaders (clean, readable; koi obfuscated code nahi)
//  tiktok(url)      -> { kind:'video'|'images', videos:[url...], images:[url...], audio, title, author, via }
//  pinterest(url)   -> { kind:'video'|'image', video, image, title }       (pin link, pin.it short link)
//  pinterestSearch(q, 'video'|'image') -> [ {video?,image?,title} ... ]
//  twitter(url)     -> { items:[{type:'video'|'image', url}], text, user }
//  redditJson(url)  -> { video, audio, images:[...], title }
//  spotifyTitle(url)-> "Song - Artist" (oEmbed)
//  fetchBuffer(url, opts) / fetchVideoBuffer(urls)
const axios = require('axios');
const path = require('path');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');
const ffq = require('./ffq');

const UA_DESK = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const UA_MOB = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36';
const MAX_BYTES = 95 * 1024 * 1024;

const enc = encodeURIComponent;
const isHttp = (u) => typeof u === 'string' && /^https?:\/\//i.test(u);
const uniq = (a) => [...new Set(a.filter(Boolean))];

// kisi bhi JSON mein se saare http links nikalo (alag alag API ka format alag hota hai)
function deepUrls(obj, out = [], depth = 0) {
    if (depth > 7 || obj == null) return out;
    if (typeof obj === 'string') { if (isHttp(obj)) out.push(obj); return out; }
    if (Array.isArray(obj)) { for (const v of obj) deepUrls(v, out, depth + 1); return out; }
    if (typeof obj === 'object') for (const k of Object.keys(obj)) deepUrls(obj[k], out, depth + 1);
    return out;
}
const isVideoUrl = (u) => /\.mp4(\?|$)|video|\/play|tiktokcdn|akamaized|v16|v19|v58|mime_type=video/i.test(u) && !/\.(jpe?g|png|webp|gif|mp3)(\?|$)/i.test(u);
const isImageUrl = (u) => /\.(jpe?g|png|webp)(\?|$)/i.test(u);

async function getJson(url, opts = {}) {
    const r = await axios.get(url, { timeout: 25000, headers: { 'User-Agent': UA_DESK, Accept: 'application/json, text/plain, */*', ...(opts.headers || {}) }, params: opts.params, validateStatus: s => s >= 200 && s < 300 });
    return typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
}

// ───────────────────────── buffers ─────────────────────────
async function fetchBuffer(url, { referer, timeout = 90000, minBytes = 3000 } = {}) {
    const r = await axios.get(url, {
        responseType: 'arraybuffer', timeout, maxContentLength: MAX_BYTES, maxBodyLength: MAX_BYTES, maxRedirects: 6,
        headers: { 'User-Agent': UA_DESK, ...(referer ? { Referer: referer } : {}), Accept: '*/*' }
    });
    const buf = Buffer.from(r.data);
    const ct = String(r.headers['content-type'] || '');
    if (buf.length < minBytes || /text\/html|application\/json/i.test(ct)) throw new Error('bad media response');
    return { buffer: buf, contentType: ct };
}
// kai links mein se pehla jo asli video de
async function fetchVideoBuffer(urls, referer) {
    let last = null;
    for (const u of uniq(urls)) {
        try {
            if (/\.m3u8(\?|$)/i.test(u)) return { buffer: await hlsToMp4(u), url: u };
            const r = await fetchBuffer(u, { referer });
            return { buffer: r.buffer, url: u };
        } catch (e) { last = e; }
    }
    throw last || new Error('no video url');
}
async function hlsToMp4(m3u8) {
    const out = path.join(os.tmpdir(), 'hls_' + crypto.randomBytes(5).toString('hex') + '.mp4');
    try {
        await ffq.run(ffq.ffmpegBin(), ['-y', '-hide_banner', '-loglevel', 'error', '-user_agent', UA_DESK, '-i', m3u8, '-c', 'copy', '-bsf:a', 'aac_adtstoasc', '-movflags', '+faststart', out], 120000);
        return fs.readFileSync(out);
    } finally { try { fs.rmSync(out, { force: true }); } catch (_) {} }
}

// ───────────────────────── TIKTOK ─────────────────────────
// har provider: async (url) => { videos:[], images:[], audio, title, author }  ya throw
const tiktokProviders = [
    { name: 'tikwm', run: async (url) => {
        const j = await getJson('https://www.tikwm.com/api/', { params: { url, hd: 1 }, headers: { Referer: 'https://www.tikwm.com/' } });
        const d = j && j.data; if (!d) throw new Error('empty');
        const abs = (p) => (p && !isHttp(p) ? 'https://www.tikwm.com' + p : p);
        return { videos: uniq([abs(d.hdplay), abs(d.play), abs(d.wmplay)]), images: Array.isArray(d.images) ? d.images : [], audio: abs(d.music), title: d.title, author: d.author && (d.author.nickname || d.author.unique_id) };
    } },
    { name: 'tikwm-post', run: async (url) => {
        const r = await axios.post('https://www.tikwm.com/api/', new URLSearchParams({ url, hd: '1' }).toString(), { timeout: 25000, headers: { 'User-Agent': UA_DESK, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', Referer: 'https://www.tikwm.com/' } });
        const d = r.data && r.data.data; if (!d) throw new Error('empty');
        const abs = (p) => (p && !isHttp(p) ? 'https://www.tikwm.com' + p : p);
        return { videos: uniq([abs(d.hdplay), abs(d.play)]), images: Array.isArray(d.images) ? d.images : [], audio: abs(d.music), title: d.title, author: d.author && d.author.nickname };
    } },
    { name: 'ssstik', run: async (url) => {
        const cheerio = require('cheerio');
        const home = await axios.get('https://ssstik.io/en', { timeout: 20000, headers: { 'User-Agent': UA_DESK } });
        const tt = (String(home.data).match(/s_tt\s*=\s*['"]([^'"]+)['"]/) || [])[1];
        if (!tt) throw new Error('no token');
        const r = await axios.post('https://ssstik.io/abc?url=dl', new URLSearchParams({ id: url, locale: 'en', tt }).toString(), {
            timeout: 25000, headers: { 'User-Agent': UA_DESK, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'HX-Request': 'true', 'HX-Target': 'target', 'HX-Current-URL': 'https://ssstik.io/en', Origin: 'https://ssstik.io', Referer: 'https://ssstik.io/en' }
        });
        const $ = cheerio.load(String(r.data));
        const video = $('a.without_watermark').attr('href');
        const images = $('a.download_link.slide, .slide a').map((i, el) => $(el).attr('href')).get().filter(isHttp);
        const audio = $('a.music').attr('href');
        if (!video && !images.length) throw new Error('no links');
        return { videos: uniq([video]), images, audio, title: $('p.maintext').text().trim(), author: $('h2').first().text().trim() };
    } },
    { name: 'tiklydown', run: async (url) => {
        const j = await getJson('https://api.tiklydown.eu.org/api/download/v3', { params: { url } });
        const urls = deepUrls(j);
        const videos = urls.filter(isVideoUrl); if (!videos.length && !(j.result && j.result.images)) throw new Error('empty');
        return { videos: uniq(videos), images: (j.result && j.result.images) || [], title: j.result && j.result.description };
    } },
    { name: 'vreden', run: async (url) => {
        const j = await getJson('https://api.vreden.my.id/api/tiktok', { params: { url } });
        const urls = deepUrls(j.result || j); const videos = urls.filter(isVideoUrl);
        if (!videos.length) throw new Error('empty'); return { videos: uniq(videos), title: j.result && j.result.title };
    } },
    { name: 'siputzx', run: async (url) => {
        const j = await getJson('https://api.siputzx.my.id/api/d/tiktok', { params: { url } });
        const urls = deepUrls(j.data || j); const videos = urls.filter(isVideoUrl);
        if (!videos.length) throw new Error('empty'); return { videos: uniq(videos) };
    } },
    { name: 'princetech', run: async (url) => {
        const j = await getJson('https://api.princetechn.com/api/download/tiktok', { params: { apikey: 'prince', url } });
        const urls = deepUrls(j.result || j); const videos = urls.filter(isVideoUrl);
        if (!videos.length) throw new Error('empty'); return { videos: uniq(videos), title: j.result && j.result.title };
    } },
    { name: 'dreaded', run: async (url) => {
        const j = await getJson('https://api.dreaded.site/api/tiktok', { params: { url } });
        const urls = deepUrls(j.tiktok || j.result || j); const videos = urls.filter(isVideoUrl);
        if (!videos.length) throw new Error('empty'); return { videos: uniq(videos) };
    } },
];
async function tiktok(url) {
    const errs = [];
    for (const p of tiktokProviders) {
        try {
            const r = await p.run(url);
            if (r && ((r.videos && r.videos.length) || (r.images && r.images.length))) {
                // pehle video try karo; slideshow ho to images
                if (r.videos && r.videos.length) {
                    try { const got = await fetchVideoBuffer(r.videos, 'https://www.tiktok.com/'); return { kind: 'video', buffer: got.buffer, audio: r.audio, title: r.title, author: r.author, via: p.name }; }
                    catch (e) { errs.push(`${p.name}: download ${e.message}`); if (!(r.images && r.images.length)) continue; }
                }
                if (r.images && r.images.length) return { kind: 'images', images: r.images, audio: r.audio, title: r.title, author: r.author, via: p.name };
            }
            errs.push(`${p.name}: empty`);
        } catch (e) { errs.push(`${p.name}: ${(e.code || e.message || e)}`); }
    }
    const err = new Error('TIKTOK_ALL_FAILED'); err.details = errs; throw err;
}

// ───────────────────────── PINTEREST ─────────────────────────
async function resolvePinUrl(url) {
    if (/pin\.it\//i.test(url) || !/\/pin\/\d+/.test(url)) {
        try {
            const r = await axios.get(url, { timeout: 20000, maxRedirects: 8, headers: { 'User-Agent': UA_DESK }, validateStatus: s => s >= 200 && s < 400 });
            const final = (r.request && r.request.res && r.request.res.responseUrl) || url;
            return final;
        } catch (e) { return url; }
    }
    return url;
}
function pickPinMedia(d) {
    // d = PinResource data
    const pools = [];
    if (d.videos && d.videos.video_list) pools.push(d.videos.video_list);
    const sp = d.story_pin_data;
    if (sp && Array.isArray(sp.pages)) for (const pg of sp.pages) for (const b of (pg.blocks || [])) if (b.video && b.video.video_list) pools.push(b.video.video_list);
    const cands = [];
    for (const vl of pools) for (const k of Object.keys(vl)) { const v = vl[k]; if (v && v.url) cands.push({ k, url: v.url, w: v.width || 0, h: v.height || 0 }); }
    const mp4 = cands.filter(c => /\.mp4(\?|$)/i.test(c.url)).sort((a, b) => (b.h || b.w) - (a.h || a.w));
    const hls = cands.filter(c => /\.m3u8(\?|$)/i.test(c.url));
    const video = mp4.length ? mp4[0].url : (hls.length ? hls[0].url : null);
    let image = (d.images && (d.images.orig || d.images['736x'] || d.images['474x'] || Object.values(d.images)[0]) || {}).url || null;
    if (!image && Array.isArray(d.carousel_data && d.carousel_data.carousel_slots)) image = (d.carousel_data.carousel_slots[0].images.orig || {}).url || null;
    return { video, image, title: d.grid_title || d.title || d.description || '' };
}
async function pinterest(rawUrl) {
    const url = await resolvePinUrl(rawUrl);
    const id = (String(url).match(/\/pin\/(\d+)/) || [])[1];
    const errs = [];
    if (id) {
        try {
            const data = JSON.stringify({ options: { id, field_set_key: 'detailed', noCache: true }, context: {} });
            const j = await getJson('https://www.pinterest.com/resource/PinResource/get/', {
                params: { source_url: `/pin/${id}/`, data },
                headers: { 'X-Requested-With': 'XMLHttpRequest', 'X-Pinterest-AppState': 'active', Referer: 'https://www.pinterest.com/', 'Accept-Language': 'en-US,en;q=0.9' }
            });
            const d = j && j.resource_response && j.resource_response.data;
            if (d) { const m = pickPinMedia(d); if (m.video || m.image) return { ...m, kind: m.video ? 'video' : 'image', via: 'api' }; }
            errs.push('api: empty');
        } catch (e) { errs.push('api: ' + (e.message || e)); }
    }
    // page HTML se: video_list / contentUrl / og tags
    try {
        const r = await axios.get(url, { timeout: 25000, maxRedirects: 8, headers: { 'User-Agent': UA_DESK, 'Accept-Language': 'en-US,en;q=0.9' }, responseType: 'text', validateStatus: s => s >= 200 && s < 400 });
        const html = String(r.data || '');
        const mp4s = uniq((html.match(/https?:\\?\/\\?\/v1?\.pinimg\.com[^"'\\\s]+?\.mp4/g) || []).map(u => u.replace(/\\\//g, '/')));
        const hls = uniq((html.match(/https?:\\?\/\\?\/[^"'\\\s]*pinimg\.com[^"'\\\s]+?\.m3u8/g) || []).map(u => u.replace(/\\\//g, '/')));
        const meta = (p) => { const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]*content=["']([^"']+)["']`, 'i')) || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${p}["']`, 'i')); return m ? m[1].replace(/&amp;/g, '&') : ''; };
        const ogv = meta('og:video') || meta('og:video:url');
        const video = mp4s.sort((a, b) => b.length - a.length)[0] || (/\.mp4/i.test(ogv) ? ogv : '') || hls[0] || '';
        let image = meta('og:image'); if (image) image = image.replace(/\/(?:\d+x\d*|\d+x)\//, '/originals/');
        if (video || image) return { video: video || null, image: image || null, title: meta('og:title'), kind: video ? 'video' : 'image', via: 'page' };
        errs.push('page: nothing');
    } catch (e) { errs.push('page: ' + (e.message || e)); }
    const err = new Error('PIN_FAILED'); err.details = errs; throw err;
}
async function pinterestSearch(query, mode = 'image') {
    const q = String(query || '').trim(); if (!q) return [];
    const scope = mode === 'video' ? 'videos' : 'pins';
    const out = [];
    try {
        const data = JSON.stringify({ options: { query: q, scope, rs: 'typed', page_size: 40 }, context: {} });
        const j = await getJson('https://www.pinterest.com/resource/BaseSearchResource/get/', {
            params: { source_url: `/search/${scope}/?q=${enc(q)}`, data },
            headers: { 'X-Requested-With': 'XMLHttpRequest', 'X-Pinterest-AppState': 'active', Referer: 'https://www.pinterest.com/', 'Accept-Language': 'en-US,en;q=0.9' }
        });
        const results = (j && j.resource_response && j.resource_response.data && j.resource_response.data.results) || [];
        for (const d of results) { const m = pickPinMedia(d); if (mode === 'video' ? m.video : (m.image && !m.video)) out.push(m); }
    } catch (_) { /* html fallback */ }
    if (!out.length) {
        try {
            const r = await axios.get(`https://www.pinterest.com/search/${scope}/?q=${enc(q)}`, { timeout: 25000, headers: { 'User-Agent': UA_DESK, 'Accept-Language': 'en-US,en;q=0.9' }, responseType: 'text' });
            const html = String(r.data || '');
            if (mode === 'video') {
                for (const u of uniq((html.match(/https?:\\?\/\\?\/v1?\.pinimg\.com[^"'\\\s]+?\.mp4/g) || []).map(u => u.replace(/\\\//g, '/')))) out.push({ video: u, title: q });
            } else {
                for (const u of uniq((html.match(/https?:\\?\/\\?\/i\.pinimg\.com\/(?:736x|474x|originals)\/[^"'\\\s]+?\.(?:jpg|png|webp)/g) || []).map(u => u.replace(/\\\//g, '/').replace(/\/(?:736x|474x)\//, '/originals/')))) out.push({ image: u, title: q });
            }
        } catch (_) {}
    }
    return out;
}

// ───────────────────────── TWITTER / X ─────────────────────────
async function twitter(url) {
    const m = String(url).match(/(?:twitter|x)\.com\/([A-Za-z0-9_]+)\/status(?:es)?\/(\d+)/i);
    if (!m) throw new Error('BAD_LINK');
    const [, user, id] = m; const errs = [];
    for (const base of [`https://api.vxtwitter.com/${user}/status/${id}`, `https://api.fxtwitter.com/${user}/status/${id}`]) {
        try {
            const j = await getJson(base);
            const items = [];
            if (Array.isArray(j.media_extended)) for (const x of j.media_extended) if (x.url) items.push({ type: x.type === 'image' ? 'image' : 'video', url: x.url });
            const t = j.tweet && j.tweet.media;
            if (!items.length && t) {
                for (const v of (t.videos || [])) if (v.url) items.push({ type: 'video', url: v.url });
                for (const p of (t.photos || [])) if (p.url) items.push({ type: 'image', url: p.url });
            }
            if (items.length) return { items, text: j.text || (j.tweet && j.tweet.text) || '', user: j.user_name || (j.tweet && j.tweet.author && j.tweet.author.name) || user };
            errs.push('no media');
        } catch (e) { errs.push(e.message || e); }
    }
    const err = new Error('TW_FAILED'); err.details = errs; throw err;
}

// ───────────────────────── REDDIT ─────────────────────────
async function redditJson(url) {
    const clean = String(url).split('?')[0].replace(/\/$/, '');
    const j = await getJson(clean + '.json', { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AhmadShahzad-MD/9)' }, params: { raw_json: 1 } });
    const d = j && j[0] && j[0].data && j[0].data.children && j[0].data.children[0] && j[0].data.children[0].data;
    if (!d) throw new Error('no post');
    const rv = (d.secure_media && d.secure_media.reddit_video) || (d.media && d.media.reddit_video);
    const images = [];
    if (d.is_gallery && d.media_metadata) for (const k of Object.keys(d.media_metadata)) { const s = d.media_metadata[k].s; if (s && (s.u || s.gif)) images.push(s.u || s.gif); }
    else if (/\.(jpe?g|png|gif)$/i.test(d.url || '')) images.push(d.url);
    const audio = rv && rv.fallback_url ? rv.fallback_url.replace(/DASH_\d+\.mp4.*$/, 'DASH_AUDIO_128.mp4') : null;
    return { video: rv && rv.fallback_url, audio, images, title: d.title };
}
async function muxVideoAudio(videoUrl, audioUrl) {
    const dir = path.join(os.tmpdir(), 'rd_' + crypto.randomBytes(5).toString('hex')); fs.mkdirSync(dir, { recursive: true });
    try {
        const v = path.join(dir, 'v.mp4'), a = path.join(dir, 'a.mp4'), o = path.join(dir, 'o.mp4');
        fs.writeFileSync(v, (await fetchBuffer(videoUrl, { referer: 'https://www.reddit.com/' })).buffer);
        let hasAudio = false;
        try { fs.writeFileSync(a, (await fetchBuffer(audioUrl, { referer: 'https://www.reddit.com/', minBytes: 500 })).buffer); hasAudio = true; } catch (_) {}
        if (!hasAudio) return fs.readFileSync(v);
        await ffq.run(ffq.ffmpegBin(), ['-y', '-hide_banner', '-loglevel', 'error', '-i', v, '-i', a, '-c', 'copy', '-movflags', '+faststart', o], 90000);
        return fs.readFileSync(o);
    } finally { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {} }
}

// ───────────────────────── SPOTIFY (oEmbed -> naam) ─────────────────────────
async function spotifyTitle(url) {
    const j = await getJson('https://open.spotify.com/oembed', { params: { url } });
    return String(j.title || '').trim();
}

module.exports = { tiktok, pinterest, pinterestSearch, twitter, redditJson, muxVideoAudio, spotifyTitle, fetchBuffer, fetchVideoBuffer, deepUrls, pickPinMedia, MAX_BYTES, UA_DESK, UA_MOB };
