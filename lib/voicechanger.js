// lib/voicechanger.js — voice note ki pitch/tone badalna (ffmpeg, pura local — koi API nahi chahiye)
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');

const ffmpegBin = () => {
    try { const r = spawnSync('ffmpeg', ['-version'], { timeout: 8000 }); if (r.status === 0) return 'ffmpeg'; } catch (_) {}
    try { return require('@ffmpeg-installer/ffmpeg').path || 'ffmpeg'; } catch (_) { return 'ffmpeg'; }
};
function run(bin, args, timeout = 60000) {
    return new Promise((resolve, reject) => {
        const p = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
        let err = '';
        const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (_) {} reject(new Error('ffmpeg timeout')); }, timeout);
        p.stderr.on('data', d => { err += d; if (err.length > 6000) err = err.slice(-3000); });
        p.on('error', e => { clearTimeout(t); reject(e); });
        p.on('close', c => { clearTimeout(t); c === 0 ? resolve() : reject(new Error('ffmpeg: ' + err.trim().split('\n').pop())); });
    });
}

// pitch factor k: >1 = awaaz patli/oonchi (girl/child), <1 = gehri (man/deep).
// asetrate badalta hai sample rate (jis se pitch change hoti hai) phir atempo se speed/duration wapas
// normal kar deta hai, taake awaaz ka time wahi rahe, bas tone badle.
const PRESETS = {
    // GIRL / WOMAN: 2-stage "real female" chain —
    //   1) rubberband pitch-shift (formant PRESERVED, awaaz ka asli timbre bacha rehta hai)
    //   2) halka sa resample: pitch + formants dono upar (chhota vocal-tract jaisa asar) — "helium" nahi lagta
    //   3) EQ: bhari low-end kam, 3kHz presence + 7kHz air up, halka compressor
    girl:    { k: 1.30, formantResample: 1.13, eq: 'highpass=f=130,equalizer=f=220:t=q:w=1.0:g=-4,equalizer=f=3000:t=q:w=1.2:g=3.5,equalizer=f=7000:t=h:w=0.7:g=2.5,acompressor=threshold=-20dB:ratio=2.5:attack=8:release=120:makeup=2' },
    woman:   { k: 1.17, formantResample: 1.06, eq: 'highpass=f=100,equalizer=f=200:t=q:w=1.0:g=-2.5,equalizer=f=2800:t=q:w=1.2:g=2.5,equalizer=f=6500:t=h:w=0.7:g=1.5,acompressor=threshold=-20dB:ratio=2:attack=8:release=120:makeup=1.5' },
    child:   { k: 1.55, extra: null },
    kid:     { k: 1.55, extra: null },
    boy:     { k: 1.22, extra: null },
    man:     { k: 0.82, extra: null },
    deep:    { k: 0.68, extra: null },
    cartoon: { k: 1.75, extra: 'aecho=0.6:0.4:40:0.25' },
    echo:    { k: 1.0,  extra: 'aecho=0.8:0.9:500|1000:0.35|0.25' },
    robot:   { k: 1.0,  extra: "afftfilt=real='hypot(re,im)*sin(0)':imag='hypot(re,im)*cos(0)':win_size=512:overlap=0.75,vibrato=f=7:d=0.4" }
};
const PRESET_NAMES = Object.keys(PRESETS);

// rubberband = phase-vocoder pitch shift (asal awaaz jaisi, smooth), bina duration/speed badle.
// asetrate+atempo (purana tareeqa) sirf sample-rate resample karta hai -> "chipmunk/helium" jaisi
// awaaz deta hai. rubberband kahin zyada natural lagta hai. Agar kisi wajah se rubberband na chale
// (library missing), to purana asetrate+atempo fallback use hota hai taake command fail na ho.
function pitchFilterRubberband(k) {
    return `rubberband=pitch=${k}:tempo=1.0:formant=shifted:pitchq=quality`;
}
function pitchFilterFallback(k) {
    const sr = 44100;
    let tempo = 1 / k;
    const chain = [`asetrate=${sr}*${k}`];
    while (tempo > 2.0) { chain.push('atempo=2.0'); tempo /= 2.0; }
    while (tempo < 0.5) { chain.push('atempo=0.5'); tempo /= 0.5; }
    chain.push(`atempo=${tempo.toFixed(4)}`);
    chain.push(`aresample=${sr}`);
    return chain.join(',');
}

function femaleChain(p) {
    const r = p.formantResample;
    const sr = 44100;
    const tempo = (1 / r).toFixed(5);
    return [
        `aresample=${sr}`,
        `rubberband=pitch=${p.k}:tempo=1.0:formant=preserved:pitchq=quality`,
        `asetrate=${sr}*${r}`, `atempo=${tempo}`, `aresample=${sr}`,
        p.eq
    ].join(',');
}

// audioBuf (kisi bhi format ka audio) + preset -> OGG/Opus voice note buffer
async function applyPreset(audioBuf, presetName) {
    const p = PRESETS[presetName];
    if (!p) throw new Error('unknown preset: ' + presetName);
    const dir = path.join(os.tmpdir(), 'ahmad-vc-' + crypto.randomBytes(5).toString('hex'));
    fs.mkdirSync(dir, { recursive: true });
    try {
        const vin = path.join(dir, 'in.bin');
        const vout = path.join(dir, 'out.ogg');
        fs.writeFileSync(vin, audioBuf);
        const filterSets = p.formantResample
            ? [femaleChain(p), [pitchFilterRubberband(p.k), p.eq].join(','), [pitchFilterFallback(p.k * p.formantResample), p.eq].join(',')]
            : p.k === 1.0
                ? [[p.extra].filter(Boolean).join(',')]
                : [[pitchFilterRubberband(p.k), p.extra].filter(Boolean).join(','), [pitchFilterFallback(p.k), p.extra].filter(Boolean).join(',')];
        const bins = [...new Set([ffmpegBin(), (() => { try { return require('@ffmpeg-installer/ffmpeg').path; } catch (_) { return null; } })(), 'ffmpeg'].filter(Boolean))];
        let lastErr = null, done = false;
        for (const filters of filterSets) {
            for (const bin of bins) {
                try {
                    await run(bin, ['-y', '-hide_banner', '-loglevel', 'error', '-i', vin, '-af', filters,
                        '-c:a', 'libopus', '-b:a', '48k', '-ac', '1', '-ar', '48000', '-application', 'voip', '-f', 'ogg', vout]);
                    if (fs.existsSync(vout) && fs.statSync(vout).size > 500) { done = true; break; }
                } catch (e) { lastErr = e; }
            }
            if (done) break;
        }
        if (!done) throw lastErr || new Error('voice change failed');
        return fs.readFileSync(vout);
    } finally { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {} }
}

// ───────── per-bot state: armed (agli voice ke liye) / always-on preset ─────────
const state = new Map();   // botNumber -> { armedUntil, always, preset }
const keyOf = conn => String((conn && conn.user && conn.user.id) || '').split(':')[0].split('@')[0];
const get = conn => state.get(keyOf(conn)) || { armedUntil: 0, always: false, preset: null };
function arm(conn, preset, minutes = 10) { const s = get(conn); s.preset = preset; s.armedUntil = Date.now() + minutes * 60000; state.set(keyOf(conn), s); }
function setAlways(conn, preset) { const s = get(conn); s.preset = preset; s.always = !!preset; state.set(keyOf(conn), s); }
function disarm(conn) { const s = get(conn); s.armedUntil = 0; if (!s.always) s.preset = null; state.set(keyOf(conn), s); }
function isActive(conn) { const s = get(conn); return s.always || Date.now() < s.armedUntil; }
function activePreset(conn) { const s = get(conn); return isActive(conn) ? s.preset : null; }
function status(conn) { return get(conn); }

module.exports = { applyPreset, PRESET_NAMES, arm, setAlways, disarm, isActive, activePreset, status };
