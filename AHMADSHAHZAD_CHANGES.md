# AhmadShahzad-MD — changes
- Bot name: 𝐀𝐡𝐦𝐚𝐝𝐒𝐡𝐚𝐡𝐳𝐚𝐝-𝐌𝐃 | Owner: ᯽𓆩͛ꜛ𝜦𝑯𝑴𝜦𝑫𝑺𝑯𝜦𝑯𝒁𝜦𝑫ꜛ𓆪᯽ | Number: 923264931117
- Channel: https://whatsapp.com/channel/0029VbCx2Sb5q08a3fe3KZ42 (old channels/links removed; auto-follow uses only this)
- Photos: data/assets/banner.jpg (menu + connect message), data/assets/owner.jpg (owner card, .alive, .ping)
- Song: data/menu-voice/menu.mp3 (sent after .menu)
- Env override: BOT_NAME, OWNER_NAME, OWNER_NUMBER, CHANNEL_LINK etc. still work from Railway variables.
  NOTE: if you set BOT_NAME / OWNER_NAME in host variables they override these defaults.
- Renamed: .amanjagar -> .ahmadjagar, .amankijan -> .ahmadkijan (old names still work as aliases)

## v2 additions
- plugins/ahmad-pack.js: 84 new offline commands (categories: textfx, calc, funzone) — all tested, listed in .menu pages
- pair.html created (pair website with name, owner photo, Telegram, Portfolio "Open first site", channel)
- .owner card now also shows Telegram + Portfolio

## v3 — Admin panel + channel manager
- Open https://YOUR-SITE/panel  → login with AHMAD_PANEL_TOKEN (set it in Railway Variables)
- Channels section: add a WhatsApp channel link → every connected number follows it; every NEW paired number follows it automatically
- Channels are saved in MongoDB (if MONGODB_URI set) else in DATA_DIR/channels.json (use a Railway Volume)
- Files: panel.html, lib/channels-store.js, routes in main.js (/api/panel/channels...)

## v4 — merged new zip (fix28)
- Naye zip ki fixes + 3 nayi plugin files (autoreact-chat, dltest, forwardall-links) + new commands (autoreact, dltest, setownerpic/ownerpic/resetownerpic) merge hui; menu/categories jaise the waise rahe
- Menu ke end ke buttons: Portfolio (Open first site), Telegram, Channel, Chat Owner
- Song: data/menu-voice/menu.mp3 (new)  |  Connect video: data/assets/connect.mp4 (15s, user ke inbox mein connect par)
- Panel: Groups (auto-join) — group invite link add karo, sab connected numbers + naye pair hone wale numbers join karte hain
- Fixes: .owner card (opts bug), .zikrstart (backtick bug)

## v5 — big fix pack (2026-11)
- Pair code: hamesha fixed `AHMADXMD` (WhatsApp mein AHMA-DXMD dikhta hai). Koi env variable ab isay nahi badalta.
- .vv fix: view-once media bot aate hi cache kar leta hai (lib/extras-hooks.js) -> .vv/.ok/.nice hamesha chalta hai; sirf owner ke apne inbox mein aata hai.
- .antidelete: delete hua message ab DEFAULT mein owner ke apne inbox mein aata hai (media bhi). `.antidelete chat` = usi chat mein, `off` = band.
- .statussave on/off: owner ke status par koi react kare to wo status owner ke inbox mein save (default ON). Sirf wahi status jo bot online hone ke baad aaye.
- Menu: ab ek hi swipe carousel (info card + har category ka card). Next/First Page buttons hata diye. `Open All` dabao to poori list. Env CAROUSEL_CARDS_PER_MSG (default 10): ek message mein kitne cards; zyada hon to agle carousel khud aa jate hain.
- Naye commands: .cartoon .movie .romance .couple .islamicvid (video-pack), .bgmusicvoice, .fancyname .vipsymbols, .statussave, pranks: .hackprank .virusprank .bombprank .ghostprank .locationprank .policeprank .simprank
- .bgmusicvoice: pehle ye likho, phir voice note bhejo -> har baar nayi music ke saath wapas aati hai. `.bgmusicvoice on/off` = hamesha. data/bgmusic/ mein apni mp3 rakh sakte ho.
- Download captions: VIP box style (main.js applyFooter); welcome/goodbye naya VIP design (lib/welcome.js).
- .video/.drama: ytdl-core fallback + saaf error wajah; islamic video errors ab asli wajah batate hain.
- .chreact: channel follow karke retry, emoji validation. Channel poll vote: Baileys mein vote API na ho to saaf message.
- npm run check ab sab files check karta hai.

## v6
- .vv ab usi chat mein media bhejta hai.
- Connect par ek lambi VIP list (saari commands); .menu = swipe carousel (3 messages, button nahi).
- Video commands ek category (video): cartoon movie romance couple islamicvid videosong video drama naatvideo animevideo ...
- photoedit (40) / videoedit (32) / audioedit (15) = 88 naye edit commands (enhance, hd, sharpen, vtrim, vspeed, bass, nightcore ...). Media par reply karke use karo.
- bgmusic: data/bgmusic/bgmusic1-3.mp3; `.bgmusicvoice 2`; music 10% awaaz.
- .raju -> .ahmad (raju alias bhi chalta hai).
- Welcome/goodbye: DP card, har baar nayi shayari, default ON.
- YouTube block: data/cookies.txt rakho ya YTDLP_COOKIES_B64 / YTDLP_PROXY env.
- Total 606+ commands.
