# Media Authenticity Analyzer

**Deepfake Detection System: An AI-Powered Media Authenticity Analyzer**

A web application that estimates whether an uploaded PNG/JPEG image is an authentic
human capture or AI-generated / manipulated. Team project by Andrea Enemodia,
Eriana Williams, Ariel Garza, and Byron Charles.

**Live site:** <https://andreaenemodia3.github.io/media-authenticity-analyzer/>

## Features

- **Analyze** — upload (or drag-and-drop) a PNG/JPEG image. Until the team's
  trained model is connected, the app reports **factual signal observations**
  about the file (metadata, provenance markers, pixel statistics) and clearly
  states that no authenticity assessment was performed. A labeled
  **example result** demonstrates the full classification / confidence
  interface, and a connected model API fills it in for real.
- **History** — past analyses are saved on this browser only (thumbnails,
  results). Nothing is synced; if a custom model API is configured, images are
  sent to that server during analysis.
- **Settings** — detection engine selection (heuristic preview or your own
  model API), storage preferences, and local profile info.

## Detection engines

1. **Heuristic preview (default)** — runs entirely in the browser:
   - EXIF / metadata inspection (camera make & model, software tags)
   - C2PA content-credential (provenance) marker detection
   - Known AI-generator signatures (Midjourney, DALL-E, Stable Diffusion, Firefly, …)
   - PNG text chunks with generation parameters
   - Pixel-level noise statistics and generator-typical dimensions

   It reports these as **observations only** — no aggregate classification or
   confidence — because a weighted checklist is not a calibrated model and must
   not masquerade as one. It is **not** the trained deep-learning model from
   the proposal; that model connects through engine 2 below.

2. **Custom model API** — once the team's PyTorch model is trained and served
   (e.g. Flask or a Hugging Face Space), point Settings → Detection engine at its
   URL. The app will POST `{ "imageBase64": "..." }` and expects
   `{ "label": "manipulated" | "authentic" | "inconclusive", "confidence": 0.0–1.0 }`.
   The server needs CORS enabled for this site's origin. This is a prepared
   integration interface — it has not yet been exercised against a live model
   endpoint.

## Run locally

No build step — just static files.

```bash
# any static server works, e.g.:
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy to GitHub Pages

The site is pure static HTML/CSS/JS, so GitHub Pages hosts it for free.

1. Create a GitHub repository (e.g. `media-authenticity-analyzer`) and push this folder:
   ```bash
   git add -A
   git commit -m "Media Authenticity Analyzer prototype"
   git push origin master
   ```
2. In the repo on GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
3. Select the `master` branch, `/ (root)`, and save.
4. In a minute or two the site is live at:
   `https://<your-username>.github.io/media-authenticity-analyzer/`

Notes:
- All asset paths are relative (`css/…`, `js/…`), so the site works under the
  `/repo-name/` subpath with no configuration.
- Routing is hash-based (`#/history`, `#/settings`), so refreshing any view works
  without extra Pages tricks.

## Project structure

```
index.html        — app shell (topbar, nav, view container)
css/styles.css    — design system and component styles
js/storage.js     — history & settings persistence (localStorage, safe fallback)
js/analysis.js    — detection engine (heuristic checks + API provider)
js/app.js         — UI: hash router, views, interactions
```

## Limitations

- PNG/JPEG images containing human faces are the target scope; short videos and
  large files are future work (per the project proposal).
- Heuristic results are indicative, not proof. No automated tool can definitively
  prove an image is real or fake.
- History and settings are stored per-browser; there are no user accounts.
