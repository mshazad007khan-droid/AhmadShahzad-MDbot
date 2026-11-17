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
