import { getStore } from '@netlify/blobs';
import { Context } from '@netlify/functions';

import Pusher from 'pusher';



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

    let bodyText: string;
    try {
        bodyText = await request.text();
    } catch (e) {
        return new Response(JSON.stringify({
            errorType: "Error",
            errorMessage: "Invalid request body"
        }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    if (!bodyText) {
        return new Response(JSON.stringify({
            errorType: "Error",
            errorMessage: "Missing request body"
        }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    else if (bodyText.length > 2048) {
        return new Response(JSON.stringify({
            errorType: "Error",
            errorMessage: "Message is too large to send!"
        }), {
            status: 413,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const store = getStore({ name: 'send', consistency: 'strong' });
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
    await store.set(`${id}/${timestamp}`, bodyText, { onlyIfNew: true, metadata: { timestamp } });

    if (!process.env.PUSHER_APP_ID) {
    throw new Error('PUSHER_APP_ID environment variable is required');
    }
    if (!process.env.PUSHER_APP_KEY) {
    throw new Error('PUSHER_APP_KEY environment variable is required');
    }
    if (!process.env.PUSHER_APP_SECRET) {
    throw new Error('PUSHER_APP_SECRET environment variable is required');
    }

    const pusher = new Pusher({
        appId: process.env.PUSHER_APP_ID,
        key: process.env.PUSHER_APP_KEY,
        secret: process.env.PUSHER_APP_SECRET,
        cluster: "us2",
        useTLS: true
    });

    pusher.trigger(id, "update", {});
    pusher.trigger(id, "update", bodyText);

    // For now, just return a success response.
    return new Response(JSON.stringify({
        success: true,
        message: "Data received",
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}
