// Panel se add kiye gaye channels ka storage.
// MongoDB connected ho to wahan, warna DATA_DIR/channels.json mein (Railway Volume par rakhein).
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data', 'db');
const FILE = path.join(DATA_DIR, 'channels.json');

const schema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, index: true },
    link: String, jid: String, name: String,
    addedAt: { type: Date, default: Date.now }
});
const Model = mongoose.models.PanelChannel || mongoose.model('PanelChannel', schema);
const useMongo = () => mongoose.connection.readyState === 1;

function readFile() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (_) { return []; } }
function writeFile(list) {
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(list, null, 2)); } catch (e) { console.error('channels.json write failed:', e.message); }
}
const clean = (c) => ({ code: c.code, link: c.link, jid: c.jid || null, name: c.name || null, addedAt: c.addedAt });

async function list() {
    if (useMongo()) { try { return (await Model.find({}).sort({ addedAt: 1 }).lean()).map(clean); } catch (_) {} }
    return readFile().map(clean);
}
async function add({ code, link, jid, name }) {
    const entry = { code, link, jid: jid || null, name: name || null, addedAt: new Date().toISOString() };
    if (useMongo()) { try { await Model.updateOne({ code }, { $setOnInsert: entry }, { upsert: true }); return entry; } catch (_) {} }
    const l = readFile(); if (!l.some(x => x.code === code)) { l.push(entry); writeFile(l); }
    return entry;
}
async function update(code, patch) {
    if (useMongo()) { try { await Model.updateOne({ code }, { $set: patch }); return; } catch (_) {} }
    const l = readFile(); const x = l.find(c => c.code === code); if (x) { Object.assign(x, patch); writeFile(l); }
}
async function remove(code) {
    if (useMongo()) { try { const r = await Model.deleteOne({ code }); return r.deletedCount > 0; } catch (_) {} }
    const l = readFile(); const n = l.filter(c => c.code !== code); writeFile(n); return n.length !== l.length;
}
module.exports = { list, add, update, remove };
