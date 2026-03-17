// Follow this setup guide to deploy: https://supabase.com/docs/guides/functions/deploy
// 1. supabase functions new update-p2p-rates
// 2. Copy this code into supabase/functions/update-p2p-rates/index.ts
// 3. supabase functions deploy update-p2p-rates
// 4. Set up the Cron in Supabase Dashboard -> Integrations -> Cron or via SQL

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Fetch Rates - Both BUY and SELL
        console.log("Fetching buy and sell rates...");

        // Binance - Buy & Sell
        const binanceBuy = await fetchBinance('BUY');
        const binanceSell = await fetchBinance('SELL');

        // Bybit - Buy & Sell
        const bybitBuy = await fetchBybit('BUY');
        const bybitSell = await fetchBybit('SELL');

        // Yadio - Only one rate (commercial)
        const yadioData = await fetchYadio();
        const yadioPrice = yadioData.buy || 0;

        // 2. Calculate Average (using BUY prices for consistency)
        const buyRates = [];
        if (binanceBuy > 0) buyRates.push(binanceBuy);
        if (bybitBuy > 0) buyRates.push(bybitBuy);
        if (yadioPrice > 0) buyRates.push(yadioPrice);

        if (buyRates.length === 0) {
            throw new Error("No buy rates could be fetched");
        }

        const averageBuyPrice = buyRates.reduce((a, b) => a + b, 0) / buyRates.length;

        console.log(`Buy Rates - Binance: ${binanceBuy}, Bybit: ${bybitBuy}, Yadio: ${yadioPrice}`);
        console.log(`Sell Rates - Binance: ${binanceSell}, Bybit: ${bybitSell}`);
        console.log(`Average Buy Price: ${averageBuyPrice}`);

        // 3. Save to Supabase with new structure
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const supabase = createClient(supabaseUrl, supabaseKey)

        const { error } = await supabase
            .from('p2p_rate_history')
            .insert({
                price: averageBuyPrice,
                details: {
                    binance: { buy: binanceBuy, sell: binanceSell },
                    bybit: { buy: bybitBuy, sell: bybitSell },
                    yadio: { buy: yadioPrice, sell: yadioPrice }
                }
            })

        if (error) throw error

        return new Response(
            JSON.stringify({
                success: true,
                price: averageBuyPrice,
                details: {
                    binance: { buy: binanceBuy, sell: binanceSell },
                    bybit: { buy: bybitBuy, sell: bybitSell },
                    yadio: { buy: yadioPrice, sell: yadioPrice }
                }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error(error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})

// --- Helper Functions ---

async function fetchBinance(type: 'BUY' | 'SELL' = 'BUY') {
    try {
        const response = await fetch('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Origin': 'https://p2p.binance.com'
            },
            body: JSON.stringify({
                asset: 'USDT',
                fiat: 'VES',
                merchantCheck: false,
                page: 1,
                payTypes: [],
                publisherType: null,
                rows: 10, // Fetch more to filter outliers
                tradeType: type
            })
        });

        const data = await response.json();
        if (data?.data?.length > 0) {
            let prices = data.data.map((item: any) => parseFloat(item.adv.price));

            // Filter outliers (promoted ads with unrealistic prices)
            // Skip first price (usually the promoted ad) and calculate median of the rest
            if (prices.length > 3) {
                const sortedPrices = [...prices].sort((a, b) => a - b);
                const midIndex = Math.floor(sortedPrices.length / 2);
                const median = sortedPrices.length % 2 === 0
                    ? (sortedPrices[midIndex - 1] + sortedPrices[midIndex]) / 2
                    : sortedPrices[midIndex];

                // Exclude prices more than 10% away from median
                const tolerance = median * 0.10;
                prices = prices.filter((p: number) => Math.abs(p - median) <= tolerance);

                console.log(`Binance ${type}: Median=${median.toFixed(2)}, Filtered ${data.data.length - prices.length} outliers`);
            }

            if (prices.length === 0) return 0;
            return prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
        }
        return 0;
    } catch (e) {
        console.error(`Binance ${type} error:`, e);
        return 0;
    }
}

async function fetchBybit(type: 'BUY' | 'SELL' = 'BUY') {
    try {
        const response = await fetch('https://api2.bybit.com/fiat/otc/item/online', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Origin': 'https://www.bybit.com'
            },
            body: JSON.stringify({
                tokenId: "USDT",
                currencyId: "VES",
                side: type === 'BUY' ? "1" : "0", // 1 = Buy, 0 = Sell
                size: "10",
                page: "1",
                amount: "",
                authMaker: false,
                canTrade: false
            })
        });

        const data = await response.json();
        if (data?.result?.items?.length > 0) {
            const prices = data.result.items.map((item: any) => parseFloat(item.price));
            return prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
        }
        return 0;
    } catch (e) {
        console.error(`Bybit ${type} error:`, e);
        return 0;
    }
}

async function fetchYadio() {
    try {
        const response = await fetch('https://api.yadio.io/json');
        const data = await response.json();
        if (data && data.USD) {
            return { buy: data.USD.rate || 0 };
        }
        return { buy: 0 };
    } catch (e) {
        console.error("Yadio error:", e);
        return { buy: 0 };
    }
}
