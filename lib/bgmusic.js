// lib/bgmusic.js — voice note mein background music mix karna
//  - data/bgmusic/ mein files hon to random file + random offset
//  - warna har baar ffmpeg se nayi soft melody (random scale / tempo / root note) banti hai
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const MUSIC_DIR = path.join(__dirname, '..', 'data', 'bgmusic');
const ffmpegBin = () => {
    // pehle system ffmpeg (Dockerfile mein install hai, naya version), warna npm wala
    try { const r = require('child_process').spawnSync('ffmpeg', ['-version'], { timeout: 8000 }); if (r.status === 0) return 'ffmpeg'; } catch (_) {}
    try { return require('@ffmpeg-installer/ffmpeg').path || 'ffmpeg'; } catch (_) { return 'ffmpeg'; }
};

function run(bin, args, timeout = 90000) {
    return new Promise((resolve, reject) => {
        const p = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
        let err = '';
        const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (_) {} reject(new Error('ffmpeg timeout')); }, timeout);
        p.stderr.on('data', d => { err += d; if (err.length > 8000) err = err.slice(-4000); });
        p.on('error', e => { clearTimeout(t); reject(e); });
        p.on('close', c => { clearTimeout(t); c === 0 ? resolve() : reject(new Error('ffmpeg: ' + err.trim().split('\n').slice(-2).join(' | '))); });
    });
}
function duration(file) {
    const { spawnSync } = require('child_process');
    const r = spawnSync(ffmpegBin(), ['-hide_banner', '-i', file], { encoding: 'utf8', timeout: 20000 });
    const m = String((r.stderr || '') + (r.stdout || '')).match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
    return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0;
}
const rnd = (a) => a[Math.floor(Math.random() * a.length)];

function userMusicFiles() {
    try { return fs.readdirSync(MUSIC_DIR).filter(f => /\.(mp3|m4a|ogg|opus|wav|aac)$/i.test(f)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map(f => path.join(MUSIC_DIR, f)); }
    catch (_) { return []; }
}

// Nayi melody: random scale + root + tempo. Arpeggio + soft pad + echo.
const SCALES = {
    minor:      [0, 2, 3, 5, 7, 8, 10, 12],
    major:      [0, 2, 4, 5, 7, 9, 11, 12],
    pentatonic: [0, 2, 4, 7, 9, 12, 14, 16],
    arabic:     [0, 1, 4, 5, 7, 8, 11, 12]
};
async function makeMelody(out, seconds) {
    const root = rnd([110, 123.47, 130.81, 146.83, 164.81, 174.61, 196]);      // A2..G3
    const scale = SCALES[rnd(Object.keys(SCALES))];
    const step = rnd([0.35, 0.45, 0.55, 0.7]);                                   // seconds per note
    const pattern = Array.from({ length: 16 }, () => rnd([0, 1, 2, 3, 4, 2, 5, 7, 4, 3]));
    // note(i) = root * 2^(scale[pattern[i%16]]/12)  — ffmpeg expression mein table (if-chain)
    const idx = `mod(floor(t/${step}),16)`;
    const semis = pattern.map((p, i) => `eq(${idx},${i})*${scale[Math.min(p, scale.length - 1)]}`).join('+');
    const freq = `(${root}*2*pow(2,(${semis})/12))`;
    const env = `exp(-3*mod(t,${step})/${step})`;                                // har note ka soft decay
    const lead = `0.55*sin(2*PI*t*${freq})*${env}+0.2*sin(4*PI*t*${freq})*${env}`;
    const pad = `0.22*sin(2*PI*t*${root})+0.14*sin(2*PI*t*${(root * 1.5).toFixed(2)})+0.1*sin(2*PI*t*${(root * 2).toFixed(2)})`;
    const expr = `(${lead}+${pad})*0.5`;
    await run(ffmpegBin(), ['-y', '-hide_banner', '-loglevel', 'error',
        '-f', 'lavfi', '-i', `aevalsrc='${expr}':s=44100:d=${seconds.toFixed(1)}`,
        '-af', 'lowpass=f=2400,aecho=0.8:0.6:380|760:0.35|0.25,tremolo=f=0.35:d=0.25,afade=t=in:d=1,afade=t=out:st=' + Math.max(0, seconds - 1.5).toFixed(1) + ':d=1.5',
        out]);
}

// voiceFile (koi bhi audio) + music -> OGG/Opus voice note (ptt)
async function mixVoiceWithMusic(voiceBuf, opts = {}) {
    const dir = path.join(os.tmpdir(), 'ahmad-bgm-' + crypto.randomBytes(5).toString('hex'));
    fs.mkdirSync(dir, { recursive: true });
    try {
        const vin = path.join(dir, 'voice.in');
        const vout = path.join(dir, 'mixed.ogg');
        fs.writeFileSync(vin, voiceBuf);
        const vdur = Math.max(1, duration(vin) || 10);
        const total = vdur + 1.5;

        const mine = userMusicFiles();
        let music = path.join(dir, 'music.wav');
        let musicArgs;
        if (mine.length) {
            const f = (opts.track && mine[opts.track - 1]) || rnd(mine);
            const mdur = duration(f);
            const start = mdur > total + 2 ? Math.random() * (mdur - total - 1) : 0;
            musicArgs = ['-stream_loop', '-1', '-ss', start.toFixed(1), '-t', total.toFixed(1), '-i', f];
        } else {
            await makeMelody(music, total);
            musicArgs = ['-i', music];
        }
        const vol = opts.volume || 0.25;   // pehle 0.10 thi, ab zara bulandi 0.25 (awaaz phir bhi upar rahegi)
        // kai tareeqe try: pehle behtareen filter, phir saada filter; system ffmpeg phir npm wala
        const filters = [
            `[1:a]volume=${vol},aformat=sample_rates=48000:channel_layouts=stereo[m];[0:a]volume=1.5,aformat=sample_rates=48000:channel_layouts=stereo[v];[v][m]amix=inputs=2:duration=first:dropout_transition=0,volume=2,alimiter=limit=0.95[o]`,
            `[1:a]volume=${vol}[m];[0:a]volume=1.5[v];[v][m]amix=inputs=2:duration=first,volume=2[o]`
        ];
        const bins = [...new Set([ffmpegBin(), (() => { try { return require('@ffmpeg-installer/ffmpeg').path; } catch (_) { return null; } })(), 'ffmpeg'].filter(Boolean))];
        let lastErr = null, done = false;
        for (const bin of bins) {
            for (const fc of filters) {
                try {
                    try { fs.rmSync(vout, { force: true }); } catch (_) {}
                    await run(bin, ['-y', '-hide_banner', '-loglevel', 'error',
                        '-i', vin, ...musicArgs, '-filter_complex', fc,
                        '-map', '[o]', '-c:a', 'libopus', '-b:a', '48k', '-ac', '1', '-ar', '48000', '-application', 'voip', '-f', 'ogg', vout]);
                    if (fs.existsSync(vout) && fs.statSync(vout).size > 1000) { done = true; break; }
                } catch (e) { lastErr = e; console.warn('[BGMUSIC] mix attempt failed:', String(e.message).slice(0, 160)); }
            }
            if (done) break;
        }
        if (!done) throw lastErr || new Error('mix failed');
        const buf = fs.readFileSync(vout);
        if (buf.length < 1000) throw new Error('mixed audio empty');
        return buf;
    } finally { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {} }
}

// ───────── per-bot state: armed (agli voice ke liye) / always-on ─────────
const state = new Map();   // botNumber -> { armedUntil, always }
const keyOf = conn => String((conn && conn.user && conn.user.id) || '').split(':')[0].split('@')[0];
const get = conn => state.get(keyOf(conn)) || { armedUntil: 0, always: false, track: 0 };
function setTrack(conn, n) { const s = get(conn); s.track = n || 0; state.set(keyOf(conn), s); }
function arm(conn, minutes = 10) { try { require('./kbgmusic').off(conn); } catch (_) {} const s = get(conn); s.armedUntil = Date.now() + minutes * 60000; state.set(keyOf(conn), s); }
function setAlways(conn, on) { if (on) { try { require('./kbgmusic').off(conn); } catch (_) {} } const s = get(conn); s.always = !!on; if (!on) s.armedUntil = 0; state.set(keyOf(conn), s); }
function disarm(conn) { const s = get(conn); s.armedUntil = 0; state.set(keyOf(conn), s); }
function isActive(conn) { const s = get(conn); return s.always || s.armedUntil > Date.now(); }
function status(conn) { const s = get(conn); return { always: s.always, armed: s.armedUntil > Date.now(), track: s.track || 0 }; }

module.exports = { setTrack, mixVoiceWithMusic, makeMelody, arm, setAlways, disarm, isActive, status, userMusicFiles, MUSIC_DIR };
