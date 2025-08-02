exports.handler = async (event) => {
    try {
        // Generate random number between 1 and 100
        const randomNumber = Math.floor(Math.random() * 100) + 1;
        
        return {
            statusCode: 200,
            body: JSON.stringify({ 
                number: randomNumber,
                timestamp: new Date().toISOString()
            })
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