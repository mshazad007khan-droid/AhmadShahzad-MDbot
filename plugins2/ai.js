// plugins/ai.js — Free AI chat, no API key needed
// API: Pollinations.ai (GPT-5, Claude, DeepSeek, Llama 4)

const { cmd } = require('../ahmadcore');
const axios = require('axios');

const POLLINATIONS = 'https://text.pollinations.ai';
const SYSTEM = 'You are a helpful, friendly assistant inside a WhatsApp bot. Reply in the same language/script the user writes in (if they write Roman Urdu, answer in Roman Urdu). Keep answers clear and not too long.';
const UA = { 'User-Agent': 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36' };

// kuch endpoints sunset / notice wala jawab dete hain — usay jawab na maano
const BAD_REPLY = /legacy text api|being sunset|IMPORTANT NOTICE|queue full|rate limit|<html|Cloudflare|Just a moment/i;
const clean = (t) => String(t || '').replace(/\r/g, '').trim();
const okText = (t) => { t = clean(t); return t.length > 1 && !BAD_REPLY.test(t.slice(0, 600)) ? t : null; };

function deepText(o, depth = 0) {
    if (o == null || depth > 5) return null;
    if (typeof o === 'string') return o.length > 1 ? o : null;
    if (Array.isArray(o)) { for (const x of o) { const r = deepText(x, depth + 1); if (r) return r; } return null; }
    if (typeof o === 'object') {
        for (const k of ['result', 'response', 'answer', 'message', 'content', 'text', 'data', 'output', 'reply', 'choices']) {
            if (o[k] != null) { const r = deepText(o[k], depth + 1); if (r) return r; }
        }
    }
    return null;
}

// Model ke naam (user) -> Pollinations ke model
const MODEL_MAP = { gpt: 'openai', claude: 'claude-hybridspace', deepseek: 'deepseek', llama: 'llama', mistral: 'mistral', gemini: 'gemini' };

async function askAI(prompt, model = 'gpt') {
    const pm = MODEL_MAP[model] || 'openai';
    const models = [...new Set([pm, 'openai', 'mistral'])];
    const errors = [];
    const attempts = [];

    for (const m of models) {
        // 1) OpenAI-compatible endpoint (sab se pakka)
        attempts.push([`pollinations-openai:${m}`, async () => {
            const r = await axios.post(`${POLLINATIONS}/openai`, {
                model: m, private: true,
                messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: prompt }]
            }, { timeout: 45000, headers: { 'Content-Type': 'application/json', ...UA } });
            return okText(r.data && r.data.choices && r.data.choices[0] && r.data.choices[0].message && r.data.choices[0].message.content);
        }]);
        // 2) simple GET
        attempts.push([`pollinations-get:${m}`, async () => {
            const url = `${POLLINATIONS}/${encodeURIComponent(prompt.slice(0, 1500))}?model=${m}&private=true&system=${encodeURIComponent(SYSTEM)}`;
            const r = await axios.get(url, { timeout: 45000, headers: UA, responseType: 'text', transformResponse: x => x });
            return okText(r.data);
        }]);
    }
    // 3) baqi public APIs (agar upar wale down hon)
    const enc = encodeURIComponent(prompt.slice(0, 1500));
    const extra = [
        `https://api.siputzx.my.id/api/ai/gpt3?prompt=${encodeURIComponent(SYSTEM)}&content=${enc}`,
        `https://api.siputzx.my.id/api/ai/metaai?query=${enc}`,
        `https://api.ryzendesu.vip/api/ai/chatgpt?text=${enc}`,
        `https://api.vreden.my.id/api/gpt4?query=${enc}`,
        ...String(process.env.AI_API_URLS || '').split(',').map(x => x.trim()).filter(Boolean).map(x => x.replace('{q}', enc))   // apni API: AI_API_URLS="https://x/api?q={q},..."
    ];
    for (const url of extra) {
        attempts.push([url.split('/')[2], async () => {
            const r = await axios.get(url, { timeout: 30000, headers: UA });
            return okText(deepText(r.data));
        }]);
    }

    for (const [name, fn] of attempts) {
        try { const t = await fn(); if (t) return t; errors.push(name + ': empty'); }
        catch (e) { errors.push(name + ': ' + String(e.message || e).slice(0, 60)); }
    }
    const err = new Error('Saari AI APIs abhi jawab nahi de rahi (' + errors.slice(0, 3).join(' | ') + '). Thori der baad try karo.');
    err.details = errors;
    throw err;
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
    const models = ['gpt', 'claude', 'deepseek', 'llama', 'mistral', 'gemini'];
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
    try {
        const axios = require('axios');
        let buf = null, lastErr = null;
        for (const model of ['flux', 'turbo', '']) {   // ek model na chale to dusra
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${seed}&nologo=true&private=true${model ? '&model=' + model : ''}`;
            try {
                const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 70000, headers: { 'User-Agent': 'Mozilla/5.0' } });
                const b = Buffer.from(res.data);
                const ct = String(res.headers['content-type'] || '');
                if (b.length > 2000 && /image/i.test(ct || 'image')) { buf = b; break; }
                lastErr = new Error('empty image');
            } catch (e) { lastErr = e; }
        }
        if (!buf) throw lastErr || new Error('empty image');
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
