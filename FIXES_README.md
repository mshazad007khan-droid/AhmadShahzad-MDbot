# Fixes (v2.9.2)
1. VIDEO commands: yt-dlp -> ytdl-core -> NEW public API/Piped fallback. Sab se pakka hal: YouTube cookies
   (browser se cookies.txt export -> base64 -> Railway env YTDLP_COOKIES_B64, ya file data/cookies.txt).
   `.dltest` se check karo.
2. .bgmusic / .bgmusicvoice: ffmpeg "Option not found" fix (amix normalize hata diya, system ffmpeg pehle).
3. .prank: naya prank menu. Pranks lambay; end par "Ye sirf prank tha — just for fun 😊".
   Commands: .hack .virus .bomb .ghost .track .police .simblock .battery
4. .menu: TOP COMMANDS card pehle page par, naya style, har card/page par VIEW CHANNEL button.
5. Session: sirf tab hatta hai jab aap khud WhatsApp se logout/unpair karo (pehle se aise hi tha).

# v2.9.3
- Menu order: Owner -> BGMusic(voice) -> Videos (sab ek page) -> Prank -> Group -> baaki. Har page par VIEW CHANNEL.
- BGMusic: 2 ffmpeg binary x 2 filter tareeqe auto-try, ab fail nahi hona chahiye.
- View-once: cache disk par bhi (restart ke baad chale). NEW `.antivv on/off` = har view-once khud owner DM mein (default OFF).
- Video: 8+ extra API fallback. Apni API: env YT_API_URLS="https://site/api?url={url},https://..."
- YouTube block ho to cookies lagao (YTDLP_COOKIES_B64) — sab se pakka.

# v2.9.4 — is baar ka session
1. VIDEO/download reliability: Dockerfile ab build ke waqt `pip3 install yt-dlp` karta hai (pehle sirf
   runtime par GitHub se download hota tha, jo Railway ke network/rate-limit par fail ho sakta tha).
   Bot ab pehle isi pip-wali system yt-dlp ko dhoondta hai. Cookies (YTDLP_COOKIES_B64) ab bhi zaroori
   hain agar YouTube IP block kare — ye bina internet ke yahan test nahi ho saka, is liye 100% guarantee
   nahi de sakta ke YouTube block nahi karega (cloud/Railway IPs ko YouTube aksar block karta hai, ye
   dunya bhar ke bots ka masla hai, sirf is bot ka nahi).
2. Video/movie/cartoon ka result-card (thumbnail + description) ab zyada detail ke saath: duration,
   channel, views, upload-time, aur video ka description bhi — sab commands (.video .movie .cartoon
   .romance .couple .islamicvid .videosong) mein same, bada aur saaf style.
3. BGMUSIC: naye commands `.bgmusic1 on` se `.bgmusic5 on` (har ek fix preset). 5 tracks mein se 3
   (bgmusic1-3.mp3) pehle se project mein thin, 2 nayi (bgmusic4-5) khud generate ki hain (instrumental
   loops — asli gaane shamil nahi ho sakte, copyright/no-internet dono wajah se). Apna MP3 daalna ho to
   `data/bgmusic/bgmusic6.mp3` is naam se rakho.
4. VIEW-ONCE bug fix: pehle bot apne "fromMe" (khud ke bheje/forward kiye) view-once ko cache hi nahi
   karta tha — isi wajah se "Message yourself" mein test karne par hamesha MEDIA_EMPTY aata tha. Ab
   theek hai.
5. STATUS SAVE: status par sirf emoji-react hi nahi, quick "like" (double-tap heart) bhi ab pakda jata
   hai (WhatsApp/Baileys dono tareeqon se reaction bhej sakta hai, dono ko sun rahe hain ab).
6. NAYA: Voice Changer (.vcgirl .vcwoman .vcchild .vcboy .vcman .vcdeep .vccartoon .vcecho .vcrobot,
   .vcoff, .vcmenu) — pura local ffmpeg se, test kiya hua, kaam karta hai. `.vcgirl on` = agli saari
   voice notes khud girl-voice mein; ya kisi voice note par `.vcgirl` reply karke sirf wahi ek convert
   karo. BGMUSIC ke saath bhi chalta hai (pehle voice change, phir music mix, ek hi voice note).
7. AI: `.ai` / `.gpt` / `.ai claude ...` (pehle se tha) ab category "AI" mein. Naya `.aiimg <description>`
   — free public API (Pollinations) se AI photo banata hai, koi key nahi chahiye.
8. Menu order: Owner -> Voice -> Voice Change -> Video (sab commands ek hi page) -> Prank -> Group -> AI
   -> baaki. Har page par VIEW CHANNEL button.
9. `.simdata` / CNIC-address lookup wapas NAHI add kiya — ye kisi bhi number se kisi insaan ka naam/CNIC/
   ghar ka pata nikalta hai, jo stalking/fraud ke liye use ho sakta hai. Baqi sab kuch add kar diya hai.

## Honest limitations (network na hone ki wajah se test nahi ho saka)
- `.aiimg` (Pollinations image API) aur video ke extra fallback APIs — ye public free services hain
  jo kabhi slow/down ho sakti hain; is sandbox mein internet access nahi tha isliye inhe live test
  nahi kar saka.
- Asli video download (yt-dlp/cookies) YouTube ke IP-block/network par depend karta hai — code taraf se
  jo ho sakta tha (reliable install + cookies + fallback) wo sab kar diya hai, lekin "hamesha 100% chalega"
  ye guarantee koi bhi nahi de sakta, kyunke ye YouTube ke server ke rawaiye par hai.

# v2.9.5
1. `.jid` — kisi bhi chat/group ka JID, ya `.jid <channel/group link>` se us channel/group ka JID.
   Code-block mein deta hai (tap/long-press se copy) + ek "📋 Copy JID" button bhi try karta hai.
2. CHANNEL REACT/VOTE: `.chreact <post link> <emoji>` aur `.chpoll <post link> <option>` — dono sirf
   LINK maangte hain, manual server-id nahi. `.chstatreact` (channel-status.js wala purana, alag) ab
   usi tareeqe par fix kar diya — pehle manual jid+serverId maangta tha, ab sirf link.
   React ke liye ab Baileys (direct) fail ho to backup API bhi try hoti hai: ammar-chreact-api.vercel.app
   — iska exact response-format yahan test nahi ho saka (internet nahi tha), isliye 100% guarantee
   nahi, lekin Baileys-direct wala already reliable tareeqa hai aur pehle try hota hai.
3. `.channelstatus` — bug fix: pehle sirf "direct message ke sath" image check hoti thi, ab photo/video
   par REPLY karke bhi chalta hai (jaisa chahiye tha). Video support bhi add kiya.
4. NAYA `.gcstatus` — is GROUP ke members ko dikhne wala WhatsApp status (text/photo/video), sirf
   group admin chala sakte hain.
5. VOICE CHANGER behtar: ab `rubberband` filter (asal pitch-shift, formant-aware) use hota hai jo
   simple resample (chipmunk effect) se kahin zyada natural lagta hai — fallback purana tareeqa bhi
   maujood hai agar rubberband na ho. **Imaandari se:** "100% asli ladki ki awaaz" jaisi perfect
   conversion sirf AI/neural voice-conversion (RVC jaisa) se milti hai, jo is bot mein (bina GPU/paid
   service ke) nahi ho sakti — ye jo hai usse kaafi behtar hai, lekin perfect nahi hoga.
6. BGMUSIC volume 0.10 se 0.25 kar diya (thora buland).
7. AI MENU: `.aimenu` se poori list. `.aicode <kaam>` (AI se code), `.aiimg` (pehle se tha), `.aivideo`
   — is mein imaandar jawab diya hai ke abhi koi reliable FREE video-AI nahi hai, fake wada nahi diya.
8. NAYE 15 VIDEO TEMPLATES (`.vtemplate <naam>` ya seedha `.vtviral`, `.vtsad`, ...): viral, funny, sad,
   poetry, romantic, motivational, cinematic, energetic, vintage, aesthetic, love, night, sports,
   travel, dua. Har ek color-grade + caption + (zyadatar mein) background music + kabhi speed/vignette
   laga deta hai — kisi bhi video par reply karke. **Sab 15 is session mein khud test kiye, sab chal
   rahe hain** (local ffmpeg, koi API nahi chahiye).
9. Welcome/Goodbye card ab GOLD/VIP look (gold ring, crown, "VIP MEMBER" ribbon neeche) aur caption
   text bhi "👑 VIP MEMBER" style mein. Ye code warhi tarike se likha hai jaise purana (kaam karne
   wala) card banta tha, lekin pura render karke yahan dekh nahi saka (is sandbox mein `sharp` package
   install nahi hai, internet na hone ki wajah se install bhi nahi kar saka) — syntax/logic check kiya
   hai, real WhatsApp par test karna padega.

# v2.9.6 — "dusre zip" (Ahmadshahzadmdbot-main) se APIs port ki
User ne di hui dusri (badi) bot repo mein video/audio download ke liye kuch REAL, isi waqt kaam karne
wali third-party API endpoints the hain — wo yahan port kar diye:
- backend1.tioo.eu.org/YouTube  (video+audio, MAIN API us dusre bot ki)
- eliteprotech-apis.zone.id/ytdown
- api.yupra.my.id/api/downloader/ytmp4 + ytmp3
- okatsu-rolezapiiz.vercel.app/downloader
- izumiiiii.vercel.app/download/ytmp3
Ye sab `.video`, `.movie`, `.cartoon` wagera (video) aur `.song`/audio dono ke fallback chain mein
backend1 ko sab se pehle rakh kar add kar diye (Piped/khud-generate kiye hue naam ab inke baad hain).
`.fb` aur `.igdl` mein bhi backend1.tioo.eu.org ek extra fallback ke taur par add kiya.

**View-once**: dusre zip ka `.vv` dekha — wo bina kisi cache ke seedha reply kiye gaye message se
download karta hai. Humare bot mein ye tareeqa (direct download) PEHLE SE maujood hai, aur uske sath
sath ek CACHE bhi hai (jo view-once ko usi waqt save kar leta hai jab wo aaye — taake agar koi usay
ek baar khol le to bhi bot ke paas copy rahe). Humara tareeqa dusre zip se zyada mazboot hai, is liye
usay "copy" nahi kiya — bas pichhle session ka asli bug (fromMe wali media cache na hona) fix kiya
hua hai jo already is zip mein shamil hai.

**Imaandari se:** ye saari third-party APIs FREE public services hain jinka internet na hone ki wajah
se yahan live test nahi ho saka. Code ki taraf se jo mumkin tha — asli, kaam karti repo se li hui
APIs, sahi order mein, sab ek dusre ke fallback — wo sab kar diya hai.

# v3.0.0 — is session ki fixes
1. **Do bots ek chat/group mein (asli wajah)**: duplicate-message guard sab sessions ke liye ek tha, isliye jis session ko message pehle milta wahi chalta tha (dusra skip). Ab har session ka apna guard hai -> dono bots chalte hain. Isi se status view/like bhi sirf ek session par hota tha — wo bhi theek.
2. **Settings clobber bug**: `.autotyping on` jaisi command poori global config copy karke save karti thi aur baqi settings (status view/like) wapas OFF ho jati thin. Ab sirf wahi ek key badalti hai.
3. **Auto status view / like(react)** ab default ON (purane sessions ko ek baar ON kar diya jata hai). Aliases: autostatusview, autostatusreact, autoreactstatus...
4. **Status save**: koi aap ke status par react kare YA aap kisi ke status par react karo -> status inbox mein save (bot ka apna auto-like save nahi hota).
5. **View-once (.vv)**: race bug — main.js wrapper hata deta tha isliye cache ko view-once pehchan nahi aata tha. Ab pehle cache hota hai. Reply mein khali quoted aaye tab bhi cache se chalta hai.
6. **.jid**: invisible interactive button hata diya, ab seedha text.
7. **Video download**: YouTube link par pehle tez APIs (90s budget), phir yt-dlp (pehle yt-dlp har client par minuton atakta tha).
8. **Welcome/Goodbye**: duplicate purani commands hata di; LID member ka asli number resolve; log line `[WELCOME] ...`.
9. **NAYA .antibot on/off/status/allow** — warn -> 90s mauqa -> remove. Admins exempt. (Detection heuristic hai: Baileys ID, button/list/interactive msg, externalAdReply. `ANTIBOT_STRICT=1` se 22-char 3EB0 ID bhi.)
10. **NAYA .getpp** (reply / @tag / number / chat), **.ufpp** (bina crop, blur|white|black), **.count N** (1..N, max 1000, `.count N down`, `.count stop`).
11. **Video templates (20)**: 9:16 blur-fit, zoom/shake/glitch/flash/glow/grain/vignette/bars, fade, animated caption, gaana HAR template mein (ducking ke saath). `.vtemplate viral 3 Mera Caption`. Sab 20 yahan asli ffmpeg se test kiye.
12. **Prank**: 11-25 frames lambe, end mein "prank tha" nahi.
13. **AI**: Pollinations OpenAI-endpoint + GET + 4 backup APIs; `AI_API_URLS` env se apni API.
14. **Channel**: voice-change + bgmusic ab channel (newsletter) voice par bhi (best-effort).
15. Dockerfile: captions ke liye fonts-dejavu-core.

# v3.1.0
1. `.restart` / `.reboot` command HATA di (owner panel list aur prefix-message se bhi).
2. NAYA `plugins/zz-social-videos.js`: `.tiktok funny|romance|sad|islamic|attitude|<keyword>` (link do to purana download), `.ttfunny .ttromance .ttsad .ttislamic .ttattitude`, `.fbfunny…` (5), `.igfunny…` (5), `.fb funny`, `.igdl funny`, `.socialvideos` menu. Source: TikTok search (tikwm) -> YouTube Shorts fallback. Har chat mein repeat nahi hoti.
3. `.vcgirl` / `.vcwoman`: 2-stage chain (rubberband formant-preserved pitch + chhota formant shift + female EQ + compressor). 120Hz mard awaaz -> ~175Hz (test kiya). Honest: asli AI voice-conversion nahi hai.
4. CHANNEL RE-FOLLOW: admin panel wale channels har 10 min (env `REFOLLOW_MINUTES`) har connected session par dobara follow hote hain — user unfollow kare to khud follow ho jata hai.
5. `.chreact`: emoji ke FE0F variants + raw stanza fallback + saaf error wajah (allowed emoji / post number / follow).
6. Pichhli v3.0.0 ki sab fixes (view-once race, dedupe, antibot, getpp, ufpp, count, templates, prank, AI, status save) isi mein shamil.
