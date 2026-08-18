const fs = require('fs');

async function test() {
    const data = JSON.parse(fs.readFileSync('scratch_payload_50.json', 'utf8'));
    console.log('Sending request...');
    const start = Date.now();
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch('https://workplace.intersmart.in/api/api/v1/biometric/ingest', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': 'Bearer $2b$12$AKB9GDXaBqHI9DtVqI0U9uCiroYoQRVHGQAL2cJyOyYhnP0AjKX2O'
            },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        console.log('Response:', response.status);
        const text = await response.text();
        console.log('Body:', text);
    } catch (e) {
        console.log('Error:', e.message);
    }
    console.log('Took', Date.now() - start, 'ms');
}
test();
