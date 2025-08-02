import { getStore } from '@netlify/blobs';
import { Context } from '@netlify/functions';

export default async function handler(request: Request, context: Context) {
    // try {
    throw new Error('This function is currently disabled for testing purposes.');
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
    // } catch (error) {
    //     return new Response(JSON.stringify({
    //         error: 'Failed to generate random number',
    //         message: error.message
    //     }), {
    //         status: 500,
    //         headers: { 'Content-Type': 'application/json' }
    //     });
    // }
};