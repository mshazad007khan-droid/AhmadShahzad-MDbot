# AhmadShahzad-MD v8  (v7 + neeche ki cheezen)

## 1) Pairing fixes ("could not link device" / dobara pair na hona)
- ASLI WAJAH: sab ke liye ek hi FIXED code (AHMADXMD) tha. Ab har baar WhatsApp khud naya code banata hai.
  (purana chahiye to env PAIR_CODE_FIXED=1)
- Adhoori pairing ka aadha session MongoDB mein bach jata tha aur har naye pairing par wapas aa kar kharab karta tha -> ab saaf hota hai.
- Purana/mara hua session (3 min se zyada disconnected) ho to /code naya code dene se pehle use khud saaf kar deta hai.
- Ek banda (IP) ek waqt mein MAX_PER_IP = 3 numbers laga sakta hai (env se badal sakte ho).

## 2) Kashmir menu  (.kashmir ya .menu kashmir) — 20 commands
BG music: .kbgmusic1 on .. .kbgmusic4 on (.kbgmusic list/off) — music 35% / awaaz 65%, gaana shuru se. Purani .bgmusic se alag, dono ek saath nahi chalte.
Media: .kphoto (har baar nayi) .kvideo (TikTok) .ksong .kvideosong
Baqi: .kshayari .ksad .kquote .kdua .kfacts .kfood .kkahwa .knoonchai .kweather .knamaz .kplaces
Gaane tumhari 4 videos se audio nikal kar: data/kbgmusic/kbgmusic1-4.mp3

## 3) Channel react
- .chreact <post link> <3-4 emoji>  -> jitne bot users connected, SAB react (emoji aapas mein baant diye jate hain)
- .chstatreact <channel link> <emojis> -> us channel ki HAR NAYI post par sab bot users khud react. off / list bhi hai.

## 4) View-once (.vv, .vvdm) aur status save (save / send / sendme) — v7 wale fixes shamil.

## 5) GitHub upload fix (plugins folder 100+ files)
- GitHub web upload ek baar mein max 100 files leta hai. plugins/ mein 119 files thin.
- `plugins/ported-commands/` (34 files) ab project root par `ported-commands/` hai. plugins/ mein ab sirf 85 files hain.
- Koi command nahi kati. Loader (plugins/zzz-ported-commands-loader.js) naye path se load karta hai.
- Upload ke liye: pehle plugins folder, phir ported-commands folder alag alag upload karo.
