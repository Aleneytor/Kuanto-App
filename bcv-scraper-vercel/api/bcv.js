/**
 * BCV Scraper - Vercel Serverless Function
 * Scrapea directamente la página del BCV ignorando errores de SSL
 * 
 * Endpoint: GET /api/bcv
 * Response: { success: true, date: "YYYY-MM-DD", usd: 123.45, eur: 145.67 }
 */

const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

// Agent que ignora errores de certificado SSL
const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        console.log('🔍 Fetching BCV website...');

        // Fetch BCV directly, ignoring SSL certificate errors
        const response = await axios.get('https://www.bcv.org.ve/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'es-VE,es;q=0.9,en;q=0.8',
            },
            httpsAgent,
            timeout: 9000
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // Extract USD rate
        const usdText = $('#dolar .centrado strong').first().text().trim();

        // Extract EUR rate
        const eurText = $('#euro .centrado strong').first().text().trim();

        // Extract fecha valor (valid date)
        const dateContent = $('span[property="dc:date"]').first().attr('content');

        console.log(`Raw data - USD: "${usdText}", EUR: "${eurText}", Date: "${dateContent}"`);

        // Parse rates (BCV uses comma as decimal: "47,15" -> 47.15)
        const parseRate = (text) => {
            if (!text) return 0;
            return parseFloat(text.replace(',', '.'));
        };

        const usd = parseRate(usdText);
        const eur = parseRate(eurText);

        if (!usd || !eur) {
            return res.status(500).json({
                success: false,
                error: `Failed to parse rates. USD="${usdText}", EUR="${eurText}"`
            });
        }

        // Extract target date
        let targetDate = new Date().toISOString().split('T')[0];
        if (dateContent) {
            targetDate = dateContent.split('T')[0];
        }

        console.log(`✅ Parsed - Date: ${targetDate}, USD: ${usd}, EUR: ${eur}`);

        return res.status(200).json({
            success: true,
            date: targetDate,
            usd,
            eur,
            source: 'bcv-direct',
            fetchedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
