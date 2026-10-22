import { json, publicCatalog, readCatalog } from '../lib/common.mjs';

export default async () => {
    const catalog = await readCatalog();
    return json(publicCatalog(catalog), 200, { 'cache-control': 'public, max-age=0, must-revalidate' });
};

export const config = { path: '/api/catalog' };
