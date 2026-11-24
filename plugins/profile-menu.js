// plugins/profile-menu.js
//  .profile / .myprofile / .menuprofile  -> requesting user ka profile card (DP + role + bot info)
//  .cmdlist / .commands / .allcmds / .listcmds -> saari visible commands ki VIP list (registry se auto, 4000 chars par split)
const { cmd } = require('../arslan');
const cm = require('./carousel-menu');

cmd({
    pattern: 'profile',
    alias: ['myprofile', 'menuprofile'],
    use: '.profile',
    desc: 'Apna profile card (DP, role, bot info)',
    category: 'system',
    react: '👤',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    await cm.sendProfileCard(conn, mek, ctx.from || m.chat, ctx);
});

cmd({
    pattern: 'cmdlist',
    alias: ['commands', 'allcmds', 'listcmds'],
    use: '.cmdlist',
    desc: 'Saari commands ki poori list (category wise)',
    category: 'system',
    react: '📋',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    await cm.sendCommandList(conn, ctx.from || m.chat, mek);
});
