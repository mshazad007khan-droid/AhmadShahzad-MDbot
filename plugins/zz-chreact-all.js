// plugins/zz-chreact-all.js — v8
//  .chreact <post link> <emoji emoji emoji emoji>
//        -> jitne bot users connected hain, SAB se us post par react (3-4 emoji hon to sab mein baant diye jate hain)
//  .chstatreact <channel link> <emojis>
//        -> us channel ki HAR NAYI post par apne aap sab bot users react karte rahenge (aur agar link mein post
//           number ho to wo post abhi bhi react ho jati hai)
//  .chstatreact off <channel link>   .chstatreact list
const { cmd } = require('../arslan');
const reactor = require('../lib/reactor');
const chauto = require('../lib/chauto');

const getEmojis = (text) => [...new Set(reactor.extractEmojis(text || ''))].slice(0, 4);
const isOwner = (ctx) => ctx.isCreator || ctx.isOwner;

cmd({
    pattern: 'chreact',
    alias: ['creact', 'reactch', 'channelreact'],
    desc: 'Channel post par SAB bot users se react (3-4 emoji tak)',
    category: 'general',
    react: '💫',
    use: '.chreact <post link> <emoji emoji emoji>',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const { args, reply } = ctx;
    if (!isOwner(ctx)) return reply('*YEH COMMAND SIRF BOT OWNER KE LIYE HAI 😎*');
    const link = args[0];
    if (!link || !/whatsapp\.com\/channel\//.test(link) || args.length < 2) {
        return reply('💫 *CHREACT*\n\n`.chreact <post link> <emoji>`\n`.chreact <post link> ❤️ 🔥 😍 👍`  (3-4 emoji tak)\n\nMisal:\n.chreact https://whatsapp.com/channel/0029Vb.../1673 ❤️ 🔥\n\n✅ Jitne bot users connected hain sab react karenge.');
    }
    const emojis = getEmojis(args.slice(1).join(' '));
    if (!emojis.length) return reply('❌ Emoji likho!\nMisal: .chreact <link> ❤️ 🔥');
    try {
        const resolved = await reactor.resolveChannelLink(conn, link);
        if (!resolved.ok) return reply('❌ Channel nahi mila: ' + resolved.error);
        if (!resolved.serverId) return reply('❌ Link mein post number nahi hai (…/1673 wala link do).');
        const total = chauto.liveSockets().length;
        await reply(`💫 *${total}* bot users se react bhej raha hu: ${emojis.join(' ')}\n_(thora wait — har ek ke beech chhota gap hai taake number safe rahe)_`);
        await chauto.ensureAll(resolved.channelJid);
        const r = await chauto.massReact(resolved.channelJid, resolved.serverId, emojis);
        return reply(`✅ *REACT DONE*\n👥 Bot users: ${r.total}\n💫 React hue: *${r.ok}*\n${r.fail ? `⚠️ Fail: ${r.fail} (emoji allowed na ho ya session band ho)\n` : ''}🎯 Post #${resolved.serverId}`);
    } catch (e) { return reply('❌ ' + e.message); }
});

cmd({
    pattern: 'chstatreact',
    alias: ['chautoreact', 'channelautoreact', 'chreactstatus'],
    desc: 'Channel ki har nayi post par sab bot users auto react (on/off/list)',
    category: 'general',
    react: '💫',
    use: '.chstatreact <channel link> <emojis> | off <link> | list',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const { args, reply } = ctx;
    if (!isOwner(ctx)) return reply('*YEH COMMAND SIRF BOT OWNER KE LIYE HAI 😎*');
    const a0 = String(args[0] || '').toLowerCase();

    if (a0 === 'list') {
        const all = chauto.list();
        const keys = Object.keys(all);
        if (!keys.length) return reply('📭 Koi channel auto-react par nahi.\n`.chstatreact <channel link> ❤️ 🔥` se lagao.');
        return reply('*💫 AUTO-REACT CHANNELS*\n\n' + keys.map((k, i) => `${i + 1}. ${k}\n   ${all[k].emojis.join(' ')}`).join('\n\n'));
    }

    const off = ['off', 'stop', 'remove', 'delete'].includes(a0);
    const link = (off ? args[1] : args[0]) || '';
    if (!/whatsapp\.com\/channel\//.test(link)) {
        return reply('💫 *CHSTATREACT (auto)*\n\n`.chstatreact <channel link> ❤️ 🔥 😍`  → har nayi post par sab bot users khud react\n`.chstatreact off <channel link>`  → band\n`.chstatreact list`  → list\n\nPost link (…/1673) dene par wo post abhi bhi react hoti hai.');
    }
    try {
        const resolved = await reactor.resolveChannelLink(conn, link);
        if (!resolved.ok) return reply('❌ Channel nahi mila: ' + resolved.error);
        if (off) return reply(chauto.remove(resolved.channelJid) ? '🛑 Is channel ka auto-react band.' : 'ℹ️ Ye channel list mein tha hi nahi.');

        const emojis = getEmojis(args.slice(1).join(' '));
        if (!emojis.length) return reply('❌ Emoji likho!\nMisal: .chstatreact <link> ❤️ 🔥');
        chauto.set(resolved.channelJid, emojis, conn.user && conn.user.id);
        await reply(`✅ *AUTO-REACT ON*\n📡 ${resolved.channelJid}\n💫 ${emojis.join(' ')}\n👥 ${chauto.liveSockets().length} bot users\n\nAb is channel ki har nayi post par sab bot users khud react karenge.`);
        await chauto.ensureAll(resolved.channelJid);
        if (resolved.serverId) {
            const r = await chauto.massReact(resolved.channelJid, resolved.serverId, emojis);
            return reply(`💫 Is post (#${resolved.serverId}) par abhi *${r.ok}/${r.total}* react ho gaye.`);
        }
    } catch (e) { return reply('❌ ' + e.message); }
});
