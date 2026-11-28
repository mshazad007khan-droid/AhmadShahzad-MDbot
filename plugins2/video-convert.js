// plugins2/video-convert.js (v13.5) — VIDEO / AUDIO CONVERTER MENU
//
// Kisi video (ya audio) par REPLY karke command likho — ya video bhejte waqt caption mein command likho.
//
//  AUDIO NIKALO        .mp3  .mp3hq  .m4a  .wav  .opus  .vn (voice note)  .mute (awaaz hata do)
//  QUALITY (VIDEO)     .144  .240  .360  .380  .480  .540  .720  .1080
//  FORMAT / TOOLS      .mp4  .gif  .note (gol video)  .doc (file ki tarah)  .compress  .frame [sec]
//  EDIT                .trim 5 15  .slow  .fast  .vreverse  .rotate 90   (+ purane .vspeed 1.5  .vloop 3  media-edit se)
//  MENU                .vmenu   (ye poori list)
//
// NOTE: .mp3 / .mp4 / .gif pehle se song / video / emotion commands ke naam bhi hain. Agar reply mein koi video/audio ho to ye
// converter chalta hai, warna purani command (jaise ".mp3 faded" = gaana download) bilkul pehle ki tarah chalti hai.
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const core = require('../ahmadcore');
const { cmd } = core;
const ffq = require('../lib/ffq');
const skipvoice = require('../lib/skipvoice');

const MAX_IN = 64 * 1024 * 1024;           // input limit
const DOC_ABOVE = 90 * 1024 * 1024;        // isse bari output document ban kar jati hai
const BRAND = '𝐀𝐡𝐦𝐚𝐝𝐒𝐡𝐚𝐡𝐳𝐚𝐝-𝐌𝐃';

// ───────────────────────── helpers ─────────────────────────
const unwrapOnce = (inner) => (inner.viewOnceMessageV2 || inner.viewOnceMessage || inner.viewOnceMessageV2Extension || inner.ephemeralMessage || inner.documentWithCaptionMessage || {}).message;

async function fromMessage(msg) {
    if (!msg) return null;
    let inner = msg;
    for (let i = 0; i < 4; i++) { const nx = unwrapOnce(inner); if (!nx) break; inner = nx; }
    let node = null, kind = null;
    if (inner.videoMessage) { node = inner.videoMessage; kind = 'video'; }
    else if (inner.audioMessage) { node = inner.audioMessage; kind = 'audio'; }
    else if (inner.ptvMessage) { node = inner.ptvMessage; kind = 'video'; }
    else if (inner.documentMessage && /video|audio|gif|ogg|mpeg|mp3|m4a|wav|opus|mp4|mkv|webm|mov/i.test((inner.documentMessage.mimetype || '') + ' ' + (inner.documentMessage.fileName || ''))) { node = inner.documentMessage; kind = 'document'; }
    if (!node) return null;
    if (Number(node.fileLength || 0) > MAX_IN) throw new Error('File bohat badi hai (64MB se chhoti do)');
    const stream = await downloadContentFromMessage(node, kind);
    const chunks = []; for await (const c of stream) chunks.push(c);
    return { buffer: Buffer.concat(chunks), kind, node };
}

// reply kiya hua media, ya khud ka (caption wala) media
async function getMedia(m, mek) {
    if (m && m.quoted && m.quoted.message) { const r = await fromMessage(m.quoted.message); if (r) return r; }
    for (const k of Object.keys(mek.message || {})) {
        const v = mek.message[k];
        if (v && typeof v === 'object' && v.contextInfo && v.contextInfo.quotedMessage) { const r = await fromMessage(v.contextInfo.quotedMessage); if (r) return r; }
    }
    return fromMessage(mek.message);
}

// quoted/caption mein media hai ya nahi (download kiye bina) — song/video/emotion ke saath takraav se bachne ke liye
function hasMediaRef(m, mek) {
    const test = (msg) => {
        if (!msg) return false;
        let inner = msg;
        for (let i = 0; i < 4; i++) { const nx = unwrapOnce(inner); if (!nx) break; inner = nx; }
        return !!(inner.videoMessage || inner.audioMessage || inner.ptvMessage || (inner.documentMessage && /video|audio|gif|ogg|mpeg|mp3|m4a|wav|opus|mp4|mkv|webm|mov/i.test((inner.documentMessage.mimetype || '') + ' ' + (inner.documentMessage.fileName || ''))));
    };
    if (m && m.quoted && test(m.quoted.message)) return true;
    for (const k of Object.keys(mek.message || {})) {
        const v = mek.message[k];
        if (v && typeof v === 'object' && v.contextInfo && test(v.contextInfo.quotedMessage)) return true;
    }
    return test(mek.message);
}

function probe(file) {
    return new Promise((resolve) => {
        let out = '';
        const p = spawn(ffq.ffmpegBin(), ['-hide_banner', '-i', file], { stdio: ['ignore', 'ignore', 'pipe'] });
        const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (_) {} resolve({ seconds: 0, hasAudio: false, hasVideo: false, height: 0 }); }, 20000);
        p.stderr.on('data', d => { out += d; });
        p.on('error', () => { clearTimeout(t); resolve({ seconds: 0, hasAudio: false, hasVideo: false, height: 0 }); });
        p.on('close', () => {
            clearTimeout(t);
            const d = out.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
            const r = out.match(/Video:[^\n]*?,\s*(\d{2,5})x(\d{2,5})/);
            resolve({
                seconds: d ? Number(d[1]) * 3600 + Number(d[2]) * 60 + Number(d[3]) : 0,
                hasAudio: /Stream #[^\n]*Audio:/i.test(out),
                hasVideo: /Stream #[^\n]*Video:/i.test(out) && !/Video:\s*(mjpeg|png)\b[^\n]*\(attached pic\)/i.test(out),
                width: r ? Number(r[1]) : 0, height: r ? Number(r[2]) : 0
            });
        });
    });
}

const sizeTxt = (n) => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';

// "1:05" / "65" / "1m5s" -> seconds
function parseTime(s) {
    s = String(s || '').trim().toLowerCase();
    if (!s) return NaN;
    if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
    let mm = s.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
    if (mm) return mm[3] !== undefined ? (+mm[1]) * 3600 + (+mm[2]) * 60 + (+mm[3]) : (+mm[1]) * 60 + (+mm[2]);
    mm = s.match(/^(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s)?$/);
    if (mm && (mm[1] || mm[2])) return (+(mm[1] || 0)) * 60 + parseFloat(mm[2] || 0);
    return NaN;
}

// atempo sirf 0.5–2.0 leta hai: chain bana do
function atempoChain(f) {
    const out = []; let x = f;
    while (x > 2) { out.push('atempo=2.0'); x /= 2; }
    while (x < 0.5) { out.push('atempo=0.5'); x /= 0.5; }
    out.push('atempo=' + x.toFixed(4));
    return out.join(',');
}

// Har command ka common wrapper: media nikalo, kaam karo, safai karo.
async function withMedia(conn, mek, m, ctx, label, need, job) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vc_'));
    try {
        const src = await getMedia(m, mek);
        if (!src) {
            return ctx.reply(`🎞️ *${BRAND}*\n\nKisi *${need === 'audio' ? 'video / audio' : 'video'}* par *REPLY* karke likho:\n*.${ctx.command || label}*\n\n(ya video bhejte waqt caption mein *.${ctx.command || label}* likho)\n\n📋 Poori list: *.vmenu*`);
        }
        const input = path.join(dir, 'in.' + crypto.randomBytes(3).toString('hex'));
        fs.writeFileSync(input, src.buffer);
        const info = await probe(input);
        if (need === 'video' && !info.hasVideo) return ctx.reply('❌ Ye video nahi hai (sirf awaaz hai). Video par reply karo.');
        if (need === 'audio' && !info.hasAudio) return ctx.reply('❌ Is video / file mein awaaz (audio) nahi hai.');
        await job({ input, dir, src, info });
    } catch (e) {
        console.warn('[VCONVERT]', label, e && e.message);
        try { await ctx.reply('❌ ' + String((e && e.message) || e).slice(0, 220)); } catch (_) {}
    } finally { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {} }
}

const ff = (args, ms) => ffq.run(ffq.ffmpegBin(), ['-y', '-hide_banner', '-loglevel', 'error', ...args], ms || 300000);

async function sendVideo(conn, ctx, mek, buf, caption, extra) {
    if (buf.length > DOC_ABOVE) {
        return conn.sendMessage(ctx.from, { document: buf, mimetype: 'video/mp4', fileName: 'video.mp4', caption }, { quoted: mek });
    }
    return conn.sendMessage(ctx.from, { video: buf, mimetype: 'video/mp4', caption, ...(extra || {}) }, { quoted: mek });
}

// ───────────────────────── 1) AUDIO NIKALNE WALI ─────────────────────────
const AUDIO_OUT = [
    // [pattern, alias, ext, mimetype, ffmpeg audio args, desc]
    ['mp3',   ['tomp3x', 'extractmp3'], 'mp3',  'audio/mpeg',               ['-c:a', 'libmp3lame', '-b:a', '128k'], 'Video / voice se MP3 banao (128k)'],
    ['mp3hq', ['mp3320', 'hqmp3'],       'mp3',  'audio/mpeg',               ['-c:a', 'libmp3lame', '-b:a', '320k'], 'Video / voice se HQ MP3 (320k)'],
    ['m4a',   ['toaac', 'aac'],          'm4a',  'audio/mp4',                ['-c:a', 'aac', '-b:a', '160k'],        'Video / audio se M4A (AAC)'],
    ['wav',   ['towav'],                 'wav',  'audio/wav',                ['-c:a', 'pcm_s16le', '-ar', '44100'],  'Video / audio se WAV (lossless)'],
    ['opus',  ['toopus', 'toogg'],       'ogg',  'audio/ogg; codecs=opus',   ['-c:a', 'libopus', '-b:a', '96k'],     'Video / audio se OGG-Opus file']
];

for (const [pattern, alias, ext, mime, aargs, desc] of AUDIO_OUT) {
    cmd({ pattern, alias, desc, category: 'audioedit', react: '🎵', use: `.${pattern} (video / audio par reply)`, filename: __filename },
        async (conn, mek, m, ctx) => {
            // pehle se maujood song/video commands ke saath mel: reply mein media nahi to purani command chalao
            if (!hasMediaRef(m, mek)) {
                const old = pattern === 'mp3' ? core.commandMap.get('song') : null;
                if (old && old.function) return old.function(conn, mek, m, ctx);
            }
            return withMedia(conn, mek, m, ctx, pattern, 'audio', async ({ input, dir, info }) => {
                const out = path.join(dir, 'out.' + ext);
                await ff(['-i', input, '-vn', '-map_metadata', '-1', ...aargs, out], 300000);
                const buf = fs.readFileSync(out);
                const nm = ((ctx.pushname || 'audio').replace(/[^\w\- ]/g, '').trim() || 'audio') + '.' + ext;
                if (buf.length > DOC_ABOVE) return conn.sendMessage(ctx.from, { document: buf, mimetype: mime, fileName: nm }, { quoted: mek });
                await conn.sendMessage(ctx.from, { audio: buf, mimetype: mime, ptt: false, seconds: Math.round(info.seconds || 0) || undefined }, { quoted: mek });
            });
        });
}

cmd({ pattern: 'vn', alias: ['tovn', 'voicenote', 'asvn'], desc: 'Video / audio ko VOICE NOTE banao', category: 'audioedit', react: '🎙️', use: '.vn (video / audio par reply)', filename: __filename },
    async (conn, mek, m, ctx) => withMedia(conn, mek, m, ctx, 'vn', 'audio', async ({ input, dir }) => {
        const out = path.join(dir, 'v.ogg');
        await ff(['-i', input, '-vn', '-t', '600', '-ac', '1', '-ar', '48000', '-c:a', 'libopus', '-b:a', '48k', '-f', 'ogg', out]);
        await conn.sendMessage(ctx.from, { audio: fs.readFileSync(out), mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: mek, messageId: skipvoice.newId() });
    }));

cmd({ pattern: 'mute', alias: ['silent', 'nosound', 'videomute2'], desc: 'Video ki awaaz hata do (sirf video)', category: 'videoedit', react: '🔇', use: '.mute (video par reply)', filename: __filename },
    async (conn, mek, m, ctx) => withMedia(conn, mek, m, ctx, 'mute', 'video', async ({ input, dir }) => {
        const out = path.join(dir, 'o.mp4');
        await ff(['-i', input, '-an', '-c:v', 'copy', '-movflags', '+faststart', out]).catch(() => ff(['-i', input, '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]));
        await sendVideo(conn, ctx, mek, fs.readFileSync(out), `🔇 Bina awaaz\n${BRAND}`);
    }));

// ───────────────────────── 2) QUALITY MENU: .144 .240 .360 .380 .480 .540 .720 .1080 ─────────────────────────
const QUALITIES = [
    // [height, crf, audio kbps]
    [144, 31, 48], [240, 29, 64], [360, 27, 96], [380, 27, 96], [480, 26, 112], [540, 25, 128], [720, 24, 128], [1080, 23, 160]
];
for (const [h, crf, ab] of QUALITIES) {
    cmd({ pattern: String(h), alias: [h + 'p'], desc: `Video ko ${h}p quality mein badlo`, category: 'videoedit', react: '🎞️', use: `.${h} (video par reply)`, filename: __filename },
        async (conn, mek, m, ctx) => withMedia(conn, mek, m, ctx, String(h), 'video', async ({ input, dir, info }) => {
            await ctx.reply(`⏳ *${h}p* mein convert ho rahi hai...`);
            const out = path.join(dir, 'q.mp4');
            const vf = `scale=-2:'trunc(min(ih,${h})/2)*2':flags=lanczos,format=yuv420p`;
            await ff(['-i', input, '-vf', vf, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(crf), '-c:a', 'aac', '-b:a', ab + 'k', '-ac', '2', '-movflags', '+faststart', out], 600000);
            const buf = fs.readFileSync(out);
            const real = info.height && info.height < h ? `${info.height}p (asal video isse bari nahi thi)` : `${h}p`;
            await sendVideo(conn, ctx, mek, buf, `🎞️ ${real} • ${sizeTxt(buf.length)}\n${BRAND}`);
        }));
}

// ───────────────────────── 3) FORMAT / TOOLS ─────────────────────────
cmd({ pattern: 'mp4', alias: ['tomp4', 'tovideo', 'fixvideo'], desc: 'Kisi bhi video ko WhatsApp-safe MP4 banao', category: 'videoedit', react: '🎬', use: '.mp4 (video par reply)', filename: __filename },
    async (conn, mek, m, ctx) => {
        if (!hasMediaRef(m, mek)) { const old = core.commandMap.get('video'); if (old && old.function) return old.function(conn, mek, m, ctx); }
        return withMedia(conn, mek, m, ctx, 'mp4', 'video', async ({ input, dir }) => {
            const out = path.join(dir, 'o.mp4');
            await ff(['-i', input, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-pix_fmt', 'yuv420p', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out], 600000);
            await sendVideo(conn, ctx, mek, fs.readFileSync(out), `🎬 MP4\n${BRAND}`);
        });
    });

cmd({ pattern: 'gif', alias: ['togif', 'vgif'], desc: 'Video ko GIF (chalne wali, bina awaaz) banao', category: 'videoedit', react: '🌀', use: '.gif (video par reply)  |  .gif 6 (pehle 6 sec)', filename: __filename },
    async (conn, mek, m, ctx) => {
        if (!hasMediaRef(m, mek)) { const old = core.commandMap.get('emotion'); if (old && old.function) return old.function(conn, mek, m, ctx); }
        return withMedia(conn, mek, m, ctx, 'gif', 'video', async ({ input, dir }) => {
            const secs = Math.min(20, Math.max(1, parseFloat((ctx.args || [])[0]) || 10));
            const out = path.join(dir, 'g.mp4');
            await ff(['-t', String(secs), '-i', input, '-an', '-vf', "fps=15,scale=-2:'trunc(min(ih,480)/2)*2':flags=lanczos,format=yuv420p", '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-movflags', '+faststart', out]);
            await conn.sendMessage(ctx.from, { video: fs.readFileSync(out), mimetype: 'video/mp4', gifPlayback: true, caption: BRAND }, { quoted: mek });
        });
    });

cmd({ pattern: 'note', alias: ['vnote', 'roundvideo', 'ptv'], desc: 'Video ko gol (round) video-note banao', category: 'videoedit', react: '⭕', use: '.note (video par reply)', filename: __filename },
    async (conn, mek, m, ctx) => withMedia(conn, mek, m, ctx, 'note', 'video', async ({ input, dir }) => {
        const out = path.join(dir, 'n.mp4');
        await ff(['-t', '60', '-i', input, '-vf', 'crop=min(iw\\,ih):min(iw\\,ih),scale=480:480,format=yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-c:a', 'aac', '-b:a', '96k', '-ac', '1', '-movflags', '+faststart', out]);
        await conn.sendMessage(ctx.from, { video: fs.readFileSync(out), mimetype: 'video/mp4', ptv: true }, { quoted: mek });
    }));

cmd({ pattern: 'vdoc', alias: ['todoc', 'asdoc', 'senddoc', 'doc'], desc: 'Video / audio ko DOCUMENT file ki tarah bhejo (quality kharab nahi hoti)', category: 'videoedit', react: '📁', use: '.vdoc (video / audio par reply)', filename: __filename },
    async (conn, mek, m, ctx) => withMedia(conn, mek, m, ctx, 'vdoc', 'audio_or_video', async ({ src, info }) => {
        const isAudio = src.kind === 'audio' || (!info.hasVideo && info.hasAudio);
        const mime = (src.node && src.node.mimetype) || (isAudio ? 'audio/mpeg' : 'video/mp4');
        const ext = isAudio ? (/ogg|opus/i.test(mime) ? 'ogg' : /mp4|m4a|aac/i.test(mime) ? 'm4a' : 'mp3') : (/webm/i.test(mime) ? 'webm' : 'mp4');
        await conn.sendMessage(ctx.from, { document: src.buffer, mimetype: mime, fileName: (isAudio ? 'audio.' : 'video.') + ext, caption: BRAND }, { quoted: mek });
    }));

cmd({ pattern: 'compress', alias: ['reducesize', 'shrinkvideo'], desc: 'Video ka size kam karo: .compress  |  .compress low / mid / high', category: 'videoedit', react: '🗜️', use: '.compress [low|mid|high] (video par reply)', filename: __filename },
    async (conn, mek, m, ctx) => withMedia(conn, mek, m, ctx, 'compress', 'video', async ({ input, dir, src }) => {
        const lvl = String((ctx.args || [])[0] || 'mid').toLowerCase();
        const [crf, h, ab] = lvl === 'low' ? [34, 360, 64] : lvl === 'high' ? [28, 720, 128] : [31, 480, 80];
        await ctx.reply('⏳ Size kam ho raha hai...');
        const out = path.join(dir, 'c.mp4');
        await ff(['-i', input, '-vf', `scale=-2:'trunc(min(ih,${h})/2)*2'`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', ab + 'k', '-ac', '2', '-movflags', '+faststart', out], 600000);
        const buf = fs.readFileSync(out);
        await sendVideo(conn, ctx, mek, buf, `🗜️ ${sizeTxt(src.buffer.length)} → ${sizeTxt(buf.length)}\n${BRAND}`);
    }));

cmd({ pattern: 'frame', alias: ['vframe', 'screenshot', 'grabframe'], desc: 'Video ka ek frame photo bana kar do: .frame 5 (5 sec par)', category: 'videoedit', react: '📸', use: '.frame [second] (video par reply)', filename: __filename },
    async (conn, mek, m, ctx) => withMedia(conn, mek, m, ctx, 'frame', 'video', async ({ input, dir, info }) => {
        let t = parseTime((ctx.args || [])[0]); if (!(t >= 0)) t = Math.min(1, (info.seconds || 1) / 2);
        if (info.seconds && t > info.seconds) t = Math.max(0, info.seconds - 0.5);
        const out = path.join(dir, 'f.jpg');
        await ff(['-ss', String(t), '-i', input, '-frames:v', '1', '-q:v', '2', out], 120000);
        await conn.sendMessage(ctx.from, { image: fs.readFileSync(out), caption: `📸 ${t.toFixed(1)}s par ka frame\n${BRAND}` }, { quoted: mek });
    }));

// ───────────────────────── 4) EDIT ─────────────────────────
cmd({ pattern: 'trim', alias: ['cut', 'cutvideo', 'clipvideo'], desc: 'Video ka hissa kaato: .trim 5 15  |  .trim 0:30 1:10  |  .trim 10 (pehle 10 sec)', category: 'videoedit', react: '✂️', use: '.trim <start> <end> (video / audio par reply)', filename: __filename },
    async (conn, mek, m, ctx) => withMedia(conn, mek, m, ctx, 'trim', 'audio_or_video', async ({ input, dir, info, src }) => {
        const raw = (ctx.args || []).join(' ').replace(/\s*[-–to]+\s*/gi, ' ').trim().split(/\s+/).filter(Boolean);
        let start = 0, end = NaN;
        if (raw.length >= 2) { start = parseTime(raw[0]); end = parseTime(raw[1]); }
        else if (raw.length === 1) { end = parseTime(raw[0]); }
        if (!(start >= 0) || !(end > start)) return ctx.reply('✂️ *TRIM*\n\nIstemal: *.trim 5 15* (5 se 15 second)\nYa: *.trim 0:30 1:10*\nYa: *.trim 10* (pehle 10 second)');
        if (info.seconds && start >= info.seconds) return ctx.reply(`❌ Video sirf ${Math.round(info.seconds)} second ki hai.`);
        const isAudio = !info.hasVideo;
        if (isAudio) {
            const out = path.join(dir, 't.mp3');
            await ff(['-ss', String(start), '-to', String(end), '-i', input, '-vn', '-c:a', 'libmp3lame', '-b:a', '160k', out]);
            return conn.sendMessage(ctx.from, { audio: fs.readFileSync(out), mimetype: 'audio/mpeg', ptt: false }, { quoted: mek });
        }
        const out = path.join(dir, 't.mp4');
        await ff(['-ss', String(start), '-to', String(end), '-i', input, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out], 600000);
        await sendVideo(conn, ctx, mek, fs.readFileSync(out), `✂️ ${start}s → ${end}s\n${BRAND}`);
    }));

async function speedJob(conn, mek, ctx, input, dir, info, factor) {
    const out = path.join(dir, 's.mp4');
    const args = ['-i', input, '-vf', `setpts=${(1 / factor).toFixed(5)}*PTS`];
    if (info.hasAudio) args.push('-af', atempoChain(factor));
    args.push('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out);
    await ff(args, 600000);
    await sendVideo(conn, ctx, mek, fs.readFileSync(out), `⏩ ${factor}x speed\n${BRAND}`);
}
cmd({ pattern: 'slow', alias: ['slowmo', 'slowvideo'], desc: 'Video ko aahista (0.5x) karo', category: 'videoedit', react: '🐢', use: '.slow (video par reply)', filename: __filename },
    async (conn, mek, m, ctx) => withMedia(conn, mek, m, ctx, 'slow', 'video', ({ input, dir, info }) => speedJob(conn, mek, ctx, input, dir, info, 0.5)));
cmd({ pattern: 'fast', alias: ['fastvideo', 'fastmo'], desc: 'Video ko tez (2x) karo', category: 'videoedit', react: '🐇', use: '.fast (video par reply)', filename: __filename },
    async (conn, mek, m, ctx) => withMedia(conn, mek, m, ctx, 'fast', 'video', ({ input, dir, info }) => speedJob(conn, mek, ctx, input, dir, info, 2)));
cmd({ pattern: 'vreverse', alias: ['reversevideo', 'ulta'], desc: 'Video ulta chalao (max 60 sec)', category: 'videoedit', react: '⏪', use: '.vreverse (video par reply)', filename: __filename },
    async (conn, mek, m, ctx) => withMedia(conn, mek, m, ctx, 'vreverse', 'video', async ({ input, dir, info }) => {
        if (info.seconds > 62) return ctx.reply('❌ Ulta karne ke liye video 60 second se chhoti honi chahiye (.trim se chhoti kar lo).');
        const out = path.join(dir, 'r.mp4');
        const args = ['-i', input, '-vf', 'reverse'];
        if (info.hasAudio) args.push('-af', 'areverse');
        args.push('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '25', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out);
        await ff(args, 600000);
        await sendVideo(conn, ctx, mek, fs.readFileSync(out), `⏪ Ulta video\n${BRAND}`);
    }));

cmd({ pattern: 'rotate', alias: ['vrotate', 'rotatevideo'], desc: 'Video ghumao: .rotate 90 / 180 / 270', category: 'videoedit', react: '🔄', use: '.rotate <90|180|270> (video par reply)', filename: __filename },
    async (conn, mek, m, ctx) => withMedia(conn, mek, m, ctx, 'rotate', 'video', async ({ input, dir }) => {
        const deg = parseInt((ctx.args || [])[0], 10) || 90;
        const vf = deg === 180 ? 'hflip,vflip' : deg === 270 || deg === -90 ? 'transpose=2' : 'transpose=1';
        const out = path.join(dir, 'ro.mp4');
        await ff(['-i', input, '-vf', vf, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', out], 600000)
            .catch(() => ff(['-i', input, '-vf', vf, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', out], 600000));
        await sendVideo(conn, ctx, mek, fs.readFileSync(out), `🔄 ${deg === 270 || deg === -90 ? 270 : deg === 180 ? 180 : 90}°\n${BRAND}`);
    }));

// ───────────────────────── 5) MENU ─────────────────────────
const MENU_TEXT = (p) => `┏❖ *${BRAND}* ❖┓
┃  🎞️ *CONVERTER MENU*
┗━━━━━━━━━━━━━━━━━┛

Video ya audio par *REPLY* karke command likho
(ya video bhejte waqt caption mein likho)

🎵 *AUDIO NIKALO*
➜ ${p}mp3 — MP3 (128k)
➜ ${p}mp3hq — HQ MP3 (320k)
➜ ${p}m4a — M4A / AAC
➜ ${p}wav — WAV
➜ ${p}opus — OGG Opus
➜ ${p}vn — Voice note
➜ ${p}mute — awaaz hata do

🎞️ *VIDEO QUALITY*
➜ ${p}144   ➜ ${p}240   ➜ ${p}360
➜ ${p}380   ➜ ${p}480   ➜ ${p}540
➜ ${p}720   ➜ ${p}1080

🛠️ *FORMAT / TOOLS*
➜ ${p}mp4 — WhatsApp-safe MP4
➜ ${p}gif — GIF (chalne wali)
➜ ${p}note — gol video-note
➜ ${p}doc — document file ki tarah
➜ ${p}compress low|mid|high — size kam
➜ ${p}frame 5 — 5 sec ka photo

✂️ *EDIT*
➜ ${p}trim 5 15 — 5 se 15 sec kaato
➜ ${p}slow — 0.5x   ➜ ${p}fast — 2x
➜ ${p}vspeed 1.5 — apni speed (0.5–4x)
➜ ${p}vreverse — ulta video
➜ ${p}rotate 90 — ghumao
➜ ${p}vloop 3 — 3 baar repeat

🎭 *STICKER*
➜ ${p}as — sound sticker (video par)
➜ ${p}me — audio ko voice note (apni DP)

ℹ️ Agar reply mein video/audio na ho to ${p}mp3 / ${p}mp4 / ${p}gif purani commands (song / video / emotion) ki tarah chalti hain.`;

cmd({ pattern: 'vmenu', alias: ['convertmenu', 'qualitymenu', 'formatmenu', 'videomenu2', 'converter'], desc: 'Video / audio converter ka poora menu (.mp3, .720, .gif ...)', category: 'videoedit', react: '📋', use: '.vmenu', filename: __filename },
    async (conn, mek, m, ctx) => ctx.reply(MENU_TEXT(String((ctx.config && ctx.config.PREFIX) || '.'))));

console.log('[VCONVERT] video-convert loaded:', AUDIO_OUT.length + QUALITIES.length + 14, 'commands');
