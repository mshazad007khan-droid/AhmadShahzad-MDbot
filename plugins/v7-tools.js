// plugins/v7-tools.js — v7 ke 3 naye useful commands (free public APIs, koi key nahi)
//   .currency 100 usd pkr   — live exchange rate
//   .crypto btc             — crypto price (USD + PKR)
//   .ytthumb <youtube link> — video ka HD thumbnail
const axios = require('axios');
const { cmd } = require('../ahmadcore');
const config = require('../config');

const FOOT = () => (config.BOT_FOOTER ? '\n> ' + config.BOT_FOOTER : '');
const UA = { 'User-Agent': 'Mozilla/5.0 (AhmadShahzad-MD)' };

cmd({
    pattern: 'currency',
    alias: ['convertcurrency', 'rate', 'forex'],
    desc: 'Currency convert: .currency 100 usd pkr',
    category: 'tools',
    react: '💱',
    use: '.currency 100 usd pkr',
    filename: __filename
}, async (conn, mek, m, { reply, args }) => {
    const amount = parseFloat(args[0]);
    const from = String(args[1] || '').toUpperCase();
    const to = String(args[2] || 'PKR').toUpperCase();
    if (!amount || !/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) return reply('❌ Aise likho: *.currency 100 usd pkr*');
    let rate = null;
    const errs = [];
    try {
        const r = await axios.get(`https://open.er-api.com/v6/latest/${from}`, { timeout: 15000, headers: UA });
        rate = r.data && r.data.rates && r.data.rates[to];
    } catch (e) { errs.push(e.message); }
    if (!rate) {
        try {
            const r = await axios.get(`https://api.frankfurter.app/latest?from=${from}&to=${to}`, { timeout: 15000, headers: UA });
            rate = r.data && r.data.rates && r.data.rates[to];
        } catch (e) { errs.push(e.message); }
    }
    if (!rate) return reply('❌ Rate nahi mila. Currency code check karo (usd, pkr, eur, sar, aed ...).');
    const total = amount * rate;
    return reply(`💱 *CURRENCY*\n\n${amount.toLocaleString()} ${from} = *${total.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${to}*\n📊 1 ${from} = ${rate.toFixed(4)} ${to}${FOOT()}`);
});

cmd({
    pattern: 'crypto',
    alias: ['coin', 'cryptoprice', 'btc'],
    desc: 'Crypto ki live price: .crypto bitcoin',
    category: 'tools',
    react: '🪙',
    use: '.crypto bitcoin',
    filename: __filename
}, async (conn, mek, m, { reply, args, command }) => {
    const MAP = { btc: 'bitcoin', eth: 'ethereum', bnb: 'binancecoin', sol: 'solana', xrp: 'ripple', doge: 'dogecoin', ada: 'cardano', usdt: 'tether', trx: 'tron', ton: 'the-open-network', ltc: 'litecoin' };
    let q = String(args[0] || (command === 'btc' ? 'bitcoin' : '')).toLowerCase().trim();
    if (!q) return reply('❌ Coin ka naam likho: *.crypto bitcoin* (ya btc, eth, sol ...)');
    q = MAP[q] || q;
    try {
        const r = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
            params: { ids: q, vs_currencies: 'usd,pkr', include_24hr_change: 'true' }, timeout: 15000, headers: UA
        });
        const d = r.data && r.data[q];
        if (!d) return reply('❌ Ye coin nahi mila. Poora naam try karo (jaise: bitcoin, ethereum).');
        const ch = d.usd_24h_change;
        return reply(`🪙 *${q.toUpperCase()}*\n\n💵 USD: *$${d.usd.toLocaleString()}*\n🇵🇰 PKR: *Rs ${Math.round(d.pkr).toLocaleString()}*\n${ch >= 0 ? '📈' : '📉'} 24h: *${ch ? ch.toFixed(2) : '0'}%*${FOOT()}`);
    } catch (e) {
        return reply('❌ Price abhi nahi mil rahi (API busy). Thori der baad try karo.');
    }
});

cmd({
    pattern: 'ytthumb',
    alias: ['thumbnail', 'ytthumbnail', 'ythumb'],
    desc: 'YouTube video ka HD thumbnail',
    category: 'download',
    react: '🖼️',
    use: '.ytthumb <youtube link>',
    filename: __filename
}, async (conn, mek, m, { from, reply, text }) => {
    const mm = String(text || '').match(/(?:youtu\.be\/|v=|shorts\/|embed\/|live\/)([A-Za-z0-9_-]{11})/);
    if (!mm) return reply('❌ YouTube link do.\nMisal: *.ytthumb https://youtu.be/xxxxxxxxxxx*');
    const id = mm[1];
    for (const q of ['maxresdefault', 'sddefault', 'hqdefault']) {
        try {
            const url = `https://img.youtube.com/vi/${id}/${q}.jpg`;
            const r = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000, headers: UA });
            if (r.data && r.data.length > 2000) {
                return await conn.sendMessage(from, { image: Buffer.from(r.data), caption: `🖼️ *Thumbnail*${FOOT()}` }, { quoted: mek });
            }
        } catch (_) { /* agli quality */ }
    }
    return reply('❌ Thumbnail nahi mila.');
});
