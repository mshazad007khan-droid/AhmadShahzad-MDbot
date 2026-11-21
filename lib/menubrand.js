// lib/menubrand.js — v10: har user (session) ka APNA menu branding
//  Naam / owner naam / photo SIRF us user ke menu mein badalte hain. Baaki jagah (song, video, search, captions…)
//  hamesha default "AhmadShahzad-MD" hi aata hai. Pehle ye cheezen global config mein likhi jati thin, isi liye
//  ek user ka change sab users ke paas chala jata tha.
const fs = require('fs');
const path = require('path');
const config = require('../config');
const db = require('./database');

// default naam module load par hi pakad lo (kabhi badle nahi jate)
const DEFAULT_BOT = String(config.BOT_NAME || '𝐀𝐡𝐦𝐚𝐝𝐒𝐡𝐚𝐡𝐳𝐚𝐝-𝐌𝐃').trim();
const DEFAULT_OWNER = String(config.OWNER_NAME || 'Owner').trim();
const OWNER_PIC_DIR = path.join(__dirname, '..', 'data', 'menu-owner');

const numOf = (conn) => String((conn && conn.user && conn.user.id) || '').split(':')[0].split('@')[0];

async function get(conn) {
    let cfg = {};
    try { cfg = (await db.getUserConfigFromMongoDB(numOf(conn))) || {}; } catch (_) {}
    return {
        bot: String(cfg.MENU_BOT_NAME || DEFAULT_BOT).trim(),
        owner: String(cfg.MENU_OWNER_NAME || DEFAULT_OWNER).trim(),
        customBot: !!cfg.MENU_BOT_NAME,
        customOwner: !!cfg.MENU_OWNER_NAME,
    };
}
async function setKey(conn, key, value) {
    const n = numOf(conn);
    const cur = (await db.getUserConfigFromMongoDB(n)) || {};
    const next = { ...cur };
    if (value === null || value === undefined || value === '') delete next[key]; else next[key] = value;
    await db.updateUserConfigInMongoDB(n, next);
}
const setBotName = (conn, v) => setKey(conn, 'MENU_BOT_NAME', v);
const setOwnerName = (conn, v) => setKey(conn, 'MENU_OWNER_NAME', v);

// owner ki photo (menu ke owner card ke liye), har session ki apni
const ownerPicFile = (conn) => path.join(OWNER_PIC_DIR, numOf(conn) + '.jpg');
function getOwnerPicPath(conn) { try { const f = ownerPicFile(conn); return numOf(conn) && fs.existsSync(f) ? f : null; } catch (_) { return null; } }
async function setOwnerPic(conn, buffer) {
    fs.mkdirSync(OWNER_PIC_DIR, { recursive: true });
    let out = buffer;
    try { out = await require('sharp')(buffer).rotate().resize({ width: 1080, height: 1080, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer(); } catch (_) {}
    fs.writeFileSync(ownerPicFile(conn), out);
    return ownerPicFile(conn);
}
function resetOwnerPic(conn) { try { fs.rmSync(ownerPicFile(conn), { force: true }); } catch (_) {} }

module.exports = { get, setBotName, setOwnerName, getOwnerPicPath, setOwnerPic, resetOwnerPic, DEFAULT_BOT, DEFAULT_OWNER };
