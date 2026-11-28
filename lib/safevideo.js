// lib/safevideo.js (v13.2) — WhatsApp par "This video isn't available because something is wrong with the video file" NA aaye.
// Wajah: kayi sources (Pinterest / TikTok / API) ki mp4 mein moov atom aakhir mein hota hai, ya codec h264/aac nahi hota, ya file
// asal mein HTML / m3u8 hoti hai. Yahan har video buffer pehle check hota hai, phir ffmpeg se WhatsApp-safe mp4 (faststart, h264/aac) banti hai.
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const isMp4Like = (b) => Buffer.isBuffer(b) && b.length > 5000 && /ftyp|moov|mdat|free|wide/.test(b.slice(4, 8).toString('latin1'));

// buf -> WhatsApp-safe mp4 Buffer. Kabhi throw nahi karta; convert na ho to original buf lauta deta hai.
async function fix(buf) {
    if (!Buffer.isBuffer(buf)) return buf;
    if (!isMp4Like(buf)) return buf;                       // mp4 hi nahi — caller apni check karega
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sv-'));
    const raw = path.join(dir, 'in_' + crypto.randomBytes(3).toString('hex') + '.mp4');
    try {
        fs.writeFileSync(raw, buf);
        const out = await require('./media-dl').makeWhatsAppMp4(raw);
        if (out && out !== raw && fs.existsSync(out)) { const b = fs.readFileSync(out); if (isMp4Like(b)) return b; }
        return buf;
    } catch (_) { return buf; }
    finally { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {} }
}

// HLS (.m3u8) ya koi bhi link -> ffmpeg se seedha mp4 buffer
async function fromUrl(url, timeoutMs = 120000) {
    const media = require('./media-dl');
    const ffq = require('./ffq');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sv-'));
    const out = path.join(dir, 'hls.mp4');
    try {
        await ffq.run(media.ffmpegLocation(), ['-y', '-hide_banner', '-loglevel', 'error', '-user_agent', 'Mozilla/5.0', '-i', url, '-c', 'copy', '-bsf:a', 'aac_adtstoasc', '-movflags', '+faststart', out], timeoutMs);
        const b = fs.readFileSync(out);
        return isMp4Like(b) ? b : null;
    } catch (_) { return null; }
    finally { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {} }
}

module.exports = { fix, fromUrl, isMp4Like };
