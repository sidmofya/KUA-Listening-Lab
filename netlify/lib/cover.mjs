import crypto from 'node:crypto';

// ---------------------------------------------------------------
// AI covers via Google's Generative Language API
// ---------------------------------------------------------------

const API = 'https://generativelanguage.googleapis.com/v1beta/models';

export function coverPrompt({ theme, title, lyrics }) {
    const excerpt = String(lyrics || '')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('['))
        .join(' / ')
        .slice(0, 240);
    return [
        `Square album cover artwork for the song "${title}".`,
        `It belongs to a series of covers that share one art direction: ${theme}.`,
        excerpt ? `Let the mood and imagery draw on these lyrics: "${excerpt}".` : '',
        'One strong, simple central image with rich texture, suitable for a small thumbnail.',
        'Absolutely no text, letters, numbers, logos or watermarks anywhere in the image.'
    ].filter(Boolean).join(' ');
}

export async function aiCover(prompt) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY not set');
    const models = (process.env.COVER_MODELS || 'gemini-3.1-flash-image,gemini-2.5-flash-image').split(',').map((m) => m.trim()).filter(Boolean);
    // Netlify stops synchronous functions after ~10 s; leave room to fall back.
    const deadline = Date.now() + Number(process.env.COVER_TIMEOUT_MS || 8500);
    const errors = [];

    for (const model of models) {
        const left = deadline - Date.now();
        if (left < 1500) break;
        try {
            const res = await fetch(`${API}/${model}:${model.startsWith('imagen') ? 'predict' : 'generateContent'}`, {
                method: 'POST',
                headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
                signal: AbortSignal.timeout(left),
                body: JSON.stringify(model.startsWith('imagen')
                    ? { instances: [{ prompt }], parameters: { sampleCount: 1, aspectRatio: '1:1' } }
                    : { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '1:1' } } })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
            const img = model.startsWith('imagen')
                ? data.predictions?.[0]
                : data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
            const b64 = img?.bytesBase64Encoded || img?.data;
            if (!b64) throw new Error('No image returned (possibly blocked by safety filters)');
            return { bytes: Buffer.from(b64, 'base64'), type: img.mimeType || 'image/png', source: model };
        } catch (e) {
            errors.push(`${model}: ${e.name === 'TimeoutError' ? 'timed out' : e.message}`);
            // Image models have no free tier: a quota error means billing is off, so every model will fail the same way.
            if (/quota|billing/i.test(e.message)) {
                throw new Error('Google image generation needs billing enabled on the API key\'s project (the free tier allows 0 images)');
            }
        }
    }
    throw new Error(errors.join(' · ') || 'AI cover timed out');
}

// ---------------------------------------------------------------
// AI covers via OpenAI (preferred when OPENAI_API_KEY is set)
//
// Image models often need 10–40 s, longer than Netlify lets a function run,
// so the job runs in OpenAI's background mode: one call starts it and short
// follow-up calls collect the result.
// ---------------------------------------------------------------

const openAIBase = () => process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const openAIHeaders = () => ({ authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'content-type': 'application/json' });

export function coverProvider() {
    if (process.env.OPENAI_API_KEY) return 'openai';
    if (process.env.GEMINI_API_KEY) return 'gemini';
    return null;
}

function openAIMessage(message) {
    const m = String(message || '');
    if (/verif/i.test(m)) return 'OpenAI needs your organization verified before it makes images (platform.openai.com → Settings → Organization → Verify)';
    if (/billing|quota|credit|insufficient/i.test(m)) return 'Your OpenAI account has no credits for image generation (platform.openai.com → Billing)';
    if (/safety|moderation|policy/i.test(m)) return 'OpenAI declined this prompt on safety grounds';
    if (/does not exist|model_not_found/i.test(m)) return `OpenAI doesn't offer that image model to this key (${m}); set OPENAI_IMAGE_MODEL to one it lists`;
    return m || 'OpenAI image generation failed';
}

export async function startOpenAICover(prompt) {
    const res = await fetch(`${openAIBase()}/responses`, {
        method: 'POST',
        headers: openAIHeaders(),
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify({
            model: process.env.OPENAI_TEXT_MODEL || 'gpt-4.1-mini',
            background: true,
            store: true,
            input: prompt,
            // Name the image model explicitly: the tool's default (gpt-image-1) has been retired and fails with a generic server error.
            // JPEG keeps covers around 200 KB instead of multi-megabyte PNGs.
            tools: [{
                type: 'image_generation',
                model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2',
                size: '1024x1024',
                quality: process.env.OPENAI_IMAGE_QUALITY || 'medium',
                output_format: 'jpeg',
                output_compression: 85
            }],
            tool_choice: { type: 'image_generation' }
        })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(openAIMessage(data.error?.message || `HTTP ${res.status}`));
    return data.id;
}

// Resolves to null while the job is still running, or to the finished image.
export async function pollOpenAICover(id) {
    const res = await fetch(`${openAIBase()}/responses/${encodeURIComponent(id)}`, {
        headers: openAIHeaders(),
        signal: AbortSignal.timeout(8000)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(openAIMessage(data.error?.message || `HTTP ${res.status}`));
    if (data.status === 'queued' || data.status === 'in_progress') return null;
    if (data.status !== 'completed') {
        throw new Error(openAIMessage(data.error?.message || data.incomplete_details?.reason || `generation ${data.status}`));
    }
    const call = (data.output || []).find((o) => o.type === 'image_generation_call' && o.result);
    if (!call) throw new Error('OpenAI returned no image (possibly blocked by its safety filters)');
    return { bytes: Buffer.from(call.result, 'base64'), type: 'image/jpeg', source: 'openai' };
}

// ---------------------------------------------------------------
// Generative fallback: palette and style from the theme, variation from the title
// ---------------------------------------------------------------

const COLOR_WORDS = [
    [/copper|rust|terracotta|clay|bronze|amber/, ['#b87333', '#8b4513', '#d4a574']],
    [/indigo|navy|cobalt|ocean|sea|blue|denim/, ['#22306b', '#3b5bd6', '#8fb0ff']],
    [/teal|turquoise|lagoon|jade/, ['#0f5e5c', '#2a9d8f', '#9fe3d6']],
    [/green|forest|jungle|moss|olive|leaf/, ['#1f4d2b', '#5c8a3a', '#c4d69a']],
    [/gold|yellow|sun|honey|saffron|mustard/, ['#c9971c', '#f2c14e', '#fff0b8']],
    [/red|crimson|oxblood|blood|cherry|wine/, ['#5a1a17', '#b3261e', '#f08a7a']],
    [/pink|rose|blush|coral|peach/, ['#c45a7a', '#f2a7b8', '#ffe0e6']],
    [/purple|violet|lilac|plum|lavender/, ['#3d2160', '#7b4fb0', '#d2b8f0']],
    [/black|noir|night|midnight|ink|shadow/, ['#0d0d0f', '#2a2a30', '#5a5a66']],
    [/sand|desert|earth|ochre|dust|savanna/, ['#8a6a3b', '#c8a26a', '#efdcb6']],
    [/grey|gray|concrete|stone|slate/, ['#3e3e40', '#7c7b78', '#c9c7c2']]
];
const LIGHT_WORDS = /minimal|paper|white|cream|pastel|bright|light|airy|swiss/;
const STYLE_WORDS = [
    [/geometric|bauhaus|grid|modular|swiss|tile/, 'grid'],
    [/sun|sunset|sunrise|dawn|dusk|horizon/, 'sun'],
    [/wave|water|ocean|river|sea|flow|tide/, 'bands'],
    [/retro|70s|seventies|psychedel|groovy|disco/, 'arcs'],
    [/dream|soft|cloud|haze|nebula|cosmic|space|orb/, 'orbs']
];
const STYLES = ['orbs', 'bands', 'arcs', 'grid', 'sun'];

function rng(seedText) {
    let a = crypto.createHash('sha256').update(seedText).digest().readUInt32LE(0);
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function generativeCover({ theme, title }) {
    const t = String(theme || '').toLowerCase();
    const themeRand = rng(`theme:${t}`);
    const r = rng(`song:${t}:${title}`);

    let colors = COLOR_WORDS.filter(([re]) => re.test(t)).flatMap(([, c]) => c);
    if (colors.length < 3) {
        const h = Math.floor(themeRand() * 360);
        colors = colors.concat([`hsl(${h} 45% 22%)`, `hsl(${(h + 30) % 360} 55% 48%)`, `hsl(${(h + 200) % 360} 40% 78%)`]);
    }
    const light = LIGHT_WORDS.test(t);
    const bg = light ? '#efe9de' : '#141210';
    const pick = () => colors[Math.floor(r() * colors.length)];
    const style = (STYLE_WORDS.find(([re]) => re.test(t)) || [, STYLES[Math.floor(themeRand() * STYLES.length)]])[1];

    let shapes = '';
    if (style === 'orbs') {
        for (let i = 0; i < 6; i++) shapes += `<circle cx="${r() * 1000}" cy="${r() * 1000}" r="${150 + r() * 320}" fill="${pick()}" opacity="${0.5 + r() * 0.4}" filter="url(#blur)"/>`;
    } else if (style === 'bands') {
        const n = 6 + Math.floor(r() * 5);
        for (let i = n; i >= 0; i--) {
            const y = 120 + (i / n) * 900, amp = 30 + r() * 90, ph = r() * 1000;
            shapes += `<path d="M0 ${y} C ${250 + ph % 200} ${y - amp}, ${650 - ph % 200} ${y + amp}, 1000 ${y} V1000 H0 Z" fill="${pick()}"/>`;
        }
    } else if (style === 'arcs') {
        const cx = r() < 0.5 ? 0 : 1000, cy = 1000;
        for (let i = 9; i > 0; i--) shapes += `<circle cx="${cx}" cy="${cy}" r="${i * (90 + r() * 30)}" fill="${pick()}"/>`;
    } else if (style === 'grid') {
        const n = 3 + Math.floor(r() * 3), s = 1000 / n;
        for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) {
            const kind = Math.floor(r() * 4), px = x * s, py = y * s;
            if (kind === 0) shapes += `<rect x="${px}" y="${py}" width="${s}" height="${s}" fill="${pick()}"/>`;
            else if (kind === 1) shapes += `<circle cx="${px + s / 2}" cy="${py + s / 2}" r="${s * 0.42}" fill="${pick()}"/>`;
            else if (kind === 2) shapes += `<path d="M${px} ${py} h${s} v${s} A${s} ${s} 0 0 1 ${px} ${py}z" fill="${pick()}"/>`;
            else shapes += `<path d="M${px} ${py + s} L${px + s / 2} ${py} L${px + s} ${py + s}z" fill="${pick()}"/>`;
        }
    } else {
        const horizon = 560 + r() * 160;
        shapes += `<circle cx="${300 + r() * 400}" cy="${horizon}" r="${180 + r() * 140}" fill="${pick()}"/>`;
        for (let i = 0; i < 5; i++) shapes += `<rect x="0" y="${horizon + i * 42}" width="1000" height="${10 + i * 5}" fill="${bg}"/>`;
        shapes += `<rect x="0" y="${horizon + 230}" width="1000" height="1000" fill="${pick()}"/>`;
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">
<defs>
<filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="60"/></filter>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="${Math.floor(r() * 99)}"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .5 0"/></filter>
</defs>
<rect width="1000" height="1000" fill="${bg}"/>
${shapes}
<rect width="1000" height="1000" filter="url(#grain)" opacity=".35"/>
</svg>`;
}
