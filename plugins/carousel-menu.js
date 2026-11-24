// plugins/carousel-menu.js
// Swipe-able carousel menu (cards) with tappable command buttons + pagination.
//   .cmenu / .menu  -> ek hi swipe carousel (info card + har category ka card). Page/Next button nahi.
// Agar fail ho jaye to khud-ba-khud normal text menu bhej deta hai.

const fs = require('fs');
const path = require('path');
const { cmd, commands } = require('../arslan');
const config = require('../config');
const { getBotPic } = require('../lib/botpic');

// ---------- settings (yahan se badlein) ----------
const CMDS_PER_CARD = 6;        // ek card mein kitni commands (list + buttons)
const CARDS_PER_PAGE = 8;       // ek page par command cards (WhatsApp max 10 cards: info + nav ke liye jagah)
const CATEGORY_ICONS = {
    main: '🏠', general: '🏠', settings: '⚙️', pair: '🔗', channel: '📢', sticker: '🏷️',
    owner: '👑', group: '👥', download: '📥', music: '🎵', anime: '🎌', fun: '🎮',
    games: '🎲', love: '💞', emotions: '😊', islamic: '🕌', tools: '🧰', utility: '🛠️',
    image: '🖼️', system: '💻', search: '🔎', misc: '📦', personal: '👤',
    textfx: '🔤', calc: '🧮', funzone: '🎉', extra: '✨', video: '🎬', prank: '😈', voice: '🎙️', voicechange: '🗣️', ai: '🤖', name: '✍️', videoedit: '🎞️', photoedit: '🖼️', audioedit: '🎧', kashmir: '🏔️'
};
const CATEGORY_ORDER = ['owner', 'voice', 'voicechange', 'kashmir', 'video', 'prank', 'group', 'ai', 'download', 'music', 'tools', 'sticker', 'videoedit', 'photoedit', 'audioedit',
    'fun', 'islamic', 'anime', 'name', 'games', 'love', 'emotions', 'main', 'general', 'settings', 'utility', 'image', 'system', 'search', 'misc', 'textfx', 'calc', 'funzone'];
const TOP_COMMANDS = ['song', 'video', 'play', 'tiktok', 'fb', 'ig', 'ytmp3', 'ai', 'sticker', 'vv', 'tts', 'bgmusicvoice', 'prank', 'ping', 'alive', 'owner', 'menu'];
// -------------------------------------------------

const PREFIX = () => config.PREFIX || '.';
const botName = () => String(config.BOT_NAME || '𝐀𝐡𝐦𝐚𝐝𝐒𝐡𝐚𝐡𝐳𝐚𝐝-𝐌𝐃').trim();

function uptimeText() {
    let s = Math.floor(process.uptime());
    const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
    s = s % 60;
    return `${d ? d + 'd ' : ''}${h}h ${m}m ${s}s`;
}

// Saari visible commands ko category ke hisaab se group karo
function groupCommands() {
    const grouped = {};
    const seen = new Set();
    let total = 0;
    for (const c of commands) {
        if (!c.pattern || c.dontAddCommandList || typeof c.function !== 'function' || /\s/.test(c.pattern)) continue;
        let cat = String(c.category || 'misc').toLowerCase();
        if (cat === 'downloader') cat = 'download';
        // Video wali sab commands ek jagah (cartoon / movie / naat / drama / video / song-video ...)
        if (['download', 'islamic', 'anime', 'video', 'fun', 'music'].includes(cat) && /(video|vid$|vids$|drama|movie|film|cartoon|naat|clip|reel)/.test(c.pattern.toLowerCase())) cat = 'video';
        if (/prank/.test(c.pattern)) cat = 'prank';
        if (seen.has(c.pattern)) continue;   // ek pattern = ek hi baar (alias kabhi alag entry nahi banta)
        seen.add(c.pattern);
        total++;
        (grouped[cat] = grouped[cat] || []).push(c.pattern);
    }
    const cats = [...CATEGORY_ORDER.filter(c => grouped[c]),
        ...Object.keys(grouped).filter(c => !CATEGORY_ORDER.includes(c)).sort()];
    return { grouped, cats, total };
}

// Har category ko CMDS_PER_CARD ke tukdon mein todkar "card" banao
function buildCategoryCards(onlyCat) {
    const { grouped, cats: allCats, total } = groupCommands();
    const cats = onlyCat ? allCats.filter(c => c === onlyCat) : allCats;
    const cards = [];
    for (const cat of cats) {
        const list = grouped[cat].slice().sort();
        const parts = Math.ceil(list.length / CMDS_PER_CARD);
        for (let i = 0; i < parts; i++) {
            cards.push({
                cat,
                title: `${CATEGORY_ICONS[cat] || '📌'} ${cat.toUpperCase()}${parts > 1 ? ` · ${i + 1}/${parts}` : ''}`,
                commands: list.slice(i * CMDS_PER_CARD, (i + 1) * CMDS_PER_CARD)
            });
        }
    }
    return { cards, total };
}


// Native-flow buttons dikhane ke liye WhatsApp ko "biz" node chahiye (private aur group dono mein)
function relayInteractive(conn, jid, msg) {
    return conn.relayMessage(jid, msg.message, {
        messageId: msg.key.id,
        additionalNodes: [{
            tag: 'biz', attrs: {},
            content: [{ tag: 'interactive', attrs: { type: 'native_flow', v: '1' },
                content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }] }]
        }]
    });
}

// Agar group mein carousel na dikhe to env CAROUSEL_IN_GROUPS=false karo: group mein purana text menu chalega
const blockedInGroup = (jid) => String(jid).endsWith('@g.us') && String(process.env.CAROUSEL_IN_GROUPS || 'true').toLowerCase() === 'false';

// Header photo ek baar upload hoti hai, phir 20 minute cache (har menu par dobara upload slow tha)
const MEDIA_TTL_MS = 20 * 60 * 1000;
const UPLOAD_TIMEOUT_MS = 4000;
const mediaCache = new Map();
function getHeaderMedia(conn, prepareWAMessageMedia, timeoutMs) {
    const pic = getBotPic(conn) || {};
    let mtime = 0;
    try { if (pic.url && !/^https?:/i.test(pic.url)) mtime = fs.statSync(pic.url).mtimeMs; } catch (_) {}
    const key = `${String((conn.user && conn.user.id) || '').split(':')[0]}|${pic.url}|${mtime}`;
    const hit = mediaCache.get(key);
    if (hit && Date.now() - hit.at < MEDIA_TTL_MS) return hit.promise;
    const upload = Promise.race([
        prepareWAMessageMedia({ image: pic }, { upload: conn.waUploadToServer }).then(r => r.imageMessage),
        new Promise((_, rej) => setTimeout(() => rej(new Error('image upload timeout')), timeoutMs || UPLOAD_TIMEOUT_MS))
    ]);
    const entry = { at: Date.now(), promise: upload };
    mediaCache.set(key, entry);
    upload.catch(() => { if (mediaCache.get(key) === entry) mediaCache.delete(key); });   // fail ho to dobara try hoga
    if (mediaCache.size > 20) mediaCache.delete(mediaCache.keys().next().value);
    return upload;
}

// Owner card ki apni photo (data/assets/owner.jpg). Na mile to bot ki photo chalegi.
let ownerMediaCache = null;
function getOwnerMedia(conn, prepareWAMessageMedia, timeoutMs) {
    try {
        const f = config.OWNER_IMAGE_PATH;
        if (!f || !fs.existsSync(f)) return getHeaderMedia(conn, prepareWAMessageMedia, timeoutMs);
        const key = f + '|' + fs.statSync(f).mtimeMs;
        if (ownerMediaCache && ownerMediaCache.key === key && Date.now() - ownerMediaCache.at < MEDIA_TTL_MS) return ownerMediaCache.promise;
        const promise = Promise.race([
            prepareWAMessageMedia({ image: { url: f } }, { upload: conn.waUploadToServer }).then(r => r.imageMessage),
            new Promise((_, rej) => setTimeout(() => rej(new Error('owner image upload timeout')), timeoutMs || 8000))
        ]);
        ownerMediaCache = { key, at: Date.now(), promise };
        promise.catch(() => { if (ownerMediaCache && ownerMediaCache.promise === promise) ownerMediaCache = null; });
        return promise;
    } catch (_) { return getHeaderMedia(conn, prepareWAMessageMedia); }
}

// CONNECTED message ke liye video header (config.CONNECT_VIDEO ya assets/connect.mp4). Na mile to image chalegi.
function connectVideoSource() {
    const v = String(config.CONNECT_VIDEO || '').trim();
    if (v) return /^https?:/i.test(v) ? { url: v } : (fs.existsSync(v) ? { url: path.resolve(v) } : null);
    const local = path.join(__dirname, '..', 'assets', 'connect.mp4');
    return fs.existsSync(local) ? { url: local } : null;
}

const quickReply = (text, id) => ({ name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: text, id }) });
const urlButton = (text, url) => ({ name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: text, url, merchant_url: url }) });

// Owner number hamesha international format mein: 03264931117 -> 923264931117
function ownerNumberIntl() {
    const n = String((config.OWNER_NUMBERS && config.OWNER_NUMBERS[0]) || config.OWNER_NUMBER || '').replace(/[^0-9]/g, '');
    if (!n) return null;
    return n.startsWith('0') ? '92' + n.slice(1) : n;
}

// Chat Owner dabane par ye message pehle se likha hua khulega (user bas send dabaye)
const OWNER_GREETING = '𝐇𝐢 𝐀𝐡𝐦𝐚𝐝 𝐒𝐡𝐚𝐡𝐳𝐚𝐝 𝐒𝐢𝐫 👋✨\n𝐈 𝐜𝐨𝐧𝐭𝐚𝐜𝐭𝐞𝐝 𝐲𝐨𝐮 𝐟𝐫𝐨𝐦 𝐲𝐨𝐮𝐫 𝐖𝐡𝐚𝐭𝐬𝐀𝐩𝐩 𝐁𝐨𝐭 🤖';

function ownerLink(withText) {
    const n = ownerNumberIntl();
    if (!n) return null;
    return 'https://wa.me/' + n + (withText ? '?text=' + encodeURIComponent(OWNER_GREETING) : '');
}

// WhatsApp contact card: sahi waid ki wajah se "Invite" ki jagah "Message" button aata hai
async function sendOwnerContact(conn, jid, quoted) {
    try {
        const n = ownerNumberIntl();
        if (!n) return false;
        const name = String(config.OWNER_NAME || 'Owner');
        const vcard = [
            'BEGIN:VCARD', 'VERSION:3.0',
            `N:;${name};;;`,
            `FN:${name}`,
            `ORG:${botName()};`,
            `TEL;type=CELL;type=VOICE;waid=${n}:+${n}`,
            'END:VCARD'
        ].join('\n');
        await conn.sendMessage(jid, { contacts: { displayName: name, contacts: [{ vcard }] } }, { quoted });
        return true;
    } catch (e) {
        console.error('owner contact error:', e && e.message);
        return false;
    }
}


const channelUrl = () => config.CHANNEL_LINK || config.FORCE_CHANNEL_1 || config.FORCE_CHANNEL_2 || 'https://whatsapp.com/channel/0029VbECaFY3GJOpTccc5c0c';
const channelButton = () => urlButton('📢 VIEW CHANNEL', channelUrl());
const hasCmd = (n) => commands.some(c => c.pattern === n || (Array.isArray(c.alias) && c.alias.includes(n)));

// Ek card: image header + text + 4 link buttons (PORTFOLIO / TELEGRAM / VIEW CHANNEL / CHAT OWNER)
async function sendLinkCard(conn, mek, from, body) {
    try {
        const baileys = require('@whiskeysockets/baileys');
        const { proto, prepareWAMessageMedia, generateWAMessageFromContent } = baileys;
        const IM = proto.Message.InteractiveMessage;
        let header = IM.Header.fromObject({ title: '', subtitle: '', hasMediaAttachment: false });
        try { header = IM.Header.fromObject({ title: '', subtitle: '', hasMediaAttachment: true, imageMessage: await getHeaderMedia(conn, prepareWAMessageMedia) }); } catch (_) {}
        const interactive = IM.create({
            header, body: IM.Body.create({ text: body }), footer: IM.Footer.create({ text: footerText() }),
            nativeFlowMessage: IM.NativeFlowMessage.fromObject({ buttons: CATEGORY_LINK_BUTTONS.map(b => urlButton(b.button, b.url)) })
        });
        const msg = generateWAMessageFromContent(from, { viewOnceMessage: { message: { messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 }, interactiveMessage: interactive } } }, { quoted: mek, userJid: conn.user && conn.user.id });
        await relayInteractive(conn, from, msg);
        return true;
    } catch (e) { console.error('link card error:', e && e.message); return false; }
}

function footerText(name) { return `✦ Powered By ${name || botName()} ✦`; }

// Plain-text fallback (agar carousel na chale)
function textMenu(page, pageCards, total, totalPages) {
    const p = PREFIX();
    let t = `*${botName()}*\n👑 Owner: ${config.OWNER_NAME || '-'}\n⚡ Prefix: ${p}\n📦 Commands: ${total}\n⏱️ Uptime: ${uptimeText()}\n\n`;
    for (const c of pageCards) t += `*${c.title}*\n${c.commands.map(x => `➤ ${p}${x}`).join('\n')}\n\n`;
    if (totalPages > 1) t += `📄 Page ${page}/${totalPages} — next: ${p}cmenu ${page % totalPages + 1}`;
    return t.trim();
}

// VIP small-caps / bold helpers (menu ki line style ke liye)
const SC = { a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ғ", g: "ɢ", h: "ʜ", i: "ɪ", j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ", q: "ǫ", r: "ʀ", s: "s", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x", y: "ʏ", z: "ᴢ" };
const smallCaps = (t) => String(t || '').split('').map(ch => SC[ch.toLowerCase()] || ch).join('');
const boldText = (t) => String(t || '').replace(/[A-Za-z]/g, ch => { const c = ch.charCodeAt(0); return String.fromCodePoint(c <= 90 ? 0x1D400 + (c - 65) : 0x1D41A + (c - 97)); });

// ---------- PROFILE (requesting user) ----------
const tz = () => config.TIME_ZONE || 'Asia/Karachi';
const timeText = () => { try { return new Date().toLocaleTimeString('en-US', { timeZone: tz(), hour: '2-digit', minute: '2-digit', hour12: true }) + ' · ' + new Date().toLocaleDateString('en-GB', { timeZone: tz() }); } catch (_) { return new Date().toLocaleTimeString(); } };
const withTimeout = (p, ms, label) => Promise.race([Promise.resolve(p), new Promise((_, rej) => setTimeout(() => rej(new Error((label || 'op') + ' timeout')), ms))]);

// Per-session branding (menubrand) — fail ho to config ka naam
async function resolveBotName(conn) {
    try { const b = await withTimeout(require('../lib/menubrand').get(conn), 1500, 'brand'); if (b && b.bot) return b.bot; } catch (_) {}
    return botName();
}

// Requesting user ki profile info (DP alag se getProfileMedia mein)
async function getProfile(conn, mek, ctx) {
    ctx = ctx || {};
    const sender = ctx.sender || (mek && mek.key && (mek.key.participant || mek.key.remoteJid)) || '';
    const number = String(ctx.senderNumber || sender).split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    const name = String(ctx.pushname || (mek && mek.pushName) || '').trim() || (number ? '+' + number : 'User');
    let role = 'Member', roleIcon = '👤';
    if (ctx.isOwner) { role = 'Owner'; roleIcon = '👑'; }
    else if (ctx.isGroup && ctx.isAdmins) { role = 'Group Admin'; roleIcon = '🛡️'; }
    const { total, cats } = groupCommands();
    return {
        sender, number, name, role, roleIcon,
        bot: await resolveBotName(conn),
        mode: String(config.WORK_TYPE || 'public'),
        prefix: PREFIX(), uptime: uptimeText(), total, categories: cats.length, time: timeText()
    };
}

function profileText(pr) {
    return `╭━━━〔 👤 ${boldText('MY PROFILE')} 〕━━━╮\n` +
        `┃ 🙋 ${smallCaps('name')}     ➜ ${pr.name}\n` +
        `┃ 📱 ${smallCaps('number')}   ➜ ${pr.number ? '+' + pr.number : '-'}\n` +
        `┃ ${pr.roleIcon} ${smallCaps('role')}     ➜ ${pr.role}\n` +
        `┣━━━〔 🤖 ${boldText('BOT INFO')} 〕━━━\n` +
        `┃ 💎 ${smallCaps('bot')}      ➜ ${pr.bot}\n` +
        `┃ 🔐 ${smallCaps('mode')}     ➜ ${pr.mode}\n` +
        `┃ ⚡ ${smallCaps('prefix')}   ➜ ${pr.prefix}\n` +
        `┃ 📦 ${smallCaps('commands')} ➜ ${pr.total}\n` +
        `┃ ⏱️ ${smallCaps('uptime')}   ➜ ${pr.uptime}\n` +
        `┃ 🕒 ${smallCaps('time')}     ➜ ${pr.time}\n` +
        `╰━━━━━━━━━━━━━━━━━━━━╯`;
}

// User ki WhatsApp DP -> uploaded imageMessage (3s timeout, 10 min cache). Na mile to null (caller bot pic use karega).
const dpCache = new Map();
async function getProfileMedia(conn, prepareWAMessageMedia, sender) {
    try {
        if (!sender || typeof conn.profilePictureUrl !== 'function') return null;
        const hit = dpCache.get(sender);
        if (hit && Date.now() - hit.at < 10 * 60 * 1000) return hit.media;
        const url = await withTimeout(conn.profilePictureUrl(sender, 'image'), 3000, 'dp url');
        if (!url) return null;
        const media = (await withTimeout(prepareWAMessageMedia({ image: { url } }, { upload: conn.waUploadToServer }), 6000, 'dp upload')).imageMessage;
        dpCache.set(sender, { at: Date.now(), media });
        if (dpCache.size > 50) dpCache.delete(dpCache.keys().next().value);
        return media;
    } catch (_) { return null; }
}

const channelUrls = () => [...new Set([config.CHANNEL_LINK, config.FORCE_CHANNEL_1, config.FORCE_CHANNEL_2].map(x => String(x || '').trim()).filter(x => /^https?:/i.test(x)))];

// ---------- CARD GROUPS: WhatsApp carousel mein max 10 cards, isliye categories ko theme ke hisaab se milaya gaya ----------
// (card 1 = profile, baaki <= 9 cards). Jo category yahan nahi likhi wo khud "MORE" card mein aa jati hai.
const CARD_GROUPS = [
    { title: 'OWNER & SETTINGS', icon: '👑', cats: ['owner', 'settings', 'main', 'general', 'system', 'pair', 'channel'] },
    { title: 'VIP CLUB',        icon: '💎', cats: ['vip'] },
    { title: 'VOICE & AUDIO',    icon: '🎙️', cats: ['voice', 'voicechange', 'music', 'audioedit', 'kashmir'] },
    { title: 'VIDEO & EDIT',     icon: '🎬', cats: ['video', 'videoedit', 'photoedit'] },
    { title: 'GROUP CONTROL',    icon: '👥', cats: ['group'] },
    { title: 'AI & DOWNLOADS',   icon: '🤖', cats: ['ai', 'download', 'search'] },
    { title: 'TOOLS & STICKERS', icon: '🧰', cats: ['tools', 'utility', 'calc', 'textfx', 'name', 'image', 'sticker'] },
    { title: 'FUN & GAMES',      icon: '🎮', cats: ['fun', 'funzone', 'games', 'love', 'emotions', 'prank'] },
    { title: 'ISLAMIC & ANIME',  icon: '🕌', cats: ['islamic', 'anime'] }
];
const MORE_GROUP = { title: 'MORE', icon: '✨', cats: [] };
const MAX_CARDS = 10;

function cardGroups(grouped, cats) {
    const used = new Set();
    const out = [];
    for (const g of CARD_GROUPS) {
        const gc = g.cats.filter(c => grouped[c]);
        gc.forEach(c => used.add(c));
        if (gc.length) out.push({ title: g.title, icon: g.icon, cats: gc });
    }
    const rest = cats.filter(c => !used.has(c));
    if (rest.length) out.push({ title: MORE_GROUP.title, icon: MORE_GROUP.icon, cats: rest });
    // profile card + groups <= MAX_CARDS: zyada hon to aakhri groups "MORE" mein mil jate hain
    while (out.length > MAX_CARDS - 1) {
        const last = out.pop();
        const prev = out[out.length - 1];
        if (prev.title === 'MORE') prev.cats.push(...last.cats);
        else out[out.length - 1] = { title: 'MORE', icon: '✨', cats: [...prev.cats, ...last.cats] };
    }
    return out;
}

const sortCmds = (list) => list.slice().sort((a, b) => {
    const ta = TOP_COMMANDS.indexOf(a), tb = TOP_COMMANDS.indexOf(b);
    if (ta !== -1 || tb !== -1) return (ta === -1 ? 999 : ta) - (tb === -1 ? 999 : tb);
    return a.localeCompare(b);
});

// Ek group card ki body: har category ka naam + count + kuch commands (baaki ".menu <cat>" se)
function groupCardBody(g, grouped, p) {
    const SHOW_TOTAL = 30;
    const per = Math.max(3, Math.min(12, Math.floor(SHOW_TOTAL / g.cats.length)));
    const lines = [`╭━━━〔 ${g.icon} ${boldText(g.title)} 〕━━━╮`];
    let count = 0;
    for (const cat of g.cats) {
        const list = sortCmds(grouped[cat]);
        count += list.length;
        lines.push(`┃ ${CATEGORY_ICONS[cat] || '📌'} ${boldText(cat.toUpperCase())} ${smallCaps('· ' + list.length)}`);
        const shown = list.slice(0, per);
        for (let i = 0; i < shown.length; i += 3) lines.push('┃   ' + shown.slice(i, i + 3).map(x => p + x).join('  '));
        if (list.length > per) lines.push(`┃   ✨ +${list.length - per} ${smallCaps('more')} → ${p}menu ${cat}`);
    }
    lines.push(`╰━━⟡ 📦 ${count} ${smallCaps('commands')} ⟡━━╯`);
    return lines.join('\n');
}

// Ek hi carousel (ek hi message): card 1 = profile, baaki = category groups. Har card sirf ek baar.
async function buildCarousels(conn, baileys, mek, ctx) {
    const { proto, prepareWAMessageMedia } = baileys;
    const IM = proto.Message.InteractiveMessage;
    const p = PREFIX();
    const { grouped, cats } = groupCommands();
    const pr = await getProfile(conn, mek, ctx);

    let botMedia = null;
    try { botMedia = await getHeaderMedia(conn, prepareWAMessageMedia); } catch (_) { /* image ke bina bhi chalega */ }
    const dpMedia = await getProfileMedia(conn, prepareWAMessageMedia, pr.sender);
    const mkHeader = (media) => IM.Header.fromObject({ title: '', subtitle: '', hasMediaAttachment: !!media, ...(media ? { imageMessage: media } : {}) });
    const makeCard = (media, body, buttons) => ({
        header: mkHeader(media),
        body: IM.Body.fromObject({ text: body }),
        footer: IM.Footer.fromObject({ text: footerText(pr.bot) }),
        nativeFlowMessage: IM.NativeFlowMessage.fromObject({ buttons })
    });
    const chans = channelUrls();
    const chanBtn = () => urlButton('📢 VIEW CHANNEL', chans[0] || channelUrl());

    const all = [];
    // Card 1: PROFILE (header = user ki DP, na mile to bot pic)
    const owner = ownerLink(true);
    const profBtns = [quickReply('📋 All Commands', p + 'cmdlist')];
    if (owner) profBtns.push(urlButton('💬 Chat Owner', owner));
    profBtns.push(chanBtn());
    all.push(makeCard(dpMedia || botMedia, profileText(pr) + `\n➡️ ${smallCaps('swipe right for all categories')} ➡️`, profBtns));

    // Baaki cards: theme groups (registry se auto — nayi command khud aa jati hai)
    for (const g of cardGroups(grouped, cats)) {
        const btns = g.cats.slice().sort((a, b) => grouped[b].length - grouped[a].length).slice(0, 2)
            .map(c => quickReply(`📂 ${c.toUpperCase()} (${grouped[c].length})`, `${p}menu ${c}`));
        btns.push(chanBtn());
        all.push(makeCard(botMedia, groupCardBody(g, grouped, p), btns));
    }

    return [IM.create({
        body: IM.Body.create({ text: `*${boldText(pr.bot)}*\n➡️ ${smallCaps('swipe')} ➡️` }),
        footer: IM.Footer.create({ text: footerText(pr.bot) }),
        carouselMessage: IM.CarouselMessage.fromObject({ cards: all.slice(0, MAX_CARDS), messageVersion: 1 })
    })];
}

// ---------- CATEGORY VIEW: commands sirf text me, neeche 4 link buttons (links yahan se badlein) ----------
const CATEGORY_LINK_BUTTONS = [
    { button: '🌐 PORTFOLIO (Open first site)', url: 'https://www.google.com/search?q=ahmadshahzad+portfolio' },
    { button: '✈️ TELEGRAM',                    url: 'https://t.me/ahmadteachx' },
    { button: '📢 VIEW CHANNEL',                get url() { return channelUrl(); } },
    { button: '💬 CHAT OWNER',                  url: 'https://wa.me/923264931117' }
];

async function sendCategoryView(conn, mek, from, cat) {
    const baileys = require('@whiskeysockets/baileys');
    const { proto, prepareWAMessageMedia, generateWAMessageFromContent } = baileys;
    const IM = proto.Message.InteractiveMessage;
    const p = PREFIX();
    const { grouped } = groupCommands();
    if (!grouped[cat]) return false;
    const list = grouped[cat].slice().sort((a, b) => a.localeCompare(b));
    const icon = CATEGORY_ICONS[cat] || '📌';

    // lambi category kai pages mein; HAR page ke neeche 4 buttons (VIEW CHANNEL zaroor)
    const MAX = 2600;
    const mk = (i, n) => `╭━━━〔 ${icon} ${boldText(cat.toUpperCase())}${n > 1 ? ` · ${i + 1}/${n}` : ''} 〕━━━╮\n┃\n`;
    const foot = (n) => `┃\n╰━━⟡ 📦 ${list.length} ${smallCaps('commands')} ⟡━━╯`;
    const chunks = [];
    let cur = '';
    for (const c of list) {
        const row = `┃ ➤ ${p}${smallCaps(c)}\n`;
        if ((mk(0, 9) + cur + row + foot()).length > MAX) { chunks.push(cur); cur = ''; }
        cur += row;
    }
    chunks.push(cur);

    let media = null;
    try { media = await getHeaderMedia(conn, prepareWAMessageMedia); } catch (_) { /* image ke bina bhi chalega */ }
    for (let i = 0; i < chunks.length; i++) {
        const header = IM.Header.fromObject({ title: '', subtitle: '', hasMediaAttachment: !!(media && i === 0), ...(media && i === 0 ? { imageMessage: media } : {}) });
        const body = mk(i, chunks.length) + chunks[i] + foot() + (i < chunks.length - 1 ? `\n➡️ ${smallCaps('next page below')}` : '');
        const interactive = IM.create({
            header,
            body: IM.Body.create({ text: body }),
            footer: IM.Footer.create({ text: footerText() }),
            nativeFlowMessage: IM.NativeFlowMessage.fromObject({ buttons: CATEGORY_LINK_BUTTONS.map(b => urlButton(b.button, b.url)) })
        });
        const msg = generateWAMessageFromContent(from, {
            viewOnceMessage: { message: { messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 }, interactiveMessage: interactive } }
        }, { quoted: mek, userJid: conn.user && conn.user.id });
        await relayInteractive(conn, from, msg);
        if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 600));
    }
    return true;
}

// Ek `.menu` = ek hi carousel message. Success par true, fail par false (throw nahi karta).
// Same message-id dobara aaye (retry / double handler) to dusri baar nahi bhejta.
const sentRecently = new Map();
function alreadySent(mek, from) {
    const id = mek && mek.key && mek.key.id;
    if (!id) return false;
    const k = from + '|' + id;
    const now = Date.now();
    for (const [key, at] of sentRecently) if (now - at > 60000) sentRecently.delete(key);
    if (sentRecently.has(k)) return true;
    sentRecently.set(k, now);
    return false;
}

async function sendCarouselMenu(conn, mek, m, ctx, pageArg, catFilter) {
    const from = (ctx && ctx.from) || m.chat;
    if (blockedInGroup(from)) { sendCarouselMenu.lastFallback = await buildTextMenu(conn, mek, ctx); return false; }
    // Category par tap/type: commands text me + 4 link buttons
    if (catFilter) {
        try { if (await sendCategoryView(conn, mek, from, catFilter)) return true; }
        catch (e) { console.error('category view error:', e && e.message); }
        return false;
    }
    if (alreadySent(mek, from)) return true;
    try {
        const baileys = require('@whiskeysockets/baileys');
        const list = await buildCarousels(conn, baileys, mek, ctx);
        const interactive = list[0];   // hamesha ek hi message
        const msg = baileys.generateWAMessageFromContent(from, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                    interactiveMessage: interactive
                }
            }
        }, { quoted: mek, userJid: conn.user && conn.user.id });
        await relayInteractive(conn, from, msg);
        return true;
    } catch (e) {
        console.error('carousel menu error:', e && e.message);
        sendCarouselMenu.lastFallback = await buildTextMenu(conn, mek, ctx);
        return false;
    }
}

// Plain-text fallback (carousel na chale): profile + categories (registry se)
async function buildTextMenu(conn, mek, ctx) {
    const p = PREFIX();
    const { grouped, cats } = groupCommands();
    const pr = await getProfile(conn, mek, ctx);
    let t = profileText(pr) + `\n\n📂 *${boldText('CATEGORIES')}*\n`;
    t += cats.map(c => `${CATEGORY_ICONS[c] || '📌'} ${p}menu ${c} ➜ ${grouped[c].length}`).join('\n');
    t += `\n\n📋 ${p}cmdlist ➜ ${smallCaps('all commands')}\n${footerText(pr.bot)}`;
    return t;
}

// ---------- OWNER CARD (links yahan se badlein) ----------
const OWNER_LINKS = [
    { name: 'TELEGRAM',  button: '✈️ Telegram',  url: 'https://t.me/ahmadteachx' },
    { name: 'PORTFOLIO', button: '🌐 Portfolio', url: 'https://www.google.com/search?q=ahmadshahzad+portfolio', note: '👆 Open first site' },
    { name: 'CHANNEL',   button: '📢 Join Channel', get url() { return channelUrl(); } }
];

// Body text mein links bhi hain (WhatsApp unhe khud tappable bana deta hai), buttons alag se
function ownerCardText() {
    const link = ownerLink();
    let t = `👑 *OWNER — ${config.OWNER_NAME || 'Owner'}*\n━━━━━━━━━━━━━━━━━━\n`;
    if (link) t += `💬 *WHATSAPP*\n+${ownerNumberIntl()}\n${link}\n\n`;
    t += OWNER_LINKS.map(l => `*${l.name}*\n${l.url}${l.note ? '\n' + l.note : ''}`).join('\n\n');
    t += `\n━━━━━━━━━━━━━━━━━━\n${footerText()}`;
    return t;
}

async function sendOwnerCard(conn, jid, quoted, opts) {
    if (blockedInGroup(jid)) return false;
    try {
        const baileys = require('@whiskeysockets/baileys');
        const { proto, prepareWAMessageMedia, generateWAMessageFromContent } = baileys;
        const IM = proto.Message.InteractiveMessage;
        const buttons = [];
        const link = ownerLink(true);
        if (link) buttons.push(urlButton('💬 Chat Owner', link));
        for (const l of OWNER_LINKS) buttons.push(urlButton(l.button, l.url));

        // Connect message par image zaroor chahiye: fresh login par upload slow hota hai,
        // isliye lamba timeout (25s) aur 3 koshishein. Normal menu me purana 4s timeout.
        let header = IM.Header.fromObject({ title: '', subtitle: '', hasMediaAttachment: false });
        const tries = (opts && opts.connectMode) ? 3 : 1;
        // Owner ki photo header mein. Connect par fresh login slow hota hai: lamba timeout + 3 koshishein.
        for (let t = 1; t <= tries; t++) {
            try {
                const imageMessage = await getOwnerMedia(conn, prepareWAMessageMedia, (opts && opts.connectMode) ? 25000 : undefined);
                header = IM.Header.fromObject({ title: '', subtitle: '', hasMediaAttachment: true, imageMessage });
                break;
            } catch (e) {
                console.warn(`[OWNER-IMG] image upload attempt ${t}/${tries} failed:`, e && e.message);
                if (t < tries) await new Promise(r => setTimeout(r, 1500));
            }
        }

        const interactive = IM.create({
            header,
            body: IM.Body.create({ text: ownerCardText() }),
            footer: IM.Footer.create({ text: footerText() }),
            nativeFlowMessage: IM.NativeFlowMessage.fromObject({ buttons })
        });
        const msg = generateWAMessageFromContent(jid, {
            viewOnceMessage: { message: { messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 }, interactiveMessage: interactive } }
        }, { quoted, userJid: conn.user && conn.user.id });
        await relayInteractive(conn, jid, msg);
        return true;
    } catch (e) {
        console.error('owner card error:', e && e.message);
        return false;
    }
}

// Saari categories ek tappable list mein (connect message ke neeche aur ".menu list" par)
async function sendCategoryPicker(conn, jid, quoted, bodyText, opts) {
    if (blockedInGroup(jid)) return false;
    try {
        const baileys = require('@whiskeysockets/baileys');
        const { proto, prepareWAMessageMedia, generateWAMessageFromContent } = baileys;
        const IM = proto.Message.InteractiveMessage;
        const p = PREFIX();
        const { grouped, cats, total } = groupCommands();
        const channelLink = channelUrl();

        let header = IM.Header.fromObject({ title: '', subtitle: '', hasMediaAttachment: false });
        try {
            const imageMessage = await getHeaderMedia(conn, prepareWAMessageMedia);
            header = IM.Header.fromObject({ title: '', subtitle: '', hasMediaAttachment: true, imageMessage });
        } catch (_) { /* image ke bina bhi chalega */ }

        const send = async (body, buttons, withHeader) => {
            const interactive = IM.create({
                header: withHeader ? header : IM.Header.fromObject({ title: '', subtitle: '', hasMediaAttachment: false }),
                body: IM.Body.create({ text: body }),
                footer: IM.Footer.create({ text: footerText() }),
                nativeFlowMessage: IM.NativeFlowMessage.fromObject({ buttons })
            });
            const msg = generateWAMessageFromContent(jid, {
                viewOnceMessage: { message: { messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 }, interactiveMessage: interactive } }
            }, { quoted, userJid: conn.user && conn.user.id });
            await relayInteractive(conn, jid, msg);
        };

        // Connect message: sirf 2 button — Categories + View Channel
        if (opts && opts.connectMode) {
            const buttons = [quickReply('📂 Categories', p + 'menu list')];
            if (channelLink) buttons.push(urlButton('📢 View Channel', channelLink));
            await send(bodyText || `*${botName()}*\n📂 Categories (${cats.length}) · ${total} commands`, buttons, true);
            return true;
        }

        // Categories: har category ek tappable button (ek message mein max 10 button)
        const PER_MSG = 10;
        const catButtons = cats.map(c => quickReply(`${CATEGORY_ICONS[c] || '📌'} ${c.toUpperCase()} (${grouped[c].length})`, `${p}menu ${c}`));
        const chunks = [];
        for (let i = 0; i < catButtons.length; i += PER_MSG) chunks.push(catButtons.slice(i, i + PER_MSG));
        for (let i = 0; i < chunks.length; i++) {
            const body = i === 0
                ? (bodyText || `*${botName()}*\n📂 Categories (${cats.length}) · ${total} commands\nKisi bhi category par tap karo 👇`)
                : `📂 Categories (${i + 1}/${chunks.length}) 👇`;
            await send(body, chunks[i], i === 0);
        }
        return true;
    } catch (e) {
        console.error('category picker error:', e && e.message);
        return false;
    }
}

// Profile card: akela profile (DP header) — ".profile / .myprofile / .menuprofile"
async function sendProfileCard(conn, mek, from, ctx) {
    const pr = await getProfile(conn, mek, ctx);
    const text = profileText(pr);
    if (!blockedInGroup(from)) {
        try {
            const baileys = require('@whiskeysockets/baileys');
            const { proto, prepareWAMessageMedia, generateWAMessageFromContent } = baileys;
            const IM = proto.Message.InteractiveMessage;
            let media = await getProfileMedia(conn, prepareWAMessageMedia, pr.sender);
            if (!media) { try { media = await getHeaderMedia(conn, prepareWAMessageMedia); } catch (_) {} }
            const p = PREFIX();
            const buttons = [quickReply('📜 Menu', p + 'menu'), quickReply('📋 All Commands', p + 'cmdlist')];
            const chans = channelUrls();
            buttons.push(urlButton('📢 VIEW CHANNEL', chans[0] || channelUrl()));
            const interactive = IM.create({
                header: IM.Header.fromObject({ title: '', subtitle: '', hasMediaAttachment: !!media, ...(media ? { imageMessage: media } : {}) }),
                body: IM.Body.create({ text }),
                footer: IM.Footer.create({ text: footerText(pr.bot) }),
                nativeFlowMessage: IM.NativeFlowMessage.fromObject({ buttons })
            });
            const msg = generateWAMessageFromContent(from, { viewOnceMessage: { message: { messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 }, interactiveMessage: interactive } } }, { quoted: mek, userJid: conn.user && conn.user.id });
            await relayInteractive(conn, from, msg);
            return true;
        } catch (e) { console.error('profile card error:', e && e.message); }
    }
    await conn.sendMessage(from, { text: text + '\n' + footerText(pr.bot) }, { quoted: mek });
    return true;
}

cmd({
    pattern: 'cmenu',
    alias: ['swipemenu', 'cardmenu', 'cmenu1'],
    use: '.cmenu',
    desc: 'Swipe-able card menu (profile + categories)',
    category: 'system',
    react: '📜',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const from = ctx.from || m.chat;
    const arg = (ctx.args && ctx.args[0]) || (ctx.q || '').trim();
    const ok = await sendCarouselMenu(conn, mek, m, ctx, arg);
    if (!ok) await conn.sendMessage(from, { text: sendCarouselMenu.lastFallback || await buildTextMenu(conn, mek, ctx) }, { quoted: mek });
});

// ---------- FULL COMMAND LIST (registry se auto; nayi command khud aa jati hai) ----------
// Messages ki array: har message <= maxLen. Connect message aur .cmdlist dono yahi use karte hain.
function fullListMessages(maxLen, nameOverride) {
    maxLen = maxLen || 3800;
    const p = PREFIX();
    const { grouped, cats, total } = groupCommands();
    const bn = nameOverride || botName();
    const head = `╔═══════◥◣◆◢◤═══════╗\n   ༺ 💎 ${boldText(bn)} 💎 ༻\n╚═══════◢◤◆◥◣═══════╝\n` +
        `┃ 👑 ${smallCaps('owner')} ➜ ${config.OWNER_NAME || '-'}\n` +
        `┃ ⚡ ${smallCaps('prefix')} ➜ ${p}\n` +
        `┃ 📦 ${total} ${smallCaps('commands')} · 📂 ${cats.length} ${smallCaps('categories')}\n` +
        `┃ 🔰 ${p}menu ➜ ${smallCaps('swipe cards')}  ·  ${p}profile\n`;
    const foot = `\n\n${config.BOT_FOOTER || footerText(bn)}`;
    const blocks = [];
    for (const cat of cats) {
        const list = grouped[cat].slice().sort((a, b) => a.localeCompare(b));
        const top = `╭━━━❰ ${CATEGORY_ICONS[cat] || '📌'} ${boldText(cat.toUpperCase())} · ${list.length} ❱━━━╮`;
        const bottom = `╰━━━━━━━━━━━━━━━━━━╯`;
        const rows = list.map(x => `┃ ✦ ${p}${x}`);
        // lambi category ko poore boxes mein todo
        let cur = [];
        const flush = () => { if (cur.length) blocks.push(top + '\n' + cur.join('\n') + '\n' + bottom); cur = []; };
        let size = top.length + bottom.length + 2;
        for (const r of rows) {
            if (size + r.length + 1 > maxLen - 300) { flush(); size = top.length + bottom.length + 2; }
            cur.push(r); size += r.length + 1;
        }
        flush();
    }
    const out = [];
    let cur = head;
    for (const b of blocks) {
        if (cur.length + b.length + 2 > maxLen - foot.length) { out.push(cur.trimEnd()); cur = ''; }
        cur += (cur ? '\n\n' : '\n') + b;
    }
    if (cur.trim()) out.push(cur.trimEnd());
    out[out.length - 1] += foot;
    return out;
}
const fullListText = () => fullListMessages(1e9).join('\n\n');

async function sendCommandList(conn, from, quoted) {
    let name; try { name = await resolveBotName(conn); } catch (_) {}
    const parts = fullListMessages(3800, name);
    for (let i = 0; i < parts.length; i++) {
        await conn.sendMessage(from, { text: parts[i] }, i === 0 ? { quoted } : undefined);
        if (i < parts.length - 1) await new Promise(r => setTimeout(r, 500));
    }
    return parts.length;
}

module.exports = { sendLinkCard, fullListText, fullListMessages, sendCommandList, sendProfileCard, getProfile, profileText, buildTextMenu, buildCategoryCards, buildCarousels, sendCarouselMenu, sendCategoryPicker, groupCommands, sendOwnerCard, sendOwnerContact, ownerCardText, OWNER_LINKS };
