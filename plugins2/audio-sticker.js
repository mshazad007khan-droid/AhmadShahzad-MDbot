// plugins2/audio-sticker.js (v13.3) — .audiosticker  (short: .as)
// Kisi VIDEO par reply karke .as likho -> WhatsApp ka NATIVE SOUND STICKER (sticker par speaker icon, tap karo to awaaz).
// Ye lib/soundsticker.js se jata hai (alag WebP + Opus upload, field 134). Agar native send fail ho (purana WhatsApp / Baileys) to
// khud purane tareeqe par aa jata hai: sticker + voice note.
//
//   .as            -> native sound sticker (fail ho to sticker + voice note)
//   .as legacy     -> seedha purana tareeqa: sticker + voice note
//   .as 6          -> sirf pehle 6 second (max 10)
//   .as note       -> gol (round) video-note jis mein awaaz bhi ho
//   .as sticker    -> sirf sticker (bina awaaz)
//   .as voice      -> sirf awaaz (voice note)
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { cmd } = require('../ahmadcore');
const ffq = require('../lib/ffq');
const skipvoice = require('../lib/skipvoice');

const MAX_IN = 40 * 1024 * 1024;
const MAX_STICKER = 950 * 1024;          // WhatsApp animated sticker limit ~1MB
const PACK = 'AhmadShahzad-MD';

async function getVideo(m, mek) {
    const tryMsg = async (msg) => {
        if (!msg) return null;
        let inner = msg;
        for (let i = 0; i < 4; i++) {
            const nx = (inner.viewOnceMessageV2 || inner.viewOnceMessage || inner.viewOnceMessageV2Extension || inner.ephemeralMessage || inner.documentWithCaptionMessage || {}).message;
            if (!nx) break; inner = nx;
        }
        let node = null, kind = null;
        if (inner.videoMessage) { node = inner.videoMessage; kind = 'video'; }
        else if (inner.documentMessage && /video|gif/i.test(inner.documentMessage.mimetype || '')) { node = inner.documentMessage; kind = 'document'; }
        if (!node) return null;
        if (Number(node.fileLength || 0) > MAX_IN) throw new Error('Video bohat badi hai (40MB se chhoti do)');
        const stream = await downloadContentFromMessage(node, kind);
        const chunks = []; for await (const c of stream) chunks.push(c);
        return Buffer.concat(chunks);
    };
    if (m && m.quoted && m.quoted.message) { const r = await tryMsg(m.quoted.message); if (r) return r; }
    for (const k of Object.keys(mek.message || {})) {
        const v = mek.message[k];
        if (v && typeof v === 'object' && v.contextInfo && v.contextInfo.quotedMessage) { const r = await tryMsg(v.contextInfo.quotedMessage); if (r) return r; }
    }
    return tryMsg(mek.message);          // video ke caption mein .as likha ho
}

const hasAudio = (file) => {
    try { const r = spawnSync(ffq.ffmpegBin(), ['-hide_banner', '-i', file], { encoding: 'utf8', timeout: 20000 }); return /Stream #[^\n]*Audio:/i.test(String(r.stderr || '') + String(r.stdout || '')); }
    catch (_) { return false; }
};

// sticker ka pack naam (exif) — na ho sake to bina exif ke bhi chalta hai
async function addExif(webp) {
    try {
        const { Image } = require('node-webpmux');
        const json = Buffer.from(JSON.stringify({ 'sticker-pack-id': crypto.randomBytes(8).toString('hex'), 'sticker-pack-name': PACK, 'sticker-pack-publisher': 'AhmadShahzad' }), 'utf8');
        const head = Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
        head.writeUInt32LE(json.length, 14);
        const img = new Image(); await img.load(webp); img.exif = Buffer.concat([head, json]);
        return await img.save(null);
    } catch (_) { return webp; }
}

async function makeSticker(input, dir, secs) {
    const out = path.join(dir, 'st.webp');
    const tries = [{ fps: 15, size: 512, q: 45 }, { fps: 12, size: 512, q: 32 }, { fps: 10, size: 400, q: 24 }, { fps: 8, size: 320, q: 18 }];
    let last = null;
    for (const t of tries) {
        const vf = `fps=${t.fps},scale=${t.size}:${t.size}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${t.size}:${t.size}:(ow-iw)/2:(oh-ih)/2:color=0x00000000,format=yuva420p`;
        await ffq.run(ffq.ffmpegBin(), ['-y', '-hide_banner', '-loglevel', 'error', '-t', String(secs), '-i', input, '-vf', vf, '-an', '-c:v', 'libwebp', '-lossless', '0', '-q:v', String(t.q), '-compression_level', '4', '-loop', '0', '-preset', 'default', '-vsync', '0', out], 120000);
        last = fs.readFileSync(out);
        if (last.length <= MAX_STICKER) break;
    }
    return addExif(last);
}

async function makeVoice(input, dir, secs) {
    const out = path.join(dir, 'v.ogg');
    await ffq.run(ffq.ffmpegBin(), ['-y', '-hide_banner', '-loglevel', 'error', '-t', String(secs), '-i', input, '-vn', '-ac', '1', '-ar', '48000', '-c:a', 'libopus', '-b:a', '48k', '-f', 'ogg', out], 120000);
    return fs.readFileSync(out);
}


// WhatsApp sound sticker ke liye audio: 2-pass (stereo 64k -> mono 32k) — single pass par kabhi "Couldn't play sticker sound" aata hai
async function makeSoundOgg(input, dir, secs) {
    const mid = path.join(dir, 'mid.ogg'), out = path.join(dir, 'snd.ogg');
    const t = Math.min(secs, 9.9);
    await ffq.run(ffq.ffmpegBin(), ['-y', '-hide_banner', '-loglevel', 'error', '-t', String(t), '-i', input, '-vn', '-ac', '2', '-ar', '48000', '-c:a', 'libopus', '-b:a', '64k', '-f', 'ogg', mid], 120000);
    await ffq.run(ffq.ffmpegBin(), ['-y', '-hide_banner', '-loglevel', 'error', '-i', mid, '-vn', '-ac', '1', '-ar', '48000', '-c:a', 'libopus', '-b:a', '32k', '-f', 'ogg', out], 120000);
    return fs.readFileSync(out);
}

async function makeNote(input, dir, secs) {          // gol video-note: square 480, h264/aac
    const out = path.join(dir, 'n.mp4');
    await ffq.run(ffq.ffmpegBin(), ['-y', '-hide_banner', '-loglevel', 'error', '-t', String(Math.min(secs, 60)), '-i', input, '-vf', 'crop=min(iw\\,ih):min(iw\\,ih),scale=480:480,format=yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-c:a', 'aac', '-b:a', '96k', '-ac', '1', '-movflags', '+faststart', out], 180000);
    return fs.readFileSync(out);
}

cmd({
    pattern: 'audiosticker',
    alias: ['as', 'asticker', 'soundsticker', 'voicesticker'],
    desc: 'Video par reply: WhatsApp sound sticker (sticker par speaker icon, awaaz ke saath)',
    category: 'sticker',
    react: '🎭',
    use: '.as  (video par reply)  |  .as 6  |  .as note  |  .as sticker  |  .as voice  |  .as legacy',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const { from, args } = ctx;
    const a = (args || []).map(x => String(x).toLowerCase());
    const mode = a.find(x => ['note', 'sticker', 'voice', 'legacy'].includes(x)) || (String(process.env.AS_MODE || '').toLowerCase() === 'legacy' ? 'legacy' : 'both');
    const secs = Math.min(10, Math.max(1, parseFloat(a.find(x => /^\d+(\.\d+)?$/.test(x))) || 8));
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'asx_'));
    try {
        const buf = await getVideo(m, mek);
        if (!buf) return ctx.reply('🎭 *AUDIO STICKER*\n\nKisi *video par reply* karke likho:\n• *.as*  → sticker + awaaz\n• *.as 6*  → pehle 6 second\n• *.as note* → gol video-note (awaaz ke saath)\n• *.as sticker* / *.as voice*');
        const input = path.join(dir, 'in.mp4');
        fs.writeFileSync(input, buf);
        const audio = hasAudio(input);

        if (mode === 'note') {
            const note = await makeNote(input, dir, secs);
            return conn.sendMessage(from, { video: note, mimetype: 'video/mp4', ptv: true }, { quoted: mek });
        }
        // ── NATIVE sound sticker (default) ──
        if (mode === 'both' && audio) {
            try {
                const st = await makeSticker(input, dir, secs);
                const ogg = await makeSoundOgg(input, dir, secs);
                await require('../lib/soundsticker').send(conn, from, { webp: st, ogg, seconds: Math.min(secs, 9.9), quoted: mek });
                return;
            } catch (e) {
                console.warn('[AUDIOSTICKER] native fail -> legacy:', e && e.message);   // neeche purana tareeqa
            }
        }
        if (mode !== 'voice') {
            const st = await makeSticker(input, dir, secs);
            await conn.sendMessage(from, { sticker: st }, { quoted: mek });
        }
        if (mode !== 'sticker') {
            if (!audio) return ctx.reply('ℹ️ Is video mein awaaz nahi hai, sirf sticker gaya.');
            const v = await makeVoice(input, dir, secs);
            await conn.sendMessage(from, { audio: v, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: mek, messageId: skipvoice.newId() });
        }
    } catch (e) {
        console.warn('[AUDIOSTICKER]', e && e.message);
        return ctx.reply('❌ ' + String((e && e.message) || e).slice(0, 200));
    } finally { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {} }
});
