import { CHUNK, deleteAudio, findCollection, isAdmin, json, readCatalog, store, writeCatalog } from '../lib/common.mjs';

// Receives one part of an audio file. The studio sends parts in order, one file
// at a time; the last part records the file on its song.
//   POST /api/upload?collection=&song=&version=v1|v2&rev=&part=&parts=&size=&type=
export default async (req) => {
    if (!isAdmin(req)) return json({ error: 'Not signed in' }, 401);
    if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

    const q = new URL(req.url).searchParams;
    const collectionId = q.get('collection');
    const songId = q.get('song');
    const version = q.get('version');
    const rev = q.get('rev');
    const part = Number(q.get('part'));
    const parts = Number(q.get('parts'));
    const size = Number(q.get('size'));
    const type = q.get('type') || 'audio/mpeg';

    if (!['v1', 'v2'].includes(version) || !/^[a-z0-9]+$/.test(rev || '') || !(parts > 0) || !(part >= 0 && part < parts) || !(size > 0)) {
        return json({ error: 'Bad upload parameters' }, 400);
    }
    if (parts !== Math.ceil(size / CHUNK)) return json({ error: `Parts must be ${CHUNK} bytes` }, 400);

    const catalog = await readCatalog();
    const collection = findCollection(catalog, collectionId);
    const song = collection?.songs[songId];
    if (!song) return json({ error: 'Unknown song – create it first' }, 404);

    const body = await req.arrayBuffer();
    const expected = part === parts - 1 ? size - part * CHUNK : CHUNK;
    if (body.byteLength !== expected) return json({ error: `Part ${part} should be ${expected} bytes, got ${body.byteLength}` }, 400);

    const key = `${songId}/${version}/${rev}`;
    const audio = store('audio');
    await audio.set(`${key}/${part}`, body);

    if (part < parts - 1) return json({ ok: true, part });

    // Check each part directly: per-key reads are strongly consistent, whereas list() can lag behind writes.
    const present = await Promise.all(Array.from({ length: parts }, (_, i) => audio.getMetadata(`${key}/${i}`)));
    const missing = present.findIndex((m) => !m);
    if (missing !== -1) return json({ error: `Part ${missing} of ${parts} is missing – upload again`, missingPart: missing }, 409);
    await audio.setJSON(`${key}/meta`, { size, type, parts });

    const previous = song[version];
    song[version] = { key, size, type, rev, name: q.get('name') || '', uploadedAt: new Date().toISOString() };
    await writeCatalog(catalog);
    if (previous && previous.key !== key) await deleteAudio(previous.key);

    return json({ ok: true, song });
};

export const config = { path: '/api/upload' };
