# AB/noCD – KŮA Listening Lab

Listeners hear two versions of each song on a two-deck hi-fi and vote for the one they prefer.

- **A / B** move the camera to that deck and play its version. Each version resumes where the listener left it.
- **SELECT** pulls back to the wide shot and opens the vote (A or B, plus an optional note). It unlocks after 15 seconds of each version.
- **About this song** (top left, a paper liner-notes card) shows the song's lyrics, story, notes, or how the two versions differ, and expands with the chevron. A "how the versions differ" note stays hidden until the listener has voted, then shows with a line saying which deck each of your files was on. **Song picker** (top right) lists the collection's songs.
- Listeners enter without signing in; the first vote of each browser session asks for a first name, which later votes reuse.
- **Top nav** switches collections.
- A/B order is randomised per listener and song; the vote records the real version (`v1` = file A, `v2` = file B).
- **Links:** `/vol03` opens a collection and `/vol03/copper-light` opens a song (after the name screen); the address bar always shows the current song. **Share** buttons sit in the song picker (song and collection), on the thank-you card after each vote, and on the collection-complete card. Phones get the native share sheet; elsewhere the link is copied. The Studio has a **Copy link** button for every live song and collection.

## Adding songs (Studio)

1. Name your files `[collection]_[track name]_[A|B].[ext]`, plus an optional About text named `…_lyrics.txt`, `…_story.txt`, `…_versions.txt` or `…_notes.txt` (the suffix sets its type):

   ```
   vol03/
     vol03_Copper Light_A.wav
     vol03_Copper Light_B.wav
     vol03_Copper Light_lyrics.txt
   ```

   Audio can be mp3, m4a, aac, wav, flac, ogg or aiff, at any size. Underscores inside a track name read as spaces.
2. Open `/studio`, sign in, and drop the folder or individual files. The preview lists every song it found, flags misnamed files, and lets you paste or edit each song's About text and choose its type (Lyrics, Story, How the versions differ, Notes). Write version notes in terms of your A and B files; listeners are told how those mapped onto their decks.
3. Click **Upload**. The first time a collection appears, the Studio asks for its display name and **art theme**; every cover in that collection is generated from the theme plus each song's title and About text (version notes are left out).
4. A song goes live as soon as both A and B are uploaded, and gets a cover at that point. Upload B later and it goes live then.

In the Studio you can also reorder songs (drag, or ↑ ↓), rename them, edit About texts, regenerate covers (AI or generative), replace a version (upload the same filename again) and delete songs or collections. A collection holds up to 10 songs.

**Covers:** with `OPENAI_API_KEY` set, covers come from OpenAI's `gpt-image-1`, run in OpenAI's background mode because an image can take longer than a Netlify function may run; the Studio shows a spinner and collects the image when it's ready (usually 10–40 seconds). Without an OpenAI key but with `GEMINI_API_KEY`, covers come from Gemini's image models (these need billing enabled; the free tier allows no images). With no key, no credits, an unverified OpenAI organization, or a timeout, the Studio falls back to generative art drawn from the theme's colours and mood, and labels it so you can retry with AI later. Tune OpenAI with `OPENAI_IMAGE_QUALITY` (`low`, `medium`, `high`) and `OPENAI_TEXT_MODEL`; tune Gemini with `COVER_MODELS` and `COVER_TIMEOUT_MS`.

## Hosting (Netlify)

- `public/` is the site: `index.html` (listening room) and `studio.html` (Studio).
- `netlify/functions/` is the API; audio, covers and the catalog live in Netlify Blobs.
- Audio is uploaded and served in 4 MB parts with HTTP range support, to stay under Netlify's function size limits while keeping seeking instant.

Environment variables (Site configuration → Environment variables):

| Variable | Purpose |
| --- | --- |
| `STUDIO_PASSWORD` | Studio sign-in password |
| `SESSION_SECRET` | Any long random string; signs Studio sessions |
| `OPENAI_API_KEY` | OpenAI key for AI covers (optional; needs credits and a verified organization) |
| `GEMINI_API_KEY` | Google AI Studio key for AI covers, used when there is no OpenAI key (optional; needs billing) |

Local development: `npm install`, put the variables in a `.env` file, then `npm run dev` (Netlify Dev emulates the functions and Blobs at http://localhost:8888). Without the API, e.g. on a plain static server, the listening room falls back to two demo collections whose audio is synthesised in the browser; `?demo` forces them.

## Votes

Votes are stored on the site itself (Netlify Blobs), one per listener per song; voting again replaces the listener's earlier vote. The Studio's **Results** section shows the A/B split for every live song, with listeners' notes, and **Download CSV** exports every vote. A and B always mean your `_A` and `_B` files, whichever deck a listener heard them on. Votes that fail to send queue in the listener's browser and retry on the next vote or visit. Demo collections never send votes, and deleting a song deletes its votes.

## The wide-shot render

The listening room uses a placeholder scene drawn in code until the AI render exists. To swap it in:

1. Generate one 16:9 image with the prompt in `docs/scene-prompt.md` (≥3200 px wide; the A/B views zoom about 2×). It needs **empty platters and needle-free VU meters**, because the live records and needles are drawn on top.
2. Save it as `public/assets/scene-wide.jpg` and set `CONFIG.sceneImage = 'assets/scene-wide.jpg'` in `public/index.html`.
3. Open `/?calibrate`, drag the copper handles onto the platters, meter pivots and power LED, and paste the printed JSON into `CONFIG.overlays`.
4. Adjust `CONFIG.views` if the A/B close-ups need a different focal point or zoom.
