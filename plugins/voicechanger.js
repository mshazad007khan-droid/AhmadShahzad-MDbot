// plugins/voicechanger.js — VC (voice change) commands: naam jaisa chaha gaya hai
const { cmd } = require('../arslan');
const vc = require('../lib/voicechanger');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

async function getAudio(m, mek) {
    const tryMsg = async (msg) => {
        if (!msg) return null;
        let inner = msg;
        for (let i = 0; i < 4; i++) {
            const nx = (inner.viewOnceMessageV2 || inner.viewOnceMessage || inner.viewOnceMessageV2Extension || inner.ephemeralMessage || {}).message;
            if (!nx) break; inner = nx;
        }
        const type = Object.keys(inner).find(k => k === 'audioMessage');
        if (!type) return null;
        const stream = await downloadContentFromMessage(inner[type], 'audio');
        const chunks = []; for await (const c of stream) chunks.push(c);
        return Buffer.concat(chunks);
    };
    if (m.quoted && m.quoted.message) { const r = await tryMsg(m.quoted.message); if (r) return r; }
    return tryMsg(mek.message);
}

// label: command name -> preset + pyara naam
const VC_CMDS = [
    ['vcgirl',    ['girlvoice'],    'girl',    '👧 Girl'],
    ['vcwoman',   ['womanvoice'],   'woman',   '👩 Woman'],
    ['vcchild',   ['vckid', 'childvoice', 'kidvoice'], 'child', '🧒 Child'],
    ['vcboy',     ['boyvoice'],     'boy',     '👦 Boy'],
    ['vcman',     ['manvoice'],     'man',     '👨 Man'],
    ['vcdeep',    ['deepvoicevc'],  'deep',    '🗿 Deep/Gehri'],
    ['vccartoon', ['cartoonvoice'], 'cartoon', '🤪 Cartoon'],
    ['vcecho',    ['echovc'],       'echo',    '📢 Echo'],
    ['vcrobot',   ['robotvc'],      'robot',   '🤖 Robot']
];

for (const [pattern, alias, preset, label] of VC_CMDS) {
    cmd({
        pattern, alias, desc: `Awaaz ko ${label} bana do`, category: 'voicechange', react: '🎙️',
        use: `.${pattern} [on|off] (ya voice note par reply)`, filename: __filename
    }, async (conn, mek, m, ctx) => {
        const { args, reply, from } = ctx;
        if (!(ctx.isCreator || ctx.isOwner)) return reply('*YEH COMMAND SIRF BOT OWNER KE LIYE HAI 😎*');
        const a = String(args[0] || '').toLowerCase();

        // kisi voice note par reply karke ek dafa turant convert karo
        const audio = await getAudio(m, mek).catch(() => null);
        if (audio && !['on', 'off'].includes(a)) {
            try {
                conn.sendMessage(from, { react: { text: '⏳', key: mek.key } }).catch(() => {});
                const out = await vc.applyPreset(audio, preset);
                await conn.sendMessage(from, { audio: out, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: mek });
            } catch (e) { reply('❌ Voice change nahi ho saka: ' + e.message); }
            return;
        }

        if (['off', 'stop', 'disable'].includes(a)) { vc.setAlways(conn, null); return reply(`*🎙️ VOICE CHANGE OFF*`); }
        if (['on', 'always', 'enable'].includes(a)) {
            vc.setAlways(conn, preset);
            return reply(`*🎙️ ${label.toUpperCase()} MODE ON*\nAb jo bhi voice note aap bhejenge, wo khud-ba-khud *${label}* awaaz mein badal jayegi.\nBand: \`.${pattern} off\` (ya koi bhi doosra \`.vc...\` command)`);
        }
        vc.arm(conn, preset, 10);
        return reply(`*🎙️ TAYYAR!*\nAgla voice note bhejo (10 minute ke andar), wo *${label}* awaaz mein aayega.\nHamesha ke liye: \`.${pattern} on\``);
    });
}

cmd({ pattern: 'vcoff', alias: ['voicechangeoff', 'vcstop'], desc: 'Voice change band karo', category: 'voicechange', react: '🎙️', use: '.vcoff', filename: __filename },
    async (conn, mek, m, ctx) => { vc.setAlways(conn, null); return ctx.reply('*🎙️ VOICE CHANGE OFF*'); });

cmd({ pattern: 'vcmenu', alias: ['voicechangemenu', 'vclist'], desc: 'Voice change commands ki list', category: 'voicechange', react: '🎙️', use: '.vcmenu', filename: __filename },
    async (conn, mek, m, ctx) => {
        const s = vc.status(conn);
        const body =
`╭━━━〔 🎙️ 𝐕𝐎𝐈𝐂𝐄 𝐂𝐇𝐀𝐍𝐆𝐄 〕━━━╮
┃
${VC_CMDS.map(([p, , , label]) => `┃ ➤ .${p}  ➜ ${label}`).join('\n')}
┃ ➤ .vcoff  ➜ Band karo
┃
┃ 📌 Abhi: *${s.always ? (s.preset + ' (hamesha ON)') : (s.preset && Date.now() < s.armedUntil ? s.preset + ' (agli voice ke liye)' : 'OFF')}*
┃
┃ Use: \`.vcgirl on\` = hamesha girl voice
┃      \`.vcgirl\` + voice reply = ek dafa turant
╰━━━━━━━━━━━━━━━━━━━━━━╯`;
        return ctx.reply(body);
    });
