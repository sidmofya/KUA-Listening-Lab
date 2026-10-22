# AB/noCD – KŮA Listening Lab

Listeners hear two versions of each song on a two-deck hi-fi and vote for the one they prefer.

- **A / B** move the camera to that deck and play its version. Each version resumes where the listener left it.
- **SELECT** pulls back to the wide shot and opens the vote (A or B, plus an optional note). It unlocks after 15 seconds of each version.
- **Lyrics** (top left) expand with the chevron. **Song picker** (top right) lists the collection's songs.
- **Top nav** switches collections.
- A/B order is randomised per listener and song; the vote records the real version (`v1` = file A, `v2` = file B).

## Adding songs (Studio)

1. Name your files `[collection]_[track name]_[A|B].[ext]`, plus an optional `[collection]_[track name]_lyrics.txt`:

   ```
   vol03/
     vol03_Copper Light_A.wav
     vol03_Copper Light_B.wav
     vol03_Copper Light_lyrics.txt
   ```

   Audio can be mp3, m4a, aac, wav, flac, ogg or aiff, at any size. Underscores inside a track name read as spaces.
2. Open `/studio`, sign in, and drop the folder or individual files. The preview lists every song it found, flags misnamed files, and lets you paste or edit lyrics.
3. Click **Upload**. The first time a collection appears, the Studio asks for its display name and **art theme**; every cover in that collection is generated from the theme plus each song's title and lyrics.
4. A song goes live as soon as both A and B are uploaded, and gets a cover at that point. Upload B later and it goes live then.

In the Studio you can also reorder songs (drag, or ↑ ↓), rename them, edit lyrics, regenerate covers (AI or generative), replace a version (upload the same filename again) and delete songs or collections. A collection holds up to 10 songs.

**Covers:** with `GEMINI_API_KEY` set, covers come from Google Imagen, then Gemini image generation. With no key, no credits, or a slow response (Netlify stops functions after about 10 seconds), the Studio falls back to generative art drawn from the theme's colours and mood, and labels it so you can retry with AI later. Override the models with `COVER_MODELS` (comma-separated) and the time budget with `COVER_TIMEOUT_MS`.

## Hosting (Netlify)

- `public/` is the site: `index.html` (listening room) and `studio.html` (Studio).
- `netlify/functions/` is the API; audio, covers and the catalog live in Netlify Blobs.
- Audio is uploaded and served in 4 MB parts with HTTP range support, to stay under Netlify's function size limits while keeping seeking instant.

Environment variables (Site configuration → Environment variables):

| Variable | Purpose |
| --- | --- |
| `STUDIO_PASSWORD` | Studio sign-in password |
| `SESSION_SECRET` | Any long random string; signs Studio sessions |
| `GEMINI_API_KEY` | Google AI Studio key for AI covers (optional) |

Local development: `npm install`, put the variables in a `.env` file, then `npm run dev` (Netlify Dev emulates the functions and Blobs at http://localhost:8888). Without the API, e.g. on a plain static server, the listening room falls back to two demo collections whose audio is synthesised in the browser; `?demo` forces them.

## Votes

Votes post to the Google Apps Script in `GOOGLE_SCRIPT_URL` (in `public/index.html`) with `type: 'abvote'`. Update the script with `docs/apps-script.gs` so they land in an `ABnoCD` tab. Failed posts queue in the browser and retry on the next vote or visit. Demo collections never post.

## The wide-shot render

The listening room uses a placeholder scene drawn in code until the AI render exists. To swap it in:

1. Generate one 16:9 image with the prompt in `docs/scene-prompt.md` (≥3200 px wide; the A/B views zoom about 2×). It needs **empty platters and needle-free VU meters**, because the live records and needles are drawn on top.
2. Save it as `public/assets/scene-wide.jpg` and set `CONFIG.sceneImage = 'assets/scene-wide.jpg'` in `public/index.html`.
3. Open `/?calibrate`, drag the copper handles onto the platters, meter pivots and power LED, and paste the printed JSON into `CONFIG.overlays`.
4. Adjust `CONFIG.views` if the A/B close-ups need a different focal point or zoom.
