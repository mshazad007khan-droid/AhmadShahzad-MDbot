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
