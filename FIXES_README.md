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
