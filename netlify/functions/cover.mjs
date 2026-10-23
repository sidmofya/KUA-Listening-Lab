import { findCollection, isAdmin, json, readCatalog, store, writeCatalog } from '../lib/common.mjs';
import { aiCover, coverPrompt, coverProvider, generativeCover, pollOpenAICover, startOpenAICover } from '../lib/cover.mjs';

// An OpenAI job that hasn't finished by now is abandoned for generative art.
const JOB_TIMEOUT_MS = 3 * 60 * 1000;

// GET  /api/cover/<key>   – public image
// POST /api/cover         – (studio) { collectionId, songId, mode?: 'auto' | 'generative' }
//                           Returns the new cover, or { pending: true } while OpenAI works.
// POST /api/cover/poll    – (studio) { collectionId, songId } – collects a pending OpenAI cover
export default async (req) => {
    const covers = store('covers');
    const path = new URL(req.url).pathname;

    if (req.method === 'GET') {
        const key = decodeURIComponent(path.replace(/^\/api\/cover\/?/, ''));
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

    // Notes on how the versions differ describe production, not mood, so they stay out of the prompt.
    const input = { theme: collection.theme, title: song.title, lyrics: song.aboutKind === 'versions' ? '' : song.lyrics };
    const generative = () => ({ bytes: Buffer.from(generativeCover(input)), type: 'image/svg+xml', source: 'generative' });

    async function save(image, warning = null) {
        const key = `${song.id}/${Date.now().toString(36)}`;
        await covers.set(key, image.bytes, { metadata: { type: image.type } });
        const previous = song.cover;
        song.cover = { key, source: image.source, createdAt: new Date().toISOString() };
        delete song.coverJob;
        await writeCatalog(catalog);
        if (previous) await covers.delete(previous.key);
        return json({ cover: song.cover, url: `/api/cover/${key}`, warning });
    }

    if (path.endsWith('/poll')) {
        const job = song.coverJob;
        if (!job) return json({ cover: song.cover || null });
        try {
            const image = await pollOpenAICover(job.id);
            if (image) return save(image);
            if (Date.now() - Date.parse(job.startedAt) < JOB_TIMEOUT_MS) return json({ pending: true });
            return save(generative(), 'OpenAI took too long, used generative art instead');
        } catch (e) {
            return save(generative(), `AI cover unavailable, used generative art instead (${e.message})`);
        }
    }

    const provider = mode === 'generative' ? null : coverProvider();
    if (provider === 'openai') {
        try {
            song.coverJob = { id: await startOpenAICover(coverPrompt(input)), startedAt: new Date().toISOString() };
            await writeCatalog(catalog);
            return json({ pending: true });
        } catch (e) {
            return save(generative(), `AI cover unavailable, used generative art instead (${e.message})`);
        }
    }
    if (provider === 'gemini') {
        try {
            return save(await aiCover(coverPrompt(input)));
        } catch (e) {
            return save(generative(), `AI cover unavailable, used generative art instead (${e.message})`);
        }
    }
    return save(generative(), mode === 'generative' ? null : 'No OPENAI_API_KEY or GEMINI_API_KEY set, used generative art');
};

export const config = { path: ['/api/cover', '/api/cover/*'] };
