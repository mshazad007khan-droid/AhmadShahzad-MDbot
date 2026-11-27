// lib/skipvoice.js (v13) — bot ki apni bheji hui voice note par bgmusic / voice-changer pipeline na chale.
// PURANA BUG: .me / .mebass ... jo voice note (ptt) bhejte hain, extras-hooks ka handleBgMusic usay "owner ki voice" samajh kar
// music mix karta tha aur ORIGINAL DELETE kar deta tha — isliye .me ki voice gayab ho jati thi.
const crypto = require('crypto');
const ids = new Set();
function newId() {
    let id;
    try { id = require('@whiskeysockets/baileys').generateMessageID(); } catch (_) {}
    if (!id) id = '3EB0' + crypto.randomBytes(8).toString('hex').toUpperCase();
    ids.add(id);
    if (ids.size > 500) ids.delete(ids.values().next().value);
    return id;
}
const has = (id) => ids.has(id);
module.exports = { newId, has };
