# AB/noCD – KŮA Listening Lab

Listeners hear two versions of each song on a two-deck hi-fi and vote for the one they prefer.

- **A / B** move the camera to that deck and play its version. Each version resumes where the listener left it.
- **SELECT** pulls back to the wide shot and opens the vote (A or B, plus an optional note). It unlocks after 15 seconds of each version.
- **Lyrics** (top left) expand with the chevron. **Song picker** (top right) lists the collection's 10 songs.
- **Top nav** switches collections.
- A/B order is randomised per listener and song; the vote records the real version (`v1`/`v2`).

Everything lives in `index.html`. Open it through any static server (`python3 -m http.server`).

## Adding songs

Edit `COLLECTIONS` in `index.html`. The two `Vol.` collections are demos whose audio is synthesised in the browser; their votes are logged to the console, not sent. A real collection follows the template in the comment above `DEMO_TITLES`: 10 songs, each with `title`, `artist`, optional `cover` and `lyrics`, and the two audio URLs `v1` and `v2`.

Host audio somewhere that sends CORS headers (Netlify, Cloudflare R2, or this site's own folder). The VU meters then follow the real signal, and seeking is fast. Google Drive links still play, with simulated meters.

## Swapping in the AI render

1. Generate one 16:9 wide render (≥3200 px) with **empty platters and needle-free VU meters**, so the live records and needles drawn on top have a clean surface.
2. Save it as `assets/scene-wide.jpg` and set `CONFIG.sceneImage = 'assets/scene-wide.jpg'`.
3. Open `index.html?calibrate`, drag the copper handles onto the platters, meter pivots and power LED, and paste the printed JSON into `CONFIG.overlays`.
4. Adjust `CONFIG.views` if the A/B close-ups need a different focal point or zoom.

## Votes

Votes post to the Google Apps Script in `GOOGLE_SCRIPT_URL` with `type: 'abvote'`. Update the script with `docs/apps-script.gs` so they land in an `ABnoCD` tab. Failed posts queue in the browser and retry on the next vote or visit.
