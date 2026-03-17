/**
 * Test local del scraper BCV
 */
const scraper = require('./api/bcv.js');

// Mock de req/res para probar localmente
const mockReq = { method: 'GET' };
const mockRes = {
    headers: {},
    statusCode: 200,
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.statusCode = code; return this; },
    json(data) {
        console.log('\n📤 Response:', JSON.stringify(data, null, 2));
        return this;
    },
    end() { return this; }
};

console.log('🧪 Testing BCV Scraper locally...\n');
scraper(mockReq, mockRes);
