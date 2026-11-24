// lib/gifsend.js — GIF (nekos.best / waifu.pics ...) ko WhatsApp ke liye mp4 bana kar bhejta hai.
// WhatsApp `video` mein .gif URL nahi chalta (download nahi hota) — pehle download, phir ffmpeg se mp4, phir gifPlayback.
const fs = require('fs');
const os = require('os');
const path = require('path');
const axios = require('axios');
const ffq = require('./ffq');

async function download(url) {
    const r = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000, maxContentLength: 25 * 1024 * 1024, headers: { 'User-Agent': 'Mozilla/5.0' } });
    return Buffer.from(r.data);
}

async function gifToMp4(buf) {
    const id = Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const inp = path.join(os.tmpdir(), `gif_${id}.gif`);
    const out = path.join(os.tmpdir(), `gif_${id}.mp4`);
    fs.writeFileSync(inp, buf);
    try {
        await ffq.run(ffq.ffmpegBin(), ['-y', '-i', inp, '-movflags', 'faststart', '-pix_fmt', 'yuv420p',
            '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-an', out], 60000);
        return fs.readFileSync(out);
    } finally { for (const f of [inp, out]) { try { fs.unlinkSync(f); } catch (_) {} } }
}

// url ya buffer; GIF ho to mp4 banata hai; mp4 ho to seedha bhejta hai
async function sendGif(conn, jid, urlOrBuf, caption, quoted) {
    let buf = Buffer.isBuffer(urlOrBuf) ? urlOrBuf : await download(urlOrBuf);
    const isGif = buf.slice(0, 3).toString() === 'GIF';
    if (isGif) {
        try { buf = await gifToMp4(buf); }
        catch (e) {
            console.warn('[gifsend] ffmpeg fail, image fallback:', e.message);
            return conn.sendMessage(jid, { image: buf, caption, mimetype: 'image/gif' }, { quoted });
        }
    }
    return conn.sendMessage(jid, { video: buf, gifPlayback: true, caption, mimetype: 'video/mp4' }, { quoted });
}

module.exports = { sendGif, gifToMp4, download };
