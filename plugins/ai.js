// plugins/ai.js — Free AI chat, no API key needed
// API: Pollinations.ai (GPT-5, Claude, DeepSeek, Llama 4)

const { cmd } = require('../arslan');
const axios = require('axios');

const POLLINATIONS = 'https://text.pollinations.ai';

async function askAI(prompt, model = 'openai') {
    // Pollinations text API — no key, no signup
    const models = {
        'gpt': 'openai',
        'claude': 'claude',
        'deepseek': 'deepseek',
        'llama': 'llama',
        'mistral': 'mistral'
    };
    const m = models[model] || 'openai';

    const url = `${POLLINATIONS}/${encodeURIComponent(prompt)}?model=${m}`;
    const res = await axios.get(url, {
        timeout: 60000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    return typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
}

cmd({
    pattern: 'ai',
    alias: ['gpt', 'chat', 'ask', 'llm'],
    desc: 'Ask free AI (no API key)',
    category: 'ai',
    react: '🤖',
    use: '.ai <question>',
    filename: __filename
}, async (conn, mek, m, { args, reply, from }) => {
    const q = args.join(' ').trim();
    if (!q) return reply('🤖 *FREE AI*\n\nUsage: `.ai <question>`\nModel: `.ai claude <question>`\nModels: gpt, claude, deepseek, llama, mistral');

    // Check if first arg is a model
    const models = ['gpt', 'claude', 'deepseek', 'llama', 'mistral'];
    let model = 'gpt';
    let prompt = q;
    if (models.includes(args[0]?.toLowerCase())) {
        model = args[0].toLowerCase();
        prompt = args.slice(1).join(' ');
    }
    if (!prompt) return reply('❌ Question do.');

    await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

    try {
        const answer = await askAI(prompt, model);
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
        return reply(`🤖 *${model.toUpperCase()}*\n\n${String(answer).slice(0, 3500)}`);
    } catch (e) {
        return reply(`❌ AI fail: ${e.message}`);
    }
});
// ─────────────── .aiimg : AI se photo banwao (Pollinations — free, bina API key) ───────────────
cmd({
    pattern: 'aiimg', alias: ['imagine', 'txt2img', 'aiphoto', 'generateimg'], desc: 'AI se photo banwao (free)',
    category: 'ai', react: '🎨', use: '.aiimg <description>', filename: __filename
}, async (conn, mek, m, { args, reply, from }) => {
    const prompt = args.join(' ').trim();
    if (!prompt) return reply('🎨 *AI IMAGE*\n\nUsage: `.aiimg ek sher jungle mein, sunset`');
    await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });
    const seed = Math.floor(Math.random() * 999999);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${seed}&nologo=true`;
    try {
        const axios = require('axios');
        const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000, headers: { 'User-Agent': 'Mozilla/5.0' } });
        const buf = Buffer.from(res.data);
        if (buf.length < 2000) throw new Error('empty image');
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
        return conn.sendMessage(from, { image: buf, caption: `🎨 *${prompt}*\n✨ 𝐀𝐈 𝐈𝐌𝐀𝐆𝐄 𝐁𝐲 𝐀𝐡𝐦𝐚𝐝𝐒𝐡𝐚𝐡𝐳𝐚𝐝-𝐌𝐃` }, { quoted: mek });
    } catch (e) {
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        return reply('❌ AI image nahi ban saki: ' + e.message + '\n(Ye free public API hai, kabhi slow/down bhi ho sakti hai.)');
    }
});

// ─────────────── .aicode : AI se code likhwao (wahi free model, coding-focused prompt) ───────────────
cmd({
    pattern: 'aicode', alias: ['codegpt', 'writecode'], desc: 'AI se code likhwao', category: 'ai',
    react: '👨‍💻', use: '.aicode <kya banana hai>', filename: __filename
}, async (conn, mek, m, { args, reply, from }) => {
    const q = args.join(' ').trim();
    if (!q) return reply('👨‍💻 *AI CODE*\n\nUsage: `.aicode python mein ek calculator banao`');
    await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });
    try {
        const prompt = `You are an expert programmer. Write clean, correct, working code for this request, with short comments. Request: ${q}`;
        const ans = await askAI(prompt, 'gpt');
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
        return reply('👨‍💻 *AI CODE*\n\n' + ans);
    } catch (e) {
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        return reply('❌ Code generate nahi ho saka: ' + e.message);
    }
});

// ─────────────── .aivideo : seedha, imaandar jawab (abhi reliable free video-gen nahi hai) ───────────────
cmd({
    pattern: 'aivideo', alias: ['textvideo', 'videogen'], desc: 'AI video (abhi limited)', category: 'ai',
    react: '🎬', use: '.aivideo <description>', filename: __filename
}, async (conn, mek, m, { reply }) => {
    return reply(
        '🎬 *AI VIDEO*\n\n' +
        'Sachi baat: koi bhi FREE aur reliable AI text-to-video service abhi maujood nahi hai jo bina\n' +
        'paid API key ke chale. Jo "free video AI" bots dikhte hain wo aksar jald band ho jate hain ya\n' +
        'kaam nahi karte — is liye yahan fake wada nahi dena chahta.\n\n' +
        '✅ Iske bajaye abhi ye available hain:\n' +
        '• `.aiimg <description>` — AI se photo (reliable, free)\n' +
        '• `.vtemplate` — apni kisi video par ready-made viral/sad/funny edit laga do\n\n' +
        'Agar future mein koi paid AI-video key (jaise Runway/Kling) add karni ho to bata dena, uska\n' +
        'integration add kar dunga.'
    );
});

// ─────────────── .aimenu : saari AI commands ek jagah ───────────────
cmd({
    pattern: 'aimenu', alias: ['aihelp', 'ailist'], desc: 'AI commands ki list', category: 'ai',
    react: '🤖', use: '.aimenu', filename: __filename
}, async (conn, mek, m, { reply }) => {
    return reply(
`╭━━━〔 🤖 𝐀𝐈 𝐌𝐄𝐍𝐔 〕━━━╮
┃
┃ 💬 .ai <sawaal>         ➜ AI se baat karo (GPT)
┃ 💬 .ai claude <sawaal>  ➜ Claude model
┃ 💬 .ai deepseek <sawaal>➜ DeepSeek model
┃
┃ 🎨 .aiimg <description> ➜ AI se photo banwao
┃ 👨‍💻 .aicode <kaam>       ➜ AI se code likhwao
┃ 🎬 .aivideo              ➜ (abhi limited — dekho)
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯
🤖 Free public APIs — kabhi slow ho sakti hain.`
    );
});
