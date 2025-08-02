import { getStore } from "@netlify/blobs";


exports.handler = async (event) => {
    try {
        // const store = getStore({
        //     name: 'numbers',
        //     consistency: 'strong',
        //     siteID: process.env.NETLIFY_BLOBS_SITE_ID,
        //     token: process.env.NETLIFY_BLOBS_TOKEN
        // });
        // Generate random number between 1 and 100
        const randomNumber = Math.floor(Math.random() * 100) + 1;
        
        const randomNumberResponse = {
            number: randomNumber,
            timestamp: new Date().toISOString()
        };

        await getStore("numbers").setJSON(randomNumber.toString(), randomNumberResponse);

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