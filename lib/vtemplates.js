// lib/vtemplates.js — CapCut jaisa video-template engine.
// Video par reply karo -> 9:16 (reels) video wapas: blur-background fit, color grade, effects
// (beat-zoom, shake, glitch, flash, glow, grain, vignette, cinematic bars), fade in/out,
// animated caption AUR har template mein background music (gaana). Pura local ffmpeg, koi API nahi.
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');

const W = 720, H = 1280, MAX_SECONDS = 45;

function ffmpegBin() {
    try { const r = spawnSync('ffmpeg', ['-version'], { timeout: 8000 }); if (r.status === 0) return 'ffmpeg'; } catch (_) {}
    try { return require('@ffmpeg-installer/ffmpeg').path || 'ffmpeg'; } catch (_) { return 'ffmpeg'; }
}
function run(bin, args, timeout = 240000) {
    return new Promise((resolve, reject) => {
        const p = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
        let err = '';
        const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (_) {} reject(new Error('ffmpeg timeout')); }, timeout);
        p.stderr.on('data', d => { err += d; if (err.length > 8000) err = err.slice(-4000); });
        p.on('error', e => { clearTimeout(t); reject(e); });
        p.on('close', c => { clearTimeout(t); c === 0 ? resolve() : reject(new Error('ffmpeg: ' + err.trim().split('\n').slice(-2).join(' | '))); });
    });
}
const FONT = (() => {
    const c = ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf', '/System/Library/Fonts/Supplemental/Arial Bold.ttf'];
    return c.find(f => fs.existsSync(f)) || null;
})();

// ───────────── templates ─────────────
// grade: eq (brightness:contrast:saturation) | tint: colorbalance | fx: effects list
// fx: zoom, shake, glitch, flash, glow, grain, vignette, bars, softblur
const TEMPLATES = {
    viral:        { label: '🔥 Viral',        cap: 'VIRAL',            eq: '0.03:1.25:1.5',  fx: ['zoom', 'flash', 'grain'],        track: 5, vol: 0.30, speed: 1.0 },
    funny:        { label: '😂 Funny',        cap: 'HAHA',             eq: '0.05:1.2:1.6',   fx: ['zoom', 'shake'],                 track: 5, vol: 0.28, speed: 1.05 },
    sad:          { label: '💔 Sad',          cap: 'Dard...',          eq: '-0.05:1.0:0.5',  fx: ['vignette', 'grain', 'softblur'], track: 2, vol: 0.32, speed: 0.95, tint: 'bs=0.08:rs=-0.06' },
    poetry:       { label: '📜 Poetry',       cap: 'Shayari',          eq: '0.0:1.05:0.75',  fx: ['vignette', 'glow'],              track: 4, vol: 0.30, speed: 0.97, tint: 'rs=0.06:bs=-0.04' },
    romantic:     { label: '❤️ Romantic',     cap: 'Love',             eq: '0.03:1.1:1.25',  fx: ['glow', 'vignette'],              track: 1, vol: 0.30, speed: 1.0,  tint: 'rs=0.09:bs=0.03' },
    motivational: { label: '💪 Motivational', cap: 'NEVER GIVE UP',    eq: '0.04:1.3:1.3',   fx: ['zoom', 'vignette', 'grain'],     track: 5, vol: 0.30, speed: 1.0 },
    cinematic:    { label: '🎬 Cinematic',    cap: '',                 eq: '-0.02:1.2:0.9',  fx: ['bars', 'vignette', 'grain'],     track: 2, vol: 0.26, speed: 0.98, tint: 'rs=0.05:bs=-0.07' },
    energetic:    { label: '⚡ Energetic',    cap: 'ENERGY',           eq: '0.05:1.3:1.6',   fx: ['zoom', 'flash', 'shake'],        track: 5, vol: 0.32, speed: 1.08 },
    vintage:      { label: '📻 Vintage',      cap: 'Vintage',          eq: '0.02:1.0:0.45',  fx: ['grain', 'vignette'],             track: 3, vol: 0.28, speed: 1.0,  tint: 'rs=0.10:gs=0.03:bs=-0.12' },
    aesthetic:    { label: '🌙 Aesthetic',    cap: 'aesthetic',        eq: '0.0:1.15:0.3',   fx: ['glow', 'vignette', 'grain'],     track: 2, vol: 0.26, speed: 1.0 },
    love:         { label: '💕 Love',         cap: 'Love You',         eq: '0.04:1.1:1.25',  fx: ['glow', 'zoom'],                  track: 1, vol: 0.30, speed: 1.0,  tint: 'rs=0.08:bs=0.04' },
    night:        { label: '🌃 Night',        cap: 'Night Vibes',      eq: '-0.03:1.1:0.8',  fx: ['vignette', 'glow'],              track: 2, vol: 0.26, speed: 1.0,  tint: 'bs=0.10:rs=-0.05' },
    sports:       { label: '🏆 Sports',       cap: 'GAME ON',          eq: '0.05:1.35:1.4',  fx: ['zoom', 'flash', 'bars'],         track: 5, vol: 0.32, speed: 1.05 },
    travel:       { label: '✈️ Travel',       cap: 'Travel Diaries',   eq: '0.04:1.2:1.45',  fx: ['zoom', 'glow'],                  track: 5, vol: 0.28, speed: 1.0,  tint: 'rs=0.05:bs=-0.04' },
    dua:          { label: '🤲 Dua',          cap: 'Dua',              eq: '0.0:1.05:0.7',   fx: ['glow', 'vignette'],              track: 4, vol: 0.30, speed: 0.95 },
    glitch:       { label: '👾 Glitch',       cap: 'GLITCH',           eq: '0.0:1.3:1.3',    fx: ['glitch', 'shake', 'grain'],      track: 5, vol: 0.32, speed: 1.0 },
    beatzoom:     { label: '🥁 Beat Zoom',    cap: '',                 eq: '0.03:1.25:1.4',  fx: ['zoom', 'flash'],                 track: 5, vol: 0.34, speed: 1.0 },
    slowmo:       { label: '🐢 Slow-Mo',      cap: 'SLOW MOTION',      eq: '0.0:1.15:1.1',   fx: ['bars', 'glow', 'vignette'],      track: 2, vol: 0.30, speed: 0.6 },
    neon:         { label: '💜 Neon',         cap: 'NEON',             eq: '0.0:1.35:1.9',   fx: ['glow', 'glitch', 'vignette'],    track: 5, vol: 0.30, speed: 1.0,  tint: 'rs=0.12:bs=0.14:gs=-0.08' },
    dream:        { label: '☁️ Dream',        cap: 'Dreamy',           eq: '0.06:0.95:1.2',  fx: ['glow', 'softblur', 'vignette'],  track: 1, vol: 0.30, speed: 0.97, tint: 'rs=0.06:bs=0.06' }
};
const TEMPLATE_NAMES = Object.keys(TEMPLATES);

// ───────────── music ─────────────
const MUSIC_DIR = path.join(process.env.DATA_DIR || path.join(__dirname, '..', 'data'), 'bgmusic');
function musicFiles() {
    try { return fs.readdirSync(MUSIC_DIR).filter(f => /\.(mp3|m4a|ogg|opus|wav|aac)$/i.test(f)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map(f => path.join(MUSIC_DIR, f)); }
    catch (_) { return []; }
}
function pickMusic(n) {
    const files = musicFiles();
    if (!files.length) return null;
    const i = Math.max(1, Number(n) || 1);
    return files[(i - 1) % files.length];
}

// ───────────── probe ─────────────
function probe(file) {
    const r = spawnSync(ffmpegBin(), ['-hide_banner', '-i', file], { encoding: 'utf8', timeout: 20000 });
    const txt = String((r.stderr || '') + (r.stdout || ''));
    const m = txt.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
    const dur = m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0;
    return { duration: dur, hasAudio: /Stream #\d+:\d+.*Audio:/.test(txt), hasVideo: /Stream #\d+:\d+.*Video:/.test(txt) };
}

// ───────────── video filter chain ─────────────
function buildVideoFilter(t, o) {
    const { outDur } = o;
    // 1) 9:16 canvas: asli video beech mein, peeche usi ka blur (CapCut/Reels style)
    const chain = [`fps=30,split[a][b]`];
    chain.push(`[a]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},gblur=sigma=38,eq=brightness=-0.12:saturation=1.2[bg]`);
    chain.push(`[b]scale=${W}:${H}:force_original_aspect_ratio=decrease[fg]`);
    chain.push(`[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1`);
    let vf = chain.join(';');
    const steps = [];
    if (t.speed && t.speed !== 1) steps.push(`setpts=${(1 / t.speed).toFixed(4)}*PTS`);

    const fx = new Set(o.simple ? [] : t.fx);
    // 2) motion effects
    if (fx.has('zoom')) steps.push(`scale=w='${W}*(1+0.06*abs(sin(2.6*t)))':h='${H}*(1+0.06*abs(sin(2.6*t)))':eval=frame:flags=bilinear,crop=${W}:${H}`);
    if (fx.has('shake')) steps.push(`scale=${W + 40}:${H + 72},crop=${W}:${H}:x='20+14*sin(t*27)':y='36+16*cos(t*23)'`);
    // 3) look
    const [br, ct, sa] = String(t.eq).split(':');
    steps.push(`eq=brightness=${br}:contrast=${ct}:saturation=${sa}`);
    if (t.tint) steps.push(`colorbalance=${t.tint}`);
    if (fx.has('softblur')) steps.push(`gblur=sigma=1.2`);
    if (fx.has('glow')) steps.push(`split[gx][gy];[gy]gblur=sigma=16[gg];[gx][gg]blend=all_mode=screen:all_opacity=0.32`);
    if (fx.has('glitch')) steps.push(`rgbashift=rh=-9:bh=9:gv=3:enable='lt(mod(t,2.6),0.16)',noise=alls=35:allf=t:enable='lt(mod(t,2.6),0.16)'`);
    if (fx.has('flash')) steps.push(`eq=brightness='0.38*max(0,1-7*mod(t,2.4))':eval=frame`);
    if (fx.has('grain')) steps.push(`noise=alls=10:allf=t`);
    if (fx.has('vignette')) steps.push(`vignette=PI/4.5`);
    if (fx.has('bars')) steps.push(`drawbox=x=0:y=0:w=iw:h=ih*0.09:color=black@1:t=fill,drawbox=x=0:y=ih*0.91:w=iw:h=ih*0.09:color=black@1:t=fill`);
    // 4) fade in / out
    steps.push(`fade=t=in:st=0:d=0.5`);
    if (outDur > 2) steps.push(`fade=t=out:st=${(outDur - 0.7).toFixed(2)}:d=0.7`);
    // 5) caption (animated: fade-in + upar slide) + chhota watermark
    if (FONT && o.capFile) {
        steps.push(`drawtext=fontfile='${FONT}':textfile='${o.capFile}':fontcolor=white:fontsize=${o.capSize || 62}:borderw=4:bordercolor=black@0.75:shadowx=2:shadowy=2:shadowcolor=black@0.6:x=(w-text_w)/2:y='h*0.76-22*max(0,1-(t-0.4)/0.7)':alpha='if(lt(t,0.4),0,min(1,(t-0.4)/0.7))'`);
    }
    if (FONT && o.markFile) {
        steps.push(`drawtext=fontfile='${FONT}':textfile='${o.markFile}':fontcolor=white@0.55:fontsize=26:x=(w-text_w)/2:y=h-60`);
    }
    return vf + ',' + steps.join(',');
}

function buildAudio(t, o) {
    const { hasAudio, music, outDur } = o;
    const sp = t.speed && t.speed !== 1 ? `,atempo=${t.speed}` : '';
    const fo = outDur > 3 ? `,afade=t=out:st=${(outDur - 1.5).toFixed(2)}:d=1.5` : '';
    const mus = `[1:a]volume=${t.vol},afade=t=in:d=1${fo}`;
    if (!music) return hasAudio ? { filter: `[0:a]volume=1.0${sp}[aout]`, map: '[aout]' } : null;
    if (!hasAudio) return { filter: `${mus},volume=1.8[aout]`, map: '[aout]' };
    if (o.duck) {
        // awaaz bolti hai to music khud dheemi ho jati hai (ducking) — pro editing wali baat
        return { filter: `[0:a]volume=1.0${sp},asplit[a0][sc];${mus}[m];[m][sc]sidechaincompress=threshold=0.03:ratio=10:attack=15:release=400[md];[a0][md]amix=inputs=2:duration=first:dropout_transition=0,volume=1.9[aout]`, map: '[aout]' };
    }
    return { filter: `[0:a]volume=1.0${sp}[a0];${mus}[m];[a0][m]amix=inputs=2:duration=first:dropout_transition=0,volume=1.9[aout]`, map: '[aout]' };
}

async function applyTemplate(videoBuf, name, opts = {}) {
    const t0 = TEMPLATES[name];
    if (!t0) throw new Error('unknown template: ' + name);
    const t = { ...t0 };
    if (opts.track) t.track = opts.track;
    const capText = opts.caption !== undefined && opts.caption !== null && opts.caption !== '' ? opts.caption : t.cap;

    const dir = path.join(os.tmpdir(), 'ahmad-vt-' + crypto.randomBytes(5).toString('hex'));
    fs.mkdirSync(dir, { recursive: true });
    try {
        const vin = path.join(dir, 'in.mp4'), vout = path.join(dir, 'out.mp4');
        fs.writeFileSync(vin, videoBuf);
        const info = probe(vin);
        if (!info.hasVideo) throw new Error('video stream nahi mili');
        const srcDur = Math.min(info.duration || MAX_SECONDS, MAX_SECONDS);
        const outDur = srcDur / (t.speed || 1);
        const music = pickMusic(t.track);

        let capFile = null, markFile = null;
        // drawtext emoji / non-latin nahi dikha sakta, isliye sirf saaf text
        const safeCap = String(capText || '').replace(/[^\x20-\x7E\u00C0-\u024F]/g, '').trim().slice(0, 40);
        if (safeCap) { capFile = path.join(dir, 'cap.txt'); fs.writeFileSync(capFile, safeCap); }
        markFile = path.join(dir, 'mark.txt'); fs.writeFileSync(markFile, 'AhmadShahzad-MD');
        const capSize = safeCap.length > 18 ? 46 : safeCap.length > 10 ? 56 : 68;

        // 3 koshish: full (ducking) -> full (simple mix) -> simple (sirf grade, effects kam)
        const plans = [{ duck: true, simple: false }, { duck: false, simple: false }, { duck: false, simple: true }];
        const bins = [...new Set([ffmpegBin(), (() => { try { return require('@ffmpeg-installer/ffmpeg').path; } catch (_) { return null; } })(), 'ffmpeg'].filter(Boolean))];
        let lastErr = null;
        for (const plan of plans) {
            const vf = buildVideoFilter(t, { outDur, simple: plan.simple, capFile, markFile, capSize });
            const au = buildAudio(t, { hasAudio: info.hasAudio, music, outDur, duck: plan.duck });
            const args = ['-y', '-hide_banner', '-loglevel', 'error', '-t', String(MAX_SECONDS), '-i', vin];
            if (music) args.push('-stream_loop', '-1', '-i', music);
            let fc = `[0:v]${vf}[vout]`;
            if (au) fc += ';' + au.filter;
            args.push('-filter_complex', fc, '-map', '[vout]');
            if (au) args.push('-map', au.map);
            args.push('-t', outDur.toFixed(2), '-r', '30', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-pix_fmt', 'yuv420p',
                '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', vout);
            for (const bin of bins) {
                try {
                    try { fs.rmSync(vout, { force: true }); } catch (_) {}
                    await run(bin, args);
                    if (fs.existsSync(vout) && fs.statSync(vout).size > 2000) return fs.readFileSync(vout);
                } catch (e) { lastErr = e; }
            }
        }
        throw lastErr || new Error('template apply failed');
    } finally { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {} }
}

module.exports = { applyTemplate, TEMPLATES, TEMPLATE_NAMES, musicFiles, probe, FONT };
