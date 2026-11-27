// plugins/kashmir.js — v8  🏔️ KASHMIR MENU (20 commands)
//   Menu:  .kashmir   (ya .menu kashmir)
//   BG music (voice note par Kashmir ka gaana, music 35% / awaaz 65%):
//     .kbgmusic1 on  .kbgmusic2 on  .kbgmusic3 on  .kbgmusic4 on   (.kbgmusic1 = sirf agli voice, .kbgmusic1 off = band)
//     .kbgmusic  = list / off
//   Media:  .kphoto  .kvideo  .ksong  .kvideosong
//   Baqi:   .kshayari .ksad .kquote .kdua .kfacts .kfood .kkahwa .knoonchai .kweather .knamaz .kplaces
const axios = require('axios');
const { cmd } = require('../ahmadcore');
const config = require('../config');
const kbgm = require('../lib/kbgmusic');
const bgm = require('../lib/bgmusic');

const UA = 'AhmadShahzad-MD/8 (WhatsApp bot; contact via channel)';
const rnd = (a) => a[Math.floor(Math.random() * a.length)];
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const BOT = () => config.BOT_NAME || 'AhmadShahzad-MD';
const FOOT = () => `\n\n🏔️ _${BOT()} · Kashmir_`;
const OWN = '*YEH COMMAND SIRF BOT OWNER KE LIYE HAI 😎*';

// har chat mein repeat na ho
const seenMap = new Map();
const seenIn = (chat, key) => { const k = chat + '|' + key; if (!seenMap.has(k)) seenMap.set(k, new Set()); return seenMap.get(k); };
const remember = (set, id) => { set.add(id); if (set.size > 80) set.delete(set.values().next().value); };

// ═════════════ 1) KBGMUSIC 1-4 ═════════════
for (let i = 1; i <= 4; i++) {
    cmd({
        pattern: `kbgmusic${i}`,
        desc: `Kashmir BG music ${i}: voice note par gaana (music 35% / awaaz 65%)`,
        category: 'kashmir',
        react: '🏔️',
        use: `.kbgmusic${i} on | off`,
        filename: __filename
    }, async (conn, mek, m, ctx) => {
        if (!(ctx.isCreator || ctx.isOwner)) return ctx.reply(OWN);
        if (!kbgm.tracks().includes(i)) return ctx.reply(`❌ kbgmusic${i}.mp3 nahi mili (data/kbgmusic/).`);
        const a = String((ctx.args && ctx.args[0]) || '').toLowerCase();
        kbgm.setTrack(conn, i);
        if (['off', 'stop', 'disable'].includes(a)) { kbgm.setAlways(conn, false); return ctx.reply(`*🏔️ KBGMUSIC${i} OFF*`); }
        bgm.setAlways(conn, false); bgm.disarm(conn);      // purani bgmusic band — dono ek saath nahi
        if (['on', 'always', 'enable'].includes(a)) {
            kbgm.setAlways(conn, true);
            return ctx.reply(`*🏔️ KASHMIR MUSIC ${i} ON*\nAb jo bhi voice note bhejoge, uske peeche *Kashmir gaana ${i}* chalega.\n🔊 Music *35%* · Aap ki awaaz *65%*\n\nBand: \`.kbgmusic${i} off\`  |  Dusra gaana: \`.kbgmusic2 on\``);
        }
        kbgm.arm(conn, 10);
        return ctx.reply(`*🏔️ TAYYAR!*\nAgla voice note bhejo (10 minute ke andar) — Kashmir gaana ${i} lag jayega.\nHamesha ke liye: \`.kbgmusic${i} on\``);
    });
}
cmd({
    pattern: 'kbgmusic',
    alias: ['kbgm', 'kashmirmusic', 'kbgmusicoff'],
    desc: 'Kashmir BG music: list / off',
    category: 'kashmir',
    react: '🏔️',
    use: '.kbgmusic | .kbgmusic off',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    if (!(ctx.isCreator || ctx.isOwner)) return ctx.reply(OWN);
    const a = String((ctx.args && ctx.args[0]) || '').toLowerCase();
    if (['off', 'stop', 'disable'].includes(a) || ctx.command === 'kbgmusicoff') { kbgm.setAlways(conn, false); return ctx.reply('*🏔️ KASHMIR BG MUSIC OFF*'); }
    const st = kbgm.status(conn);
    return ctx.reply(`*🏔️ KASHMIR BG MUSIC*\n\nAbhi: ${st.always ? `🟢 ON (gaana ${st.track})` : st.armed ? `🟡 agli voice par (gaana ${st.track})` : '🔴 OFF'}\n\n` +
        kbgm.tracks().map(n => `🎵 \`.kbgmusic${n} on\``).join('\n') + '\n\n🔊 Music 35% · Awaaz 65%\nBand: `.kbgmusic off`');
});

// ═════════════ 2) KPHOTO ═════════════
const PHOTO_Q = ['Kashmir valley landscape', 'Dal Lake Srinagar', 'Gulmarg snow', 'Pahalgam valley', 'Neelum Valley', 'Sonamarg', 'Kashmir chinar autumn',
    'Kashmir shikara', 'Azad Kashmir lake', 'Ratti Gali lake', 'Kashmir mountains snow', 'Kashmir saffron fields', 'Muzaffarabad Neelum river', 'Leepa Valley', 'Banjosa lake'];
async function commonsPhoto(seen) {
    for (let tries = 0; tries < 4; tries++) {
        const q = rnd(PHOTO_Q);
        const r = await axios.get('https://commons.wikimedia.org/w/api.php', {
            timeout: 20000, headers: { 'User-Agent': UA },
            params: { action: 'query', generator: 'search', gsrsearch: `${q} filetype:bitmap`, gsrnamespace: 6, gsrlimit: 40, gsroffset: tries === 0 ? ri(0, 60) : 0,
                prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: 1400, format: 'json' }
        });
        const pages = Object.values((r.data && r.data.query && r.data.query.pages) || {});
        let pool = pages.map(p => ({ p, i: p.imageinfo && p.imageinfo[0] })).filter(x => x.i && /jpeg|png/.test(x.i.mime) && x.i.width >= 900 && x.i.thumburl);
        const fresh = pool.filter(x => !seen.has(x.p.pageid));
        if (fresh.length) pool = fresh;
        if (!pool.length) continue;
        const c = rnd(pool);
        const meta = c.i.extmetadata || {};
        const artist = String((meta.Artist && meta.Artist.value) || '').replace(/<[^>]+>/g, '').trim().slice(0, 60);
        const lic = (meta.LicenseShortName && meta.LicenseShortName.value) || '';
        const buf = await axios.get(c.i.thumburl, { responseType: 'arraybuffer', timeout: 40000, headers: { 'User-Agent': UA } });
        return { buffer: Buffer.from(buf.data), id: c.p.pageid, place: q, credit: [artist && `📸 ${artist}`, lic && `📄 ${lic}`].filter(Boolean).join(' · ') };
    }
    throw new Error('commons: koi photo nahi');
}
async function aiPhoto() {
    const styles = ['golden hour', 'snowfall', 'misty morning', 'autumn chinar colors', 'spring blossoms', 'starry night', 'sunrise'];
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent('beautiful Kashmir valley, ' + rnd(styles) + ', photorealistic landscape')}?width=1024&height=1024&nologo=true&seed=${ri(1, 999999)}`;
    const r = await axios.get(url, { responseType: 'arraybuffer', timeout: 90000, headers: { 'User-Agent': UA } });
    return { buffer: Buffer.from(r.data), id: 'ai' + Date.now(), place: 'Kashmir (AI)', credit: '🤖 AI generated' };
}
cmd({
    pattern: 'kphoto', alias: ['kashmirphoto', 'kpic', 'kimg'],
    desc: 'Har baar Kashmir ki nayi photo', category: 'kashmir', react: '📸', use: '.kphoto', filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const seen = seenIn(from, 'photo');
    let got = null;
    try { got = await commonsPhoto(seen); } catch (e) { console.warn('[KPHOTO] commons:', e.message); }
    if (!got) { try { got = await aiPhoto(); } catch (e) { console.warn('[KPHOTO] ai:', e.message); } }
    if (!got) return reply('❌ Photo abhi nahi mil saki, thori der baad try karo.');
    remember(seen, got.id);
    await conn.sendMessage(from, { image: got.buffer, caption: `🏔️ *KASHMIR*\n📍 ${got.place}${got.credit ? '\n' + got.credit : ''}${FOOT()}` }, { quoted: mek });
});

// ═════════════ 3) KVIDEO (TikTok) ═════════════
const VIDEO_Q = ['kashmir', 'kashmir valley', 'kashmir snowfall', 'kashmir beauty', 'neelum valley', 'gulmarg', 'dal lake', 'kashmiri song', 'azad kashmir', 'pahalgam'];
cmd({
    pattern: 'kvideo', alias: ['kashmirvideo', 'kvid', 'ktiktok'],
    desc: 'Har baar TikTok se Kashmir ki nayi video', category: 'kashmir', react: '🎬', use: '.kvideo', filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const seen = seenIn(from, 'video');
    conn.sendMessage(from, { react: { text: '⏳', key: mek.key } }).catch(() => {});
    let result = null; const errs = [];
    try {
        const sv = require('./zz-social-videos');
        for (const q of [...VIDEO_Q].sort(() => Math.random() - 0.5).slice(0, 3)) {
            try {
                const all = await sv.tikwmSearch(q);
                let list = all.filter(v => !seen.has(v.id)); if (!list.length) list = all;
                if (!list.length) continue;
                const v = rnd(list.slice(0, 12));
                result = { buffer: await sv.fetchBuffer(v.url), title: v.title, author: v.author, id: v.id, source: 'TikTok' };
                break;
            } catch (e) { errs.push(String(e.message).slice(0, 60)); }
        }
    } catch (e) { errs.push(e.message); }
    if (!result) {   // YouTube Shorts
        try {
            const vh = require('../lib/vidhelper'); const mediaDl = require('../lib/media-dl');
            const v = await vh.findVideo(['kashmir shorts', 'kashmir reels', 'kashmir valley short'], { minSec: 5, maxSec: 90 });
            if (v) { const d = await mediaDl.downloadVideo(v.url, 720); result = { buffer: d.buffer, title: v.title, author: v.author && v.author.name, id: v.videoId, source: 'YouTube Shorts' }; }
        } catch (e) { errs.push('yt: ' + String(e.message).slice(0, 60)); }
    }
    if (!result) { conn.sendMessage(from, { react: { text: '❌', key: mek.key } }).catch(() => {}); console.warn('[KVIDEO]', errs.join(' | ')); return reply('❌ Video abhi nahi mil saki. Thori der baad dobara try karo.'); }
    remember(seen, result.id);
    const title = String(result.title || '').replace(/\s+/g, ' ').trim().slice(0, 100);
    await conn.sendMessage(from, { video: result.buffer, mimetype: 'video/mp4', caption: `🏔️ *KASHMIR VIDEO*\n${title ? '🎞️ ' + title + '\n' : ''}${result.author ? '👤 ' + result.author + '\n' : ''}📡 ${result.source}${FOOT()}` }, { quoted: mek });
    conn.sendMessage(from, { react: { text: '✅', key: mek.key } }).catch(() => {});
});

// ═════════════ 4) KSONG / KVIDEOSONG ═════════════
const SONG_Q = ['kashmiri song', 'kashmiri sad song', 'kashmir song', 'kashmiri romantic song', 'kashmiri folk song', 'kashmiri naat', 'wadiyan kashmir song', 'kashmiri new song', 'kashmiri wedding song', 'kashmiri rubab song'];
async function pickSong(chat, kind) {
    const yts = require('yt-search');
    const seen = seenIn(chat, kind);
    let pool = [], ids = new Set();
    for (const q of [...SONG_Q].sort(() => Math.random() - 0.5).slice(0, 3)) {
        try {
            const r = await yts(q);
            for (const v of r.videos || []) if (!ids.has(v.videoId) && v.seconds >= 90 && v.seconds <= 720) { ids.add(v.videoId); pool.push(v); }
        } catch (e) { console.warn('[KSONG] search:', e.message); }
    }
    if (!pool.length) return null;
    const fresh = pool.filter(v => !seen.has(v.videoId));
    const v = rnd((fresh.length ? fresh : pool).slice(0, 12));
    remember(seen, v.videoId);
    return v;
}
const songCap = (icon, v) => `╭━❰ ${icon} KASHMIRI SONG ❱━╮\n┃ 🎵 *${v.title}*\n┃ 🎤 ${(v.author && v.author.name) || 'Unknown'}\n┃ ⏱️ ${v.timestamp || '?'}\n╰━━━━━━━━━━━━━━━━━━╯${FOOT()}`;

cmd({
    pattern: 'ksong', alias: ['kashmirsong', 'kgana', 'kmusic'],
    desc: 'Kashmir ka gaana (audio) — har baar naya', category: 'kashmir', react: '🎵', use: '.ksong', filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const mediaDl = require('../lib/media-dl');
    try {
        const v = await pickSong(from, 'ksong');
        if (!v) return reply('❌ Gaana nahi mila, thori der baad try karo.');
        if (v.thumbnail) await conn.sendMessage(from, { image: { url: v.thumbnail }, caption: songCap('🎵', v) }, { quoted: mek }).catch(() => reply(songCap('🎵', v)));
        else await reply(songCap('🎵', v));
        const d = await mediaDl.downloadAudio(v.url, { fallbackQuery: v.title });
        if (d.buffer.length > mediaDl.MAX_BYTES) return reply('❌ Gaana bohat bara hai.');
        const mime = { mp3: 'audio/mpeg', m4a: 'audio/mp4', opus: 'audio/ogg; codecs=opus', ogg: 'audio/ogg', webm: 'audio/webm' }[d.ext || 'mp3'] || 'audio/mpeg';
        await conn.sendMessage(from, { audio: d.buffer, mimetype: mime, fileName: `${String(v.title).replace(/[\\/:*?"<>|]/g, '').slice(0, 80)}.${d.ext || 'mp3'}`, ptt: false }, { quoted: mek });
    } catch (e) {
        console.warn('[KSONG]', (e.details && e.details.join(' | ')) || e.message);
        reply('❌ Gaana download nahi ho saka.\n💡 ' + (mediaDl.explainError ? mediaDl.explainError(e) || 'Thori der baad try karo.' : 'Thori der baad try karo.'));
    }
});
cmd({
    pattern: 'kvideosong', alias: ['kashmirvideosong', 'kvsong', 'kganavideo'],
    desc: 'Kashmir ka naya video song — har baar naya', category: 'kashmir', react: '🎬', use: '.kvideosong', filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const mediaDl = require('../lib/media-dl');
    try {
        const v = await pickSong(from, 'kvideosong');
        if (!v) return reply('❌ Video song nahi mila, thori der baad try karo.');
        if (v.thumbnail) await conn.sendMessage(from, { image: { url: v.thumbnail }, caption: songCap('🎬', v) + '\n⚡ Video bhej raha hu…' }, { quoted: mek }).catch(() => reply(songCap('🎬', v)));
        const d = await mediaDl.downloadVideo(v.url, 720);
        if (d.buffer.length > mediaDl.MAX_BYTES) return reply('❌ Video bohat bari hai.');
        await conn.sendMessage(from, { video: d.buffer, mimetype: 'video/mp4', caption: `🎬 *${v.title}*${FOOT()}` }, { quoted: mek });
    } catch (e) {
        console.warn('[KVIDEOSONG]', (e.details && e.details.join(' | ')) || e.message);
        reply('❌ Video song download nahi ho saka.\n💡 ' + (mediaDl.explainError ? mediaDl.explainError(e) || 'Thori der baad try karo.' : 'Thori der baad try karo.'));
    }
});

// ═════════════ 5) TEXT COMMANDS (shayari / sad / quotes / dua / facts / food / recipes / places) ═════════════
const SHAYARI = [
    'Barf si khamoshi hai wadiyon ke seene mein,\nkitne aansu jam gaye hain is haseen zameen mein.',
    'Dal ke paani mein chand ab bhi utarta hai,\nbas koi maa raat bhar darwaze par jaagti hai.',
    'Chinar ke patte bhi dard ki kahani likhte hain,\nhar khizaan mein yahan kuch ghar veeran hote hain.',
    'Jannat kehne se zameen jannat nahi banti,\nzakhm bharne se banti hai, aman se banti hai.',
    'Phoolon ki ghati mein khushbu ab bhi baaqi hai,\nmagar muskurahat kahin raaste mein kho gayi hai.',
    'In pahadon ne bohot kuch dekha hai,\nphir bhi ye sabr ban kar khade hain.',
    'Jhelum ki lehron mein ek sargoshi si hai,\nkahin dur kisi ka intezar baaqi hai.',
    'Maa ki dua aur pahadon ki khamoshi,\ndono mein ek sa dard chhupa hai.',
    'Zameen ki jannat hai, par dil udaas hain,\nkaash har ghar mein aman ke chiragh jalen.',
    'Barfbari ke baad bhi dhoop nikalti hai,\nbas yahi umeed hai jo is zameen ko zinda rakhti hai.',
    'Wadi ki subah mein ajeeb si udaasi hai,\njaise kisi ke lautne ki aas abhi baaqi hai.',
    'Ghar ke aangan mein ab bhi chinar khada hai,\nbas koi aane wala nahi, koi bulane wala nahi.',
    'Aansuon se bhi jam jati hain yahan sardiyan,\nphir bhi dil mein garmi hai dua ki.',
    'Kitni haseen hai ye zameen, kitna bhari hai iska dil,\nharf-e-dua se hi sahi, ek roz sab theek hoga.',
    'Zakhmon ki ek ghati bhi hai is jannat ke andar,\nrab kare ye zakhm kabhi na gehre hon aur.'
];
const SAD = [
    '🏔️ Kashmir ki wadiyan khoobsurat hain, par kitne dil in mein udaas hain…',
    '💔 Jannat kehlane wali zameen ke aansu kaun dekhta hai?',
    '🕊️ Dua hai ke Kashmir ke har ghar mein sukoon aur aman ho.',
    '🍂 Chinar ki tarah, yahan ke log bhi har khizaan ke baad bahaar ki umeed rakhte hain.',
    '🌨️ Barf gir rahi hai, magar dilon ka bojh us se bhi zyada hai.',
    '🤲 Ya Allah, Kashmir ke mazloomon ki madad farma, unke dilon ko sabr de.',
    '😔 Khoobsurat wadiyon ke peeche kuch kahaniyan sirf maa ke dil ko pata hoti hain.',
    '🌹 Jis zameen ko jannat kaha, uske logon ko bhi jannat jaisa sukoon mile.',
    '🕯️ Har raat ek chiragh unke naam jo apne ghar lautne ka intezar karte hain.',
    '💭 Kashmir sirf ek jagah nahi, ek ehsaas hai — husn bhi, dard bhi.',
    '🌙 Jhelum ke kinare shaam bohot udaas hoti hai…',
    '🏔️ Sabr ke pahad jaise log, umeed ki barf jaisi saaf dil.'
];
const QUOTES = [
    '🌄 "Andheri raat ke baad subah zaroor hoti hai" — Kashmir ki barf bhi bahaar mein pighal jati hai.',
    '🤍 "Sabr karne walon ke saath Allah hai." (Quran 2:153)',
    '🌸 Jis ne khizaan mein bhi chinar ko laal hote dekha, wo jaanta hai ke zawaal mein bhi husn hota hai.',
    '🕊️ Aman wo tohfa hai jo har bachche ka haq hai — chahe wo kisi bhi wadi mein ho.',
    '🌱 Barf ke neeche bhi beej zinda rehta hai — umeed kabhi nahi marti.',
    '🏔️ Pahad jhukte nahi, sabr karte hain.',
    '✨ "Beshak mushkil ke saath aasani hai." (Quran 94:6)',
    '🌅 Har lambi raat ki ek subah hoti hai.'
];
const pickText = (arr, icon, title) => `${icon} *${title}*\n\n${rnd(arr)}${FOOT()}`;

cmd({ pattern: 'kshayari', alias: ['kashmirshayari', 'kpoetry'], desc: 'Kashmir par dard bhari shayari', category: 'kashmir', react: '💔', use: '.kshayari', filename: __filename },
    async (conn, mek, m, { reply }) => reply(pickText(SHAYARI, '💔', 'KASHMIR SHAYARI')));
cmd({ pattern: 'ksad', alias: ['kashmirsad', 'kstatus'], desc: 'Kashmir ka udaas status / lines', category: 'kashmir', react: '🥀', use: '.ksad', filename: __filename },
    async (conn, mek, m, { reply }) => reply(pickText(SAD, '🥀', 'KASHMIR SAD STATUS')));
cmd({ pattern: 'kquote', alias: ['kashmirquote', 'kumeed'], desc: 'Umeed aur sabr ki lines', category: 'kashmir', react: '🌄', use: '.kquote', filename: __filename },
    async (conn, mek, m, { reply }) => reply(pickText(QUOTES, '🌄', 'UMEED & SABR')));

cmd({ pattern: 'kdua', alias: ['kashmirdua', 'duakashmir'], desc: 'Kashmir ke mazloomon ke liye dua', category: 'kashmir', react: '🤲', use: '.kdua', filename: __filename },
    async (conn, mek, m, { reply }) => reply(
`🤲 *KASHMIR KE LIYE DUA*

1️⃣ حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ
_Hasbunallahu wa ni'mal wakeel_
Allah hamein kaafi hai aur wohi behtareen kaarsaaz hai. (Quran 3:173)

2️⃣ رَبَّنَا أَفْرِغْ عَلَيْنَا صَبْرًا وَثَبِّتْ أَقْدَامَنَا
_Rabbana afrigh 'alayna sabran wa thabbit aqdamana_
Aye hamare Rab! Hum par sabr undel de aur hamare qadam jama de. (Quran 2:250)

3️⃣ اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ
_Allahumma inni as'alukal 'afiyata fid-dunya wal-akhirah_
Aye Allah! Main tujh se dunya aur aakhirat ki aafiyat maangta hu.

4️⃣ إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ
_Inna lillahi wa inna ilayhi raji'oon_
Hum Allah ke hain aur usi ki taraf lautne wale hain. (Quran 2:156)

💚 Ya Allah, Kashmir ke har ghar mein aman, sukoon aur sabr naazil farma. Ameen.${FOOT()}`));

cmd({ pattern: 'kfacts', alias: ['kashmirfacts', 'kfact'], desc: 'Kashmir ke baare mein dilchasp maloomat', category: 'kashmir', react: '📚', use: '.kfacts', filename: __filename },
    async (conn, mek, m, { reply }) => {
        const F = [
            'Kashmir ko "Jannat-e-Arz" (dharti ki jannat) kaha jata hai.',
            'Dal Lake (Srinagar) apni shikara kashtiyon aur houseboats ki wajah se mashhoor hai.',
            'Pampore ka zafran (saffron) dunya bhar mein mashhoor hai.',
            'Khizaan mein chinar ke patte laal aur sunehri ho jate hain — Kashmir ka sab se haseen manzar.',
            'Kashmiri pashmina shawls aur hath ke bune qaleen puri dunya mein pasand kiye jate hain.',
            'Kahwa (zafran wali chai) aur Noon Chai (gulabi chai) Kashmir ki pehchan hain.',
            'Gulmarg dunya ke bulandtareen ski resorts aur cable car (gondola) ke liye jana jata hai.',
            'Neelum Valley (Azad Kashmir) mein Sharda, Keran aur Arang Kel jaisi haseen jaghen hain.',
            'Kashmir ki mashhoor dawat "Wazwan" kai dishes ka shahi khana hota hai.',
            'Yahan ki zabanon mein Kashmiri, Urdu, Pahari, Gojri aur Pashto shamil hain.',
            'Jhelum aur Neelum jaise darya wadiyon se guzarte hain.',
            'Kashmir mein Sufi buzurgon ki bohot lambi rawayat rahi hai.',
            'Papier-mache aur akhrot ki lakdi ki naqqashi Kashmiri hunar ki pehchan hain.'
        ];
        reply(`📚 *KASHMIR FACT*\n\n✨ ${rnd(F)}${FOOT()}`);
    });

cmd({ pattern: 'kfood', alias: ['kashmirfood', 'kwazwan', 'kkhana'], desc: 'Kashmiri khane', category: 'kashmir', react: '🍲', use: '.kfood', filename: __filename },
    async (conn, mek, m, { reply }) => reply(
`🍲 *KASHMIRI KHANE*

🍖 *Rogan Josh* — laal mirch aur khushboodar masalon mein pakka gosht
🥩 *Gushtaba* — dahi ki gravy mein narm qeema gole (Wazwan ka taaj)
🍗 *Yakhni* — dahi aur saunf wali safed gravy
🥔 *Dum Aloo* — masaledar chhote aloo
🥬 *Haak* — Kashmiri saag (sada, simple, mashhoor)
🍚 *Tabak Maaz* — tali hui narm pasliyan
🍵 *Kahwa* & *Noon Chai* — Kashmir ki pehchan
🍞 *Girda / Lavasa / Kulcha* — Kashmiri roti

📖 Recipe ke liye: \`.kkahwa\`  \`.knoonchai\`${FOOT()}`));

cmd({ pattern: 'kkahwa', alias: ['kahwa', 'kashmirikahwa'], desc: 'Kashmiri Kahwa ki recipe', category: 'kashmir', react: '🍵', use: '.kkahwa', filename: __filename },
    async (conn, mek, m, { reply }) => reply(
`🍵 *KASHMIRI KAHWA*

*Samaan (2 cup):*
• 2 cup paani • 1 tsp hari chai patti
• 3-4 elaichi (kuti hui) • 1 chhoti daalchini
• 4-5 laung • 6-8 badam (kate hue)
• zafran ke 6-7 dhaage • shehad/cheeni swad anusar

*Tareeqa:*
1️⃣ Paani mein daalchini, elaichi, laung aur zafran daal kar 5 min ubalein.
2️⃣ Chai patti daal kar 1-2 min halki aanch par rakhein.
3️⃣ Chan kar cup mein daalein, shehad milayen.
4️⃣ Upar se badam daal kar garam garam piyein ☕${FOOT()}`));

cmd({ pattern: 'knoonchai', alias: ['noonchai', 'pinktea', 'kgulabichai'], desc: 'Noon Chai (gulabi chai) ki recipe', category: 'kashmir', react: '🫖', use: '.knoonchai', filename: __filename },
    async (conn, mek, m, { reply }) => reply(
`🫖 *NOON CHAI (GULABI CHAI)*

*Samaan:*
• 3 cup paani • 2 tsp Kashmiri chai patti
• 1/4 tsp baking soda • 1 cup doodh (thanda)
• namak swad anusar • badam/pista (sajawat)

*Tareeqa:*
1️⃣ Paani mein chai patti aur baking soda daal kar 25-30 min dheemi aanch par ubalein (rang gehra laal ho jaye).
2️⃣ Thande doodh ko thoda thoda daal kar spoon se uthate girate rahein — rang gulabi ho jayega.
3️⃣ Namak milayen, 5 min pakayen.
4️⃣ Badam pista se saja kar bread ya baqarkhani ke saath piyein.${FOOT()}`));

cmd({ pattern: 'kplaces', alias: ['kashmirplaces', 'kvisit', 'kjaghen'], desc: 'Kashmir ki haseen jaghen', category: 'kashmir', react: '🗺️', use: '.kplaces', filename: __filename },
    async (conn, mek, m, { reply }) => reply(
`🗺️ *KASHMIR KI HASEEN JAGHEN*

🏞️ *Dal Lake & Shalimar Bagh* (Srinagar) — shikara, houseboats, Mughal baagh
❄️ *Gulmarg* — barf, ski aur gondola
🌲 *Pahalgam* — Lidder darya aur ghane jungle
🏔️ *Sonamarg* — sunehri ghaas ke maidan, glacier
💎 *Neelum Valley* — Sharda, Keran, Arang Kel (Azad Kashmir)
🌊 *Ratti Gali Lake* — alpine neela paani
🏕️ *Banjosa Lake* (Rawalakot) — pine jungle ke beech jheel
🌄 *Leepa Valley* — khoobsurat sabz wadi
🕌 *Muzaffarabad* — Jhelum aur Neelum ka sangam

📸 Photo ke liye: \`.kphoto\`  🌦️ Mausam: \`.kweather\`${FOOT()}`));

// ═════════════ 6) KWEATHER / KNAMAZ ═════════════
const CITIES = {
    srinagar: { n: 'Srinagar', lat: 34.0837, lon: 74.7973 }, gulmarg: { n: 'Gulmarg', lat: 34.0484, lon: 74.3805 },
    pahalgam: { n: 'Pahalgam', lat: 34.0161, lon: 75.3150 }, sonamarg: { n: 'Sonamarg', lat: 34.3000, lon: 75.2833 },
    muzaffarabad: { n: 'Muzaffarabad', lat: 34.3700, lon: 73.4711 }, neelum: { n: 'Neelum (Sharda)', lat: 34.7981, lon: 74.1858 },
    rawalakot: { n: 'Rawalakot', lat: 33.8578, lon: 73.7604 }, mirpur: { n: 'Mirpur', lat: 33.1478, lon: 73.7518 }, kotli: { n: 'Kotli', lat: 33.5186, lon: 73.9022 }
};
const WCODE = { 0: '☀️ Saaf aasman', 1: '🌤️ Zyadatar saaf', 2: '⛅ Kuch badal', 3: '☁️ Badal', 45: '🌫️ Dhund', 48: '🌫️ Barfeeli dhund', 51: '🌦️ Halki phuhar', 53: '🌦️ Phuhar', 55: '🌧️ Tez phuhar',
    61: '🌧️ Halki barish', 63: '🌧️ Barish', 65: '🌧️ Tez barish', 71: '🌨️ Halki barfbari', 73: '❄️ Barfbari', 75: '❄️ Tez barfbari', 77: '❄️ Barf ke zarre', 80: '🌦️ Barish ke chhaante', 81: '🌧️ Barish ke chhaante', 82: '⛈️ Shadeed barish',
    85: '🌨️ Barfbari ke chhaante', 86: '❄️ Shadeed barfbari', 95: '⛈️ Aandhi toofan', 96: '⛈️ Ole ke saath toofan', 99: '⛈️ Ole ke saath toofan' };
const cityOf = (arg) => { const k = String(arg || '').toLowerCase().replace(/[^a-z]/g, ''); return CITIES[k] || (k ? null : CITIES.srinagar); };
const cityList = () => Object.values(CITIES).map(c => c.n).join(', ');

cmd({ pattern: 'kweather', alias: ['kmausam', 'kashmirweather'], desc: 'Kashmir ke shehron ka mausam', category: 'kashmir', react: '🌦️', use: '.kweather srinagar', filename: __filename },
    async (conn, mek, m, { reply, text }) => {
        const c = cityOf(text);
        if (!c) return reply(`❌ Ye shehar list mein nahi.\nMilne wale: ${cityList()}`);
        try {
            const r = await axios.get('https://api.open-meteo.com/v1/forecast', { timeout: 20000, headers: { 'User-Agent': UA },
                params: { latitude: c.lat, longitude: c.lon, current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m', daily: 'temperature_2m_max,temperature_2m_min,weather_code', timezone: 'auto', forecast_days: 3 } });
            const cu = r.data.current, d = r.data.daily;
            const days = d.time.map((t, i) => `📅 ${t}: ${WCODE[d.weather_code[i]] || ''} ${Math.round(d.temperature_2m_min[i])}° / ${Math.round(d.temperature_2m_max[i])}°C`).join('\n');
            reply(`🌦️ *${c.n.toUpperCase()} KA MAUSAM*\n\n🌡️ Abhi: *${Math.round(cu.temperature_2m)}°C* (mehsoos ${Math.round(cu.apparent_temperature)}°C)\n${WCODE[cu.weather_code] || ''}\n💧 Nami: ${cu.relative_humidity_2m}%\n💨 Hawa: ${cu.wind_speed_10m} km/h\n\n*Agle 3 din:*\n${days}\n\n_Dusre shehar:_ ${cityList()}${FOOT()}`);
        } catch (e) { reply('❌ Mausam abhi nahi mil saka, thori der baad try karo.'); }
    });

cmd({ pattern: 'knamaz', alias: ['kprayer', 'kashmirnamaz', 'knamaztime'], desc: 'Kashmir ke shehron mein namaz ke auqaat', category: 'kashmir', react: '🕌', use: '.knamaz srinagar', filename: __filename },
    async (conn, mek, m, { reply, text }) => {
        const c = cityOf(text);
        if (!c) return reply(`❌ Ye shehar list mein nahi.\nMilne wale: ${cityList()}`);
        try {
            const r = await axios.get('https://api.aladhan.com/v1/timings', { timeout: 20000, headers: { 'User-Agent': UA }, params: { latitude: c.lat, longitude: c.lon, method: 1 } });
            const t = r.data.data.timings, tz = r.data.data.meta && r.data.data.meta.timezone;
            reply(`🕌 *${c.n.toUpperCase()} — NAMAZ KE AUQAAT*\n\n🌙 Fajr: *${t.Fajr}*\n🌅 Sunrise: ${t.Sunrise}\n☀️ Zuhr: *${t.Dhuhr}*\n🌤️ Asr: *${t.Asr}*\n🌇 Maghrib: *${t.Maghrib}*\n🌃 Isha: *${t.Isha}*\n\n🕒 Time zone: ${tz || '-'}\n_(Karachi University method)_${FOOT()}`);
        } catch (e) { reply('❌ Namaz ke auqaat abhi nahi mil sake, thori der baad try karo.'); }
    });

module.exports = { CITIES };
