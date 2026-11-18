const { cmd } = require('../arslan');
const settings = require('../lib/botsettings');

cmd({
    pattern: 'statussave',
    alias: ['savestatus', 'ss-save', 'statusreactsave'],
    desc: 'Status react/like karne par (aap ya koi aur) status aap ke inbox mein save ho jaye',
    category: 'owner',
    react: '💾',
    use: '.statussave on | off',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const { args, reply } = ctx;
    if (!(ctx.isCreator || ctx.isOwner)) return reply('*YEH COMMAND SIRF BOT OWNER KE LIYE HAI 😎*');
    const a = String(args[0] || '').toLowerCase();
    if (['on', 'enable', 'true'].includes(a)) return settings.set(conn, 'statussave', true) ? reply('*💾 STATUS SAVE ON*\n1️⃣ Koi aap ke status par react/like kare → aap ka status inbox mein save.\\n2️⃣ Aap kisi ke status par react/like karo → wo status inbox mein save.') : reply('❌ Save nahi hua.');
    if (['off', 'disable', 'false'].includes(a)) return settings.set(conn, 'statussave', false) ? reply('*💾 STATUS SAVE OFF*') : reply('❌ Save nahi hua.');
    const on = settings.get(conn, 'statussave', true) !== false;
    return reply(`*💾 STATUS SAVE:* ${on ? '🟢 ON' : '🔴 OFF'}\n\n\`.statussave on\`\n\`.statussave off\`\n\n_Note: sirf wahi status save hote hain jo bot online hone ke baad aap ne lagaye._`);
});
