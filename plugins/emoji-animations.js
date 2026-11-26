'use strict';

// 𝐀𝐡𝐦𝐚𝐝𝐒𝐡𝐚𝐡𝐳𝐚𝐝-𝐌𝐃: animated emoji/text edit commands.
// These commands edit only the message sent by this bot.
const { cmd } = require('../arslan');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function animateOwnMessage(conn, from, reply, initial, frames) {
  let sent;
  try {
    sent = await conn.sendMessage(from, { text: initial });
    for (const frame of frames) {
      await sleep(850);
      await conn.sendMessage(from, { text: frame, edit: sent.key });
    }
  } catch (error) {
    console.error('[AHMAD SHAHZAD emoji animation]', error);
    if (typeof reply === 'function') await reply(`❌ Animation failed: ${error.message}`);
  }
}

const animations = [
  { pattern: 'happyemoji', desc: 'Happy emoji animation', react: '🤭', initial: '😂', frames: ['😃','😄','😁','😊','😎','🥳','😸','😹','🌞','🌈','😃','😄','😁','😊','😎','🥳','😸','😹','🌞','🌈','😃','😄','😁','😊'] },
  { pattern: 'heart', desc: 'Heart emoji animation', react: '❤️', initial: '🖤', frames: ['💖','💗','💕','🩷','💛','💚','🩵','💙','💜','🖤','🩶','🤍','🤎','❤️‍🔥','💞','💓','💘','💝','♥️','💟','❤️‍🩹','❤️'] },
  { pattern: 'angryemoji', desc: 'Angry emoji animation', react: '🤡', initial: '👽', frames: ['😡','😠','🤬','😤','😾','😡','😠','🤬','😤','😾'] },
  { pattern: 'sademoji', desc: 'Sad emoji animation', react: '😶', initial: '😔', frames: ['🥺','😟','😕','😖','😫','🙁','😩','😥','😓','😪','😢','😔','😞','😭','💔','😭','😿'] },
  { pattern: 'shy', desc: 'Shy emoji animation', react: '🧐', initial: '🧐', frames: ['😳','😊','😶','🙈','🙊','😳','😊','😶','🙈','🙊'] },
  { pattern: 'moon', desc: 'Moon phase animation', react: '🌚', initial: '🌝', frames: ['🌗','🌘','🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘','🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘','🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘','🌑','🌒','🌓','🌔','🌕','🌖','🌝🌚'] },
  { pattern: 'confused', desc: 'Confused emoji animation', react: '🤔', initial: '🤔', frames: ['😕','😟','😵','🤔','😖','😲','😦','🤷','🤷‍♂️','🤷‍♀️'] },
  { pattern: 'hot', desc: 'Hot emoji animation', react: '💋', initial: '💋', frames: ['🥵','❤️','💋','😫','🤤','😋','🥵','🥶','🙊','😻','🙈','💋','🫂','🫀','👅','👄','💋'] },
  { pattern: 'nikal', desc: 'Animated AHMAD SHAHZAD ASCII joke', react: '🗿', initial: '𝐀𝐡𝐦𝐚𝐝𝐒𝐡𝐚𝐡𝐳𝐚𝐝-𝐌𝐃 🗿', frames: [
    '⠀⠀⠀⣠⣶⡾⠏⠉⠙⠳⢦⡀\n⠀⠀⠀ NIKAL 🗿\n⠀⠀⠀⠹⣶⠆⠀⠀⠀⠀⠀⡴⠃',
    '⠀⠀⠀⣠⣶⡾⠏⠉⠙⠳⢦⡀\n⠀⠀⠀ FUR-SAT 😎\n⠀⠀⠀⠹⣶⠆⠀⠀⠀⠀⠀⡴⠃',
    '⠀⠀⠀⣠⣶⡾⠏⠉⠙⠳⢦⡀\n⠀⠀⠀ PEHLI FURSAT 😂\n⠀⠀⠀⠹⣶⠆⠀⠀⠀⠀⠀⡴⠃',
    '⠀⠀⠀⣠⣶⡾⠏⠉⠙⠳⢦⡀\n⠀⠀⠀ 𝐀𝐡𝐦𝐚𝐝𝐒𝐡𝐚𝐡𝐳𝐚𝐝-𝐌𝐃 🔥\n⠀⠀⠀⠹⣶⠆⠀⠀⠀⠀⠀⡴⠃',
    '⠀⠀⠀⣠⣶⡾⠏⠉⠙⠳⢦⡀\n⠀⠀⠀ NIKAL 🗿\n⠀⠀⠀⠹⣶⠆⠀⠀⠀⠀⠀⡴⠃'
  ] }
];

for (const animation of animations) {
  cmd({
    pattern: animation.pattern,
    desc: animation.desc,
    category: 'emotions',
    react: animation.react,
    filename: __filename
  }, async (conn, mek, m, ctx) => {
    const from = ctx.from || mek?.key?.remoteJid;
    const reply = ctx.reply;
    if (!from) return typeof reply === 'function' ? reply('❌ Chat ID nahi mila.') : undefined;
    await animateOwnMessage(conn, from, reply, animation.initial, animation.frames);
  });
}
