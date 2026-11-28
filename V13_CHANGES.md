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

## v13.2
- .pinvideo: "This video isn't available because something is wrong with the video file" fix — HLS (.m3u8) / HTML / kharab file pehchan kar mp4 mein badalta hai; har video ab ffmpeg se WhatsApp-safe mp4 (faststart, h264/aac) banti hai (lib/safevideo.js). TikTok / social video par bhi laga hai.
- .ufpp: ab default = POORI photo, aspect ratio ke saath, bina crop (direct WhatsApp ko). Na chale to blur-square. Modes: .ufpp | blur | white | black
- Welcome / Goodbye: action ke naam ('leave', 'invite' ...) ab pehchane jate hain, member id (LID) sahi, fail ho to seedha text fallback; logs mein "[WELCOME] event ..." aata hai. (Group mein `.welcome on` / `.goodbye on` zaroori hai — default OFF hai.)
- .chforward: channel ka link (whatsapp.com/channel/...) ya @newsletter jid par bhi; gaana channel par reject ho to opus voice ki tarah bhejta hai.
- .me: ptt send fail ho to retry; log "[ME]".
- .rs: contextInfo se remoteJid hata diya (border-react ke liye minimal reply).

## v13.3
- NAYI command: `.audiosticker` (short: `.as`) — video par reply karo. `.as 6` (pehle 6 sec), `.as note` (gol video-note awaaz ke saath), `.as sticker`, `.as voice`. (plugins2/audio-sticker.js)

## v13.4 — NATIVE SOUND STICKER
- `.as` ab WhatsApp ka asli sound sticker bhejta hai (sticker par speaker icon, tap karo to video ki awaaz): alag animated WebP + Ogg/Opus upload, protobuf field 134 (lib/soundsticker.js — Baileys ke proto.Message.encode ko sirf isi sticker ke liye wrap karta hai, node_modules patch ki zaroorat nahi).
- Audio 2-pass Opus (stereo 64k -> mono 32k) taake "Couldn't play sticker sound" na aaye; max 9.9s.
- Native send fail ho to khud purane tareeqe par (sticker + voice note). `.as legacy` ya env `AS_MODE=legacy` se seedha purana tareeqa.
- Sound sticker sirf unhi ko dikhega jin ke WhatsApp mein ye feature aa chuka hai (abhi gradually roll out ho raha hai).
