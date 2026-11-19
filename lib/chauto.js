// lib/chauto.js — v8: channel auto-react + mass-react
//  - data/chauto.json : { "<channelJid>": { emojis: [...], by: "<owner>" } }
//  - Har connected bot session (global.activeSockets) naye post par khud react karta hai
//  - massReact(): ek post par SAB bot users se react (thori thori der ke gap se, ban se bachne ke liye)
const fs = require('fs');
const path = require('path');
const reactor = require('./reactor');

const FILE = path.join(process.env.DATA_DIR || path.join(__dirname, '..', 'data'), 'chauto.json');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const rnd = (a) => a[Math.floor(Math.random() * a.length)];

let cache = null, cacheAt = 0;
function load() {
    if (cache && Date.now() - cacheAt < 15000) return cache;
    try { cache = JSON.parse(fs.readFileSync(FILE, 'utf8')) || {}; } catch (_) { cache = {}; }
    cacheAt = Date.now();
    return cache;
}
function save(obj) {
    try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(obj, null, 2)); cache = obj; cacheAt = Date.now(); return true; }
    catch (e) { console.error('[CHAUTO] save failed:', e.message); return false; }
}
const list = () => load();
function set(jid, emojis, by) { const o = { ...load() }; o[jid] = { emojis, by: by || '', at: Date.now() }; return save(o); }
function remove(jid) { const o = { ...load() }; const had = !!o[jid]; delete o[jid]; save(o); return had; }

const liveSockets = () => Array.from((global.activeSockets instanceof Map ? global.activeSockets : new Map()).values()).filter(s => s && s.user);

// ek channel ko saare sessions follow + live-updates subscribe karwao
async function ensureAll(jid) {
    let n = 0;
    for (const s of liveSockets()) {
        try { if (typeof s.newsletterFollow === 'function') await s.newsletterFollow(jid).catch(() => {}); } catch (_) {}
        try { if (typeof s.subscribeNewsletterUpdates === 'function') await s.subscribeNewsletterUpdates(jid).catch(() => {}); } catch (_) {}
        n++;
        await sleep(300);
    }
    return n;
}
// ek session ke liye (connect hone par)
async function ensureOne(conn) {
    for (const jid of Object.keys(load())) {
        try { if (typeof conn.newsletterFollow === 'function') await conn.newsletterFollow(jid).catch(() => {}); } catch (_) {}
        try { if (typeof conn.subscribeNewsletterUpdates === 'function') await conn.subscribeNewsletterUpdates(jid).catch(() => {}); } catch (_) {}
        await sleep(500);
    }
}

// naya post aaya -> ye session react kare (har session apne hook se, isliye sab bot users react karte hain)
const seen = new Set();
async function handlePost(conn, mek) {
    try {
        const jid = mek && mek.key && mek.key.remoteJid;
        if (!jid || !String(jid).endsWith('@newsletter')) return;
        const cfg = load()[jid];
        if (!cfg || !cfg.emojis || !cfg.emojis.length) return;
        const serverId = mek.newsletterServerId || (mek.key && mek.key.server_id);
        if (!serverId) return;
        const me = String((conn.user && conn.user.id) || '').split(':')[0];
        const dk = me + '|' + jid + '|' + serverId;
        if (seen.has(dk)) return;
        seen.add(dk); if (seen.size > 3000) seen.delete(seen.values().next().value);
        await sleep(3000 + Math.floor(Math.random() * 25000));   // sab ek second mein nahi — ban se bachao
        const r = await reactor.reactViaBaileys(conn, jid, serverId, rnd(cfg.emojis), '');
        if (!r.ok) console.warn('[CHAUTO] react failed for', me, r.err && r.err.message);
    } catch (e) { console.warn('[CHAUTO] handlePost:', e && e.message); }
}

// SAB bot users se ek post par react
async function massReact(channelJid, serverId, emojis) {
    const socks = liveSockets();
    let ok = 0, fail = 0;
    for (let i = 0; i < socks.length; i++) {
        const s = socks[i];
        const emoji = emojis[i % emojis.length];   // 3-4 emoji hon to sab mein baant do
        try {
            const r = await reactor.reactViaBaileys(s, channelJid, serverId, emoji, '');
            if (r.ok) ok++; else fail++;
        } catch (_) { fail++; }
        await sleep(500 + Math.floor(Math.random() * 900));
    }
    return { ok, fail, total: socks.length };
}

module.exports = { list, set, remove, ensureAll, ensureOne, handlePost, massReact, liveSockets };
