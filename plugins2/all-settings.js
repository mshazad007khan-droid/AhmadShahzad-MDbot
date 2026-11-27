const { cmd } = require('../ahmadcore');
const { getUserConfigFromMongoDB, updateUserConfigInMongoDB } = require('../lib/database');

// Helper: sirf is session ki apni saved config mein ek key badalta hai.
// (Pehle poori global config copy hoke save hoti thi -> ek setting badalne se baqi settings default par
//  wapas chali jati thin, jaise autotyping on karte hi auto-status-view band ho jata tha.)
const updateConfig = async (key, value, botNumber, config, reply) => {
    try {
        const current = (await getUserConfigFromMongoDB(String(botNumber || ''))) || {};
        const newConfig = { ...current, [key]: value, STATUS_DEFAULTS_V3: '1' };
        await updateUserConfigInMongoDB(String(botNumber || ''), newConfig);
        // main.js in keys ko seedha global config se padhta hai
        if (['WORK_TYPE', 'PREFIX', 'OWNER_NAME', 'OWNER_DISPLAY_NUMBER'].includes(key)) { try { require('../config')[key] = value; } catch (_) {} }
        return reply(`✅ *${key}* ab: *${value}*`);
    } catch (e) {
        console.error(e);
        return reply("❌ Setting save nahi hui: " + (e.message || e));
    }
};
const readCfg = async (botNumber) => (await getUserConfigFromMongoDB(String(botNumber || ''))) || {};

// ============================================================
// 1. PRESENCE MANAGEMENT (Recording / Typing)
// ============================================================

cmd({
    pattern: "autorecording",
    alias: ["autorec", "arecording"],
    desc: "Enable/Disable auto recording simulation",
    category: "settings",
    react: "👑"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config: _g }) => {
    const config = await readCfg(botNumber);
    if (!isOwner) return reply("*YEH COMMAND SIRF MERE LIE HAI 😎*");
    const value = args[0]?.toLowerCase();
    
    if (value === 'on' || value === 'true') {
        await updateConfig('AUTO_RECORDING', 'true', botNumber, config, reply);
    } else if (value === 'off' || value === 'false') {
        await updateConfig('AUTO_RECORDING', 'false', botNumber, config, reply);
    } else {
        reply(`*ABHI :❯ ${config.AUTO_RECORDING} HAI 😊*\n\n*AUTO RECORDING ON KARNE K LIE LIKHO ☺️*\n*👑 ❮AUTORECORDING ON❯ 👑*\n*AUTORECORDING OFF KARNE K LIE LIKHO ☺️*\n*👑 ❮AUTORECORDING OFF❯ 👑*`);
    }
});

cmd({
    pattern: "autotyping",
    alias: ["autotype", "atyping"],
    desc: "Enable/Disable auto typing simulation",
    category: "settings",
    react: "👑"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config: _g }) => {
    const config = await readCfg(botNumber);
    if (!isOwner) return reply("*YEH COMMAND SIRF MERE LIE HAI 😎*");
    const value = args[0]?.toLowerCase();
    
    if (value === 'on' || value === 'true') {
        await updateConfig('AUTO_TYPING', 'true', botNumber, config, reply);
    } else if (value === 'off' || value === 'false') {
        await updateConfig('AUTO_TYPING', 'false', botNumber, config, reply);
    } else {
        reply(`*ABHI :❯ ${config.AUTO_TYPING} HAI 😊*\n\n*AUTO TYPING ON KARNE K LIE LIKHO ☺️*\n*👑 ❮AUTOTYPING ON❯ 👑*\n*AUTOTYPING OFF KARNE K LIE LIKHO ☺️*\n*👑 ❮AUTOTYPING OFF❯ 👑*`);
    }
});

// ============================================================
// 2. CALL MANAGEMENT (Anti-Call)
// ============================================================

cmd({
    pattern: "anticall",
    alias: "acall",
    desc: "Auto reject calls",
    category: "settings",
    react: "👑"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config }) => {
    if (!isOwner) return reply("*YEH COMMAND SIRF MERE LIE HAI ☺️*");
    const value = args[0]?.toLowerCase();
    
    if (value === 'on' || value === 'true') {
        await updateConfig('ANTI_CALL', 'true', botNumber, config, reply);
    } else if (value === 'off' || value === 'false') {
        await updateConfig('ANTI_CALL', 'false', botNumber, config, reply);
    } else {
        reply(`*ABHI :❯ ${config.AUTO_RECORDING} HAI 😊*\n\n*JO BHI CALL KARE GA KHUD HI REJECT HO JAYE GE 😃 YE SETTING ON KARNE K LIE LIKHO ☺️*\n*👑 ❮ANTICALL ON❯ 👑*\n*ANTICALL OFF KARNE K LIE LIKHO ☺️*\n*👑 ❮ANTICALL OFF❯ 👑*`);
    }
});

// ============================================================
// 3. GROUP MANAGEMENT (Welcome / Goodbye)
// ============================================================

// (welcome / goodbye ab plugins/welcome-pro.js mein hain — per group on/off)

// ============================================================
// 4. READ & STATUS MANAGEMENT
// ============================================================

cmd({
    pattern: "autoread",
    desc: "Enable/Disable auto read messages (Blue Tick)",
    category: "settings",
    react: "👀"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config: _g }) => {
    const config = await readCfg(botNumber);
    if (!isOwner) return reply("*YEH COMMAND SIRF MERE LIE HAI 😎*");
    const value = args[0]?.toLowerCase();
    
    if (value === 'on' || value === 'true') {
        await updateConfig('READ_MESSAGE', 'true', botNumber, config, reply);
    } else if (value === 'off' || value === 'false') {
        await updateConfig('READ_MESSAGE', 'false', botNumber, config, reply);
    } else {
        reply(`*ABHI ${config.READ_MESSAGE} HAI 😊*\n*JO BHI MSG KARE GA USKA MSG KHUD HI SEEN `);
    }
});

cmd({
    pattern: "autoviewsview",
    alias: ["avs", "statusseen", "astatus", "autostatusview", "autoviewstatus", "autoview", "autostatusseen"],
    desc: "Auto view status updates",
    category: "settings",
    react: "😎"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config: _g }) => {
    const config = await readCfg(botNumber);
    if (!isOwner) return reply("*YEH COMMAND SIRF MERE LIE HAI 😎*");
    const value = args[0]?.toLowerCase();
    
    if (value === 'on' || value === 'true') {
        await updateConfig('AUTO_VIEW_STATUS', 'true', botNumber, config, reply);
    } else if (value === 'off' || value === 'false') {
        await updateConfig('AUTO_VIEW_STATUS', 'false', botNumber, config, reply);
    } else {
        reply(`*ABHI ${config.AUTO_VIEW_STATUS} HAI 😊*\n\n*JO BHI STATUS LAGAYE GA KHUD HI SEEN HO JAYE GA 😃 YEH SETTING ON KARNE K LIE LIKHO ☺️*\n*👑 ❮AUTOSTATUSVIEW ON❯ 👑*\n*OFF KARNE KE LIE LIKHO ☺️*\n*👑 ❮AUTOSTATUSVIEW OFF❯ 👑*`);
    }
});

cmd({
    pattern: "autolikestatus",
    alias: ["als", "autostatuslike", "autostatusreact", "autoreactstatus", "autolike", "autostatuslikes"],
    desc: "Auto like status updates",
    category: "settings",
    react: "❤️"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config: _g }) => {
    const config = await readCfg(botNumber);
    if (!isOwner) return reply("🚫 Owner only!");
    const value = args[0]?.toLowerCase();
    
    if (value === 'on' || value === 'true') {
        await updateConfig('AUTO_LIKE_STATUS', 'true', botNumber, config, reply);
    } else if (value === 'off' || value === 'false') {
        await updateConfig('AUTO_LIKE_STATUS', 'false', botNumber, config, reply);
    } else {
        reply(`Current Status: ${config.AUTO_LIKE_STATUS}\nUsage: .autolikestatus on/off`);
    }
});

// ============================================================
// 5. SYSTEM (Mode & Prefix)
// ============================================================

cmd({
    pattern: "mode",
    desc: "Change bot mode (public/private/groups/inbox)",
    category: "settings",
    react: "⚙️"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config: _g }) => {
    const config = await readCfg(botNumber);
    if (!isOwner) return reply("*YEH COMMAND SIRF MERE LIE HAI 😎*");
    const mode = args[0]?.toLowerCase();
    const validModes = ['public', 'private', 'groups', 'inbox'];

    if (validModes.includes(mode)) {
        await updateConfig('WORK_TYPE', mode, botNumber, config, reply);
    } else {
        reply(`*GHALAT LIKHA HAI 🥺*\n*ESE LIKHO ☺️*COMMAND ❮MODE❯ LIKH KER IN ME SE KOI EK WORD LIKHO JAHA AP CHAHTE HO K BOT WORK KRE 🤗*\n ${validModes.join(', ')}\nCurrent: ${config.WORK_TYPE}`);
    }
});

cmd({
    pattern: "setprefix",
    desc: "Change bot prefix",
    category: "settings",
    react: "👑"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config: _g }) => {
    const config = await readCfg(botNumber);
    if (!isOwner) return reply("*YEH COMMAND SIRF MERE LIE HAI 😎*");
    const newPrefix = args[0];

    if (newPrefix) {
        // Ensure prefix is short (single character or short string)
        if (newPrefix.length > 1 && newPrefix !== 'noprefix') return reply("❌ Prefix must be short (e.g. . or ! or #)");
        
        await updateConfig('PREFIX', newPrefix, botNumber, config, reply);
    } else {
        reply(`*ABHI PREFIX ❮ ${config.PREFIX} ❯ HAI ☺️*\nJIS BHI NISHAN AP BOT CHALANA CHAHTE HAI WO NISHAN SET KERE ESE 😊*\n*❮SETPREFIX . ! + _ -❯*\n*JO BHI APKA DIL KARE 😍❣️*`);
    }
});


// ============================================================
// 6. OWNER DISPLAY DETAILS
// ============================================================
cmd({
    pattern: "ownername",
    alias: ["setownername", "changeownername"],
    desc: "Change the displayed owner name",
    category: "settings",
    react: "👑",
    use: ".ownername Ahmad Shahzad"
}, async (conn, mek, m, { args, isOwner, reply, botNumber, config }) => {
    if (!isOwner) return reply("⛔ Yeh command sirf bot owner ke liye hai.");
    const name = args.join(" ").trim();
    if (!name) return reply(`👑 Current owner name: *${config.OWNER_NAME || '᯽𓆩͛ꜛ𝜦𝑯𝑴𝜦𝑫𝑺𝑯𝜦𝑯𝒁𝜦𝑫ꜛ𓆪᯽'}*\nUse: *.ownername Ahmad Shahzad*`);
    if (name.length > 40) return reply("❌ Owner name 40 characters se chhota rakho.");
    await updateConfig('OWNER_NAME', name, botNumber, config, reply);
});

cmd({
    pattern: "ownernumber",
    alias: ["setownernumber", "changeownernumber"],
    desc: "Show the fixed owner number",
    category: "settings",
    react: "📱",
    use: ".ownernumber"
}, async (conn, mek, m, { reply }) => {
    return reply("📱 *OWNER NUMBER*\n\n+923264931117\n💬 https://wa.me/923264931117\n\n⚠️ Ye number badla nahi ja sakta aur koi dusra owner nahi ban sakta.");
});
