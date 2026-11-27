// plugins/sticker-react.js (v11.2) — STICKER REACTION
//
//  1) Sticker par reply:        .sts <name>        -> sticker apne "personal pool" mein save (name na do to 1,2,3... khud)
//  2) Kisi bhi message par reply:
//        .rs 5             -> save kiye hue stickers ka Mixup/Combo, 5 baar (stickers baari baari)
//        .rs 20            -> 20 baar combo          (.rs 10000 bhi chalta hai)
//        .rs <name> <n>    -> sirf ek sticker n baar (jaise .rs dog 5)
//        .was [name]       -> single sticker reaction
//        .rs stop          -> chalti hui reaction rok do
//  .sts list  /  .sts del <name>  /  .sts clear
//
// Har sticker usi message ke REPLY ki tarah bheja jata hai (quoted), isliye us message ke aas paas lagta hai.
// Env: RS_MAX (default 10000) = ek baar mein max stickers, RS_DELAY_MS (default 150) = do stickers ke beech gap.
const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { cmd } = require('../ahmadcore');
const { isSessionUser } = require('../lib/premium-check');

const ROOT = path.join(process.env.DATA_DIR || path.join(__dirname, '..', 'data'), 'stickers');
const RS_MAX = Math.max(1, parseInt(process.env.RS_MAX || '10000', 10) || 10000);
const RS_DELAY = Math.max(0, parseInt(process.env.RS_DELAY_MS || '150', 10) || 150);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const running = new Map();   // chat jid -> { stop }

const numOf = (j) => String(j || '').split('@')[0].split(':')[0].replace(/\D/g, '');
const allowed = (ctx) => Boolean(ctx.isOwner || ctx.isMe || isSessionUser(ctx));

// ---------- personal pool (har bot-account ka apna) ----------
function poolDir(conn) {
    const d = path.join(ROOT, numOf(conn.user && conn.user.id) || 'default');
    fs.mkdirSync(d, { recursive: true });
    return d;
}
function loadIndex(conn) {
    try { return JSON.parse(fs.readFileSync(path.join(poolDir(conn), 'index.json'), 'utf8')); } catch (_) { return {}; }
}
function saveIndex(conn, idx) { fs.writeFileSync(path.join(poolDir(conn), 'index.json'), JSON.stringify(idx, null, 1)); }
const cleanName = (n) => String(n || '').toLowerCase().replace(/[^a-z0-9_\-\u0600-\u06ff]/g, '').slice(0, 20);
function readSticker(conn, name) {
    const f = path.join(poolDir(conn), name + '.webp');
    return fs.existsSync(f) ? fs.readFileSync(f) : null;
}
const isAnimatedWebp = (b) => b.includes(Buffer.from('ANIM')) || b.includes(Buffer.from('ANMF'));

// ---------- replied message nikalna ----------
function getContext(mek) {
    const msg = mek.message || {};
    for (const k of Object.keys(msg)) {
        const v = msg[k];
        if (v && typeof v === 'object' && v.contextInfo && v.contextInfo.quotedMessage) return v.contextInfo;
    }
    return null;
}
function unwrap(m) {
    let x = m || {};
    for (let i = 0; i < 4; i++) {
        const nx = (x.ephemeralMessage || x.viewOnceMessage || x.viewOnceMessageV2 || x.documentWithCaptionMessage || {}).message;
        if (!nx) break; x = nx;
    }
    return x;
}
function quotedTarget(conn, mek, from) {
    const ci = getContext(mek);
    if (!ci) return null;
    const mine = numOf(conn.user && conn.user.id);
    const mineLid = numOf(conn.user && conn.user.lid);
    const part = ci.participant || '';
    const p = numOf(part);
    return {
        key: { remoteJid: from, id: ci.stanzaId, participant: part || undefined, fromMe: Boolean(p && (p === mine || p === mineLid)) },
        message: ci.quotedMessage
    };
}

// ---------- .sts ----------
cmd({
    pattern: 'sts',
    alias: ['savesticker', 'stsave', 'addsticker'],
    desc: 'Sticker par reply karke save: .sts <name> | .sts list | .sts del <name> | .sts clear',
    category: 'sticker',
    react: '💾',
    use: '.sts <name>  (sticker par reply)',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const { args, reply, from } = ctx;
    if (!allowed(ctx)) return reply('*YEH COMMAND SIRF PAIRED BOT USER / OWNER KE LIYE HAI 😎*');
    const sub = String(args[0] || '').toLowerCase();
    const idx = loadIndex(conn);
    const names = Object.keys(idx);

    if (sub === 'list' || sub === 'all') {
        if (!names.length) return reply('📭 Abhi koi sticker save nahi.\n\nSticker par reply karke `.sts <name>` likho.');
        return reply(`╭━━〔 🗂️ SAVED STICKERS 〕━━╮\n${names.map(n => `┃ ${idx[n].animated ? '✨' : '🖼️'} ${n}`).join('\n')}\n╰━━ 👤 Total: ${names.length} ━━╯\n\n👉 .rs 10  ·  .rs <name> 5  ·  .was`);
    }
    if (sub === 'del' || sub === 'delete' || sub === 'remove') {
        const n = cleanName(args[1]);
        if (!n || !idx[n]) return reply('❌ Ye naam save nahi. `.sts list` dekho.');
        delete idx[n]; try { fs.unlinkSync(path.join(poolDir(conn), n + '.webp')); } catch (_) {}
        saveIndex(conn, idx);
        return reply(`🗑️ *${n}* hata diya. Bache: ${Object.keys(idx).length}`);
    }
    if (sub === 'clear') {
        for (const n of names) { try { fs.unlinkSync(path.join(poolDir(conn), n + '.webp')); } catch (_) {} }
        saveIndex(conn, {});
        return reply('🧹 Saare saved stickers hata diye.');
    }

    // save
    const ci = getContext(mek);
    const st = ci && unwrap(ci.quotedMessage).stickerMessage;
    if (!st) {
        return reply('💾 *STICKER SAVE*\n\nKisi *sticker par reply* karke likho:\n`.sts <name>`  (jaise `.sts dog`)\n\n📋 `.sts list` · 🗑️ `.sts del <name>` · 🧹 `.sts clear`');
    }
    let name = cleanName(args.join(''));
    if (!name) { let i = names.length + 1; while (idx[String(i)]) i++; name = String(i); }
    try {
        const stream = await downloadContentFromMessage(st, 'sticker');
        const chunks = []; for await (const c of stream) chunks.push(c);
        const buf = Buffer.concat(chunks);
        if (!buf.length) throw new Error('sticker download nahi hua');
        fs.writeFileSync(path.join(poolDir(conn), name + '.webp'), buf);
        const replaced = Boolean(idx[name]);
        idx[name] = { animated: Boolean(st.isAnimated) || isAnimatedWebp(buf), at: Date.now() };
        saveIndex(conn, idx);
        const total = Object.keys(idx).length;
        const p = ctx.prefix || '.';
        return reply(
`╭━━〔 ✅ STICKER SAVED 〕━━╮
┃ 🏷️ Name: ${name}${replaced ? ' (purana badal diya)' : ''}
┃ ✨ Type: ${idx[name].animated ? 'Animated' : 'Static'}
┃ 👤 Total Saved: ${total}
╰━━━━━━━━━━━━━━╯

💡 *Ab kisi bhi message ko reply karke likho:*
👉 *${p}rs 5*  _(save kiye hue ${total} stickers ka Mixup/Combo react)_
👉 *${p}rs 10*  _(10 baar Mixup combo)_
👉 *${p}rs ${name} 5*  _(sirf "${name}" sticker 5 baar)_
👉 *${p}was*  _(single sticker reaction)_`);
    } catch (e) {
        return reply('❌ Save nahi hua: ' + (e.message || e));
    }
});

// ---------- bhejne ka kaam ----------
async function fire(conn, from, target, picks, mek) {
    const state = { stop: false };
    running.set(from, state);
    let sent = 0, failed = 0;
    try {
        for (const buf of picks) {
            if (state.stop) break;
            try { await conn.sendMessage(from, { sticker: buf }, { quoted: target }); sent++; failed = 0; }
            catch (e) { failed++; if (failed >= 5) throw e; await sleep(1000); }
            if (RS_DELAY) await sleep(RS_DELAY);
        }
    } finally { if (running.get(from) === state) running.delete(from); }
    return { sent, stopped: state.stop };
}

cmd({
    pattern: 'rs',
    alias: ['stickerreact', 'sreact', 'stickerreaction'],
    desc: 'Message par sticker reaction: .rs 5 (combo) | .rs <name> <times> | .rs stop',
    category: 'sticker',
    react: '⚡',
    use: '.rs <times>  |  .rs <name> <times>  (message par reply)',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const { args, reply, from } = ctx;
    if (!allowed(ctx)) return reply('*YEH COMMAND SIRF PAIRED BOT USER / OWNER KE LIYE HAI 😎*');
    const p = ctx.prefix || '.';
    if (String(args[0] || '').toLowerCase() === 'stop') {
        const st = running.get(from);
        if (!st) return reply('ℹ️ Is chat mein abhi koi sticker reaction nahi chal rahi.');
        st.stop = true; return reply('🛑 Roka ja raha hai…');
    }
    const help =
`╭━━〔 ⚡ STICKER REACTION (.rs) 〕━━╮
┃ ⚠️ Jis message par sticker react karna hai,
┃    us message ko *REPLY* karo!
┃
┃ 📌 *Syntax:*
┃ 👉 *${p}rs 5*  _(apne saved stickers ka Mixup/Combo)_
┃ 👉 *${p}rs 10*  _(10 baar combo)_
┃ 👉 *${p}rs <name> <times>*  _(jaise ${p}rs dog 5)_
┃ 👉 *${p}was*  _(single sticker reaction)_
┃ 👉 *${p}rs stop*  _(rok do)_
┃
┃ 💡 Saved stickers: *${p}sts list*
╰━━━━━━━━━━━━━━━━━━━━╯`;
    const target = quotedTarget(conn, mek, from);
    if (!target) return reply(help);
    if (running.has(from)) return reply(`⏳ Is chat mein pehle se reaction chal rahi hai. Rokne ke liye *${p}rs stop*`);

    const idx = loadIndex(conn);
    const names = Object.keys(idx);
    if (!names.length) return reply('📭 Pehle koi sticker save karo: sticker par reply karke `.sts <name>`');

    // parse: "<n>" = combo; "<name> <n>" = ek sticker n baar; "<name>" = ek baar
    let times, pool;
    const a0 = args[0], a1 = args[1];
    if (a0 && /^\d+$/.test(a0) && a1 === undefined) { times = parseInt(a0, 10); pool = names; }
    else if (a0 && /^\d+$/.test(a0) && a1 && /^\d+$/.test(a1) && idx[a0]) { times = parseInt(a1, 10); pool = [a0]; }
    else if (a0) {
        const n = cleanName(a0);
        if (!idx[n]) return reply(`❌ *${a0}* naam ka sticker save nahi.\n\n${help}\n\n🗂️ Saved: ${names.join(', ')}`);
        times = a1 ? parseInt(a1, 10) : 1; pool = [n];
    } else { times = names.length; pool = names; }
    if (!Number.isFinite(times) || times < 1) return reply(help);
    if (times > RS_MAX) times = RS_MAX;

    const bufs = pool.map(n => readSticker(conn, n)).filter(Boolean);
    if (!bufs.length) return reply('❌ Saved sticker file nahi mili — dobara `.sts <name>` se save karo.');
    const picks = Array.from({ length: times }, (_, i) => bufs[i % bufs.length]);   // baari baari (Mixup)

    if (times >= 200) await reply(`⚡ *${times}* stickers bhej raha hoon (~${Math.ceil(times * (RS_DELAY + 250) / 1000)}s)…\nRokne ke liye *${p}rs stop*`);
    try {
        const r = await fire(conn, from, target, picks, mek);
        if (times >= 200 || r.stopped) await reply(`${r.stopped ? '🛑 Roka gaya' : '✅ Ho gaya'} — ${r.sent}/${times} stickers bheje.`);
    } catch (e) { await reply('❌ Beech mein ruk gaya: ' + (e.message || e)); }
});

cmd({
    pattern: 'was',
    alias: ['wasticker', 'singlesticker'],
    desc: 'Message par ek single sticker reaction: .was [name]',
    category: 'sticker',
    react: '🎯',
    use: '.was [name]  (message par reply)',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const { args, reply, from } = ctx;
    if (!allowed(ctx)) return reply('*YEH COMMAND SIRF PAIRED BOT USER / OWNER KE LIYE HAI 😎*');
    const target = quotedTarget(conn, mek, from);
    if (!target) return reply('🎯 Jis message par sticker react chahiye, usay *reply* karke `.was` (ya `.was <name>`) likho.');
    const idx = loadIndex(conn);
    const names = Object.keys(idx);
    if (!names.length) return reply('📭 Pehle koi sticker save karo: sticker par reply karke `.sts <name>`');
    let n = cleanName(args[0]);
    if (n && !idx[n]) return reply(`❌ *${args[0]}* save nahi. Saved: ${names.join(', ')}`);
    if (!n) n = names[Math.floor(Math.random() * names.length)];
    const buf = readSticker(conn, n);
    if (!buf) return reply('❌ Sticker file nahi mili — dobara save karo.');
    try { await conn.sendMessage(from, { sticker: buf }, { quoted: target }); }
    catch (e) { await reply('❌ ' + (e.message || e)); }
});
