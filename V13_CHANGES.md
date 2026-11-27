# v13 — fixes (2026-11-27)

## .rs / .was (sticker react)
- Sticker ab message ke BORDER par chhote react ki tarah jata hai (contextInfo: stanzaId + participant, quote-box nahi).
- Agar aapke WhatsApp par ye na dikhe: Railway/host Variables mein `RS_MODE=quoted` rakho (purana tareeqa). Border fail ho to khud quoted par chala jata hai.

## .me (+ .mebass .meecho ... .normalizeaudio .fadeaudio .loopaudio)
- BUG: bgmusic / voice-changer hook bot ki apni .me wali voice ko pakad kar music mix karta aur ORIGINAL DELETE kar deta tha -> voice gayab. Ab lib/skipvoice.js se bot ki command-voice skip hoti hai.
- Reply kisi bhi type ke message par chalta hai; opus encode ka fallback.

## .chforward
- BUG: `forward: { key: <string> }` galat tha + channel media ki mediaKey nahi hoti -> "forward ho gaya" likhta tha, jata nahi tha.
- Ab media (gaana / voice / video / photo / sticker / document) download karke nayi media ki tarah bheji jati hai.
- Target: group jid, group invite link, number, `here`. Ek saath kai: `.chforward jid1 jid2`. Asli error batata hai. (lib/chforward.js)

## TikTok
- Naya provider `pagescrape`: TikTok ka apna page parh kar video nikalta hai (third-party API band hon tab bhi chalta hai) + tiklydown mirror. Sab fail ho to yt-dlp (pehle jaisa).

## Pinterest (.pinvideo / .pinterest)
- Page ke andar chhupe mp4 / hls links nikalte hain; video buffer se bheji jati hai.

## Menu
- Naya style: ┏❖ box, ➜ rows, small-caps / bold headings (profile, category cards, full list).

## .movie
- Sirf free/legal sources (Internet Archive + YouTube). YouTube par server IP block ho to `YTDLP_COOKIES_B64` set karo. Masla rahe to `.dltest` chala kar result bhejo.

## v13.1
- .url / .url1-5: link ab HAMESHA seedha text mein aata hai (interactive Copy/Open buttons audio/video/document par invisible hote the — ab sirf extra). Download aur "upload ho raha hai" parallel. Naye hosts: Litterbox, Qu.ax.
- Menu buttons: "CHANNEL 1 / 2" hata kar sirf "📢 VIEW CHANNEL"; "📜 ✦ ALL COMMANDS ✦", "🏠 ✦ MENU ✦" aur category buttons (icon + bold naam + count).
- Speed: TikTok API wait 2.5s -> 0.7s, timeout 15s -> 10s; yt-dlp --concurrent-fragments 4; ffmpeg 3 saath; .rs gap 150 -> 90ms.
