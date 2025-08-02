// import { getStore } from '@netlify/blobs';
// import { Context } from "@netlify/functions"

// export default async function handler(req, context) {
//     // try {
//         const store = getStore({
//             name: 'numbers',
//             consistency: 'strong'
//         });
        
//         // Generate random number between 1 and 100
//         const randomNumber = Math.floor(Math.random() * 100) + 1;
        
//         const randomNumberResponse = {
//             number: randomNumber,
//             timestamp: new Date().toISOString()
//         };

//         await store.setJSON(randomNumber.toString(), randomNumberResponse);

//         return {
//             statusCode: 200,
//             body: JSON.stringify(randomNumberResponse)
//         };
//     // } catch (error) {
//     //     return {
//     //         statusCode: 500,
//     //         body: JSON.stringify({ 
//     //             error: 'Failed to generate random number',
//     //             message: error.message
//     //         })
//     //     };
//     // }
// };

import { getStore } from '@netlify/blobs';

export default async function handler(req, context) {
    try {
        const siteID = process.env.NETLIFY_BLOBS_SITE_ID;
        const token = process.env.NETLIFY_BLOBS_TOKEN;
        const store = getStore({
            name: 'numbers',
            consistency: 'strong',
            siteID,
            token
        });
        // Generate random number between 1 and 100
        const randomNumber = Math.floor(Math.random() * 100) + 1;
        
        const randomNumberResponse = {
            number: randomNumber,
            timestamp: new Date().toISOString()
        };

        await store.setJSON(randomNumber.toString(), randomNumberResponse);

        return {
            statusCode: 200,
            body: JSON.stringify(randomNumberResponse)
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Failed to generate random number',
                message: error.message
            })
        };
    }
};