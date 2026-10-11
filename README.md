# フツーに聞いてくれ · Just Listen to the Song (fan blog)

Live: https://dans-vsa.github.io/just-listen-fanblog/

Unofficial fan blog for the 2022 one-shot *Just Listen to the Song* (story Tatsuki Fujimoto, art Oto Tōda),
part of the [Fujimoto Archive](https://dans-vsa.github.io/fujimoto-archive/).

The site is a ride home on a commuter train at dusk, where the one-shot ends: a fixed cabin backdrop
(passing city, hand straps, bench), a door LED that names the current section, a line map as the progress bar,
and a phone held in a hand (the manga's platform panel) playing the confession video on "YouTude".

- Vanilla HTML/CSS/JS, no build. Design spec: `DESIGN.md` (Spotify base, train-car skin).
- Sections (stations): hero → Info (ticket) → Penumpang (cast) → Alur (scrollytelling phone, 6 steps) →
  Anomali (find 7 anomalies in the color art) → Lagu (strummable guitar) → spoiler gate → Akhir (earbud share) →
  Tema → Fakta (as comments) → Baca.
- Audio (`audio.js`) is fully synthesized with Web Audio: Karplus-Strong guitar, a wordless hum for the melody,
  rail ambience and door chime. It is not the song from the manga and contains no lyrics. Nothing plays before a click.
- Bilingual: Indonesian in the markup, English in `data-en` / `data-en-alt` / `data-en-cap`.
- Images in `assets/` © Tatsuki Fujimoto, Oto Tōda / Shueisha (English pages © VIZ Media): Jump+ key art and sample
  page (the sample page was descrambled from Jump+'s public preview), title page from the Fujimoto Archive,
  English pages via SOLRAD and CBR. Research files and scripts live in `.research/` (not deployed).
- After changing CSS/JS, bump `?v=N` in `index.html`.
- Japanese fonts (Zen Maru Gothic, DotGothic16) are loaded as a `text=` subset of the glyphs the page uses. If you add new
  Japanese text, rebuild the URL with `python .research/tools/font_subset_url.py index.html main.js` and replace it in `<head>`.
- Performance (Lighthouse 12, gzip + cache like a real host): mobile 89, desktop 99; Accessibility, Best Practices, SEO 100.
  Plain `python -m http.server` scores lower because it does not compress or cache.
- Copy rule: no em/en dashes in visible text.

Run locally: `python -m http.server 5540`
