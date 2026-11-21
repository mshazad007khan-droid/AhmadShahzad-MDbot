// lib/panel-reacts.js — panel ki "Auto React" list (channel + group) ek jagah dikhane ke liye. Asli data chauto.json (channels) aur gcauto.json (groups) mein hai.
const chauto = require('./chauto');
const gcauto = require('./gcauto');

function all() {
    const out = [];
    const ch = chauto.list();
    for (const jid of Object.keys(ch)) out.push({ type: 'channel', jid, name: ch[jid].name || '', emojis: ch[jid].emojis || [], at: ch[jid].at || 0 });
    const gc = gcauto.list();
    for (const jid of Object.keys(gc)) out.push({ type: 'group', jid, name: gc[jid].name || '', emojis: gc[jid].emojis || [], at: gc[jid].at || 0 });
    return out.sort((a, b) => b.at - a.at);
}
module.exports = { all };
