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

    const k = url.searchParams.get('k');

    const store = getStore({ name: 'send', consistency: 'strong' });
    const { blobs } = await store.list({ prefix: `${id}/` });

    if (!blobs || blobs.length === 0) {
        return new Response(null, {
            status: 204
        });
    }

    // Sort blobs by timestamp (newest last)
    blobs.sort((a, b) => {
        const aTimestamp = parseInt(a.key.split('/')[1], 10);
        const bTimestamp = parseInt(b.key.split('/')[1], 10);
        return aTimestamp - bTimestamp;
    });

    const minTimestamp = (k === null || k === undefined || k === "") ? 0 : parseInt(k, 10);
    const data: { k: string; d: string }[] = [];
    for (const blob of blobs) {
        const blobTimestamp = parseInt(blob.key.split('/')[1], 10);
        if (blobTimestamp <= minTimestamp) {
            continue; // skip blobs with timestamp <= k
        }
        const d = await store.get(blob.key);
        data.push({
            k: blob.key,
            d: d
        });
    }

    if (data.length === 0) {
        return new Response(null, {
            status: 204
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
