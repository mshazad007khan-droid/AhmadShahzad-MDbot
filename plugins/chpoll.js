// plugins/chpoll.js (v11)
//  .chpoll <channel post link> <option>   -> SAB connected bot users (sessions) ki taraf se vote
//  .chpollme <link> <option>              -> sirf apne account se vote
//  .pollstats                             -> kitne users connected hain
// Option: number (1,2,3) / letter (A,B) / poll wala poora naam — teeno chalte hain.
// Link poll wali post ka hona chahiye: https://whatsapp.com/channel/XXXX/1673

const { cmd } = require('../arslan');
const voter = require('../lib/pollvoter');
const { isSessionUser } = require('../lib/premium-check');

const HELP =
`🗳️ *CHPOLL — Channel Poll Vote*

📌 *Use:* .chpoll <poll link> <option>

📖 *Misal:*
.chpoll https://whatsapp.com/channel/0029VbCx2Sb5q08a3fe3KZ42/1673 2
.chpoll https://whatsapp.com/channel/0029VbCx2Sb5q08a3fe3KZ42/1673 Yes

💡 Option number (1,2,3), letter (A,B) ya poora naam likho
👥 Sab connected users apni taraf se vote karte hain
🙋 Sirf apna vote: .chpollme <link> <option>`;

async function prepare(conn, args, reply) {
    const link = args[0];
    const choice = args.slice(1).join(' ').replace(/^["']|["']$/g, '').trim();
    if (!link || !choice) { await reply(HELP); return null; }
    if (!/whatsapp\.com\/channel\//.test(link)) { await reply('❌ *Invalid channel link!* Poll wali post ka link do (…/1673).'); return null; }

    const resolved = await voter.resolveChannelLink(conn, link);
    if (!resolved.ok) { await reply(`❌ *Channel nahi mila:* ${resolved.error}`); return null; }
    if (!resolved.serverId) { await reply('❌ Link mein post number nahi hai. Poll par long-press → *Share link* se poora link lo (…/1673).'); return null; }

    let info = null;
    try { info = await voter.fetchPollOptions(conn, resolved.channelJid, resolved.serverId); } catch (_) {}
    const options = info && info.options;
    const option = voter.pickOption(choice, options);
    if (!option) {
        return reply(options
            ? `❌ Ye option poll mein nahi mila.\n\n📋 *Options:*\n${options.map((o, i) => `${i + 1}. ${o}`).join('\n')}`
            : '❌ Poll ke options nahi mile.') && null;
    }
    if (!options && /^\d+$|^[a-z]$/i.test(choice)) {
        await reply('⚠️ Poll ke options fetch nahi hue, isliye number/letter nahi chalega. Option ka *poora naam* likho (jaisa poll mein hai).');
        return null;
    }
    return { resolved, option, options };
}

cmd({
    pattern: 'chpoll',
    alias: ['cpoll', 'pollvote', 'channelpoll', 'masspoll', 'mpoll', 'bulkvote', 'voteall'],
    desc: 'Channel poll par sab connected users se vote (link + option)',
    category: 'general',
    react: '🗳️',
    use: '.chpoll <poll link> <option>',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const { args, reply, from } = ctx;
    try {
        if (!(ctx.isOwner || ctx.isMe || isSessionUser(ctx))) return reply('*YEH COMMAND SIRF PAIRED BOT USER / OWNER KE LIYE HAI 😎*');
        const stats = voter.getAccountStats();
        if (!stats.total) return reply('❌ Koi user connected nahi.');
        const p = await prepare(conn, args, reply);
        if (!p) return;
        const { resolved, option } = p;

        await reply(`🗳️ *VOTING*\n👥 Users: *${stats.total}*\n✅ Option: *${option}*\n🎯 Poll: #${resolved.serverId}\n_(har user ke beech chhota gap hai — thora wait)_`);
        let lastPct = 0;
        const r = await voter.voteAllSessions(resolved.channelJid, resolved.serverId, option, {
            onProgress: (done, total, ok, bad) => {
                const pct = Math.floor(done / total * 100);
                if (total > 8 && pct >= lastPct + 25 && pct < 100) {
                    lastPct = pct;
                    conn.sendMessage(from, { text: `⏳ ${pct}% — ✅ ${ok} ❌ ${bad}` }).catch(() => {});
                }
            }
        });
        const errs = Object.entries(r.errors || {}).map(([k, v]) => `• ${k} ×${v}`).join('\n');
        return reply(
`${r.success ? '✅' : '⚠️'} *CHPOLL DONE*
👥 Users   : ${r.total}
✅ Vote hue : *${r.success}*
❌ Fail     : ${r.failed}
🎯 Option   : *${option}* (poll #${resolved.serverId})${errs ? `\n\n⚠️ Wajah:\n${errs}` : ''}`);
    } catch (err) { return reply(`❌ ${err.message}`); }
});

cmd({
    pattern: 'chpollme',
    alias: ['pollme', 'myvote'],
    desc: 'Channel poll par sirf apne account se vote',
    category: 'general',
    react: '🗳️',
    use: '.chpollme <poll link> <option>',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const { args, reply } = ctx;
    try {
        const p = await prepare(conn, args, reply);
        if (!p) return;
        const r = await voter.voteOneAccount(conn, p.resolved.channelJid, p.resolved.serverId, p.option);
        return reply(r.ok ? `✅ *VOTE SENT*\n🎯 Poll #${p.resolved.serverId}\n✅ Option: *${p.option}*` : `⚠️ *Failed:* ${r.error}`);
    } catch (err) { return reply(`❌ ${err.message}`); }
});

cmd({
    pattern: 'pollstats',
    alias: ['votestats'],
    desc: 'Poll vote ke liye connected users',
    category: 'general',
    react: '📊',
    filename: __filename
}, async (conn, mek, m, { reply }) => {
    const stats = voter.getAccountStats();
    return reply(`📊 *POLL VOTE STATS*\n\n👥 Connected users: *${stats.total}*\n📈 Max votes/poll: *${stats.total}*`);
});
