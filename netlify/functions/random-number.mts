import { getStore } from '@netlify/blobs';
import { Context } from '@netlify/functions';

export default async function handler(request: Request, context: Context) {
    const store = getStore({ name: 'numbers', consistency: 'strong' });
    // Generate random number between 1 and 100
    const randomNumber = Math.floor(Math.random() * 100) + 1;

    const randomNumberResponse = {
        number: randomNumber,
        timestamp: new Date().toISOString()
    };

    await store.setJSON(randomNumber.toString(), randomNumberResponse);

    return new Response(JSON.stringify(randomNumberResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
};