// lib/soundsticker.js (v13.5) — WhatsApp NATIVE "sound sticker" (sticker par speaker icon, tap karo to awaaz)
//
// Wire format (Baileys issue #2932 + raditted/whatsapp-sound-sticker se):
//   Message.field134 { 1: Message { 26: StickerMessage { ...normal sticker fields..., 24: varint 0, 26: AudioMessage } } }
// Do alag upload hoti hain: animated WebP + Ogg/Opus audio. Baileys rc14 ke WAProto mein field 134 / StickerMessage.26 nahi hain,
// isliye hum proto.Message.encode ko sirf IS khaas sticker ke liye wrap karte hain (baqi sab messages ke liye original encode).
const crypto = require('crypto');

const PENDING = new Map();         // sticker fileSha256(hex) -> { audio: Buffer(AudioMessage bytes), exp }
const TTL = 30 * 60 * 1000;   // retry / re-encode ke liye 30 min

// ---- chhota protobuf helper ----
const varint = (n) => { const out = []; n = Number(n); while (n > 127) { out.push((n & 127) | 128); n = Math.floor(n / 128); } out.push(n); return Buffer.from(out); };
const tag = (field, wire) => varint(field * 8 + wire);
const lenField = (field, buf) => Buffer.concat([tag(field, 2), varint(buf.length), buf]);

function build134(stickerBytes, audioBytes) {
    const sticker = Buffer.concat([stickerBytes, tag(24, 0), varint(0), lenField(26, audioBytes)]);
    const innerMessage = lenField(26, sticker);          // Message { stickerMessage = 26 }
    return lenField(134, lenField(1, innerMessage));     // Message { 134: { 1: Message } }
}

const shaKey = (st) => st && st.fileSha256 ? Buffer.from(st.fileSha256).toString('hex') : null;

let installed = false;
// v13.5: PRIVATE CHAT FIX — DM mein Baileys apne doosre devices (aapka phone) ko message `deviceSentMessage { message }` ke ANDAR
// lapet kar bhejta hai. Pehle hook sirf top-level stickerMessage dekhta tha, isliye DM mein phone par sound sticker sada sticker
// ban kar aata tha (group mein wrapper nahi hota, wahan sahi tha). Ab dono jagah (top-level + deviceSentMessage) field 134 lagta hai.
const toBuf = (u) => Buffer.from(u);
function install(proto) {
    if (installed || !proto || !proto.Message) return installed;
    const orig = proto.Message.encode;
    const encRest = (self, obj) => toBuf(orig.call(self, proto.Message.create ? proto.Message.create(obj) : obj).finish());
    proto.Message.encode = function (m, w) {
        try {
            // 1) seedha top-level sticker (group / recipient ki copy)
            const st = m && m.stickerMessage;
            const k = shaKey(st);
            const hit = k && PENDING.get(k);
            if (hit && hit.exp > Date.now()) {
                const rest = { ...m }; delete rest.stickerMessage;
                const stBytes = toBuf(proto.Message.StickerMessage.encode(st).finish());
                const out = Buffer.concat([encRest(this, rest), build134(stBytes, hit.audio)]);
                return { finish: () => out };
            }
            // 2) DM: apne doosre devices ki copy -> deviceSentMessage { destinationJid, message { stickerMessage } }
            const dsm = m && m.deviceSentMessage;
            const inner = dsm && dsm.message;
            const st2 = inner && inner.stickerMessage;
            const k2 = shaKey(st2);
            const hit2 = k2 && PENDING.get(k2);
            if (hit2 && hit2.exp > Date.now()) {
                const outerRest = { ...m }; delete outerRest.deviceSentMessage;
                const innerRest = { ...inner }; delete innerRest.stickerMessage;
                const stBytes = toBuf(proto.Message.StickerMessage.encode(st2).finish());
                const innerBytes = Buffer.concat([encRest(this, innerRest), build134(stBytes, hit2.audio)]);
                const parts = [];
                if (dsm.destinationJid) parts.push(lenField(1, Buffer.from(String(dsm.destinationJid), 'utf8')));   // DeviceSentMessage.destinationJid = 1
                parts.push(lenField(2, innerBytes));                                                                // .message = 2
                if (dsm.phash) parts.push(lenField(3, Buffer.from(String(dsm.phash), 'utf8')));                     // .phash = 3
                const out = Buffer.concat([encRest(this, outerRest), lenField(31, Buffer.concat(parts))]);          // Message.deviceSentMessage = 31
                return { finish: () => out };
            }
        } catch (e) { console.warn('[SOUNDSTICKER] encode hook error:', e && e.message); }
        return orig.call(this, m, w);
    };
    installed = true;
    return true;
}

// audio buffer (ogg/opus) + sticker webp buffer -> relay
async function send(conn, jid, { webp, ogg, seconds, quoted }) {
    const B = require('@whiskeysockets/baileys');
    const { proto, prepareWAMessageMedia, generateWAMessageFromContent } = B;
    if (!proto || !prepareWAMessageMedia || !generateWAMessageFromContent || typeof conn.relayMessage !== 'function') throw new Error('Baileys API missing');
    install(proto);

    // 1) dono media upload
    const up = { upload: conn.waUploadToServer, mediaCache: undefined };
    const sMedia = await prepareWAMessageMedia({ sticker: webp }, up);
    const aMedia = await prepareWAMessageMedia({ audio: ogg, mimetype: 'audio/ogg; codecs=opus', ptt: false }, up);
    const sNode = sMedia.stickerMessage, aNode = aMedia.audioMessage;
    if (!sNode || !aNode) throw new Error('media upload fail');
    aNode.seconds = Math.max(1, Math.round(seconds || 1));
    aNode.mimetype = 'audio/ogg; codecs=opus';
    aNode.ptt = false;
    sNode.isAnimated = true;

    // 2) sticker message (quoted reply ke saath) banao
    const full = generateWAMessageFromContent(jid, { stickerMessage: sNode }, { userJid: conn.user && conn.user.id, quoted });
    const st = full.message.stickerMessage;
    const k = shaKey(st);
    if (!k) throw new Error('sticker sha missing');
    const audioBytes = Buffer.from(proto.Message.AudioMessage.encode(aNode).finish());
    PENDING.set(k, { audio: audioBytes, exp: Date.now() + TTL });
    if (PENDING.size > 50) for (const [kk, v] of PENDING) if (v.exp < Date.now()) PENDING.delete(kk);

    // 3) relay (hamara encode hook field 134 laga dega)
    await conn.relayMessage(jid, full.message, { messageId: full.key.id });
    return full;
}

module.exports = { send, install, build134, PENDING };
