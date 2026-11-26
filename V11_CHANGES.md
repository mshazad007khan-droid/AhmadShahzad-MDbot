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
