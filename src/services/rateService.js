import axios from 'axios';

const DOLARVZLA_BASE = 'https://api.dolarvzla.com/public';
const DOLARAPI_BASE = 'https://ve.dolarapi.com/v1';

export const fetchAllRates = async () => {
    try {
        // Fetch Current Stats (including percentage changes)
        const currentStatsResponse = await axios.get(`${DOLARVZLA_BASE}/exchange-rate`);
        const stats = currentStatsResponse.data;

        // Fetch History
        const historyResponse = await axios.get(`${DOLARVZLA_BASE}/exchange-rate/list?from=${getOneWeekAgoDate()}`);
        const historyData = historyResponse.data.rates || [];

        // Fetch Parallel Rate from DolarApi as fallback/secondary
        const parallelResponse = await axios.get(`${DOLARAPI_BASE}/dolares/paralelo`);
        const parallelData = parallelResponse.data;

        // Try to fetch P2P rates (Binance, Bybit & Yadio)
        let p2pData = {
            binance: { buy: 0, sell: 0 },
            bybit: { buy: 0, sell: 0 },
            yadio: { buy: 0, sell: 0 }
        };
        try {
            const [bBuy, bSell, byBuy, bySell, yData] = await Promise.all([
                fetchBinanceP2P('BUY').catch(() => 0),
                fetchBinanceP2P('SELL').catch(() => 0),
                fetchBybitP2P('BUY').catch(() => 0),
                fetchBybitP2P('SELL').catch(() => 0),
                fetchYadioRates().catch(() => ({ buy: 0, sell: 0 }))
            ]);
            p2pData = {
                binance: { buy: bBuy, sell: bSell },
                bybit: { buy: byBuy, sell: bySell },
                yadio: yData
            };
        } catch (e) {
            console.warn("P2P fetch failed", e);
        }

        // Process data
        const todayStr = getTodayISO();
        let currentBCV = null;
        let nextBCV = null;

        if (historyData.length > 0) {
            const first = historyData[0];
            if (first.date > todayStr) {
                nextBCV = first;
                currentBCV = historyData[1] || first;
            } else {
                currentBCV = first;
                nextBCV = null;
            }
        }

        // Calculate Custom Parallel Average (Binance + Bybit)
        let p2pSum = 0;
        let p2pCount = 0;

        // Binance
        if (p2pData.binance.buy > 0) { p2pSum += p2pData.binance.buy; p2pCount++; }
        if (p2pData.binance.sell > 0) { p2pSum += p2pData.binance.sell; p2pCount++; }

        // Bybit
        if (p2pData.bybit.buy > 0) { p2pSum += p2pData.bybit.buy; p2pCount++; }
        if (p2pData.bybit.sell > 0) { p2pSum += p2pData.bybit.sell; p2pCount++; }

        let calculatedP2P = p2pCount > 0 ? p2pSum / p2pCount : 0;

        // Determine Parallel Rate (Prioritize Custom P2P, then DolarVZLA, then DolarAPI)
        let parallelRate = 0;
        let parallelUpdateStr = null;

        if (calculatedP2P > 0) {
            parallelRate = calculatedP2P;
            parallelUpdateStr = formatTime(new Date());
        } else if (stats && stats.monitor && stats.monitor.price) {
            // Fallback 1: DolarVZLA
            parallelRate = stats.monitor.price;
            parallelUpdateStr = formatTime(new Date());
        } else if (parallelData && parallelData.promedio) {
            // Fallback 2: DolarAPI
            parallelRate = parallelData.promedio;
            parallelUpdateStr = formatTime(new Date());
        }

        return {
            bcv: currentBCV ? currentBCV.usd : 0,
            euro: currentBCV ? currentBCV.eur : 0,
            usdChange: stats.changePercentage?.usd || 0,
            eurChange: stats.changePercentage?.eur || 0,
            parallel: parallelRate,
            parallelUpdate: parallelUpdateStr,
            lastUpdate: "Hoy, " + new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
            nextRates: nextBCV ? {
                date: formatDate(nextBCV.date),
                usd: nextBCV.usd,
                eur: nextBCV.eur
            } : null,
            history: historyData.slice(0, 7),
            p2p: p2pData // New P2P data (split)
        };
    } catch (error) {
        console.error("Error fetching rates:", error);
        throw error;
    }
};

async function fetchBinanceP2P(type = 'BUY') {
    try {
        const response = await axios.post('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
            asset: 'USDT',
            fiat: 'VES',
            merchantCheck: false,
            page: 1,
            payTypes: [],
            publisherType: null,
            rows: 5,
            tradeType: type
        }, {
            timeout: 5000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Origin': 'https://p2p.binance.com',
                'Referer': 'https://p2p.binance.com/es-VE/trade/all-payments/USDT?fiat=VES'
            }
        });

        if (response.data?.data?.length > 0) {
            const prices = response.data.data.map(item => parseFloat(item.adv.price));
            return prices.reduce((a, b) => a + b, 0) / prices.length;
        }
        return 0;
    } catch (e) {
        console.warn("Binance fetch error:", e.message);
        return 0;
    }
}

/**
 * Fetch Bybit P2P Rate (VES/USDT floor BUY/SELL)
 */
async function fetchBybitP2P(type = 'BUY') {
    try {
        // Using the 'online' endpoint which is more common for public web search
        const response = await axios.post('https://api2.bybit.com/fiat/otc/item/online', {
            tokenId: "USDT",
            currencyId: "VES",
            side: type === 'BUY' ? "1" : "0", // 1 is Buy, 0 is Sell
            size: "10",
            page: "1",
            amount: "",
            authMaker: false,
            canTrade: false
        }, {
            timeout: 5000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Origin': 'https://www.bybit.com',
                'Referer': 'https://www.bybit.com/'
            }
        });

        if (response.data?.result?.items?.length > 0) {
            const prices = response.data.result.items.map(item => parseFloat(item.price));
            return prices.reduce((a, b) => a + b, 0) / prices.length;
        }
        return 0;
    } catch (e) {
        console.warn("Bybit fetch error:", e.message);
        return 0;
    }
}

/**
 * Fetch Yadio Rate (Commercial Standard Only)
 */
async function fetchYadioRates() {
    try {
        const response = await axios.get('https://api.yadio.io/json', { timeout: 5000 });
        if (response.data && response.data.USD) {
            // Using the commercial standard USD rate for both sides to avoid skewing averages
            // as requested by the user who wants to avoid the low liquidity P2P rate.
            const rate = response.data.USD.rate || 0;
            return { buy: rate, sell: rate };
        }
        return { buy: 0, sell: 0 };
    } catch (e) {
        console.warn("Yadio fetch error:", e.message);
        return { buy: 0, sell: 0 };
    }
}

// Helpers
function getTodayISO() {
    return new Date().toISOString().split('T')[0];
}

function getOneWeekAgoDate() {
    const d = new Date();
    d.setDate(d.getDate() - 8);
    return d.toISOString().split('T')[0];
}

function formatDate(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}

function formatTime(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
}
