// plugins/gcstatus.js — .gcstatus : is GROUP ke members ko dikhne wala WhatsApp STATUS post karo
// (WhatsApp "status@broadcast" + statusJidList = sirf unhi logon ko dikhta hai jinki JID list mein ho).
const { cmd } = require('../arslan');

async function membersOf(conn, groupJid) {
    const meta = await conn.groupMetadata(groupJid);
    return (meta.participants || []).map(p => p.id).filter(j => j !== (conn.user && conn.user.id));
}

cmd({
    pattern: 'gcstatus',
    alias: ['groupstatus', 'gcstat'],
    desc: 'Is group ke members ko dikhne wala status lagao (text/photo/video par reply karke)',
    category: 'group',
    react: '📣',
    use: '.gcstatus <text>  (ya photo/video par reply karke .gcstatus [caption])',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const { from, reply, q, isGroup, isAdmins, isCreator } = ctx;
    if (!isGroup) return reply('❌ Ye command sirf GROUP ke andar chalta hai (is group ke members ko status dikhane ke liye).');
    if (!(isAdmins || isCreator)) return reply('❌ Sirf group admin ye command chala sakte hain.');

    const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const imgMsg = mek.message?.imageMessage || quoted?.imageMessage;
    const vidMsg = mek.message?.videoMessage || quoted?.videoMessage;
    const text = String(q || '').trim();
    if (!text && !imgMsg && !vidMsg) {
        return reply('📣 *GC STATUS*\n\nUse: `.gcstatus <text>`\nYa: Photo/Video par reply karke `.gcstatus [caption]`\n\nYe status is GROUP ke saare members ko dikhega (normal status nahi — sirf group ko).');
    }

    try {
        const statusJidList = await membersOf(conn, from);
        if (!statusJidList.length) return reply('❌ Group ke members ki list nahi mil saki.');
        const opts = { backgroundColor: '#1a1420', font: 2, statusJidList };

        if (imgMsg) {
            const filePath = await conn.downloadAndSaveMediaMessage({ msg: imgMsg, mtype: 'imageMessage' }, `./tmp/gcstat_${Date.now()}`);
            await conn.sendMessage('status@broadcast', { image: { url: filePath }, caption: text || '' }, opts);
        } else if (vidMsg) {
            const filePath = await conn.downloadAndSaveMediaMessage({ msg: vidMsg, mtype: 'videoMessage' }, `./tmp/gcstat_${Date.now()}`);
            await conn.sendMessage('status@broadcast', { video: { url: filePath }, caption: text || '' }, opts);
        } else {
            await conn.sendMessage('status@broadcast', { text }, opts);
        }
        return reply(`✅ Status post ho gaya!\n👥 Is group ke *${statusJidList.length}* members ko dikhega.`);
    } catch (e) {
        return reply('❌ GC status post fail: ' + e.message + '\n\n💡 Ye tabhi chalta hai jab bot ka account khud status post kar sake (WhatsApp kabhi is feature ko limit kar deta hai).');
    }
});
