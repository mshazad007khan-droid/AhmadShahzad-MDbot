// lib/kbgmusic.js — v8: Kashmir background music (.kbgmusic1 .. .kbgmusic4)
// Voice note par Kashmir ka gaana: music 35% awaaz, asli voice 65%. Gaana hamesha shuru se lagta hai
// (voice se chhota ho to loop). data/kbgmusic/kbgmusic1..4.mp3
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const DIR = path.join(__dirname, '..', 'data', 'kbgmusic');
const MUSIC_VOL = 0.35, VOICE_VOL = 0.65;

const bins = () => {
    const out = [];
    try { const r = require('child_process').spawnSync('ffmpeg', ['-version'], { timeout: 8000 }); if (r.status === 0) out.push('ffmpeg'); } catch (_) {}
    try { const p = require('@ffmpeg-installer/ffmpeg').path; if (p) out.push(p); } catch (_) {}
    if (!out.length) out.push('ffmpeg');
    return [...new Set(out)];
};
function run(bin, args, timeout = 90000) {
    return new Promise((resolve, reject) => {
        const p = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
        let err = '';
        const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (_) {} reject(new Error('ffmpeg timeout')); }, timeout);
        p.stderr.on('data', d => { err += d; if (err.length > 6000) err = err.slice(-3000); });
        p.on('error', e => { clearTimeout(t); reject(e); });
        p.on('close', c => { clearTimeout(t); c === 0 ? resolve() : reject(new Error('ffmpeg: ' + err.trim().split('\n').slice(-2).join(' | '))); });
    });
}
function duration(file) {
    const { spawnSync } = require('child_process');
    const r = spawnSync(bins()[0], ['-hide_banner', '-i', file], { encoding: 'utf8', timeout: 20000 });
    const m = String((r.stderr || '') + (r.stdout || '')).match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
    return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0;
}
const trackFile = (n) => path.join(DIR, `kbgmusic${n}.mp3`);
const tracks = () => [1, 2, 3, 4].filter(n => fs.existsSync(trackFile(n)));

async function mix(voiceBuf, track = 1) {
    const f = trackFile(track);
    if (!fs.existsSync(f)) throw new Error(`kbgmusic${track}.mp3 nahi mili (data/kbgmusic/)`);
    const dir = path.join(os.tmpdir(), 'ahmad-kbgm-' + crypto.randomBytes(5).toString('hex'));
    fs.mkdirSync(dir, { recursive: true });
    try {
        const vin = path.join(dir, 'voice.in'), vout = path.join(dir, 'mixed.ogg');
        fs.writeFileSync(vin, voiceBuf);
        const total = Math.max(1, duration(vin) || 10) + 1.5;
        const musicArgs = ['-stream_loop', '-1', '-t', total.toFixed(1), '-i', f];   // shuru se, voice jitni lambi
        // amix inputs ko barabar baant deta hai, isliye volume=2 se wapas: natija = voice 65% + music 35%
        const filters = [
            `[0:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=${VOICE_VOL}[v];[1:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=${MUSIC_VOL}[m];[v][m]amix=inputs=2:duration=first:dropout_transition=0,volume=2,alimiter=limit=0.95[o]`,
            `[0:a]volume=${VOICE_VOL}[v];[1:a]volume=${MUSIC_VOL}[m];[v][m]amix=inputs=2:duration=first,volume=2[o]`
        ];
        let lastErr = null;
        for (const bin of bins()) for (const fc of filters) {
            try {
                try { fs.rmSync(vout, { force: true }); } catch (_) {}
                await run(bin, ['-y', '-hide_banner', '-loglevel', 'error', '-i', vin, ...musicArgs, '-filter_complex', fc,
                    '-map', '[o]', '-c:a', 'libopus', '-b:a', '48k', '-ac', '1', '-ar', '48000', '-application', 'voip', '-f', 'ogg', vout]);
                if (fs.existsSync(vout) && fs.statSync(vout).size > 1000) return fs.readFileSync(vout);
            } catch (e) { lastErr = e; console.warn('[KBGMUSIC] attempt failed:', String(e.message).slice(0, 160)); }
        }
        throw lastErr || new Error('kashmir mix failed');
    } finally { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {} }
}

// ───────── per-bot state ─────────
const state = new Map();
const keyOf = conn => String((conn && conn.user && conn.user.id) || '').split(':')[0].split('@')[0];
const get = conn => state.get(keyOf(conn)) || { armedUntil: 0, always: false, track: 1 };
const put = (conn, s) => state.set(keyOf(conn), s);
function setTrack(conn, n) { const s = get(conn); s.track = n; put(conn, s); }
function arm(conn, minutes = 10) { const s = get(conn); s.armedUntil = Date.now() + minutes * 60000; put(conn, s); }
function setAlways(conn, on) { const s = get(conn); s.always = !!on; if (!on) s.armedUntil = 0; put(conn, s); }
function disarm(conn) { const s = get(conn); s.armedUntil = 0; put(conn, s); }
function off(conn) { const s = get(conn); s.always = false; s.armedUntil = 0; put(conn, s); }
const isActive = conn => { const s = get(conn); return s.always || s.armedUntil > Date.now(); };
const status = conn => { const s = get(conn); return { always: s.always, armed: s.armedUntil > Date.now(), track: s.track || 1 }; };

module.exports = { mix, tracks, setTrack, arm, setAlways, disarm, off, isActive, status, DIR, MUSIC_VOL, VOICE_VOL };
