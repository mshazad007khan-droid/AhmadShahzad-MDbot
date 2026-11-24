// plugins/pro-fun-v10.js — fun / games / love / general commands (sab offline, saaf-suthre)
const crypto = require('crypto');
const { cmd } = require('../arslan');
const U = require('../lib/v10util');

function F(pattern, alias, desc, category, react, use, fn) {
    cmd({ pattern, alias: (alias || []).filter(a => !require('../arslan').findCommand(a)), desc, category, react, use, filename: __filename }, async (conn, mek, m, ctx) => {
        try {
            const out = await fn(ctx, { conn, mek, m });
            if (typeof out === 'string' && out) await ctx.reply(out);
        } catch (e) { await ctx.reply('❌ ' + String(e.message || e).slice(0, 200)); }
    });
}
const P = U.pick;
const seedNum = (s, mod = 101) => crypto.createHash('md5').update(String(s).toLowerCase().trim()).digest()[0] % mod;

const JOKES = ['Teacher: Tum late kyun aaye? Student: Sir, sign laga tha "School Ahead, Go Slow".', 'Doctor: Aap ko aaram ki zaroorat hai. Mareez: Wo to theek hai, par WiFi ka password bhi chahiye.', 'Bivi: Main mar jaon to dobara shaadi karoge? Shohar: Nahi, ek hi galti baar baar nahi karta.', 'Programmer ki bivi: Doodh le aao, agar anday hon to 6 le aana. Wo 6 doodh le aaya — kyunki anday the.', 'Student: Sir, mujhe 0 kyun diya? Teacher: Kyunki isse kam dene ka option nahi tha.', 'Ek aadmi ne apne dost se kaha: Mera dimaagh bohat tez hai. Dost: Haan, kyunki isme kuch hai hi nahi, rukawat ke baghair chalta hai.', 'Mobile: 1% battery. Insaan: Ab to dil bhi 1% par aa gaya.', 'Exam hall me sab se bara jhoot: "Mujhe sab aata hai".'];
const LINES = ['Kya aap WiFi ho? Kyunki mujhe aap se strong connection mehsoos ho raha hai.', 'Aap ke bina mera din bilkul vaise hai jaise battery ke bina phone.', 'Aap Google ho? Kyunki jo main dhoondh raha tha, wo aap me mil gaya.', 'Chai aur aap — dono ke bina subah adhoori hai.'];
const COMPL = ['Aap ki muskurahat kamre ki roshni badha deti hai ✨', 'Aap bohat samajhdaar aur mehnati insaan ho 💪', 'Aap ke saath waqt guzarna hamesha acha lagta hai 🌸', 'Aap me leader banne ki sari khoobiyan hain 👑', 'Aap ka sense of humour kamaal ka hai 😄'];
const ROASTS = ['Aap itne slow ho ke loading bhi aap se tez hai 🐢', 'Aap ka WiFi signal aur aap ki planning — dono kamzor 😅', 'Aap itne relax ho ke alarm bhi aap se haar maan gaya 😴', 'Aap wo ho jo "5 minute me aata hun" bol ke 2 ghante laga deta hai ⏰'];
const TRUTHS = ['Aap ka sab se bara darr kya hai?', 'Aakhri jhoot kab bola tha aur kyun?', 'Aap ko apni kaunsi aadat sab se buri lagti hai?', 'Agar ek din ke liye invisible ho jao to kya karoge?', 'Aap ki zindagi ka sab se sharminda lamha?', 'Aap kis ke message ka sab se zyada intezar karte ho?'];
const DARES = ['Apne sab se acchay dost ko voice note me gaana sunao 🎤', 'Apna naam ulta likh kar group me bhejo 🔄', '5 minute tak sirf emojis me baat karo 😎', 'Apni sab se purani photo status par lagao 📸', 'Kisi ko bina wajah "shukriya" bolo 🙏'];
const WYR = ['Hamesha garmi ya hamesha sardi?', 'Bohat paisa magar tanha, ya kam paisa magar acche dost?', 'Past me jana ya future dekhna?', 'Sirf biryani zindagi bhar ya sirf pizza?', 'Udna ya invisible hona?', 'Mobile ke bina 1 mahina ya chai ke bina 1 mahina?'];
const RIDDLES = [['Aisi cheez jo jitni khinchi jaye utni chhoti hoti hai?', 'Pencil'], ['Jiske paas chaabi hai magar darwaza nahi?', 'Keyboard'], ['Jo bina pairon ke chalta hai?', 'Waqt (Time)'], ['Jo toot jata hai magar kabhi giraya nahi jata?', 'Wada (Promise)'], ['Jo ek baar ka hota hai magar do baar aata hai?', 'Aankh ka palak jhapakna'], ['Aisa kya hai jo hamesha aata hai magar kabhi pohanchta nahi?', 'Kal (Tomorrow)']];
const QUOTES = ['"Sabr ka phal meetha hota hai."', '"Jo mehnat karta hai, qismat uska saath deti hai."', '"Waqt aur lehron ka intezar koi nahi karta."', '"Seekhna kabhi band mat karo, kyunki zindagi kabhi sikhana band nahi karti."', '"Chhoti chhoti koshishein hi badi kamyabi banati hain."', '"Khud par yaqeen sab se bari taqat hai."', '"Aaj ka kaam kal par mat chhodo."'];
const SHAYARI = ['Dil ki baat labon par la nahi sakte,\nHum unse door reh kar bhi unhe bhula nahi sakte.', 'Mohabbat me kuch aisa asar hota hai,\nJo door ho kar bhi dil ke qareeb hota hai.', 'Waqt badalta hai, log badal jaate hain,\nMagar kuch yaadein hamesha saath nibhate hain.', 'Zindagi ek safar hai suhana,\nYahan kal kya ho kisne jaana.'];
const FACTS = ['Shehad kabhi kharab nahi hota — hazaron saal purana shehad bhi khaya ja sakta hai.', 'Octopus ke 3 dil hote hain.', 'Insaani dimaagh me taqreeban 86 arab neurons hote hain.', 'Kela botanical lihaaz se berry hai, magar strawberry nahi.', 'Bijli ki raftaar se bhi tez roshni chalti hai — taqreeban 3 lakh km/second.', 'Pakistan ka qaumi khel field hockey hai.', 'Dolphins ek aankh khol kar soti hain.'];
const BALL = ['Haan, bilkul! ✅', 'Pakka nahi, dobara pooch 🤔', 'Mujhe nahi lagta ❌', 'Bohat umeed hai 🙂', 'Aasar acche nahi 😬', 'Haan magar sabr rakho ⏳', 'Is par dhyan do, jawab mil jayega 🔮', 'Bilkul nahi!'];
const MOODS = ['😄 Khush', '😎 Confident', '😴 Neend me', '🤔 Soch me', '🥳 Party mood', '😌 Sukoon me', '🤯 Mashgool'];
const SIGNS = [['Capricorn', 1, 19], ['Aquarius', 2, 18], ['Pisces', 3, 20], ['Aries', 4, 19], ['Taurus', 5, 20], ['Gemini', 6, 20], ['Cancer', 7, 22], ['Leo', 8, 22], ['Virgo', 9, 22], ['Libra', 10, 22], ['Scorpio', 11, 21], ['Sagittarius', 12, 21], ['Capricorn', 12, 31]];

F('jokeurdu', ['mazaq', 'funnyjoke', 'latifa'], 'Saaf suthra latifa', 'fun', '😂', '.latifa', () => '😂 *LATIFA*\n\n' + P(JOKES));
F('softroast', ['roastme', 'mazaqudao'], 'Halka phulka roast (mazaaq)', 'fun', '🔥', '.softroast @user', (c, x) => { const t = U.targetOf(c, x.mek, x.m); if (t) { x.conn.sendMessage(c.from, { text: `🔥 ${U.tag(t)} — ${P(ROASTS)}\n\n_(mazaaq tha 😄)_`, mentions: [t] }, { quoted: x.mek }); return; } return '🔥 ' + P(ROASTS) + '\n\n_(mazaaq tha 😄)_'; });
F('truthpro', ['truthquestion', 'sachsawal'], 'Truth question', 'games', '🫣', '.truthpro', () => '🫣 *TRUTH*\n\n' + P(TRUTHS));
F('darepro', ['darechallenge', 'himmat'], 'Dare challenge', 'games', '😈', '.darepro', () => '😈 *DARE*\n\n' + P(DARES));
F('wyrgame', ['wyrq', 'ratherq'], 'Would you rather?', 'games', '🤷', '.wyrgame', () => '🤷 *WOULD YOU RATHER*\n\n' + P(WYR) + '\n\n_Group me jawab do!_');
F('pahelipk', ['riddleq', 'bujhaarat'], 'Paheli (jawab 20 sec baad)', 'games', '🧩', '.pahelipk', async (c, x) => {
    const [q, a] = P(RIDDLES); await c.reply(`🧩 *PAHELI*\n\n${q}\n\n⏳ Jawab 20 second me...`); await U.sleep(20000); await c.reply(`✅ *Jawab:* ${a}`);
});
F('inspire', ['quotepk', 'goldenwords'], 'Motivational quote', 'fun', '💡', '.inspire', () => '💡 ' + P(QUOTES));
F('shayaripk', ['urduShayari', 'shayarirandom'], 'Random shayari', 'love', '🌹', '.shayaripk', () => '🌹 *SHAYARI*\n\n' + P(SHAYARI));
F('funfact', ['randomfact', 'dilchaspfact'], 'Dilchasp fact', 'fun', '🧠', '.funfact', () => '🧠 *FACT*\n\n' + P(FACTS));
F('ball8', ['8ballpro', 'askball', 'sawalball'], 'Magic 8-ball se poocho', 'games', '🎱', '.ball8 kya main pass hounga?', (c) => { if (!c.q) throw new Error('Use: .magic8 <sawal>'); return `🎱 *${c.q.slice(0, 100)}*\n\n${P(BALL)}`; });
F('rateme', ['rateit', 'ratepro'], 'Kisi bhi cheez ko 10 me rate', 'fun', '⭐', '.rateme pizza', (c) => { if (!c.q) throw new Error('Use: .rateme <kuch bhi>'); const r = seedNum(c.q, 11); return `⭐ *${c.q.slice(0, 60)}*\n\n${'⭐'.repeat(r)}${'☆'.repeat(10 - r)}  *${r}/10*`; });
F('zodiacpro', ['rashi', 'starsign'], 'Birthday se zodiac sign (DD-MM)', 'fun', '♈', '.zodiacpro 15-08', (c) => {
    const mt = String(c.args[0] || '').match(/^(\d{1,2})[-/.](\d{1,2})/); if (!mt) throw new Error('Use: .zodiacsign 15-08'); const d = +mt[1], mo = +mt[2];
    const s = SIGNS.find(([n, m, e]) => mo < m || (mo === m && d <= e)); return `♈ *${s[0]}*\n\n🍀 Lucky number: ${U.rnd(1, 99)}\n🎨 Lucky color: ${P(['Neela', 'Hara', 'Laal', 'Peela', 'Safed'])}`;
});
F('luckyno', ['luckynumber', 'mylucky'], 'Aaj ka lucky number', 'fun', '🍀', '.luckyno', (c) => `🍀 Aaj ka lucky number: *${seedNum(c.sender + new Date().toDateString(), 99) + 1}*`);
F('coinflip2', ['tosscoin', 'sikka', 'headtail'], 'Sikka uchalo', 'games', '🪙', '.sikka', () => `🪙 *${P(['HEAD (Chit)', 'TAIL (Patt)'])}* aaya!`);
F('rollit', ['rolldice2', 'dicepro'], 'Dice roll (.rollit 2)', 'games', '🎲', '.rollit 2', (c) => { const n = Math.min(6, Math.max(1, parseInt(c.args[0], 10) || 1)); const r = Array.from({ length: n }, () => U.rnd(1, 6)); return `🎲 ${r.map(x => '⚀⚁⚂⚃⚄⚅'[x - 1] + x).join('  ')}\nJama: *${r.reduce((a, b) => a + b, 0)}*`; });
F('rockpaper', ['rpsgame', 'rpspro'], 'Rock Paper Scissors bot ke saath', 'games', '✊', '.rockpaper rock', (c) => {
    const map = { rock: '✊', paper: '✋', scissors: '✌️', r: '✊', p: '✋', s: '✌️', patthar: '✊', kaghaz: '✋', qainchi: '✌️' }; const k = String(c.args[0] || '').toLowerCase();
    const me = { r: 'rock', p: 'paper', s: 'scissors', patthar: 'rock', kaghaz: 'paper', qainchi: 'scissors' }[k] || k; if (!['rock', 'paper', 'scissors'].includes(me)) throw new Error('Use: .rockpaper rock / paper / scissors');
    const bot = P(['rock', 'paper', 'scissors']); const win = me === bot ? '🤝 Barabar!' : ((me === 'rock' && bot === 'scissors') || (me === 'paper' && bot === 'rock') || (me === 'scissors' && bot === 'paper')) ? '🏆 Aap jeet gaye!' : '😈 Bot jeet gaya!';
    return `${map[me]} Aap  vs  Bot ${map[bot]}\n\n${win}`;
});
const GUESS = new Map();
F('guessnum', ['guessgame', 'andaza'], 'Number guess game (1-100)', 'games', '🔢', '.guessnum 50', (c) => {
    const key = c.from + '|' + c.sender; let g = GUESS.get(key); const v = parseInt(c.args[0], 10);
    if (!g || Date.now() - g.t > 600000) { g = { n: U.rnd(1, 100), tries: 0, t: Date.now() }; GUESS.set(key, g); if (!Number.isFinite(v)) return '🔢 Maine 1 se 100 ke beech number socha hai. Andaza lagao: `.guessnum 50`'; }
    if (!Number.isFinite(v)) throw new Error('Use: .guessnum <number>'); g.tries++; g.t = Date.now();
    if (v === g.n) { GUESS.delete(key); return `🎉 Bilkul sahi! Number *${g.n}* tha. ${g.tries} koshish me.`; }
    return v < g.n ? `⬆️ Zyada bara number socho (koshish ${g.tries})` : `⬇️ Chhota number socho (koshish ${g.tries})`;
});
F('lovemeter', ['lovecalcpro', 'mohabbatmeter'], 'Do naam ki mohabbat %', 'love', '💘', '.lovemeter Ali & Sara', (c) => {
    const p = c.q.split(/&|\+|,|\band\b/i).map(s => s.trim()).filter(Boolean); if (p.length < 2) throw new Error('Use: .lovemeter Ali & Sara'); const r = seedNum(p.map(s => s.toLowerCase()).sort().join('|'));
    return `💘 *LOVE METER*\n\n${p[0]} ❤️ ${p[1]}\n${U.bar(r, 12)}`;
});
F('friendmeter', ['dostimeter', 'bffmeter'], 'Do naam ki dosti %', 'love', '🤝', '.friendmeter Ali & Ahmad', (c) => {
    const p = c.q.split(/&|\+|,|\band\b/i).map(s => s.trim()).filter(Boolean); if (p.length < 2) throw new Error('Use: .friendmeter Ali & Ahmad'); const r = seedNum('f' + p.map(s => s.toLowerCase()).sort().join('|'));
    return `🤝 *DOSTI METER*\n\n${p[0]} 🤝 ${p[1]}\n${U.bar(r, 12)}`;
});
F('mymood', ['moodnow', 'aajkamood'], 'Aaj ka mood', 'fun', '🎭', '.mymood', (c) => `🎭 Aaj ka mood: *${MOODS[seedNum(c.sender + new Date().toDateString(), MOODS.length)]}*`);
F('nickgen', ['nickname', 'nicknamegen'], 'Naam ke liye cool nicknames', 'name', '😎', '.nickgen Ahmad', (c) => {
    const n = (c.q || '').trim().split(/\s+/)[0]; if (!n) throw new Error('Use: .nickgen <naam>'); const s = n.slice(0, 3);
    return `😎 *NICKNAMES*\n\n• ${n}ZX\n• King ${n}\n• ${n}_Official\n• ${s}ster\n• The ${n}\n• ${n}Pro\n• ${s}ie\n• Mr ${n}`;
});
F('emojiart', ['emojiline', 'emojidesign'], 'Text ke saath emoji decoration', 'textfx', '🎀', '.emojiart Ahmad', (c) => { const t = (c.q || '').slice(0, 40); if (!t) throw new Error('Use: .emojiart <text>'); const e = P(['✨', '🔥', '💫', '🌸', '⚡', '👑']); return `${e.repeat(3)}━━━━━━${e.repeat(3)}\n   ${t.toUpperCase()}\n${e.repeat(3)}━━━━━━${e.repeat(3)}`; });
F('flipname', ['mirrortext', 'upsidedown'], 'Text ko upside-down karo', 'textfx', '🙃', '.flipname hello', (c) => {
    const f = { a: 'ɐ', b: 'q', c: 'ɔ', d: 'p', e: 'ǝ', f: 'ɟ', g: 'ƃ', h: 'ɥ', i: 'ᴉ', j: 'ɾ', k: 'ʞ', l: 'l', m: 'ɯ', n: 'u', o: 'o', p: 'd', q: 'b', r: 'ɹ', s: 's', t: 'ʇ', u: 'n', v: 'ʌ', w: 'ʍ', x: 'x', y: 'ʎ', z: 'z', '?': '¿', '!': '¡', '.': '˙', ',': "'" };
    const t = (c.q || '').toLowerCase(); if (!t) throw new Error('Use: .flipname hello'); return [...t].map(ch => f[ch] || ch).reverse().join('');
});
F('botspeed', ['speedtest2', 'pingpro', 'latency'], 'Bot ki speed / ping check', 'main', '⚡', '.botspeed', async (c, x) => {
    const t0 = Date.now(); const sent = await x.conn.sendMessage(c.from, { text: '⚡ Testing...' }, { quoted: x.mek }); const ms = Date.now() - t0; const mem = process.memoryUsage();
    const up = process.uptime(); const h = Math.floor(up / 3600), mi = Math.floor(up % 3600 / 60);
    try { await x.conn.sendMessage(c.from, { text: `⚡ *BOT SPEED*\n\n🏓 Response: *${ms} ms*\n💾 RAM: ${(mem.rss / 1048576).toFixed(0)} MB\n🧠 Heap: ${(mem.heapUsed / 1048576).toFixed(0)} MB\n⏱️ Uptime: ${h}h ${mi}m\n📡 Status: ${ms < 800 ? '🟢 Fast' : ms < 2000 ? '🟡 Normal' : '🔴 Slow'}`, edit: sent.key }); } catch (_) { await c.reply(`⚡ Response: ${ms} ms`); }
});
F('myid', ['whoami', 'mynumber'], 'Aapka WhatsApp number / ID', 'general', '🆔', '.myid', (c) => `🆔 *AAPKI DETAILS*\n\n👤 Naam: ${c.pushname || 'N/A'}\n📱 Number: ${String(c.senderNumber || c.sender || '').split('@')[0]}\n💬 Chat: ${c.isGroup ? 'Group' : 'Private'}\n🎖️ Role: ${c.isOwner ? 'Owner 👑' : c.isAdmins ? 'Admin' : 'Member'}`);
F('adminsall', ['admins', 'groupadmins'], 'Group ke saare admins', 'group', '👑', '.adminsall', async (c, x) => {
    if (!c.isGroup) throw new Error('Yeh command sirf group me chalta hai.'); const md = await x.conn.groupMetadata(c.from); const ad = md.participants.filter(p => p.admin).map(p => p.id);
    await x.conn.sendMessage(c.from, { text: `👑 *ADMINS (${ad.length})*\n\n` + ad.map((j, i) => `${i + 1}. ${U.tag(j)}`).join('\n'), mentions: ad }, { quoted: x.mek });
});
F('membercount', ['groupcount', 'totalmembers'], 'Group me kitne members hain', 'group', '👥', '.membercount', async (c, x) => {
    if (!c.isGroup) throw new Error('Yeh command sirf group me chalta hai.'); const md = await x.conn.groupMetadata(c.from); return `👥 *${md.subject}*\n\nKul members: *${md.participants.length}*\nAdmins: ${md.participants.filter(p => p.admin).length}`;
});
F('randommember', ['luckymember', 'pickmember'], 'Group se random member chuno', 'group', '🎯', '.randommember', async (c, x) => {
    if (!c.isGroup) throw new Error('Yeh command sirf group me chalta hai.'); const md = await x.conn.groupMetadata(c.from); const j = P(md.participants).id;
    await x.conn.sendMessage(c.from, { text: `🎯 Aaj ka lucky member: ${U.tag(j)} 🎉`, mentions: [j] }, { quoted: x.mek });
});
