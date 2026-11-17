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
    textfx: '🔤', calc: '🧮', funzone: '🎉', extra: '✨', video: '🎬', prank: '😈', voice: '🎙️', name: '✍️', videoedit: '🎞️', photoedit: '🖼️', audioedit: '🎧'
};
const CATEGORY_ORDER = ['owner', 'voice', 'video', 'prank', 'group', 'download', 'music', 'tools', 'sticker', 'videoedit', 'photoedit', 'audioedit',
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
        if (!c.pattern || c.dontAddCommandList) continue;
        let cat = String(c.category || 'misc').toLowerCase();
        if (cat === 'downloader') cat = 'download';
        // Video wali sab commands ek jagah (cartoon / movie / naat / drama / video / song-video ...)
        if (['download', 'islamic', 'anime', 'video', 'fun', 'music'].includes(cat) && /(video|vid$|vids$|drama|movie|film|cartoon|naat|clip|reel)/.test(c.pattern.toLowerCase())) cat = 'video';
        if (/prank/.test(c.pattern)) cat = 'prank';
        const key = cat + ':' + c.pattern;
        if (seen.has(key)) continue;
        seen.add(key);
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


const channelUrl = () => config.CHANNEL_LINK || 'https://whatsapp.com/channel/0029VbCx2Sb5q08a3fe3KZ42';
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

function footerText() { return `Powered By ${botName()}`; }

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
const CARD_PREVIEW = 40;   // card par kitni commands ke naam dikhen (baaki "Open All" se)

// Ek hi carousel: info card + har category ka ek card. Next/Prev page koi nahi — bas side par swipe karo.
// Cards CARDS_PER_MSG se zyada hon to baaki cards agle carousel mein khud-ba-khud chale jate hain (button dabana nahi padta).
async function buildCarousels(conn, baileys) {
    const { proto, prepareWAMessageMedia } = baileys;
    const IM = proto.Message.InteractiveMessage;
    const p = PREFIX();
    const { grouped, cats, total } = groupCommands();

    let media = null;
    try { media = { imageMessage: await getHeaderMedia(conn, prepareWAMessageMedia) }; } catch (_) { /* image ke bina bhi chalega */ }
    const header = () => IM.Header.fromObject({ title: '', subtitle: '', hasMediaAttachment: !!media, ...(media || {}) });
    const makeCard = (body, buttons) => ({
        header: header(),
        body: IM.Body.fromObject({ text: body }),
        footer: IM.Footer.fromObject({ text: footerText() }),
        nativeFlowMessage: IM.NativeFlowMessage.fromObject({ buttons })
    });

    const all = [];
    // 1) Info card
    const owner = ownerLink(true);
    const info =
        `╭━━━〔 💎 ${boldText(botName())} 💎 〕━━━╮\n` +
        `┃ 👑 ${smallCaps('owner')}    ➜ ${config.OWNER_NAME || '-'}\n` +
        `┃ ⚡ ${smallCaps('prefix')}   ➜ ${p}\n` +
        `┃ 📦 ${smallCaps('commands')} ➜ ${total}\n` +
        `┃ 📂 ${smallCaps('categories')} ➜ ${cats.length}\n` +
        `┃ ⏱️ ${smallCaps('uptime')}   ➜ ${uptimeText()}\n` +
        `┃ 🕒 ${smallCaps('time')}     ➜ ${new Date().toLocaleTimeString('en-US', { timeZone: config.TIME_ZONE || 'Asia/Karachi' })}\n` +
        `╰━━━━━━━━━━━━━━━━━━━━╯\n` +
        `➡️ ${smallCaps('swipe right for all categories')} ➡️`;
    const infoBtns = [quickReply('👑 Owner', p + 'owner')];
    if (owner) infoBtns.push(urlButton('💬 Chat Owner', owner));
    infoBtns.push(quickReply('🏓 Ping', p + 'ping'));
    infoBtns.push(channelButton());
    all.push(makeCard(info, infoBtns));

    // 1b) TOP COMMANDS — sab se zyada kaam aane wali commands pehle page par
    const top = [];   // order ab: owner > bgmusic > videos > prank > group > baaki
    if (top.length) {
        const topBody = `╭═══❰ ⭐ ${boldText('TOP COMMANDS')} ⭐ ❱═══╮\n` +
            top.map(x => `│ ➤ ${p}${smallCaps(x)}`).join('\n') +
            `\n╰═══⟡ ${smallCaps('most used')} ⟡═══╯`;
        const topBtns = top.slice(0, 2).map(x => quickReply(`▶️ ${p}${x}`, p + x));
        topBtns.push(channelButton());
        all.push(makeCard(topBody, topBtns));
    }

    // 2) Har category ek card: commands ki list + "Open All"
    for (const cat of cats) {
        const list = grouped[cat].slice().sort((a, b) => a.localeCompare(b));
        const shown = list.slice(0, CARD_PREVIEW);
        const rows = shown.map(x => `│ ➤ ${p}${smallCaps(x)}`);
        if (list.length > CARD_PREVIEW) rows.push(`│ ✨ +${list.length - CARD_PREVIEW} ${smallCaps('more — open all')}`);
        const body = `╭═══❰ ${CATEGORY_ICONS[cat] || '📌'} ${boldText(cat.toUpperCase())} ❱═══╮\n${rows.join('\n')}\n╰═══⟡ ${list.length} ${smallCaps('commands')} ⟡═══╯`;
        const btns = [quickReply(`📂 Open All ${cat.toUpperCase()}`, `${p}menu ${cat}`), channelButton()];
        all.push(makeCard(body, btns));
    }

    const per = Math.max(2, Math.min(30, parseInt(process.env.CAROUSEL_CARDS_PER_MSG, 10) || 10));
    const out = [];
    for (let i = 0; i < all.length; i += per) {
        const chunk = all.slice(i, i + per);
        const idx = out.length + 1, parts = Math.ceil(all.length / per);
        out.push(IM.create({
            body: IM.Body.create({ text: `*${boldText(botName())}*${parts > 1 ? ` — ${idx}/${parts}` : ''}\n➡️ ${smallCaps('swipe')} ➡️` }),
            footer: IM.Footer.create({ text: footerText() }),
            carouselMessage: IM.CarouselMessage.fromObject({ cards: chunk, messageVersion: 1 })
        }));
    }
    return out;
}

// Carousel bhejta hai. Success par true, fail par false (throw nahi karta).
// ---------- CATEGORY VIEW: commands sirf text me, neeche 4 link buttons (links yahan se badlein) ----------
const CATEGORY_LINK_BUTTONS = [
    { button: '🌐 PORTFOLIO (Open first site)', url: 'https://www.google.com/search?q=ahmadshahzad+portfolio' },
    { button: '✈️ TELEGRAM',                    url: 'https://t.me/ahmadteachx' },
    { button: '📢 VIEW CHANNEL',                url: config.CHANNEL_LINK || 'https://whatsapp.com/channel/0029VbCx2Sb5q08a3fe3KZ42' },
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

async function sendCarouselMenu(conn, mek, m, ctx, pageArg, catFilter) {
    const from = (ctx && ctx.from) || m.chat;
    if (blockedInGroup(from)) return false;
    // Category par tap/type: commands text me + 4 link buttons
    if (catFilter) {
        try { if (await sendCategoryView(conn, mek, from, catFilter)) return true; }
        catch (e) { console.error('category view error:', e && e.message); }
        return false;
    }
    try {
        const baileys = require('@whiskeysockets/baileys');
        const list = await buildCarousels(conn, baileys);
        for (const interactive of list) {
            const msg = baileys.generateWAMessageFromContent(from, {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                        interactiveMessage: interactive
                    }
                }
            }, { quoted: mek, userJid: conn.user && conn.user.id });
            await relayInteractive(conn, from, msg);
            if (list.length > 1) await new Promise(r => setTimeout(r, 700));
        }
        return true;
    } catch (e) {
        console.error('carousel menu error:', e && e.message);
        const { cards, total } = buildCategoryCards();
        sendCarouselMenu.lastFallback = textMenu(1, cards.slice(0, CARDS_PER_PAGE), total, 1);
        return false;
    }
}

// ---------- OWNER CARD (links yahan se badlein) ----------
const OWNER_LINKS = [
    { name: 'TELEGRAM',  button: '✈️ Telegram',  url: 'https://t.me/ahmadteachx' },
    { name: 'PORTFOLIO', button: '🌐 Portfolio', url: 'https://www.google.com/search?q=ahmadshahzad+portfolio', note: '👆 Open first site' },
    { name: 'CHANNEL',   button: '📢 Join Channel', url: config.CHANNEL_LINK || 'https://whatsapp.com/channel/0029VbCx2Sb5q08a3fe3KZ42' }
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
        const channelLink = config.CHANNEL_LINK || (config.AUTO_FOLLOW_CHANNELS && config.AUTO_FOLLOW_CHANNELS[0]) || '';

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

cmd({
    pattern: 'cmenu',
    alias: ['swipemenu', 'cardmenu', 'cmenu1'],
    use: '.cmenu  |  .cmenu <page>',
    desc: 'Swipe-able card menu with tappable buttons',
    category: 'system',
    react: '📜',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const from = ctx.from || m.chat;
    const arg = (ctx.args && ctx.args[0]) || (ctx.q || '').trim();
    const ok = await sendCarouselMenu(conn, mek, m, ctx, arg);
    if (!ok) await conn.sendMessage(from, { text: sendCarouselMenu.lastFallback }, { quoted: mek });
});

// Connect hone par: EK hi lambi VIP list mein saari commands
function fullListText() {
    const p = PREFIX();
    const { grouped, cats, total } = groupCommands();
    const head = `╔═══════◥◣◆◢◤═══════╗\n   ༺ 💎 ${boldText(botName())} 💎 ༻\n╚═══════◢◤◆◥◣═══════╝\n┃ 👑 ${smallCaps('owner')} ➜ ${config.OWNER_NAME || '-'}\n┃ ⚡ ${smallCaps('prefix')} ➜ ${p}   📦 ${total} ${smallCaps('commands')}\n┃ 🔰 ${smallCaps('type')} ${p}menu ${smallCaps('for swipe cards')}\n`;
    const blocks = cats.map(cat => {
        const list = grouped[cat].slice().sort((a, b) => a.localeCompare(b));
        return `\n╭━━━❰ ${CATEGORY_ICONS[cat] || '📌'} ${boldText(cat.toUpperCase())} · ${list.length} ❱━━━╮\n` + list.map(x => `┃ ✦ ${p}${x}`).join('\n') + `\n╰━━━━━━━━━━━━━━━━━━╯`;
    });
    return head + blocks.join('\n') + `\n\n${config.BOT_FOOTER || ''}`;
}

module.exports = { sendLinkCard, fullListText, buildCategoryCards, buildCarousels, sendCarouselMenu, sendCategoryPicker, groupCommands, sendOwnerCard, sendOwnerContact, ownerCardText, OWNER_LINKS };
