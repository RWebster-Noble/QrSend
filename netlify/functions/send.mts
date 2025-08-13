import { getStore } from '@netlify/blobs';
import { Context } from '@netlify/functions';

export default async function handler(request: Request, context: Context) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({
            errorType: "Error",
            errorMessage: "Only POST requests are allowed"
        }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    let body;
    try {
        body = await request.body;
    } catch (e) {
        return new Response(JSON.stringify({
            errorType: "Error",
            errorMessage: "Invalid JSON payload"
        }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    if (!body) {
        return new Response(JSON.stringify({
            errorType: "Error",
            errorMessage: "Missing request body"
        }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    else if (body.length > 2048) {
        return new Response(JSON.stringify({
            errorType: "Error",
            errorMessage: "Message is too large to send!"
        }), {
            status: 413,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const store = getStore({ name: 'send', consistency: 'eventual' });
    // Extract ID from the request URL path
    const url = new URL(request.url);
    // The path is like "/.netlify/functions/send/{id}"
    const pathParts = url.pathname.split('/');
    // Find the index of 'send' and get the next part as id
    const sendIndex = pathParts.indexOf('send');
    const id = (sendIndex !== -1 && pathParts.length > sendIndex + 1) ? pathParts[sendIndex + 1] : null;
    if (!id) {
        return new Response(JSON.stringify({
            errorType: "Error",
            errorMessage: "Missing ID in path"
        }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    await store.set(`${id}/${timestamp}`, body, { onlyIfNew: true, metadata: { timestamp } });

    // For now, just return a success response.
    return new Response(JSON.stringify({
        success: true,
        message: "Data received",
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}
