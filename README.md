# Vocabulario · Multi-language Flashcards

Personal Anki-style flashcard app with bidirectional study and Excel import.

## Features

- **Excel import** — first row is language codes (EN, ES, IT, DE, NL, RU, FR, PT, JA, ZH), each row is one word in each language.
- **Language pair decks** — pick which language pairs to study. Each pair is a separate bidirectional deck with its own progress.
- **Bidirectional cards** — each pair shows both directions (e.g. EN→ES and ES→EN) mixed in one session, with a small flag indicator showing direction.
- **Spaced repetition** (SM-2 inspired) — Again / Hard / Good / Easy ratings; harder words come back sooner.
- **5 new cards per deck per day** added automatically.
- **Trash icon on each card** during review.
- **Add words manually** to any active deck — adds both directions automatically.
- **Per-deck stats** — separate streak, totals, daily count for each pair.
- **Bad-row filtering** — `#VALUE!`, blanks, and formula errors get skipped on import.
- All data saves to your browser (localStorage).

## Excel format

| EN     | ES        | IT      | DE      | NL     | RU       |
| ------ | --------- | ------- | ------- | ------ | -------- |
| Green  | Verde     | Verde   | Grün    | Groen  | Зеленый  |
| Yellow | Amarillo  | Giallo  | Gelb    | Geel   | Жёлтый   |

The first row must be language codes. Supported codes: `EN`, `ES`, `IT`, `DE`, `NL`, `RU`, `FR`, `PT`, `JA`, `ZH`. Other codes work too — they just show 🌐 instead of a flag.

## Deploy to Vercel

### Easiest path: GitHub + Vercel web UI

1. Sign up at [github.com](https://github.com) (free).
2. Create a new repository called `vocabulario`.
3. Click **uploading an existing file** and drag the *contents* of this folder (the files inside, not the folder itself) into the upload area. Click **Commit changes**.
4. Go to [vercel.com/signup](https://vercel.com/signup), sign in with GitHub.
5. Click **Add New… → Project**, find your repo, click **Import**.
6. Vercel auto-detects Vite. Click **Deploy**. Done — you get a live URL in ~30 seconds.

### Add to your phone

- **iPhone**: Open the URL in Safari → Share → **Add to Home Screen**
- **Android**: Open in Chrome → menu (⋮) → **Add to Home screen**

It opens fullscreen with its own icon — feels like a native app.

## Run locally first (optional)

```bash
npm install
npm run dev
```

Then open the URL it prints (usually http://localhost:5173).

## Notes

- Progress saves per-device. Studying on phone and laptop = two separate decks. Cloud sync would require accounts + a backend.
- Re-importing the Excel **wipes all existing decks and progress** — by design.
- The trash icon only removes the card you're currently viewing (the opposite direction stays in your deck unless you trash it too).
