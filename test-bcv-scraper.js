/**
 * Test de múltiples proxies para BCV
 */
const cheerio = require('cheerio');
const axios = require('axios');

const bcvUrl = "http://www.bcv.org.ve/";

const proxies = [
    { name: 'corsproxy.io', url: `https://corsproxy.io/?${encodeURIComponent(bcvUrl)}` },
    { name: 'thingproxy', url: `https://thingproxy.freeboard.io/fetch/${bcvUrl}` },
];

async function testProxy(proxy) {
    console.log(`\n🔍 Probando ${proxy.name}...`);
    try {
        const response = await axios.get(proxy.url, {
            headers: { "User-Agent": "Mozilla/5.0" },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const usdText = $('#dolar .centrado strong').first().text().trim();
        const eurText = $('#euro .centrado strong').first().text().trim();
        const dateContent = $('span[property="dc:date"]').first().attr('content');

        if (usdText && eurText) {
            console.log(`✅ ${proxy.name} FUNCIONA!`);
            console.log(`   USD: ${usdText}`);
            console.log(`   EUR: ${eurText}`);
            console.log(`   Fecha: ${dateContent?.split('T')[0]}`);
            return { success: true, name: proxy.name, url: proxy.url };
        } else {
            console.log(`❌ ${proxy.name}: No se pudieron extraer datos`);
            return { success: false };
        }
    } catch (error) {
        console.log(`❌ ${proxy.name}: ${error.message}`);
        return { success: false };
    }
}

async function main() {
    console.log('Probando proxies para acceder al BCV...');

    for (const proxy of proxies) {
        const result = await testProxy(proxy);
        if (result.success) {
            console.log(`\n🎉 ¡Usar ${result.name} en Supabase!`);
            return;
        }
    }

    console.log('\n❌ Ningún proxy funcionó. Usar APIs alternativas (dolarapi.com)');
}

main();
