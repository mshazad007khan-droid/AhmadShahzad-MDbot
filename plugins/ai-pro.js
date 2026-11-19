// plugins/ai-pro.js — v7: AI commands, har ek ke peeche MULTI-API fallback chain
// (ek API down ho to agli khud try hoti hai). Commands: chatgpt gemini blackbox explain summarize
// research aicodefix aiwebsite aitranslate aiurdu
const axios = require('axios');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { cmd } = require('../arslan');
const config = require('../config');

const UA = { 'User-Agent': 'Mozilla/5.0 (AhmadShahzad-MD)' };
const SYSTEM = `You are ${config.BOT_NAME || 'AhmadShahzad-MD'} AI, a helpful WhatsApp assistant. Reply in the same language/script the user writes in (Roman Urdu stays Roman Urdu). Be clear and concise.`;

const cleanText = (t) => String(t || '').replace(/\r/g, '').trim();
const pick = (d, ...paths) => {
    for (const p of paths) {
        let v = d;
        for (const k of p.split('.')) v = v == null ? v : v[k];
        if (typeof v === 'string' && v.trim()) return v;
    }
    return '';
};

// ---- provider chain ----
function providers(prompt, system) {
    const q = encodeURIComponent(prompt);
    const extra = String(process.env.AI_API_URLS || '').split(',').map(s => s.trim()).filter(Boolean);
    const list = [
        { name: 'pollinations-openai', run: async () => {
            const r = await axios.post('https://text.pollinations.ai/openai', {
                model: 'openai', messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }]
            }, { timeout: 40000, headers: { ...UA, 'Content-Type': 'application/json' } });
            return pick(r.data, 'choices.0.message.content');
        } },
        { name: 'pollinations-get', run: async () => {
            const r = await axios.get(`https://text.pollinations.ai/${q}?system=${encodeURIComponent(system)}`, { timeout: 40000, headers: UA, responseType: 'text' });
            return typeof r.data === 'string' ? r.data : pick(r.data, 'text', 'result');
        } },
        { name: 'pollinations-mistral', run: async () => {
            const r = await axios.get(`https://text.pollinations.ai/${q}?model=mistral&system=${encodeURIComponent(system)}`, { timeout: 40000, headers: UA, responseType: 'text' });
            return typeof r.data === 'string' ? r.data : '';
        } },
        { name: 'princetech', run: async () => {
            const base = (config.apis && config.apis.princetech && config.apis.princetech.baseUrl) || 'https://api.princetechn.com/api';
            const r = await axios.get(`${base}/ai/ai`, { params: { apikey: 'prince', q: prompt }, timeout: 30000, headers: UA });
            return pick(r.data, 'result', 'data', 'response');
        } },
        { name: 'dreaded', run: async () => {
            const r = await axios.get('https://api.dreaded.site/api/chatgpt', { params: { text: prompt }, timeout: 30000, headers: UA });
            return pick(r.data, 'result.prompt', 'result', 'data');
        } },
        { name: 'siputzx', run: async () => {
            const r = await axios.get('https://api.siputzx.my.id/api/ai/gpt3', { params: { prompt: system, content: prompt }, timeout: 30000, headers: UA });
            return pick(r.data, 'data', 'result');
        } },
        { name: 'vreden', run: async () => {
            const r = await axios.get('https://api.vreden.my.id/api/gpt4', { params: { query: prompt }, timeout: 30000, headers: UA });
            return pick(r.data, 'result', 'data');
        } },
        ...extra.map((u, i) => ({ name: 'custom' + (i + 1), run: async () => {
            const r = await axios.get(u.replace('{q}', q), { timeout: 30000, headers: UA });
            return typeof r.data === 'string' ? r.data : pick(r.data, 'result', 'data', 'response', 'text', 'answer');
        } })),
    ];
    return list;
}

async function askAI(prompt, system = SYSTEM) {
    const errors = [];
    for (const p of providers(prompt, system)) {
        try {
            const out = cleanText(await p.run());
            if (out && out.length > 1 && !/^<!doctype|<html/i.test(out)) return { text: out, provider: p.name };
            errors.push(p.name + ': empty');
        } catch (e) { errors.push(p.name + ': ' + (e.code || e.message || e)); }
    }
    const err = new Error('Saari AI APIs abhi jawab nahi de rahin');
    err.details = errors;
    throw err;
}

const box = (title, body, foot) =>
    `╭━━〔 ${title} 〕━━╮\n\n${body}\n\n╰━━━━━━━━━━━━━━━━━━╯${foot ? '\n> ' + foot : ''}`;
const FOOT = () => config.BOT_FOOTER || '';

function aiCommand({ pattern, alias = [], desc, icon, title, make, needText = true, example }) {
    cmd({ pattern, alias, desc, category: 'ai', react: icon, use: `.${pattern} ${example || '<text>'}`, filename: __filename },
        async (conn, mek, m, { from, reply, text }) => {
            let input = String(text || '').trim();
            if (!input && m.quoted && m.quoted.text) input = String(m.quoted.text).trim();
            if (needText && !input) return reply(`❌ Text likho.\nMisal: *.${pattern} ${example || 'kuch likho'}*`);
            try {
                conn.sendPresenceUpdate('composing', from).catch(() => {});
                const { text: out } = await askAI(make(input));
                await reply(box(title, out.slice(0, 3800), FOOT()));
            } catch (e) {
                console.error(`[AI:${pattern}]`, (e.details || [e.message]).join(' | '));
                await reply('❌ AI abhi busy hai. Thori der baad dobara try karo.');
            }
        });
}

aiCommand({ pattern: 'chatgpt', alias: ['gpt4', 'chatai'], desc: 'ChatGPT se kuch bhi poocho', icon: '🧠', title: '𝐂𝐇𝐀𝐓𝐆𝐏𝐓', make: (t) => t, example: 'Pakistan ka capital kya hai?' });
aiCommand({ pattern: 'gemini', alias: ['geminiai', 'ai2'], desc: 'Gemini style AI chat', icon: '💎', title: '𝐆𝐄𝐌𝐈𝐍𝐈', make: (t) => t, example: 'Love kya hai?' });
aiCommand({ pattern: 'blackbox', alias: ['bbox', 'bb'], desc: 'BlackBox AI (coding + general)', icon: '👾', title: '𝐁𝐋𝐀𝐂𝐊𝐁𝐎𝐗', make: (t) => t, example: 'JS mein debounce likho' });
aiCommand({ pattern: 'explain', alias: ['eli5', 'samjhao'], desc: 'Koi bhi cheez asaan lafzon mein samjhao', icon: '📚', title: '𝐄𝐗𝐏𝐋𝐀𝐈𝐍', make: (t) => `Explain "${t}" in very simple terms with one small example.`, example: 'blockchain' });
aiCommand({ pattern: 'summarize', alias: ['summary', 'khulasa', 'tldr'], desc: 'Lambe text ka khulasa (ya reply karke)', icon: '📝', title: '𝐒𝐔𝐌𝐌𝐀𝐑𝐘', make: (t) => `Summarize the following text in short bullet points:\n\n${t}`, example: '<lamba text> ya reply' });
aiCommand({ pattern: 'research', alias: ['deepresearch', 'tahqeeq'], desc: 'Topic par mukhtasar research report', icon: '🔬', title: '𝐑𝐄𝐒𝐄𝐀𝐑𝐂𝐇', make: (t) => `Write a concise, well-structured research brief about: ${t}. Include key facts, pros/cons and a short conclusion.`, example: 'solar energy in Pakistan' });
aiCommand({ pattern: 'aicodefix', alias: ['fixcode', 'debugcode'], desc: 'Code ka bug dhoondo aur theek karo', icon: '🛠️', title: '𝐂𝐎𝐃𝐄 𝐅𝐈𝐗', make: (t) => `Find the bugs in this code, then give the corrected full code and a one-line explanation of each fix:\n\n${t}`, example: '<code> ya reply' });
aiCommand({ pattern: 'aitranslate', alias: ['aitr'], desc: 'AI translation: .aitranslate urdu hello how are you', icon: '🌐', title: '𝐓𝐑𝐀𝐍𝐒𝐋𝐀𝐓𝐄', make: (t) => { const [lang, ...rest] = t.split(/\s+/); return `Translate the following text to ${lang}. Output only the translation:\n\n${rest.join(' ')}`; }, example: 'urdu how are you' });
aiCommand({ pattern: 'aiurdu', alias: ['urduai'], desc: 'Kisi bhi sawal ka jawab Urdu mein', icon: '🇵🇰', title: '𝐔𝐑𝐃𝐔 𝐀𝐈', make: (t) => `${t}\n\nAnswer in Urdu (Urdu script).`, example: 'Pakistan ki history' });

// .aiwebsite <description> -> AI se poori single-file HTML website, .html file mein
cmd({ pattern: 'aiwebsite', alias: ['makesite', 'webgen'], desc: 'AI se HTML website banwao', category: 'ai', react: '🌐', use: '.aiwebsite portfolio for a photographer', filename: __filename },
    async (conn, mek, m, { from, reply, text }) => {
        const t = String(text || '').trim();
        if (!t) return reply('❌ Website ka description likho.\nMisal: *.aiwebsite dark portfolio for a photographer*');
        try {
            await reply('🌐 Website ban rahi hai, thora wait karo...');
            const { text: out } = await askAI(
                `Create a complete, modern, responsive single-file HTML website (inline CSS and JS) for: ${t}. Output ONLY the full HTML code, nothing else.`,
                'You are an expert front-end developer. Output raw HTML only, no markdown fences, no explanation.');
            let html = out.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/i, '').trim();
            if (!/<html|<!doctype/i.test(html)) return reply('❌ AI ne sahi HTML nahi diya, dobara try karo.');
            const file = path.join(os.tmpdir(), `site_${Date.now()}.html`);
            fs.writeFileSync(file, html);
            await conn.sendMessage(from, { document: fs.readFileSync(file), mimetype: 'text/html', fileName: 'website.html', caption: '✅ Website tayyar! Browser mein kholo.\n> ' + FOOT() }, { quoted: mek });
            fs.rmSync(file, { force: true });
        } catch (e) {
            console.error('[AI:aiwebsite]', (e.details || [e.message]).join(' | '));
            await reply('❌ Website nahi ban saki, thori der baad try karo.');
        }
    });

module.exports = { askAI };
