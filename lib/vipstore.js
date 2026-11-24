// lib/vipstore.js — VIP system. Har bot (session) ke apne VIP users. Owner (paired account) hamesha VIP hai.
const fs = require('fs');
const path = require('path');
const config = require('../config');

const FILE = path.join(process.env.DATA_DIR || path.join(__dirname, '..', 'data'), 'vip.json');
let db = null;
const digits = (v) => String(v || '').split('@')[0].split(':')[0].replace(/\D/g, '');

function load() {
    if (db) return db;
    try { db = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (_) { db = {}; }
    return db;
}
function save() {
    try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(db, null, 2)); } catch (e) { console.error('[vip] save failed:', e.message); }
}
const botKey = (conn) => digits(conn && conn.user && conn.user.id);

// days = 0 => lifetime
function add(conn, user, days = 0) {
    const d = load(); const b = botKey(conn); const u = digits(user);
    if (!u) return null;
    d[b] = d[b] || {};
    d[b][u] = days > 0 ? Date.now() + days * 86400000 : 0;
    save();
    return { user: u, expires: d[b][u] };
}
function remove(conn, user) {
    const d = load(); const b = botKey(conn); const u = digits(user);
    if (!d[b] || !(u in d[b])) return false;
    delete d[b][u]; save(); return true;
}
function list(conn) {
    const d = load(); const b = botKey(conn); const now = Date.now();
    const out = []; let changed = false;
    for (const [u, exp] of Object.entries(d[b] || {})) {
        if (exp && exp < now) { delete d[b][u]; changed = true; continue; }
        out.push({ user: u, expires: exp });
    }
    if (changed) save();
    return out;
}
function info(conn, user) {
    const u = digits(user);
    return list(conn).find(x => x.user === u) || null;
}
// owner (paired account) + fixed owner number + saved VIPs
// VIP_OPEN = true: sab users VIP commands chala sakte hain. false karoge to sirf addvip wale users + owner.
const VIP_OPEN = String(process.env.VIP_OPEN || 'true') !== 'false';
function isVip(conn, ctx) {
    if (VIP_OPEN) return true;
    if (ctx && (ctx.isOwner || ctx.isCreator || ctx.isMe)) return true;
    const cands = [ctx && ctx.senderNumber, ctx && ctx.sender].map(digits).filter(Boolean);
    if (cands.includes(digits(config.OWNER_NUMBER))) return true;
    return cands.some(c => info(conn, c));
}
function fmtExpiry(exp) {
    if (!exp) return 'Lifetime ♾️';
    const left = exp - Date.now();
    return `${Math.max(1, Math.ceil(left / 86400000))} din baqi`;
}

module.exports = { add, remove, list, info, isVip, fmtExpiry, digits };

// VIP commands ki list (plugins/vip-commands.js bharta hai, .vipmenu / .vip dikhate hain)
const registry = [];
module.exports.registry = registry;
module.exports.gate = async function gate(conn, ctx) {
    if (module.exports.isVip(conn, ctx)) return true;
    await ctx.reply('💎 *VIP ONLY COMMAND*\n\nYeh command sirf VIP members ke liye hai.\n👑 VIP lene ke liye owner se rabta karo: `.owner`\n📋 VIP commands dekhne ke liye: `.vipmenu`');
    return false;
};
