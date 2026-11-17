const { cmd } = require('../arslan');
const { getMode, setMode } = require('../lib/antidelete');

const label = { dm: '🟢 ON — delete hua message aap ke apne inbox mein aata hai', chat: '🟡 ON — usi chat mein aata hai', off: '🔴 OFF' };

cmd({
    pattern: 'antidelete',
    alias: ['antidel', 'ad'],
    desc: 'Delete kiye hue messages wapas aap ke inbox mein: on / chat / off',
    category: 'owner',
    react: '🛡️',
    use: '.antidelete on | chat | off',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const { args, reply } = ctx;
    if (!(ctx.isCreator || ctx.isOwner)) return reply('*YEH COMMAND SIRF BOT OWNER KE LIYE HAI 😎*');
    const a = String(args[0] || '').toLowerCase();

    if (['on', 'enable', 'true', 'dm', 'private', 'me'].includes(a)) return setMode(conn, 'dm') ? reply('*🛡️ ANTI-DELETE ON*\nKoi bhi message delete karega to wo *aap ke apne inbox* mein aa jayega.') : reply('❌ Save nahi hua.');
    if (['chat', 'here', 'same'].includes(a)) return setMode(conn, 'chat') ? reply('*🛡️ ANTI-DELETE ON (CHAT)*\nDelete hua message usi chat mein wapas aayega.') : reply('❌ Save nahi hua.');
    if (['off', 'disable', 'false'].includes(a)) return setMode(conn, 'off') ? reply('*🛡️ ANTI-DELETE OFF*') : reply('❌ Save nahi hua.');
    return reply(`*ANTI-DELETE:* ${label[getMode(conn)]}\n\n\`.antidelete on\`  (mere inbox mein)\n\`.antidelete chat\`  (usi chat mein)\n\`.antidelete off\``);
});
