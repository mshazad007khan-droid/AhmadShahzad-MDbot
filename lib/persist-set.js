// lib/persist-set.js — chhota Set jo disk par yaad rehta hai (restart ke baad bhi).
// Use: "kis number ne kaun sa channel follow / group join kar liya" — taake har restart par WhatsApp ko dobara requests na jayein.
const fs = require('fs');
const path = require('path');

function persistSet(name) {
    const file = path.join(process.env.DATA_DIR || path.join(__dirname, '..', 'data'), `persist-${name}.json`);
    let set;
    try { set = new Set(JSON.parse(fs.readFileSync(file, 'utf8'))); } catch (_) { set = new Set(); }
    let timer = null;
    const save = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            try { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify([...set])); } catch (_) {}
        }, 500);
        if (timer.unref) timer.unref();
    };
    return {
        has: (k) => set.has(k),
        add(k) { if (!set.has(k)) { set.add(k); save(); } return this; },
        delete(k) { const r = set.delete(k); if (r) save(); return r; },
        clear() { set.clear(); save(); },
        get size() { return set.size; }
    };
}
module.exports = { persistSet };
