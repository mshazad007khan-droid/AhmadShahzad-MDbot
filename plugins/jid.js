// plugins/jid.js — .jid : kisi bhi chat/channel/group ka JID nikalo, code-block mein (tap/long-press
// karke copy ho jata hai) + ek "📋 Copy JID" button bhi try karta hai.
const { cmd } = require('../arslan');

function extractLink(text) {
    const t = String(text || '');
    const ch = t.match(/(?:https?:\/\/)?(?:www\.)?whatsapp\.com\/channel\/([A-Za-z0-9_-]+)/i);
    if (ch) return { kind: 'channel', code: ch[1] };
    const gc = t.match(/(?:https?:\/\/)?chat\.whatsapp\.com\/([A-Za-z0-9_-]+)/i);
    if (gc) return { kind: 'group', code: gc[1] };
    return null;
}

// JID ke neeche ek "Copy JID" button — WhatsApp ka native "cta_copy" button (support sab clients mein
// guarantee nahi, isliye ye sirf BONUS hai; asli copy hamesha upar wale ```code block``` se bhi ho
// jata hai, jise WhatsApp mein tap/long-press karke copy kiya ja sakta hai).
async function sendWithCopyButton(conn, mek, from, body, jidToCopy) {
    try {
        const baileys = require('@whiskeysockets/baileys');
        const { proto, generateWAMessageFromContent } = baileys;
        const IM = proto.Message.InteractiveMessage;
        const interactive = IM.create({
            body: IM.Body.create({ text: body }),
            nativeFlowMessage: IM.NativeFlowMessage.fromObject({
                buttons: [{ name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: '📋 Copy JID', id: 'copy_jid', copy_code: jidToCopy }) }]
            })
        });
        const msg = generateWAMessageFromContent(from, { viewOnceMessage: { message: { messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 }, interactiveMessage: interactive } } }, { quoted: mek, userJid: conn.user && conn.user.id });
        await conn.relayMessage(from, msg.message, { messageId: msg.key.id });
        return true;
    } catch (e) { return false; }
}

cmd({
    pattern: 'jid',
    alias: ['getjid', 'chatid', 'groupid'],
    desc: 'Chat / Group / Channel ka JID nikalo (copy karne ke liye)',
    category: 'tools',
    react: '🆔',
    use: '.jid  |  .jid <channel/group link>  (ya kisi message par reply karke)',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const { from, reply, q, isGroup } = ctx;
    try {
        let jid = null, label = 'Chat';

        const link = extractLink(q);
        if (link) {
            if (link.kind === 'channel') {
                if (typeof conn.newsletterMetadata !== 'function') return reply('❌ Is Baileys version mein channel JID lookup support nahi hai.');
                const meta = await conn.newsletterMetadata('invite', link.code).catch(() => null);
                jid = meta && (meta.id || meta.jid);
                label = 'Channel';
                if (!jid) return reply('❌ Channel link se JID nahi mil saka. Link check karo.');
            } else {
                if (typeof conn.groupGetInviteInfo !== 'function') return reply('❌ Is Baileys version mein group-invite lookup support nahi hai.');
                const meta = await conn.groupGetInviteInfo(link.code).catch(() => null);
                jid = meta && meta.id;
                label = 'Group';
                if (!jid) return reply('❌ Group invite link se JID nahi mil saka. Link check karo (expired ho sakta hai).');
            }
        } else if (m.quoted && (m.quoted.sender || m.quoted.participant || m.quoted.remoteJid)) {
            jid = m.quoted.sender || m.quoted.participant || m.quoted.remoteJid;
            label = String(jid).endsWith('@g.us') ? 'Group (quoted message)' : 'User (quoted message)';
        } else {
            jid = from;
            label = isGroup ? 'This Group' : 'This Chat';
        }

        // FIX: pehle "Copy JID" interactive button bheja jata tha — WhatsApp us message ko aksar dikhata hi nahi
        // (send "success" ho jata hai par chat mein kuch nahi aata). Ab seedha text — hamesha dikhta hai.
        const body = `🆔 *${label} JID*\n\n\`\`\`${jid}\`\`\`\n\n_Tap/long-press karke copy karo._`;
        await conn.sendMessage(from, { text: body }, { quoted: mek });
    } catch (e) {
        return reply('❌ JID nikalne mein error: ' + e.message);
    }
});
