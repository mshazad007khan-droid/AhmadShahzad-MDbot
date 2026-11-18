// plugins/zz-ahmad-fixes.js  (zz = sab se aakhir mein load hota hai, isliye purane versions ko override karta hai)
//   .antibot on|off|status|allow|unallow   — group mein dusron ke bot pakdo (warn -> remove)
//   .count <N> [down]  /  .count stop      — N message (1..N) usi chat mein
//   .getpp [number | @user | reply]        — profile photo
//   .ufpp [blur|white|black]               — apni profile photo bina crop kiye (photo par reply karke)
const { cmd } = require('../arslan');
const config = require('../config');
const antibot = require('../lib/antibot');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const numOf = (jid) => String(jid || '').split('@')[0].split(':')[0];
const P = () => config.PREFIX || '.';

function mentionedOf(mek) {
    const msg = mek && mek.message || {};
    for (const k of Object.keys(msg)) {
        const ci = msg[k] && msg[k].contextInfo;
        if (ci && ci.mentionedJid && ci.mentionedJid.length) return ci.mentionedJid;
    }
    return [];
}

// ═══════════════════════════ .antibot ═══════════════════════════
cmd({
    pattern: 'antibot',
    alias: ['antibots', 'botblock', 'nobot'],
    desc: 'Group mein dusron ke bot pakdo: pehle warn, dobara aaye to remove',
    category: 'group',
    react: '🛡️',
    use: '.antibot on | off | status | allow @user | unallow @user',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const { reply, args, isGroup, from, isAdmins, isOwner, isBotAdmins } = ctx;
    if (!isGroup) return reply('⛔ Ye command sirf group mein chalti hai.');
    if (!(isAdmins || isOwner)) return reply('⛔ Ye command sirf group admin / bot owner chala sakta hai.');
    const a = String(args[0] || '').toLowerCase();
    if (['on', 'enable', 'true', '1'].includes(a)) {
        antibot.setOn(conn, from, true);
        return reply(
`🛡️ *ANTI BOT ON*

Ab agar is group mein kisi ne apna bot lagaya hua hua:
1️⃣ Pehli baar → *warning* (apna bot private karo)
2️⃣ Dobara bot ka message → *group se remove*

${isBotAdmins ? '✅ Main admin hu — remove kar sakta hu.' : '⚠️ Main abhi *admin nahi hu* — remove ke liye mujhe admin banao.'}
👑 Group admins par ye rule lagu nahi hota.
Band karne ke liye: ${P()}antibot off`);
    }
    if (['off', 'disable', 'false', '0'].includes(a)) { antibot.setOn(conn, from, false); return reply('🛡️ *ANTI BOT OFF*'); }
    if (['allow', 'unallow'].includes(a)) {
        const jid = mentionedOf(mek)[0] || (m.quoted && (m.quoted.sender || m.quoted.participant)) || '';
        const n = numOf(jid) || String(args[1] || '').replace(/\D/g, '');
        if (!n) return reply(`Kis ko? ${P()}antibot ${a} @user (ya reply karke)`);
        antibot.allow(conn, from, n, a === 'allow');
        antibot.resetWarn(conn, from, n);
        return reply(a === 'allow' ? `✅ @${n} ka bot ab allowed hai.` : `✅ @${n} ab allowed list se hata diya.`);
    }
    return reply(
`🛡️ *ANTI BOT:* ${antibot.isOn(conn, from) ? '🟢 ON' : '🔴 OFF'}
⚠️ Warn hue members: ${antibot.warnCount(conn, from)}
✅ Allowed: ${antibot.allowed(conn, from).length}

${P()}antibot on
${P()}antibot off
${P()}antibot allow @user`);
});

// ═══════════════════════════ .count ═══════════════════════════
const COUNT_MAX = Number(process.env.COUNT_MAX || 1000);
const counters = new Map();   // chat -> { stop: bool }

cmd({
    pattern: 'count',
    alias: ['cd', 'counting', 'countdown'],
    desc: 'Jitna likho utne message (1,2,3...) usi chat mein bhejo',
    category: 'tools',
    react: '🔢',
    use: '.count 100  |  .count 20 down  |  .count stop',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const { reply, args, from, isOwner, isAdmins } = ctx;
    if (!(isOwner || isAdmins || !ctx.isGroup)) return reply('⛔ Group mein ye sirf admin / owner chala sakta hai.');
    const a0 = String(args[0] || '').toLowerCase();
    if (['stop', 'cancel', 'band'].includes(a0)) {
        const c = counters.get(from);
        if (!c) return reply('ℹ️ Is chat mein koi count nahi chal raha.');
        c.stop = true;
        return reply('🛑 Count rok diya.');
    }
    const n = parseInt(a0, 10);
    if (!n || n < 1) return reply(`🔢 *COUNT*\n\n${P()}count 100  → 1 se 100 tak message\n${P()}count 20 down → 20 se 1 tak\n${P()}count stop → rok do\n\nMax: ${COUNT_MAX}`);
    const total = Math.min(n, COUNT_MAX);
    if (counters.has(from)) return reply(`⏳ Is chat mein count pehle se chal raha hai. Rokne ke liye ${P()}count stop`);
    const down = args.slice(1).some(x => /^(down|reverse|ulta)$/i.test(x));
    const state = { stop: false };
    counters.set(from, state);
    if (n > COUNT_MAX) await reply(`ℹ️ Max ${COUNT_MAX} tak hi bhej sakta hu, ${COUNT_MAX} bhej raha hu.`);
    try {
        for (let i = 1; i <= total && !state.stop; i++) {
            const val = down ? total - i + 1 : i;
            await conn.sendMessage(from, { text: String(val) });
            await sleep(650 + Math.floor(Math.random() * 450));   // thora random gap (WhatsApp spam-block se bachne ke liye)
        }
        if (!state.stop) await conn.sendMessage(from, { text: `✅ Count poora: ${total}` });
    } finally { counters.delete(from); }
});

// ═══════════════════════════ .getpp ═══════════════════════════
function normalizeNumber(raw) {
    let n = String(raw || '').replace(/\D/g, '');
    if (!n) return '';
    if (n.startsWith('00')) n = n.slice(2);
    const cc = String(config.DEFAULT_COUNTRY_CODE || '92');
    if (n.startsWith('0')) n = cc + n.slice(1);
    else if (n.length === 10 && n.startsWith('3')) n = cc + n;
    return n;
}
async function ppUrl(conn, jid) {
    for (const type of ['image', 'preview']) {
        try { const u = await conn.profilePictureUrl(jid, type); if (u) return u; } catch (_) {}
    }
    return null;
}

cmd({
    pattern: 'getpp',
    alias: ['pp', 'dp', 'getdp', 'profilepic', 'ppuser'],
    desc: 'Kisi ki profile photo nikalo (reply / @tag / number)',
    category: 'tools',
    react: '🖼️',
    use: '.getpp  |  .getpp 923001234567  |  .getpp @user  (ya reply karke)',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const { reply, args, from, isGroup, sender } = ctx;
    try {
        let jid = null, label = '';
        const numArg = args.find(x => /\d{6,}/.test(x.replace(/\D/g, '')) && !/^@/.test(x)) || args.join('');
        const men = mentionedOf(mek)[0];
        if (men) jid = men;
        else if (/\d{6,}/.test(String(numArg).replace(/\D/g, ''))) { const n = normalizeNumber(numArg); if (n) jid = n + '@s.whatsapp.net'; }
        else if (m.quoted && (m.quoted.sender || m.quoted.participant)) jid = m.quoted.sender || m.quoted.participant;
        else jid = isGroup ? sender : from;      // DM mein samne wale ki, group mein tumhari apni
        if (!jid) return reply('❌ Kiski photo? Number likho ya reply karo.');
        label = '@' + numOf(jid);
        const url = await ppUrl(conn, jid);
        if (!url) return reply(`❌ ${label} ki profile photo nahi mili (photo nahi lagi, ya privacy settings mein hide hai).`);
        await conn.sendMessage(from, { image: { url }, caption: `🖼️ *PROFILE PHOTO*\n👤 ${label}`, mentions: [jid] }, { quoted: mek });
    } catch (e) {
        return reply('❌ Profile photo nikalne mein error: ' + (e.message || e));
    }
});

// ═══════════════════════════ .ufpp (full profile photo, no crop) ═══════════════════════════
function ffmpegBin() {
    try { const r = spawnSync('ffmpeg', ['-version'], { timeout: 8000 }); if (r.status === 0) return 'ffmpeg'; } catch (_) {}
    try { return require('@ffmpeg-installer/ffmpeg').path || 'ffmpeg'; } catch (_) { return 'ffmpeg'; }
}
function runFfmpeg(args) {
    return new Promise((resolve, reject) => {
        const p = spawn(ffmpegBin(), args, { stdio: ['ignore', 'ignore', 'pipe'] });
        let err = '';
        p.stderr.on('data', d => { err += d; if (err.length > 4000) err = err.slice(-2000); });
        p.on('error', reject);
        p.on('close', c => c === 0 ? resolve() : reject(new Error('ffmpeg: ' + err.trim().split('\n').pop())));
    });
}
// photo ko bina kaate square bana do (baqi jagah blur / white / black se bhar do)
async function makeSquare(buffer, mode = 'blur', size = 640) {
    const dir = path.join(os.tmpdir(), 'ufpp-' + crypto.randomBytes(5).toString('hex'));
    fs.mkdirSync(dir, { recursive: true });
    try {
        const inp = path.join(dir, 'in'), out = path.join(dir, 'out.jpg');
        fs.writeFileSync(inp, buffer);
        const fit = `scale=${size}:${size}:force_original_aspect_ratio=decrease`;
        let fc;
        if (mode === 'white' || mode === 'black') {
            fc = `[0:v]${fit},pad=${size}:${size}:(ow-iw)/2:(oh-ih)/2:color=${mode}[o]`;
        } else {
            fc = `[0:v]split[a][b];[a]scale=${size}:${size}:force_original_aspect_ratio=increase,crop=${size}:${size},gblur=sigma=28,eq=brightness=-0.08[bg];[b]${fit}[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2[o]`;
        }
        await runFfmpeg(['-y', '-hide_banner', '-loglevel', 'error', '-i', inp, '-filter_complex', fc, '-map', '[o]', '-frames:v', '1', '-q:v', '2', out]);
        return fs.readFileSync(out);
    } finally { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {} }
}
async function imageFrom(m, mek) {
    const grab = async (msg) => {
        if (!msg) return null;
        let inner = msg;
        for (let i = 0; i < 4; i++) {
            const nx = (inner.viewOnceMessageV2 || inner.viewOnceMessage || inner.ephemeralMessage || inner.documentWithCaptionMessage || {}).message;
            if (!nx) break; inner = nx;
        }
        const media = inner.imageMessage || (inner.documentMessage && /^image\//.test(inner.documentMessage.mimetype || '') ? inner.documentMessage : null);
        if (!media) return null;
        const stream = await downloadContentFromMessage(media, 'image');
        const chunks = []; for await (const c of stream) chunks.push(c);
        return Buffer.concat(chunks);
    };
    if (m.quoted && m.quoted.message) { const r = await grab(m.quoted.message).catch(() => null); if (r) return r; }
    return grab(mek.message).catch(() => null);
}

cmd({
    pattern: 'ufpp',
    alias: ['fullpp', 'fullprofile', 'setfullpp', 'nocroppp'],
    desc: 'Apni profile photo bina crop kiye (poori photo) lagao',
    category: 'owner',
    react: '🖼️',
    use: '.ufpp [blur|white|black]  (photo par reply karke ya photo ke caption mein)',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const { reply, args, isOwner, isCreator } = ctx;
    if (!(isOwner || isCreator)) return reply('*YEH COMMAND SIRF BOT OWNER KE LIYE HAI 😎*');
    const buf = await imageFrom(m, mek);
    if (!buf) return reply(`🖼️ *UFPP — Full Profile Photo*\n\nKisi *photo par reply* karke likho:\n${P()}ufpp  (blur background)\n${P()}ufpp white\n${P()}ufpp black\n\nPoori photo bina crop ke aap ki profile par lag jayegi.`);
    const mode = (args.find(x => /^(blur|white|black)$/i.test(x)) || 'blur').toLowerCase();
    try {
        await conn.sendMessage(ctx.from, { react: { text: '⏳', key: mek.key } }).catch(() => {});
        const square = await makeSquare(buf, mode, 640);
        const me = String(conn.user.id).split(':')[0].split('@')[0] + '@s.whatsapp.net';
        await conn.updateProfilePicture(me, square);
        await conn.sendMessage(ctx.from, { react: { text: '✅', key: mek.key } }).catch(() => {});
        return conn.sendMessage(ctx.from, { image: square, caption: `✅ *Profile photo update ho gayi* (bina crop)\nStyle: ${mode}` }, { quoted: mek });
    } catch (e) {
        await conn.sendMessage(ctx.from, { react: { text: '❌', key: mek.key } }).catch(() => {});
        return reply('❌ Profile photo set nahi hui: ' + (e.message || e));
    }
});

module.exports = { makeSquare };
