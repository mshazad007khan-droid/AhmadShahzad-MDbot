const fs = require('fs');
const dotenv = require('dotenv');

if (fs.existsSync('.env')) {
    dotenv.config({ path: '.env' });
}

module.exports = {
    // ===========================================================
    // 1. SESSION & DATABASE
    // ===========================================================
    SESSION_ID: process.env.SESSION_ID || "MINI BOT",
    MONGODB_URI: process.env.MONGODB_URI || "mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/DATABASE?retryWrites=true&w=majority",

    // ===========================================================
    // 2. BOT INFO
    // ===========================================================
    PREFIX: process.env.PREFIX || ".",
    // Optional extra owner numbers. The connected WhatsApp account is also an owner.
    OWNER_NUMBER: "923264931117",
    OWNER_DISPLAY_NUMBER: "923264931117",
    OWNER_NUMBERS: ["923264931117"],   // sirf yehi owner (env se badalna band)

    DEFAULT_COUNTRY_CODE: process.env.DEFAULT_COUNTRY_CODE || "92",
    FORCE_CHANNEL_1: "https://whatsapp.com/channel/0029VbECaFY3GJOpTccc5c0c",
    FORCE_CHANNEL_2: "https://whatsapp.com/channel/0029VbCx2Sb5q08a3fe3KZ42",
    BOT_NAME: process.env.BOT_NAME || "𝐀𝐡𝐦𝐚𝐝𝐒𝐡𝐚𝐡𝐳𝐚𝐝-𝐌𝐃",
    OWNER_NAME: process.env.OWNER_NAME || "᯽𓆩͛ꜛ𝜦𝑯𝑴𝜦𝑫𝑺𝑯𝜦𝑯𝒁𝜦𝑫ꜛ𓆪᯽",
    BOT_FOOTER: process.env.BOT_FOOTER || `©𝐏𝐨𝐰𝐞𝐫𝐝 𝐁𝐲 ${process.env.BOT_NAME || "𝐀𝐡𝐦𝐚𝐝𝐒𝐡𝐚𝐡𝐳𝐚𝐝-𝐌𝐃"}`,
    WORK_TYPE: process.env.WORK_TYPE || "public",

    // ===========================================================
    // 3. AUTO STATUS
    // ===========================================================
    AUTO_VIEW_STATUS: "true",
    AUTO_LIKE_STATUS: "true",
    AUTO_LIKE_EMOJI: ['❤️', '🌹', '✨', '🥰', '😍', '💞', '💕', '☺️', '🤗'],
    AUTO_STATUS_REPLY: "false",
    AUTO_STATUS_MSG: "🤗",

    // ===========================================================
    // 4. CHAT FEATURES
    // ===========================================================
    READ_MESSAGE: "false",
    AUTO_TYPING: "false",
    AUTO_RECORDING: "false",

    // ===========================================================
    // 5. GROUP
    // ===========================================================
    WELCOME_ENABLE: "false",
    GOODBYE_ENABLE: "false",
    WELCOME_MSG: null,
    GOODBYE_MSG: null,
    WELCOME_IMAGE: null,
    GOODBYE_IMAGE: null,
    GROUP_INVITE_LINK: "",


    // ===========================================================
    // 6. SÉCURITÉ & ANTI-CALL
    // ===========================================================
    ANTI_CALL: process.env.ANTI_CALL || "false",
    REJECT_MSG: process.env.REJECT_MSG || "*CALL LATER PLEASE ☺️🌹*",

    // ===========================================================
    // 7. IMAGES & LIENS
    // ===========================================================
    // Connect hone par user ke inbox mein jane wali 15 sec ki video (file path ya https link). Khali = video nahi.
    CONNECT_VIDEO: process.env.CONNECT_VIDEO || require("path").join(__dirname, "data", "assets", "connect.mp4"),
    IMAGE_PATH: process.env.IMAGE_PATH || require("path").join(__dirname, "data", "assets", "banner.jpg"),
    OWNER_IMAGE_PATH: process.env.OWNER_IMAGE_PATH || require("path").join(__dirname, "data", "assets", "owner.jpg"),
    CHANNEL_LINK: "https://whatsapp.com/channel/0029VbECaFY3GJOpTccc5c0c",

    // ===========================================================
    // 8. EXTERNAL API (Optionnel)
    // ===========================================================
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
    TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || "",

    // ===========================================================
    // 9. CHANNEL AUTO-FOLLOW 🆕
    // ===========================================================
    AUTO_FOLLOW_CHANNEL: "true",
AUTO_FOLLOW_CHANNELS: [],
AUTO_FOLLOW_DELAY: 2000,



    // ===========================================================
    // 10. CHANNEL REACTION EMOJIS (arcadd command) 🆕
    // ===========================================================
    CHANNEL_REACT_EMOJIS: [
        "🔥","😁","💗","💗","😽","❤️","😽","❤️","😽","💓","🥲","💓","🥲",
        "😽","😽","💞","💞","🔥","😽","💗","🤯","😞","🌚","🌚","😌","🤔",
        "😌","😞","☠️","🌚","😁","😎","😌","🥲","😌","💯","😘","😄","💯",
        "😄","💀","☠️","😁","😽","😎","😽","❤️","📐","🔥","💗","😁","❤️",
        "😁","💗","😁","🤯","🥲","❤️","😌","🔥","❤️","🥲","😞","🤯","😁","😽"
    ],
};