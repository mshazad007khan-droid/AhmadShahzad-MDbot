// lib/selfheal.js (v13.5) — "bot kabhi kabhi 10-15 minute kaam nahi karta, phir khud chalne lagta hai" ka ilaaj
//
// Wajah (aksar): WhatsApp ka socket "connected" dikhta hai (s.user set hai, ws band nahi hua) magar asal mein half-dead / zombie
// hota hai — na messages aate hain na jate. Purana code usay "connected" samajhta tha, isliye watchdog kuch nahi karta tha aur
// bot tab theek hota jab WhatsApp / network khud socket tod deta (10-15 minute baad).
// Ab: har SELF_PING_MS (default 60s) par WhatsApp server ko ek halka ping (xmlns w:p) bhejte hain. 2 baar lagataar jawab na aaye
// to socket giraya jata hai aur 1.5 second mein naya connect hota hai. Session / login par koi asar nahi (logout kabhi nahi hota).
//
// Saath mein: event-loop lag monitor (agar bot kisi bhari kaam mein 3s+ atak jaye to log mein "[LAG]" aata hai) aur
// MAX_RSS_MB (optional env) — RAM is se upar jaye to process saaf tareeqe se restart hota hai (Railway wapas utha leta hai).
const SELF_PING_MS = Math.max(20000, Number(process.env.SELF_PING_MS || 60000));
const PING_TIMEOUT_MS = Math.max(8000, Number(process.env.SELF_PING_TIMEOUT_MS || 20000));
const FAILS_TO_RESTART = Math.max(2, Number(process.env.SELF_PING_FAILS || 2));

const state = new Map();   // number -> { timer, fails }

function attach(conn, number, { log, reconnect }) {
    const n = String(number).replace(/[^0-9]/g, '');
    const prev = state.get(n);
    if (prev && prev.timer) clearInterval(prev.timer);
    const st = { timer: null, fails: 0, openAt: 0, busy: false };
    state.set(n, st);

    const stop = () => { if (st.timer) { clearInterval(st.timer); st.timer = null; } };
    conn.ev.on('connection.update', (u) => {
        if (u.connection === 'open') { st.openAt = Date.now(); st.fails = 0; }
        if (u.connection === 'close') stop();
    });

    const probe = async () => {
        if (st.busy) return;
        try { if (conn.ws && (conn.ws.isClosed === true || conn.ws.readyState === 3)) { stop(); return; } } catch (_) {}   // socket pehle hi band: watchdog sambhalega
        if (!conn.user || !st.openAt) return;                 // abhi connect ho raha hai
        if (Date.now() - st.openAt < 45000) return;           // naye connect ko 45s do (initial sync)
        st.busy = true;
        try {
            await conn.query({ tag: 'iq', attrs: { to: 's.whatsapp.net', type: 'get', xmlns: 'w:p' }, content: [{ tag: 'ping', attrs: {} }] }, PING_TIMEOUT_MS);
            if (st.fails) log && log(`[SELFHEAL] ${n}: ping wapas theek`, 'success');
            st.fails = 0;
        } catch (e) {
            st.fails++;
            log && log(`[SELFHEAL] ${n}: ping fail ${st.fails}/${FAILS_TO_RESTART} (${(e && e.message) || e})`, 'warning');
            if (st.fails >= FAILS_TO_RESTART) {
                st.fails = 0; stop();
                log && log(`[SELFHEAL] ${n}: connection zombie lag raha hai — dobara connect kar raha hu`, 'warning');
                try { reconnect(n, 'selfheal: dead socket'); } catch (_) {}
            }
        } finally { st.busy = false; }
    };
    st.timer = setInterval(probe, SELF_PING_MS);
    if (st.timer.unref) st.timer.unref();
}

// ---- process-wide monitors (ek baar) ----
let monitors = false;
function startMonitors(log) {
    if (monitors) return; monitors = true;
    let last = Date.now();
    const lag = setInterval(() => {
        const now = Date.now(), drift = now - last - 1000; last = now;
        if (drift > 3000) log && log(`[LAG] bot ${Math.round(drift / 1000)}s ke liye atka tha (bhari kaam / CPU). Aise lag se connection toot sakta hai.`, 'warning');
    }, 1000);
    if (lag.unref) lag.unref();
    const mem = setInterval(() => {
        const rss = Math.round(process.memoryUsage().rss / 1048576);
        const max = Number(process.env.MAX_RSS_MB || 0);
        if (max && rss > max) {
            log && log(`[MEM] RAM ${rss}MB > MAX_RSS_MB=${max} — saaf restart (sessions bache rahenge)`, 'warning');
            try { process.emit('SIGTERM'); } catch (_) {}
            setTimeout(() => process.exit(1), 6000).unref();
        } else if (rss > 700) log && log(`[MEM] RAM ${rss}MB`, 'info');
    }, 5 * 60 * 1000);
    if (mem.unref) mem.unref();
}

module.exports = { attach, startMonitors };
