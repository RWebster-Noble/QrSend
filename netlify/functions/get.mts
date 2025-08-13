import { getStore } from '@netlify/blobs';
import { Context } from '@netlify/functions';

export default async function handler(request: Request, context: Context) {
    if (request.method !== 'GET') {
        return new Response(JSON.stringify({
            errorType: "Error",
            errorMessage: "Only GET requests are allowed"
        }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('p');
    if (!id) {
        return new Response(JSON.stringify({
            errorType: "Error",
            errorMessage: "Missing 'p' query parameter"
        }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const store = getStore({ name: 'send', consistency: 'eventual' });
    const { blobs } = await store.list({ prefix: `${id}/` });

    if (!blobs || blobs.length === 0) {
        return new Response(null, {
            status: 204
        });
    }

    const data: { k: string; d: string }[] = [];
    for (const blob of blobs) {
        const d = await store.get(blob.key);
        data.push({
            k: blob.key,
            d: d
        });
    }

    return new Response(JSON.stringify({
        success: true,
        data
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}
