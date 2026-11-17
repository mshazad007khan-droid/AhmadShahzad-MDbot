// lib/botsettings.js — chhoti per-bot settings (data/botsettings.json). MongoDB ki zaroorat nahi.
const fs = require('fs');
const path = require('path');
const FILE = path.join(process.env.DATA_DIR || path.join(__dirname, '..', 'data'), 'botsettings.json');   // DATA_DIR = Railway volume
const keyOf = conn => String((conn && conn.user && conn.user.id) || 'default').split(':')[0].split('@')[0];

function loadAll() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')) || {}; } catch (_) { return {}; } }
function get(conn, name, def) {
    const v = (loadAll()[keyOf(conn)] || {})[name];
    return v === undefined ? def : v;
}
function set(conn, name, value) {
    try {
        const all = loadAll();
        const k = keyOf(conn);
        all[k] = { ...(all[k] || {}), [name]: value };
        fs.mkdirSync(path.dirname(FILE), { recursive: true });
        fs.writeFileSync(FILE, JSON.stringify(all, null, 2));
        return true;
    } catch (e) { console.error('[BOTSETTINGS] save failed:', e.message); return false; }
}
const ownerJid = conn => keyOf(conn) + '@s.whatsapp.net';
module.exports = { get, set, keyOf, ownerJid };
