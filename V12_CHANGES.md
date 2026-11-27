# v12 changes

## Speed / 1000+ groups safety (main.js)
- **Message store bounded**: pehle har chat ke 200 messages RAM mein rehte the (1000 groups = 2 lakh messages). Ab har chat ke 40 + sirf 150 sabse recent chats (status ke 300). Env: `STORE_PER_CHAT`, `STORE_MAX_CHATS`, `STORE_PER_STATUS`.
- **Group metadata**: ek hi group ke bohat se messages = 1 hi query (dedupe), ek waqt mein sirf 6 queries (`GROUP_META_CONCURRENCY`), stale-while-revalidate (purana data foran, naya peeche se), LRU cache (`GROUP_META_MAX`), disconnect par cache saaf.
- **Message handler**: pehle sirf `messages[0]` process hota tha, baqi messages gum ho jate the — ab sab chalte hain.
- **Stale guard**: bot offline se wapas aaye to 2 minute se purane messages/commands dobara nahi chalte (`MAX_MSG_AGE_SEC`, default 120) — 1000 groups ke backlog se hang/ban nahi hoga.
- Har message ki settings (prefix/mode) alag copy mein — dusre user ke message se mix nahi hoti (ctx.config ab per-session copy hai).
- Duplicate-id map ki cleanup throttled + memory cap.
- **Bug**: panel "groups apply" galti se channel follow chalata tha — ab groups join karwata hai.
- **Bug**: `.menu` fallback mein `cm is not defined` (profile header kabhi nahi dikhta tha) — fixed.

## Movie (plugins2/zz-movie.js + lib/movie-dl.js)
- `.movie <naam>` → info card + **poori movie DOCUMENT (file) mein**. `.movie <naam> #2` = 2nd result, `.movies <naam>` = list, `.movieinfo <naam>`.
- Source 1: **Internet Archive** (free, bina key, stable API, resume download, 6 retries). Source 2: YouTube free full movie (yt-dlp).
- Disk par stream hota hai (RAM nahi), live progress bar, ek waqt mein 2 movies (`MOVIE_CONCURRENCY`), ek banda ek movie, temp files hamesha saaf.
- Env: `MOVIE_MAX_MB` (1500), `MOVIE_MIN_MIN` (40), `OMDB_KEY` (optional, info ke liye).
- Sirf free/legal sources — pirate sites ki APIs aksar band ho jati hain aur copyright ka masla hai.

## Naam
- `arslan.js` → `ahmadcore.js`; `arslanLog/arslanPair/arslanStore/arslanmd` → `ahmad*` (sab 96 jagah). Bot ke behaviour mein koi farq nahi.
- `lib/system.js` dobara obfuscate (source: `_source_unobfuscated/system.src.js`). Strong obfuscation ke liye: `npm i && node scripts/obfuscate-system.js` (javascript-obfuscator install hone par wahi use hota hai).

## v12.1 — pairing "code mila par connect nahi hua" FIX
- Wajah: pairing ke foran baad (515 restart) `creds.registered` kabhi abhi false hota tha, aur bot us taaza paired session ko "adhoora" samajh kar disk + MongoDB se DELETE kar deta tha. Isi liye dobara pair karna parta tha.
- Ab "paired" = `registered` YA `account` (account sirf pair-success par banta hai). Paired session kabhi auto-delete nahi hota.
- creds ek-ek karke save hoti hain (queue + try/catch), restart se pehle save ka intezar (max 8s); MongoDB mein sirf paired creds jati hain (4s debounce, har chhoti update par DB read/write nahi).
- Pairing code maangne se pehle websocket open hone ka intezar, 5 koshishein.
- `/code` dobara dabane par abhi-abhi paired / connect hote session ko reset nahi karta.
- Shutdown par pending creds MongoDB mein flush; `addNumberToMongoDB` fail ho to greeting nahi rukti.
