const { cmd } = require('../arslan');
const bgm = require('../lib/bgmusic');

cmd({
    pattern: 'bgmusicvoice',
    alias: ['bgmusic', 'bgvoice', 'musicvoice'],
    desc: 'Agli voice note mein khud-ba-khud background music laga do',
    category: 'voice',
    react: '🎶',
    use: '.bgmusicvoice [1-5] | on | off | list',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const { args, reply } = ctx;
    if (!(ctx.isCreator || ctx.isOwner)) return reply('*YEH COMMAND SIRF BOT OWNER KE LIYE HAI 😎*');
    const a = String(args[0] || '').toLowerCase();
    const files = bgm.userMusicFiles();
    const num = parseInt(args.find(x => /^\d+$/.test(x)) || '0', 10);
    if (num) {
        if (num > files.length) return reply(`❌ Sirf ${files.length} music hain (bgmusic1 se bgmusic${files.length}).`);
        bgm.setTrack(conn, num);
    } else if (['random', 'all'].includes(a)) bgm.setTrack(conn, 0);
    if (['list', 'songs'].includes(a)) return reply('*🎶 BG MUSIC LIST*\n' + (files.map((f, i) => `${i + 1}. ${require('path').basename(f)}`).join('\n') || 'Koi file nahi (data/bgmusic/ mein rakho)') + '\n\n`.bgmusicvoice 2` = music 2 ke saath\n`.bgmusicvoice random` = har baar alag');
    if (['off', 'stop', 'disable'].includes(a)) { bgm.setAlways(conn, false); return reply('*🎶 BGMUSICVOICE OFF*'); }
    if (['on', 'always', 'enable'].includes(a)) {
        bgm.setAlways(conn, true);
        return reply('*🎶 BGMUSICVOICE ON*\nAb jo bhi voice note aap bhejenge, usme har baar *nayi* music lag kar jayegi.\nBand karne ke liye: `.bgmusicvoice off`');
    }
    bgm.arm(conn, 10);
    return reply('*🎶 TAYYAR!*\nAb *agla voice note* record karke bhejein (10 minute ke andar).\nBot usme nayi background music laga kar bhej dega.\n\n_Har baar ke liye:_ `.bgmusicvoice on`');
});

// .bgmusic1 .. .bgmusic5  — seedhe seedhe 5 alag commands (jaisa chaha gaya):
//   .bgmusic1 on  -> hamesha pehla wala music lagta rahega jab tak "off" na ho
//   .bgmusic1     -> sirf agli voice note ke liye armed (ek baar)
//   .bgmusic1 off -> is preset ko band karo (bgmusicvoice off jaisa hi)
for (let i = 1; i <= 5; i++) {
    cmd({
        pattern: `bgmusic${i}`,
        desc: `BG music ${i} agli voice note mein laga do`,
        category: 'voice',
        react: '🎶',
        use: `.bgmusic${i} [on|off]`,
        filename: __filename
    }, async (conn, mek, m, ctx) => {
        const { args, reply } = ctx;
        if (!(ctx.isCreator || ctx.isOwner)) return reply('*YEH COMMAND SIRF BOT OWNER KE LIYE HAI 😎*');
        const files = bgm.userMusicFiles();
        if (i > files.length) return reply(`❌ Music ${i} nahi mili (sirf ${files.length} tracks hain).`);
        const a = String(args[0] || '').toLowerCase();
        bgm.setTrack(conn, i);
        if (['off', 'stop', 'disable'].includes(a)) { bgm.setAlways(conn, false); return reply(`*🎶 BGMUSIC${i} OFF*`); }
        if (['on', 'always', 'enable'].includes(a)) {
            bgm.setAlways(conn, true);
            return reply(`*🎶 BGMUSIC${i} ON*\nAb jo bhi voice note aap bhejenge, usme hamesha *music ${i}* lagegi.\nBand: \`.bgmusic${i} off\` ya \`.bgmusicvoice off\``);
        }
        bgm.arm(conn, 10);
        return reply(`*🎶 TAYYAR!*\nAgla voice note bhejo (10 minute ke andar), usme *music ${i}* lag jayegi.\nHamesha ke liye: \`.bgmusic${i} on\``);
    });
}
