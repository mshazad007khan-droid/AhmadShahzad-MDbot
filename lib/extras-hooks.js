// lib/extras-hooks.js
// Har connected socket par 3 chhote hooks lagata hai (main handler ko bina chhede):
//   1) View-once cache  : view-once photo/video/audio aate hi download karke yaad rakh leta hai -> .vv hamesha chalta hai
//   2) Anti-delete      : upsert ke andar aaya revoke bhi pakadta hai
//   3) Status save      : owner ke status par koi react kare to wo status owner ke apne inbox mein save ho jata hai
const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage, getContentType } = require('@whiskeysockets/baileys');
const settings = require('./botsettings');
const config = require('../config');
const { handleRevokeUpsert } = require('./antidelete');
const bgm = require('./bgmusic');
const vc = require('./voicechanger');
const chauto = require('./chauto');
const kbgm = require('./kbgmusic');

// ───────── helpers ─────────
function unwrap(message) {
    let m = message, viewOnce = false;
    for (let i = 0; i < 6 && m; i++) {
        let inner = null;
        for (const k of ['viewOnceMessageV2', 'viewOnceMessageV2Extension', 'viewOnceMessage']) if (m[k] && m[k].message) { inner = m[k].message; viewOnce = true; break; }
        if (!inner) for (const k of ['ephemeralMessage', 'documentWithCaptionMessage', 'editedMessage']) if (m[k] && m[k].message) { inner = m[k].message; break; }
        if (!inner) break;
        m = inner;
    }
    return { msg: m || {}, viewOnce };
}
async function dl(media, kind) {
    const stream = await downloadContentFromMessage(media, kind);
    const chunks = [];
    for await (const c of stream) chunks.push(c);
    return Buffer.concat(chunks);
}
const mediaTypeOf = (msg) => Object.keys(msg || {}).find(k => /^(image|video|audio)Message$/.test(k));

// ───────── 1) view-once cache (global, id -> {buffer, kind, mimetype, caption, from}) ─────────
const VO_MAX_ITEMS = 30, VO_MAX_BYTES = 80 * 1024 * 1024;
if (!global.__voCache) global.__voCache = new Map();
function voPut(id, item) {
    const c = global.__voCache;
    c.set(id, item);
    let total = 0; for (const v of c.values()) total += v.buffer.length;
    while (c.size > VO_MAX_ITEMS || total > VO_MAX_BYTES) {
        const first = c.keys().next().value;
        total -= c.get(first).buffer.length;
        c.delete(first);
    }
}
// disk par bhi rakho (bot restart ke baad bhi .vv chale)
const VO_DIR = path.join(process.env.DATA_DIR || path.join(__dirname, '..', 'data'), 'vo-cache');
function voDiskPut(id, item) {
    try {
        fs.mkdirSync(VO_DIR, { recursive: true });
        const safe = String(id).replace(/[^A-Za-z0-9_-]/g, '');
        if (!safe) return;
        fs.writeFileSync(path.join(VO_DIR, safe + '.bin'), item.buffer);
        fs.writeFileSync(path.join(VO_DIR, safe + '.json'), JSON.stringify({ kind: item.kind, mimetype: item.mimetype, caption: item.caption, from: item.from, chat: item.chat }));
        const files = fs.readdirSync(VO_DIR).filter(f => f.endsWith('.json')).map(f => ({ f, t: fs.statSync(path.join(VO_DIR, f)).mtimeMs })).sort((a, b) => a.t - b.t);
        while (files.length > 60) { const x = files.shift().f.replace('.json', ''); for (const e of ['.json', '.bin']) { try { fs.rmSync(path.join(VO_DIR, x + e)); } catch (_) {} } }
    } catch (_) {}
}
function voDiskGet(id) {
    try {
        const safe = String(id || '').replace(/[^A-Za-z0-9_-]/g, '');
        if (!safe) return null;
        const meta = JSON.parse(fs.readFileSync(path.join(VO_DIR, safe + '.json'), 'utf8'));
        return { ...meta, buffer: fs.readFileSync(path.join(VO_DIR, safe + '.bin')) };
    } catch (_) { return null; }
}
const getViewOnce = (id) => global.__voCache.get(id) || voDiskGet(id) || null;

async function cacheViewOnce(mek) {
    if (!mek || !mek.message) return;
    const { msg, viewOnce } = unwrap(mek.message);
    const type = mediaTypeOf(msg);
    if (!type) return;
    const media = msg[type];
    if (!(viewOnce || media.viewOnce === true)) return;
    const kind = type.replace('Message', '');
    const buffer = await dl(media, kind);
    if (!buffer.length) return;
    const item = { buffer, kind, mimetype: media.mimetype, caption: media.caption || '', from: mek.key.participant || mek.key.remoteJid, chat: mek.key.remoteJid };
    voPut(mek.key.id, item);
    voDiskPut(mek.key.id, item);
    return item;
}

// .antivv on  -> har view-once aate hi owner ke DM mein khud aa jaye (default OFF)
async function autoForwardViewOnce(conn, mek, item) {
    try {
        if (!item || !settings.get(conn, 'antivv', false)) return;
        const owner = settings.ownerJid(conn);
        const who = String(item.from || '').split('@')[0].split(':')[0];
        const cap = `👁️ *VIEW ONCE SAVED*\n👤 From: ${who}${item.caption ? '\n📝 ' + item.caption : ''}`;
        if (item.kind === 'image') await conn.sendMessage(owner, { image: item.buffer, caption: cap });
        else if (item.kind === 'video') await conn.sendMessage(owner, { video: item.buffer, caption: cap });
        else { await conn.sendMessage(owner, { text: cap }); await conn.sendMessage(owner, { audio: item.buffer, mimetype: item.mimetype || 'audio/mp4', ptt: false }); }
    } catch (e) { console.warn('[ANTIVV] failed:', e && e.message); }
}

// ───────── 3) status cache + save on react ─────────
if (!global.__ownStatuses) global.__ownStatuses = new Map();   // "<bot>|<statusId>" -> message
const saved = new Set();

const statusEnabled = (conn) => settings.get(conn, 'statussave', true) !== false;   // default ON

// Dusron ke status bhi yaad rakho (sirf message-info, media nahi) — taake jab AAP kisi status par react/like karo
// to wo status aap ke inbox mein save ho jaye.
if (!global.__allStatuses) global.__allStatuses = new Map();
if (!global.__botStatusReacts) global.__botStatusReacts = new Map();   // bot ke apne auto-like (inhe save nahi karna)
function cacheAnyStatus(conn, mek) {
    const key = mek.key || {};
    if (key.remoteJid !== 'status@broadcast' || !mek.message) return;
    if (mek.message.reactionMessage || mek.message.protocolMessage) return;
    const c = global.__allStatuses;
    c.set(settings.keyOf(conn) + '|' + key.id, mek);
    if (c.size > 400) c.delete(c.keys().next().value);
}

async function handleOwnReactToStatus(conn, mek) {
    const rm = mek && mek.message && mek.message.reactionMessage;
    if (!rm || !rm.key || rm.key.remoteJid !== 'status@broadcast' || !rm.text) return;
    if (!(mek.key && mek.key.fromMe)) return;           // sirf AAP ka react (phone se)
    if (rm.key.fromMe) return;                           // apne hi status par react — ye alag feature hai
    if (!statusEnabled(conn)) return;
    const me = settings.keyOf(conn);
    const bt = global.__botStatusReacts.get(me + '|' + rm.key.id);
    if (bt && Date.now() - bt < 180000) return;          // ye bot ka auto-like tha, aap ka nahi
    const dedupe = 'own|' + me + '|' + rm.key.id;
    if (saved.has(dedupe)) return;
    saved.add(dedupe);
    if (saved.size > 500) saved.delete(saved.values().next().value);
    const owner = settings.ownerJid(conn);
    const status = global.__allStatuses.get(me + '|' + rm.key.id);
    const who = String(rm.key.participant || '').split('@')[0].split(':')[0];
    const head =
        `╭━━〔 💾 𝐒𝐓𝐀𝐓𝐔𝐒 𝐒𝐀𝐕𝐄𝐃 〕━━╮\n` +
        `┃ 👤 @${who || 'status'}\n` +
        `┃ Aap ne ${rm.text} react kiya — status save\n` +
        `╰━━━━━━━━━━━━━━━━━━╯\n> ${config.BOT_FOOTER || ''}`;
    try {
        if (status) await sendSavedStatus(conn, owner, status, head);
        else await conn.sendMessage(owner, { text: head + '\n\n⚠️ Ye status bot ne dekha nahi tha (bot ke online hone se pehle ka ya auto-view band tha), isliye save nahi ho saka.' });
    } catch (e) {
        console.warn('[STATUSSAVE] own-react failed:', e && e.message);
        try { await conn.sendMessage(owner, { text: head + '\n\n⚠️ Save karte waqt error: ' + (e && e.message) }); } catch (_) {}
    }
}

function cacheOwnStatus(conn, mek) {
    const key = mek.key || {};
    if (key.remoteJid !== 'status@broadcast' || !mek.message) return;
    const me = settings.keyOf(conn);
    const part = String(key.participant || '').split('@')[0].split(':')[0];
    if (!(key.fromMe || part === me)) return;
    const c = global.__ownStatuses;
    c.set(me + '|' + key.id, mek);
    if (c.size > 60) c.delete(c.keys().next().value);
}

async function sendSavedStatus(conn, owner, status, caption) {
    const { msg } = unwrap(status.message);
    const type = getContentType(msg);
    const media = msg[type];
    if (type === 'imageMessage') return conn.sendMessage(owner, { image: await dl(media, 'image'), caption });
    if (type === 'videoMessage') return conn.sendMessage(owner, { video: await dl(media, 'video'), caption });
    if (type === 'audioMessage') { await conn.sendMessage(owner, { text: caption }); return conn.sendMessage(owner, { audio: await dl(media, 'audio'), mimetype: media.mimetype || 'audio/mp4', ptt: !!media.ptt }); }
    const t = msg.conversation || (msg.extendedTextMessage && msg.extendedTextMessage.text) || '';
    return conn.sendMessage(owner, { text: `${caption}\n\n📝 ${t || '(text status)'}` });
}

async function handleStatusReact(conn, mek) {
    const rm = mek && mek.message && mek.message.reactionMessage;
    if (!rm || !rm.key || rm.key.remoteJid !== 'status@broadcast' || !rm.text) return;   // khali text = react hata diya
    if (!statusEnabled(conn)) return;
    if (mek.key.fromMe) return;
    const me = settings.keyOf(conn);
    const reactor = String(mek.key.participant || mek.key.remoteJid || '');
    const reactorNum = reactor.split('@')[0].split(':')[0];
    if (reactorNum === me) return;
    const dedupe = me + '|' + rm.key.id + '|' + reactorNum;
    if (saved.has(dedupe)) return;
    saved.add(dedupe);
    if (saved.size > 500) saved.delete(saved.values().next().value);

    const owner = settings.ownerJid(conn);
    const status = global.__ownStatuses.get(me + '|' + rm.key.id);
    const head =
        `╭━━〔 💾 𝐒𝐓𝐀𝐓𝐔𝐒 𝐒𝐀𝐕𝐄𝐃 〕━━╮\n` +
        `┃ 👤 @${reactorNum}\n` +
        `┃ ${rm.text} ne aap ke status par react kiya\n` +
        `╰━━━━━━━━━━━━━━━━━━╯\n> ${config.BOT_FOOTER || ''}`;
    try {
        if (status) await sendSavedStatus(conn, owner, status, head);
        else await conn.sendMessage(owner, { text: head + '\n\n⚠️ Ye status bot ne dekha nahi tha (bot online hone se pehle ka), isliye save nahi ho saka.', mentions: [reactor] });
    } catch (e) {
        console.warn('[STATUSSAVE] failed:', e && e.message);
        try { await conn.sendMessage(owner, { text: head + '\n\n⚠️ Save karte waqt error aaya: ' + (e && e.message) }); } catch (_) {}
    }
}

// ───────── 4) owner ki apni voice note: voice-change (.vc...) + .bgmusicvoice ek hi pipeline mein ─────────
// Pehle (agar on ho) voice ko girl/man/robot/... mein badalta hai, phir (agar on ho) usi par
// background music mix karta hai, aur sirf ek baar final voice note bhejta hai.
const bgmBusy = new Set();
// Channel (newsletter) ki media encrypted nahi hoti — mediaKey nahi hoti, seedha CDN se uthani padti hai
async function dlNewsletterMedia(media) {
    const axios = require('axios');
    const url = media.url && /^https?:/.test(media.url) ? media.url : (media.directPath ? 'https://mmg.whatsapp.net' + media.directPath : null);
    if (!url) throw new Error('channel media ka link nahi mila');
    const r = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    return Buffer.from(r.data);
}

async function handleBgMusic(conn, mek) {
    if (!mek || !mek.key || !mek.key.fromMe || !mek.message) return;
    const vcOn = vc.isActive(conn);
    const kOn = kbgm.isActive(conn);                  // v8: Kashmir bgmusic (.kbgmusic1..4)
    const bgmOn = !kOn && bgm.isActive(conn);
    if (!vcOn && !bgmOn && !kOn) return;
    const { msg } = unwrap(mek.message);
    const a = msg.audioMessage;
    if (!a || !a.ptt) return;                         // sirf voice note (record kiya hua)
    if (bgmBusy.has(mek.key.id)) return;
    bgmBusy.add(mek.key.id);
    if (bgmBusy.size > 200) bgmBusy.delete(bgmBusy.values().next().value);
    const chat = mek.key.remoteJid;
    const isChannel = String(chat).endsWith('@newsletter');
    try {
        let input;
        if (isChannel) {
            // CHANNEL: voice change + bgmusic ab channel mein bhi chalte hain
            try { input = await dl(a, 'audio'); } catch (_) { input = await dlNewsletterMedia(a); }
        } else input = await dl(a, 'audio');
        if (vcOn) input = await vc.applyPreset(input, vc.activePreset(conn));
        if (kOn) input = await kbgm.mix(input, kbgm.status(conn).track);
        else if (bgmOn) input = await bgm.mixVoiceWithMusic(input, { track: bgm.status(conn).track });
        const wasVcArmedOnce = vcOn && !vc.status(conn).always;
        const wasBgmArmedOnce = bgmOn && !bgm.status(conn).always;
        const wasKArmedOnce = kOn && !kbgm.status(conn).always;
        await conn.sendMessage(chat, { audio: input, mimetype: 'audio/ogg; codecs=opus', ptt: true });
        try { await conn.sendMessage(chat, { delete: mek.key }); }   // asli (bina badlaw wali) voice hata do
        catch (_) {
            if (isChannel) { try { await conn.sendMessage(settings.ownerJid(conn), { text: '⚠️ Channel mein nayi (music/voice wali) voice chali gayi, lekin purani asli voice delete nahi ho saki — usay channel se khud delete kar dein.' }); } catch (_) {} }
        }
        if (wasVcArmedOnce) vc.disarm(conn);
        if (wasBgmArmedOnce) bgm.disarm(conn);
        if (wasKArmedOnce) kbgm.disarm(conn);
    } catch (e) {
        console.warn('[VOICE-PIPELINE] failed:', e && e.message);
        try { await conn.sendMessage(settings.ownerJid(conn), { text: '⚠️ Voice note process karte waqt error aaya: ' + (e && e.message) }); } catch (_) {}
    }
}

// `messages.reaction` event shape (baileys): [{ key: <original msg key>, reaction: { text, key, senderTimestampMs } }]
// key.remoteJid === 'status@broadcast' => ye kisi status par react/like hai.
async function handleStatusReactionEvent(conn, item) {
    try {
        const { key, reaction } = item || {};
        if (!key || key.remoteJid !== 'status@broadcast' || !reaction) return;
        if (!statusEnabled(conn)) return;
        const me = settings.keyOf(conn);
        const reactor = String(reaction.key && (reaction.key.participant || reaction.key.remoteJid) || key.participant || '');
        const reactorNum = reactor.split('@')[0].split(':')[0];
        if (!reaction.text) return;   // reaction hata di gayi
        if (!reactorNum || reactorNum === me) {
            // AAP ne kisi (dusre) ke status par react/like kiya -> wo status save
            if (key.fromMe) return;
            const bt = global.__botStatusReacts.get(me + '|' + key.id);
            if (bt && Date.now() - bt < 180000) return;
            return handleOwnReactToStatus(conn, { key: { fromMe: true, id: 'ev-' + key.id }, message: { reactionMessage: { key, text: reaction.text } } });
        }
        const dedupe = me + '|' + key.id + '|' + reactorNum + '|' + reaction.text;
        if (saved.has(dedupe)) return;
        saved.add(dedupe);
        if (saved.size > 500) saved.delete(saved.values().next().value);

        const owner = settings.ownerJid(conn);
        const status = global.__ownStatuses.get(me + '|' + key.id);
        const head =
            `╭━━〔 💾 𝐒𝐓𝐀𝐓𝐔𝐒 𝐒𝐀𝐕𝐄𝐃 〕━━╮\n` +
            `┃ 👤 @${reactorNum}\n` +
            `┃ ${reaction.text} ne aap ke status par react/like kiya\n` +
            `╰━━━━━━━━━━━━━━━━━━╯\n> ${config.BOT_FOOTER || ''}`;
        if (status) await sendSavedStatus(conn, owner, status, head);
        else await conn.sendMessage(owner, { text: head + '\n\n⚠️ Ye status bot ne dekha nahi tha (bot online hone se pehle ka), isliye save nahi ho saka.', mentions: [reactor] });
    } catch (e) { console.warn('[STATUSSAVE] reaction-event failed:', e && e.message); }
}

function attach(conn, store) {
    conn.ev.on('messages.upsert', async ({ messages }) => {
        for (const mek of messages || []) {
            try {
                // FIX (view-once): main.js message ka view-once wrapper hata deta hai (mek.message = unwrap(...)).
                // Cache pehle await se PEHLE, asli message ki copy par chalna chahiye warna "viewOnce" ka nishan
                // gayab ho jata tha aur .vv ko media milti hi nahi thi.
                const snap = { key: mek.key, message: mek.message };
                cacheViewOnce(snap).then(it => autoForwardViewOnce(conn, mek, it)).catch(() => {});
                cacheAnyStatus(conn, mek);
                cacheOwnStatus(conn, mek);
                await handleStatusReact(conn, mek);
                await handleOwnReactToStatus(conn, mek);
                await handleRevokeUpsert(conn, mek, store);
                handleBgMusic(conn, snap).catch(() => {});
                chauto.handlePost(conn, mek).catch(() => {});   // v8: channel ki nayi post par auto-react
            } catch (e) { console.warn('[EXTRAS] hook error:', e && e.message); }
        }
    });
    // v8: connect hote hi auto-react wale channels follow + live-updates subscribe
    conn.ev.on('connection.update', (u) => { if (u && u.connection === 'open') setTimeout(() => chauto.ensureOne(conn).catch(() => {}), 8000); });
    // Status "like" (quick double-tap) aksar sirf is event se aata hai, upsert se nahi
    conn.ev.on('messages.reaction', async (reactions) => {
        for (const item of reactions || []) {
            try { await handleStatusReactionEvent(conn, item); } catch (e) { console.warn('[EXTRAS] reaction hook error:', e && e.message); }
        }
    });
}

module.exports = { attach, getViewOnce, unwrap, statusEnabled };
