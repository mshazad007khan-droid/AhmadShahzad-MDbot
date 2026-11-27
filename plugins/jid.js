// plugins/jid.js — .jid : kisi bhi chat/channel/group ka JID nikalo, code-block mein (tap/long-press
// karke copy ho jata hai) + ek "📋 Copy JID" button bhi try karta hai.
const { cmd } = require('../ahmadcore');

function extractLink(text) {
    const t = String(text || '');
    const ch = t.match(/(?:https?:\/\/)?(?:www\.)?whatsapp\.com\/channel\/([A-Za-z0-9_-]+)/i);
    if (ch) return { kind: 'channel', code: ch[1] };
    const gc = t.match(/(?:https?:\/\/)?chat\.whatsapp\.com\/([A-Za-z0-9_-]+)/i);
    if (gc) return { kind: 'group', code: gc[1] };
    return null;
}

const { sendCopy } = require('../lib/copybtn');

cmd({
    pattern: 'jid',
    alias: ['getjid', 'chatid', 'groupid', 'gid', 'gjid', 'cid', 'chjid', 'channeljid', 'channelid', 'newsletterid'],
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

        // v12.2: 📋 Copy button (jid / gid / channel id sab par). Button na dikhe to bhi JID code-block mein hai (long-press se copy).
        const body = `🆔 *${label} JID*\n\n\`\`\`${jid}\`\`\`\n\n_Neeche 📋 Copy dabao (ya JID par long-press karo)._`;
        await sendCopy(conn, from, { text: body, copies: [{ label: '📋 Copy JID', value: jid }], quoted: mek });
    } catch (e) {
        return reply('❌ JID nikalne mein error: ' + e.message);
    }
});
