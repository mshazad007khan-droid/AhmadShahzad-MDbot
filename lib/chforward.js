// lib/chforward.js (v13.5) — .chforward ka asli engine
//
// v13.5 FIX (channel par gaana / voice / video nahi jata tha):
//   Baileys channel (@newsletter) par media bhejte waqt `seconds`, `waveform`, thumbnail, width/height KHUD nahi nikalta
//   (channel ki media plain upload hoti hai, wo processing wali branch skip ho jati hai). Bina `seconds`/`waveform` ke WhatsApp
//   channel par audio/voice "bhej diya" to dikhata hai magar dikhta ya chalta nahi. Ab ye sab hum khud nikal kar dete hain,
//   audio hamesha ogg/opus mein badla jata hai, video WhatsApp-safe mp4 banti hai, aur ek tareeqa fail ho to dusra try hota hai.
//   Channel ki apni post (jis mein mediaKey nahi hoti) ab seedha CDN se uthai jati hai.
//
// Use:  post / gaane / voice par REPLY karke
//   .chforward <group jid | group link | channel link | number | here> [voice | audio]
//   voice  -> audio ko voice-note ki tarah bhejo      audio -> gaane/audio-file ki tarah bhejo (default: jaisa tha waisa)
const fs = require('fs');
const os = require('os');
const path = require('path');
const axios = require('axios');
const { spawn } = require('child_process');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const ffq = require('./ffq');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const isNL = (jid) => /@newsletter$/.test(String(jid || ''));

function getContext(mek) {
    const msg = mek.message || {};
    for (const k of Object.keys(msg)) {
        const v = msg[k];
        if (v && typeof v === 'object' && v.contextInfo && v.contextInfo.quotedMessage) return v.contextInfo;
    }
    return null;
}
function unwrap(m) {
    let x = m || {};
    for (let i = 0; i < 5; i++) {
        const nx = (x.ephemeralMessage || x.viewOnceMessage || x.viewOnceMessageV2 || x.viewOnceMessageV2Extension || x.documentWithCaptionMessage || x.editedMessage || {}).message;
        if (!nx) break; x = nx;
    }
    return x;
}

// "1203630xxxx-1234@g.us" | "1203630xxxx" | "923001234567" | "@newsletter" | "https://chat.whatsapp.com/xxxx" | channel link
async function resolveTarget(conn, raw, here) {
    let t = String(raw || '').trim();
    if (!t) return null;
    if (/^(here|this|yahan|yaha)$/i.test(t)) return here;
    const inv = t.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/i);
    if (inv) { try { const info = await conn.groupGetInviteInfo(inv[1]); return info && info.id; } catch (_) { return null; } }
    const ch = t.match(/whatsapp\.com\/channel\/([A-Za-z0-9_-]+)/i);     // channel ka link -> @newsletter id
    if (ch) { try { const md = await conn.newsletterMetadata('invite', ch[1]); return md && md.id; } catch (_) { return null; } }
    if (t.includes('@')) return t;
    t = t.replace(/[^\d-]/g, '');
    if (!t) return null;
    if (t.includes('-')) return t + '@g.us';
    if (t.length >= 18) return t + '@g.us';          // lambi numeric id = group
    return t + '@s.whatsapp.net';
}

const hasKey = (node) => node && node.mediaKey && (node.mediaKey.length || Object.keys(node.mediaKey).length);

async function cdnGet(node) {
    const urls = [];
    if (node.url && /^https?:/.test(node.url)) urls.push(node.url);
    if (node.directPath) urls.push('https://mmg.whatsapp.net' + node.directPath);
    let lastErr = null;
    for (const url of urls) {
        try {
            const r = await axios.get(url, { responseType: 'arraybuffer', timeout: 90000, headers: { 'User-Agent': 'Mozilla/5.0' } });
            const b = Buffer.from(r.data);
            if (b.length) return b;
        } catch (e) { lastErr = e; }
    }
    throw new Error('media ka link nahi mila / download fail' + (lastErr ? ' (' + (lastErr.message || lastErr) + ')' : ''));
}

async function dl(node, kind) {
    // channel ki apni media mein mediaKey nahi hoti: decrypt ki koshish mein kabhi kachra buffer mil jata tha -> seedha CDN
    if (!hasKey(node)) return cdnGet(node);
    try {
        const stream = await downloadContentFromMessage(node, kind);
        const chunks = []; for await (const c of stream) chunks.push(c);
        const b = Buffer.concat(chunks);
        if (b.length) return b;
    } catch (_) { /* neeche CDN */ }
    return cdnGet(node);
}

// replied message -> sendMessage ka content
async function buildContent(quoted) {
    const m = unwrap(quoted);
    if (m.conversation) return { text: m.conversation };
    if (m.extendedTextMessage) return { text: m.extendedTextMessage.text || '' };
    if (m.audioMessage) {
        const a = m.audioMessage;
        return { audio: await dl(a, 'audio'), mimetype: a.mimetype || 'audio/mp4', ptt: !!a.ptt, seconds: a.seconds || 0 };
    }
    if (m.videoMessage) {
        const v = m.videoMessage;
        return { video: await dl(v, 'video'), mimetype: v.mimetype || 'video/mp4', caption: v.caption || '', gifPlayback: !!v.gifPlayback };
    }
    if (m.imageMessage) {
        const i = m.imageMessage;
        return { image: await dl(i, 'image'), mimetype: i.mimetype || 'image/jpeg', caption: i.caption || '' };
    }
    if (m.stickerMessage) return { sticker: await dl(m.stickerMessage, 'sticker') };
    if (m.documentMessage) {
        const d = m.documentMessage;
        return { document: await dl(d, 'document'), mimetype: d.mimetype || 'application/octet-stream', fileName: d.fileName || 'file', caption: d.caption || '' };
    }
    return null;
}

// ---------- ffmpeg helpers ----------
function tmpdir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'chf-')); }
function rm(dir) { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {} }

// 64 byte waveform (0-100) — voice note ki lehrein
async function makeWaveform(file, dir) {
    try {
        const raw = path.join(dir, 'w.raw');
        await ffq.run(ffq.ffmpegBin(), ['-y', '-hide_banner', '-loglevel', 'error', '-i', file, '-vn', '-ac', '1', '-ar', '8000', '-f', 's16le', raw], 120000);
        const buf = fs.readFileSync(raw);
        const n = Math.floor(buf.length / 2);
        if (n < 64) return null;
        const per = Math.floor(n / 64), vals = [];
        for (let i = 0; i < 64; i++) { let sum = 0; for (let j = 0; j < per; j++) { const v = buf.readInt16LE((i * per + j) * 2); sum += Math.abs(v); } vals.push(sum / per); }
        const max = Math.max(...vals) || 1;
        return new Uint8Array(vals.map(v => Math.max(3, Math.min(100, Math.round((v / max) * 100)))));
    } catch (_) { return null; }
}

// koi bhi audio -> ogg/opus mono 48k + seconds + waveform
async function prepOpus(audioBuf, ptt) {
    const dir = tmpdir();
    try {
        const inp = path.join(dir, 'in'), out = path.join(dir, 'o.ogg');
        fs.writeFileSync(inp, audioBuf);
        await ffq.run(ffq.ffmpegBin(), ['-y', '-hide_banner', '-loglevel', 'error', '-i', inp, '-vn', '-ac', '1', '-ar', '48000', '-c:a', 'libopus', '-b:a', '64k', '-f', 'ogg', out], 240000);
        const seconds = Math.max(1, Math.round(await ffq.duration(out)));
        const waveform = await makeWaveform(out, dir);
        const content = { audio: fs.readFileSync(out), mimetype: 'audio/ogg; codecs=opus', ptt: !!ptt, seconds };
        if (waveform) content.waveform = waveform;
        return content;
    } finally { rm(dir); }
}

function probe(file) {
    return new Promise((resolve) => {
        let out = '';
        const p = spawn(ffq.ffmpegBin(), ['-hide_banner', '-i', file], { stdio: ['ignore', 'ignore', 'pipe'] });
        const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (_) {} resolve({}); }, 20000);
        p.stderr.on('data', d => { out += d; });
        p.on('error', () => { clearTimeout(t); resolve({}); });
        p.on('close', () => {
            clearTimeout(t);
            const d = out.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
            const r = out.match(/Video:[^\n]*?,\s*(\d{2,5})x(\d{2,5})/);
            resolve({ seconds: d ? Math.round(Number(d[1]) * 3600 + Number(d[2]) * 60 + Number(d[3])) : 0, width: r ? Number(r[1]) : 0, height: r ? Number(r[2]) : 0 });
        });
    });
}

// channel ke liye video: WhatsApp-safe mp4 + seconds + width/height + thumbnail
async function prepVideoForChannel(content) {
    let buf = content.video;
    try { buf = await require('./safevideo').fix(buf); } catch (_) {}
    const dir = tmpdir();
    try {
        const f = path.join(dir, 'v.mp4'); fs.writeFileSync(f, buf);
        const info = await probe(f);
        let thumb;
        try {
            const jpg = path.join(dir, 't.jpg');
            await ffq.run(ffq.ffmpegBin(), ['-y', '-hide_banner', '-loglevel', 'error', '-ss', '0.3', '-i', f, '-frames:v', '1', '-vf', 'scale=320:-2', jpg], 60000);
            thumb = fs.readFileSync(jpg);
        } catch (_) {}
        const out = { ...content, video: buf, mimetype: 'video/mp4' };
        if (info.seconds) out.seconds = info.seconds;
        if (info.width) { out.width = info.width; out.height = info.height; }
        if (thumb) out.jpegThumbnail = thumb;
        return out;
    } finally { rm(dir); }
}

async function prepImageForChannel(content) {
    try {
        const sharp = require('sharp');
        const meta = await sharp(content.image).metadata();
        const thumb = await sharp(content.image).resize(320, 320, { fit: 'inside' }).jpeg({ quality: 60 }).toBuffer();
        return { ...content, width: meta.width, height: meta.height, jpegThumbnail: thumb };
    } catch (_) { return content; }
}

// ek target par bhejo (channel ho ya group / chat)
async function sendOne(conn, jid, content, mode) {
    if (!isNL(jid)) {
        // group / chat: audio ko mode ke hisaab se
        if (content.audio && (mode === 'voice' || mode === 'audio')) {
            const c = await prepOpus(content.audio, mode === 'voice');
            return conn.sendMessage(jid, c);
        }
        return conn.sendMessage(jid, content);
    }
    // ---- CHANNEL ----
    if (content.audio) {
        const wantPtt = mode === 'voice' ? true : mode === 'audio' ? false : !!content.ptt;
        const order = wantPtt ? [true, false] : [false, true];       // pehla tareeqa fail ho to dusra
        let lastErr = null;
        for (const ptt of order) {
            try {
                const c = await prepOpus(content.audio, ptt);
                const sent = await conn.sendMessage(jid, c);
                if (sent && sent.key) return sent;
            } catch (e) { lastErr = e; }
        }
        throw lastErr || new Error('channel ne audio accept nahi kiya');
    }
    if (content.video) return conn.sendMessage(jid, await prepVideoForChannel(content));
    if (content.image) return conn.sendMessage(jid, await prepImageForChannel(content));
    if (content.document) {
        const mt = String(content.mimetype || '');
        if (/^audio\//i.test(mt) || /\.(mp3|m4a|wav|ogg|opus|aac|flac)$/i.test(content.fileName || '')) return sendOne(conn, jid, { audio: content.document, mimetype: mt || 'audio/mpeg', ptt: false }, mode);
        if (/^video\//i.test(mt)) return sendOne(conn, jid, { video: content.document, mimetype: mt, caption: content.caption || '' }, mode);
        if (/^image\//i.test(mt)) return sendOne(conn, jid, { image: content.document, mimetype: mt, caption: content.caption || '' }, mode);
        throw new Error('channel par document file nahi jati (sirf text / photo / video / audio)');
    }
    return conn.sendMessage(jid, content);
}

// Main: mek = .chforward wala message
async function run(conn, mek, ctx, argsRaw) {
    const here = ctx.from || mek.key.remoteJid;
    const ci = getContext(mek);
    if (!ci) return ctx.reply('❌ Jo post / gaana / voice forward karna hai, usay *REPLY* karke likho:\n*.chforward <group jid / group link / channel link / number>*\n\nJaise: *.chforward 1203630xxxxxxxx@g.us*\nYa: *.chforward here*\n\nOptional: *voice* (voice-note bana kar) ya *audio* (gaane ki tarah)');
    let raw = String(argsRaw || '').split(/[\s,]+/).filter(Boolean);
    let mode = null;
    raw = raw.filter(w => { const l = w.toLowerCase(); if (['voice', 'ptt', 'vn'].includes(l)) { mode = 'voice'; return false; } if (['audio', 'song', 'gana', 'music'].includes(l)) { mode = 'audio'; return false; } return true; });
    if (!raw.length) return ctx.reply('Use: *.chforward <group jid / invite link / channel link / number>*  (post ya gaane par reply karke)\nEk saath kai: *.chforward jid1 jid2 jid3*\nVoice banana ho: *.chforward <jid> voice*');

    const targets = [];
    for (const r of raw) { const j = await resolveTarget(conn, r, here); if (j) targets.push(j); else await ctx.reply(`⚠️ "${r}" samajh nahi aaya, chhod diya.`); }
    if (!targets.length) return ctx.reply('❌ Koi sahi target nahi mila.');

    let content;
    try { content = await buildContent(ci.quotedMessage); }
    catch (e) { return ctx.reply('❌ Media download nahi ho saki: ' + (e.message || e)); }
    if (!content) return ctx.reply('❌ Is message ki type forward nahi ho sakti (sirf text / audio / video / photo / sticker / document).');

    let ok = 0; const fails = [];
    for (const jid of targets) {
        try {
            const sent = await sendOne(conn, jid, content, mode);
            if (!sent || !sent.key) throw new Error('WhatsApp ne message accept nahi kiya');
            ok++;
        } catch (e) { fails.push(`${jid}: ${e.message || e}`); console.warn('[CHFORWARD]', jid, e && e.message); }
        if (targets.length > 1) await sleep(900);
    }
    if (ok && !fails.length) return ctx.reply(`✅ Forward ho gaya! (${ok}/${targets.length})\n📌 → ${targets.join(', ')}`);
    if (ok) return ctx.reply(`⚠️ ${ok}/${targets.length} par gaya.\n❌ Fail:\n${fails.join('\n')}`);
    return ctx.reply('❌ Forward nahi hua:\n' + fails.join('\n') + '\n\n💡 Bot us group/channel ka member hona chahiye (channel mein admin / owner).');
}

module.exports = { run, buildContent, resolveTarget, getContext, sendOne, prepOpus };
