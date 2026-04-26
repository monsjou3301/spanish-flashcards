# Vocabulario · Spanish Flashcards

A personal Anki-style Spanish flashcard app with spaced repetition.

- 5 new intermediate Spanish words added automatically each day
- Tap to flip card, rate Again / Hard / Good / Easy
- Spaced repetition (SM-2 inspired) — harder words come back sooner
- Add your own words anytime
- All progress saved in your browser (localStorage)

---

## Deploy to Vercel (easiest, ~5 minutes)

### Option A — Drag & drop (no GitHub needed)

1. Go to [vercel.com/signup](https://vercel.com/signup) and create a free account.
2. Click **Add New… → Project**.
3. On the import page, look for the **"deploy from a template"** option, or just go to [vercel.com/new](https://vercel.com/new).
4. **Easiest path:** install the Vercel CLI on your computer, then in this project folder run:
   ```bash
   npm install -g vercel
   npm install
   vercel
   ```
   Follow the prompts (accept all defaults). Done — you'll get a URL.

### Option B — Deploy via GitHub (recommended if you want easy updates)

1. Create a free GitHub account at [github.com](https://github.com) if you don't have one.
2. Create a new repository (call it `spanish-flashcards`).
3. Upload all the files in this folder to that repo (you can drag & drop them in the GitHub web UI).
4. Go to [vercel.com/new](https://vercel.com/new), sign in with GitHub.
5. Click **Import** next to your `spanish-flashcards` repo.
6. Vercel auto-detects Vite. Click **Deploy**. Done.

You'll get a URL like `spanish-flashcards-yourname.vercel.app`. Bookmark it on your phone (Add to Home Screen on iOS/Android for an app-like experience).

---

## Run locally first (optional, to test)

```bash
npm install
npm run dev
```

Then open the URL it prints (usually http://localhost:5173).

---

## Adding more words to the built-in bank

Open `src/App.jsx`, find the `WORD_BANK` array near the top, and add objects like:

```js
{ es: 'palabra', en: 'word', ex: 'Una palabra nueva.' },
```

You can also add words anytime through the **+** button in the app — those save just for you.
