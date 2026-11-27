// lib/tiktok-dl.js (v11.3) — TikTok downloader: kai APIs EK SAATH (jo pehle jawab de wahi use), phir video khud download.
// Koi API key nahi chahiye. Sab fail ho to caller yt-dlp (lib/media-dl) par chala jata hai.
//
// getTikTok(url) -> { video: [url1, url2...], images: [], music, title, author, cover }
// fetchVideoBuffer(urls) -> Buffer (mp4 check ke sath; pehla chalne wala URL)
const axios = require('axios');

const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36';
const MAX_BYTES = 90 * 1024 * 1024;
const API_TIMEOUT = parseInt(process.env.TIKTOK_API_TIMEOUT || '15000', 10);

const isHttp = (u) => typeof u === 'string' && /^https?:\/\//i.test(u);
const uniq = (a) => [...new Set(a.filter(isHttp))];

// JSON mein jahan bhi video link ho nikaal lo (API ka format badal jaye tab bhi chalta hai)
function deepUrls(obj, out = { video: [], images: [], music: '' }, key = '', depth = 0) {
    if (obj == null || depth > 7) return out;
    if (typeof obj === 'string') {
        if (!isHttp(obj)) return out;
        const k = key.toLowerCase();
        if (/(^|_)(music|audio|sound)/.test(k) || /\.(mp3|m4a)(\?|$)/i.test(obj)) { if (!out.music) out.music = obj; }
        else if (/(image|photo|slide|cover|thumb|avatar|origin_cover|dynamic)/.test(k) && !/\.mp4/i.test(obj)) {
            if (/images?$|photos?$|slides?$/.test(k) || /image|photo|slide/.test(k)) out.images.push(obj);
        } else if (/\.mp4(\?|$)|\/video\/|mime_type=video|video_mp4|tiktokcdn|play|nowm|no_?watermark|hdplay|download/i.test(obj + ' ' + k)) out.video.push(obj);
        return out;
    }
    if (Array.isArray(obj)) { obj.forEach(v => deepUrls(v, out, key, depth + 1)); return out; }
    if (typeof obj === 'object') for (const [k, v] of Object.entries(obj)) deepUrls(v, out, k, depth + 1);
    return out;
}
const str = (...v) => v.find(x => typeof x === 'string' && x.trim()) || '';

// ---------- providers: har ek { video:[], images:[], music, title, author, cover } ya throw ----------
const providers = {
    async tikwm(url) {
        let lastErr;
        for (const host of ['https://www.tikwm.com', 'https://tikwm.com']) {
            try {
                const r = await axios.get(`${host}/api/`, { params: { url, hd: 1 }, headers: { 'User-Agent': UA }, timeout: API_TIMEOUT });
                const d = r.data && r.data.data;
                if (!d || (r.data.code !== undefined && r.data.code !== 0 && !d.play && !d.images)) throw new Error('tikwm: ' + (r.data && r.data.msg || 'no data'));
                const abs = (p) => !p ? '' : /^https?:/i.test(p) ? p : host + p;
                return { video: uniq([abs(d.hdplay), abs(d.play), abs(d.wmplay)]), images: uniq((d.images || []).map(abs)), music: abs(d.music || (d.music_info && d.music_info.play)), title: d.title, author: d.author && (d.author.nickname || d.author.unique_id), cover: abs(d.cover) };
            } catch (e) { lastErr = e; }
        }
        throw lastErr || new Error('tikwm failed');
    },
    async lovetik(url) {
        const r = await axios.post('https://lovetik.com/api/ajax/search', new URLSearchParams({ query: url }).toString(),
            { headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded', Referer: 'https://lovetik.com/' }, timeout: API_TIMEOUT });
        const d = r.data || {};
        const links = d.links || [];
        const mp4 = links.filter(l => /mp4/i.test(String(l.t || l.ft || '')) || /\.mp4|video/i.test(String(l.a || ''))).map(l => l.a);
        const mp3 = links.find(l => /mp3/i.test(String(l.t || '')));
        const video = uniq(mp4.length ? mp4 : links.map(l => l.a));
        if (!video.length && !(d.images || []).length) throw new Error('lovetik: no links');
        return { video, images: uniq(d.images || []), music: mp3 && mp3.a, title: d.desc, author: d.author, cover: d.cover };
    },
    async tiklydown(url) {
        const r = await axios.get('https://api.tiklydown.eu.org/api/download/v3', { params: { url }, headers: { 'User-Agent': UA }, timeout: API_TIMEOUT });
        const d = (r.data && (r.data.result || r.data.data)) || r.data || {};
        const g = deepUrls(d);
        const video = uniq([d.video && d.video.noWatermark, d.video && d.video.watermark, ...g.video]);
        if (!video.length && !(d.images || []).length) throw new Error('tiklydown: no video');
        return { video, images: uniq((d.images || []).map(i => i.url || i)), music: g.music, title: str(d.desc, d.title), author: d.author && (d.author.nickname || d.author.unique_id), cover: g.images[0] };
    }
};
// generic JSON APIs (format alag alag hai, isliye deepUrls se padhte hain)
const GENERIC = {
    ryzendesu: (u) => `https://api.ryzendesu.vip/api/downloader/ttdl?url=${encodeURIComponent(u)}`,
    siputzx: (u) => `https://api.siputzx.my.id/api/d/tiktok?url=${encodeURIComponent(u)}`,
    vreden: (u) => `https://api.vreden.my.id/api/tiktok?url=${encodeURIComponent(u)}`,
    agatz: (u) => `https://api.agatz.xyz/api/tiktok?url=${encodeURIComponent(u)}`
};
for (const [name, mk] of Object.entries(GENERIC)) {
    providers[name] = async (url) => {
        const r = await axios.get(mk(url), { headers: { 'User-Agent': UA }, timeout: API_TIMEOUT });
        const body = r.data;
        if (!body || typeof body !== 'object') throw new Error(name + ': bad response');
        const g = deepUrls(body.data || body.result || body);
        // watermark wale link sabse peeche
        const video = uniq(g.video).sort((a, b) => /wm|watermark/i.test(a) - /wm|watermark/i.test(b));
        if (!video.length && !g.images.length) throw new Error(name + ': no video');
        const d = body.data || body.result || body;
        return { video, images: uniq(g.images).filter(i => !/avatar|cover|thumb/i.test(i)), music: g.music, title: str(d.title, d.desc, d.caption), author: str(d.author && d.author.nickname, d.author && d.author.unique_id, typeof d.author === 'string' ? d.author : ''), cover: g.images[0] };
    };
}

// har API ka pehla (best) link pehle, phir doosre; "wm/watermark" wale sabse aakhir mein
function interleave(lists) {
    const out = [];
    const max = Math.max(0, ...lists.map(l => l.length));
    for (let i = 0; i < max; i++) lists.forEach(l => { if (l[i]) out.push(l[i]); });
    const u = uniq(out);
    return [...u.filter(x => !/(^|[^a-z])wm|watermark/i.test(x)), ...u.filter(x => /(^|[^a-z])wm|watermark/i.test(x))];
}

// Sab APIs parallel — pehla jisme video/images mile wahi jeet'ta hai; baaki ke links backup mein
async function getTikTok(url) {
    const names = Object.keys(providers);
    const errors = [];
    const results = [];
    await new Promise((resolve) => {
        let pending = names.length;
        const done = () => { if (--pending === 0) resolve(); };
        names.forEach(n => {
            providers[n](url).then(r => {
                if (r && ((r.video && r.video.length) || (r.images && r.images.length))) {
                    results.push({ name: n, ...r });
                    if (results.length === 1) setTimeout(resolve, 2500);   // pehle jawab ke baad 2.5s tak backup links bhi le lo
                } else errors.push(n + ': empty');
                done();
            }).catch(e => { errors.push(n + ': ' + (e && e.message)); done(); });
        });
    });
    if (!results.length) { const err = new Error('TikTok APIs ne video nahi di'); err.details = errors; throw err; }
    const first = results[0];
    return {
        video: interleave(results.map(r => r.video || [])),
        images: first.images && first.images.length ? first.images : (results.find(r => r.images && r.images.length) || {}).images || [],
        music: results.map(r => r.music).find(isHttp) || '',
        title: results.map(r => r.title).find(Boolean) || '',
        author: results.map(r => r.author).find(Boolean) || '',
        cover: results.map(r => r.cover).find(isHttp) || '',
        source: first.name
    };
}

const looksLikeMp4 = (b) => b && b.length > 20000 && b.slice(4, 8).toString('latin1') === 'ftyp';

async function downloadBuffer(u, referer) {
    const r = await axios.get(u, {
        responseType: 'arraybuffer', timeout: 60000, maxContentLength: MAX_BYTES, maxBodyLength: MAX_BYTES,
        headers: { 'User-Agent': UA, Referer: referer || 'https://www.tiktok.com/', Accept: '*/*' }
    });
    return Buffer.from(r.data);
}

// links mein se pehla jo asli mp4 ho
async function fetchVideoBuffer(urls) {
    let lastErr;
    for (const u of urls) {
        try {
            const b = await downloadBuffer(u);
            if (looksLikeMp4(b)) return { buffer: b, url: u };
            lastErr = new Error('mp4 nahi mili');
        } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error('koi video link nahi');
}

module.exports = { getTikTok, fetchVideoBuffer, downloadBuffer, deepUrls, providers, looksLikeMp4 };
