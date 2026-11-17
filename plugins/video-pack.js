// plugins/video-pack.js — .cartoon .movie .romance .couple .islamicvid
// Har command YouTube se search karke RANDOM nayi video bhejta hai. Naam likho to usi ki video.
const { cmd } = require('../arslan');
const mediaDl = require('../lib/media-dl');
const vh = require('../lib/vidhelper');

function make({ pattern, alias, icon, title, desc, category = 'video', defaults, withName, min, max, long, react }) {
    cmd({
        pattern, alias, desc, category, react: react || icon, use: `.${pattern} [naam]`, filename: __filename
    }, async (conn, mek, m, ctx) => {
        const chat = ctx.from || mek.key.remoteJid;
        const reply = ctx.reply;
        const name = String(ctx.q || '').trim();
        try {
            const queries = name ? withName(name) : vh.shuffle(defaults).slice(0, 3);
            await reply(`${icon} *${title}* dhoond raha hoon…`);
            const v = await vh.findVideo(queries, { minSec: min, maxSec: max, random: !name });
            if (!v) return reply('❌ Is naam ki koi suitable video nahi mili. Dusra naam try karo.');
            const caption = vh.infoCaption(icon, title, v);
            await conn.sendMessage(chat, { image: { url: v.thumbnail }, caption: caption + (long ? '\n⏳ Download ho rahi hai (kuch minute lag sakte hain)…' : '\n⚡ Video bhej raha hoon…') }, { quoted: mek }).catch(() => {});
            conn.sendMessage(chat, { react: { text: '⏳', key: mek.key } }).catch(() => {});
            if (long) await vh.sendLong(conn, chat, mek, v, caption);
            else await vh.sendShort(conn, chat, mek, v, caption);
            conn.sendMessage(chat, { react: { text: '✅', key: mek.key } }).catch(() => {});
        } catch (e) {
            console.error(`[${pattern.toUpperCase()}]`, (e.details && e.details.join(' | ')) || e.message);
            conn.sendMessage(chat, { react: { text: '❌', key: mek.key } }).catch(() => {});
            const why = mediaDl.explainError(e);
            reply(`❌ ${title} download nahi ho saki.` + (why ? '\n\n💡 ' + why : '\nThori der baad dobara try karo.'));
        }
    });
}

make({
    pattern: 'cartoon', alias: ['cartoons', 'kidscartoonvideo', 'cartoonvideo'],
    icon: '🧸', title: 'CARTOON', desc: 'Cartoon episode / video download (naam likho ya random)',
    defaults: ['cartoon episode urdu', 'cartoon for kids full episode', 'tom and jerry full episode', 'doraemon episode hindi', 'mr bean cartoon episode', 'chhota bheem episode', 'motu patlu episode'],
    withName: (n) => [`${n} cartoon episode`, `${n} cartoon full episode`, `${n} cartoon`],
    min: 120, max: 30 * 60
});
make({
    pattern: 'movie', alias: ['film', 'fullmovie', 'moviedl'],
    icon: '🎥', title: 'MOVIE', desc: 'Full movie download (naam zaroori: .movie <naam>)',
    defaults: [], withName: (n) => [`${n} full movie`, `${n} full movie hd`, `${n} movie`],
    min: 40 * 60, max: 4 * 3600, long: true
});
make({
    pattern: 'romance', alias: ['romanticvideo', 'romanticvid', 'romancevideo'],
    icon: '💕', title: 'ROMANTIC VIDEO', desc: 'Romantic videos / status (random ya naam se)',
    defaults: ['romantic whatsapp status video', 'romantic song status 30 second', 'romantic video song status', 'love status video hindi', 'romantic urdu poetry video', 'romantic couple status video'],
    withName: (n) => [`${n} romantic video`, `${n} romantic status`, `${n} love song video`],
    min: 8, max: 8 * 60
});
make({
    pattern: 'couple', alias: ['couples', 'couplevideo', 'couplegoals'],
    icon: '👩‍❤️‍👨', title: 'COUPLE VIDEO', desc: 'Couple videos / status (random ya naam se)',
    defaults: ['cute couple video status', 'couple goals video status', 'couple romantic status video', 'couple status video 30 sec', 'couple love status whatsapp video', 'cute couple moments video'],
    withName: (n) => [`${n} couple video`, `${n} couple status`, `${n} couple goals`],
    min: 8, max: 8 * 60
});
make({
    pattern: 'islamicvid', alias: ['islamicclip', 'deenvideo', 'islamicstatus', 'islamicvideos'],
    icon: '🕌', title: 'ISLAMIC VIDEO', category: 'islamic', desc: 'Islamic video / bayan / naat / status (random ya naam se)',
    defaults: ['islamic status video', 'islamic reminder short video', 'beautiful naat sharif video', 'quran recitation beautiful video', 'islamic bayan short clip', 'madina video status', 'makkah video status'],
    withName: (n) => [`${n} islamic video`, `${n} islamic`, `${n} bayan`],
    min: 15, max: 25 * 60
});
make({
    pattern: 'videosong', alias: ['songvideo', 'musicvideo2', 'gaanavideo'],
    icon: '🎵', title: 'VIDEO SONG', desc: 'Gaane ki video download: .videosong <gaane ka naam>',
    defaults: ['new hindi song video', 'latest punjabi song video', 'pakistani drama ost video'],
    withName: (n) => [`${n} official video song`, `${n} video song`, `${n} full video`],
    min: 60, max: 12 * 60
});
