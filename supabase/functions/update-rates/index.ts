// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BINANCE_URL = 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search';
const BYBIT_URL = 'https://api2.bybit.com/fiat/otc/item/online';
const YADIO_URL = 'https://api.yadio.io/json';

const HEADERS = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json'
};

Deno.serve(async (req) => {
    try {
        console.log('Starting rate update...');

        // 1. Fetch from all sources in parallel
        const [binanceData, bybitData, yadioData] = await Promise.all([
            fetchBinanceRate(),
            fetchBybitRate(),
            fetchYadioRate()
        ]);

        console.log('Fetched Rates:', { binance: binanceData, bybit: bybitData, yadio: yadioData });

        // 2. Calculate Average (only using valid > 0 rates)
        let p2pSum = 0;
        let p2pCount = 0;

        // Binance (Buy & Sell)
        if (binanceData.buy > 0) { p2pSum += binanceData.buy; p2pCount++; }
        if (binanceData.sell > 0) { p2pSum += binanceData.sell; p2pCount++; }

        // Bybit (Buy & Sell)
        if (bybitData.buy > 0) { p2pSum += bybitData.buy; p2pCount++; }
        if (bybitData.sell > 0) { p2pSum += bybitData.sell; p2pCount++; }

        // Yadio (Buy & Sell - usually same)
        if (yadioData.buy > 0) { p2pSum += yadioData.buy; p2pCount++; }
        if (yadioData.sell > 0) { p2pSum += yadioData.sell; p2pCount++; }

        const averagePrice = p2pCount > 0 ? p2pSum / p2pCount : 0;

        console.log(`Calculated Average: ${averagePrice.toFixed(4)} from ${p2pCount} sources`);

        if (averagePrice === 0) {
            return new Response(JSON.stringify({ error: 'Failed to calculate average, all sources returned 0' }), {
                headers: { 'Content-Type': 'application/json' },
                status: 500,
            });
        }

        // 3. Insert into Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data, error } = await supabase
            .from('crypto_rates')
            .insert({
                binance_price: (binanceData.buy + binanceData.sell) / 2 || 0, // Approx avg for storage
                bybit_price: (bybitData.buy + bybitData.sell) / 2 || 0,
                yadio_price: (yadioData.buy + yadioData.sell) / 2 || 0,
                average_price: averagePrice
            })
            .select();

        if (error) {
            throw error;
        }

        return new Response(JSON.stringify({ success: true, data }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (err) {
        console.error('Error updating rates:', err);
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});

// --- Fetching Helper Functions ---

async function fetchBinanceRate() {
    const getRate = async (tradeType: string) => {
        try {
            const res = await fetch(BINANCE_URL, {
                method: 'POST',
                headers: { ...HEADERS, 'Origin': 'https://p2p.binance.com' },
                body: JSON.stringify({
                    asset: 'USDT',
                    fiat: 'VES',
                    merchantCheck: false,
                    page: 1,
                    payTypes: [],
                    publisherType: null,
                    rows: 10,
                    tradeType: tradeType
                })
            });
            const json = await res.json();
            if (json.data && json.data.length > 0) {
                const prices = json.data.map((item: any) => parseFloat(item.adv.price));
                return prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
            }
            return 0;
        } catch (e) {
            console.error(`Binance ${tradeType} error:`, e);
            return 0;
        }
    };

    const [buy, sell] = await Promise.all([getRate('BUY'), getRate('SELL')]);
    return { buy, sell };
}

async function fetchBybitRate() {
    const getRate = async (side: string) => {
        try {
            const res = await fetch(BYBIT_URL, {
                method: 'POST',
                headers: { ...HEADERS, 'Origin': 'https://www.bybit.com' },
                body: JSON.stringify({
                    tokenId: "USDT",
                    currencyId: "VES",
                    side: side === 'BUY' ? "1" : "0",
                    size: "10",
                    page: "1",
                    amount: "",
                    authMaker: false,
                    canTrade: false
                })
            });
            const json = await res.json();
            if (json.result && json.result.items && json.result.items.length > 0) {
                const prices = json.result.items.map((item: any) => parseFloat(item.price));
                return prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
            }
            return 0;
        } catch (e) {
            console.error(`Bybit ${side} error:`, e);
            return 0;
        }
    };

    const [buy, sell] = await Promise.all([getRate('BUY'), getRate('SELL')]);
    return { buy, sell };
}

async function fetchYadioRate() {
    try {
        const res = await fetch(YADIO_URL, { headers: HEADERS });
        const json = await res.json();
        if (json.USD && json.USD.rate) {
            return { buy: json.USD.rate, sell: json.USD.rate };
        }
        return { buy: 0, sell: 0 };
    } catch (e) {
        console.error('Yadio error:', e);
        return { buy: 0, sell: 0 };
    }
}
