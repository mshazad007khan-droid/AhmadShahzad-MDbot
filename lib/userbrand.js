// lib/userbrand.js — HAR USER (paired session) ki apni branding: bot naam, owner naam, owner number, description, pics.
//  • Naam / owner / number: bot ke bheje HAR message (text, caption, footer, contact card, link-preview) mein us user ka
//    apna naam lag jata hai — download, search, song, video, sab jagah (main.js ke sendMessage wrapper se).
//  • Jo "Meta" wala verified/quoted card hai wo (options.quoted) ko hum chhoote hi nahi — wo waisa hi rehta hai.
//  • Dobara .pair / naya pairing ya logout par resetAll() sab kuch default par le aata hai.
const fs = require('fs');
const path = require('path');
const config = require('../config');
const db = require('./database');

const DATA = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const digits = (v) => String(v || '').replace(/\D/g, '');
const numOf = (conn) => typeof conn === 'string' ? digits(conn) : String((conn && conn.user && conn.user.id) || '').split(':')[0].split('@')[0].replace(/\D/g, '');

// Defaults module load par pakad lo (config.OWNER_NAME baad mein har message par badalta rehta hai)
const DEF_BOT_STYLED = '𝐀𝐡𝐦𝐚𝐝𝐒𝐡𝐚𝐡𝐳𝐚𝐝-𝐌𝐃';
const DEF_OWNER = String(config.OWNER_NAME || '').trim();
const DEF_NUMBER = digits(config.OWNER_DISPLAY_NUMBER || (config.OWNER_NUMBERS && config.OWNER_NUMBERS[0]) || '923264931117');
const esc = (t) => String(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const botVariants = [...new Set([DEF_BOT_STYLED, String(config.BOT_NAME || '').trim()].filter(Boolean))];
const BOT_RE = new RegExp(botVariants.map(esc).join('|') + '|Ahmad ?Shahzad[- ]?MD', 'gi');

// ───────────── cache (sync padhne ke liye) ─────────────
const EMPTY = Object.freeze({ bot: '', owner: '', ownerNumber: '', desc: '' });
const cache = new Map();
const clean = (v, max) => String(v == null ? '' : v).replace(/[\r\n]+/g, ' ').trim().slice(0, max || 80);
function fromCfg(cfg) {
    cfg = cfg || {};
    return {
        bot: clean(cfg.MENU_BOT_NAME, 40),
        owner: clean(cfg.MENU_OWNER_NAME || (cfg.OWNER_NAME && cfg.OWNER_NAME !== DEF_OWNER ? cfg.OWNER_NAME : ''), 40),
        ownerNumber: digits(cfg.BR_OWNER_NUMBER),
        desc: clean(cfg.BR_DESC, 200)
    };
}
function remember(conn, cfg) { const n = numOf(conn); if (n) cache.set(n, fromCfg(cfg)); }
function peek(conn) { return cache.get(numOf(conn)) || EMPTY; }
async function load(conn) {
    const n = numOf(conn); if (!n) return EMPTY;
    try { remember(n, await db.getUserConfigFromMongoDB(n)); } catch (_) {}
    return peek(conn);
}
const hasCustom = (b) => !!(b && (b.bot || b.owner || b.ownerNumber));

// ───────────── naam badalna (outgoing) ─────────────
function rw(conn, str) {
    if (typeof str !== 'string' || !str) return str;
    const b = peek(conn);
    if (!hasCustom(b)) return str;
    let out = str;
    if (b.bot) out = out.replace(BOT_RE, () => b.bot);
    if (b.owner && DEF_OWNER) out = out.split(DEF_OWNER).join(b.owner);
    if (b.ownerNumber && DEF_NUMBER) out = out.split(DEF_NUMBER).join(b.ownerNumber);
    return out;
}
function rwContent(conn, c) {
    if (!c || typeof c !== 'object' || c.react || c.delete || c.forward || c.poll) return c;
    if (!hasCustom(peek(conn))) return c;
    let o = c;
    const put = (k, v) => { if (o === c) o = { ...c }; o[k] = v; };
    for (const k of ['text', 'caption', 'footer', 'title']) {
        if (typeof c[k] === 'string') { const v = rw(conn, c[k]); if (v !== c[k]) put(k, v); }
    }
    const ad = c.contextInfo && c.contextInfo.externalAdReply;
    if (ad && typeof ad === 'object') {
        const t = rw(conn, ad.title), b = rw(conn, ad.body);
        if (t !== ad.title || b !== ad.body) put('contextInfo', { ...c.contextInfo, externalAdReply: { ...ad, title: t, body: b } });
    }
    if (c.contacts && Array.isArray(c.contacts.contacts)) {
        const list = c.contacts.contacts.map(x => (x && typeof x.vcard === 'string') ? { ...x, vcard: rw(conn, x.vcard) } : x);
        put('contacts', { ...c.contacts, displayName: rw(conn, c.contacts.displayName), contacts: list });
    }
    return o;
}

// ───────────── save ─────────────
async function setKeys(conn, obj) {
    const n = numOf(conn);
    const cur = (await db.getUserConfigFromMongoDB(n)) || {};
    const next = { ...cur };
    for (const [k, v] of Object.entries(obj)) { if (v === null || v === undefined || v === '') delete next[k]; else next[k] = v; }
    await db.updateUserConfigInMongoDB(n, next);
    cache.set(n, fromCfg(next));
    try { const c = require('../config'); if ('OWNER_NAME' in obj) c.OWNER_NAME = obj.OWNER_NAME || DEF_OWNER; } catch (_) {}
    return next;
}
const setBotName = (conn, v) => setKeys(conn, { MENU_BOT_NAME: clean(v, 40) });
const setOwnerName = (conn, v) => setKeys(conn, { MENU_OWNER_NAME: clean(v, 40), OWNER_NAME: clean(v, 40) });
const setOwnerNumber = (conn, v) => setKeys(conn, { BR_OWNER_NUMBER: digits(v) });
const setDesc = (conn, v) => setKeys(conn, { BR_DESC: clean(v, 200) });

// ───────────── pics ─────────────
const ownerPicDir = path.join(DATA, 'menu-owner');
const ownerPicFile = (conn) => path.join(ownerPicDir, numOf(conn) + '.jpg');
function getOwnerPicPath(conn) { try { const f = ownerPicFile(conn); return numOf(conn) && fs.existsSync(f) ? f : null; } catch (_) { return null; } }
async function setOwnerPic(conn, buffer) {
    fs.mkdirSync(ownerPicDir, { recursive: true });
    let out = buffer;
    try { out = await require('sharp')(buffer).rotate().resize({ width: 1080, height: 1080, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer(); } catch (_) {}
    fs.writeFileSync(ownerPicFile(conn), out);
    try { await require('./welcome').setOwnerPic(conn, buffer); } catch (_) {}   // welcome/goodbye card par bhi yehi photo
    return ownerPicFile(conn);
}
function clearOwnerPic(conn) {
    try { fs.rmSync(ownerPicFile(conn), { force: true }); } catch (_) {}
    try { require('./welcome').clearOwnerPic(conn); } catch (_) {}
}

// ───────────── RESET (naya pairing / logout) ─────────────
async function resetAll(number) {
    const n = numOf(number);
    if (!n) return false;
    cache.delete(n);
    try { await db.deleteUserConfig(n); } catch (_) {}
    for (const f of [
        path.join(DATA, 'botpics', n + '.jpg'),
        path.join(DATA, 'menu-owner', n + '.jpg'),
        path.join(DATA, 'welcome-owner', n + '.png'),
        path.join(DATA, 'welcome-owner', n + '.off'),
    ]) { try { fs.rmSync(f, { force: true }); } catch (_) {} }
    try {   // botsettings.json
        const f = path.join(DATA, 'botsettings.json');
        const all = JSON.parse(fs.readFileSync(f, 'utf8'));
        if (all && all[n]) { delete all[n]; fs.writeFileSync(f, JSON.stringify(all, null, 2)); }
    } catch (_) {}
    try { require('./welcome').resetSession(n); } catch (_) {}
    return true;
}

module.exports = {
    numOf, peek, load, remember, hasCustom, rw, rwContent,
    setBotName, setOwnerName, setOwnerNumber, setDesc, setKeys,
    getOwnerPicPath, setOwnerPic, clearOwnerPic, resetAll,
    DEF_BOT: DEF_BOT_STYLED, DEF_OWNER, DEF_NUMBER
};
