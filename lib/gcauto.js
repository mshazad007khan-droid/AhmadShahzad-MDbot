// lib/gcauto.js — v9: GROUP auto-react + mass-react
//  data/gcauto.json : { "<groupJid>": { emojis:[...], mode:'admins'|'all', by:'panel'|'cmd' } }
//  Group mein jo bhi bot-user member hai wo (panel/command mein chune emoji se) naye message par react karta hai.
//  mode 'admins' (default): sirf group admins ke messages par — spam jaisa na lage, ban ka khatra kam.
//  Safety: har session ke liye ghante mein max GC_REACTS_PER_HOUR (default 30), 3-20 sec random gap, purane message par nahi.
const fs = require('fs');
const path = require('path');

const FILE = path.join(process.env.DATA_DIR || path.join(__dirname, '..', 'data'), 'gcauto.json');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const rnd = (a) => a[Math.floor(Math.random() * a.length)];
const PER_HOUR = Math.max(5, Number(process.env.GC_REACTS_PER_HOUR || 30));

let cache = null, cacheAt = 0;
function load() {
    if (cache && Date.now() - cacheAt < 15000) return cache;
    try { cache = JSON.parse(fs.readFileSync(FILE, 'utf8')) || {}; } catch (_) { cache = {}; }
    cacheAt = Date.now();
    return cache;
}
function save(o) {
    try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(o, null, 2)); cache = o; cacheAt = Date.now(); return true; }
    catch (e) { console.error('[GCAUTO] save failed:', e.message); return false; }
}
const list = () => load();
function set(jid, emojis, mode = 'admins', by = 'cmd') { const o = { ...load() }; o[jid] = { emojis, mode: mode === 'all' ? 'all' : 'admins', by, at: Date.now() }; return save(o); }
function remove(jid) { const o = { ...load() }; const had = !!o[jid]; delete o[jid]; save(o); return had; }

const liveSockets = () => Array.from((global.activeSockets instanceof Map ? global.activeSockets : new Map()).values()).filter(s => s && s.user);
const numOf = (conn) => String((conn.user && conn.user.id) || '').split(':')[0].split('@')[0];

// per-session ghanta-wari limit
const hourLog = new Map();
function allow(conn) {
    const k = numOf(conn), now = Date.now();
    const recent = (hourLog.get(k) || []).filter(t => now - t < 3600000);
    if (recent.length >= PER_HOUR) { hourLog.set(k, recent); return false; }
    recent.push(now); hourLog.set(k, recent); return true;
}

// admin check (5 min cache)
const metaCache = new Map();
async function isAdminSender(conn, groupJid, sender) {
    const k = numOf(conn) + '|' + groupJid;
    let hit = metaCache.get(k);
    if (!hit || Date.now() - hit.at > 5 * 60000) {
        try { const md = await conn.groupMetadata(groupJid); hit = { at: Date.now(), admins: new Set((md.participants || []).filter(p => p.admin).flatMap(p => [p.id, p.jid, p.phoneNumber, p.lid].filter(Boolean))) }; metaCache.set(k, hit); if (metaCache.size > 500) metaCache.delete(metaCache.keys().next().value); }
        catch (_) { return false; }
    }
    return hit.admins.has(sender);
}

const seen = new Set();
async function handleMessage(conn, mek) {
    try {
        const jid = mek && mek.key && mek.key.remoteJid;
        if (!jid || !String(jid).endsWith('@g.us') || mek.key.fromMe) return;
        const cfg = load()[jid];
        if (!cfg || !cfg.emojis || !cfg.emojis.length) return;
        const age = Date.now() - (Number((mek.messageTimestamp && mek.messageTimestamp.low) ?? mek.messageTimestamp) * 1000 || Date.now());
        if (age > 90000) return;
        const sender = mek.key.participant || mek.participant;
        if (!sender) return;
        if (cfg.mode !== 'all' && !(await isAdminSender(conn, jid, sender))) return;
        const dk = numOf(conn) + '|' + jid + '|' + mek.key.id;
        if (seen.has(dk)) return;
        seen.add(dk); if (seen.size > 3000) seen.delete(seen.values().next().value);
        if (!allow(conn)) return;
        await sleep(3000 + Math.floor(Math.random() * 17000));
        await conn.sendMessage(jid, { react: { text: rnd(cfg.emojis), key: mek.key } });
    } catch (e) { /* silent: member na ho / permission */ }
}

// ek specific message par SAB bot users (jo is group mein hain) se react
async function massReactMessage(groupJid, key, emojis) {
    const socks = liveSockets();
    let ok = 0, fail = 0;
    for (let i = 0; i < socks.length; i++) {
        const s = socks[i];
        try {
            await s.sendMessage(groupJid, { react: { text: emojis[i % emojis.length], key: { remoteJid: groupJid, id: key.id, participant: key.participant, fromMe: false } } });
            ok++;
        } catch (_) { fail++; }
        await sleep(600 + Math.floor(Math.random() * 900));
    }
    return { ok, fail, total: socks.length };
}

module.exports = { list, set, remove, handleMessage, massReactMessage, liveSockets };
