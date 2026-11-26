// plugins/audio-me-pack.js (v11) — AUDIO section: "voice note from MY profile" commands
//
// Problem: jab koi user gaana (audio file) bhejta hai to WhatsApp mein card par NARANGI (orange) icon aata hai.
// Fix:  us audio par reply karke  .me  likho -> bot usi gaane ko VOICE NOTE bana kar hamari taraf se bhejta hai,
//       to orange icon ki jagah HAMARI PROFILE PHOTO dikhti hai.
//
//  .me  (+ .mebass .meecho .medeep .menight .mereverse .mereverb)  -> voice note (effect ke sath / bina)
//  .normalizeaudio  .fadeaudio  .loopaudio <n>                      -> audio tools (voice note ke taur par)
//  .unptt                                                            -> voice note ko normal MP3 file bana do
//  .audioinfo                                                        -> audio ki lambai / size / format
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { cmd } = require('../arslan');
const ffq = require('../lib/ffq');

const CAP = '🎧 𝐀𝐡𝐦𝐚𝐝𝐒𝐡𝐚𝐡𝐳𝐚𝐝-𝐌𝐃';
const MAX_BYTES = 40 * 1024 * 1024;

// reply kiya hua (ya khud ka) audio / video / audio-document -> { buffer, kind }
async function getAudioSource(m, mek) {
    const tryMsg = async (msg) => {
        if (!msg) return null;
        let inner = msg;
        for (let i = 0; i < 4; i++) {
            const nx = (inner.viewOnceMessageV2 || inner.viewOnceMessage || inner.viewOnceMessageV2Extension || inner.ephemeralMessage || inner.documentWithCaptionMessage || {}).message;
            if (!nx) break; inner = nx;
        }
        let type = null;
        if (inner.audioMessage) type = 'audioMessage';
        else if (inner.videoMessage) type = 'videoMessage';
        else if (inner.documentMessage && /audio|video|ogg|mpeg|mp3|m4a|wav|opus/i.test(inner.documentMessage.mimetype || inner.documentMessage.fileName || '')) type = 'documentMessage';
        if (!type) return null;
        const node = inner[type];
        if (Number(node.fileLength || 0) > MAX_BYTES) throw new Error('File bohat badi hai (40MB se kam do)');
        const stream = await downloadContentFromMessage(node, type.replace('Message', ''));
        const chunks = []; for await (const c of stream) chunks.push(c);
        return { buffer: Buffer.concat(chunks), kind: type.replace('Message', ''), node };
    };
    if (m && m.quoted && m.quoted.message) { const r = await tryMsg(m.quoted.message); if (r) return r; }
    const ctxQ = mek.message && (mek.message.extendedTextMessage || {}).contextInfo;
    if (ctxQ && ctxQ.quotedMessage) { const r = await tryMsg(ctxQ.quotedMessage); if (r) return r; }
    return tryMsg(mek.message);
}

async function withAudio(conn, mek, m, ctx, label, job) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ame_'));
    try {
        const src = await getAudioSource(m, mek);
        if (!src) return ctx.reply(`🎧 Kisi *audio / gaane / voice* par reply karke \`.${ctx.command || label}\` likho.`);
        const input = path.join(dir, 'in.' + crypto.randomBytes(3).toString('hex'));
        fs.writeFileSync(input, src.buffer);
        await job({ input, dir, src });
    } catch (e) {
        ctx.reply('❌ ' + (e && e.message ? e.message : e));
    } finally { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {} }
}

// opus voice note (PTT) — isi se profile photo dikhti hai
async function toVoiceNote(input, dir, af) {
    const out = path.join(dir, 'out.ogg');
    const args = ['-y', '-i', input, '-vn'];
    if (af) args.push('-af', af);
    args.push('-ac', '1', '-ar', '48000', '-c:a', 'libopus', '-b:a', '48k', '-application', 'voip', '-f', 'ogg', out);
    await ffq.run(ffq.ffmpegBin(), args, 180000);
    return fs.readFileSync(out);
}
const sendPtt = (conn, ctx, mek, buf) =>
    conn.sendMessage(ctx.from, { audio: buf, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: mek });

// [pattern, alias[], ffmpeg -af, desc]
const ME = [
    ['me',        ['tovoice', 'ptt', 'myvoice', 'asvoice'], null, 'Gaana/audio ko VOICE NOTE bana kar hamari profile se bhejo (orange icon ki jagah DP)'],
    ['mebass',    ['voicebass'], 'bass=g=14,volume=1.4', 'Bass boost voice note (hamari profile se)'],
    ['meecho',    ['voiceecho'], 'aecho=0.8:0.88:60:0.4', 'Echo wala voice note (hamari profile se)'],
    ['medeep',    ['voicedeep'], 'aresample=48000,asetrate=48000*0.8,aresample=48000,atempo=1.25', 'Bhari/deep awaaz voice note'],
    ['menight',   ['voicenight'], 'aresample=48000,asetrate=48000*1.25,aresample=48000', 'Nightcore (tez + unchi) voice note'],
    ['mereverse', ['voicereverse'], 'areverse', 'Ulta chalne wala voice note'],
    ['mereverb',  ['voicereverb'], 'aecho=0.8:0.9:1000|1800:0.3|0.25', 'Reverb (hall jaisi gunj) voice note']
];
for (const [pattern, alias, af, desc] of ME) {
    cmd({ pattern, alias, desc, category: 'audioedit', react: '🎙️', use: `.${pattern} (audio / gaane par reply)`, filename: __filename },
        async (conn, mek, m, ctx) => withAudio(conn, mek, m, ctx, pattern, async ({ input, dir }) => {
            await sendPtt(conn, ctx, mek, await toVoiceNote(input, dir, af));
        }));
}

cmd({ pattern: 'normalizeaudio', alias: ['normalize', 'evenvolume'], desc: 'Awaaz barabar karo (kabhi dhimi kabhi tez nahi) — voice note', category: 'audioedit', react: '📊', use: '.normalizeaudio (audio par reply)', filename: __filename },
    async (conn, mek, m, ctx) => withAudio(conn, mek, m, ctx, 'normalizeaudio', async ({ input, dir }) => {
        await sendPtt(conn, ctx, mek, await toVoiceNote(input, dir, 'loudnorm=I=-16:TP=-1.5:LRA=11'));
    }));

cmd({ pattern: 'fadeaudio', alias: ['fade', 'fadeinout'], desc: 'Shuru mein halki, aakhir mein halki awaaz (fade) — voice note', category: 'audioedit', react: '🌅', use: '.fadeaudio [seconds=3]', filename: __filename },
    async (conn, mek, m, ctx) => withAudio(conn, mek, m, ctx, 'fadeaudio', async ({ input, dir }) => {
        const s = Math.min(15, Math.max(1, parseFloat((ctx.args || [])[0]) || 3));
        const dur = await ffq.duration(input);
        const af = dur > s * 2 + 1 ? `afade=t=in:d=${s},afade=t=out:st=${(dur - s).toFixed(2)}:d=${s}` : `afade=t=in:d=${Math.min(s, Math.max(0.5, dur / 3)).toFixed(2)}`;
        await sendPtt(conn, ctx, mek, await toVoiceNote(input, dir, af));
    }));

cmd({ pattern: 'loopaudio', alias: ['repeataudio', 'audioloop'], desc: 'Audio ko 2-5 baar repeat karo: .loopaudio 3', category: 'audioedit', react: '🔁', use: '.loopaudio <2-5>', filename: __filename },
    async (conn, mek, m, ctx) => withAudio(conn, mek, m, ctx, 'loopaudio', async ({ input, dir }) => {
        const n = Math.min(5, Math.max(2, parseInt((ctx.args || [])[0], 10) || 2));
        const dur = await ffq.duration(input);
        if (dur && dur * n > 600) throw new Error('Loop ke baad 10 minute se lambi ho jayegi — chhota audio ya kam baar do');
        const looped = path.join(dir, 'loop.wav');
        await ffq.run(ffq.ffmpegBin(), ['-y', '-stream_loop', String(n - 1), '-i', input, '-vn', looped], 180000);
        await sendPtt(conn, ctx, mek, await toVoiceNote(looped, dir, null));
    }));

cmd({ pattern: 'unptt', alias: ['tomusic', 'toaudiofile', 'vntomp3'], desc: 'Voice note ko normal MP3 audio file bana do', category: 'audioedit', react: '🎵', use: '.unptt (voice par reply)', filename: __filename },
    async (conn, mek, m, ctx) => withAudio(conn, mek, m, ctx, 'unptt', async ({ input, dir }) => {
        const out = path.join(dir, 'out.mp3');
        await ffq.run(ffq.ffmpegBin(), ['-y', '-i', input, '-vn', '-c:a', 'libmp3lame', '-q:a', '3', out], 180000);
        await conn.sendMessage(ctx.from, { audio: fs.readFileSync(out), mimetype: 'audio/mpeg', ptt: false }, { quoted: mek });
    }));

cmd({ pattern: 'audioinfo', alias: ['audiodetails', 'voiceinfo'], desc: 'Audio ki lambai, size aur format dekho', category: 'audioedit', react: 'ℹ️', use: '.audioinfo (audio par reply)', filename: __filename },
    async (conn, mek, m, ctx) => withAudio(conn, mek, m, ctx, 'audioinfo', async ({ input, src }) => {
        const dur = await ffq.duration(input);
        const mm = Math.floor(dur / 60), ss = Math.round(dur % 60);
        const kb = (src.buffer.length / 1024);
        const size = kb > 1024 ? (kb / 1024).toFixed(2) + ' MB' : kb.toFixed(0) + ' KB';
        await ctx.reply(`🎧 *AUDIO INFO*\n⏱️ Lambai : ${mm}m ${ss}s\n📦 Size   : ${size}\n🧩 Type   : ${src.node.mimetype || src.kind}\n${src.node.ptt ? '🎙️ Ye voice note hai' : '🎵 Ye audio file hai (card par orange icon aata hai) — `.me` se voice note banao'}\n\n${CAP}`);
    }));
