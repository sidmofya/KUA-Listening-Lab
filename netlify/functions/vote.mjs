import { findCollection, isLive, json, readCatalog, store } from '../lib/common.mjs';

// POST /api/vote – one record per listener per song; voting again replaces it.
export default async (req) => {
    if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
    const v = await req.json().catch(() => null);
    if (!v || !/^[a-z0-9]{8,64}$/.test(v.listenerId || '') || !['v1', 'v2'].includes(v.choseVersion) || !['A', 'B'].includes(v.shownAs)) {
        return json({ error: 'Bad vote' }, 400);
    }

    const catalog = await readCatalog();
    const song = findCollection(catalog, v.collection)?.songs[v.songId];
    if (!song || !isLive(song)) return json({ error: 'Unknown song' }, 404);

    const seconds = (n) => Math.max(0, Math.min(36000, Math.round(Number(n) || 0)));
    const votes = store('votes');
    const key = `${song.id}/${v.listenerId}`;
    const prior = await votes.get(key, { type: 'json' });
    await votes.setJSON(key, {
        collection: v.collection,
        songId: song.id,
        listenerId: v.listenerId,
        listenerName: String(v.listenerName || '').trim().slice(0, 40),
        choseVersion: v.choseVersion,
        shownAs: v.shownAs,
        secondsA: seconds(v.secondsA),
        secondsB: seconds(v.secondsB),
        switches: seconds(v.switches),
        note: String(v.note || '').trim().slice(0, 600),
        firstVotedAt: prior?.firstVotedAt || new Date().toISOString(),
        votedAt: new Date().toISOString(),
        changed: !!prior && prior.choseVersion !== v.choseVersion
    });
    return json({ ok: true });
};

export const config = { path: '/api/vote' };
