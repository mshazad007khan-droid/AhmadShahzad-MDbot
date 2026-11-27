// plugins/zz-pinterest.js — 📌 .pinphoto  /  .pinvideo
//   .pinphoto <pin link>        → us pin ki photo (original quality)
//   .pinphoto <search> [1-5]    → Pinterest se search karke photo(s)
//   .pinvideo <pin link>        → us pin ka video
//   .pinvideo <search>          → Pinterest se video pin dhoondh kar video
// Link kisi message par reply karke bhi chalta hai. Photo wali command hamesha photo, video wali hamesha video bhejti hai.
const axios = require('axios');
const { cmd } = require('../ahmadcore');

const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36';
const PIN_HEAD = { 'User-Agent': UA, 'Accept': 'application/json, text/javascript, */*; q=0.01', 'Accept-Language': 'en-US,en;q=0.9', 'X-Requested-With': 'XMLHttpRequest', 'X-Pinterest-AppState': 'active', 'X-Pinterest-PWS-Handler': 'www/index.js' };
const CAP = (kind, t) => `*📌 PINTEREST ${kind} 📌*${t ? `\n${String(t).slice(0, 120)}` : ''}\n*👑 BY :❯ 𝐀𝐡𝐦𝐚𝐝𝐒𝐡𝐚𝐡𝐳𝐚𝐝-𝐌𝐃 👑*`;   // naam per-user rewrite ho jata hai

const isPinUrl = (u) => /^https?:\/\/([a-z0-9-]+\.)*(pinterest\.[a-z.]+|pin\.it)\//i.test(u);
function pickInput(q, m) {
    const raw = String(q || (m && m.quoted && (m.quoted.text || m.quoted.body)) || '').trim();
    const url = (raw.match(/https?:\/\/[^\s]+/i) || [])[0];
    return { raw, url: url ? url.trim() : '' };
}

// pin.it / pinterest link -> final URL + pin id
async function resolvePin(url) {
    let final = url;
    if (!/\/pin\/\d+/.test(url)) {
        const r = await axios.get(url, { headers: { 'User-Agent': UA }, maxRedirects: 8, timeout: 20000, responseType: 'text', validateStatus: s => s >= 200 && s < 400 });
        final = (r.request && r.request.res && r.request.res.responseUrl) || url;
    }
    const id = (final.match(/\/pin\/(?:[^/]*?--)?(\d+)/) || [])[1];
    return { final, id };
}

function bestImage(pin) {
    const im = pin && pin.images;
    if (!im) return '';
    return (im.orig && im.orig.url) || (im['736x'] && im['736x'].url) || (im['564x'] && im['564x'].url) || (im['474x'] && im['474x'].url) || '';
}
function bestVideo(pin) {
    const vids = pin && (pin.videos && pin.videos.video_list || (pin.story_pin_data && pin.story_pin_data.pages && pin.story_pin_data.pages[0] && pin.story_pin_data.pages[0].blocks && pin.story_pin_data.pages[0].blocks[0] && pin.story_pin_data.pages[0].blocks[0].video && pin.story_pin_data.pages[0].blocks[0].video.video_list));
    if (!vids) return '';
    const order = ['V_720P', 'V_EXP7', 'V_EXP6', 'V_EXP5', 'V_EXP4', 'V_EXP3', 'V_480P', 'V_360P'];
    for (const k of order) if (vids[k] && vids[k].url && /\.mp4/i.test(vids[k].url)) return vids[k].url;
    const any = Object.values(vids).find(v => v && v.url && /\.mp4/i.test(v.url));
    return any ? any.url : '';
}

async function pinById(id) {
    const data = JSON.stringify({ options: { id, field_set_key: 'detailed', noCache: true }, context: {} });
    const r = await axios.get('https://www.pinterest.com/resource/PinResource/get/', { params: { source_url: `/pin/${id}/`, data }, headers: PIN_HEAD, timeout: 20000 });
    return r.data && r.data.resource_response && r.data.resource_response.data;
}

// og: meta fallback (login ke bina bhi page se mil jata hai)
function meta(html, prop) {
    const a = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']`, 'i')) ||
        html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`, 'i'));
    return a ? a[1].replace(/&amp;/g, '&') : '';
}
async function pinByPage(url) {
    const r = await axios.get(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' }, maxRedirects: 8, timeout: 20000, responseType: 'text', validateStatus: s => s >= 200 && s < 400 });
    const html = String(r.data || '');
    let image = meta(html, 'og:image') || meta(html, 'twitter:image');
    if (image) image = image.replace(/\/(?:\d+x\d*|\d+x)\//, '/originals/');
    const video = meta(html, 'og:video') || meta(html, 'og:video:url') || meta(html, 'twitter:player:stream');
    return { image, video: /\.mp4/i.test(video) ? video : '', title: meta(html, 'og:title') };
}

// Pinterest search (scope: pins / videos)
async function pinSearch(query, scope) {
    const data = JSON.stringify({ options: { query, scope, page_size: 40, no_fetch_context_on_resource: false }, context: {} });
    const r = await axios.get('https://www.pinterest.com/resource/BaseSearchResource/get/', {
        params: { source_url: `/search/${scope}/?q=${encodeURIComponent(query)}`, data }, headers: PIN_HEAD, timeout: 25000
    });
    const results = (r.data && r.data.resource_response && r.data.resource_response.data && r.data.resource_response.data.results) || [];
    return results.filter(x => x && (x.images || x.videos));
}
async function searchFallbackImages(query) {
    for (const u of [`https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}`, `https://api.ryzendesu.vip/api/search/pinterest?query=${encodeURIComponent(query)}`]) {
        try {
            const r = await axios.get(u, { timeout: 20000, headers: { 'User-Agent': UA } });
            const d = r.data && (r.data.data || r.data.result || r.data);
            const list = (Array.isArray(d) ? d : []).map(x => typeof x === 'string' ? x : (x && (x.image_url || x.images_url || x.url || x.image))).filter(x => /^https?:/.test(x || ''));
            if (list.length) return list;
        } catch (_) {}
    }
    return [];
}
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ───────── .pinphoto ─────────
cmd({
    pattern: 'pinphoto',
    alias: ['pinimg', 'pinimage', 'pinpic'],
    desc: 'Pinterest se photo download (pin link ya search)',
    category: 'download',
    react: '📌',
    use: '.pinphoto <pin link>  |  .pinphoto <search> [1-5]',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const { from, q, reply } = ctx, p = (ctx.config && ctx.config.PREFIX) || '.';
    const { raw, url } = pickInput(q, m);
    if (!raw) return reply(`📌 *PIN PHOTO*\n\n• Pin link: *${p}pinphoto https://pin.it/xxxx*\n• Search: *${p}pinphoto sunset aesthetic*\n• Zyada photos: *${p}pinphoto sunset 3* (max 5)\n\n_Link wale message par reply karke bhi chalta hai._`);
    try {
        // 1) pin link
        if (url && isPinUrl(url)) {
            let image = '', title = '';
            try { const { id } = await resolvePin(url); if (id) { const pin = await pinById(id); image = bestImage(pin); title = pin && (pin.title || pin.grid_title); } } catch (_) {}
            if (!image) { const pg = await pinByPage(url); image = pg.image; title = pg.title; }
            if (!image) return reply('❌ Is pin se photo nahi mili. Link public hona chahiye (video pin ke liye *' + p + 'pinvideo* use karo).');
            await conn.sendMessage(from, { image: { url: image }, caption: CAP('PHOTO', title) }, { quoted: mek });
            return;
        }
        // 2) search
        let n = 1, query = raw;
        const mm = raw.match(/^(.*\S)\s+([1-5])$/); if (mm) { query = mm[1]; n = Number(mm[2]); }
        let imgs = [];
        try { imgs = (await pinSearch(query, 'pins')).map(bestImage).filter(Boolean); } catch (_) {}
        if (!imgs.length) imgs = await searchFallbackImages(query);
        if (!imgs.length) return reply(`❌ "${query}" ke liye photo nahi mili. Dusre words try karo.`);
        const pick = shuffle(imgs).slice(0, n);
        let sent = 0;
        for (const u of pick) {
            try { await conn.sendMessage(from, { image: { url: u }, caption: sent === 0 ? CAP('PHOTO', query) : '' }, { quoted: mek }); sent++; } catch (_) {}
        }
        if (!sent) return reply('❌ Photo bhej nahi saka, dobara try karo.');
    } catch (e) {
        console.warn('[PINPHOTO]', e.message);
        return reply('❌ Pinterest se photo nahi mil saki. Thori der baad dobara try karo.');
    }
});

// ───────── .pinvideo ─────────
cmd({
    pattern: 'pinvideo',
    alias: ['pinvid', 'pinmp4', 'pinvideodl'],
    desc: 'Pinterest se video download (pin link ya search)',
    category: 'download',
    react: '📌',
    use: '.pinvideo <pin link>  |  .pinvideo <search>',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const { from, q, reply } = ctx, p = (ctx.config && ctx.config.PREFIX) || '.';
    const { raw, url } = pickInput(q, m);
    if (!raw) return reply(`📌 *PIN VIDEO*\n\n• Pin link: *${p}pinvideo https://pin.it/xxxx*\n• Search: *${p}pinvideo anime edit*\n\n_Link wale message par reply karke bhi chalta hai._`);
    const sendVid = async (src, title) => conn.sendMessage(from, { video: { url: src }, mimetype: 'video/mp4', caption: CAP('VIDEO', title) }, { quoted: mek });
    try {
        // 1) pin link
        if (url && isPinUrl(url)) {
            let video = '', title = '';
            try { const { id } = await resolvePin(url); if (id) { const pin = await pinById(id); video = bestVideo(pin); title = pin && (pin.title || pin.grid_title); } } catch (_) {}
            if (!video) { try { const pg = await pinByPage(url); video = pg.video; title = title || pg.title; } catch (_) {} }
            if (video) { await sendVid(video, title); return; }
            // yt-dlp (bot ka apna downloader) — aakhri koshish
            try {
                const local = await require('../lib/media-dl').downloadAnyVideo(url);
                await conn.sendMessage(from, { video: local.buffer, mimetype: 'video/mp4', caption: CAP('VIDEO', title) }, { quoted: mek });
                return;
            } catch (_) {}
            return reply('❌ Is pin mein video nahi mili (shayad ye photo pin hai — uske liye *' + p + 'pinphoto* use karo).');
        }
        // 2) search (sirf video pins)
        let vids = [];
        try { vids = (await pinSearch(raw, 'videos')).map(x => ({ v: bestVideo(x), t: x.title || x.grid_title })).filter(x => x.v); } catch (_) {}
        if (!vids.length) return reply(`❌ "${raw}" ke liye video pin nahi mila. Dusre words ya seedha pin link try karo.`);
        for (const c of shuffle(vids).slice(0, 3)) {   // koi na chale to agla
            try { await sendVid(c.v, c.t || raw); return; } catch (_) {}
        }
        return reply('❌ Video bhej nahi saka, dobara try karo.');
    } catch (e) {
        console.warn('[PINVIDEO]', e.message);
        return reply('❌ Pinterest se video nahi mili. Thori der baad dobara try karo.');
    }
});

console.log('[AhmadShahzad-MD] pinphoto / pinvideo loaded');
