// plugins/media-edit.js — Photo / Video / Audio edit + enhance commands (ffmpeg se)
// Use: kisi photo/video/audio par REPLY karke command likho (ya media ke caption mein likho).
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { cmd } = require('../ahmadcore');

const ffmpegBin = () => { try { return require('@ffmpeg-installer/ffmpeg').path || 'ffmpeg'; } catch (_) { return 'ffmpeg'; } };
function run(args, timeout = 240000) {
    return new Promise((resolve, reject) => {
        const p = spawn(ffmpegBin(), ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: ['ignore', 'ignore', 'pipe'] });
        let err = '';
        const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (_) {} reject(new Error('Edit bohat der laga (timeout)')); }, timeout);
        p.stderr.on('data', d => { err += d; if (err.length > 6000) err = err.slice(-3000); });
        p.on('error', e => { clearTimeout(t); reject(e); });
        p.on('close', c => { clearTimeout(t); c === 0 ? resolve() : reject(new Error(err.trim().split('\n').pop() || 'ffmpeg error')); });
    });
}

// reply kiya hua media ya current message ka media -> { buffer, kind }
async function getMedia(m, mek) {
    const tryMsg = async (msg) => {
        if (!msg) return null;
        let inner = msg;
        for (let i = 0; i < 4; i++) {
            const nx = (inner.viewOnceMessageV2 || inner.viewOnceMessage || inner.viewOnceMessageV2Extension || inner.ephemeralMessage || inner.documentWithCaptionMessage || {}).message;
            if (!nx) break; inner = nx;
        }
        const type = Object.keys(inner).find(k => /^(image|video|audio|sticker)Message$/.test(k));
        if (!type) return null;
        const kind = type.replace('Message', '');
        const stream = await downloadContentFromMessage(inner[type], kind);
        const chunks = []; for await (const c of stream) chunks.push(c);
        return { buffer: Buffer.concat(chunks), kind, media: inner[type] };
    };
    if (m.quoted && m.quoted.message) { const r = await tryMsg(m.quoted.message); if (r) return r; }
    return tryMsg(mek.message);
}

const num = (v, def, min, max) => { const n = parseFloat(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def; };
const E = 'scale=trunc(iw/2)*2:trunc(ih/2)*2';   // video ke liye even size

// ───── IMAGE filters: [pattern, alias[], vf, desc] ─────
const IMG = [
    ['enhance',   ['enhancer', 'betterphoto', 'fixphoto'], 'hqdn3d=1.5:1.5:6:6,unsharp=5:5:0.9:5:5:0.0,eq=contrast=1.08:saturation=1.18:brightness=0.02', 'Photo enhance (sharp + colour + noise kam)'],
    ['hd',        ['upscale', 'hdphoto', 'remini'], 'scale=iw*2:ih*2:flags=lanczos,unsharp=5:5:1.0:5:5:0.0,eq=contrast=1.06:saturation=1.12', 'Photo 2x bada + HD'],
    ['sharpen',   ['sharp'], 'unsharp=7:7:1.6:7:7:0.0', 'Photo sharp'],
    ['blurphoto',   ['softphoto', 'blurpic'], 'gblur=sigma=8', 'Photo blur'],
    ['brighten',  ['brightphoto', 'lighten'], 'eq=brightness=0.15:contrast=1.05', 'Photo bright'],
    ['darken',    ['darkphoto'], 'eq=brightness=-0.15', 'Photo dark'],
    ['contrast',  ['highcontrast'], 'eq=contrast=1.45', 'Contrast zyada'],
    ['saturate',  ['vivid', 'colorboost'], 'eq=saturation=1.9', 'Rang gehre'],
    ['desaturate',['muted'], 'eq=saturation=0.45', 'Rang halke'],
    ['grayscale', ['bw', 'blackwhite', 'greyphoto'], 'hue=s=0', 'Black & white'],
    ['sepia',     ['sepiaphoto'], 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131', 'Sepia'],
    ['vintage',   ['oldphoto', 'retro'], 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131,noise=alls=18:allf=t,vignette=PI/4', 'Vintage / purani photo'],
    ['negative',  ['invert', 'negativephoto'], 'negate', 'Negative colours'],
    ['mirrorphoto',    ['flipx', 'hflipphoto'], 'hflip', 'Mirror (left-right)'],
    ['flipy',     ['vflipphoto', 'upsidedown'], 'vflip', 'Ulta (upar-neeche)'],
    ['rotate90',  ['rotateright'], 'transpose=1', 'Photo 90° rotate'],
    ['rotate180', ['turn180'], 'hflip,vflip', 'Photo 180° rotate'],
    ['rotate270', ['rotateleft'], 'transpose=2', 'Photo 270° rotate'],
    ['pixelate',  ['pixel', 'mosaic'], 'scale=iw/24:ih/24:flags=neighbor,scale=iw*24:ih*24:flags=neighbor', 'Pixelate'],
    ['vignette',  ['vignetteimg', 'darkedges'], 'vignette=PI/3', 'Vignette (kinare dark)'],
    ['sketch',    ['pencil', 'drawing'], 'format=gray,negate,gblur=sigma=6,negate,eq=contrast=2.2', 'Pencil sketch jaisi'],
    ['edges',     ['outline', 'edgephoto'], 'edgedetect=low=0.1:high=0.3', 'Edges / outline'],
    ['emboss',    ['embossphoto'], 'convolution=-2 -1 0 -1 1 1 0 1 2:-2 -1 0 -1 1 1 0 1 2:-2 -1 0 -1 1 1 0 1 2:-2 -1 0 -1 1 1 0 1 2:1:0.5:1:0.5', 'Emboss'],
    ['warm',      ['warmfilter'], 'colorbalance=rs=.15:gs=.02:bs=-.15,eq=saturation=1.1', 'Warm tone'],
    ['cool',      ['coolfilter'], 'colorbalance=rs=-.12:bs=.18,eq=saturation=1.05', 'Cool tone'],
    ['noir',      ['dramatic', 'moody'], 'hue=s=0,eq=contrast=1.6:brightness=-0.05,vignette=PI/3.5', 'Noir (dramatic B&W)'],
    ['glow',      ['dreamy', 'softglow'], 'split[a][b];[b]gblur=sigma=14[bl];[a][bl]blend=all_mode=screen:all_opacity=0.45', 'Glow / dreamy'],
    ['posterize', ['popart', 'cartoonphoto'], 'eq=saturation=1.8:contrast=1.3,smartblur=1.5:-0.35:-3.5,elbg=codebook_length=12', 'Cartoon / poster style'],
    ['hdr',       ['hdreffect'], 'unsharp=9:9:1.2:9:9:0.0,eq=contrast=1.25:saturation=1.35,vignette=PI/6', 'HDR jaisa look'],
    ['denoise',   ['cleanphoto', 'smoothphoto'], 'hqdn3d=4:4:8:8', 'Noise saaf'],
    ['skinsmooth',['smoothskin', 'beautyphoto', 'beauty'], 'bilateral=sigmaS=6:sigmaR=0.12,eq=brightness=0.04:saturation=1.08', 'Skin smooth / beauty'],
    ['squareimg', ['square'], 'crop=min(iw\\,ih):min(iw\\,ih)', 'Photo square crop'],
    ['wideimg',   ['widescreen'], 'crop=iw:iw*9/16', 'Photo 16:9 crop'],
    ['resizesmall',['smallphoto', 'shrink'], 'scale=iw/2:ih/2', 'Photo chhoti (half size)'],
    ['bigimg',    ['enlarge', 'zoomphoto'], 'scale=iw*2:ih*2:flags=lanczos', 'Photo 2x bada'],
    ['fadecolor', ['matte', 'faded'], 'eq=contrast=0.85:brightness=0.06:saturation=0.8', 'Matte / faded look'],
    ['golden',    ['goldenhour', 'sunset'], 'colorbalance=rs=.25:gs=.08:bs=-.2:rm=.12,eq=saturation=1.25', 'Golden hour tone']
];

// ───── VIDEO filters ─────
const VID = [
    ['vgray',     ['videobw', 'vblackwhite'], 'hue=s=0', null, 'Video black & white'],
    ['vsepia',    ['videosepia'], 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131', null, 'Video sepia'],
    ['vnegative', ['videoinvert'], 'negate', null, 'Video negative'],
    ['vmirror',   ['videomirror', 'vflipx'], 'hflip', null, 'Video mirror'],
    ['vflip',     ['videoflip', 'vflipy'], 'vflip', null, 'Video ulti'],
    ['vrotate',   ['videorotate'], 'transpose=1', null, 'Video 90° rotate'],
    ['vblur',     ['videoblur'], 'gblur=sigma=8', null, 'Video blur'],
    ['vsharpen',  ['videosharp', 'vsharp'], 'unsharp=7:7:1.4:7:7:0.0', null, 'Video sharp'],
    ['vbright',   ['videobright'], 'eq=brightness=0.12:contrast=1.08', null, 'Video bright'],
    ['vvivid',    ['videovivid', 'vsaturate'], 'eq=saturation=1.7:contrast=1.12', null, 'Video rang gehre'],
    ['vvintage',  ['videovintage', 'voldschool'], 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131,noise=alls=16:allf=t,vignette=PI/4', null, 'Video vintage'],
    ['venhance',  ['videoenhance', 'vhd', 'vbetter'], 'hqdn3d=1.5:1.5:6:6,unsharp=5:5:0.9:5:5:0.0,eq=contrast=1.08:saturation=1.18', null, 'Video enhance (sharp + colour)'],
    ['vnoir',     ['videonoir'], 'hue=s=0,eq=contrast=1.5,vignette=PI/3.5', null, 'Video noir'],
    ['vglow',     ['videoglow'], 'split[a][b];[b]gblur=sigma=14[bl];[a][bl]blend=all_mode=screen:all_opacity=0.4', null, 'Video glow'],
    ['vpixel',    ['videopixel'], 'scale=iw/20:ih/20:flags=neighbor,scale=iw*20:ih*20:flags=neighbor', null, 'Video pixelate'],
    ['vwarm',     ['videowarm'], 'colorbalance=rs=.15:gs=.02:bs=-.15', null, 'Video warm'],
    ['vcool',     ['videocool'], 'colorbalance=rs=-.12:bs=.18', null, 'Video cool'],
    ['vsquare',   ['videosquare'], 'crop=min(iw\\,ih):min(iw\\,ih)', null, 'Video square crop'],
    ['vstory',    ['videostory', 'vportrait'], 'crop=ih*9/16:ih', null, 'Video 9:16 (status) crop'],
    ['vfast',     ['videofast', 'vspeedup'], 'setpts=0.5*PTS', 'atempo=2.0', 'Video 2x tez'],
    ['vslowmo',   ['videoslow', 'vslow'], 'setpts=2.0*PTS', 'atempo=0.5', 'Video 2x dheemi'],
    ['vreverse',  ['videoreverse', 'vrewind'], 'reverse', 'areverse', 'Video ulti chalao'],
    ['vboomerang',['boomerang'], 'split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0', null, 'Boomerang loop']
];

// ───── AUDIO filters ─────
const AUD = [
    ['bass',      ['bassboost', 'bassup'], 'bass=g=14,volume=1.2', 'Bass boost'],
    ['deep',      ['deepvoice', 'slowvoice'], 'asetrate=44100*0.78,aresample=44100,atempo=1.0', 'Gehri awaaz'],
    ['chipmunk',  ['fastvoice', 'squeak'], 'asetrate=44100*1.45,aresample=44100', 'Chipmunk awaaz'],
    ['nightcore', ['nightcorevoice'], 'asetrate=44100*1.25,aresample=44100,atempo=1.0', 'Nightcore'],
    ['slowaudio', ['slowed', 'slowreverb'], 'atempo=0.8,aecho=0.8:0.88:60:0.4', 'Slowed + reverb'],
    ['fastaudio', ['speedup', 'audiofast'], 'atempo=1.5', 'Audio tez'],
    ['reverseaudio', ['areverse', 'audioreverse'], 'areverse', 'Audio ulti'],
    ['echo',      ['echoaudio', 'echovoice'], 'aecho=0.8:0.9:500|1000:0.35|0.25', 'Echo'],
    ['robot',     ['robotvoice'], 'afftfilt=real=\'hypot(re,im)*sin(0)\':imag=\'hypot(re,im)*cos(0)\':win_size=512:overlap=0.75', 'Robot awaaz'],
    ['loudaudio', ['louder', 'volumeup'], 'volume=2.2,alimiter=limit=0.95', 'Awaaz tez (loud)'],
    ['quietaudio',['quieter', 'volumedown'], 'volume=0.4', 'Awaaz halki'],
    ['telephone', ['phonevoice'], 'highpass=f=400,lowpass=f=3200,volume=1.5', 'Telephone awaaz'],
    ['denoiseaudio', ['cleanvoice', 'noisefree'], 'highpass=f=80,afftdn=nf=-25', 'Audio noise saaf'],
    ['vibrato',   ['wobble'], 'vibrato=f=6:d=0.5', 'Vibrato / lahrati awaaz']
];

function guard(ctx) { return ctx.reply; }
async function work(conn, mek, m, ctx, kindWanted, fn) {
    const reply = ctx.reply;
    const media = await getMedia(m, mek).catch(() => null);
    if (!media || !kindWanted.includes(media.kind)) {
        return reply(`❌ Kisi *${kindWanted.map(k => ({ image: 'photo', video: 'video', audio: 'audio/voice', sticker: 'sticker' }[k] || k)).join(' / ')}* par reply karke command likho.`);
    }
    if (media.buffer.length > 60 * 1024 * 1024) return reply('❌ File bohat bari hai (60MB se kam bhejo).');
    const dir = path.join(os.tmpdir(), 'ahmad-edit-' + crypto.randomBytes(5).toString('hex'));
    fs.mkdirSync(dir, { recursive: true });
    try {
        conn.sendMessage(ctx.from, { react: { text: '⏳', key: mek.key } }).catch(() => {});
        const input = path.join(dir, 'in.' + (media.kind === 'image' ? 'jpg' : media.kind === 'sticker' ? 'webp' : media.kind === 'audio' ? 'ogg' : 'mp4'));
        fs.writeFileSync(input, media.buffer);
        await fn({ input, dir, media });
        conn.sendMessage(ctx.from, { react: { text: '✅', key: mek.key } }).catch(() => {});
    } catch (e) {
        console.error('[MEDIA-EDIT]', e.message);
        conn.sendMessage(ctx.from, { react: { text: '❌', key: mek.key } }).catch(() => {});
        reply('❌ Edit nahi ho saka: ' + e.message);
    } finally { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {} }
}

const CAP = '✨ 𝐄𝐃𝐈𝐓𝐄𝐃 𝐁𝐲 𝐀𝐡𝐦𝐚𝐝𝐒𝐡𝐚𝐡𝐳𝐚𝐝-𝐌𝐃';

for (const [pattern, alias, vf, desc] of IMG) {
    cmd({ pattern, alias, desc, category: 'photoedit', react: '🖼️', use: `.${pattern} (photo par reply)`, filename: __filename },
        async (conn, mek, m, ctx) => work(conn, mek, m, ctx, ['image', 'sticker'], async ({ input, dir }) => {
            const out = path.join(dir, 'out.jpg');
            await run(['-i', input, '-vf', `${vf},format=yuvj420p`, '-frames:v', '1', '-q:v', '2', out]);
            await conn.sendMessage(ctx.from, { image: fs.readFileSync(out), caption: `🖼️ *${desc}*\n${CAP}` }, { quoted: mek });
        }));
}

for (const [pattern, alias, vf, af, desc] of VID) {
    cmd({ pattern, alias, desc, category: 'videoedit', react: '🎞️', use: `.${pattern} (video par reply)`, filename: __filename },
        async (conn, mek, m, ctx) => work(conn, mek, m, ctx, ['video'], async ({ input, dir }) => {
            const out = path.join(dir, 'out.mp4');
            const complex = /\[|;/.test(vf);
            const args = ['-i', input];
            const silent = /reverse/.test(vf) && !af;     // ulti video mein awaaz nahi
            if (complex) args.push('-filter_complex', `[0:v]${vf},${E}[v]`, '-map', '[v]', ...(silent ? [] : ['-map', '0:a?']));
            else args.push('-vf', `${vf},${E}`);
            if (af) args.push('-af', af); else if (silent || /setpts/.test(vf)) args.push('-an');
            args.push('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', out);
            await run(args);
            await conn.sendMessage(ctx.from, { video: fs.readFileSync(out), mimetype: 'video/mp4', caption: `🎞️ *${desc}*\n${CAP}` }, { quoted: mek });
        }));
}

for (const [pattern, alias, af, desc] of AUD) {
    cmd({ pattern, alias, desc, category: 'audioedit', react: '🎧', use: `.${pattern} (audio/voice par reply)`, filename: __filename },
        async (conn, mek, m, ctx) => work(conn, mek, m, ctx, ['audio', 'video'], async ({ input, dir }) => {
            const out = path.join(dir, 'out.mp3');
            await run(['-i', input, '-vn', '-af', af, '-c:a', 'libmp3lame', '-q:a', '3', out]);
            await conn.sendMessage(ctx.from, { audio: fs.readFileSync(out), mimetype: 'audio/mpeg', ptt: false }, { quoted: mek });
        }));
}

// ───── Khaas video / audio tools (argument wale) ─────
cmd({ pattern: 'vtrim', alias: ['videotrim', 'vcut', 'trimvideo'], desc: 'Video kaato: .vtrim 5 20 (5s se 20s)', category: 'videoedit', react: '✂️', use: '.vtrim <start> <end>', filename: __filename },
    async (conn, mek, m, ctx) => {
        const a = (ctx.args || []).map(Number).filter(Number.isFinite);
        if (a.length < 2 || a[1] <= a[0]) return ctx.reply('✂️ Video par reply karke likho: `.vtrim 5 20` (5 second se 20 second tak)');
        return work(conn, mek, m, ctx, ['video'], async ({ input, dir }) => {
            const out = path.join(dir, 'out.mp4');
            await run(['-ss', String(a[0]), '-to', String(a[1]), '-i', input, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', out]);
            await conn.sendMessage(ctx.from, { video: fs.readFileSync(out), mimetype: 'video/mp4', caption: `✂️ *Trim ${a[0]}s → ${a[1]}s*\n${CAP}` }, { quoted: mek });
        });
    });
cmd({ pattern: 'vspeed', alias: ['videospeed', 'speedvideo'], desc: 'Video speed: .vspeed 1.5 (0.5 se 4 tak)', category: 'videoedit', react: '⚡', use: '.vspeed <0.5-4>', filename: __filename },
    async (conn, mek, m, ctx) => {
        const x = num((ctx.args || [])[0], 1.5, 0.5, 4);
        return work(conn, mek, m, ctx, ['video'], async ({ input, dir }) => {
            const out = path.join(dir, 'out.mp4');
            const at = x > 2 ? `atempo=2.0,atempo=${(x / 2).toFixed(3)}` : (x < 0.5 ? 'atempo=0.5' : `atempo=${x}`);
            await run(['-i', input, '-vf', `setpts=${(1 / x).toFixed(4)}*PTS,${E}`, '-af', at, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', out]);
            await conn.sendMessage(ctx.from, { video: fs.readFileSync(out), mimetype: 'video/mp4', caption: `⚡ *Speed ${x}x*\n${CAP}` }, { quoted: mek });
        });
    });
cmd({ pattern: 'vmute', alias: ['videomute', 'removeaudio', 'noaudio'], desc: 'Video se awaaz hatao', category: 'videoedit', react: '🔇', use: '.vmute (video par reply)', filename: __filename },
    async (conn, mek, m, ctx) => work(conn, mek, m, ctx, ['video'], async ({ input, dir }) => {
        const out = path.join(dir, 'out.mp4');
        await run(['-i', input, '-an', '-c:v', 'copy', out]);
        await conn.sendMessage(ctx.from, { video: fs.readFileSync(out), mimetype: 'video/mp4', caption: `🔇 *Mute video*\n${CAP}` }, { quoted: mek });
    }));
cmd({ pattern: 'vtomp3', alias: ['videotoaudio', 'tomp3', 'extractaudio', 'vtoaudio'], desc: 'Video se MP3 nikalo', category: 'videoedit', react: '🎵', use: '.vtomp3 (video par reply)', filename: __filename },
    async (conn, mek, m, ctx) => work(conn, mek, m, ctx, ['video', 'audio'], async ({ input, dir }) => {
        const out = path.join(dir, 'out.mp3');
        await run(['-i', input, '-vn', '-c:a', 'libmp3lame', '-q:a', '2', out]);
        await conn.sendMessage(ctx.from, { audio: fs.readFileSync(out), mimetype: 'audio/mpeg' }, { quoted: mek });
    }));
cmd({ pattern: 'vtogif', alias: ['videotogif', 'togifvideo', 'gifvideo'], desc: 'Video ko GIF (loop) bana do', category: 'videoedit', react: '🎬', use: '.vtogif (video par reply)', filename: __filename },
    async (conn, mek, m, ctx) => work(conn, mek, m, ctx, ['video'], async ({ input, dir }) => {
        const out = path.join(dir, 'out.mp4');
        await run(['-i', input, '-t', '10', '-an', '-vf', `${E}`, '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
        await conn.sendMessage(ctx.from, { video: fs.readFileSync(out), mimetype: 'video/mp4', gifPlayback: true, caption: `🎬 *GIF*\n${CAP}` }, { quoted: mek });
    }));
cmd({ pattern: 'vcompress', alias: ['videocompress', 'compressvideo', 'smallvideo'], desc: 'Video ka size chhota karo', category: 'videoedit', react: '🗜️', use: '.vcompress (video par reply)', filename: __filename },
    async (conn, mek, m, ctx) => work(conn, mek, m, ctx, ['video'], async ({ input, dir }) => {
        const out = path.join(dir, 'out.mp4');
        await run(['-i', input, '-vf', `scale='min(640,iw)':-2`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '32', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart', out]);
        const b = fs.readFileSync(out);
        await conn.sendMessage(ctx.from, { video: b, mimetype: 'video/mp4', caption: `🗜️ *Compressed* (${(b.length / 1048576).toFixed(1)} MB)\n${CAP}` }, { quoted: mek });
    }));
cmd({ pattern: 'vloop', alias: ['videoloop', 'loopvideo', 'repeatvideo'], desc: 'Video 3 baar repeat: .vloop 3', category: 'videoedit', react: '🔁', use: '.vloop <2-5>', filename: __filename },
    async (conn, mek, m, ctx) => {
        const n = Math.round(num((ctx.args || [])[0], 3, 2, 5));
        return work(conn, mek, m, ctx, ['video'], async ({ input, dir }) => {
            const out = path.join(dir, 'out.mp4');
            await run(['-stream_loop', String(n - 1), '-i', input, '-t', '120', '-vf', E, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '27', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', out]);
            await conn.sendMessage(ctx.from, { video: fs.readFileSync(out), mimetype: 'video/mp4', caption: `🔁 *Loop x${n}*\n${CAP}` }, { quoted: mek });
        });
    });
cmd({ pattern: 'vthumb', alias: ['videoframe', 'screenshotvideo', 'framegrab'], desc: 'Video ka ek frame (photo): .vthumb 3', category: 'videoedit', react: '📸', use: '.vthumb <second>', filename: __filename },
    async (conn, mek, m, ctx) => {
        const t = num((ctx.args || [])[0], 1, 0, 600);
        return work(conn, mek, m, ctx, ['video'], async ({ input, dir }) => {
            const out = path.join(dir, 'out.jpg');
            await run(['-ss', String(t), '-i', input, '-frames:v', '1', '-q:v', '2', out]);
            await conn.sendMessage(ctx.from, { image: fs.readFileSync(out), caption: `📸 *Frame @ ${t}s*\n${CAP}` }, { quoted: mek });
        });
    });
cmd({ pattern: 'vaddmusic', alias: ['videomusic', 'addmusic', 'musicvideo'], desc: 'Video mein bg music: .vaddmusic 2', category: 'videoedit', react: '🎶', use: '.vaddmusic [1-5]', filename: __filename },
    async (conn, mek, m, ctx) => {
        const bgm = require('../lib/bgmusic');
        const files = bgm.userMusicFiles();
        if (!files.length) return ctx.reply('❌ data/bgmusic/ mein koi music nahi.');
        const n = Math.round(num((ctx.args || [])[0], 0, 0, files.length)) || (1 + Math.floor(Math.random() * files.length));
        return work(conn, mek, m, ctx, ['video'], async ({ input, dir }) => {
            const out = path.join(dir, 'out.mp4');
            await run(['-i', input, '-stream_loop', '-1', '-i', files[n - 1],
                '-filter_complex', `[1:a]volume=0.25[m];[0:a]volume=1.2[v];[v][m]amix=inputs=2:duration=first:normalize=0[o]`.replace('[0:a]', '[0:a]'),
                '-map', '0:v', '-map', '[o]', '-c:v', 'copy', '-c:a', 'aac', '-shortest', '-movflags', '+faststart', out]).catch(async () => {
                // video mein awaaz na ho to sirf music
                await run(['-i', input, '-stream_loop', '-1', '-i', files[n - 1], '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-shortest', '-movflags', '+faststart', out]);
            });
            await conn.sendMessage(ctx.from, { video: fs.readFileSync(out), mimetype: 'video/mp4', caption: `🎶 *Music ${n} laga di*\n${CAP}` }, { quoted: mek });
        });
    });
cmd({ pattern: 'trimaudio', alias: ['atrim', 'cutaudio'], desc: 'Audio kaato: .trimaudio 10 40', category: 'audioedit', react: '✂️', use: '.trimaudio <start> <end>', filename: __filename },
    async (conn, mek, m, ctx) => {
        const a = (ctx.args || []).map(Number).filter(Number.isFinite);
        if (a.length < 2 || a[1] <= a[0]) return ctx.reply('✂️ Audio par reply karke likho: `.trimaudio 10 40`');
        return work(conn, mek, m, ctx, ['audio', 'video'], async ({ input, dir }) => {
            const out = path.join(dir, 'out.mp3');
            await run(['-ss', String(a[0]), '-to', String(a[1]), '-i', input, '-vn', '-c:a', 'libmp3lame', '-q:a', '3', out]);
            await conn.sendMessage(ctx.from, { audio: fs.readFileSync(out), mimetype: 'audio/mpeg' }, { quoted: mek });
        });
    });
cmd({ pattern: 'rotateimg', alias: ['rotatephoto', 'turnphoto'], desc: 'Photo rotate: .rotateimg 90/180/270', category: 'photoedit', react: '🔄', use: '.rotateimg <90|180|270>', filename: __filename },
    async (conn, mek, m, ctx) => {
        const d = String((ctx.args || [])[0] || '90');
        const vf = { '90': 'transpose=1', '180': 'hflip,vflip', '270': 'transpose=2' }[d];
        if (!vf) return ctx.reply('🔄 `.rotateimg 90` / `180` / `270`');
        return work(conn, mek, m, ctx, ['image', 'sticker'], async ({ input, dir }) => {
            const out = path.join(dir, 'out.jpg');
            await run(['-i', input, '-vf', `${vf},format=yuvj420p`, '-frames:v', '1', '-q:v', '2', out]);
            await conn.sendMessage(ctx.from, { image: fs.readFileSync(out), caption: `🔄 *Rotate ${d}°*\n${CAP}` }, { quoted: mek });
        });
    });
cmd({ pattern: 'brightness', alias: ['bright', 'setbright'], desc: 'Photo brightness: .brightness 30 (-100..100)', category: 'photoedit', react: '☀️', use: '.brightness <-100..100>', filename: __filename },
    async (conn, mek, m, ctx) => {
        const v = num((ctx.args || [])[0], 20, -100, 100) / 100 * 0.5;
        return work(conn, mek, m, ctx, ['image', 'sticker'], async ({ input, dir }) => {
            const out = path.join(dir, 'out.jpg');
            await run(['-i', input, '-vf', `eq=brightness=${v.toFixed(3)},format=yuvj420p`, '-frames:v', '1', '-q:v', '2', out]);
            await conn.sendMessage(ctx.from, { image: fs.readFileSync(out), caption: `☀️ *Brightness*\n${CAP}` }, { quoted: mek });
        });
    });
cmd({ pattern: 'imgtosticker', alias: ['s2', 'stickerfromimg', 'makesticker'], desc: 'Photo/video ko sticker', category: 'photoedit', react: '🧩', use: '.imgtosticker (photo/video par reply)', filename: __filename },
    async (conn, mek, m, ctx) => work(conn, mek, m, ctx, ['image', 'video'], async ({ input, dir, media }) => {
        const out = path.join(dir, 'out.webp');
        const isVid = media.kind === 'video';
        await run(['-i', input, ...(isVid ? ['-t', '6'] : []), '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:-1:-1:color=0x00000000,format=rgba', ...(isVid ? ['-loop', '0', '-an', '-fps_mode', 'vfr'] : ['-frames:v', '1']), '-c:v', 'libwebp', '-quality', '60', out]);
        await conn.sendMessage(ctx.from, { sticker: fs.readFileSync(out) }, { quoted: mek });
    }));
cmd({ pattern: 'stickertoimg', alias: ['toimg', 'unsticker', 'stickertophoto'], desc: 'Sticker ko photo banao', category: 'photoedit', react: '🖼️', use: '.stickertoimg (sticker par reply)', filename: __filename },
    async (conn, mek, m, ctx) => work(conn, mek, m, ctx, ['sticker', 'image'], async ({ input, dir }) => {
        const out = path.join(dir, 'out.png');
        await run(['-i', input, '-frames:v', '1', out]);
        await conn.sendMessage(ctx.from, { image: fs.readFileSync(out), caption: `🖼️ ${CAP}` }, { quoted: mek });
    }));
