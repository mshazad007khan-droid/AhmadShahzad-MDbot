# AhmadShahzad-MD v7  (v6 ka design/speed/menu jaisa ka taisa)

## Naye 50 commands (doosri zip se + naye)
AI (multi-API fallback): chatgpt gemini blackbox explain summarize research aicodefix aitranslate aiurdu aiwebsite
         3dlogo img2prompt photoedit vision vocalremover
Download/Media: yt mediafire gdrive capcut img wallpapers yts ytthumb sticker
Tools: define npm obfuscate readmore urdu image2url lyrics ssweb take tempmail gitclone apicheck currency crypto
       truecaller (alias: simcheck, number) = number ka country/region/operator
Group/Owner: mute unmute delete vcf taggroups giveaway block unblock unban vvdm save
(v6 ki kisi command ko override nahi kiya; sirf naye naam add hue.)

## Fixes
- .vv: 5-tareeqe wali retrieval (cache -> quoted -> store -> re-upload request), sab message types ke reply, error sirf owner DM mein.
  Naya `.vvdm` (= .vv2) media sirf aap ke inbox mein. Toota hua purana vv2 (fresh-pack.js) hata diya.
- Status save: kisi bhi status par reply karke `save` / `send` / `sendme` (dot ke saath ya bina) -> aap ke inbox mein.
  main.js ka loop-guard in lafzon ke liye khula. `.statussave on/off` (react par auto-save) pehle jaisa.
- Video/audio: media-dl.js ki API chain mein princetech + giftedtech + siputzx/vreden mp3 add.

## Test
`node --check` sab files par pass. .vv aur status-save ke 17 mock tests pass (WhatsApp/internet ke bina).
