# v13.5 — fixes (2026-11-28)

## .as (sound sticker) — PRIVATE CHAT (DM) FIX
- Group mein sahi tha, chat mein sticker alag / sada aata tha. Wajah: DM mein Baileys apne doosre devices (aapka phone) ko message
  `deviceSentMessage` ke andar lapet kar bhejta hai, aur hamara hook sirf seedha stickerMessage dekhta tha.
  Ab dono (seedha + deviceSentMessage) mein sound-sticker data lagta hai (lib/soundsticker.js). Offline test se verify.
- Audio check ab async (pehle spawnSync tha jo ffmpeg busy hone par poore bot ko atka deta tha).

## .chforward — channel par gaana / voice / video
- Baileys channel (@newsletter) par `seconds`, `waveform`, thumbnail, width/height khud nahi nikalta -> gaana/voice "gaya" dikhta tha magar nazar nahi aata tha.
  Ab ye sab khud nikalte hain; audio hamesha ogg/opus; video WhatsApp-safe mp4 + thumbnail; photo ka size + thumbnail.
- Ek tareeqa fail ho to dusra (voice <-> audio) khud try hota hai.
- Naye options:  `.chforward <jid/link> voice`  (voice-note ki tarah)   |   `.chforward <jid/link> audio`  (gaane ki tarah)
- Channel ki apni post (mediaKey nahi hoti) ab seedha CDN se uthai jati hai (kachra decrypt nahi hota).

## NAYA: Converter menu  (.vmenu)   — plugins2/video-convert.js
Video / audio par REPLY karo, ya video bhejte waqt caption mein likho:
- Audio:    .mp3  .mp3hq  .m4a  .wav  .opus  .vn (voice note)  .mute (awaaz hatao)
- Quality:  .144  .240  .360  .380  .480  .540  .720  .1080
- Tools:    .mp4  .gif  .note (gol video)  .doc  .compress low|mid|high  .frame 5
- Edit:     .trim 5 15  .slow  .fast  .vreverse  .rotate 90   (+ purane .vspeed .vloop)
- `.mp3` / `.mp4` / `.gif`: reply mein video/audio ho to converter chalta hai; warna purani command (song / video / emotion) pehle jaisi.
- Purani commands (vtrim, vspeed, vloop, vcompress, vthumb ...) ko bilkul nahi chheda.

## Bot kabhi kabhi 10-15 minute band — fixes
1. SELF-HEAL (lib/selfheal.js): har 60s WhatsApp ko halka ping. 2 baar jawab na aaye to zombie socket gira kar 1.5s mein reconnect.
   (Pehle socket "connected" dikhta tha magar half-dead hota tha, isliye watchdog kuch nahi karta tha.)
   Env (optional): SELF_PING_MS=60000  SELF_PING_FAILS=2
2. Reconnect ka intezar ab max 45 second (pehle 5 minute tak barhta tha).
3. Mongo slow ho to har message nahi rukta: config ab stale-while-revalidate + 3s timeout (lib/database.js).
4. Logs mein `[LAG]` (bot atka), `[SELFHEAL]` (zombie pakda), `[MEM]` (RAM). Optional: MAX_RSS_MB=900 -> RAM is se upar jaye to saaf restart.
5. IMPORTANT: same WhatsApp session ek hi jagah chalni chahiye (Railway replicas = 1, local / purana host band). Do jagah chalne par
   "connection replaced" ho kar dono bar-bar ek doosre ko gira dete hain — ye bhi "10-15 minute band" ki bari wajah hoti hai.
