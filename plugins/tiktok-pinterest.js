// TikTok + Pinterest downloader — koi API key nahi chahiye
// 1) yt-dlp (lib/media-dl.js) se local download  2) Pinterest ke liye page ke og:video / og:image se
const axios = require('axios');
const { cmd } = require('../ahmadcore');
const mediaDl = require('../lib/media-dl');

const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36';

const pickUrl = (q, m) => {
    const raw = String(q || (m && m.quoted && (m.quoted.text || m.quoted.body)) || '');
    const hit = raw.match(/https?:\/\/[^\s]+/i);
    return hit ? hit[0].trim() : '';
};

const isTikTok = (u) => /^https?:\/\/([a-z0-9-]+\.)*(tiktok\.com|tiktokv\.com)\//i.test(u);
const isPinterest = (u) => /^https?:\/\/([a-z0-9-]+\.)*(pinterest\.[a-z.]+|pin\.it)\//i.test(u);

// ───────────────────────── TIKTOK ─────────────────────────
// v11.3: pehle 7 TikTok APIs EK SAATH (tikwm, lovetik, tiklydown, ryzendesu, siputzx, vreden, agatz),
// video khud download karke buffer se bhejte hain; sab fail ho to yt-dlp. Photo-slideshow bhi chalta hai.
const tt = require('../lib/tiktok-dl');
const TT_CAP = (v) => `*🎵 TIKTOK VIDEO 🎵*${v && v.author ? `\n👤 ${v.author}` : ''}${v && v.title ? `\n📝 ${String(v.title).slice(0, 120)}` : ''}\n*👑 BY :❯ 𝐀𝐡𝐦𝐚𝐝𝐒𝐡𝐚𝐡𝐳𝐚𝐝-𝐌𝐃 👑*`;

async function sendTikTok(conn, from, mek, url) {
    let info = null, apiErr = null;
    try {
        info = await tt.getTikTok(url);
        if (info.video.length) {
            const { buffer } = await tt.fetchVideoBuffer(info.video);
            if (buffer.length > mediaDl.MAX_BYTES) { const e = new Error('TOO_BIG'); throw e; }
            await conn.sendMessage(from, { video: buffer, mimetype: 'video/mp4', caption: TT_CAP(info) }, { quoted: mek });
            return 'api';
        }
        if (info.images.length) {                                     // photo slideshow
            const imgs = info.images.slice(0, 10);
            for (let i = 0; i < imgs.length; i++) {
                await conn.sendMessage(from, { image: { url: imgs[i] }, caption: i === 0 ? `*🎵 TIKTOK PHOTOS (${info.images.length}) 🎵*\n*👑 BY :❯ 𝐀𝐡𝐦𝐚𝐝𝐒𝐡𝐚𝐡𝐳𝐚𝐝-𝐌𝐃 👑*` : '' }, { quoted: mek });
            }
            if (info.music) await conn.sendMessage(from, { audio: { url: info.music }, mimetype: 'audio/mpeg' }, { quoted: mek }).catch(() => {});
            return 'images';
        }
    } catch (e) { if (/TOO_BIG/.test(e.message)) throw e; apiErr = e; console.warn('[TIKTOK] API path failed:', e.message, (e.details || []).join(' | ')); }
    // fallback: yt-dlp
    const local = await mediaDl.downloadAnyVideo(url);
    await conn.sendMessage(from, { video: local.buffer, mimetype: 'video/mp4', caption: TT_CAP(info) }, { quoted: mek });
    return 'ytdlp';
}

cmd({
    pattern: 'tiktok',
    alias: ['tt', 'tiktokdl', 'ttdl', 'tiktokvideo', 'ttvideo'],
    desc: 'Download TikTok video (no watermark) — multi-API',
    category: 'download',
    use: '.tiktok <TikTok link>',
    react: '🎵',
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        const url = pickUrl(q, m);
        if (!url || !isTikTok(url)) {
            return reply('*TIKTOK VIDEO DOWNLOAD KARNI HAI? 🎵*\n\nLink copy karo aur likho:\n*.tiktok <TikTok link>*\n\nYa kisi link wale message par reply karke *.tiktok* likho.\n🎧 Sirf gaana chahiye? *.ttmp3 <link>*');
        }
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } }).catch(() => {});
        const how = await sendTikTok(conn, from, mek, url);
        console.log('[TIKTOK] sent via', how);
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } }).catch(() => {});
    } catch (e) {
        console.warn('[TIKTOK]', e.message, e.details || '');
        const tooBig = /TOO_BIG|max-filesize/i.test(String(e.message) + JSON.stringify(e.details || ''));
        const why = mediaDl.explainError(e);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }).catch(() => {});
        await reply(tooBig
            ? '❌ Video bohat bari hai, WhatsApp par nahi bheji ja sakti.'
            : '❌ TikTok video download nahi ho saki.\nLink public hona chahiye. Thori der baad dobara try karo.' + (why ? '\n\n💡 ' + why : ''));
    }
});

cmd({
    pattern: 'ttmp3',
    alias: ['tiktokaudio', 'ttaudio', 'tiktokmp3'],
    desc: 'TikTok ka gaana / audio (MP3)',
    category: 'download',
    use: '.ttmp3 <TikTok link>',
    react: '🎧',
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        const url = pickUrl(q, m);
        if (!url || !isTikTok(url)) return reply('*🎧 TIKTOK AUDIO*\n\n`.ttmp3 <TikTok link>`');
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } }).catch(() => {});
        const info = await tt.getTikTok(url);
        if (!info.music) return reply('❌ Is video ka audio link nahi mila.');
        const buf = await tt.downloadBuffer(info.music);
        await conn.sendMessage(from, { audio: buf, mimetype: 'audio/mpeg', ptt: false }, { quoted: mek });
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } }).catch(() => {});
    } catch (e) { console.warn('[TTMP3]', e.message); await reply('❌ Audio download nahi ho saka. Thori der baad try karo.'); }
});

// ───────────────────────── PINTEREST ─────────────────────────
function metaContent(html, prop) {
    const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']`, 'i');
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`, 'i');
    const hit = html.match(re1) || html.match(re2);
    return hit ? hit[1].replace(/&amp;/g, '&') : '';
}

async function pinterestPage(url) {
    const res = await axios.get(url, {
        headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
        maxRedirects: 8, timeout: 20000, responseType: 'text',
        validateStatus: s => s >= 200 && s < 400
    });
    const html = String(res.data || '');
    let video = metaContent(html, 'og:video') || metaContent(html, 'og:video:url') || metaContent(html, 'twitter:player:stream');
    if (!/\.mp4/i.test(video || '')) {   // v13: page ke andar chhupa mp4 / hls link
        const t = html.replace(/\\u002F/g, '/').replace(/\\\//g, '/');
        const mp4 = t.match(/https?:\/\/v\d*\.pinimg\.com\/videos\/[^"'\s\\<>]+?\.mp4/i);
        const hls = t.match(/https?:\/\/v\d*\.pinimg\.com\/videos\/[^"'\s\\<>]*?\/hls\/[^"'\s\\<>]+?\.m3u8/i);
        video = mp4 ? mp4[0] : (hls ? hls[0].replace('/hls/', '/720p/').replace(/\.m3u8$/i, '.mp4') : video);
    }
    let image = metaContent(html, 'og:image') || metaContent(html, 'twitter:image');
    if (image) image = image.replace(/\/(?:\d+x\d*|\d+x)\//, '/originals/');
    const title = metaContent(html, 'og:title');
    return { video, image, title };
}

cmd({
    pattern: 'pinterest',
    alias: ['pin', 'pindl', 'pinterestdl'],
    desc: 'Download Pinterest video or image from a pin link',
    category: 'download',
    use: '.pinterest <Pinterest link>',
    react: '📌',
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        const url = pickUrl(q, m);
        if (!url || !isPinterest(url)) {
            return reply('*PINTEREST VIDEO / PHOTO DOWNLOAD KARNI HAI? 📌*\n\nPin ka link copy karo aur likho:\n*.pinterest <Pinterest link>*\n\nYa kisi link wale message par reply karke *.pinterest* likho.');
        }
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } }).catch(() => {});

        // 1) video pin -> yt-dlp
        try {
            const local = await mediaDl.downloadAnyVideo(url);
            await conn.sendMessage(from, {
                video: local.buffer,
                mimetype: 'video/mp4',
                caption: '*📌 PINTEREST VIDEO 📌*\n*👑 BY :❯ 𝐀𝐡𝐦𝐚𝐝𝐒𝐡𝐚𝐡𝐳𝐚𝐝-𝐌𝐃 👑*'
            }, { quoted: mek });
            return await conn.sendMessage(from, { react: { text: '✅', key: mek.key } }).catch(() => {});
        } catch (e) {
            console.warn('[PINTEREST] yt-dlp failed, trying page meta:', e.message);
        }

        // 2) page ke og:video / og:image se (image pins bhi yahin se)
        const page = await pinterestPage(url);
        const caption = `*📌 PINTEREST ${page.video && /\.mp4/i.test(page.video) ? 'VIDEO' : 'PHOTO'} 📌*${page.title ? `\n*${page.title}*` : ''}\n*👑 BY :❯ 𝐀𝐡𝐦𝐚𝐝𝐒𝐡𝐚𝐡𝐳𝐚𝐝-𝐌𝐃 👑*`;
        if (page.video && /\.mp4/i.test(page.video)) {
            await conn.sendMessage(from, { video: { url: page.video }, mimetype: 'video/mp4', caption }, { quoted: mek });
        } else if (page.image) {
            await conn.sendMessage(from, { image: { url: page.image }, caption }, { quoted: mek });
        } else {
            return reply('❌ Is pin se video ya photo nahi mili. Link sahi aur public hona chahiye.');
        }
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } }).catch(() => {});
    } catch (e) {
        console.warn('[PINTEREST]', e.message);
        await reply('❌ Pinterest se download nahi ho saka. Link check karo aur dobara try karo.');
    }
});
