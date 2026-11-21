// lib/ffq.js — v9: ffmpeg ke liye shared helper
//  • ffmpegBin(): sirf EK baar dhundta hai (pehle har call par spawnSync chalta tha = poora bot kuch der ke liye ruk jata tha)
//  • run(): ek waqt mein sirf FFMPEG_CONCURRENCY (default 2) ffmpeg process — baqi qatar mein; timeout ke saath
//  • duration(): async (pehle spawnSync, jo sab sessions ko block karta tha)
const { spawn, spawnSync } = require('child_process');

let _bin = null;
function ffmpegBin() {
    if (_bin) return _bin;
    try { const r = spawnSync('ffmpeg', ['-version'], { timeout: 8000 }); if (r.status === 0) return (_bin = 'ffmpeg'); } catch (_) {}
    try { const p = require('@ffmpeg-installer/ffmpeg').path; if (p) return (_bin = p); } catch (_) {}
    return (_bin = 'ffmpeg');
}

const LIMIT = Math.max(1, Number(process.env.FFMPEG_CONCURRENCY || 2));
let running = 0;
const waiting = [];
function acquire() {
    return new Promise((resolve) => {
        const go = () => { running++; resolve(); };
        if (running < LIMIT) go(); else waiting.push(go);
    });
}
function release() { running--; const n = waiting.shift(); if (n) n(); }

function run(bin, args, timeout = 90000) {
    return acquire().then(() => new Promise((resolve, reject) => {
        let done = false;
        const fin = (fn, v) => { if (done) return; done = true; release(); fn(v); };
        const p = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
        let err = '';
        const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (_) {} fin(reject, new Error('ffmpeg timeout')); }, timeout);
        p.stderr.on('data', d => { err += d; if (err.length > 8000) err = err.slice(-4000); });
        p.on('error', e => { clearTimeout(t); fin(reject, e); });
        p.on('close', c => { clearTimeout(t); c === 0 ? fin(resolve) : fin(reject, new Error('ffmpeg: ' + err.trim().split('\n').slice(-2).join(' | '))); });
    }));
}

function duration(file) {
    return new Promise((resolve) => {
        let out = '';
        const p = spawn(ffmpegBin(), ['-hide_banner', '-i', file], { stdio: ['ignore', 'pipe', 'pipe'] });
        const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (_) {} resolve(0); }, 20000);
        p.stdout.on('data', d => { out += d; });
        p.stderr.on('data', d => { out += d; });
        p.on('error', () => { clearTimeout(t); resolve(0); });
        p.on('close', () => {
            clearTimeout(t);
            const m = out.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
            resolve(m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0);
        });
    });
}

module.exports = { ffmpegBin, run, duration };
