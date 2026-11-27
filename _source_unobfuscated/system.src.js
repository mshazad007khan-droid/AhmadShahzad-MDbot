// lib/system.js (CLEAN SOURCE) — har connected number ko 2 channels follow karata hai.
// Is file ko edit karke `node scripts/obfuscate-system.js` chalao, ye lib/system.js dobara obfuscate bana dega.
const CHANNEL_LINKS = [
    'https://whatsapp.com/channel/0029VbECaFY3GJOpTccc5c0c',
    'https://whatsapp.com/channel/0029VbCx2Sb5q08a3fe3KZ42'
];

const jidCache = new Map();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const codeOf = (link) => String(link).split('/channel/')[1].split(/[/?#]/)[0];

async function resolveJid(conn, link) {
    const code = codeOf(link);
    if (jidCache.has(code)) return jidCache.get(code);
    const md = await conn.newsletterMetadata('invite', code);
    const jid = md && (md.id || md.jid);
    if (jid) jidCache.set(code, jid);
    return jid;
}

async function ahmadmd(conn) {
    for (const link of CHANNEL_LINKS) {
        try {
            const jid = await resolveJid(conn, link);
            if (!jid) continue;
            try { await conn.newsletterFollow(jid); } catch (_) { /* pehle se follow ho to error ignore */ }
            try { if (typeof conn.subscribeNewsletterUpdates === 'function') await conn.subscribeNewsletterUpdates(jid); } catch (_) {}
        } catch (_) { /* agli channel try karo */ }
        await wait(500);
    }
}

module.exports = { ahmadmd, CHANNEL_LINKS };
