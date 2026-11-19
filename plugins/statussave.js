const { cmd } = require('../arslan');
const { downloadContentFromMessage, downloadMediaMessage } = require('@whiskeysockets/baileys');
const settings = require('../lib/botsettings');
const config = require('../config');
const { unwrap, findCtx } = require('./vv');

// ═══════════════════════════════════════════════════════════════════════
//  v7  STATUS SAVE
//  1) Kisi bhi status par REPLY karke likho:  save   ya   send   ya   sendme   (bina dot ke bhi chalta hai)
//     ya  .save / .sv / .sendme  -> status (photo / video / audio / text) aap ke apne inbox mein aa jata hai.
//     Ye tareeqa bot ke online hone se pehle ke status par bhi chalta hai — reply ke saath media ki
//     chabi khud WhatsApp bhejta hai.
//  2) .statussave on/off  -> status par react/like karne par auto-save (extras-hooks) — purana tareeqa.
// ═══════════════════════════════════════════════════════════════════════

const WORDS = new Set(['save', 'send', 'sendme', 'sv', 'snd']);
const MEDIA_RE = /^(image|video|audio|sticker|document)Message$/;
const ownerJid = (conn) => settings.ownerJid(conn);

async function streamToBuffer(src, kind) {
    const stream = await downloadContentFromMessage(src, kind);
    const chunks = [];
    for await (const c of stream) chunks.push(c);
    return Buffer.concat(chunks);
}

async function getBuffer(conn, type, media, fullMsg) {
    const kind = type.replace('Message', '');
    const errs = [];
    try { const b = await streamToBuffer(media, kind); if (b.length) return b; } catch (e) { errs.push(e.message); }
    if (fullMsg) {
        try {
            const b = await downloadMediaMessage(fullMsg, 'buffer', {}, { reuploadRequest: conn.updateMediaMessage, logger: console });
            if (b && b.length) return b;
        } catch (e) { errs.push(e.message); }
    }
    throw new Error('Media download nahi hui (' + errs.filter(Boolean).join(' | ') + ')');
}

async function saveQuoted(conn, mek, m, { isCreator, reply }, quiet) {
    if (!isCreator) { if (!quiet) return reply('*YEH COMMAND SIRF BOT OWNER KE LIYE HAI 😎*'); return; }
    const ctxInfo = findCtx(mek.message);
    if (!ctxInfo.quotedMessage && !ctxInfo.stanzaId) {
        if (quiet) return;
        return reply('*💾 KISI STATUS (YA MEDIA) PAR REPLY KARO*\n\nPhir likho: `save` ya `send` ya `.save`\nStatus aap ke apne inbox mein aa jayega.');
    }
    const owner = ownerJid(conn);
    const me = settings.keyOf(conn);

    // quoted content: reply ke saath aaya, warna bot ke status-cache se
    let qmsg = ctxInfo.quotedMessage ? unwrap(ctxInfo.quotedMessage).msg : null;
    let fullMsg = null;
    const cachedStatus = ctxInfo.stanzaId && global.__allStatuses && global.__allStatuses.get(me + '|' + ctxInfo.stanzaId);
    if (cachedStatus && cachedStatus.message) {
        fullMsg = { key: cachedStatus.key, message: cachedStatus.message };
        if (!qmsg || !Object.keys(qmsg).some(k => MEDIA_RE.test(k) || k === 'extendedTextMessage' || k === 'conversation')) qmsg = unwrap(cachedStatus.message).msg;
    }
    if (!qmsg) { if (quiet) return; return reply('❌ Is message ka content nahi mila.'); }

    const type = Object.keys(qmsg).find(k => MEDIA_RE.test(k));
    const who = String(ctxInfo.participant || (cachedStatus && cachedStatus.key && cachedStatus.key.participant) || '').split('@')[0].split(':')[0];
    const head = `💾 *STATUS SAVED*${who ? '\n👤 @' + who : ''}`;
    const foot = config.BOT_FOOTER ? '\n> ' + config.BOT_FOOTER : '';

    conn.sendMessage(mek.key.remoteJid, { react: { text: '💾', key: mek.key } }).catch(() => {});
    try {
        if (type) {
            const media = qmsg[type];
            const fallbackMsg = fullMsg || (ctxInfo.stanzaId ? { key: { remoteJid: ctxInfo.remoteJid || mek.key.remoteJid, id: ctxInfo.stanzaId, participant: ctxInfo.participant, fromMe: false }, message: { [type]: media } } : null);
            const buffer = await getBuffer(conn, type, media, fallbackMsg);
            const cap = ((media.caption ? media.caption + '\n\n' : '') + head + foot).trim();
            if (type === 'imageMessage') await conn.sendMessage(owner, { image: buffer, caption: cap });
            else if (type === 'videoMessage') await conn.sendMessage(owner, { video: buffer, caption: cap, mimetype: media.mimetype || 'video/mp4' });
            else if (type === 'audioMessage') { await conn.sendMessage(owner, { text: head }); await conn.sendMessage(owner, { audio: buffer, mimetype: media.mimetype || 'audio/mp4', ptt: Boolean(media.ptt) }); }
            else if (type === 'stickerMessage') await conn.sendMessage(owner, { sticker: buffer });
            else await conn.sendMessage(owner, { document: buffer, mimetype: media.mimetype || 'application/octet-stream', fileName: media.fileName || 'file', caption: head });
        } else {
            const t = qmsg.conversation || (qmsg.extendedTextMessage && qmsg.extendedTextMessage.text) || '';
            if (!t) { if (quiet) return; return reply('❌ Ye message save nahi ho sakta (na media na text).'); }
            await conn.sendMessage(owner, { text: `${head}\n\n📝 ${t}${foot}` });
        }
        conn.sendMessage(mek.key.remoteJid, { react: { text: '✅', key: mek.key } }).catch(() => {});
    } catch (e) {
        console.log('[STATUSSAVE] failed:', e.message);
        conn.sendMessage(mek.key.remoteJid, { react: { text: '❌', key: mek.key } }).catch(() => {});
        try { await conn.sendMessage(owner, { text: '*❌ STATUS SAVE NAHI HUA*\n_' + e.message + '_\n\nStatus 24 ghante se purana to nahi?' }); } catch (_) {}
    }
}

// .save .sv .sendme ... (dot ke saath)
cmd({
    pattern: 'save',
    alias: ['sv', 'sendme', 'send', 'snd', 'savestatus', 'ssave'],
    desc: 'Status/media par reply karo -> aap ke inbox mein save (Owner)',
    category: 'owner',
    use: 'status par reply: save | send | .save',
    filename: __filename
}, (conn, mek, m, ctx) => saveQuoted(conn, mek, m, ctx, false));

// bina dot ke: sirf owner ka reply, sirf yehi lafz -> chup chap (koi aur message nahi chheda jata)
cmd({
    on: 'body',
    allowUnprefixedInGroups: true,
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, ctx) => {
    try {
        if (ctx.isCmd || !ctx.isCreator) return;
        const w = String(ctx.body || '').trim().toLowerCase();
        if (!WORDS.has(w)) return;
        await saveQuoted(conn, mek, m, ctx, true);
    } catch (e) { console.log('[STATUSSAVE-hook]', e.message); }
});

// .statussave on/off  (react/like karne par auto save)
cmd({
    pattern: 'statussave',
    alias: ['autostatussave', 'ss-save', 'statusreactsave'],
    desc: 'Status react/like karne par status auto-save on/off',
    category: 'owner',
    react: '💾',
    use: '.statussave on | off',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const { args, reply } = ctx;
    if (!(ctx.isCreator || ctx.isOwner)) return reply('*YEH COMMAND SIRF BOT OWNER KE LIYE HAI 😎*');
    const a = String(args[0] || '').toLowerCase();
    if (['on', 'enable', 'true'].includes(a)) return settings.set(conn, 'statussave', true) ? reply('*💾 STATUS SAVE ON*\n1️⃣ Koi aap ke status par react/like kare → aap ka status inbox mein save.\n2️⃣ Aap kisi ke status par react/like karo → wo status inbox mein save.\n\n_Aur kisi bhi status par reply karke `save` likho — ye bot ke online hone se pehle ke status par bhi chalta hai._') : reply('❌ Save nahi hua.');
    if (['off', 'disable', 'false'].includes(a)) return settings.set(conn, 'statussave', false) ? reply('*💾 STATUS SAVE OFF*') : reply('❌ Save nahi hua.');
    const on = settings.get(conn, 'statussave', true) !== false;
    return reply(`*💾 STATUS SAVE (auto):* ${on ? '🟢 ON' : '🔴 OFF'}\n\n\`.statussave on\`\n\`.statussave off\`\n\n*Manual:* kisi status par reply karke \`save\` / \`send\` / \`.save\` likho.`);
});
