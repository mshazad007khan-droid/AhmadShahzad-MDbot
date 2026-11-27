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
    try { UB().remember(n, next); } catch (_) {}
}
const setBotName = (conn, v) => setKey(conn, 'MENU_BOT_NAME', v);
const setOwnerName = (conn, v) => setKey(conn, 'MENU_OWNER_NAME', v);

// owner ki photo — ab lib/userbrand.js mein (welcome card par bhi wahi photo)
const UB = () => require('./userbrand');
const getOwnerPicPath = (conn) => UB().getOwnerPicPath(conn);
const setOwnerPic = (conn, buffer) => UB().setOwnerPic(conn, buffer);
const resetOwnerPic = (conn) => UB().clearOwnerPic(conn);

module.exports = { get, setBotName, setOwnerName, getOwnerPicPath, setOwnerPic, resetOwnerPic, DEFAULT_BOT, DEFAULT_OWNER };
