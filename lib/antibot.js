// lib/antibot.js — group mein dusre ke lagaye hue BOT ko pakadta hai.
//   1st baar : warning (@user apna bot private karo) + bot ka message delete (agar bot admin hai)
//   grace    : warning ke baad 90 second ka mauqa (wo bot private kar le)
//   2nd baar : group se remove
// Admins aur khud owner par kuch nahi hota.
//
// Pehchan (heuristic — WhatsApp bot ko "bot" likh kar nahi bhejta, isliye message ID / type se andaza):
//   • Baileys-style message ID  : BAE5…(16 chars)  ya  3EB0… jiski length 30+ ho
//   • Button / list / interactive / template message (normal user ye bhej hi nahi sakta)
//   • externalAdReply wala link-card (bots ka famous style)
//   • ANTIBOT_STRICT=1 env: 3EB0… (22 chars, naye Baileys) ko bhi bot maano — lekin WhatsApp Web
//     use karne wale ko galti se pakad sakta hai, isliye default band hai.
const fs = require('fs');
const path = require('path');

const FILE = path.join(process.env.DATA_DIR || path.join(__dirname, '..', 'data'), 'antibot.json');
const GRACE_MS = 90 * 1000;

let store = null;
function load() {
    if (store) return store;
    try { store = JSON.parse(fs.readFileSync(FILE, 'utf8')) || {}; } catch (_) { store = {}; }
    store.groups = store.groups || {};     // "<bot>|<group>": { on, allow: [numbers] }
    store.warns = store.warns || {};       // "<bot>|<group>|<number>": { at, count }
    return store;
}
let timer = null;
function save() {
    clearTimeout(timer);
    timer = setTimeout(() => {
        try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(store, null, 2)); }
        catch (e) { console.error('[ANTIBOT] save failed:', e.message); }
    }, 300);
}

const botNum = (conn) => String((conn && conn.user && conn.user.id) || '').split(':')[0].split('@')[0];
const numOf = (jid) => String(jid || '').split('@')[0].split(':')[0];
const gKey = (conn, group) => `${botNum(conn)}|${group}`;

function isOn(conn, group) { const g = load().groups[gKey(conn, group)]; return !!(g && g.on); }
function setOn(conn, group, on) {
    const st = load(); const k = gKey(conn, group);
    st.groups[k] = { ...(st.groups[k] || {}), on: !!on };
    save();
}
function allow(conn, group, number, yes = true) {
    const st = load(); const k = gKey(conn, group);
    const g = st.groups[k] = st.groups[k] || { on: false };
    g.allow = (g.allow || []).filter(n => n !== number);
    if (yes) g.allow.push(number);
    save();
}
const allowed = (conn, group) => (load().groups[gKey(conn, group)] || {}).allow || [];

// ───────── detection ─────────
const BOT_TYPES = ['buttonsMessage', 'listMessage', 'templateMessage', 'interactiveMessage', 'buttonsResponseMessage_', 'highlyStructuredMessage'];
function innerOf(message) {
    let m = message;
    for (let i = 0; i < 5 && m; i++) {
        const n = (m.ephemeralMessage || m.viewOnceMessage || m.viewOnceMessageV2 || m.documentWithCaptionMessage || m.editedMessage || {}).message;
        if (!n) break; m = n;
    }
    return m || {};
}
function looksLikeBot(mek) {
    const id = String((mek.key && mek.key.id) || '');
    if (id.startsWith('BAE5') && id.length === 16) return 'baileys-id';
    if (id.startsWith('3EB0') && id.length >= 30) return 'baileys-id';
    if (process.env.ANTIBOT_STRICT === '1' && id.startsWith('3EB0') && id.length === 22) return 'baileys-id22';
    const msg = innerOf(mek.message);
    for (const t of BOT_TYPES) if (msg[t]) return 'interactive:' + t;
    // messageContextInfo ke saath interactive wrapper
    const viaWrap = (mek.message && (mek.message.viewOnceMessage || mek.message.viewOnceMessageV2) || {}).message;
    if (viaWrap && viaWrap.interactiveMessage) return 'interactive';
    for (const k of Object.keys(msg)) {
        const ci = msg[k] && typeof msg[k] === 'object' ? msg[k].contextInfo : null;
        if (ci && ci.externalAdReply) return 'externalAdReply';
    }
    return null;
}

// ───────── main check (main.js se har group message par) ─────────
// return true  => message handle ho gaya (command chalane ki zaroorat nahi)
async function check(conn, mek, ctx) {
    const { from, sender, senderAlt, isAdmins, isBotAdmins } = ctx;
    if (!isOn(conn, from)) return false;
    if (mek.key.fromMe) return false;
    if (isAdmins) return false;                       // admins ko nahi chhedte
    const reason = looksLikeBot(mek);
    if (!reason) return false;

    const num = numOf(senderAlt || sender);
    const lidNum = numOf(sender);
    if (allowed(conn, from).includes(num) || allowed(conn, from).includes(lidNum)) return false;
    if (num === botNum(conn)) return false;

    const st = load();
    const wk = `${botNum(conn)}|${from}|${num}`;
    const w = st.warns[wk];
    const now = Date.now();
    const target = (senderAlt && String(senderAlt).includes('@')) ? sender : sender;   // remove ke liye jo jid group mein hai wahi do
    const mention = [sender];

    if (!w) {
        st.warns[wk] = { at: now, count: 1 };
        save();
        try {
            await conn.sendMessage(from, {
                text:
`╭━━━〔 ⚠️ 𝐀𝐍𝐓𝐈 𝐁𝐎𝐓 〕━━━╮
┃ @${num}
┃ Aap ka *bot* is group mein detect hua hai 🤖
┃
┃ ✅ Apna bot *PRIVATE* kar lein
┃    (bot mein: .mode private)
┃
┃ 🚫 Dobara bot ka message aaya to
┃    aap ko group se *REMOVE* kar diya jayega
╰━━━━━━━━━━━━━━━━━━━╯`,
                mentions: mention
            }, { quoted: mek });
        } catch (_) {}
        if (isBotAdmins) { try { await conn.sendMessage(from, { delete: mek.key }); } catch (_) {} }
        return true;
    }

    if (now - w.at < GRACE_MS) {      // abhi mauqa chal raha hai — bas message hata do
        if (isBotAdmins) { try { await conn.sendMessage(from, { delete: mek.key }); } catch (_) {} }
        return true;
    }

    // 2nd offence -> remove
    if (!isBotAdmins) {
        if (now - (w.noAdminNote || 0) > 10 * 60 * 1000) {
            w.noAdminNote = now; save();
            try { await conn.sendMessage(from, { text: `⚠️ @${num} ka bot dobara dikha, lekin main *admin nahi hu* isliye remove nahi kar sakta. Mujhe admin banao.`, mentions: mention }); } catch (_) {}
        }
        return true;
    }
    try {
        await conn.groupParticipantsUpdate(from, [target], 'remove');
        await conn.sendMessage(from, { text: `🚫 @${num} ko group se remove kar diya gaya — bot private nahi kiya gaya.`, mentions: mention });
        delete st.warns[wk]; save();
    } catch (e) {
        console.error('[ANTIBOT] remove failed:', e.message);
    }
    return true;
}

function resetWarn(conn, group, number) {
    const st = load(); delete st.warns[`${botNum(conn)}|${group}|${number}`]; save();
}
function warnCount(conn, group) {
    const st = load(); const p = `${botNum(conn)}|${group}|`;
    return Object.keys(st.warns).filter(k => k.startsWith(p)).length;
}

module.exports = { check, isOn, setOn, allow, allowed, looksLikeBot, resetWarn, warnCount };
