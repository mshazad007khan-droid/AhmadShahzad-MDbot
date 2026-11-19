const { cmd } = require('../arslan')
const { downloadContentFromMessage, downloadMediaMessage } = require('@whiskeysockets/baileys')
const extras = require('../lib/extras-hooks')

// ═══════════════════════════════════════════════════════════════════════
//  v7  .vv  — VIEW ONCE (photo / video / audio) — owner only
//    .vv            -> media usi chat mein wapas
//    .vvdm / .vv2   -> media sirf aap ke apne inbox (Message yourself) mein
//    .ok .nice ...  -> chhote lafz: sirf asli view-once par chalte hain, warna chup
//
//  Media nikalne ke 5 tareeqe, ek ke baad ek (jo pehle chal jaye):
//    1) bot ke view-once cache se (memory + disk)  — message aate hi save hota hai
//    2) reply ke quoted message se seedha
//    3) bot ke apne message-store se (asli message, media key ke saath)
//    4) downloadMediaMessage + "re-upload request" (link expire ho to sender ke phone se dobara mangta hai)
//    5) quoted ke andar chhupe dusre wrappers (ephemeral / document-caption) kholkar dobara koshish
// ═══════════════════════════════════════════════════════════════════════

const SHORT_WORDS = new Set(['ok', 'theek', 'nice', 'good', 'acha', 'sahi', 'thanks'])
const WRAPPERS = ['viewOnceMessageV2', 'viewOnceMessageV2Extension', 'viewOnceMessage']
const OTHER_WRAPPERS = ['ephemeralMessage', 'documentWithCaptionMessage', 'editedMessage']
const MEDIA_RE = /^(image|video|audio)Message$/

const unwrap = (message) => {
    let msg = message || {}
    let viewOnce = false
    for (let i = 0; i < 8 && msg; i++) {
        let inner = null
        for (const k of WRAPPERS) if (msg[k] && msg[k].message) { inner = msg[k].message; viewOnce = true; break }
        if (!inner) for (const k of OTHER_WRAPPERS) if (msg[k] && msg[k].message) { inner = msg[k].message; break }
        if (!inner) break
        msg = inner
    }
    return { msg: msg || {}, viewOnce }
}
const mediaTypeOf = (msg) => Object.keys(msg || {}).find(k => MEDIA_RE.test(k))

// kisi bhi message type ke andar se contextInfo nikalo (sirf extendedText nahi)
const findCtx = (message) => {
    const { msg } = unwrap(message)
    for (const k of Object.keys(msg)) {
        const v = msg[k]
        if (v && typeof v === 'object' && v.contextInfo && (v.contextInfo.stanzaId || v.contextInfo.quotedMessage)) return v.contextInfo
    }
    return {}
}

const ownerJid = (conn) => String((conn.user && conn.user.id) || '').split(':')[0].split('@')[0] + '@s.whatsapp.net'

const prettyFrom = (quoted, from) => {
    const p = (quoted && (quoted.sender || quoted.participant)) || ''
    const num = String(p || from).split('@')[0].split(':')[0]
    return String(from).endsWith('@g.us') ? `${num} (group)` : num
}

async function streamToBuffer(src, kind) {
    const stream = await downloadContentFromMessage(src, kind)
    const chunks = []
    for await (const c of stream) chunks.push(c)
    return Buffer.concat(chunks)
}

// 1..5 tareeqe: (buffer, media-info) wapas deta hai ya error phenkta hai
async function obtainMedia(conn, mek, from, quoted, ctxInfo) {
    const reasons = []
    const stanzaId = (quoted && (quoted.stanzaId || quoted.id)) || ctxInfo.stanzaId
    const qMessage = (quoted && quoted.message) || ctxInfo.quotedMessage || {}
    const participant = (quoted && quoted.participant) || ctxInfo.participant

    // 1) cache
    try {
        const cached = stanzaId && extras.getViewOnce(stanzaId)
        if (cached && cached.buffer && cached.buffer.length) {
            return { buffer: cached.buffer, kind: cached.kind, media: { caption: cached.caption, mimetype: cached.mimetype }, viaCache: true, isVO: true }
        }
    } catch (e) { reasons.push('cache: ' + e.message) }

    // quoted se type nikalo
    let { msg, viewOnce } = unwrap(qMessage)
    let type = mediaTypeOf(msg)

    // 3) store
    let stored = null
    if (conn.arslanStore && stanzaId) {
        const jids = [...new Set([from, ctxInfo.remoteJid, participant].filter(Boolean))]
        for (const j of jids) {
            try {
                const orig = await conn.arslanStore.loadMessage(j, stanzaId)
                if (orig && orig.message) {
                    const u = unwrap(orig.message)
                    const t = mediaTypeOf(u.msg)
                    if (t) { stored = { key: orig.key, message: orig.message, msg: u.msg, type: t, vo: u.viewOnce || (u.msg[t] && u.msg[t].viewOnce === true) }; break }
                }
            } catch (_) {}
        }
    }
    if (!type && stored) { msg = stored.msg; type = stored.type }
    if (!type) throw new Error('NOT_MEDIA')
    const isVO = viewOnce || (msg[type] && msg[type].viewOnce === true) || Boolean(stored && stored.vo)
    const kind = type.replace('Message', '')

    const candidates = []
    if (msg[type]) candidates.push({ label: 'quoted', src: msg[type] })
    if (stored && stored.msg[stored.type]) candidates.push({ label: 'store', src: stored.msg[stored.type] })

    // 2) + 3) seedha download
    for (const c of candidates) {
        try {
            const buffer = await streamToBuffer(c.src, kind)
            if (buffer.length) return { buffer, kind, media: c.src, isVO }
            reasons.push(c.label + ': empty')
        } catch (e) { reasons.push(c.label + ': ' + (e.message || e)) }
    }

    // 4) reupload-request ke saath (expired link)
    const keyed = [
        stored && { key: stored.key, message: stored.message },
        { key: { remoteJid: from, id: stanzaId, participant, fromMe: false }, message: { [type]: msg[type] } },
    ].filter(Boolean)
    for (const k of keyed) {
        try {
            const buffer = await downloadMediaMessage(k, 'buffer', {}, { reuploadRequest: conn.updateMediaMessage, logger: console })
            if (buffer && buffer.length) return { buffer, kind, media: msg[type] || {}, isVO }
        } catch (e) { reasons.push('reupload: ' + (e.message || e)) }
    }

    const err = new Error('MEDIA_EMPTY')
    err.reasons = reasons
    throw err
}

async function runVV(conn, mek, m, { from, isCreator, reply, command }, toDM) {
    const word = String(command || 'vv').toLowerCase()
    const quiet = SHORT_WORDS.has(word)
    const dest = toDM ? ownerJid(conn) : from
    try {
        if (!isCreator) { if (!quiet) return reply('*YEH COMMAND SIRF BOT OWNER KE LIYE HAI 😎*'); return }

        const ctxInfo = findCtx(mek.message)
        let quoted = m.quoted
        if (!quoted && (ctxInfo.stanzaId || ctxInfo.quotedMessage)) {
            quoted = { stanzaId: ctxInfo.stanzaId, id: ctxInfo.stanzaId, participant: ctxInfo.participant, sender: ctxInfo.participant, message: ctxInfo.quotedMessage || {} }
        }
        if (!quoted || (!quoted.message && !quoted.stanzaId && !ctxInfo.stanzaId)) {
            if (quiet) return
            return reply('*🥺 KISI VIEW ONCE PHOTO / VIDEO / AUDIO KO REPLY KARO*\n\n*Phir likho:* `.vv`  (ya .ok .nice .acha ...)\n*Apne inbox mein chahiye to:* `.vvdm`')
        }

        let got
        try { got = await obtainMedia(conn, mek, from, quoted, ctxInfo) }
        catch (e) {
            if (e.message === 'NOT_MEDIA') { if (quiet) return; return reply('*❌ Ye view-once ya media message nahi hai (sirf photo / video / audio).*') }
            throw e
        }
        if (quiet && !got.isVO) return   // chhote lafz sirf asli view-once par

        if (!quiet) conn.sendMessage(from, { react: { text: '👁️', key: mek.key } }).catch(() => {})

        const { buffer, kind, media } = got
        const caption = (((media && media.caption) || '') + `\n\n👁️ From: ${prettyFrom(quoted, from)}`).trim()
        let content
        if (kind === 'image') content = { image: buffer, caption }
        else if (kind === 'video') content = { video: buffer, caption, mimetype: (media && media.mimetype) || 'video/mp4' }
        else content = { audio: buffer, mimetype: (media && media.mimetype) || 'audio/mp4', ptt: Boolean(media && media.ptt) }

        await conn.sendMessage(dest, content, toDM ? {} : { quoted: mek })
        if (kind === 'audio') await conn.sendMessage(dest, { text: `👁️ Voice/audio from: ${prettyFrom(quoted, from)}` })
        if (!quiet) conn.sendMessage(from, { react: { text: '✅', key: mek.key } }).catch(() => {})
    } catch (e) {
        console.log('VV ERROR:', e.message, e.reasons ? e.reasons.join(' | ') : '')
        let why = e.message || String(e)
        if (e.message === 'MEDIA_EMPTY') {
            why = 'Media nahi mili. Ya to ye view-once bot ke online hone se PEHLE aaya tha, ya WhatsApp se expire ho chuka hai. ' +
                'Bot online hone ke BAAD aane wali view-once par .vv hamesha chalega (bot usay aate hi save kar leta hai).'
        }
        try { await conn.sendMessage(ownerJid(conn), { text: '*❌ VIEW ONCE ERROR*\n_' + why + '_' }) } catch (_) {}
    }
}

cmd({
    pattern: 'vv',
    alias: ['viewonce', 'view', 'open', ...SHORT_WORDS],
    desc: 'View-once photo/video/audio usi chat mein wapas (Owner only)',
    category: 'owner',
    filename: __filename
}, (conn, mek, m, ctx) => runVV(conn, mek, m, ctx, false))

cmd({
    pattern: 'vvdm',
    alias: ['vv2', 'vvme', 'savevo', 'vvprivate'],
    desc: 'View-once media sirf aap ke apne inbox mein (Owner only)',
    category: 'owner',
    filename: __filename
}, (conn, mek, m, ctx) => runVV(conn, mek, m, ctx, true))

// .antivv on/off — har view-once khud-ba-khud owner ke DM mein save (default OFF)
cmd({
    pattern: 'antivv',
    alias: ['autovv', 'antiviewonce'],
    desc: 'Har view-once ko khud owner ke DM mein bhejo (on/off)',
    category: 'owner',
    filename: __filename
}, async (conn, mek, m, { isCreator, reply, args }) => {
    if (!isCreator) return reply('*YEH COMMAND SIRF BOT OWNER KE LIYE HAI 😎*')
    const settings = require('../lib/botsettings')
    const a = String((args && args[0]) || '').toLowerCase()
    if (['on', 'enable'].includes(a)) { settings.set(conn, 'antivv', true); return reply('👁️ *ANTI VIEW-ONCE ON*\nAb har view-once aate hi aapke DM mein save ho jayegi.\nBand: `.antivv off`') }
    if (['off', 'disable'].includes(a)) { settings.set(conn, 'antivv', false); return reply('👁️ *ANTI VIEW-ONCE OFF*') }
    return reply(`👁️ Abhi: *${settings.get(conn, 'antivv', false) ? 'ON' : 'OFF'}*\n\`.antivv on\` / \`.antivv off\`\nYa kisi view-once par reply karke \`.vv\``)
})

module.exports = { unwrap, findCtx, obtainMedia }
