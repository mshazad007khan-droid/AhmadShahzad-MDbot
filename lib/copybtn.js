// lib/copybtn.js — WhatsApp "📋 Copy" (cta_copy) / link / quick-reply buttons.
// Pehle bot `sock.sendMessage({interactiveButtons})` ya bina "biz" node ke relayMessage karta tha — WhatsApp aise message ko aksar
// dikhata hi nahi tha (send "success", chat mein kuch nahi). Ab wahi tareeqa jo menu cards mein chal raha hai: interactiveMessage +
// "biz/native_flow" node. Kisi wajah se send fail ho to seedha text message (code ```block``` mein, long-press se copy) chala jata hai.
const copyBtn = (label, value) => ({ name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: label, id: 'copy_' + Date.now().toString(36), copy_code: String(value) }) });
const urlBtn = (label, url) => ({ name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: label, url, merchant_url: url }) });
const replyBtn = (label, id) => ({ name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: label, id: id || label }) });

function brandText(conn, t) { try { return require('./userbrand').rw(conn, t); } catch (_) { return t; } }
function brandName(conn) {
    try { const b = require('./userbrand').peek(conn); if (b && b.bot) return b.bot; } catch (_) {}
    return String(require('../config').BOT_NAME || '𝐀𝐡𝐦𝐚𝐝𝐒𝐡𝐚𝐡𝐳𝐚𝐝-𝐌𝐃');
}

// buttons: native-flow button objects (copyBtn / urlBtn / replyBtn). Returns true if relayed.
async function sendNative(conn, jid, { text, footer, buttons, quoted } = {}) {
    const baileys = require('@whiskeysockets/baileys');
    const { proto, generateWAMessageFromContent } = baileys;
    const IM = proto.Message.InteractiveMessage;
    const interactive = IM.create({
        body: IM.Body.create({ text: brandText(conn, String(text || ' ')) }),
        footer: IM.Footer.create({ text: brandText(conn, footer || `✦ Powered By ${brandName(conn)} ✦`) }),
        nativeFlowMessage: IM.NativeFlowMessage.fromObject({ buttons })
    });
    const msg = generateWAMessageFromContent(jid, {
        viewOnceMessage: { message: { messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 }, interactiveMessage: interactive } }
    }, { quoted, userJid: conn.user && conn.user.id });
    await conn.relayMessage(jid, msg.message, {
        messageId: msg.key.id,
        additionalNodes: [{ tag: 'biz', attrs: {}, content: [{ tag: 'interactive', attrs: { type: 'native_flow', v: '1' }, content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }] }] }]
    });
    return true;
}

// text + ek ya zyada Copy button. copies = [{ label, value }]. extra = baaki buttons (url / reply).
// Fail ho to plain text (value code-block mein) — kabhi khaali nahi jata.
async function sendCopy(conn, jid, { text, copies = [], extra = [], footer, quoted } = {}) {
    const buttons = [...copies.filter(c => c && c.value).map(c => copyBtn(c.label || '📋 Copy', c.value)), ...extra];
    try {
        if (!buttons.length) throw new Error('no buttons');
        return await sendNative(conn, jid, { text, footer, buttons, quoted });
    } catch (e) {
        try { console.error('[copybtn] fallback to text:', e && e.message); } catch (_) {}
        const lines = [String(text || '')];
        for (const c of copies) if (c && c.value) lines.push('', '```' + c.value + '```');
        await conn.sendMessage(jid, { text: lines.join('\n') }, { quoted });
        return false;
    }
}

module.exports = { copyBtn, urlBtn, replyBtn, sendNative, sendCopy };
