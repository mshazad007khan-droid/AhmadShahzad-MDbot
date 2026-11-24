// plugins/pro-tools-v10.js — professional utility commands (sab offline, koi API nahi chahiye)
const crypto = require('crypto');
const { cmd } = require('../arslan');
const U = require('../lib/v10util');

function T(pattern, alias, desc, category, react, use, fn) {
    cmd({ pattern, alias: (alias || []).filter(a => !require('../arslan').findCommand(a)), desc, category, react, use, filename: __filename }, async (conn, mek, m, ctx) => {
        try {
            const out = await fn(ctx, { conn, mek, m });
            if (typeof out === 'string' && out) await ctx.reply(out);
        } catch (e) { await ctx.reply('❌ ' + String(e.message || e).slice(0, 200)); }
    });
}
const text = (ctx, m) => String(ctx.q || (ctx.m && ctx.m.quoted && ctx.m.quoted.text) || '').trim();
const need = (v, usage) => { if (!v) throw new Error('Use: ' + usage); return v; };
const num = (v) => { const n = parseFloat(String(v).replace(/,/g, '')); if (!Number.isFinite(n)) throw new Error('Number sahi likho.'); return n; };
const fmt = (n, d = 2) => Number(n).toLocaleString('en-US', { maximumFractionDigits: d });
const body = (ctx, m) => String(ctx.q || (m && m.quoted && m.quoted.text) || '').trim();

T('wordcount', ['wc', 'countwords', 'textstats'], 'Text ke words / characters / lines ginti', 'tools', '🔢', '.wordcount <text>', (c, x) => {
    const t = need(body(c, x.m), '.wordcount <text> (ya reply)');
    const words = t.split(/\s+/).filter(Boolean).length;
    return `🔢 *TEXT STATS*\n\n📝 Words: ${words}\n🔤 Characters: ${t.length}\n🔡 Without spaces: ${t.replace(/\s/g, '').length}\n📄 Lines: ${t.split('\n').length}\n⏱️ Padhne ka waqt: ~${Math.max(1, Math.round(words / 200))} min`;
});
T('reversetext', ['textreverse', 'fliptext'], 'Text ulta karo', 'textfx', '🔄', '.reversetext <text>', (c, x) => [...need(body(c, x.m), '.reversetext <text>')].reverse().join(''));
T('ispalindrome', ['palindrome', 'checkpalindrome'], 'Check karo palindrome hai ya nahi', 'tools', '🪞', '.ispalindrome <text>', (c, x) => {
    const t = need(body(c, x.m), '.ispalindrome level'); const s = t.toLowerCase().replace(/[^a-z0-9؀-ۿ]/g, '');
    return s === [...s].reverse().join('') ? `✅ "${t}" palindrome hai!` : `❌ "${t}" palindrome nahi hai.`;
});
const words = (t) => t.replace(/[_\-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim().split(/\s+/).filter(Boolean);

T('bmi', ['bmicalc', 'bodymass'], 'BMI calculator (kg aur cm)', 'calc', '⚖️', '.bmi 70 175', (c) => {
    const w = num(c.args[0]), h = num(c.args[1]) / 100; if (w <= 0 || h <= 0) throw new Error('Use: .bmi <kg> <cm>');
    const b = w / (h * h); const s = b < 18.5 ? 'Underweight' : b < 25 ? 'Normal ✅' : b < 30 ? 'Overweight' : 'Obese';
    return `⚖️ *BMI*\n\nWazan: ${w} kg\nQad: ${h * 100} cm\n📊 BMI: *${b.toFixed(1)}*\n🏷️ ${s}\n\n_Yeh sirf andaza hai, doctor se mashwara lo._`;
});
const ZONES = { karachi: 'Asia/Karachi', lahore: 'Asia/Karachi', islamabad: 'Asia/Karachi', dubai: 'Asia/Dubai', makkah: 'Asia/Riyadh', riyadh: 'Asia/Riyadh', london: 'Europe/London', paris: 'Europe/Paris', istanbul: 'Europe/Istanbul', newyork: 'America/New_York', losangeles: 'America/Los_Angeles', toronto: 'America/Toronto', delhi: 'Asia/Kolkata', dhaka: 'Asia/Dhaka', tokyo: 'Asia/Tokyo', sydney: 'Australia/Sydney', beijing: 'Asia/Shanghai', moscow: 'Europe/Moscow', cairo: 'Africa/Cairo', singapore: 'Asia/Singapore' };
T('discountcalc', ['sale', 'offprice'], 'Discount ke baad qeemat', 'calc', '🏷️', '.discountcalc 5000 25', (c) => {
    const p = num(c.args[0]), d = num(c.args[1]); return `🏷️ *DISCOUNT*\n\nAsal qeemat: ${fmt(p)}\nDiscount: ${d}%\n💸 Bachat: ${fmt(p * d / 100)}\n✅ Final: *${fmt(p - p * d / 100)}*`;
});
T('billsplitpro', ['tipcalc', 'billsplit'], 'Bill + tip ko logon me taqseem', 'calc', '🧾', '.billsplitpro 4500 5 10  (bill, log, tip%)', (c) => {
    const b = num(c.args[0]), n = Math.max(1, Math.round(num(c.args[1] || 1))), t = c.args[2] ? num(c.args[2]) : 0; const tot = b * (1 + t / 100);
    return `🧾 *SPLIT BILL*\n\nBill: ${fmt(b)}\nTip: ${t}%\nKul: ${fmt(tot)}\n👥 ${n} log\n💳 Har ek: *${fmt(tot / n)}*`;
});
T('avgcalc', ['average', 'mean', 'stats'], 'Numbers ka average / median / sum', 'calc', '📊', '.avgcalc 10 20 30', (c) => {
    const a = c.args.map(x => parseFloat(x)).filter(Number.isFinite); if (!a.length) throw new Error('Use: .avgcalc 10 20 30');
    const s = [...a].sort((x, y) => x - y), sum = a.reduce((p, q) => p + q, 0), mid = s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
    return `📊 *STATS*\n\nGintii: ${a.length}\nSum: ${fmt(sum, 4)}\nAverage: ${fmt(sum / a.length, 4)}\nMedian: ${fmt(mid, 4)}\nMin: ${s[0]}  Max: ${s[s.length - 1]}`;
});
T('primechk', ['primecheck', 'prime'], 'Prime number check', 'calc', '🔢', '.primechk 97', (c) => {
    const n = Math.floor(num(c.args[0])); if (n > 1e12) throw new Error('Number 1 trillion se chhota do.');
    let p = n > 1; for (let i = 2; i * i <= n && p; i++) if (n % i === 0) p = false; return p ? `✅ ${n} prime number hai.` : `❌ ${n} prime nahi hai.`;
});
T('fibseq', ['fib', 'fibseries'], 'Fibonacci series', 'calc', '🌀', '.fibseq 10', (c) => {
    const n = Math.min(60, Math.max(1, Math.floor(num(c.args[0] || 10)))); const a = [0, 1]; while (a.length < n) a.push(a[a.length - 1] + a[a.length - 2]); return `🌀 *FIBONACCI (${n})*\n\n${a.slice(0, n).join(', ')}`;
});
T('gcdlcm', ['hcf', 'lcm', 'gcd'], 'GCD (HCF) aur LCM', 'calc', '➗', '.gcdlcm 12 18', (c) => {
    const a = Math.abs(Math.floor(num(c.args[0]))), b = Math.abs(Math.floor(num(c.args[1]))); const g = (x, y) => y ? g(y, x % y) : x; const G = g(a, b);
    return `➗ *GCD / LCM*\n\nGCD (HCF): *${G}*\nLCM: *${G ? a / G * b : 0}*`;
});
T('hashtext', ['hash', 'checksum'], 'Text ka MD5 / SHA1 / SHA256 hash', 'tools', '#️⃣', '.hashtext hello', (c, x) => {
    const t = need(body(c, x.m), '.hashtext <text>'); const h = (a) => crypto.createHash(a).update(t).digest('hex');
    return `#️⃣ *HASH*\n\nMD5:\n${h('md5')}\n\nSHA1:\n${h('sha1')}\n\nSHA256:\n${h('sha256')}`;
});
T('texttohex', ['hexenc', 'tohex'], 'Text ko hex me badlo', 'tools', '🔣', '.texttohex hello', (c, x) => Buffer.from(need(body(c, x.m), '.texttohex hello'), 'utf8').toString('hex'));
T('hextotext', ['hexdec', 'fromhex'], 'Hex ko text me badlo', 'tools', '🔣', '.hextotext 68656c6c6f', (c) => { const h = need(c.args.join('').replace(/\s/g, ''), '.hextotext 68656c6c6f'); if (!/^[0-9a-f]+$/i.test(h) || h.length % 2) throw new Error('Hex sahi nahi hai.'); return Buffer.from(h, 'hex').toString('utf8'); });
T('texttobinary', ['binenc', 'tobinary'], 'Text ko binary me badlo', 'tools', '💻', '.texttobinary Hi', (c, x) => [...Buffer.from(need(body(c, x.m), '.texttobinary Hi'), 'utf8')].map(b => b.toString(2).padStart(8, '0')).join(' '));
T('binarytotext', ['bindec', 'frombinary'], 'Binary ko text me badlo', 'tools', '💻', '.binarytotext 01001000 01101001', (c) => { const p = c.args.join(' ').trim().split(/\s+/); if (!p.every(b => /^[01]{8}$/.test(b))) throw new Error('8-bit binary groups do.'); return Buffer.from(p.map(b => parseInt(b, 2))).toString('utf8'); });
const MORSE = { a: '.-', b: '-...', c: '-.-.', d: '-..', e: '.', f: '..-.', g: '--.', h: '....', i: '..', j: '.---', k: '-.-', l: '.-..', m: '--', n: '-.', o: '---', p: '.--.', q: '--.-', r: '.-.', s: '...', t: '-', u: '..-', v: '...-', w: '.--', x: '-..-', y: '-.--', z: '--..', 0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.' };
const MR = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));
T('morsecode', ['morse', 'tomorse'], 'Text <-> Morse code', 'tools', '📡', '.morsecode sos', (c, x) => {
    const t = need(body(c, x.m), '.morsecode sos').toLowerCase();
    return /^[.\-\s/]+$/.test(t) ? t.split(' / ').map(w => w.trim().split(/\s+/).map(s => MR[s] || '?').join('')).join(' ') : t.split('').map(ch => ch === ' ' ? '/' : MORSE[ch] || '').filter(Boolean).join(' ');
});
T('romannum', ['romannumber', 'toroman'], 'Number <-> Roman numeral', 'calc', '🏛️', '.romannum 2026', (c) => {
    const a = String(c.args[0] || '').toUpperCase(); const V = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    if (/^[MDCLXVI]+$/.test(a)) { const mp = { M: 1000, D: 500, C: 100, L: 50, X: 10, V: 5, I: 1 }; let t = 0; for (let i = 0; i < a.length; i++) t += (mp[a[i + 1]] > mp[a[i]]) ? -mp[a[i]] : mp[a[i]]; return `🏛️ ${a} = *${t}*`; }
    let n = Math.floor(num(a)); if (n < 1 || n > 3999) throw new Error('1 se 3999 tak number do.'); const o = n; let r = ''; for (const [v, s] of V) while (n >= v) { r += s; n -= v; } return `🏛️ ${o} = *${r}*`;
});
const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'], TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const toWords = (n) => n === 0 ? 'zero' : n < 20 ? ONES[n] : n < 100 ? TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '') : n < 1e3 ? ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + toWords(n % 100) : '') : n < 1e6 ? toWords(Math.floor(n / 1e3)) + ' thousand' + (n % 1e3 ? ' ' + toWords(n % 1e3) : '') : n < 1e9 ? toWords(Math.floor(n / 1e6)) + ' million' + (n % 1e6 ? ' ' + toWords(n % 1e6) : '') : toWords(Math.floor(n / 1e9)) + ' billion' + (n % 1e9 ? ' ' + toWords(n % 1e9) : '');
T('numwords', ['numtoword', 'numberwords', 'spellnumber'], 'Number ko English words me likho', 'calc', '🔤', '.numwords 12345', (c) => { const n = Math.floor(num(c.args[0])); if (n < 0 || n > 999999999999) throw new Error('0 se 999 billion tak.'); return `🔤 ${fmt(n, 0)} = *${toWords(n)}*`; });
T('passmaker', ['passgen', 'makepassword'], 'Random strong password banao', 'tools', '🔐', '.passmaker 14', (c) => {
    const len = Math.min(64, Math.max(6, parseInt(c.args[0], 10) || 12)); const set = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$%&*';
    return `🔐 *PASSWORD*\n\n\`${Array.from(crypto.randomBytes(len), b => set[b % set.length]).join('')}\``;
});
T('uuidgen', ['uuid', 'guid'], 'UUID generate karo', 'tools', '🆔', '.uuidgen', () => `🆔 \`${crypto.randomUUID()}\``);
T('jsonpretty', ['jsonformat', 'prettyjson'], 'JSON ko sundar format karo', 'tools', '🧩', '.jsonpretty {"a":1}', (c, x) => { const t = need(body(c, x.m), '.jsonpretty {"a":1}'); try { return '```' + JSON.stringify(JSON.parse(t), null, 2).slice(0, 3500) + '```'; } catch (_) { throw new Error('JSON sahi nahi hai.'); } });
T('urlencode', ['encodeurl', 'urlenc'], 'Text ko URL-encode karo', 'tools', '🌐', '.urlencode hello world', (c, x) => encodeURIComponent(need(body(c, x.m), '.urlencode hello world')));
T('urldecode', ['decodeurl', 'urldec'], 'URL-encoded text kholo', 'tools', '🌐', '.urldecode hello%20world', (c, x) => { try { return decodeURIComponent(need(body(c, x.m), '.urldecode hello%20world')); } catch (_) { throw new Error('Text sahi encoded nahi hai.'); } });
T('colorinfo', ['hexcolor', 'colorcode'], 'Hex color ki RGB / HSL details', 'tools', '🎨', '.colorinfo #ff5733', (c) => {
    const h = String(c.args[0] || '').replace('#', ''); if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h)) throw new Error('Use: .colorinfo #ff5733');
    const f = h.length === 3 ? h.split('').map(x => x + x).join('') : h; const r = parseInt(f.slice(0, 2), 16), g = parseInt(f.slice(2, 4), 16), b = parseInt(f.slice(4, 6), 16);
    const mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255, l = (mx + mn) / 2, d = mx - mn; let hh = 0;
    if (d) { hh = mx === r / 255 ? ((g - b) / 255 / d) % 6 : mx === g / 255 ? (b - r) / 255 / d + 2 : (r - g) / 255 / d + 4; hh = Math.round(hh * 60); if (hh < 0) hh += 360; }
    const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0; return `🎨 *#${f.toUpperCase()}*\n\nRGB: ${r}, ${g}, ${b}\nHSL: ${hh}°, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`;
});
T('colorpick', ['randcolor', 'colorgen'], 'Random color code', 'tools', '🌈', '.colorpick', () => { const h = crypto.randomBytes(3).toString('hex'); return `🌈 Random color: *#${h.toUpperCase()}*\nRGB: ${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}`; });
T('loremtext', ['loremipsum', 'dummytext'], 'Dummy (lorem ipsum) text', 'tools', '📃', '.loremtext 3', (c) => {
    const w = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim minim veniam quis nostrud exercitation ullamco laboris nisi aliquip commodo consequat'.split(' ');
    const n = Math.min(6, Math.max(1, parseInt(c.args[0], 10) || 2)); return Array.from({ length: n }, () => { const s = Array.from({ length: U.rnd(18, 32) }, () => U.pick(w)).join(' '); return s[0].toUpperCase() + s.slice(1) + '.'; }).join('\n\n');
});
T('numrand', ['randomnumber', 'rnum'], 'Random number (min max)', 'tools', '🎲', '.numrand 1 100', (c) => { const a = Math.floor(num(c.args[0] || 1)), b = Math.floor(num(c.args[1] || 100)); return `🎲 Random (${Math.min(a, b)}–${Math.max(a, b)}): *${U.rnd(Math.min(a, b), Math.max(a, b))}*`; });
T('sortlines', ['sortlist', 'sorttext'], 'Lines ko A-Z sort karo', 'tools', '🔡', '.sortlines (alag lines)', (c, x) => need(body(c, x.m), '.sortlines (multi-line text)').split('\n').map(s => s.trim()).filter(Boolean).sort((a, b) => a.localeCompare(b)).join('\n'));
T('uniquelines', ['dedupe', 'removedupes'], 'Duplicate lines hatao', 'tools', '🧹', '.uniquelines (multi-line)', (c, x) => [...new Set(need(body(c, x.m), '.uniquelines (multi-line text)').split('\n').map(s => s.trim()).filter(Boolean))].join('\n'));
T('shufflelist', ['shuffle', 'randomorder'], 'List ko mix karo (comma ya line)', 'tools', '🔀', '.shufflelist a, b, c', (c, x) => { const a = need(body(c, x.m), '.shufflelist a, b, c').split(/[,\n]/).map(s => s.trim()).filter(Boolean); for (let i = a.length - 1; i > 0; i--) { const j = U.rnd(0, i);[a[i], a[j]] = [a[j], a[i]]; } return '🔀 ' + a.join(', '); });
T('chooseone', ['pickone', 'decide', 'choosefor'], 'Options me se ek chuno (a | b | c)', 'tools', '🎯', '.chooseone pizza | biryani | burger', (c, x) => { const a = need(body(c, x.m), '.chooseone a | b | c').split(/\||,/).map(s => s.trim()).filter(Boolean); if (a.length < 2) throw new Error('Kam az kam 2 options do.'); return `🎯 Mera faisla: *${U.pick(a)}*`; });
T('unixtime', ['timestamp', 'epoch'], 'Unix timestamp <-> date', 'tools', '🕰️', '.unixtime 1700000000', (c) => {
    const a = c.args[0]; if (!a) return `🕰️ Abhi: *${Math.floor(Date.now() / 1000)}*\n${new Date().toISOString()}`;
    const n = Number(a); if (Number.isFinite(n)) return `🕰️ ${n} = ${new Date((n < 1e12 ? n * 1000 : n)).toUTCString()}`;
    const d = new Date(c.args.join(' ')); if (isNaN(d)) throw new Error('Date samajh nahi aayi.'); return `🕰️ ${d.toISOString()} = *${Math.floor(d / 1000)}*`;
});
