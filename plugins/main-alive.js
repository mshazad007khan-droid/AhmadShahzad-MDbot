const { cmd, commands } = require('../ahmadcore');
const config = require('../config');
const { getOwnerPic } = require('../lib/botpic');

cmd({
    pattern: "alive",
    alias: ["status", "live"],
    desc: "Check uptime and system status",
    category: "main",
    react: "👑",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        const totalCmds = commands.length;
        const uptime = () => {
            let sec = process.uptime();
            let h = Math.floor(sec / 3600);
            let m = Math.floor((sec % 3600) / 60);
            let s = Math.floor(sec % 60);
            return `${h}h ${m}m ${s}s`;
        };

        const status = `
        *${config.BOT_NAME || '𝐀𝐡𝐦𝐚𝐝𝐒𝐡𝐚𝐡𝐳𝐚𝐝-𝐌𝐃'} is online 🤗♥️*
*┏────〘 INFO 〙───⊷*
*┃📝 ${(() => { try { return require('../lib/userbrand').peek(conn).desc || ''; } catch (_) { return ''; } })() || 'Online & ready'}*
*┃👑 MODE :❯ ${(config.WORK_TYPE || 'public').toUpperCase()}*
*┃👑 OWNER :❯ ${config.OWNER_NAME}*
*┃📞 CONTACT :❯ wa.me/${config.OWNER_NUMBER}*
*┃👑 PREFIX :❯ ❮ ${config.PREFIX || '.'} ❯*
*┃👑 VERSION :❯ 2.4.0*
*┃👑 TOTAL CMNDS :❯ ❮ ${totalCmds} ❯*
*┃👑 UPTIME :❯ ${uptime()}*
*┗──────────────⊷*
*👑 ${config.BOT_NAME || '𝐀𝐡𝐦𝐚𝐝𝐒𝐡𝐚𝐡𝐳𝐚𝐝-𝐌𝐃'} 👑*`;

        const pic = getOwnerPic(conn);
        if (pic) {
            try { await conn.sendMessage(from, { image: pic, caption: status }, { quoted: mek }); return; }
            catch (e) { console.error('alive image failed:', e.message); }
        }
        await conn.sendMessage(from, { text: status }, { quoted: mek });

    } catch (e) {
        console.error("Error in alive command:", e);
        reply(`An error occurred: ${e.message}`);
    }
});
