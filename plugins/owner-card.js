// .owner — bot owner ka contact card (number fixed: 923264931117, naam us user ke .ownername se)
const { cmd } = require('../ahmadcore');
const config = require('../config');

cmd({
    pattern: 'owner',
    alias: ['creator', 'developer', 'dev', 'ownercontact'],
    desc: 'Bot owner ka contact',
    category: 'main',
    react: '👑',
    use: '.owner',
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const num = '923264931117';
    const name = String(config.OWNER_NAME || 'Ahmad Shahzad').replace(/[\r\n]/g, ' ');
    const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nORG:${config.BOT_NAME || 'AhmadShahzad-MD'};\nTEL;type=CELL;type=VOICE;waid=${num}:+${num}\nEND:VCARD`;
    try {
        await conn.sendMessage(from, { contacts: { displayName: name, contacts: [{ vcard }] } }, { quoted: mek });
    } catch (e) {
        await reply(`👑 *Owner:* ${name}\n📱 wa.me/${num}`);
    }
});
