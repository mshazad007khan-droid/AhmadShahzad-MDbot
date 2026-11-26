// lib/circledp.js (v11) — user ki DP ko gol (circle) crop karke dark card background par lagata hai.
// Header image = banner (dhundhla) + beech mein circle DP + gold ring. Sharp hi use hota hai (already dependency).
const fs = require('fs');
const axios = require('axios');

let sharp = null;
try { sharp = require('sharp'); } catch (_) { sharp = null; }

const W = 800, H = 560, D = 340;   // canvas aur circle ka size

async function toBuffer(src) {
    if (!src) return null;
    if (Buffer.isBuffer(src)) return src;
    const s = String(src.url || src);
    if (/^https?:/i.test(s)) {
        const r = await axios.get(s, { responseType: 'arraybuffer', timeout: 8000, maxContentLength: 8 * 1024 * 1024 });
        return Buffer.from(r.data);
    }
    return fs.existsSync(s) ? fs.readFileSync(s) : null;
}

// dp: Buffer/URL/path (user ki photo), bg: Buffer/URL/path (bot banner, optional). Return: JPEG Buffer ya null
async function makeCircleCard(dp, bg) {
    if (!sharp) return null;
    try {
        const dpBuf = await toBuffer(dp);
        if (!dpBuf) return null;
        let bgBuf = null;
        try { bgBuf = await toBuffer(bg); } catch (_) {}

        // background: banner dhundhla + dark; na ho to gradient
        let base;
        if (bgBuf) {
            base = await sharp(bgBuf).resize(W, H, { fit: 'cover' }).blur(14).modulate({ brightness: 0.45 }).jpeg().toBuffer();
        } else {
            const grad = `<svg width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b1035"/><stop offset="1" stop-color="#05060f"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`;
            base = await sharp(Buffer.from(grad)).jpeg().toBuffer();
        }

        const mask = Buffer.from(`<svg width="${D}" height="${D}"><circle cx="${D / 2}" cy="${D / 2}" r="${D / 2}" fill="#fff"/></svg>`);
        const circle = await sharp(dpBuf).resize(D, D, { fit: 'cover', position: 'attention' })
            .composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();

        const ring = Buffer.from(`<svg width="${D + 44}" height="${D + 44}">
            <defs><linearGradient id="r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd86b"/><stop offset="0.5" stop-color="#ff5fd2"/><stop offset="1" stop-color="#4fd8ff"/></linearGradient></defs>
            <circle cx="${(D + 44) / 2}" cy="${(D + 44) / 2}" r="${D / 2 + 14}" fill="none" stroke="url(#r)" stroke-width="12"/></svg>`);

        return await sharp(base).composite([
            { input: ring, left: Math.round((W - D - 44) / 2), top: Math.round((H - D - 44) / 2) },
            { input: circle, left: Math.round((W - D) / 2), top: Math.round((H - D) / 2) }
        ]).jpeg({ quality: 88 }).toBuffer();
    } catch (e) {
        console.warn('[circledp]', e && e.message);
        return null;
    }
}

module.exports = { makeCircleCard };
