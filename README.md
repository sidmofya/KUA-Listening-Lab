# AB/noCD – KŮA Listening Lab

Listeners hear two versions of each song on a two-deck hi-fi and vote for the one they prefer.

- **Play / Pause** (bottom left) plays or pauses the version the slider is on, with its progress and time. The first press starts A and moves to its deck. Space does the same.
- **Vote A or B** (hanging just beneath the song picker, top right; it moves down with the picker when its song list opens) pulls back to the wide shot and opens the vote (A or B, plus an optional note). It unlocks after 15 seconds of each version.
- **Song picker** (top right) lists the collection's songs and shows which version is on ("Playing A", "Paused on B"). Skipping to another song while music plays starts it straight away on the same slider position; while paused, it waits. Listeners don't see the songs' About texts (lyrics, story, notes); those only feed the cover art.
- **Slider:** the only way to switch versions. It sits just above what's in shot (the amplifier in the room view, the record player in A or B), glides with the camera and always stays on screen. Three positions – A, the room (middle, labelled ROOM, which lights up when you're there) and B. A and B play that version and move the camera to its deck (each version resumes where the listener left it); the middle pulls back to the wide room view while the music keeps playing, so the wall drum is in reach on phones. ←/→ step between positions when the slider has focus.
- **Continuous listening:** if a version plays to the end, the other version follows, then the next song, until the listener pauses, votes or picks something; the collection's last song stops (with the thank-you card if everything is voted).
- **Background listening:** music keeps playing with the phone locked or the browser in the background, including continuous play into the next song; the lock screen / Control Centre shows the song, cover and play/pause/next/previous. On iPhone the music plays directly from the audio element (iOS suspends Web Audio when locked), so the VU needles are simulated and the vote-card volume dip isn't available there.
- **Drum along:** tapping the oxblood disc on the wall plays a synthesised djembe hit – deep bass at the centre, rising through tone to a bright slap at the rim – with a copper ripple where it was struck. A one-time hint mentions it after about 20 seconds of listening. The disc's position lives in `CONFIG.overlays.drum` (adjust with `?calibrate`).
- **Song art on the drum:** each song's cover is pressed into the wall drum as a subtle relief – light and shadow from the cover's shapes plus a hint of its colours, blended into whichever room is showing – and crossfades when the song changes. Songs without a cover leave the disc bare. It's drawn once per song in the browser from the cover the song picker already loads; strength per room is tuned in `skins.json` (`drum.art`).
- **Lyrics (captions):** while music plays, the line being sung shows just above the Play and Vote buttons, with the next line fainter beneath. Each version has its own timing (they're different arrangements). Captions hide when paused, during instrumental gaps, and for songs or versions without them. Made and edited in the Studio (see Captions below).
- Listeners enter without signing in; the first vote of each browser session asks for a first name, which later votes reuse.
- **Top nav** switches collections. Each collection can have its own **room** (see Room skins below); switching collections crossfades into that room.
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
2. Open `/studio`, sign in, and drop the folder or individual files. The preview lists every song it found, flags misnamed files, and lets you paste or edit each song's About text and choose its type (Lyrics, Story, How the versions differ, Notes). About texts aren't shown to listeners; they shape each song's cover.
3. Click **Upload**. The first time a collection appears, the Studio asks for its display name and **art theme**; every cover in that collection is generated from the theme plus each song's title and About text (version notes are left out).
4. A song goes live as soon as both A and B are uploaded, and gets a cover at that point. Upload B later and it goes live then.

### Captions (timed lyrics)

Studio → a live song → **Lyrics captions**. Choose **Version A** or **B** (your `_A` and `_B` files), then either:

- **Generate** (or **Generate both**): OpenAI Whisper (`whisper-1`, about $0.006 per minute of audio, so a few cents per song) listens to the version and times every word it hears. Your browser loads the version, converts it to compact mono audio and sends it in ~30-second pieces cut at quiet moments (server functions stop after ~10 s). Needs `OPENAI_API_KEY`; change the model with `OPENAI_TRANSCRIBE_MODEL` (it must return timings).
  - **With a lyrics file** (an About text of type Lyrics, e.g. `vol03_Copper Light_lyrics.txt`): the captions use your lyrics, line for line; the AI only supplies the timing. Each line is matched in order to the words it heard (mishearings are tolerated), a chorus written once but sung again is captioned each time, and section labels like `[Chorus]` or `(x2)` are skipped. Lines it couldn't find get a time between their neighbours, shown in amber to check. The editor reports how many lines were timed; if the AI couldn't follow the lyrics (common for non-English songs), use Tap to time.
  - **Without lyrics**: the AI writes the words too, from what it hears. Sung vocals come out imperfect, so check them.
- **Tap to time**: paste the lyrics (one caption per line; prefilled from the About lyrics), press Start, and tap the Tap button or Space as each line begins. Undo steps back a line. Best for songs Whisper struggles with.

**Captioning everything automatically:** each collection has a **Caption all songs** button. It runs Generate for every live song version that has no captions (or whose audio was replaced since) and publishes them as it goes, leaving existing captions and unsaved edits alone. It runs in your browser, so keep the Studio tab open (about a minute per version); at the end it lists anything worth a look (many estimated lines, AI that couldn't follow the lyrics, or AI-written words where there's no lyrics file). New uploads are captioned the same way as soon as a song goes live, or when a version is replaced.

Then fix anything in the line list: edit words or times (`m:ss.s`), ▶ plays from a line, ⏱ sets a line to the player's current position, × deletes, **+ Add line**, and **All −/+0.5 s** shifts everything. Nothing reaches listeners until you press **Save**; **Remove** takes a version's captions down. If you replace a version's audio later, the editor warns that its timings may be off.

In the Studio you can also reorder songs (drag, or ↑ ↓), rename them, edit About texts, regenerate covers (AI or generative), replace a version (upload the same filename again) and delete songs or collections. A collection holds up to 10 songs.

**Covers:** with `OPENAI_API_KEY` set, covers come from OpenAI's `gpt-image-2` (change with `OPENAI_IMAGE_MODEL`), run in OpenAI's background mode because an image can take longer than a Netlify function may run; the Studio shows a spinner and collects the image when it's ready (usually 10–40 seconds). Without an OpenAI key but with `GEMINI_API_KEY`, covers come from Gemini's image models (these need billing enabled; the free tier allows no images). With no key, no credits, an unverified OpenAI organization, or a timeout, the Studio falls back to generative art drawn from the theme's colours and mood, and labels it so you can retry with AI later. Tune OpenAI with `OPENAI_IMAGE_QUALITY` (`low`, `medium`, `high`) and `OPENAI_TEXT_MODEL`; tune Gemini with `COVER_MODELS` and `COVER_TIMEOUT_MS`.

## Room skins (KwaZuri)

A collection can be heard in one of six rooms: the original **KŮA Room** or one of KwaZuri's five regions, **Harmonic Plains**, **Rhythmic Ridge**, **Melodic Forests**, **Silent Sands** and **Vibrato Valleys**. Each is the same room (same camera and furniture) restyled after its region: walls, floor, light, speaker fabric, the wall drum and the accent colour. The drum sounds the same in every room.

- **Choosing:** Studio → the collection → **Room**, then **Save**. Listeners see it next time they open or switch to that collection (with a short crossfade, or instantly with reduced motion). Collections without a room use the KŮA Room.
- **The list** lives in `public/skins.json`: each room's image, accent colours, drum ripple/glow colours, optional song-art tuning (`drum.art`: `strength`, `relief`, `tone`, `color`, `blend`) and optional calibration nudges. The listening room, the Studio and the Studio API all read it.
- **Renders:** `docs/skin-prompts.md` has the prompt for each region. `python scripts/draft_skins.py` drafts all five with OpenAI image editing from today's render (needs Pillow and `OPENAI_API_KEY` in `.env`); final renders replace the drafts under the same filenames in `public/assets/skins/`.
- **Image size:** keep the full renders (3200 px JPEG) in the repo. The listening room asks Netlify's image service for them, which sends WebP or AVIF at about half the size and the same sharpness (full width, because the A/B views zoom in, most of all on phones); listeners on Data Saver or 2G get a half-width version, and the Studio shows small thumbnails. On a plain local server the original files are used.
- **Previewing and calibrating:** `/?skin=<id>` shows any room; `/?calibrate&skin=<id>` lets you drag the overlay handles onto that render and prints the positions to paste into the room's `"overlays"` in `skins.json`. If a room's image fails to load, listeners simply stay in the room they're in.

## Hosting (Netlify)

- **Deploys:** the Netlify site is linked to this GitHub repo. Merging to `main` publishes to listen.sidmofya.com within a minute or two; each pull request gets its own deploy-preview link (shown on the PR) to try before merging. To undo a release, publish an earlier deploy from Netlify → Deploys.
- `public/` is the site: `index.html` (listening room) and `studio.html` (Studio).
- `netlify/functions/` is the API; audio, covers and the catalog live in Netlify Blobs.
- Audio is uploaded and served in 4 MB parts with HTTP range support, to stay under Netlify's function size limits while keeping seeking instant.

Environment variables (Site configuration → Environment variables):

| Variable | Purpose |
| --- | --- |
| `STUDIO_PASSWORD` | Studio sign-in password |
| `SESSION_SECRET` | Any long random string; signs Studio sessions |
| `OPENAI_API_KEY` | OpenAI key for AI covers (needs credits and a verified organization) and caption Generate (optional) |
| `GEMINI_API_KEY` | Google AI Studio key for AI covers, used when there is no OpenAI key (optional; needs billing) |

Local development: `npm install`, put the variables in a `.env` file, then `npm run dev` (Netlify Dev emulates the functions and Blobs at http://localhost:8888). Without the API, e.g. on a plain static server, the listening room falls back to two demo collections whose audio is synthesised in the browser; `?demo` forces them.

## Votes

Votes are stored on the site itself (Netlify Blobs), one per listener per song; voting again replaces the listener's earlier vote. The Studio's **Results** section shows the A/B split for every live song, with listeners' notes, and **Download CSV** exports every vote. A and B always mean your `_A` and `_B` files, whichever deck a listener heard them on. Votes that fail to send queue in the listener's browser and retry on the next vote or visit. Demo collections never send votes, and deleting a song deletes its votes and captions.

## The wide-shot render

The listening room uses a placeholder scene drawn in code until the AI render exists. To swap it in:

1. Generate one 16:9 image with the prompt in `docs/scene-prompt.md` (≥3200 px wide; the A/B views zoom about 2×). It needs **empty platters and needle-free VU meters**, because the live records and needles are drawn on top.
2. Save it as `public/assets/scene-wide.jpg` and set `CONFIG.sceneImage = 'assets/scene-wide.jpg'` in `public/index.html`.
3. Open `/?calibrate`, drag the copper handles onto the platters, meter pivots and power LED, and paste the printed JSON into `CONFIG.overlays`.
4. Adjust `CONFIG.views` if the A/B close-ups need a different focal point or zoom.
