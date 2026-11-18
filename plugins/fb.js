const { cmd } = require('../arslan');
const axios = require('axios');
const mediaDl = require('../lib/media-dl');

cmd({
  pattern: "fb",
  react: "☺️",
  alias: ["facebook", "fbdl"],
  category: "download",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  let localWhy = '';
  try {
    if (!q) return reply("*AP NE KOI FACEBOOK VIDEO DOWNLOAD KARNI HAI 🤔 TO AP US FACEBOOK VIDEO KA LINK COPY KAR LO 🤗*\n*PHIR ESE LIKHO ☺️*\n\n*FB ❮FACEBOOK VIDEO LINK❯*\n\n*JAB AP ESE LIKHO GE 😇 TO APKI FACEBOOK VIDEO DOWNLOAD KAR KE 😃 YAHA PER BHEJ DE JAYE GE 😍♥️*");

    // 1) LOCAL (no API) via yt-dlp
    try {
      const local = await mediaDl.downloadAnyVideo(q.trim());
      return await conn.sendMessage(from, {
        video: local.buffer,
        mimetype: "video/mp4",
        caption: "*👑 FB VIDEO 👑*\n*👑 BY :❯ 𝐀𝐡𝐦𝐚𝐝𝐒𝐡𝐚𝐡𝐳𝐚𝐝-𝐌𝐃 👑*"
      }, { quoted: mek });
    } catch (localErr) {
      localWhy = mediaDl.explainError(localErr);
      console.warn('[FB] local download failed, trying API:', localErr.message, localErr.details || '');
    }

    // 2) fallback: public API
    try {
      const apiUrl = `https://movanest.xyz/v2/fbdown?url=${encodeURIComponent(q)}`;
      const res = await axios.get(apiUrl, { timeout: 25000 });
      const data = res.data;
      if (data.status === true && Array.isArray(data.results) && data.results.length) {
        const result = data.results[0];
        const videoUrl = result.hdQualityLink || result.normalQualityLink;
        if (videoUrl) {
          const caption = `*👑 FB VIDEO 👑*
*👑 TIME :❯ ${result.duration}*
*👑 CREATER :❯ ${data.creator}*
*👑 BY :❯ 𝐀𝐡𝐦𝐚𝐝𝐒𝐡𝐚𝐡𝐳𝐚𝐝-𝐌𝐃 👑*`;
          return await conn.sendMessage(from, { video: { url: videoUrl }, mimetype: "video/mp4", caption }, { quoted: mek });
        }
      }
      throw new Error('movanest: no usable link');
    } catch (e1) { console.warn('[FB] movanest failed, trying backend1:', e1.message); }

    // 3) fallback 2: backend1.tioo.eu.org (asli, dusre bot se li hui API)
    try {
      const d = (await axios.get(`https://backend1.tioo.eu.org/fbdown?url=${encodeURIComponent(q)}`, { timeout: 25000 })).data;
      const link = d && (d.hd || d.sd || d.url || d.mp4 || (d.data && (d.data.hd || d.data.sd)));
      if (!link) throw new Error('backend1: no usable link');
      return await conn.sendMessage(from, { video: { url: link }, mimetype: "video/mp4", caption: "*👑 FB VIDEO 👑*\n*👑 BY :❯ 𝐀𝐡𝐦𝐚𝐝𝐒𝐡𝐚𝐡𝐳𝐚𝐝-𝐌𝐃 👑*" }, { quoted: mek });
    } catch (e2) {
      return reply("❌ Facebook video download nahi ho saki (sab fallback fail).\n\n💡 " + (localWhy || e2.message));
    }

  } catch (err) {
    console.log(err);
    reply("❌ Facebook video download nahi ho saki." + (localWhy ? "\n\n💡 " + localWhy : ""));
  }
});
