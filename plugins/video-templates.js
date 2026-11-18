// plugins/video-templates.js — kisi bhi video par reply karke ready-made edit laga do
const { cmd } = require('../arslan');
const vt = require('../lib/vtemplates');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

async function getVideo(m, mek) {
    const tryMsg = async (msg) => {
        if (!msg) return null;
        let inner = msg;
        for (let i = 0; i < 4; i++) {
            const nx = (inner.viewOnceMessageV2 || inner.viewOnceMessage || inner.viewOnceMessageV2Extension || inner.ephemeralMessage || {}).message;
            if (!nx) break; inner = nx;
        }
        if (!inner.videoMessage) return null;
        const stream = await downloadContentFromMessage(inner.videoMessage, 'video');
        const chunks = []; for await (const c of stream) chunks.push(c);
        return Buffer.concat(chunks);
    };
    if (m.quoted && m.quoted.message) { const r = await tryMsg(m.quoted.message); if (r) return r; }
    return tryMsg(mek.message);
}

// .vtemplate viral 3 My Caption  -> 3 = music number (1..), baqi = apna caption (sirf English/Roman likhai)
function parseOpts(rest) {
    const arr = rest || [];
    const i = arr.findIndex(x => /^[1-9]\d?$/.test(x));
    const track = i >= 0 ? Number(arr[i]) : null;
    const caption = arr.filter((_, j) => j !== i).join(' ').trim();
    return { track, caption: caption || null };
}

cmd({
    pattern: 'vtemplate',
    alias: ['videotemplate', 'template', 'vedit'],
    desc: 'Video par ready-made viral/sad/funny... edit lagao',
    category: 'videoedit',
    react: '🎞️',
    use: '.vtemplate <naam> (video par reply karke)  |  .vtemplate  (list dekho)',
    filename: __filename
}, async (conn, mek, m, ctx) => {
    const { args, reply, from } = ctx;
    const name = String(args[0] || '').toLowerCase();

    if (!name || !vt.TEMPLATES[name]) {
        const list = Object.entries(vt.TEMPLATES).map(([k, v]) => `┃ ➤ .vtemplate ${k}  ➜ ${v.label}`).join('\n');
        return reply(
`╭━━━〔 🎞️ 𝐕𝐈𝐃𝐄𝐎 𝐓𝐄𝐌𝐏𝐋𝐀𝐓𝐄𝐒 〕━━━╮
┃
${list}
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯
📌 Video par reply karke: \`.vtemplate viral\`
🎵 Har template mein gaana (music) khud lagta hai
🎶 Dusra gaana: \`.vtemplate viral 3\`  (1-5)
✍️ Apna caption: \`.vtemplate viral 2 Ahmad Shahzad\`
✨ Effects: zoom, glitch, shake, flash, glow, fade, 9:16 blur-fit`
        );
    }

    const video = await getVideo(m, mek).catch(() => null);
    if (!video) return reply('❌ Kisi video par reply karke ye command bhejo.\nMisal: video par reply karke `.vtemplate sad`');

    await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });
    try {
        const out = await vt.applyTemplate(video, name, parseOpts(args.slice(1)));
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
        await conn.sendMessage(from, { video: out, mimetype: 'video/mp4', caption: `${vt.TEMPLATES[name].label} ✨\n𝐀𝐡𝐦𝐚𝐝𝐒𝐡𝐚𝐡𝐳𝐚𝐝-𝐌𝐃` }, { quoted: mek });
    } catch (e) {
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        return reply('❌ Template lagane mein error: ' + e.message);
    }
});

// har template ka apna chota command bhi (.viral, .sademo jaisi clash na ho isliye "vt" prefix)
for (const name of vt.TEMPLATE_NAMES) {
    cmd({
        pattern: `vt${name}`, desc: `Video par "${vt.TEMPLATES[name].label}" edit lagao`, category: 'videoedit',
        react: '🎞️', use: `.vt${name} (video par reply karke)`, filename: __filename
    }, async (conn, mek, m, ctx) => {
        const { reply, from } = ctx;
        const video = await getVideo(m, mek).catch(() => null);
        if (!video) return reply(`❌ Kisi video par reply karke bhejo.\nMisal: video par reply karke \`.vt${name}\``);
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        try {
            const out = await vt.applyTemplate(video, name, parseOpts(ctx.args));
            await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
            await conn.sendMessage(from, { video: out, mimetype: 'video/mp4', caption: `${vt.TEMPLATES[name].label} ✨` }, { quoted: mek });
        } catch (e) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply('❌ ' + e.message);
        }
    });
}
