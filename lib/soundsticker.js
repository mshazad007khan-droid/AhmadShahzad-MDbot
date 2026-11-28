// lib/soundsticker.js (v13.4) — WhatsApp NATIVE "sound sticker" (sticker par speaker icon, tap karo to awaaz)
//
// Wire format (Baileys issue #2932 + raditted/whatsapp-sound-sticker se):
//   Message.field134 { 1: Message { 26: StickerMessage { ...normal sticker fields..., 24: varint 0, 26: AudioMessage } } }
// Do alag upload hoti hain: animated WebP + Ogg/Opus audio. Baileys rc14 ke WAProto mein field 134 / StickerMessage.26 nahi hain,
// isliye hum proto.Message.encode ko sirf IS khaas sticker ke liye wrap karte hain (baqi sab messages ke liye original encode).
const crypto = require('crypto');

const PENDING = new Map();         // sticker fileSha256(hex) -> { audio: Buffer(AudioMessage bytes), exp }
const TTL = 5 * 60 * 1000;

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
function install(proto) {
    if (installed || !proto || !proto.Message) return installed;
    const orig = proto.Message.encode;
    proto.Message.encode = function (m, w) {
        try {
            const st = m && m.stickerMessage;
            const k = shaKey(st);
            const hit = k && PENDING.get(k);
            if (hit && hit.exp > Date.now()) {
                const rest = { ...m }; delete rest.stickerMessage;
                const base = Buffer.from(orig.call(this, proto.Message.create ? proto.Message.create(rest) : rest).finish());
                const stBytes = Buffer.from(proto.Message.StickerMessage.encode(st).finish());
                const out = Buffer.concat([base, build134(stBytes, hit.audio)]);
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
