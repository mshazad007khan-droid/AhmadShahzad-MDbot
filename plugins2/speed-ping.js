// plugins2/speed-ping.js (v11.3) — .ping : bot ki asli speed (ms), uptime, RAM, CPU, connected users
// Turant jawab deta hai (koi image / database wait nahi), phir wahi message edit karke speed dikha deta hai.
// Purane .speed / .latency / .pong bhi ab yahi chalate hain.
const os = require('os');
const { cmd, commands } = require('../ahmadcore');
const config = require('../config');

const BOT = () => config.BOT_NAME || '𝐀𝐡𝐦𝐚𝐝𝐒𝐡𝐚𝐡𝐳𝐚𝐝-𝐌𝐃';
const mb = (n) => (n / 1048576).toFixed(0);
const up = (sec) => { const d = Math.floor(sec / 86400), h = Math.floor(sec % 86400 / 3600), m = Math.floor(sec % 3600 / 60), s = Math.floor(sec % 60); return `${d ? d + 'd ' : ''}${h}h ${m}m ${s}s`; };
const rate = (ms) => ms < 300 ? '🚀 Super Fast' : ms < 800 ? '⚡ Fast' : ms < 1500 ? '👍 Normal' : '🐢 Slow';
const bar = (ms) => { const n = Math.max(1, Math.min(10, 10 - Math.floor(ms / 250))); return '█'.repeat(n) + '░'.repeat(10 - n); };

cmd({
    pattern: 'ping',
    alias: ['pong', 'speed', 'latency', 'botspeed', 'speedtest2'],
    desc: 'Bot ki speed (ms), uptime aur RAM',
    category: 'main',
    react: '🏓',
    use: '.ping',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const from = ctx.from || mek.key.remoteJid;
    try {
        // 1) Message aane mein kitna time laga (WhatsApp ke timestamp se; second ki precision)
        const ts = Number((mek.messageTimestamp && (mek.messageTimestamp.low || mek.messageTimestamp)) || 0);
        const inbound = ts ? Math.max(0, Date.now() - ts * 1000) : null;

        // 2) Reply bhejne ka round-trip (asli speed)
        const t0 = process.hrtime.bigint();
        const sent = await conn.sendMessage(from, { text: '🏓 *Pinging…*' }, { quoted: mek });
        const rtt = Number((process.hrtime.bigint() - t0) / 1000000n);

        const mem = process.memoryUsage();
        const total = os.totalmem(), free = os.freemem();
        const load = os.loadavg()[0];
        const cores = os.cpus().length || 1;
        const users = global.activeSockets && global.activeSockets.size ? [...global.activeSockets.values()].filter(s => s && s.user).length : 1;

        const text =
`╭━━〔 🏓 PING 〕━━╮
┃ ⚡ SPEED ➜ *${rtt} ms*  ${rate(rtt)}
┃ 📶 ${bar(rtt)}
${inbound !== null && inbound < 60000 ? `┃ 📥 RECEIVE ➜ ${inbound} ms\n` : ''}┃ ⏱️ UPTIME ➜ ${up(process.uptime())}
┃ 💾 BOT RAM ➜ ${mb(mem.rss)} MB
┃ 🖥️ SERVER RAM ➜ ${mb(total - free)} / ${mb(total)} MB
┃ 🧠 CPU LOAD ➜ ${(load / cores * 100).toFixed(0)}% (${cores} core)
┃ 👥 USERS ➜ ${users} connected
┃ 📦 COMMANDS ➜ ${commands.length}
╰━━━━━━━━━━━━━━╯
👑 ${BOT()}`;
        try { await conn.sendMessage(from, { text, edit: sent.key }); }
        catch (_) { await conn.sendMessage(from, { text }, { quoted: mek }); }
    } catch (e) {
        ctx.reply('❌ Ping error: ' + e.message);
    }
});
