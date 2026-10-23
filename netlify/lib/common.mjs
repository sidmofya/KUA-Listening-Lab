import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';

// Audio is stored and served in parts this size, keeping every request and
// response under Netlify's ~6 MB function payload limit.
export const CHUNK = 4 * 1024 * 1024;
export const SONGS_PER_COLLECTION = 10;

// What a song's "About this song" text is. 'versions' notes stay hidden from listeners until they vote.
export const ABOUT_KINDS = ['lyrics', 'story', 'versions', 'notes'];

export const store = (name) => getStore({ name, consistency: 'strong' });

export function json(data, status = 200, headers = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers }
    });
}

export function slug(s) {
    return String(s ?? '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------
// Studio session: an HMAC-signed cookie, valid for 30 days
// ---------------------------------------------------------------

const SESSION_DAYS = 30;

function secret() {
    return process.env.SESSION_SECRET || process.env.STUDIO_PASSWORD || '';
}

function signature(payload) {
    return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function checkPassword(password) {
    const expected = process.env.STUDIO_PASSWORD || '';
    if (!expected || typeof password !== 'string') return false;
    const a = crypto.createHash('sha256').update(password).digest();
    const b = crypto.createHash('sha256').update(expected).digest();
    return crypto.timingSafeEqual(a, b);
}

export function sessionCookie() {
    const exp = Date.now() + SESSION_DAYS * 864e5;
    const payload = `studio.${exp}`;
    return `studio=${payload}.${signature(payload)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}`;
}

export const clearCookie = 'studio=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0';

export function isAdmin(req) {
    if (!secret()) return false;
    const m = (req.headers.get('cookie') || '').match(/(?:^|;\s*)studio=([^;]+)/);
    if (!m) return false;
    const [kind, exp, sig] = m[1].split('.');
    if (kind !== 'studio' || !(Number(exp) > Date.now()) || !sig) return false;
    const expected = signature(`${kind}.${exp}`);
    return sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

// ---------------------------------------------------------------
// Catalog: one JSON blob describing every collection and song
// ---------------------------------------------------------------

export async function readCatalog() {
    const c = await store('catalog').get('index', { type: 'json' });
    return c || { collections: [] };
}

export async function writeCatalog(catalog) {
    catalog.updatedAt = new Date().toISOString();
    await store('catalog').setJSON('index', catalog);
}

export function findCollection(catalog, id) {
    return catalog.collections.find((c) => c.id === id);
}

export function isLive(song) {
    return !!(song.v1 && song.v2);
}

// The listener-facing view: live songs only, in the curated order.
export function publicCatalog(catalog) {
    return {
        updatedAt: catalog.updatedAt,
        collections: catalog.collections
            .map((c) => ({
                id: c.id,
                name: c.name,
                total: SONGS_PER_COLLECTION,
                songs: c.order
                    .map((id) => c.songs[id])
                    .filter((s) => s && isLive(s))
                    .map((s) => ({
                        id: s.id,
                        title: s.title,
                        artist: s.artist || c.artist || 'KŮA',
                        about: { kind: s.aboutKind || 'lyrics', text: s.lyrics || '' },
                        cover: s.cover ? `/api/cover/${s.cover.key}` : null,
                        v1: `/api/audio/${s.v1.key}`,
                        v2: `/api/audio/${s.v2.key}`,
                        revs: { v1: s.v1.rev, v2: s.v2.rev }
                    }))
            }))
            .filter((c) => c.songs.length)
    };
}

export async function deleteAudio(key) {
    const audio = store('audio');
    const { blobs } = await audio.list({ prefix: `${key}/` });
    await Promise.all(blobs.map((b) => audio.delete(b.key)));
}
