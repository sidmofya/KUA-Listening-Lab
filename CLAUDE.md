# AB/noCD – KŮA Listening Lab — Project Context

This file adds project-specific context on top of the global Boris Whisperer
configuration in `~/.claude/CLAUDE.md`. Claude reads both at the start of every session.

## What This Is

A listening room for KŮA's album (listen.sidmofya.com). Each song exists in two versions;
listeners hear both on a two-deck hi-fi in an AI-rendered room and vote for the one they like
better. Votes tell KŮA what kind of music to make more of (they don't decide what gets released,
and listener-facing copy shouldn't say so). Sid uploads songs and manages
collections in the Studio (`/studio`). Each collection can be heard in its own room skin,
named after a region of KwaZuri.

## What Success Looks Like

- Listeners finish whole collections and vote on every song (votes show what kind of music to make more of).
- Shared song and collection links bring new listeners in.
- (Sid to refine: the outcomes a great month would show.)

## Tech Stack

- Static HTML, no framework or build step: `public/index.html` (listening room) and
  `public/studio.html` (Studio). All CSS and JS are inline in those files.
- Netlify Functions (`netlify/functions/`) and Netlify Blobs for audio, covers, catalog and votes.
- AI covers: OpenAI `gpt-image-2` (or Gemini) via `netlify/lib/cover.mjs`.
- Hosting: Netlify, linked to this GitHub repo. Merging to `main` deploys to the live site; pull requests get
  deploy previews. (Before 2026-11-27 the site wasn't linked and was deployed by hand.)

## Key Files

| File | What it does |
|------|-------------|
| `public/index.html` | The listening room: scene, live hardware overlays, drum, decks, voting. `CONFIG` holds the camera views and overlay positions. |
| `public/studio.html` | The Studio: upload, collections (name, art theme, room), results. |
| `public/skins.json` | The room skins (KwaZuri regions): image, accent colours, drum colours, optional calibration nudges. Read by the room, the Studio and the Studio API. |
| `public/assets/scene-wide.jpg` | The default room render. Skins live in `public/assets/skins/<id>.jpg`. |
| `docs/scene-prompt.md`, `docs/skin-prompts.md` | Prompts for the default room and each skin. |
| `scripts/draft_skins.py` | Drafts skin renders with OpenAI from `docs/skin-prompts.md`. |
| `netlify/lib/common.mjs` | Catalog storage and the public catalog shape. |
| `netlify/functions/admin.mjs` | Studio API (sign-in, collections, songs, order). |

## Common Tasks

- **Adding or replacing a room skin**: render it from `docs/skin-prompts.md`, save as
  `public/assets/skins/<id>.jpg`, add or update its entry in `public/skins.json`, then check
  `/?calibrate&skin=<id>` and paste any moved overlay positions into that entry's `overlays`.
- **Local preview without the API**: serve `public/` and open `/?demo` (Vol. 02 uses a skin);
  `?skin=<id>` previews any room.
- **Full local stack**: `npm install`, put `STUDIO_PASSWORD` and `SESSION_SECRET` in `.env`,
  `npx netlify dev`.

## Decision Checklist

- Merging to `main` (it deploys)
- Changing the voting flow or what a vote records
- Changing the default room render or the furniture layout (overlays are calibrated to it)
- Removing a skin that collections may be using

## Off-Limits Without Asking

- Deleting collections, songs or votes in production Blobs
- Committing `.env` or any API key
