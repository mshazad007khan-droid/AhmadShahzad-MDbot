// lib/vtemplates.js — video template engine: 1 video reply karo -> ready-made edited video wapas
// milta hai (color grade + caption + optional speed + optional background music mix). Pura local
// ffmpeg se, koi API nahi chahiye.
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');

function ffmpegBin() {
    try { const r = spawnSync('ffmpeg', ['-version'], { timeout: 8000 }); if (r.status === 0) return 'ffmpeg'; } catch (_) {}
    try { return require('@ffmpeg-installer/ffmpeg').path || 'ffmpeg'; } catch (_) { return 'ffmpeg'; }
}
function run(bin, args, timeout = 120000) {
    return new Promise((resolve, reject) => {
        const p = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
        let err = '';
        const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (_) {} reject(new Error('ffmpeg timeout')); }, timeout);
        p.stderr.on('data', d => { err += d; if (err.length > 8000) err = err.slice(-4000); });
        p.on('error', e => { clearTimeout(t); reject(e); });
        p.on('close', c => { clearTimeout(t); c === 0 ? resolve() : reject(new Error('ffmpeg: ' + err.trim().split('\n').pop())); });
    });
}
const esc = t => String(t).replace(/[\\':]/g, c => '\\' + c);
const FONT = (() => {
    const candidates = ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'];
    return candidates.find(f => fs.existsSync(f)) || null;
})();

// eq=brightness:contrast:saturation:gamma , caption text, optional bg music track (1-5), speed, vignette
const TEMPLATES = {
    viral:        { label: '🔥 Viral',        eq: '0.03:1.25:1.5',  caption: '🔥 VIRAL',           track: 5, musicVol: 0.22, speed: 1.0,  vignette: false },
    funny:        { label: '😂 Funny',        eq: '0.05:1.2:1.6',   caption: '😂 😂 😂',             track: 5, musicVol: 0.20, speed: 1.05, vignette: false },
    sad:          { label: '💔 Sad',          eq: '-0.05:1.0:0.55', caption: '💔',                  track: 2, musicVol: 0.28, speed: 0.95, vignette: true  },
    poetry:       { label: '📜 Poetry',       eq: '0.0:1.05:0.75',  caption: '📜 Shayari',          track: 4, musicVol: 0.25, speed: 0.97, vignette: true  },
    romantic:     { label: '❤️ Romantic',     eq: '0.03:1.1:1.2',   caption: '❤️ Love',             track: 1, musicVol: 0.24, speed: 1.0,  vignette: true  },
    motivational: { label: '💪 Motivational', eq: '0.04:1.3:1.3',   caption: '💪 NEVER GIVE UP',    track: 5, musicVol: 0.24, speed: 1.0,  vignette: false },
    cinematic:    { label: '🎬 Cinematic',    eq: '-0.02:1.2:0.9',  caption: '🎬',                  track: 2, musicVol: 0.2,  speed: 0.98, vignette: true, bars: true },
    energetic:    { label: '⚡ Energetic',    eq: '0.05:1.3:1.6',   caption: '⚡ ENERGY',           track: 5, musicVol: 0.26, speed: 1.08, vignette: false },
    vintage:      { label: '📻 Vintage',      eq: '0.02:1.0:0.45',  caption: '📻 Vintage',          track: 3, musicVol: 0.22, speed: 1.0,  vignette: true  },
    aesthetic:    { label: '🌙 Aesthetic',    eq: '0.0:1.15:0.3',   caption: '🌙',                  track: 2, musicVol: 0.2,  speed: 1.0,  vignette: true  },
    love:         { label: '💕 Love',         eq: '0.04:1.1:1.25',  caption: '💕',                  track: 1, musicVol: 0.24, speed: 1.0,  vignette: true  },
    night:        { label: '🌃 Night',        eq: '-0.03:1.1:0.8',  caption: '🌃',                  track: 2, musicVol: 0.2,  speed: 1.0,  vignette: true  },
    sports:       { label: '🏆 Sports',       eq: '0.05:1.35:1.4',  caption: '🏆 GAME ON',          track: 5, musicVol: 0.26, speed: 1.05, vignette: false },
    travel:       { label: '✈️ Travel',       eq: '0.04:1.2:1.45',  caption: '✈️ Travel',           track: 5, musicVol: 0.22, speed: 1.0,  vignette: false, bars: true },
    dua:          { label: '🤲 Dua',          eq: '0.0:1.05:0.7',   caption: '🤲',                  track: 4, musicVol: 0.26, speed: 0.95, vignette: true  }
};
const TEMPLATE_NAMES = Object.keys(TEMPLATES);

function bgMusicFile(n) {
    const dir = path.join(process.env.DATA_DIR || path.join(__dirname, '..', 'data'), 'bgmusic');
    const f = path.join(dir, `bgmusic${n}.mp3`);
    return fs.existsSync(f) ? f : null;
}

async function applyTemplate(videoBuf, name) {
    const t = TEMPLATES[name];
    if (!t) throw new Error('unknown template: ' + name);
    const dir = path.join(os.tmpdir(), 'ahmad-vt-' + crypto.randomBytes(5).toString('hex'));
    fs.mkdirSync(dir, { recursive: true });
    try {
        const vin = path.join(dir, 'in.mp4');
        const vout = path.join(dir, 'out.mp4');
        fs.writeFileSync(vin, videoBuf);

        const vf = [];
        vf.push(`eq=brightness=${t.eq.split(':')[0]}:contrast=${t.eq.split(':')[1]}:saturation=${t.eq.split(':')[2]}`);
        if (t.vignette) vf.push('vignette=PI/5');
        if (t.bars) vf.push(`pad=iw:ih*1.0:0:0,drawbox=y=0:color=black@1:width=iw:height=ih*0.08:t=fill,drawbox=y=ih*0.92:color=black@1:width=iw:height=ih*0.08:t=fill`);
        if (t.speed !== 1.0) vf.push(`setpts=${(1 / t.speed).toFixed(4)}*PTS`);
        if (FONT && t.caption) {
            vf.push(`drawtext=fontfile='${FONT}':text='${esc(t.caption)}':fontcolor=white:fontsize=42:borderw=3:bordercolor=black@0.7:x=(w-text_w)/2:y=h-th-60`);
        }
        const vfStr = vf.join(',');

        const music = bgMusicFile(t.track);
        const args = ['-y', '-hide_banner', '-loglevel', 'error', '-i', vin];
        let af, mapV = '0:v', mapA;
        if (music) {
            args.push('-stream_loop', '-1', '-i', music);
            const atempo = t.speed !== 1.0 ? `,atempo=${t.speed}` : '';
            af = `[0:a]volume=1.4${atempo}[a0];[1:a]volume=${t.musicVol}[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=0[aout]`;
            args.push('-filter_complex', `[0:v]${vfStr}[vout];${af}`);
            mapV = '[vout]'; mapA = '[aout]';
        } else {
            args.push('-vf', vfStr);
            mapA = '0:a?';
        }
        args.push('-map', mapV, '-map', mapA, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
            '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-shortest', vout);

        const bins = [...new Set([ffmpegBin(), (() => { try { return require('@ffmpeg-installer/ffmpeg').path; } catch (_) { return null; } })(), 'ffmpeg'].filter(Boolean))];
        let lastErr = null, done = false;
        for (const bin of bins) {
            try { await run(bin, args); if (fs.existsSync(vout) && fs.statSync(vout).size > 2000) { done = true; break; } }
            catch (e) { lastErr = e; }
        }
        if (!done) throw lastErr || new Error('template apply failed');
        return fs.readFileSync(vout);
    } finally { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {} }
}

module.exports = { applyTemplate, TEMPLATES, TEMPLATE_NAMES };
