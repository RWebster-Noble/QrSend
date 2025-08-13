import { getStore } from '@netlify/blobs';
import { Context } from '@netlify/functions';

export default async function handler(request: Request, context: Context) {
    if (request.method !== 'DELETE') {
        return new Response(JSON.stringify({
            errorType: "Error",
            errorMessage: "Only DELETE requests are allowed"
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

    const store = getStore({ name: 'send', consistency: 'strong' });
    for await (const entry of store.list({ prefix: `${id}/`, paginate: true })) {
        for (const blob of entry.blobs) {
            await store.delete(blob.key);
        }
    }

    return new Response(JSON.stringify({
        success: true,
        message: `Cleared all blobs for id '${id}'`
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}
