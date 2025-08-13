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
    const data = await store.get(id);

    if (data === undefined || data === null) {
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
