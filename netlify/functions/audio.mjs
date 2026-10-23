import { CHUNK, store } from '../lib/common.mjs';

// Serves uploaded audio with HTTP range support. Each response carries at most
// one stored part; browsers then request the next range themselves.
export default async (req) => {
    const key = decodeURIComponent(new URL(req.url).pathname.replace(/^\/api\/audio\//, ''));
    const audio = store('audio');
    const meta = await audio.get(`${key}/meta`, { type: 'json' });
    if (!meta) return new Response('Not found', { status: 404 });

    const size = meta.size;
    let start = 0;
    let end = size - 1;
    const range = req.headers.get('range');
    if (range) {
        const m = range.match(/bytes=(\d*)-(\d*)/);
        if (!m || (m[1] === '' && m[2] === '')) return unsatisfiable(size);
        if (m[1] === '') {
            start = Math.max(0, size - Number(m[2]));
        } else {
            start = Number(m[1]);
            if (m[2] !== '') end = Math.min(size - 1, Number(m[2]));
        }
        if (start >= size || start > end) return unsatisfiable(size);
    }

    const part = Math.floor(start / CHUNK);
    end = Math.min(end, (part + 1) * CHUNK - 1);
    const buf = await audio.get(`${key}/${part}`, { type: 'arrayBuffer' });
    if (!buf) return new Response('Missing audio part', { status: 500 });
    const body = buf.slice(start - part * CHUNK, end - part * CHUNK + 1);

    return new Response(body, {
        status: 206,
        headers: {
            'content-type': meta.type || 'audio/mpeg',
            'content-length': String(body.byteLength),
            'content-range': `bytes ${start}-${end}/${size}`,
            'accept-ranges': 'bytes',
            // Keys change whenever a version is replaced, so responses never go stale.
            'cache-control': 'public, max-age=31536000, immutable',
            'netlify-vary': 'header=Range'
        }
    });
};

function unsatisfiable(size) {
    return new Response(null, { status: 416, headers: { 'content-range': `bytes */${size}` } });
}

export const config = { path: '/api/audio/*' };
