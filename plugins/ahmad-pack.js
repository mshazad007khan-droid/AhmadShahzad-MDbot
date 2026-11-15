// 𝐀𝐡𝐦𝐚𝐝𝐒𝐡𝐚𝐡𝐳𝐚𝐝-𝐌𝐃 — AHMAD PACK: 80+ offline commands (no API key / no internet needed)
// Categories: textfx · calc · funzone
const crypto = require('crypto');
const { cmd } = require('../arslan');
const config = require('../config');

const P = () => config.PREFIX || '.';
const BOT = () => config.BOT_NAME || 'AhmadShahzad-MD';
class Usage extends Error {}
const usage = (s) => { throw new Usage(s); };
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const fmt = (n, d = 2) => Number(n).toLocaleString('en-US', { maximumFractionDigits: d });
const box = (title, lines) => `╭━━〔 ${title} 〕━━⬣\n${lines.map(l => '┃ ' + l).join('\n')}\n╰━━━━━━━━━━━━━⬣\n> ${config.BOT_FOOTER || '©' + BOT()}`;
const nums = (q) => (String(q).match(/-?\d+(?:\.\d+)?/g) || []).map(Number);

// def(name, {alias, desc, cat, use, react, need}, fn(q, ctx, conn, mek) => string)
function def(pattern, o, fn) {
  cmd({ pattern, alias: o.alias || [], desc: o.desc, category: o.cat, use: o.use || `.${pattern}`, react: o.react || '✨', filename: __filename },
    async (conn, mek, m, ctx) => {
      const q = String((ctx && ctx.q) || '').trim();
      try {
        if (o.need && !q) usage(o.use || `${P()}${pattern}`);
        const out = await fn(q, ctx, conn, mek);
        if (out) await ctx.reply(out);
      } catch (e) {
        if (e instanceof Usage) return ctx.reply(`📝 *Use:* ${String(e.message).replace(/^\./, P())}`);
        console.error(`[ahmad-pack:${pattern}]`, e.message);
        return ctx.reply('❌ Is command mein masla aaya, input check karke dobara try karein.');
      }
    });
}

// ───────────────────────── helpers ─────────────────────────
const ONES = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const TENS = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
function below1000(n) {
  let s = '';
  if (n >= 100) { s += ONES[Math.floor(n / 100)] + ' hundred'; n %= 100; if (n) s += ' and '; }
  if (n >= 20) { s += TENS[Math.floor(n / 10)]; if (n % 10) s += '-' + ONES[n % 10]; }
  else if (n > 0 || !s) s += ONES[n];
  return s;
}
function numWords(n) {
  if (n === 0) return 'zero';
  const units = [[1e9, 'billion'], [1e6, 'million'], [1e3, 'thousand']];
  let out = []; 
  for (const [v, name] of units) { if (n >= v) { out.push(below1000(Math.floor(n / v)) + ' ' + name); n %= v; } }
  if (n > 0) out.push(below1000(n));
  return out.join(' ');
}
const ROMAN = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
const toRoman = (n) => { let s = ''; for (const [v, r] of ROMAN) while (n >= v) { s += r; n -= v; } return s; };
const fromRoman = (s) => { const map = { I:1,V:5,X:10,L:50,C:100,D:500,M:1000 }; let t = 0; s = s.toUpperCase();
  for (let i = 0; i < s.length; i++) { const a = map[s[i]], b = map[s[i + 1]]; if (!a) return null; t += b > a ? -a : a; } return toRoman(t) === s ? t : null; };
const MORSE = { a:'.-',b:'-...',c:'-.-.',d:'-..',e:'.',f:'..-.',g:'--.',h:'....',i:'..',j:'.---',k:'-.-',l:'.-..',m:'--',n:'-.',o:'---',p:'.--.',q:'--.-',r:'.-.',s:'...',t:'-',u:'..-',v:'...-',w:'.--',x:'-..-',y:'-.--',z:'--..',0:'-----',1:'.----',2:'..---',3:'...--',4:'....-',5:'.....',6:'-....',7:'--...',8:'---..',9:'----.' };
const UNMORSE = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));
const SMALL = { a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',q:'ǫ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ' };
function parseDate(s) {
  let m = String(s).match(/(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/), y, mo, d;
  if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else if ((m = String(s).match(/(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/))) { d = +m[1]; mo = +m[2]; y = +m[3]; }
  else return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d ? dt : null;
}
const todayUTC = () => { const n = new Date(); return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())); };
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const dFmt = (d) => `${d.getUTCDate()}-${d.getUTCMonth() + 1}-${d.getUTCFullYear()}`;
function convert(q, table, usageText, title) {
  const m = q.toLowerCase().replace(/,/g, '').match(/^(-?\d+(?:\.\d+)?)\s*([a-z\/]+)$/);
  if (!m) usage(usageText);
  const val = +m[1], u = m[2];
  if (!(u in table)) usage(`${usageText}\nUnits: ${Object.keys(table).join(', ')}`);
  const base = val * table[u];
  const rows = Object.keys(table).filter(k => k !== u).map(k => `${k.padEnd(5)} ➜ ${fmt(base / table[k], 6)}`);
  return box(title, [`${fmt(val, 6)} ${u} =`, ...rows]);
}
const LEN = { mm: .001, cm: .01, m: 1, km: 1000, in: .0254, ft: .3048, yd: .9144, mi: 1609.344 };
const WGT = { mg: 1e-6, g: .001, kg: 1, lb: .45359237, oz: .028349523125, ton: 1000 };
const SPD = { 'm/s': 1, 'km/h': 1 / 3.6, mph: .44704, knot: .514444 };
const SIZ = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3, tb: 1024 ** 4 };

// ───────────────────────── TEXT FX ─────────────────────────
const T = { cat: 'textfx', need: true };
def('mock', { ...T, desc: 'sPoNgEbOb mocking text', use: '.mock <text>', react: '🤪' }, q => [...q].map((c, i) => i % 2 ? c.toUpperCase() : c.toLowerCase()).join(''));
def('clap', { ...T, desc: 'Put 👏 between words', use: '.clap <text>', react: '👏' }, q => q.split(/\s+/).join(' 👏 ') + ' 👏');
def('vowels', { ...T, desc: 'Count vowels, consonants, digits', use: '.vowels <text>', react: '🔤' }, q => {
  const v = (q.match(/[aeiou]/gi) || []).length, l = (q.match(/[a-z]/gi) || []).length, d = (q.match(/\d/g) || []).length;
  return box('VOWEL COUNTER', [`🅰️ Vowels: ${v}`, `🔡 Consonants: ${l - v}`, `🔢 Digits: ${d}`, `␣ Spaces: ${(q.match(/\s/g) || []).length}`]);
});
def('titlecase', { ...T, desc: 'Convert To Title Case', use: '.titlecase <text>', react: '🔠' }, q => q.toLowerCase().replace(/(^|\s)(\S)/g, (_, a, b) => a + b.toUpperCase()));
const words = (q) => q.toLowerCase().replace(/[^a-z0-9\s_-]/g, ' ').split(/[\s_-]+/).filter(Boolean);
def('snakecase', { ...T, desc: 'text to snake_case', use: '.snakecase <text>', react: '🐍' }, q => words(q).join('_'));
def('camelcase', { ...T, desc: 'text to camelCase', use: '.camelcase <text>', react: '🐫' }, q => words(q).map((w, i) => i ? w[0].toUpperCase() + w.slice(1) : w).join(''));
def('kebabcase', { ...T, desc: 'text to kebab-case', use: '.kebabcase <text>', react: '🥙' }, q => words(q).join('-'));
def('slugify', { ...T, desc: 'Make a URL-friendly slug', use: '.slugify <text>', react: '🔗' }, q => words(q).join('-') || usage('.slugify My Post Title'));
def('ispalin', { ...T, desc: 'Check if text is a palindrome', use: '.ispalin <text>', react: '🪞' }, q => {
  const s = q.toLowerCase().replace(/[^a-z0-9]/g, ''); if (!s) usage('.ispalin madam');
  return s === [...s].reverse().join('') ? `✅ *"${q}"* palindrome hai!` : `❌ *"${q}"* palindrome nahi hai.`;
});
def('repeat', { ...T, desc: 'Repeat text N times', use: '.repeat 3 hello', react: '🔁' }, q => {
  const m = q.match(/^(\d{1,3})\s+([\s\S]+)$/); if (!m) usage('.repeat 3 hello');
  return Array(Math.min(+m[1], 50)).fill(m[2]).join('\n').slice(0, 3000);
});
def('leet', { ...T, desc: 'Text to l33t speak', use: '.leet <text>', react: '👾' }, q => q.replace(/[aeiostl]/gi, c => ({ a:'4',e:'3',i:'1',o:'0',s:'5',t:'7',l:'1' })[c.toLowerCase()]));
def('tomorse', { ...T, desc: 'Text to Morse code', use: '.tomorse <text>', react: '📡' }, q => q.toLowerCase().split('').map(c => c === ' ' ? '/' : (MORSE[c] || '')).filter(Boolean).join(' '));
def('unmorse', { ...T, desc: 'Morse code to text', use: '.unmorse .... .. (use / for space)', react: '📟' }, q => q.trim().split(/\s+/).map(c => c === '/' ? ' ' : (UNMORSE[c] || '?')).join(''));
def('rot13', { ...T, desc: 'ROT13 encode/decode', use: '.rot13 <text>', react: '🔐' }, q => q.replace(/[a-z]/gi, c => String.fromCharCode((c <= 'Z' ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26)));
def('caesar', { ...T, desc: 'Caesar cipher (shift)', use: '.caesar 3 hello', react: '🗝️' }, q => {
  const m = q.match(/^(-?\d+)\s+([\s\S]+)$/); if (!m) usage('.caesar 3 hello');
  const k = ((+m[1] % 26) + 26) % 26;
  return m[2].replace(/[a-z]/gi, c => { const b = c <= 'Z' ? 65 : 97; return String.fromCharCode((c.charCodeAt(0) - b + k) % 26 + b); });
});
def('flipwords', { ...T, desc: 'Reverse word order', use: '.flipwords <text>', react: '↔️' }, q => q.split(/\s+/).reverse().join(' '));
def('shout', { ...T, desc: 'LOUD text', use: '.shout <text>', react: '📢' }, q => `📢 ${q.toUpperCase()}!!!`);
def('smallcaps', { ...T, desc: 'ꜱᴍᴀʟʟ ᴄᴀᴘꜱ text', use: '.smallcaps <text>', react: '🔡' }, q => [...q.toLowerCase()].map(c => SMALL[c] || c).join(''));
def('acronym', { ...T, desc: 'Make acronym from words', use: '.acronym Portable Network Graphics', react: '🔣' }, q => q.split(/\s+/).map(w => w[0].toUpperCase()).join(''));
def('chars', { ...T, desc: 'Count characters', use: '.chars <text>', react: '#️⃣' }, q => box('CHARACTERS', [`Total: ${[...q].length}`, `Without spaces: ${q.replace(/\s/g, '').length}`, `Words: ${q.split(/\s+/).length}`, `Lines: ${q.split('\n').length}`]));
def('sortwords', { ...T, desc: 'Sort words A-Z', use: '.sortwords pear apple fig', react: '🔽' }, q => q.split(/\s+/).sort((a, b) => a.localeCompare(b)).join(' '));
def('uniquewords', { ...T, desc: 'Remove duplicate words', use: '.uniquewords a b a c', react: '🧹' }, q => [...new Set(q.split(/\s+/))].join(' '));
def('nospaces', { ...T, desc: 'Remove all spaces', use: '.nospaces <text>', react: '✂️' }, q => q.replace(/\s+/g, ''));
def('num2words', { ...T, desc: 'Number to English words', use: '.num2words 1250', react: '🔢' }, q => {
  const n = Number(q.replace(/,/g, '')); if (!Number.isInteger(n) || n < 0 || n > 999999999999) usage('.num2words 1250 (0 - 999999999999)');
  return `🔢 ${fmt(n, 0)}\n📝 ${numWords(n)}`;
});
def('roman', { ...T, desc: 'Number to Roman numeral', use: '.roman 2024', react: '🏛️' }, q => { const n = +q; if (!Number.isInteger(n) || n < 1 || n > 3999) usage('.roman 2024 (1-3999)'); return `🏛️ ${n} = *${toRoman(n)}*`; });
def('unroman', { ...T, desc: 'Roman numeral to number', use: '.unroman MMXXIV', react: '🏛️' }, q => { const n = fromRoman(q.trim()); if (!n) usage('.unroman MMXXIV'); return `🏛️ ${q.toUpperCase()} = *${n}*`; });
def('hash', { ...T, desc: 'MD5 / SHA1 / SHA256 of text', use: '.hash <text>', react: '🧬' }, q =>
  box('HASH', ['md5:', crypto.createHash('md5').update(q).digest('hex'), 'sha1:', crypto.createHash('sha1').update(q).digest('hex'), 'sha256:', crypto.createHash('sha256').update(q).digest('hex')]));
def('uuid', { cat: 'textfx', desc: 'Generate random UUIDs', use: '.uuid', react: '🆔' }, () => `🆔 ${crypto.randomUUID()}\n🆔 ${crypto.randomUUID()}`);
def('lorem', { cat: 'textfx', desc: 'Lorem ipsum filler text', use: '.lorem 3', react: '📃' }, q => {
  const w = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim minim veniam quis nostrud'.split(' ');
  const n = Math.min(Math.max(parseInt(q) || 2, 1), 6);
  return Array.from({ length: n }, () => { const s = Array.from({ length: ri(12, 22) }, () => pick(w)).join(' '); return s[0].toUpperCase() + s.slice(1) + '.'; }).join('\n\n');
});
def('randcolor', { cat: 'textfx', desc: 'Random color (HEX + RGB)', use: '.randcolor', react: '🎨' }, () => {
  const r = ri(0, 255), g = ri(0, 255), b = ri(0, 255);
  return box('RANDOM COLOR', [`HEX: #${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase()}`, `RGB: ${r}, ${g}, ${b}`]);
});
def('hex2rgb', { ...T, desc: 'HEX color to RGB', use: '.hex2rgb #1e90ff', react: '🌈' }, q => {
  let h = q.replace('#', '').trim(); if (h.length === 3) h = [...h].map(c => c + c).join(''); if (!/^[0-9a-f]{6}$/i.test(h)) usage('.hex2rgb #1e90ff');
  return `🌈 #${h.toUpperCase()} = rgb(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)})`;
});
def('words', { ...T, desc: 'Count words in text', use: '.words <text>', react: '📖' }, q => `📖 Words: *${q.split(/\s+/).length}*`);
def('flipstr', { ...T, desc: 'Reverse a text', use: '.flipstr <text>', react: '🔄' }, q => [...q].reverse().join(''));
def('tobinary', { ...T, desc: 'Text to binary', use: '.tobinary <text>', react: '0️⃣' }, q => [...Buffer.from(q)].map(b => b.toString(2).padStart(8, '0')).join(' ').slice(0, 3000));
def('frombinary', { ...T, desc: 'Binary to text', use: '.frombinary 01001000 01101001', react: '1️⃣' }, q => {
  const parts = q.trim().split(/\s+/); if (!parts.every(p => /^[01]{8}$/.test(p))) usage('.frombinary 01001000 01101001');
  return Buffer.from(parts.map(p => parseInt(p, 2))).toString('utf8');
});

// ───────────────────────── CALCULATORS & CONVERTERS ─────────────────────────
const C = { cat: 'calc', need: true };
def('percent', { ...C, desc: 'Percentage calculator', use: '.percent 20 of 500', react: '％' }, q => {
  const [a, b] = nums(q); if (a === undefined || b === undefined) usage('.percent 20 of 500');
  return box('PERCENT', [`${a}% of ${fmt(b)} = *${fmt(a * b / 100)}*`, `${fmt(a)} is ${fmt(a / b * 100)}% of ${fmt(b)}`]);
});
def('discount', { ...C, desc: 'Price after discount', use: '.discount 2500 20', react: '🏷️' }, q => {
  const [p, d] = nums(q); if (p === undefined || d === undefined) usage('.discount 2500 20 (price, % off)');
  return box('DISCOUNT', [`Price: ${fmt(p)}`, `Discount: ${d}% = ${fmt(p * d / 100)}`, `You pay: *${fmt(p - p * d / 100)}*`]);
});
def('emi', { ...C, desc: 'Loan EMI calculator', use: '.emi 500000 12 24 (amount, yearly %, months)', react: '🏦' }, q => {
  const [p, rate, n] = nums(q); if (!p || rate === undefined || !n) usage('.emi 500000 12 24 (amount, yearly %, months)');
  const r = rate / 1200, emi = r === 0 ? p / n : p * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  return box('EMI', [`Loan: ${fmt(p)}`, `Rate: ${rate}% / year`, `Months: ${n}`, `Monthly EMI: *${fmt(emi)}*`, `Total pay: ${fmt(emi * n)}`, `Interest: ${fmt(emi * n - p)}`]);
});
def('tip', { ...C, desc: 'Tip calculator', use: '.tip 4000 10', react: '💵' }, q => {
  const [b, t = 10] = nums(q); if (b === undefined) usage('.tip 4000 10');
  return box('TIP', [`Bill: ${fmt(b)}`, `Tip ${t}%: ${fmt(b * t / 100)}`, `Total: *${fmt(b + b * t / 100)}*`]);
});
def('splitbill', { ...C, desc: 'Split bill between people', use: '.splitbill 6000 4', react: '🍕' }, q => {
  const [t, n] = nums(q); if (!t || !n || n < 1) usage('.splitbill 6000 4');
  return `🍕 ${fmt(t)} ÷ ${n} = *${fmt(t / n)}* per person`;
});
def('bmiindex', { ...C, desc: 'BMI from kg and cm', use: '.bmiindex 70 175', react: '⚖️' }, q => {
  const [kg, cm] = nums(q); if (!kg || !cm || cm < 50) usage('.bmiindex 70 175 (kg, cm)');
  const b = kg / Math.pow(cm / 100, 2), c = b < 18.5 ? 'Underweight' : b < 25 ? 'Normal' : b < 30 ? 'Overweight' : 'Obese';
  return box('BMI', [`Weight: ${kg} kg`, `Height: ${cm} cm`, `BMI: *${b.toFixed(1)}*`, `Category: ${c}`]);
});
def('myage', { ...C, desc: 'Exact age from birth date', use: '.myage 2003-05-21', react: '🎂' }, q => {
  const b = parseDate(q), t = todayUTC(); if (!b || b > t) usage('.myage 2003-05-21 (YYYY-MM-DD or DD-MM-YYYY)');
  let y = t.getUTCFullYear() - b.getUTCFullYear(), mo = t.getUTCMonth() - b.getUTCMonth(), d = t.getUTCDate() - b.getUTCDate();
  if (d < 0) { mo--; d += new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 0)).getUTCDate(); }
  if (mo < 0) { y--; mo += 12; }
  let nb = new Date(Date.UTC(t.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate())); if (nb < t) nb = new Date(Date.UTC(t.getUTCFullYear() + 1, b.getUTCMonth(), b.getUTCDate()));
  return box('AGE', [`🎂 ${y} years, ${mo} months, ${d} days`, `📆 Total days: ${fmt(Math.round((t - b) / 864e5), 0)}`, `🎉 Next birthday in ${Math.round((nb - t) / 864e5)} days`]);
});
def('daysbetween', { ...C, desc: 'Days between two dates', use: '.daysbetween 2025-01-01 2025-12-31', react: '📅' }, q => {
  const ds = (q.match(/\d{1,4}[-\/.]\d{1,2}[-\/.]\d{1,4}/g) || []).map(parseDate); if (ds.length < 2 || ds.includes(null)) usage('.daysbetween 2025-01-01 2025-12-31');
  const n = Math.round(Math.abs(ds[1] - ds[0]) / 864e5); return `📅 ${dFmt(ds[0])} ➜ ${dFmt(ds[1])}\n⏳ *${n}* days (${(n / 7).toFixed(1)} weeks)`;
});
def('dayofweek', { ...C, desc: 'Which weekday is a date', use: '.dayofweek 2026-08-14', react: '🗓️' }, q => { const d = parseDate(q); if (!d) usage('.dayofweek 2026-08-14'); return `🗓️ ${dFmt(d)} = *${DAYS[d.getUTCDay()]}*`; });
def('daysleft', { ...C, desc: 'Days left until a date', use: '.daysleft 2026-12-31', react: '⏳' }, q => {
  const d = parseDate(q); if (!d) usage('.daysleft 2026-12-31'); const n = Math.round((d - todayUTC()) / 864e5);
  return n >= 0 ? `⏳ ${dFmt(d)} mein abhi *${n}* din baqi hain.` : `⌛ ${dFmt(d)} ko *${-n}* din guzar chuke hain.`;
});
def('leapyear', { ...C, desc: 'Is it a leap year?', use: '.leapyear 2028', react: '📆' }, q => { const y = parseInt(q); if (!y) usage('.leapyear 2028'); const l = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; return `📆 ${y} ${l ? '✅ leap year hai (366 din)' : '❌ leap year nahi hai (365 din)'}`; });
def('isprime', { ...C, desc: 'Prime number check', use: '.isprime 97', react: '🔟' }, q => {
  const n = +q; if (!Number.isInteger(n) || n < 0 || n > 1e12) usage('.isprime 97');
  let p = n > 1; for (let i = 2; p && i * i <= n; i++) if (n % i === 0) { p = false; var f = i; }
  return p ? `✅ ${n} prime number hai.` : `❌ ${n} prime nahi hai${f ? ` (${f} × ${n / f})` : ''}.`;
});
def('factorial', { ...C, desc: 'Factorial of a number', use: '.factorial 10', react: '❗' }, q => {
  const n = +q; if (!Number.isInteger(n) || n < 0 || n > 100) usage('.factorial 10 (0-100)');
  let r = 1n; for (let i = 2n; i <= BigInt(n); i++) r *= i; const s = r.toString(); return `❗ ${n}! = ${s.length > 300 ? s.slice(0, 300) + '…' : s}`;
});
def('fibonacci', { ...C, desc: 'First N Fibonacci numbers', use: '.fibonacci 12', react: '🐚' }, q => {
  const n = Math.min(Math.max(parseInt(q) || 10, 1), 80); const a = [0n, 1n]; while (a.length < n) a.push(a[a.length - 1] + a[a.length - 2]);
  return `🐚 ${a.slice(0, n).join(', ')}`;
});
const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);
def('gcd', { ...C, desc: 'Greatest common divisor', use: '.gcd 48 18', react: '➗' }, q => { const n = nums(q); if (n.length < 2) usage('.gcd 48 18'); return `➗ GCD(${n.join(', ')}) = *${n.reduce(gcd)}*`; });
def('lcm', { ...C, desc: 'Least common multiple', use: '.lcm 4 6', react: '✖️' }, q => { const n = nums(q); if (n.length < 2 || n.includes(0)) usage('.lcm 4 6'); return `✖️ LCM(${n.join(', ')}) = *${n.reduce((a, b) => a / gcd(a, b) * b)}*`; });
def('tempconv', { ...C, desc: 'Celsius / Fahrenheit / Kelvin', use: '.tempconv 100 c', react: '🌡️' }, q => {
  const m = q.toLowerCase().match(/^(-?\d+(?:\.\d+)?)\s*°?\s*([cfk])$/); if (!m) usage('.tempconv 100 c (c, f or k)');
  const v = +m[1], c = m[2] === 'c' ? v : m[2] === 'f' ? (v - 32) * 5 / 9 : v - 273.15;
  return box('TEMPERATURE', [`${fmt(c)} °C`, `${fmt(c * 9 / 5 + 32)} °F`, `${fmt(c + 273.15)} K`]);
});
def('lengthconv', { ...C, desc: 'Length converter', use: '.lengthconv 5 km', react: '📏' }, q => convert(q, LEN, '.lengthconv 5 km', 'LENGTH'));
def('weightconv', { ...C, desc: 'Weight converter', use: '.weightconv 70 kg', react: '🏋️' }, q => convert(q, WGT, '.weightconv 70 kg', 'WEIGHT'));
def('speedconv', { ...C, desc: 'Speed converter', use: '.speedconv 100 km/h', react: '🚀' }, q => convert(q, SPD, '.speedconv 100 km/h', 'SPEED'));
def('sizeconv', { ...C, desc: 'Data size converter', use: '.sizeconv 2 gb', react: '💾' }, q => convert(q, SIZ, '.sizeconv 2 gb', 'DATA SIZE'));
def('baseconv', { ...C, desc: 'Number base converter', use: '.baseconv 255 10 16', react: '🔀' }, q => {
  const m = q.trim().split(/\s+/); const f = +m[1] || 10, t = +m[2] || 2;
  if (!m[0] || f < 2 || f > 36 || t < 2 || t > 36) usage('.baseconv 255 10 16 (number, from base, to base)');
  const n = parseInt(m[0], f); if (Number.isNaN(n)) usage('.baseconv 255 10 16');
  return `🔀 ${m[0]} (base ${f}) = *${n.toString(t).toUpperCase()}* (base ${t})`;
});
def('sqrt', { ...C, desc: 'Square root', use: '.sqrt 144', react: '√' }, q => { const n = +q; if (Number.isNaN(n) || n < 0) usage('.sqrt 144'); return `√${n} = *${fmt(Math.sqrt(n), 8)}*`; });
def('power', { ...C, desc: 'Power of a number', use: '.power 2 10', react: '⚡' }, q => { const [a, b] = nums(q); if (a === undefined || b === undefined) usage('.power 2 10'); const r = Math.pow(a, b); if (!Number.isFinite(r)) usage('.power 2 10'); return `⚡ ${a}^${b} = *${fmt(r, 8)}*`; });
def('average', { ...C, desc: 'Average of numbers', use: '.average 10 20 30', react: '📊' }, q => { const n = nums(q); if (!n.length) usage('.average 10 20 30'); const s = n.reduce((a, b) => a + b, 0); return box('AVERAGE', [`Numbers: ${n.length}`, `Sum: ${fmt(s)}`, `Average: *${fmt(s / n.length)}*`, `Min: ${Math.min(...n)}  Max: ${Math.max(...n)}`]); });
const ZONES = { karachi:'Asia/Karachi', lahore:'Asia/Karachi', islamabad:'Asia/Karachi', delhi:'Asia/Kolkata', dhaka:'Asia/Dhaka', dubai:'Asia/Dubai', riyadh:'Asia/Riyadh', makkah:'Asia/Riyadh', istanbul:'Europe/Istanbul', london:'Europe/London', paris:'Europe/Paris', newyork:'America/New_York', losangeles:'America/Los_Angeles', toronto:'America/Toronto', sydney:'Australia/Sydney', tokyo:'Asia/Tokyo', beijing:'Asia/Shanghai', singapore:'Asia/Singapore', moscow:'Europe/Moscow', cairo:'Africa/Cairo' };
def('timein', { cat: 'calc', desc: 'Current time in a city', use: '.timein london', react: '🌍' }, q => {
  const key = q.toLowerCase().replace(/\s+/g, '');
  const show = (name, tz) => `${name.padEnd(12)} ${new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())}`;
  if (key && (ZONES[key] || key.includes('/'))) { let tz = ZONES[key] || q.trim(); try { return box('WORLD TIME', [show(q.trim(), tz)]); } catch { usage('.timein london'); } }
  return box('WORLD TIME', Object.keys(ZONES).filter(k => !['lahore', 'islamabad', 'makkah'].includes(k)).map(k => show(k, ZONES[k])).concat('', 'Use: .timein <city>'));
});
def('zakat', { ...C, desc: 'Zakat (2.5%) on savings', use: '.zakat 500000', react: '🕌' }, q => {
  const [a] = nums(q); if (!a || a < 0) usage('.zakat 500000');
  return box('ZAKAT (2.5%)', [`Zakat-able wealth: ${fmt(a)}`, `Zakat due: *${fmt(a * 0.025)}*`, 'Note: nisab check apni halat/mufti se confirm karein.']);
});
def('hijridate', { cat: 'calc', desc: 'Today in Hijri calendar', use: '.hijridate', react: '🌙' }, () => {
  const s = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  return `🌙 Hijri: *${s}*\n📅 Aaj: ${new Date().toDateString()}\n⚠️ Chand dikhne par ±1 din ka farq ho sakta hai.`;
});

// ───────────────────────── FUN ZONE ─────────────────────────
const F = { cat: 'funzone' };
def('rolldice', { ...F, desc: 'Roll dice (e.g. 2d6)', use: '.rolldice 2d6', react: '🎲' }, q => {
  const m = (q || '1d6').toLowerCase().match(/^(\d{1,2})?d(\d{1,3})$/); if (!m) usage('.rolldice 2d6'); const n = +(m[1] || 1), s = +m[2]; if (s < 2) usage('.rolldice 2d6');
  const r = Array.from({ length: n }, () => ri(1, s)); return `🎲 ${n}d${s}: ${r.join(' + ')} = *${r.reduce((a, b) => a + b, 0)}*`;
});
def('tosscoin', { ...F, desc: 'Toss a coin', use: '.tosscoin', react: '🪙' }, () => `🪙 *${pick(['HEADS (Chit)', 'TAILS (Pat)'])}*`);
def('rps', { ...F, desc: 'Rock Paper Scissors vs bot', use: '.rps rock', need: true, react: '✊' }, q => {
  const map = { rock: '✊', paper: '✋', scissors: '✌️' }, alias = { r: 'rock', p: 'paper', s: 'scissors', scissor: 'scissors' };
  const u = alias[q.toLowerCase()] || q.toLowerCase(); if (!map[u]) usage('.rps rock | paper | scissors');
  const b = pick(Object.keys(map)), win = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
  const res = u === b ? '🤝 Draw!' : win[u] === b ? '🏆 Aap jeet gaye!' : '🤖 Bot jeet gaya!';
  return box('RPS', [`You: ${map[u]} ${u}`, `Bot: ${map[b]} ${b}`, res]);
});
def('eightball', { ...F, desc: 'Ask the magic 8-ball', use: '.eightball Will I pass?', need: true, react: '🎱' }, q => `🎱 *${q}*\n\n${pick(['Bilkul haan ✅', 'Pakka 💯', 'Lagta hai haan 🙂', 'Abhi saaf nahi, dobara poochein 🌫️', 'Baad mein poochein ⏳', 'Mere hisaab se nahi ❌', 'Umeed mat rakho 😬', 'Bohat mushkil hai 🤔', 'Insha’Allah 🤲'])}`);
def('randpick', { ...F, desc: 'Pick one option randomly', use: '.randpick pizza | burger | biryani', need: true, react: '🎯' }, q => { const o = q.split(/\s*[|,]\s*/).filter(Boolean); if (o.length < 2) usage('.randpick pizza | burger | biryani'); return `🎯 Meri pasand: *${pick(o)}*`; });
const TRUTH = ['Aapka sabse bada darr kya hai?', 'Aakhri jhoot kab bola tha?', 'Zindagi ka sabse sharminda karne wala lamha?', 'Phone mein sabse purani photo kaunsi hai?', 'Kis dost ki baat sabse zyada yaad aati hai?', 'Aapki sabse ajeeb aadat kya hai?', 'Agar 1 din invisible hote to kya karte?', 'Aakhri baar kab roye the aur kyun?', 'Aapko apni kaunsi cheez sabse zyada pasand hai?', 'Kaunsa kaam kal par taalte rehte ho?', 'Kis ki taareef karna chahte ho jo abhi nahi ki?', 'Aapka secret talent kya hai?'];
const DARE = ['Apni sabse funny selfie group mein bhejo 🤳', 'Next 3 messages sirf emojis mein likho', 'Kisi dost ko "tum best ho" voice note bhejo 🎤', '1 minute tak bina hasay rehkar dikhao 😐', 'Apna favourite gaana 10 second gao 🎶', 'Aaj ki date par ek shayari likho ✍️', 'Group mein sabko ek compliment do 💬', 'Apne naam se ek rhyme banao', 'Right hand se left kaan chhoo kar dikhao 😄', 'Apni profile pic 1 ghante ke liye funny lagao', '20 seconds mein 5 cheezein batao jo laal rang ki hon', 'Kisi purane dost ko salam message karo 👋'];
const WYR = ['Hamesha garmi ya hamesha sardi?', 'Super speed ya udne ki taqat?', 'Chai ya coffee zindagi bhar?', 'Pichla zamana ya aane wala zamana dekhna?', 'Bohat paisa lekin akela ya kam paisa magar dher sare dost?', 'Mind reading ya invisibility?', 'Hamesha sach ya hamesha mazaq?', 'Biryani ya pizza hamesha?', 'Raat ka insaan ya subah ka insaan?', 'Ek bada ghar ya duniya ka safar?'];
def('truthq', { ...F, desc: 'Random truth question', use: '.truthq', react: '🫢' }, () => `🫢 *TRUTH*\n${pick(TRUTH)}`);
def('dareq', { ...F, desc: 'Random dare', use: '.dareq', react: '😈' }, () => `😈 *DARE*\n${pick(DARE)}`);
def('rather', { ...F, desc: 'Would you rather?', use: '.rather', react: '🤔' }, () => `🤔 *Would You Rather*\n${pick(WYR)}`);
const JOKES = ['Teacher: Tum late kyun aaye? Student: Sir, sign board par likha tha "School Ahead, Go Slow" 😅', 'Doctor: Aap ko aaram ki zaroorat hai. Patient: Magar aapki fees dekh kar to neend hi ud gayi 😂', 'Dost: Tum itne patle kyun ho? Main: Kyunki mere paas khane ka time hi nahi, WiFi se fursat nahi milti 📶', 'Beta: Abbu, exam mein fail ho gaya. Abbu: Koi baat nahi, agle saal bhi isi class mein milenge 😆', 'Bijli walo ne kaha: Aaj 2 ghante load shedding. Phir 8 ghante baad: Hum aaj ka time table bhool gaye the 🔌', 'Alarm: Utho! Main: Bas 5 minute. Alarm: Ye teesri baar hai. Main: Aur main teesri baar jawab de raha hun 😴', 'Mobile: 1% battery. Main: Mujhe bas ek call karni hai. Mobile: Meri bhi ek aakhri khwahish thi 🔋', 'Biwi: Mujhe tumhari sab baatein sunna pasand hain. Shohar: Wah! Biwi: Magar tum bolte hi nahi 🤐'];
const RIDDLES = [['Mere paas sheher hain magar ghar nahi, pahaad hain magar darakht nahi, pani hai magar machhli nahi. Main kya hun?', 'Naqsha (Map)'], ['Jitna zyada loge, utna zyada peeche chhodoge. Kya?', 'Qadam (Footsteps)'], ['Mujhe sab khate hain magar main bhookha rehta hun. Main kya hun?', 'Aag (Fire)'], ['Meri ungliyan nahi magar haath hain, chehra hai magar aankhein nahi. Main kya hun?', 'Ghari (Clock)'], ['Main hamesha aane wala hun magar kabhi aata nahi. Kya?', 'Kal (Tomorrow)'], ['Main jitna bara hota hun, utna kam dikhta hun. Main kya hun?', 'Andhera (Darkness)'], ['Mere paas chaabiyan hain magar koi taala nahi khol sakta. Kya?', 'Piano / Keyboard'], ['Jitna sukhao utna geela hota hai. Kya?', 'Tauliya (Towel)']];
def('funnyjoke', { ...F, desc: 'Random funny joke', use: '.funnyjoke', react: '😂' }, () => `😂 ${pick(JOKES)}`);
def('brainriddle', { ...F, desc: 'Brain riddle with answer', use: '.brainriddle', react: '🧩' }, () => { const [qq, a] = pick(RIDDLES); return `🧩 *Paheli*\n${qq}\n\n💡 Jawab: ||${a}||\n(Pehle sochein, phir jawab dekhein!)`; });
const QUOTES = ['“Jo log koshish karte hain, wo kabhi haarte nahi — wo seekhte hain.”', '“Sabr ka phal meetha hota hai.”', '“Waqt sabse bada ustaad hai, magar sabko imtihan lekar sikhata hai.”', '“Chhote qadam bhi manzil tak le jaate hain.”', '“Aaj ki mehnat, kal ki izzat.”', '“Jo cheez aasan ho, uski qadar kam hoti hai.”', '“Kamyabi ka raaz: shuru karna.”', '“Khud par yaqeen sab se bari daulat hai.”', '“Ghalti karna burai nahi, ghalti na sudharna burai hai.”', '“Zindagi imtihan hai, hansi uska hal hai.”', '“Dil saaf ho to raaste khud ban jaate hain.”', '“Sach bolna mushkil hai, magar sukoon isi mein hai.”'];
const MOTIVATE = ['Aaj ka din naya mauqa hai — usay zaaya mat karo 🌅', 'Tum jitna sochte ho, usse zyada mazboot ho 💪', 'Girna koi masla nahi, wahin pade rehna masla hai.', 'Perfect time ka intezar mat karo, aaj hi shuru karo 🚀', 'Roz 1% behtar ban jao — saal mein bohat farq padega 📈', 'Mushkil raaste hi sab se khoobsurat manzil tak jaate hain 🏔️', 'Dusron se muqabla mat karo, kal ke khud se karo.', 'Mehnat chhupti nahi, natija khud bolta hai 🔥', 'Dua karo, koshish karo, tawakkul rakho 🤲', 'Haar maan lena aakhri option hona chahiye, pehla nahi.'];
const FACTS = ['🍯 Shehad kabhi kharab nahi hota — purani qabron se bhi khane ke qabil shehad mila hai.', '🐙 Octopus ke 3 dil hote hain.', '🍌 Botany ke hisaab se kela berry hai, magar strawberry nahi.', '🪐 Venus par ek din (apne axis par ghoomna) uske saal se bhi lamba hota hai.', '🦈 Sharks darakhton se bhi pehle zameen par maujood thay.', '🧊 Insani jism mein bade aadmi ke 206 haddiyan hoti hain.', '❤️ Insani dil roz taqreeban 1 lakh baar dhadakta hai.', '☀️ Sooraj ki roshni zameen tak taqreeban 8 minute 20 second mein pahunchti hai.', '🏔️ K2 duniya ki doosri sab se unchi choti hai (8,611 m) aur Pakistan mein hai.', '🧱 Wombat ka paakhana cube (chaukor) shakal ka hota hai.', '👑 Cleopatra ka zamana Great Pyramid ke banne se zyada, chand par insani qadam ke qareeb tha.', '🐘 Haathi un chand janwaron mein se hai jo aaine mein khud ko pehchante hain.'];
def('quote', { ...F, desc: 'Random thought', use: '.quote', react: '💭' }, () => `💭 ${pick(QUOTES)}`);
def('motivate', { ...F, desc: 'Motivation boost', use: '.motivate', react: '🔥' }, () => `🔥 ${pick(MOTIVATE)}`);
def('fact', { ...F, desc: 'Random interesting fact', use: '.fact', react: '🧠' }, () => `🧠 *Kya aap jaante hain?*\n${pick(FACTS)}`);
def('lightroast', { ...F, desc: 'Friendly roast (just for fun)', use: '.lightroast @user', react: '🔥' }, (q) => `🔥 ${q || 'Dost'}, tumhari battery bhi tumse zyada tez charge hoti hai! 😜\n(Mazaq tha, dil par mat lena 🤝)`);
const PRAISE = ['Aap ki smile mehfil bana deti hai 😊', 'Aap jaise log kam milte hain 🌟', 'Aap ki soch bohat khoobsurat hai 💎', 'Aap ke saath waqt guzarna sukoon hai 🌿', 'Aap mehnat se kabhi peeche nahi hatte 💪', 'Aap ka dil bohat bada hai ❤️', 'Aap ki baatein hamesha hosla deti hain ✨', 'Aap ek kamaal ke insaan hain 👑'];
def('praise', { ...F, desc: 'Send a nice compliment', use: '.praise @user', react: '💝' }, (q) => `💝 ${q ? q + ', ' : ''}${pick(PRAISE)}`);
const LINES = ['Kya aap WiFi ho? Kyunki main connection mehsoos kar raha hun 📶', 'Aap ka naam Google hai? Kyunki mujhe jo chahiye, aap mein mil gaya 🔍', 'Chai aur aap — dono ke bina din shuru nahi hota ☕', 'Kya aap battery ho? Aap se mujhe energy milti hai 🔋', 'Aap mere phone ke 100% charge jaisi ho 🥰', 'Aap ke bina meri life "Loading…" par atki hai ⏳', 'Aap Wi-Fi password jaisi ho — sab ko chahiye, mujhe mil jaye 😄', 'Aap ki smile mere Pakistan ke mausam jaisi — hamesha pyari 🌤️'];
def('lovelines', { ...F, desc: 'Cute pick-up line', use: '.lovelines', react: '😉' }, () => `😉 ${pick(LINES)}`);
def('slot', { ...F, desc: 'Slot machine', use: '.slot', react: '🎰' }, () => {
  const s = ['🍒', '🍋', '🍇', '💎', '7️⃣', '🔔'], r = [pick(s), pick(s), pick(s)];
  const msg = r[0] === r[1] && r[1] === r[2] ? '🎉 JACKPOT!!!' : (r[0] === r[1] || r[1] === r[2] || r[0] === r[2]) ? '🙂 Do match — achha!' : '😅 Agli baar!';
  return `🎰 | ${r.join(' | ')} |\n${msg}`;
});
def('lucky', { ...F, desc: 'Your lucky number & color', use: '.lucky', react: '🍀' }, ctx0 => `🍀 Lucky number: *${ri(1, 99)}*\n🎨 Lucky color: *${pick(['Red', 'Blue', 'Green', 'Black', 'Gold', 'Purple', 'White'])}*\n🕐 Lucky hour: *${ri(1, 12)}:${String(ri(0, 59)).padStart(2, '0')} ${pick(['AM', 'PM'])}*`);
def('luckydraw', { ...F, desc: 'Pick a random group member', use: '.luckydraw', react: '🎁' }, async (q, ctx, conn, mek) => {
  if (!ctx.isGroup) return '❌ Ye command sirf group mein chalti hai.';
  const list = (ctx.participants || []).map(p => p.id || p.jid).filter(Boolean); if (!list.length) return '❌ Members ki list nahi mili.';
  const w = pick(list); await conn.sendMessage(ctx.from, { text: `🎁 *LUCKY DRAW*\n\n🏆 Winner: @${w.split('@')[0]}\n🎉 Mubarak ho!`, mentions: [w] }, { quoted: mek }); return null;
});
def('luckmsg', { ...F, desc: 'Fortune for today', use: '.luckmsg', react: '🔮' }, () => `🔮 ${pick(['Aaj koi purana dost yaad karega 📱', 'Aaj ek achhi khabar milne wali hai 📬', 'Aaj paisa soch samajh kar kharch karein 💰', 'Aaj kisi se bahas se bachein, sukoon milega 🕊️', 'Aaj ka din aapke haq mein rahega 🌟', 'Aaj kuch naya seekhne ka mauqa milega 📚', 'Aaj sehat ka khayal rakhein 🍎', 'Aaj chhoti si neki bari khushi degi 🤲'])}`);
def('ratethis', { ...F, desc: 'Rate anything out of 10', use: '.ratethis my new phone', need: true, react: '⭐' }, q => {
  const h = crypto.createHash('md5').update(q.toLowerCase()).digest()[0]; const s = (h % 11);
  return `⭐ *${q}*\nRating: *${s}/10* ${'⭐'.repeat(s)}${'☆'.repeat(10 - s)}`;
});
