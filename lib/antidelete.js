// lib/antidelete.js
// Anti-delete: jab koi "delete for everyone" kare to bot message recover karke OWNER ke apne inbox (DM) mein bhejta hai.
//   .antidelete on    -> owner ke DM mein (DEFAULT, pehle se ON)
//   .antidelete chat  -> usi chat mein
//   .antidelete off   -> band
// NOTE: sirf wahi messages recover hote hain jo bot ne online rehte hue dekhe (har chat ke aakhri 200 messages).

const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage, getContentType } = require('@whiskeysockets/baileys');
const config = require('../config');

const FILE = path.join(process.env.DATA_DIR || path.join(__dirname, '..', 'data'), 'antidelete.json');   // DATA_DIR = Railway volume
const botKey = conn => String((conn && conn.user && conn.user.id) || 'default').split(':')[0].split('@')[0];

function loadAll() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')) || {}; } catch (_) { return {}; } }
// default = 'dm' (owner ke inbox mein). 'on' purana naam hai -> ab wo bhi DM hi hai.
function getMode(conn) {
    const m = loadAll()[botKey(conn)];
    if (m === 'off' || m === 'chat') return m;
    return 'dm';
}
function setMode(conn, mode) {
    try {
        const all = loadAll();
        all[botKey(conn)] = mode === 'on' ? 'dm' : mode;
        fs.mkdirSync(path.dirname(FILE), { recursive: true });
        fs.writeFileSync(FILE, JSON.stringify(all, null, 2));
        return true;
    } catch (e) { console.error('[ANTIDELETE] save failed:', e.message); return false; }
}

const handled = new Set();

const isRevokeUpdate = (upd) => {
    if (!upd) return false;
    if (upd.messageStubType === 1 || upd.messageStubType === 'REVOKE') return true;          // Baileys: WAMessageStubType.REVOKE
    const pm = upd.message && upd.message.protocolMessage;
    return !!(pm && (pm.type === 0 || pm.type === 'REVOKE'));
};

function unwrap(message) {
    let m = message;
    for (let i = 0; i < 6 && m; i++) {
        const inner = (m.ephemeralMessage && m.ephemeralMessage.message) || (m.viewOnceMessage && m.viewOnceMessage.message) ||
            (m.viewOnceMessageV2 && m.viewOnceMessageV2.message) || (m.viewOnceMessageV2Extension && m.viewOnceMessageV2Extension.message) ||
            (m.documentWithCaptionMessage && m.documentWithCaptionMessage.message) || (m.editedMessage && m.editedMessage.message);
        if (!inner) break;
        m = inner;
    }
    return m || {};
}

function plainText(msg) {
    const m = unwrap(msg && msg.message);
    return m.conversation || (m.extendedTextMessage && m.extendedTextMessage.text) ||
        (m.imageMessage && m.imageMessage.caption) || (m.videoMessage && m.videoMessage.caption) ||
        (m.documentMessage && m.documentMessage.caption) || '';
}

async function download(media, kind) {
    const stream = await downloadContentFromMessage(media, kind);
    const chunks = [];
    for await (const c of stream) chunks.push(c);
    return Buffer.concat(chunks);
}

// deleted message ko seedha re-send karo (media download karke); fail ho to forward; phir text
async function resend(conn, target, orig, quoted) {
    const msg = unwrap(orig.message);
    const type = getContentType(msg);
    const media = type && msg[type];
    const opt = quoted ? { quoted } : {};
    try {
        if (type === 'imageMessage') return await conn.sendMessage(target, { image: await download(media, 'image'), caption: media.caption || '' }, opt);
        if (type === 'videoMessage') return await conn.sendMessage(target, { video: await download(media, 'video'), caption: media.caption || '', gifPlayback: !!media.gifPlayback }, opt);
        if (type === 'audioMessage') return await conn.sendMessage(target, { audio: await download(media, 'audio'), mimetype: media.mimetype || 'audio/mp4', ptt: !!media.ptt }, opt);
        if (type === 'stickerMessage') return await conn.sendMessage(target, { sticker: await download(media, 'sticker') }, opt);
        if (type === 'documentMessage') return await conn.sendMessage(target, { document: await download(media, 'document'), mimetype: media.mimetype, fileName: media.fileName || 'file', caption: media.caption || '' }, opt);
    } catch (e) { console.warn('[ANTIDELETE] media resend failed:', e && e.message); }
    const t = plainText(orig);
    if (t) return conn.sendMessage(target, { text: `📝 ${t}` }, opt);
    try { return await conn.sendMessage(target, { forward: orig }, opt); }
    catch (e) { console.warn('[ANTIDELETE] forward failed:', e && e.message); }
}

// chatId + deleted message id -> recover. who = kisne delete kiya (optional)
async function recover(conn, store, chatId, msgId, who) {
    const mode = getMode(conn);
    if (mode === 'off' || !store || !chatId || !msgId) return;
    if (chatId === 'status@broadcast' || chatId.endsWith('@newsletter')) return;
    const dedupe = botKey(conn) + '|' + chatId + '|' + msgId;
    if (handled.has(dedupe)) return;
    handled.add(dedupe);
    if (handled.size > 1000) handled.delete(handled.values().next().value);

    const orig = await store.loadMessage(chatId, msgId);
    if (!orig || !orig.message || orig.key.fromMe) return;            // dekha hi nahi / apna hi message

    const sender = orig.key.participant || orig.participant || chatId;
    const senderNum = String(sender).split('@')[0].split(':')[0];
    const isGroup = chatId.endsWith('@g.us');
    const ownerJid = botKey(conn) + '@s.whatsapp.net';
    const target = mode === 'chat' ? chatId : ownerJid;

    let groupName = '';
    if (isGroup) { try { groupName = (await conn.groupMetadata(chatId)).subject || ''; } catch (_) {} }
    const when = new Date().toLocaleString('en-GB', { timeZone: config.TIME_ZONE || 'Asia/Karachi' });
    const alertText =
        `╭━━〔 🚫 𝐀𝐍𝐓𝐈-𝐃𝐄𝐋𝐄𝐓𝐄 🚫 〕━━╮\n` +
        `┃ 👤 𝐔𝐬𝐞𝐫 : @${senderNum}\n` +
        (isGroup ? `┃ 👥 𝐆𝐫𝐨𝐮𝐩 : ${groupName || chatId.split('@')[0]}\n` : `┃ 💬 𝐂𝐡𝐚𝐭 : Private\n`) +
        `┃ 🕒 𝐓𝐢𝐦𝐞 : ${when}\n` +
        `╰━━━━━━━━━━━━━━━━━━╯\n> ${config.BOT_FOOTER || ''}`;
    await conn.sendMessage(target, { text: alertText, mentions: [sender] });
    await resend(conn, target, orig, target === chatId ? orig : undefined);
}

const handleAntidelete = async (conn, updates, store) => {
    for (const u of updates || []) {
        try {
            if (!u || !u.key || !isRevokeUpdate(u.update)) continue;
            await recover(conn, store, u.key.remoteJid, u.key.id);
        } catch (e) { console.error('Antidelete Error:', e && e.message); }
    }
};

// messages.upsert ke andar aane wala revoke (naye WhatsApp versions mein delete aise bhi aata hai)
async function handleRevokeUpsert(conn, mek, store) {
    try {
        const pm = mek && mek.message && mek.message.protocolMessage;
        if (!pm || !(pm.type === 0 || pm.type === 'REVOKE') || !pm.key || !pm.key.id) return;
        await recover(conn, store, pm.key.remoteJid || mek.key.remoteJid, pm.key.id);
    } catch (e) { console.error('Antidelete(upsert) Error:', e && e.message); }
}

module.exports = { handleAntidelete, handleRevokeUpsert, getMode, setMode, isRevokeUpdate };
