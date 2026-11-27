// plugins/zz-url.js — .url / .url1 … .url5 : koi bhi photo / video / audio / document / sticker host karke link do
// Use: media bhejte waqt caption mein .url, ya kisi media par reply karke .url
//   .url  = auto (sab hosts ek-ek karke, jo pehle chale)      .url1 = Catbox      .url2 = Uguu
//   .url3 = Tmpfiles                                          .url4 = ImgBB (sirf photo; baqi media ke liye auto)
//   .url5 = 0x0.st
// Chuni hui host fail ho to baqi hosts khud try hote hain. Neeche 📋 Copy Link + 🌐 Open button.
const { cmd } = require('../ahmadcore');
const axios = require('axios');
const FormData = require('form-data');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { sendCopy, urlBtn } = require('../lib/copybtn');

const IMGBB_KEY = process.env.IMGBB_KEY || '8db492efc937a635b90680a9a860dc85';
const UA = { 'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36' };
const MAX_BYTES = 100 * 1024 * 1024;

// ───────── hosts: har ek (buffer, filename, mime) -> url ─────────
const form = (fields, name, buf, filename, mime) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(fields || {})) f.append(k, v);
    f.append(name, buf, { filename, contentType: mime });
    return f;
};
const post = (url, f, extra) => axios.post(url, f, { headers: { ...UA, ...f.getHeaders() }, timeout: 120000, maxBodyLength: Infinity, maxContentLength: Infinity, ...(extra || {}) });
const httpUrl = (t) => { const m = String(t || '').match(/https?:\/\/[^\s"'<>]+/); return m ? m[0] : null; };

const HOSTS = {
    catbox: { name: 'Catbox', async up(b, fn, mime) {
        const r = await post('https://catbox.moe/user/api.php', form({ reqtype: 'fileupload' }, 'fileToUpload', b, fn, mime));
        return httpUrl(r.data);
    } },
    uguu: { name: 'Uguu', async up(b, fn, mime) {
        const r = await post('https://uguu.se/upload', form({}, 'files[]', b, fn, mime));
        return (r.data && r.data.files && r.data.files[0] && r.data.files[0].url) || httpUrl(r.data);
    } },
    tmpfiles: { name: 'Tmpfiles', async up(b, fn, mime) {
        const r = await post('https://tmpfiles.org/api/v1/upload', form({}, 'file', b, fn, mime));
        const u = r.data && r.data.data && r.data.data.url;
        return u ? String(u).replace('tmpfiles.org/', 'tmpfiles.org/dl/').replace('http://', 'https://') : null;   // direct download link
    } },
    imgbb: { name: 'ImgBB', imageOnly: true, async up(b) {
        const f = new FormData(); f.append('image', b.toString('base64'));
        const r = await axios.post('https://api.imgbb.com/1/upload?key=' + IMGBB_KEY, f, { headers: { ...UA, ...f.getHeaders() }, timeout: 60000, maxBodyLength: Infinity });
        return r.data && r.data.data && (r.data.data.url || r.data.data.display_url) || null;
    } },
    litterbox: { name: 'Litterbox', async up(b, fn, mime) {      // v13: Catbox ka temporary (72 ghante) host
        const r = await post('https://litterbox.catbox.moe/resources/internals/api.php', form({ reqtype: 'fileupload', time: '72h' }, 'fileToUpload', b, fn, mime));
        return httpUrl(r.data);
    } },
    quax: { name: 'Qu.ax', async up(b, fn, mime) {
        const r = await post('https://qu.ax/upload.php', form({}, 'files[]', b, fn, mime));
        return (r.data && r.data.files && r.data.files[0] && r.data.files[0].url) || httpUrl(r.data);
    } },
    x0: { name: '0x0.st', async up(b, fn, mime) {
        const r = await post('https://0x0.st', form({}, 'file', b, fn, mime));
        return httpUrl(r.data);
    } }
};
const AUTO_ORDER = ['catbox', 'litterbox', 'uguu', 'quax', 'tmpfiles', 'x0', 'imgbb'];
const CMD_HOST = { url: null, url1: 'catbox', url2: 'uguu', url3: 'tmpfiles', url4: 'imgbb', url5: 'x0' };

// ───────── media nikalna ─────────
function unwrap(message) {
    let m = message || {};
    for (let i = 0; i < 4; i++) {
        const inner = m.ephemeralMessage?.message || m.viewOnceMessage?.message || m.viewOnceMessageV2?.message || m.viewOnceMessageV2Extension?.message || m.documentWithCaptionMessage?.message;
        if (!inner) break; m = inner;
    }
    return m;
}
const KINDS = [['imageMessage', 'image'], ['videoMessage', 'video'], ['audioMessage', 'audio'], ['documentMessage', 'document'], ['stickerMessage', 'sticker']];
function findMedia(mek) {
    const m = unwrap(mek && mek.message);
    const ci = m.extendedTextMessage?.contextInfo || m.imageMessage?.contextInfo || m.videoMessage?.contextInfo || m.documentMessage?.contextInfo || m.audioMessage?.contextInfo || null;
    const q = ci && ci.quotedMessage ? unwrap(ci.quotedMessage) : {};
    for (const src of [m, q]) for (const [key, type] of KINDS) if (src[key]) return { node: src[key], type };
    return null;
}
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'video/mp4': 'mp4', 'video/3gpp': '3gp', 'video/webm': 'webm', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg', 'audio/ogg; codecs=opus': 'ogg', 'audio/wav': 'wav', 'application/pdf': 'pdf', 'application/zip': 'zip', 'application/vnd.android.package-archive': 'apk' };

async function download(node, type) {
    const size = Number(node.fileLength || 0);
    if (size > MAX_BYTES) throw new Error(`File bohat badi hai (${(size / 1048576).toFixed(0)}MB). Max ${MAX_BYTES / 1048576}MB.`);
    const stream = await downloadContentFromMessage(node, type);
    const chunks = []; let total = 0;
    for await (const c of stream) { total += c.length; if (total > MAX_BYTES) throw new Error('File bohat badi hai.'); chunks.push(c); }
    return Buffer.concat(chunks);
}

async function handle(conn, mek, ctx, hostKey) {
    const media = findMedia(mek);
    const p = (ctx.config && ctx.config.PREFIX) || '.';
    if (!media) return ctx.reply(`🔗 *MEDIA → LINK*\n\nPhoto / video / audio / document / sticker bhejte waqt caption mein *${p}url* likho, ya usi media par reply karke *${p}url*.\n\n*${p}url* auto  •  *${p}url1* Catbox  •  *${p}url2* Uguu\n*${p}url3* Tmpfiles  •  *${p}url4* ImgBB (photo)  •  *${p}url5* 0x0.st`);
    try {
        ctx.reply('⏳ Upload ho raha hai...').catch(() => {});          // v13: download ka intezar nahi karta
        const mime = String(media.node.mimetype || '').split(';')[0] || 'application/octet-stream';
        const buf = await download(media.node, media.type);
        let fname = String(media.node.fileName || '').replace(/[^\w.\- ]/g, '_');
        if (!fname) fname = `${media.type}_${Date.now()}.${EXT[mime] || mime.split('/')[1] || 'bin'}`;

        const order = [...(hostKey ? [hostKey] : []), ...AUTO_ORDER.filter(h => h !== hostKey)];
        let url = null, used = null; const errs = [];
        for (const k of order) {
            const h = HOSTS[k];
            if (h.imageOnly && !(media.type === 'image')) continue;
            try { url = await h.up(buf, fname, mime); if (url && /^https?:/.test(url)) { used = h.name; break; } url = null; }
            catch (e) { errs.push(`${h.name}: ${String(e.response && e.response.status || e.message).slice(0, 40)}`); }
        }
        if (!url) return ctx.reply('❌ Kisi host par upload nahi hua.\n' + errs.map(e => '• ' + e).join('\n') + '\n\nThori der baad dobara try karo.');

        const kb = buf.length >= 1048576 ? (buf.length / 1048576).toFixed(2) + ' MB' : (buf.length / 1024).toFixed(1) + ' KB';
        const note = hostKey && HOSTS[hostKey].name !== used ? `\n_(${HOSTS[hostKey].name} chala nahi, ${used} se bana)_` : '';
        const text = `✅ *LINK READY*\n\n📁 Type: ${media.type.toUpperCase()}  •  📦 ${kb}\n🌐 Host: ${used}${note}\n\n🔗 ${url}`;
        // v13: PEHLE seedha text (hamesha dikhta hai, long-press se copy). Interactive Copy/Open buttons WhatsApp kabhi
        // khaali/invisible dikhata tha (audio / video / document par link nazar nahi aata tha) — isliye buttons sirf EXTRA.
        await conn.sendMessage(ctx.from, { text }, { quoted: mek });
        sendCopy(conn, ctx.from, { text: '👇 *Quick buttons*', copies: [{ label: '📋 Copy Link', value: url }], extra: [urlBtn('🌐 Open', url)], quoted: mek }).catch(() => {});
    } catch (e) {
        return ctx.reply('❌ ' + String(e.message || e).slice(0, 200));
    }
}

for (const [pattern, hostKey] of Object.entries(CMD_HOST)) {
    cmd({
        pattern,
        alias: pattern === 'url' ? ['tourl', 'upload', 'hosturl', 'mediaurl', 'imgurl', 'img2url', 'image2url', 'imageurl'] : [],
        desc: pattern === 'url' ? 'Photo/video/audio/document ko link banao (auto host)' : `Media ko link banao — ${HOSTS[hostKey].name}`,
        category: 'host',
        menuHint: pattern === 'url' ? 'auto' : HOSTS[hostKey].name + (HOSTS[hostKey].imageOnly ? ' · photo' : ''),
        react: '🔗',
        use: `.${pattern} (media par reply / caption)`,
        filename: __filename
    }, (conn, mek, m, ctx) => handle(conn, mek, ctx, hostKey));
}
console.log('[AhmadShahzad-MD] url loaded');
