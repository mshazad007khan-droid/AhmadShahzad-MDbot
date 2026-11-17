const { cmd } = require('../arslan')
const { downloadContentFromMessage } = require('@whiskeysockets/baileys')
const extras = require('../lib/extras-hooks')

// .vv  (aur alias: .viewonce .view .open  +  .ok .theek .nice .good .acha .sahi .thanks)
// Kisi view-once photo / video / audio par reply karke likho -> media usi chat mein wapas aati hai.
// Normal alias (.ok, .nice ...) tab hi kaam karte hain jab reply view-once media par ho,
// warna bot kuch nahi karta (in lafzon ke normal istemal mein koi rukawat nahi).

const SHORT_WORDS = new Set(['ok', 'theek', 'nice', 'good', 'acha', 'sahi', 'thanks'])
const WRAPPERS = ['viewOnceMessageV2', 'viewOnceMessageV2Extension', 'viewOnceMessage']
const OTHER_WRAPPERS = ['ephemeralMessage', 'documentWithCaptionMessage']

// wrappers kholo; batao ke view-once tha ya nahi
const unwrap = (message) => {
    let msg = message
    let viewOnce = false
    for (let i = 0; i < 6 && msg; i++) {
        let inner = null
        for (const k of WRAPPERS) if (msg[k]?.message) { inner = msg[k].message; viewOnce = true; break }
        if (!inner) for (const k of OTHER_WRAPPERS) if (msg[k]?.message) { inner = msg[k].message; break }
        if (!inner) break
        msg = inner
    }
    return { msg, viewOnce }
}

const ownerJid = (conn) => String((conn.user && conn.user.id) || '').split(':')[0].split('@')[0] + '@s.whatsapp.net'

const prettyFrom = (m, mek, from) => {
    const p = (m.quoted && (m.quoted.sender || m.quoted.participant)) ||
        mek?.message?.extendedTextMessage?.contextInfo?.participant || ''
    const num = String(p || from).split('@')[0].split(':')[0]
    return from.endsWith('@g.us') ? `${num} (group)` : num
}

cmd({
    pattern: "vv",
    alias: ["viewonce", "view", "open", ...SHORT_WORDS],
    desc: "Retrieve view-once media in the same chat (Owner only)",
    category: "owner",
    filename: __filename
},
async (conn, mek, m, { from, isCreator, reply, command }) => {
    const word = String(command || 'vv').toLowerCase()
    const quiet = SHORT_WORDS.has(word)          // .ok .nice ... -> chup chap
    const me = from   // ab media usi chat mein wapas aati hai
    try {
        if (!isCreator) {
            if (!quiet) return reply("*YEH COMMAND SIRF BOT OWNER KE LIYE HAI 😎*")
            return
        }

        if (!m.quoted || !m.quoted.message) {
            if (quiet) return
            return reply(
                "*🥺 KISI VIEW ONCE PHOTO / VIDEO / AUDIO KO REPLY KARO*\n\n" +
                "*Phir likho:* `.vv`  (ya .ok .theek .nice .good .acha .sahi .thanks)\n\n" +
                "*Media tumhare DM mein aa jayegi 😎*"
            )
        }

        const stanzaId = m.quoted.stanzaId || m.quoted.id
        let { msg, viewOnce } = unwrap(m.quoted.message)
        let type = Object.keys(msg || {}).find(k => /^(image|video|audio)Message$/.test(k))
        let isVO = viewOnce || (type && msg[type] && msg[type].viewOnce === true)

        // 1) bot ne view-once aate hi download karke cache kar liya tha -> sab se pakki cheez
        const cached = extras.getViewOnce(stanzaId)
        // 2) bot ka apna store (asli message, media key ke saath)
        let stored = null
        if (!cached && conn.arslanStore && stanzaId) {
            try {
                const orig = await conn.arslanStore.loadMessage(from, stanzaId)
                if (orig && orig.message) {
                    const u = unwrap(orig.message)
                    const t = Object.keys(u.msg || {}).find(k => /^(image|video|audio)Message$/.test(k))
                    if (t) stored = { msg: u.msg, type: t, vo: u.viewOnce || u.msg[t].viewOnce === true }
                }
            } catch (_) {}
        }
        if (stored) { if (!type) { msg = stored.msg; type = stored.type } isVO = isVO || stored.vo }
        if (cached) { isVO = true; type = cached.kind + 'Message' }

        // chhote lafz sirf asli view-once par chalte hain
        if (quiet && (!type || !isVO)) return
        if (!type) return reply("*❌ YE VIEW ONCE MEDIA SUPPORT NAHI KARTA 🥺*")

        if (!quiet) conn.sendMessage(from, { react: { text: '🥺', key: mek.key } }).catch(() => {})

        const kind = type.replace('Message', '')
        let buffer = cached ? cached.buffer : null
        let media = cached ? { caption: cached.caption, mimetype: cached.mimetype } : (msg[type] || {})
        const sources = [msg[type], stored && stored.msg[stored.type]].filter(Boolean)
        for (const src of sources) {
            if (buffer && buffer.length) break
            try {
                const stream = await downloadContentFromMessage(src, kind)
                const chunks = []
                for await (const chunk of stream) chunks.push(chunk)
                buffer = Buffer.concat(chunks)
                media = src
            } catch (_) { buffer = null }
        }
        if (!buffer || !buffer.length) throw new Error("MEDIA_EMPTY (view-once bot ke online hone se pehle ka hai ya WhatsApp se expire ho chuka hai)")

        const caption = ((media.caption || "") + `\n\n👁️ From: ${prettyFrom(m, mek, from)}`).trim()
        let content
        if (kind === 'image') content = { image: buffer, caption }
        else if (kind === 'video') content = { video: buffer, caption }
        else content = { audio: buffer, mimetype: media.mimetype || "audio/mp4", ptt: false }

        await conn.sendMessage(me, content, { quoted: mek })
        if (kind === 'audio') await conn.sendMessage(me, { text: `👁️ Voice/audio from: ${prettyFrom(m, mek, from)}` })
    } catch (e) {
        console.log("VV ERROR:", e)
        // error bhi sirf owner ke DM mein, chat mein kuch nahi
        try { await conn.sendMessage(me, { text: "*❌ VIEW ONCE OPEN KARNE ME ERROR AYA 🥺*\n_" + (e.message || e) + "_" }) } catch (_) {}
    }
})
