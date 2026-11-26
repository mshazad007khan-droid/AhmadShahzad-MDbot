// plugins/feelings.js
// 𝐀𝐡𝐦𝐚𝐝𝐒𝐡𝐚𝐡𝐳𝐚𝐝-𝐌𝐃 — 40+ Emotion Commands
// Each command fetches GIF matching its exact emotion

const { cmd } = require('../arslan');
const axios = require('axios');

const NEKOS_BEST = 'https://nekos.best/api/v2';
const WAIFU_PICS = 'https://api.waifu.pics/sfw';
const UA = 'AhmadShahzad-MD/3.0';

async function get(url) {
    const res = await axios.get(url, {
        timeout: 12000,
        headers: { 'User-Agent': UA }
    });
    return res.data;
}

const isUrl = v => typeof v === 'string' && /^https?:\/\//i.test(v);

// ═══════════════════════════════════════════
//  GIF FETCHER (v11) — 4 sources, har ek se kai candidate; jo pehle chale wo bhej do.
//  Ek API down ho to dusri khud chalti hai; sab fail ho to text animation aati hai.
// ═══════════════════════════════════════════
const OTAKU = { cry: 'cry', dance: 'dance', happy: 'happy', laugh: 'laugh', smile: 'smile', wink: 'wink', wave: 'wave', hug: 'hug', kiss: 'kiss',
    cuddle: 'cuddle', pat: 'pat', handhold: 'handhold', blush: 'blush', slap: 'slap', punch: 'punch', bite: 'bite', poke: 'poke', nom: 'nom', sleep: 'sleep',
    yawn: 'yawn', stare: 'stare', smug: 'smug', think: 'confused', tickle: 'tickle', pout: 'pout', facepalm: 'facepalm', nope: 'no', shrug: 'shrug',
    thumbsup: 'thumbsup', highfive: 'brofist', nod: 'yes', bored: 'sigh', cringe: 'nervous', kick: 'punch', yeet: 'run', lurk: 'peek', shoot: 'punch' };
const WAIFU = { cry: 'cry', dance: 'dance', happy: 'happy', laugh: 'happy', smile: 'smile', wink: 'wink', wave: 'wave', hug: 'hug', kiss: 'kiss',
    cuddle: 'cuddle', pat: 'pat', handhold: 'handhold', blush: 'blush', slap: 'slap', punch: 'bonk', bite: 'bite', poke: 'poke', nom: 'nom', sleep: 'cuddle',
    yawn: 'cuddle', stare: 'smug', smug: 'smug', think: 'smug', tickle: 'poke', pout: 'bully', facepalm: 'cringe', nope: 'bonk', shrug: 'cringe',
    thumbsup: 'highfive', highfive: 'highfive', nod: 'happy', bored: 'cringe', cringe: 'cringe', kick: 'kick', yeet: 'yeet', lurk: 'smug', shoot: 'kill' };

async function fetchGifs(category) {
    const out = [];
    const add = (url, extra) => { if (isUrl(url) && !out.some(o => o.url === url)) out.push({ url, ...(extra || {}) }); };
    const tasks = [
        get(`${NEKOS_BEST}/${category}?amount=3`).then(d => (d?.results || []).forEach(r => add(r.url, { artist: r.artist_name, anime: r.anime_name }))),
        OTAKU[category] ? get(`https://api.otakugifs.xyz/gif?reaction=${OTAKU[category]}`).then(d => add(d?.url)) : Promise.resolve(),
        WAIFU[category] ? get(`${WAIFU_PICS}/${WAIFU[category]}`).then(d => add(d?.url)) : Promise.resolve(),
        WAIFU[category] ? get(`${WAIFU_PICS}/${WAIFU[category]}`).then(d => add(d?.url)) : Promise.resolve(),
        get(`https://nekos.life/api/v2/img/${category}`).then(d => add(d?.url)).catch(() => {})
    ].map(p => p.catch(() => {}));
    await Promise.all(tasks);
    return out;
}
// purana naam (dusre plugins use karte hon to)
async function fetchGif(category) { const l = await fetchGifs(category); return l[0] || null; }

// Text animation fallback (kisi bhi GIF source ke na chalne par)
const FALLBACK = {
    dance: ['💃', '🕺', '💃🕺', '🎶💃', '🎶🕺', '💃🎶🕺', '🎉💃🕺🎉'],
    happy: ['😃', '😄', '😁', '😆', '🥳', '🎉'], smile: ['🙂', '😊', '😄', '😁'], laugh: ['😂', '🤣', '😹', '😂🤣', '🤣🤣🤣'],
    cry: ['🥺', '😢', '😭', '😭😭', '💧😭💧'], hug: ['🫂', '🤗', '🫂💞', '🤗❤️'], kiss: ['😘', '💋', '😚💋', '😘❤️'],
    angry: ['😠', '😡', '🤬', '😡💢'], sleep: ['😴', '😴💤', '💤💤💤']
};
async function fallbackAnimation(conn, jid, key, caption, mek) {
    const frames = FALLBACK[key] || ['✨', '🌟', '💫', '✨'];
    const sent = await conn.sendMessage(jid, { text: frames[0] }, { quoted: mek });
    for (const f of frames.slice(1)) {
        await new Promise(r => setTimeout(r, 700));
        try { await conn.sendMessage(jid, { text: f, edit: sent.key }); } catch (_) { break; }
    }
    await new Promise(r => setTimeout(r, 500));
    try { await conn.sendMessage(jid, { text: `${frames[frames.length - 1]} ${caption}`, edit: sent.key }); } catch (_) {}
}

// ═══════════════════════════════════════════
//  COMMAND REGISTER HELPER
// ═══════════════════════════════════════════
function emotion(pattern, aliases, category, emoji, caption) {
    cmd({
        pattern,
        alias: aliases,
        desc: `${caption} anime GIF`,
        category: 'emotions',
        react: emoji,
        use: `.${pattern}`,
        filename: __filename
    }, async (conn, mek, m, ctx) => {
        const from = ctx.from || mek.key.remoteJid;
        try {
            const list = await fetchGifs(category);
            for (const r of list) {
                try {
                    let cap = `${emoji} ${caption}`;
                    if (r.anime) cap += `\n📺 ${String(r.anime).slice(0, 80)}`;
                    if (r.artist) cap += `\n🎨 ${String(r.artist).slice(0, 60)}`;
                    await require('../lib/gifsend').sendGif(conn, from, r.url, cap, mek);
                    return;
                } catch (e) { console.warn(`[feelings] ${pattern} source fail:`, e.message); }
            }
            return await fallbackAnimation(conn, from, category === 'pout' ? 'angry' : category, caption, mek);
        } catch (e) {
            console.warn(`[feelings] ${pattern}:`, e.message);
            return ctx.reply(`❌ ${caption} abhi nahi chal saka. Dobara try karo.`);
        }
    });
}

// ═══════════════════════════════════════════
//  😄 HAPPY — 6 commands
// ═══════════════════════════════════════════
emotion('happy',     ['feelhappy'],           'happy',     '😄', '*HAPPY!*');
emotion('smile',     ['smiling', 'muskuray'],           'smile',     '😊', '*SMILE*');
emotion('laugh',     ['hasi', 'lol', 'laughing'],       'laugh',     '😂', '*HAHAHA!*');
emotion('dance',     ['nach', 'party', 'dancing'],      'dance',     '💃', '*DANCING!*');
emotion('wink',      ['winking', 'ankh'],               'wink',      '😉', '*WINK*');
emotion('wave',      ['waving'],         'wave',      '👋', '*HELLO!*');

// ═══════════════════════════════════════════
//  😢 SAD — 6 commands
// ═══════════════════════════════════════════
emotion('sad',       ['dukhi', 'feelsad'],              'cry',       '😢', '*SAD...*');
emotion('cry',       ['rona', 'tears', 'crying'],       'cry',       '😭', '*CRYING...*');
emotion('pout',      ['pouting'],              'pout',      '😤', '*POUTING*');
emotion('facepalm',  ['fp', 'facep'],                   'facepalm',  '🤦', '*FACEPALM*');
emotion('bored',     ['boring', 'meh'],                 'bored',     '😐', '*BORED...*');
emotion('nope',      ['nahi'],                    'nope',      '🙅', '*NOPE!*');

// ═══════════════════════════════════════════
//  ❤️ LOVE — 7 commands
// ═══════════════════════════════════════════
emotion('hug',       ['gale', 'hugging'],               'hug',       '🫂', '*HUG*');
emotion('kiss',      ['pyaar', 'chumma', 'kissing'],    'kiss',      '💋', '*KISS*');
emotion('cuddle',    ['cuddling', 'cud'],               'cuddle',    '🥰', '*CUDDLE*');
emotion('pat',       ['headpat', 'sehr'],               'pat',       '🖐️', '*HEADPAT*');
emotion('handhold',  ['holdhand'],                  'handhold',  '🤝', '*HAND HOLD*');
emotion('blush',     ['sharma', 'blushing'],            'blush',     '😳', '*BLUSH*');
emotion('love',      ['iloveyou', 'pyar'],              'cuddle',    '❤️', '*LOVE*');

// ═══════════════════════════════════════════
//  😡 ANGRY — 6 commands
// ═══════════════════════════════════════════
emotion('slap',      ['thappar', 'slapping'],           'slap',      '👋', '*SLAP!*');
emotion('punch',     ['mukka', 'punching'],             'punch',     '👊', '*PUNCH!*');
emotion('kick',      ['laat', 'kicking'],               'kick',      '🦵', '*KICK!*');
emotion('bite',      ['kaat', 'biting'],                'bite',      '🦷', '*BITE!*');
emotion('poke',      ['chubh', 'poking'],               'poke',      '👉', '*POKE*');
emotion('angry',     ['gussa', 'furious'],              'pout',      '😡', '*ANGRY!*');

// ═══════════════════════════════════════════
//  🤪 FUN / SILLY — 8 commands
// ═══════════════════════════════════════════
emotion('nom',       ['khana', 'eating'],               'nom',       '🍽️', '*NOM NOM*');
emotion('sleep',     ['sona', 'sleepy'],                'sleep',     '😴', '*SLEEPY...*');
emotion('yawn',      ['yawning'],                       'yawn',      '🥱', '*YAWN*');
emotion('stare',     ['ghoor', 'staring'],              'stare',     '👀', '*STARE*');
emotion('smug',      ['smart', 'smirking'],             'smug',      '😏', '*SMUG*');
emotion('think',     ['sochna', 'thinking'],            'think',     '🤔', '*THINKING...*');
emotion('tickle',    ['tickling'],                      'tickle',    '🪶', '*TICKLE*');
emotion('shrug',     ['idk', 'pataNahi'],               'shrug',     '🤷', '*SHRUG*');

// ═══════════════════════════════════════════
//  🎉 PARTY / WIN — 5 commands
// ═══════════════════════════════════════════
emotion('thumbsup',  ['thumbs'],          'thumbsup',  '👍', '*THUMBS UP!*');
emotion('highfive',  ['high5', 'hf'],                   'highfive',  '🙌', '*HIGH FIVE!*');
emotion('yeet',      ['yeeting'],                       'yeet',      '🚀', '*YEET!*');
emotion('nod',       ['haan'],                   'nod',       '✅', '*NOD*');
emotion('lurk',      ['watching', 'dekh'],              'lurk',      '👁️', '*LURKING...*');

// ═══════════════════════════════════════════
//  EXTRA — 3 commands
// ═══════════════════════════════════════════
emotion('cringe',    ['cringing'],                      'cringe',    '😬', '*CRINGE*');
emotion('bonk',      ['bonking', 'hit'],                'slap',      '🔨', '*BONK!*');
emotion('shoot',     ['shooting'],                      'punch',     '🔫', '*SHOOT!*');

// ═══════════════════════════════════════════
//  .feelings — list all
// ═══════════════════════════════════════════
cmd({
    pattern: 'feelings',
    alias: ['emotions', 'feels', 'emojis', 'gifs'],
    desc: 'Show all emotion commands',
    category: 'emotions',
    react: '💫',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    return ctx.reply(
`💫 *AHMAD SHAHZAD EMOTIONS — 40+ Commands*

😄 *HAPPY (6):*
.happy .smile .laugh .dance .wink .wave

😢 *SAD (6):*
.sad .cry .pout .facepalm .bored .nope

❤️ *LOVE (7):*
.hug .kiss .cuddle .pat .handhold .blush .love

😡 *ANGRY (6):*
.slap .punch .kick .bite .poke .angry

🤪 *FUN (8):*
.nom .sleep .yawn .stare .smug .think .tickle .shrug

🎉 *PARTY (5):*
.thumbsup .highfive .yeet .nod .lurk

🎬 *EXTRA (3):*
.cringe .bonk .shoot

💛 *SUPPORT:*
.mood <happy|sad|angry|tired|lonely|grateful> .comfort .affirmation

💡 Har command apna exact emotion GIF bhejta hai
🎬 Powered by Nekos.best + waifu.pics`
    );
});

// ═══════════════════════════════════════════
//  .emotion <name> — direct call
// ═══════════════════════════════════════════
cmd({
    pattern: 'emotion',
    alias: ['gif', 'feeling', 'animegif'],
    desc: 'Get any emotion GIF: .emotion <name>',
    category: 'emotions',
    react: '🎬',
    use: '.emotion hug',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const name = (ctx.q || '').toLowerCase().trim().split(/\s+/)[0];

    const map = {
        // happy
        happy: 'happy', smile: 'smile', laugh: 'laugh', dance: 'dance',
        wink: 'wink', wave: 'wave',
        // sad
        sad: 'cry', cry: 'cry', pout: 'pout', facepalm: 'facepalm',
        bored: 'bored', nope: 'nope',
        // love
        hug: 'hug', kiss: 'kiss', cuddle: 'cuddle', pat: 'pat',
        handhold: 'handhold', blush: 'blush', love: 'cuddle',
        // angry
        slap: 'slap', punch: 'punch', kick: 'kick', bite: 'bite',
        poke: 'poke', angry: 'pout',
        // fun
        nom: 'nom', sleep: 'sleep', yawn: 'yawn', stare: 'stare',
        smug: 'smug', think: 'think', tickle: 'tickle', shrug: 'shrug',
        // party
        thumbsup: 'thumbsup', highfive: 'highfive', yeet: 'yeet',
        nod: 'nod', lurk: 'lurk',
        // extra
        cringe: 'cringe', bonk: 'slap', shoot: 'punch'
    };

    if (!name || !map[name]) {
        return ctx.reply(
`🎬 *EMOTION GIF*

📌 *Usage:* .emotion <name>

📖 *Example:* .emotion hug

💡 *Available:* ${Object.keys(map).join(', ')}`
        );
    }

    try {
        const r = await fetchGif(map[name]);
        if (!r?.url) return ctx.reply('❌ GIF unavailable.');

        let cap = `💫 *${name.toUpperCase()}*`;
        if (r.anime) cap += `\n📺 ${String(r.anime).slice(0, 80)}`;
        if (r.artist) cap += `\n🎨 ${String(r.artist).slice(0, 60)}`;

        return require('../lib/gifsend').sendGif(conn, ctx.from, r.url, cap, mek);

    } catch (e) {
        return ctx.reply('❌ Failed.');
    }
});

const pick = items => items[Math.floor(Math.random() * items.length)];
const moodReplies = {
    happy: ['😄 Nice—enjoy the good moment, you earned it.', '✨ Hold onto this feeling; little wins count too.'],
    sad: ['🫂 You do not have to solve everything right now. Take one small step and give yourself some room.', '💙 It is okay to have a rough day. You deserve patience, including from yourself.'],
    angry: ['🌿 Pause for a breath before replying. You can choose what deserves your energy.', '🧊 Step away for a minute if you can; a little space can help.'],
    tired: ['😴 Rest is productive too. Take a break and come back when you have a little more energy.', '☕ One thing at a time. You do not need to finish everything this minute.'],
    lonely: ['🫂 You matter, even when it feels quiet. Consider messaging someone you trust.', '💛 A small hello to someone safe can make the day feel less heavy.'],
    grateful: ['🌼 Take a second to notice what is going right—you can appreciate it without pretending everything is perfect.', '✨ Keep that good feeling close, and share it with someone if you can.']
};
const comforts = [
    '🫂 You do not need to have all the answers today. Breathe, take the next small step, and be kind to yourself.',
    '💙 A difficult moment is not your whole story. You deserve care and a little time to reset.',
    '🌿 Pause, unclench your shoulders, and take one slow breath. You can handle the next step when you are ready.'
];
const affirmations = [
    '🌱 I can take things one step at a time.',
    '💛 My feelings are real, and I can treat myself with patience.',
    '✨ I am allowed to rest and still be making progress.',
    '🌿 I do not need to be perfect to be worthy of respect.'
];

cmd({
    pattern: 'mood',
    alias: ['moodcheck'],
    desc: 'Get a gentle response for your current mood',
    category: 'emotions',
    react: '💛',
    use: '.mood happy|sad|angry|tired|lonely|grateful',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const mood = (ctx.q || '').trim().toLowerCase();
    if (mood && !moodReplies[mood]) {
        return ctx.reply(`💛 Choose one: ${Object.keys(moodReplies).join(', ')}\nExample: .mood tired`);
    }
    const chosen = mood || pick(Object.keys(moodReplies));
    return ctx.reply(`💛 *${chosen.toUpperCase()}*\n${pick(moodReplies[chosen])}`);
});

cmd({
    pattern: 'comfort',
    alias: ['tasalli', 'comfortme'],
    desc: 'Send a supportive, calming message',
    category: 'emotions',
    react: '🫂',
    filename: __filename
}, async (conn, mek, m, ctx) => ctx.reply(pick(comforts)));

cmd({
    pattern: 'affirmation',
    alias: ['positive', 'selftalk'],
    desc: 'Get a kind affirmation',
    category: 'emotions',
    react: '🌱',
    filename: __filename
}, async (conn, mek, m, ctx) => ctx.reply(pick(affirmations)));

console.log('[AhmadShahzad-MD] emotion commands loaded');