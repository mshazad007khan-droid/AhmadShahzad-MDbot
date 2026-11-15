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
