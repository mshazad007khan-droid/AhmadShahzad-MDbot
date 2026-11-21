// lib/gcauto.js — v9: GROUP auto-react (panel + .gcreact)
//   data/gcauto.json : { "<groupJid>": { emojis: [...], name, by, at } }
//   Jo bot users us group mein maujood hain, wo har NAYE message par (thori der baad, random gap se) apni taraf se react karte hain.
//   Ban se bachao: har session ke liye ghante mein max GC_REACTS_PER_HOUR (default 40) reactions, 3-25 second random delay.
const fs = require('fs');
const path = require('path');

const FILE = path.join(process.env.DATA_DIR || path.join(__dirname, '..', 'data'), 'gcauto.json');
const PER_HOUR = Math.max(5, Number(process.env.GC_REACTS_PER_HOUR || 40));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const rnd = (a) => a[Math.floor(Math.random() * a.length)];

let cache = null, cacheAt = 0;
function load() {
    if (cache && Date.now() - cacheAt < 10000) return cache;
    try { cache = JSON.parse(fs.readFileSync(FILE, 'utf8')) || {}; } catch (_) { cache = {}; }
    cacheAt = Date.now();
    return cache;
}
function save(obj) {
    try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(obj, null, 2)); cache = obj; cacheAt = Date.now(); return true; }
    catch (e) { console.error('[GCAUTO] save failed:', e.message); return false; }
}
const list = () => load();
function set(jid, emojis, meta = {}) { const o = { ...load() }; o[jid] = { emojis, name: meta.name || (o[jid] && o[jid].name) || '', by: meta.by || '', at: Date.now() }; return save(o); }
function remove(jid) { const o = { ...load() }; const had = !!o[jid]; delete o[jid]; save(o); return had; }

const seen = new Set();
const sentLog = new Map();   // session -> [timestamps]
function allowed(me) {
    const now = Date.now();
    const recent = (sentLog.get(me) || []).filter(t => now - t < 3600000);
    if (recent.length >= PER_HOUR) { sentLog.set(me, recent); return false; }
    recent.push(now); sentLog.set(me, recent);
    return true;
}

// har session ke upsert hook se (extras-hooks.js)
async function handle(conn, mek) {
    try {
        const jid = mek && mek.key && mek.key.remoteJid;
        if (!jid || !String(jid).endsWith('@g.us')) return;
        const cfg = load()[jid];
        if (!cfg || !cfg.emojis || !cfg.emojis.length) return;
        if (!mek.message || mek.key.fromMe) return;
        if (mek.message.reactionMessage || mek.message.protocolMessage || mek.message.senderKeyDistributionMessage && Object.keys(mek.message).length === 1) return;
        const ts = Number(mek.messageTimestamp && typeof mek.messageTimestamp === 'object' && mek.messageTimestamp.toNumber ? mek.messageTimestamp.toNumber() : mek.messageTimestamp || 0);
        if (ts && Date.now() / 1000 - ts > 60) return;            // purane messages par nahi
        const me = String((conn.user && conn.user.id) || '').split(':')[0].split('@')[0];
        const dk = me + '|' + jid + '|' + mek.key.id;
        if (seen.has(dk)) return;
        seen.add(dk); if (seen.size > 5000) seen.delete(seen.values().next().value);
        if (!allowed(me)) return;
        await sleep(3000 + Math.floor(Math.random() * 22000));
        await conn.sendMessage(jid, { react: { text: rnd(cfg.emojis), key: mek.key } });
    } catch (e) { /* react fail ho to chup — session group mein na ho ya message delete ho gaya */ }
}

// ek message par SAB sessions (jo us group mein hain) se react — .gcreact (reply mode)
async function massReactMessage(groupJid, key, emojis) {
    const socks = Array.from((global.activeSockets instanceof Map ? global.activeSockets : new Map()).values()).filter(s => s && s.user);
    let ok = 0, fail = 0, i = 0;
    for (const s of socks) {
        const me = String(s.user.id).split(':')[0].split('@')[0];
        const emoji = emojis[i++ % emojis.length];
        try {
            const meta = await s.groupMetadata(groupJid).catch(() => null);
            if (!meta) { fail++; continue; }
            if (!allowed(me)) { fail++; continue; }
            await s.sendMessage(groupJid, { react: { text: emoji, key } });
            ok++;
        } catch (_) { fail++; }
        await sleep(1200 + Math.floor(Math.random() * 1800));
    }
    return { ok, fail, total: socks.length };
}

module.exports = { list, set, remove, handle, massReactMessage };
