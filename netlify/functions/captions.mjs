import { findCollection, isAdmin, json, readCatalog, store, writeCatalog } from '../lib/common.mjs';

// Timed lyrics ("captions"), one set per song version (v1 = file A, v2 = file B).
//
// GET  /api/captions/<songId>/<v1|v2>    – public: { lines: [{ t, e?, text }] }
// POST /api/captions/transcribe          – (studio) raw 16 kHz mono WAV, ≤ ~35 s; ?offset=&prompt=
//                                          Returns { segments } from OpenAI, shifted by offset.
// POST /api/captions                     – (studio) { collectionId, songId, version, lines, source }
//                                          Saves (or, with no lines, clears) a version's captions.
//
// Transcription runs in short pieces because Netlify stops synchronous functions after ~10 s;
// the Studio decodes the audio, cuts it at quiet moments and sends the pieces here one by one.

const VERSIONS = ['v1', 'v2'];
const MAX_LINES = 400;
const MAX_TEXT = 200;
const MAX_PIECE_BYTES = 2.5 * 1024 * 1024;

export default async (req) => {
    const path = new URL(req.url).pathname.replace(/^\/api\/captions\/?/, '');

    if (req.method === 'GET') {
        const [songId, version] = path.split('/').map(decodeURIComponent);
        if (!songId || !VERSIONS.includes(version)) return json({ error: 'Not found' }, 404);
        const data = await store('captions').get(`${songId}/${version}`, { type: 'json' });
        if (!data) return json({ error: 'Not found' }, 404);
        // The catalog links here with ?r=<rev>, and the rev changes on every save.
        return json({ lines: data.lines }, 200, { 'cache-control': 'public, max-age=31536000, immutable' });
    }

    if (!isAdmin(req)) return json({ error: 'Not signed in' }, 401);
    if (req.method !== 'POST') return json({ error: 'Not found' }, 404);
    if (path === 'transcribe') return transcribe(req);
    if (path === '') return save(await req.json().catch(() => ({})));
    return json({ error: 'Not found' }, 404);
};

// ---------------------------------------------------------------
// Transcription (OpenAI Whisper): one short piece of audio per request
// ---------------------------------------------------------------

async function transcribe(req) {
    if (!process.env.OPENAI_API_KEY) return json({ error: 'Autocaptions need OPENAI_API_KEY on the server. Tap to time works without it.' }, 503);
    const q = new URL(req.url).searchParams;
    const offset = Math.max(0, Number(q.get('offset')) || 0);
    const prompt = (q.get('prompt') || '').slice(0, 800);
    const audio = await req.arrayBuffer();
    if (!audio.byteLength) return json({ error: 'No audio received' }, 400);
    if (audio.byteLength > MAX_PIECE_BYTES) return json({ error: 'Audio piece too large' }, 413);

    const form = new FormData();
    form.append('file', new Blob([audio], { type: 'audio/wav' }), 'piece.wav');
    form.append('model', process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1');
    form.append('response_format', 'verbose_json');
    form.append('timestamp_granularities[]', 'segment');
    form.append('timestamp_granularities[]', 'word');
    if (prompt) form.append('prompt', prompt);

    let res;
    try {
        res = await fetch(`${process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'}/audio/transcriptions`, {
            method: 'POST',
            headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
            body: form,
            signal: AbortSignal.timeout(8500)
        });
    } catch (e) {
        return json({ error: e.name === 'TimeoutError' ? 'Transcription timed out' : `Transcription failed: ${e.message}` }, 504);
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return json({ error: `OpenAI said ${res.status}: ${data.error?.message || 'unknown error'}` }, 502);
    if (!Array.isArray(data.segments)) {
        return json({ error: 'This transcription model returns no timings; set OPENAI_TRANSCRIBE_MODEL to whisper-1' }, 502);
    }

    const words = Array.isArray(data.words) ? data.words : [];
    const segments = [];
    let previous = '';
    for (const s of data.segments) {
        const text = String(s.text || '').trim();
        // Whisper invents words over instrumentals; drop segments it doubts, and stutters.
        const doubtful = (s.no_speech_prob > 0.6 && s.avg_logprob < -0.7) || s.compression_ratio > 2.4;
        if (!text || doubtful || text === previous) continue;
        previous = text;
        segments.push({
            start: round(offset + s.start),
            end: round(offset + s.end),
            text,
            words: words
                .filter((w) => w.start >= s.start - 0.05 && w.end <= s.end + 0.05)
                .map((w) => ({ word: String(w.word || '').trim(), start: round(offset + w.start), end: round(offset + w.end) }))
        });
    }
    return json({ segments, language: data.language || null });
}

// ---------------------------------------------------------------
// Saving: validated lines in the captions store, a revision in the catalog
// ---------------------------------------------------------------

async function save(body) {
    const { collectionId, songId, version, source } = body;
    if (!VERSIONS.includes(version)) return json({ error: 'Unknown version' }, 400);
    const catalog = await readCatalog();
    const song = findCollection(catalog, collectionId)?.songs[songId];
    if (!song) return json({ error: 'Unknown song' }, 404);
    if (!song[version]) return json({ error: 'That version has no audio yet' }, 409);

    const lines = cleanLines(body.lines);
    if (typeof lines === 'string') return json({ error: lines }, 400);

    const captions = store('captions');
    const key = `${song.id}/${version}`;
    song.captions = song.captions || {};
    if (!lines.length) {
        await captions.delete(key);
        delete song.captions[version];
    } else {
        const rev = Date.now().toString(36);
        await captions.setJSON(key, {
            lines,
            source: ['auto', 'tap', 'edited'].includes(source) ? source : 'edited',
            audioKey: song[version].key, // lets the Studio warn if the audio is replaced later
            updatedAt: new Date().toISOString()
        });
        song.captions[version] = { rev, audioKey: song[version].key, count: lines.length, source: source || 'edited' };
    }
    if (!Object.keys(song.captions).length) delete song.captions;
    await writeCatalog(catalog);
    return json({ captions: song.captions || null });
}

function cleanLines(input) {
    if (!Array.isArray(input)) return 'Lines must be a list';
    if (input.length > MAX_LINES) return `At most ${MAX_LINES} lines`;
    const lines = [];
    for (const l of input) {
        const text = String(l?.text ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT);
        const t = Number(l?.t);
        if (!text) continue;
        if (!Number.isFinite(t) || t < 0 || t > 3600) return `Line "${text.slice(0, 30)}" has no valid time`;
        const line = { t: round(t), text };
        const e = Number(l?.e);
        if (Number.isFinite(e) && e > t && e <= 3600) line.e = round(e);
        lines.push(line);
    }
    return lines.sort((a, b) => a.t - b.t);
}

const round = (n) => Math.round(n * 100) / 100;

export const config = { path: ['/api/captions', '/api/captions/*'] };
