const axios = require('axios');

const API_URL = process.env.API_URL;
const API_SECRET = process.env.API_SECRET;

/**
 * Sends a batch of events to the Stage 2 API.
 * Uses exponential backoff (up to 3 retries) on 5xx or network errors.
 */
async function sendBatch(batch, batchIndex, totalBatches) {
    const maxRetries = 3;
    let delay = 2000; // start with 2s

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`[API] Sending batch ${batchIndex}/${totalBatches} (${batch.length} events) - Attempt ${attempt}`);
            const response = await axios.post(API_URL, { events: batch }, {
                headers: {
                    'Authorization': `Bearer ${API_SECRET}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 10000
            });
            
            console.log(`[API] Batch ${batchIndex} successful. Status: ${response.status}`);
            return response.data;
        } catch (error) {
            // Strict Redaction of Authorization Header
            if (error.config && error.config.headers) {
                error.config.headers['Authorization'] = '[REDACTED]';
            }
            if (error.response && error.response.config && error.response.config.headers) {
                error.response.config.headers['Authorization'] = '[REDACTED]';
            }

            const status = error.response ? error.response.status : 'Network/Timeout';
            console.error(`[API] Batch ${batchIndex} failed on attempt ${attempt}. Status: ${status}`);
            
            // Only retry on 5xx or network errors
            if (status !== 'Network/Timeout' && (status < 500 || status === 401 || status === 422)) {
                console.error(`[API] Unrecoverable error (e.g. 401/422). Aborting batch.`);
                console.error(error.response ? error.response.data : error.message);
                return false;
            }

            if (attempt < maxRetries) {
                console.log(`[API] Retrying in ${delay}ms...`);
                await new Promise(res => setTimeout(res, delay));
                delay *= 2;
            } else {
                console.error(`[API] Batch ${batchIndex} permanently failed after ${maxRetries} attempts.`);
                return false;
            }
        }
    }
}

module.exports = { sendBatch };
