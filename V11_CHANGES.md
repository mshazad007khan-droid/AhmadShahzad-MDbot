# v11 changes
- Menu: card 1 = profile (user ki DP GOL/circle mein + ring), image-2 jaisa design (┌〔 〕┐ box, "➤ .COMMAND" lambi list). Har category ka apna card, ek hi message mein 30 tak swipe.
  - Agar WhatsApp 10 se zyada cards na dikhaye to Railway Variable: CAROUSEL_MAX_CARDS=10 (categories khud milkar 10 cards ban jati hain).
  - Card ki lambai: CAROUSEL_LINES (default 26 commands per card).
- .cmdlist: saari commands EK hi message mein.
- .chpoll <poll link> <option>: sab connected users ki taraf se vote (option = 1/2/A/B ya poora naam). .chpollme = sirf apna vote. Asli WhatsApp vote stanza (sock.query) use hota hai.
- .chstatreact / .chreact: paired users ko ab "sirf bot owner" nahi aata (LID/alt number fix in main.js + lib/premium-check.js isSessionUser).
- Emotions (dance, hug, cry ...): 4 GIF sources + text-animation fallback; .ok/.hi/.yes/.no jaise aliases hata diye (.ok = view-once ke saath clash tha). Text animations (.heart .moon ...) ab sahi edit karti hain; happy/sad/angry text wale ab .happyemoji .sademoji .angryemoji.

## v11.1 — Audio "me" pack (plugins/audio-me-pack.js) → total 850 commands
- `.me` (audio/gaane par reply): usi audio ko VOICE NOTE bana kar hamari taraf se bhejta hai → card par orange icon ki jagah hamari profile photo.
- Voice-note effects: .mebass .meecho .medeep .menight .mereverse .mereverb
- Tools: .normalizeaudio .fadeaudio [sec] .loopaudio [2-5] .unptt (voice → MP3 file) .audioinfo

## v11.2
- NEW plugins/sticker-react.js: .sts <name> (sticker par reply = save) · .sts list/del/clear · .rs <n> (combo) · .rs <name> <n> · .was [name] · .rs stop
  - Env: RS_MAX (default 10000), RS_DELAY_MS (default 150)
- Menu card 1 tarteeb se (Profile / Bot Info boxes); category cards ka style same family mein.
- Owner number / Chat Owner button menu se hata diya — number sirf .ownernumber (aur .owner) se.
- Har card par channel button ghoomta hai: card1 = channel 1, card2 = channel 2, card3 = channel 1 ... (Env MENU_CHANNELS="link1,link2,link3" se badal sakte ho)

## v11.3
- plugins ab 2 folders mein: plugins/ (48 files) + plugins2/ (42 files) — GitHub upload mein 100 file limit nahi aati. main.js dono folders ko A-Z ek saath load karta hai (load order pehle jaisa).
  Naya plugin kisi bhi folder mein rakh do, khud load hoga.
- TikTok: lib/tiktok-dl.js — 7 APIs ek saath (tikwm, lovetik, tiklydown, ryzendesu, siputzx, vreden, agatz), video buffer se bheji jati hai, photo slideshow bhi; sab fail ho to yt-dlp. Naya: .ttmp3 (gaana).
- Movie: plugins2/zz-movie.js — .movie <naam> (info card + full movie), .movieinfo <naam>, naam na ho to usage.
- Ping: plugins2/speed-ping.js — .ping (speed ms, uptime, RAM, CPU, users). .speed/.latency/.pong bhi yahi.
