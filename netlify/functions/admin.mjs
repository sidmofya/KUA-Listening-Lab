import {
    ABOUT_KINDS, SONGS_PER_COLLECTION, checkPassword, clearCookie, deleteAudio, findCollection, isAdmin,
    json, readCatalog, sessionCookie, slug, store, writeCatalog
} from '../lib/common.mjs';

// Studio API. Every route except login requires the session cookie.
export default async (req) => {
    const route = new URL(req.url).pathname.replace(/^\/api\/admin\/?/, '');
    const method = req.method;
    const body = method === 'GET' ? {} : await req.json().catch(() => ({}));

    if (route === 'login' && method === 'POST') {
        if (!process.env.STUDIO_PASSWORD) return json({ error: 'STUDIO_PASSWORD is not set on the server' }, 500);
        if (!checkPassword(body.password)) return json({ error: 'Wrong password' }, 401);
        return json({ ok: true }, 200, { 'set-cookie': sessionCookie() });
    }
    if (route === 'logout') return json({ ok: true }, 200, { 'set-cookie': clearCookie });
    if (!isAdmin(req)) return json({ error: 'Not signed in' }, 401);

    const catalog = await readCatalog();

    if (route === 'catalog' && method === 'GET') {
        return json({ ...catalog, coverAI: !!process.env.GEMINI_API_KEY, songsPerCollection: SONGS_PER_COLLECTION });
    }

    // Every vote, for the Results view and CSV export.
    if (route === 'votes' && method === 'GET') {
        const votes = store('votes');
        const { blobs } = await votes.list();
        const all = await Promise.all(blobs.map((b) => votes.get(b.key, { type: 'json' })));
        return json({ votes: all.filter(Boolean) });
    }

    // Create or update a collection: { id, name?, theme?, artist? }
    if (route === 'collection' && method === 'POST') {
        const id = slug(body.id);
        if (!id) return json({ error: 'Collection id required' }, 400);
        let c = findCollection(catalog, id);
        if (!c) {
            c = { id, name: id, theme: '', artist: 'KŮA', order: [], songs: {}, createdAt: new Date().toISOString() };
            catalog.collections.push(c);
        }
        for (const field of ['name', 'theme', 'artist']) {
            if (typeof body[field] === 'string' && body[field].trim()) c[field] = body[field].trim();
        }
        await writeCatalog(catalog);
        return json({ collection: c });
    }

    if (route === 'collection' && method === 'DELETE') {
        const c = findCollection(catalog, body.id);
        if (!c) return json({ error: 'Unknown collection' }, 404);
        await Promise.all(Object.values(c.songs).map(removeSongFiles));
        catalog.collections = catalog.collections.filter((x) => x !== c);
        await writeCatalog(catalog);
        return json({ ok: true });
    }

    // Create a song if new, or update its About text: { collectionId, title, lyrics?, aboutKind? }
    if (route === 'song' && method === 'POST') {
        const c = findCollection(catalog, body.collectionId);
        if (!c) return json({ error: 'Unknown collection' }, 404);
        if (!c.theme) return json({ error: 'Give this collection an art theme first' }, 409);
        const title = String(body.title || '').trim();
        const id = `${c.id}-${slug(title)}`;
        if (!slug(title)) return json({ error: 'Track name required' }, 400);
        let song = c.songs[id];
        if (!song) {
            if (c.order.length >= SONGS_PER_COLLECTION) return json({ error: `${c.name} already has ${SONGS_PER_COLLECTION} songs` }, 409);
            song = { id, title, lyrics: '', createdAt: new Date().toISOString() };
            c.songs[id] = song;
            c.order.push(id);
        }
        if (typeof body.lyrics === 'string' && body.lyrics.trim()) {
            song.lyrics = body.lyrics.trim();
            if (ABOUT_KINDS.includes(body.aboutKind)) song.aboutKind = body.aboutKind;
        }
        await writeCatalog(catalog);
        return json({ song });
    }

    // Edit a song: { collectionId, songId, title?, lyrics?, aboutKind? }
    if (route === 'song' && method === 'PATCH') {
        const song = findCollection(catalog, body.collectionId)?.songs[body.songId];
        if (!song) return json({ error: 'Unknown song' }, 404);
        if (typeof body.title === 'string' && body.title.trim()) song.title = body.title.trim();
        if (typeof body.lyrics === 'string') song.lyrics = body.lyrics.trim();
        if (ABOUT_KINDS.includes(body.aboutKind)) song.aboutKind = body.aboutKind;
        await writeCatalog(catalog);
        return json({ song });
    }

    if (route === 'song' && method === 'DELETE') {
        const c = findCollection(catalog, body.collectionId);
        const song = c?.songs[body.songId];
        if (!song) return json({ error: 'Unknown song' }, 404);
        await removeSongFiles(song);
        delete c.songs[song.id];
        c.order = c.order.filter((id) => id !== song.id);
        await writeCatalog(catalog);
        return json({ ok: true });
    }

    // Reorder: { collectionId, order: [songId…] }
    if (route === 'order' && method === 'POST') {
        const c = findCollection(catalog, body.collectionId);
        if (!c || !Array.isArray(body.order)) return json({ error: 'Unknown collection' }, 404);
        const known = new Set(c.order);
        const next = body.order.filter((id) => known.has(id));
        if (next.length !== c.order.length) return json({ error: 'Order must list every song once' }, 400);
        c.order = next;
        await writeCatalog(catalog);
        return json({ ok: true });
    }

    return json({ error: 'Not found' }, 404);
};

async function removeSongFiles(song) {
    const jobs = [song.v1, song.v2].filter(Boolean).map((v) => deleteAudio(v.key));
    if (song.cover) jobs.push(store('covers').delete(song.cover.key));
    const votes = store('votes');
    const { blobs } = await votes.list({ prefix: `${song.id}/` });
    jobs.push(...blobs.map((b) => votes.delete(b.key)));
    await Promise.all(jobs);
}

export const config = { path: ['/api/admin', '/api/admin/*'] };
