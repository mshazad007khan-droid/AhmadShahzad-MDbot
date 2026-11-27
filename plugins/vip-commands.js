// plugins/vip-commands.js — 💎 VIP commands (har section me 2-4). Sirf VIP / owner chala sakta hai.
const crypto = require('crypto');
const { cmd } = require('../ahmadcore');
const vip = require('../lib/vipstore');
const U = require('../lib/v10util');

function V(opts, fn) {
    const o = { react: '💎', ...opts, desc: '💎 VIP · ' + opts.desc, filename: __filename };
    o.alias = (o.alias || []).filter(a => !require('../ahmadcore').findCommand(a));
    vip.registry.push({ pattern: o.pattern, category: o.category });
    cmd(o, async (conn, mek, m, ctx) => {
        try {
            if (!(await vip.gate(conn, ctx))) return;
            await fn(conn, mek, m, ctx);
        } catch (e) {
            console.log(`[vip:${o.pattern}]`, e.message);
            try { await ctx.reply('❌ ' + (e.message || 'Kuch masla hua, dobara try karo.').slice(0, 200)); } catch (_) {}
        }
    });
}

// ───────────────── PRANK (3) ─────────────────
V({ pattern: 'vipfbi', alias: ['fbitrace', 'fbiprank'], desc: 'Fake FBI trace animation (prank)', category: 'prank', use: '.vipfbi @user' },
    async (conn, mek, m, ctx) => {
        const t = U.targetOf(ctx, mek, m); const n = t ? U.tag(t) : 'Target'; const mentions = t ? [t] : undefined;
        const ip = `${U.rnd(100, 220)}.${U.rnd(1, 254)}.${U.rnd(1, 254)}.${U.rnd(1, 254)}`;
        const frames = [
            `🕵️ *FBI CYBER DIVISION*\n\nConnecting to server...\n${U.bar(10)}`,
            `🕵️ *FBI CYBER DIVISION*\n\nTarget locked: ${n}\n${U.bar(35)}`,
            `🕵️ *FBI CYBER DIVISION*\n\nIP: ${ip}\nDevice: Android ${U.rnd(11, 15)}\n${U.bar(60)}`,
            `🕵️ *FBI CYBER DIVISION*\n\nSearching history...\n${U.bar(85)}`,
            `🚨 *TRACE COMPLETE* 🚨\n\n${n} ko FBI ne dhoond liya! 😂\n\n✅ *PRANK!* Sab kuch fake hai, mazak tha 😄`
        ];
        await U.animate(conn, ctx.from, mek, frames, 1500, mentions);
    });
V({ pattern: 'vipwifihack', alias: ['wifihack', 'wifiprank'], desc: 'Fake WiFi password hack (prank)', category: 'prank', use: '.vipwifihack' },
    async (conn, mek, m, ctx) => {
        const pw = crypto.randomBytes(5).toString('hex');
        const frames = ['📶 *WiFi Cracker v2.0*\n\nScanning networks...', `📶 *WiFi Cracker v2.0*\n\nFound: ${U.pick(['PTCL-', 'Nayatel-', 'StormFiber-', 'Zong4G-'])}${U.rnd(1000, 9999)}\n${U.bar(40)}`,
            `📶 *WiFi Cracker v2.0*\n\nBrute-forcing...\n${U.bar(75)}`, `📶 *PASSWORD FOUND*\n\n🔑 ${pw}\n\n✅ *PRANK!* Ye random hai, asli nahi 😄`];
        await U.animate(conn, ctx.from, mek, frames, 1500);
    });
V({ pattern: 'vipdelete', alias: ['deleteprank', 'fakedelete'], desc: 'Fake "saari chats delete ho rahi hain" (prank)', category: 'prank', use: '.vipdelete' },
    async (conn, mek, m, ctx) => {
        const frames = ['🗑️ *WhatsApp Cleaner*\n\nDeleting all chats in 5...', '🗑️ Deleting all chats in 4...', '🗑️ Deleting all chats in 3...', '🗑️ Deleting all chats in 2...', '🗑️ Deleting all chats in 1...',
            '😂 *PRANK!* Kuch delete nahi hua, sab safe hai ✅'];
        await U.animate(conn, ctx.from, mek, frames, 1200);
    });

// ───────────────── FUN (3) ─────────────────
V({ pattern: 'vipship', alias: ['shipcard', 'lovecard'], desc: 'Do naam ka love compatibility card', category: 'fun', use: '.vipship Ali & Sara' },
    async (conn, mek, m, ctx) => {
        const parts = ctx.q.split(/&|\+|\band\b|,/i).map(s => s.trim()).filter(Boolean);
        if (parts.length < 2) return ctx.reply('📌 Use: `.vipship Ali & Sara`');
        const seed = crypto.createHash('md5').update(parts.map(s => s.toLowerCase()).sort().join('|')).digest();
        const pct = seed[0] % 101;
        const verdict = pct > 85 ? '💍 Perfect Match!' : pct > 65 ? '💞 Bohat acha jodi' : pct > 40 ? '🙂 Koshish karo' : '💔 Mushkil hai';
        await ctx.reply(`╭━〔 💘 𝐒𝐇𝐈𝐏 𝐂𝐀𝐑𝐃 〕━╮\n┃ 👤 ${parts[0]}\n┃ ❤️ +\n┃ 👤 ${parts[1]}\n┃\n┃ ${U.bar(pct, 12)}\n┃ ${verdict}\n╰━━━━━━━━━━━━━━╯`);
    });
V({ pattern: 'vipiq', alias: ['iqtest', 'iqscan'], desc: 'IQ scanner (mazaaqiya)', category: 'fun', use: '.vipiq @user' },
    async (conn, mek, m, ctx) => {
        const t = U.targetOf(ctx, mek, m) || ctx.sender; const iq = U.rnd(60, 160);
        const lvl = iq > 140 ? '🧠 Genius' : iq > 115 ? '😎 Smart' : iq > 90 ? '🙂 Average' : '🥔 Aalu level';
        await U.animate(conn, ctx.from, mek, [`🧠 *IQ Scanner*\n\nScanning ${U.tag(t)}...\n${U.bar(30)}`, `🧠 *IQ Scanner*\n\nAnalysing brain...\n${U.bar(70)}`,
            `🧠 *RESULT*\n\n${U.tag(t)}\nIQ: *${iq}*\n${lvl}\n\n_(sirf mazaaq hai)_`], 1300, [t]);
    });
V({ pattern: 'vipfortune', alias: ['fortunecard', 'kismat'], desc: 'Aaj ki kismat ka card', category: 'fun', use: '.vipfortune' },
    async (conn, mek, m, ctx) => {
        const luck = U.rnd(1, 100);
        const msgs = ['Aaj koi purana dost yaad karega.', 'Paisa aane ka mauka hai, ghabrao mat.', 'Kisi acchi khabar ka intezar karo.', 'Aaj sabr se kaam lo, nateeja acha hoga.', 'Naya mauka darwaze par hai.', 'Family ke saath waqt guzaro, sukoon milega.'];
        await ctx.reply(`╭━〔 🔮 𝐅𝐎𝐑𝐓𝐔𝐍𝐄 〕━╮\n┃ 🍀 Luck: ${U.bar(luck)}\n┃ 🔢 Lucky No: ${U.rnd(1, 99)}\n┃ 🎨 Lucky Color: ${U.pick(['Neela', 'Hara', 'Laal', 'Peela', 'Kala', 'Safed'])}\n┃\n┃ 💬 ${U.pick(msgs)}\n╰━━━━━━━━━━━━━━╯`);
    });

// ───────────────── VOICE CHANGE (4) — voice note par reply ─────────────────
function vc(pattern, alias, desc, filter) {
    V({ pattern, alias, desc, category: 'voicechange', react: '🎙️', use: `.${pattern} (voice note par reply)` }, async (conn, mek, m, ctx) => {
        const med = await U.getMedia(m, mek, ['audio', 'video']);
        if (!med) return ctx.reply(`🎙️ Kisi voice note / audio par reply karke \`.${pattern}\` likho.`);
        if (med.buffer.length > 12 * 1024 * 1024) return ctx.reply('❌ Audio bohat bari hai (12MB se kam rakho).');
        const out = await U.ffmpegBuffer(med.buffer, (i, o) => ['-i', i, '-vn', '-t', '90', '-af', filter, '-c:a', 'libopus', '-b:a', '48k', '-f', 'ogg', o], 'ogg');
        await conn.sendMessage(ctx.from, { audio: out, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: mek });
    });
}
vc('vipvcrobot', ['robotvoice', 'vcrobot'], 'Robot awaaz', 'afftfilt=real=\'hypot(re,im)*sin(0)\':imag=\'hypot(re,im)*cos(0)\':win_size=512:overlap=0.75,volume=1.5');
vc('vipvcalien', ['alienvoice', 'vcalien'], 'Alien awaaz', 'asetrate=44100*1.35,aresample=44100,atempo=0.74,tremolo=f=9:d=0.55');
vc('vipvcdemon', ['demonvoice', 'vcdemon'], 'Demon / bhaari awaaz', 'asetrate=44100*0.72,aresample=44100,atempo=1.39,aecho=0.8:0.8:40:0.5,volume=1.4');
vc('vipvcradio', ['radiovoice', 'vcradio', 'phonevoice'], 'Purane radio / phone ki awaaz', 'highpass=f=500,lowpass=f=3200,acompressor=threshold=-18dB:ratio=6,volume=1.6');

// ───────────────── PHOTO EDIT (4) — photo par reply ─────────────────
function photo(pattern, alias, desc, vf) {
    V({ pattern, alias, desc, category: 'photoedit', react: '🖼️', use: `.${pattern} (photo par reply)` }, async (conn, mek, m, ctx) => {
        const med = await U.getMedia(m, mek, ['image', 'sticker']);
        if (!med) return ctx.reply(`🖼️ Kisi photo par reply karke \`.${pattern}\` likho.`);
        const out = await U.ffmpegBuffer(med.buffer, (i, o) => ['-i', i, '-frames:v', '1', '-vf', vf, '-q:v', '2', o], 'jpg');
        await conn.sendMessage(ctx.from, { image: out, caption: `✨ ${desc}\n💎 VIP Edit` }, { quoted: mek });
    });
}
photo('vipglitch', ['glitchphoto', 'glitchedit'], 'Glitch effect', 'scale=trunc(iw/2)*2:trunc(ih/2)*2,rgbashift=rh=-9:bh=9:gv=4,noise=alls=14:allf=t');
photo('vipneon', ['neonedit', 'neonphoto'], 'Neon edge effect', 'scale=trunc(iw/2)*2:trunc(ih/2)*2,edgedetect=mode=colormix:high=0,eq=saturation=2.2:brightness=0.05');
photo('vipduotone', ['duotone', 'duotoneedit'], 'Purple-orange duotone', 'scale=trunc(iw/2)*2:trunc(ih/2)*2,format=gray,format=rgb24,curves=r=\'0/0.12 1/1\':g=\'0/0 1/0.45\':b=\'0/0.4 1/0.85\'');
photo('vippolaroid', ['polaroid', 'polaroidedit'], 'Polaroid frame', 'scale=700:-2,pad=iw+50:ih+150:25:25:white,rotate=-3*PI/180:c=0x1a1a1a:ow=rotw(-3*PI/180):oh=roth(-3*PI/180)');

// ───────────────── VIDEO EDIT (2) ─────────────────
function video(pattern, alias, desc, vf, af) {
    V({ pattern, alias, desc, category: 'videoedit', react: '🎬', use: `.${pattern} (video par reply)` }, async (conn, mek, m, ctx) => {
        const med = await U.getMedia(m, mek, ['video']);
        if (!med) return ctx.reply(`🎬 Kisi video par reply karke \`.${pattern}\` likho.`);
        if (med.buffer.length > 20 * 1024 * 1024) return ctx.reply('❌ Video bohat bari hai (20MB se kam rakho).');
        const out = await U.ffmpegBuffer(med.buffer, (i, o) => ['-i', i, '-t', '15', '-vf', `${vf},scale=trunc(iw/2)*2:trunc(ih/2)*2`, ...(af ? ['-af', af] : ['-an']), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '27', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', o], 'mp4', 'mp4', 180000);
        await conn.sendMessage(ctx.from, { video: out, mimetype: 'video/mp4', caption: `🎬 ${desc}\n💎 VIP Edit` }, { quoted: mek });
    });
}
video('vipslowmo', ['slowmotion', 'slowmo'], 'Slow motion video', 'setpts=2*PTS', 'atempo=0.5');
video('vipreverse', ['reversevideo', 'rewind'], 'Video ulti chalao', 'reverse', 'areverse');

// ───────────────── AUDIO EDIT (3) ─────────────────
function audio(pattern, alias, desc, af) {
    V({ pattern, alias, desc, category: 'audioedit', react: '🎧', use: `.${pattern} (audio par reply)` }, async (conn, mek, m, ctx) => {
        const med = await U.getMedia(m, mek, ['audio', 'video']);
        if (!med) return ctx.reply(`🎧 Kisi audio / song par reply karke \`.${pattern}\` likho.`);
        if (med.buffer.length > 25 * 1024 * 1024) return ctx.reply('❌ File bohat bari hai (25MB se kam rakho).');
        const out = await U.ffmpegBuffer(med.buffer, (i, o) => ['-i', i, '-vn', '-t', '300', '-af', af, '-c:a', 'libmp3lame', '-b:a', '128k', o], 'mp3', 'bin', 180000);
        await conn.sendMessage(ctx.from, { audio: out, mimetype: 'audio/mpeg' }, { quoted: mek });
    });
}
audio('vipbassboost', ['bassboost2', 'bassvip'], 'Bass boost', 'bass=g=16:f=100:w=0.6,alimiter=limit=0.9');
audio('vip8d', ['8daudio', 'audio8d'], '8D audio (headphone lagao)', 'apulsator=hz=0.125,aecho=0.8:0.88:60:0.3');
audio('vipnightcore', ['nightcore2', 'nightcorevip'], 'Nightcore (tez + oonchi)', 'asetrate=44100*1.25,aresample=44100');

// ───────────────── TEXT FX (2) ─────────────────
const ZALGO = ['̀', '́', '̂', '̃', '̆', '̈', '̊', '̖', '̗', '̣', '̤', '̥', '̩', '̮', '̰'];
V({ pattern: 'vipzalgo', alias: ['glitchtext', 'zalgo'], desc: 'Glitchy zalgo text', category: 'textfx', react: '✨', use: '.vipzalgo text' },
    async (conn, mek, m, ctx) => {
        const s = (ctx.q || '').slice(0, 80); if (!s) return ctx.reply('📌 Use: `.vipzalgo Ahmad`');
        await ctx.reply([...s].map(c => c === ' ' ? c : c + Array.from({ length: U.rnd(3, 6) }, () => U.pick(ZALGO)).join('')).join(''));
    });
V({ pattern: 'vipbubble', alias: ['bubbletext', 'circletext'], desc: 'Bubble (circle) text', category: 'textfx', react: '✨', use: '.vipbubble text' },
    async (conn, mek, m, ctx) => {
        const s = (ctx.q || '').slice(0, 100); if (!s) return ctx.reply('📌 Use: `.vipbubble Ahmad`');
        await ctx.reply([...s].map(c => /[a-z]/.test(c) ? String.fromCodePoint(0x24D0 + c.charCodeAt(0) - 97) : /[A-Z]/.test(c) ? String.fromCodePoint(0x24B6 + c.charCodeAt(0) - 65) : /[1-9]/.test(c) ? String.fromCodePoint(0x2460 + Number(c) - 1) : c === '0' ? '⓪' : c).join(''));
    });

// ───────────────── TOOLS (3) ─────────────────
V({ pattern: 'vippass', alias: ['strongpass', 'passwordvip'], desc: 'Strong password generator (.vippass 16)', category: 'tools', react: '🔐', use: '.vippass [length]' },
    async (conn, mek, m, ctx) => {
        const len = Math.min(64, Math.max(8, parseInt(ctx.args[0], 10) || 16));
        const set = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*?';
        const mk = () => Array.from(crypto.randomBytes(len), b => set[b % set.length]).join('');
        await ctx.reply(`🔐 *STRONG PASSWORDS (${len})*\n\n1️⃣ \`${mk()}\`\n2️⃣ \`${mk()}\`\n3️⃣ \`${mk()}\`\n\n_Inhe kahin share mat karo._`);
    });
const key32 = (pw, salt) => crypto.scryptSync(pw, salt, 32);
V({ pattern: 'vipencrypt', alias: ['encryptvip', 'lock'], desc: 'Text ko password se encrypt karo', category: 'tools', react: '🔒', use: '.vipencrypt password | text' },
    async (conn, mek, m, ctx) => {
        const [pw, ...rest] = ctx.q.split('|'); const text = rest.join('|').trim();
        if (!pw.trim() || !text) return ctx.reply('📌 Use: `.vipencrypt mypassword | secret message`');
        const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12);
        const c = crypto.createCipheriv('aes-256-gcm', key32(pw.trim(), salt), iv);
        const enc = Buffer.concat([c.update(text, 'utf8'), c.final()]);
        const out = Buffer.concat([salt, iv, c.getAuthTag(), enc]).toString('base64url');
        await ctx.reply(`🔒 *ENCRYPTED*\n\n\`${out}\`\n\nKholne ke liye: \`.vipdecrypt password | code\``);
    });
V({ pattern: 'vipdecrypt', alias: ['decryptvip', 'unlock'], desc: 'Encrypted text kholo', category: 'tools', react: '🔓', use: '.vipdecrypt password | code' },
    async (conn, mek, m, ctx) => {
        const [pw, ...rest] = ctx.q.split('|'); const code = rest.join('|').trim();
        if (!pw.trim() || !code) return ctx.reply('📌 Use: `.vipdecrypt mypassword | code`');
        try {
            const b = Buffer.from(code, 'base64url');
            const d = crypto.createDecipheriv('aes-256-gcm', key32(pw.trim(), b.subarray(0, 16)), b.subarray(16, 28));
            d.setAuthTag(b.subarray(28, 44));
            await ctx.reply('🔓 *DECRYPTED*\n\n' + Buffer.concat([d.update(b.subarray(44)), d.final()]).toString('utf8'));
        } catch (_) { await ctx.reply('❌ Password ghalat hai ya code kharab hai.'); }
    });

// ───────────────── GAMES (2) ─────────────────
V({ pattern: 'vipslot', alias: ['slotvip', 'jackpot'], desc: 'Slot machine', category: 'games', react: '🎰', use: '.vipslot' },
    async (conn, mek, m, ctx) => {
        const s = ['🍒', '🍋', '🍇', '💎', '7️⃣', '🔔']; const r = [U.pick(s), U.pick(s), U.pick(s)];
        const win = r[0] === r[1] && r[1] === r[2] ? '🎉 JACKPOT!!!' : (r[0] === r[1] || r[1] === r[2] || r[0] === r[2]) ? '✨ Do match — chhota inaam!' : '😅 Dobara try karo';
        await ctx.reply(`🎰 *SLOT MACHINE*\n\n╭───────╮\n│ ${r.join(' ')} │\n╰───────╯\n\n${win}`);
    });
V({ pattern: 'vipduel', alias: ['diceduel', 'dicebattle'], desc: 'Bot ke saath dice duel', category: 'games', react: '🎲', use: '.vipduel' },
    async (conn, mek, m, ctx) => {
        const a = U.rnd(1, 6) + U.rnd(1, 6), b = U.rnd(1, 6) + U.rnd(1, 6);
        await ctx.reply(`🎲 *DICE DUEL*\n\n👤 Aap: *${a}*\n🤖 Bot: *${b}*\n\n${a > b ? '🏆 Aap jeet gaye!' : a < b ? '😈 Bot jeet gaya!' : '🤝 Barabar!'}`);
    });

// ───────────────── GROUP (2) ─────────────────
V({ pattern: 'vipgroupstats', alias: ['gstats', 'groupreport'], desc: 'Group ki poori report', category: 'group', react: '📊', use: '.vipgroupstats' },
    async (conn, mek, m, ctx) => {
        if (!ctx.isGroup) return ctx.reply('❌ Yeh command sirf group me chalta hai.');
        const md = await conn.groupMetadata(ctx.from);
        const admins = md.participants.filter(p => p.admin).length;
        await ctx.reply(`📊 *GROUP REPORT*\n\n🏷️ ${md.subject}\n👥 Members: ${md.participants.length}\n👑 Admins: ${admins}\n🙂 Normal: ${md.participants.length - admins}\n📅 Bana: ${new Date((md.creation || 0) * 1000).toLocaleDateString('en-GB')}\n🔒 Mode: ${md.announce ? 'Sirf admins message' : 'Sab message kar sakte'}\n📝 Description: ${(md.desc || 'nahi hai').slice(0, 120)}`);
    });
V({ pattern: 'viptagadmins', alias: ['tagadmins', 'calladmins'], desc: 'Sab admins ko tag karo', category: 'group', react: '📢', use: '.viptagadmins [message]' },
    async (conn, mek, m, ctx) => {
        if (!ctx.isGroup) return ctx.reply('❌ Yeh command sirf group me chalta hai.');
        const md = await conn.groupMetadata(ctx.from);
        const ad = md.participants.filter(p => p.admin).map(p => p.id);
        await conn.sendMessage(ctx.from, { text: `📢 *ADMINS KO BULAWA*\n${ctx.q ? '💬 ' + ctx.q + '\n' : ''}\n` + ad.map(j => '👑 ' + U.tag(j)).join('\n'), mentions: ad }, { quoted: mek });
    });
