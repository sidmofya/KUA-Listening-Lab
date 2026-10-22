import { findCollection, isAdmin, json, readCatalog, store, writeCatalog } from '../lib/common.mjs';
import { aiCover, coverPrompt, generativeCover } from '../lib/cover.mjs';

// GET  /api/cover/<key>  – public image
// POST /api/cover        – (studio) { collectionId, songId, mode?: 'auto' | 'generative' }
export default async (req) => {
    const covers = store('covers');

    if (req.method === 'GET') {
        const key = decodeURIComponent(new URL(req.url).pathname.replace(/^\/api\/cover\/?/, ''));
        const blob = key && await covers.getWithMetadata(key, { type: 'arrayBuffer' });
        if (!blob) return new Response('Not found', { status: 404 });
        return new Response(blob.data, {
            headers: { 'content-type': blob.metadata.type || 'image/png', 'cache-control': 'public, max-age=31536000, immutable' }
        });
    }

    if (!isAdmin(req)) return json({ error: 'Not signed in' }, 401);
    const { collectionId, songId, mode = 'auto' } = await req.json().catch(() => ({}));
    const catalog = await readCatalog();
    const collection = findCollection(catalog, collectionId);
    const song = collection?.songs[songId];
    if (!song) return json({ error: 'Unknown song' }, 404);
    if (!collection.theme) return json({ error: 'This collection has no art theme yet' }, 409);

    const input = { theme: collection.theme, title: song.title, lyrics: song.lyrics };
    let image, warning = null;
    if (mode !== 'generative' && process.env.GEMINI_API_KEY) {
        try {
            image = await aiCover(coverPrompt(input));
        } catch (e) {
            warning = `AI cover unavailable, used generative art instead (${e.message})`;
        }
    } else if (mode !== 'generative') {
        warning = 'No GEMINI_API_KEY set, used generative art';
    }
    if (!image) image = { bytes: Buffer.from(generativeCover(input)), type: 'image/svg+xml', source: 'generative' };

    const key = `${song.id}/${Date.now().toString(36)}`;
    await covers.set(key, image.bytes, { metadata: { type: image.type } });
    const previous = song.cover;
    song.cover = { key, source: image.source, createdAt: new Date().toISOString() };
    await writeCatalog(catalog);
    if (previous) await covers.delete(previous.key);

    return json({ cover: song.cover, url: `/api/cover/${key}`, warning });
};

export const config = { path: ['/api/cover', '/api/cover/*'] };
