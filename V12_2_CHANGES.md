# v12.2 changes

## 🎨 CUSTOMIZE section (menu mein alag category: `.menu customize`)
Har user (paired number) ki settings SIRF uske apne bot par lagti hain.
| Command | Kaam |
|---|---|
| `.botname <naam>` | Bot ka naam — menu, alive, **download / search / song / video ke captions**, footer, owner card, sab jagah |
| `.botpic` (photo reply / link) | Menu + alive ki bot photo |
| `.botdescription <text>` (`.botdesc`) | Description — menu profile card + alive mein |
| `.ownername <naam>` | Owner ka naam |
| `.ownerpic` (photo reply / link) | Owner photo — menu owner card, alive, welcome card |
| `.ownernumber <number>` | Owner ka dikhne wala number (control/ownership nahi badalta) |
| `.customize` / `.mybrand` | Abhi ki settings dekho |
| `.resetbrand` | Customize sab default |
Har command ke saath `reset` likho to wo cheez default (jaise `.botname reset`).

- Naam har bheje gaye message mein lagta hai (`main.js` sendMessage wrapper + `lib/userbrand.js`). Jis user ne kuch set nahi kiya uske liye koi farq nahi.
- **"Meta" wala verified/quoted card waisa hi hai** — `options.quoted` ko code chhoota hi nahi.
- **Dobara pair / naya pairing / logout = sab reset** (naam, pic, owner, prefix, mode, welcome settings, auto-status ...) — `UB.resetAll()`.

## 📋 Copy buttons
- Naya `lib/copybtn.js` — WhatsApp native "📋 Copy" button (menu cards wala `biz/native_flow` tareeqa; pehle ka tareeqa WhatsApp dikhata hi nahi tha).
- `.jid` (aliases: `.gid .cid .channeljid .channelid`) — user / group / channel ID par 📋 Copy JID.
- `.pair` / `.pair2` — code ke saath 📋 Copy Code.
- `.tempmail` — 📋 Copy Email, `.img2url` / `.readmore` — button ab sach mein aata hai.
- Button na dikhe to message code-block ke saath aata hai (long-press se copy) — kabhi khaali nahi.
- Web pair page: copy ab insecure/old browser mein bhi chalta hai.

## 🐞 Bug fixes
- **MongoDB user-config bug**: schema strict thi, isliye `PREFIX / WORK_TYPE / OWNER_NAME / MENU_BOT_NAME` jaisi custom keys cache expire (5 min) ke baad MongoDB se gum ho jati thin = setting reset. Ab `config` Mixed hai, har key bachti hai.
- `.botpic` pehle WhatsApp profile photo badalta tha (`.setpp` ka alias) — ab menu photo; WhatsApp DP ke liye `.setpp`.
- `.ownerpic` pehle sirf on/off tha; `.ownername` / `.ownernumber` ab per-user.
- `botpics` / `menu-owner` ab `DATA_DIR` (Railway volume) mein — restart par photo nahi jati.
- `package.json`: `axios/dotenv/cheerio` "latest" tha (naya major aane par build toot sakta tha) — pin kiye.

## 🔗 `.url` — media ko link banao (plugins/zz-url.js)
Photo / video / audio / document / sticker bhejte waqt caption mein `.url`, ya kisi media par reply karke `.url`. Link ke saath 📋 Copy Link + 🌐 Open button.
`.url` auto · `.url1` Catbox · `.url2` Uguu · `.url3` Tmpfiles · `.url4` ImgBB (sirf photo) · `.url5` 0x0.st. Chuni host fail ho to baqi khud try hoti hain. Max 100MB.

Menu mein alag **HOST** section (`.menu host`): `.URL (auto)`, `.URL1 (Catbox)`, `.URL2 (Uguu)`, `.URL3 (Tmpfiles)`, `.URL4 (ImgBB · photo)`, `.URL5 (0x0.st)` — cmd({ menuHint }) se kisi bhi command ke aage bracket likh sakte ho.

## 📌 `.pinphoto` / `.pinvideo` (plugins/zz-pinterest.js)
`.pinphoto <pin link>` photo (original quality) · `.pinphoto <search> [1-5]` search se photos · `.pinvideo <pin link>` video · `.pinvideo <search>` video pins. Download section mein. Purani `.pinterest` waise hi chalti hai.
