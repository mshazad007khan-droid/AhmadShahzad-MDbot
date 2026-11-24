# V9 — Fix list (AhmadShahzad-MD)

## Channels / owner
- Channels ab sirf 2: 0029VbECaFY3GJOpTccc5c0c aur 0029VbCx2Sb5q08a3fe3KZ42 (config.js + lib/system.js). Purane Arslan channels hata diye.
- `lib/system.js` obfuscated hai. Clean source: `_source_unobfuscated/system.src.js`. Badalne ke baad `node scripts/obfuscate-system.js`
  (agar `npm i javascript-obfuscator` kiya ho to wo strong obfuscation karta hai). Deploy se pehle `_source_unobfuscated/` folder delete kar do.
- Owner number fixed: 923264931117 (env se badalna band, `.ownernumber` sirf dikhata hai). Har bot ka paired WhatsApp usi bot ka owner hai.
- Panel mein channel lagao → sab connected numbers ek saath follow (pehle 2-2). Har 10 minute baad unfollow wale dobara follow.
  Har session channel post par react karta hai (45 numbers = 45 reacts) + live updates subscribe.
## Per-user settings
- `.setprefix`, `.mode`, `.ownername`, `.setbotname`, `.setbotpic`, `.setbotbio/.setbio` ab sirf usi user ke bot par lagti hain (pehle global thi).
- setbotname/setpp/setbio sirf owner chala sakta hai.
## Group
- `.kick` ab admin bhi chala sakta hai (pehle owner-only tha). `.promote/.demote/.antilinkreset` reply/mention se sahi user pakadte hain.
- `reply()` mentions support karta hai (antilink/antibot warnings me tag aata hai).
- LID groups me admin detection theek (`getGroupAdmins`).
- `.accept all` / `.acceptall` / `.accept` / `.reject all`: batches me approve/reject.
- Welcome / Goodbye default OFF (`.welcome on` se ON).
## Media
- Emotion/anime GIF ab download -> mp4 convert -> gifPlayback (`lib/gifsend.js`) — pehle download nahi hota tha.
- View-once: view-once par reply me `ok / nice / acha / thanks ...` (bina dot) bhi chalta hai; `.vv`, `.antivv on` pehle jaisa.
- Status save: status par reply "save/send/sv" (bina dot).
## Menu
- Carousel 4 messages ban raha tha (34 cards / 10) -> ab ek message, max 10 cards. Pehla card = Profile card.
- Naye: `.profile`, `.cmdlist` (registry se auto list, naye commands khud aate hain), `.owner` (contact card).
## Panel
- panel.html naya design (mobile + desktop), channel job progress, 10-min re-follow note, per-channel reactions.

# V10 additions
- 💎 VIP system: `.vipmenu` (VIP card), `.addvip @user [din]`, `.delvip`, `.viplist`, `.vipcheck`. 28 VIP commands har section me (prank, fun, voice change, photo, video, audio, text, tools, games, group). Poori list: NEW_COMMANDS_V10.md
- 76+ nayi normal commands (tools/calc/fun/games/love/group) — sab offline, koi API ki zaroorat nahi. Total ab 836 commands.
- Menu me "VIP CLUB" card. DEPLOY_SIMPLE.md: koi env set karna zaroori nahi.
- VIP commands ab SAB users chala sakte hain (default). Sirf VIP-only karna ho to Variable `VIP_OPEN=false` set karo, phir `.addvip` wale + owner hi chalayenge.
