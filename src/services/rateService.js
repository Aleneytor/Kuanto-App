import axios from 'axios';
import { supabase } from '../database/supabaseClient';

// Note: BCV rates now come from Supabase (fed by Vercel scraper)
// Only keeping axios for P2P API calls if needed

// Load local historical data from JSON file
let localHistoricalCache = null;
async function loadLocalHistoricalData() {
    if (localHistoricalCache) return localHistoricalCache;

    try {
        // Use require for React Native/Web compatibility
        const historicalData = require('../database/Historial 2023 BCV USD - EUR.txt');
        localHistoricalCache = historicalData;
        console.log(`[RateService] Loaded ${localHistoricalCache.rates?.length || 0} historical records from local file`);
        return localHistoricalCache;
    } catch (error) {
        console.error('[RateService] Error loading local historical data:', error);
        return { rates: [] };
    }
}

// Calculate percentage change between two rates
function calculateChange(current, previous) {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
}

export const fetchAllRates = async () => {
    try {
        const todayStr = getTodayISO();

        // Execute Supabase queries IMMEDIATELY (no local file blocking)
        const historyPromise = supabase
            .from('bcv_rates_history')
            .select('date, usd, eur')
            .order('date', { ascending: false })
            .limit(40);

        // Used to calculate 24h P2P change instantly
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 3); // 3 days just in case of weekends/timezones
        const twoDaysAgoISO = twoDaysAgo.toISOString().split('T')[0];

        const p2pHistoryPromise = supabase
            .from('p2p_rate_history')
            .select('price, details, created_at')
            .gte('created_at', `${twoDaysAgoISO}T00:00:00.000Z`)
            .order('created_at', { ascending: false });

        const [historyResult, p2pHistoryResult] = await Promise.allSettled([
            historyPromise, 
            p2pHistoryPromise
        ]);

        // Process BCV latest
        let scraperData = null;
        let recentHistory = [];
        let nextRateData = null;

        if (historyResult.status === 'fulfilled' && historyResult.value.data && !historyResult.value.error) {
            const data = historyResult.value.data;
            
            // Find the latest rate that is <= today
            scraperData = data.find(r => r.date <= todayStr) || null;
            
            if (scraperData) {
                console.log('[RateService] Found latest historical rates in Supabase:', scraperData);
            }
            
            const potentialFuture = data[0];
            if (potentialFuture && potentialFuture.date > todayStr) {
                console.log('[RateService] Found future rate for:', potentialFuture.date);
                const [y, m, d] = potentialFuture.date.split('-');
                const nextDateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                const daysArr = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                const dayLabel = daysArr[nextDateObj.getDay()];
                const dayNum = String(d).padStart(2, '0');
                const monthNum = String(m).padStart(2, '0');

                nextRateData = {
                    usd: parseFloat(potentialFuture.usd),
                    eur: parseFloat(potentialFuture.eur),
                    date: `${dayLabel} (${dayNum}/${monthNum})`,
                    rawDate: potentialFuture.date
                };

                recentHistory = data.filter(r => r.date <= todayStr);
            } else {
                recentHistory = data;
            }
        } else {
            // Supabase failed — load local file as fallback (lazy, only now)
            console.warn('[RateService] Supabase failed, falling back to local data:', historyResult.reason);
            const localData = await loadLocalHistoricalData();
            const localRates = localData.rates || [];
            recentHistory = [...localRates];
        }

        let usdBCV = scraperData?.usd || 0;
        let eurBCV = scraperData?.eur || 0;
        let bcvDateFound = scraperData?.date || todayStr;

        if (scraperData) {
            console.log('[RateService] Using USD/EUR from Supabase (Vercel scraper)');
        } else {
            console.log('[RateService] No rate data found for today');
        }

        const currentDayData = {
            date: bcvDateFound,
            usd: usdBCV,
            eur: eurBCV
        };



        const allHistoricalData = [...recentHistory];
        const currentIndex = allHistoricalData.findIndex(r => r.date === currentDayData.date);
        if (currentIndex >= 0) {
            allHistoricalData[currentIndex] = currentDayData;
        } else {
            allHistoricalData.unshift(currentDayData);
        }
        allHistoricalData.sort((a, b) => new Date(b.date) - new Date(a.date));
        const historyData = allHistoricalData.slice(0, 30);

        let usdChange = 0;
        let eurChange = 0;
        if (allHistoricalData.length >= 2) {
            const yesterday = allHistoricalData[1];
            usdChange = calculateChange(usdBCV, yesterday.usd);
            eurChange = calculateChange(eurBCV, yesterday.eur);
        }

        // Process P2P Latest
        let p2pData = { binance: { buy: 0, sell: 0 }, bybit: { buy: 0, sell: 0 }, yadio: { buy: 0, sell: 0 }};
        let calculatedP2P = 0;
        let parallelRate = 0;
        let parallelUpdateStr = formatTime(new Date());

        let calculatedUsdtChange = 0;
        if (p2pHistoryResult.status === 'fulfilled' && p2pHistoryResult.value.data && !p2pHistoryResult.value.error) {
            const allP2pHist = p2pHistoryResult.value.data;
            
            if (allP2pHist.length > 0) {
                // The absolute latest is the first item
                const latestRate = allP2pHist[0];
                const avgPrice = parseFloat(latestRate.price || 0);

                if (latestRate.details) {
                    try {
                        const details = typeof latestRate.details === 'string'
                            ? JSON.parse(latestRate.details)
                            : latestRate.details;

                        const binanceData = details.binance || {};
                        const bybitData = details.bybit || {};
                        const yadioData = details.yadio || {};

                        if (typeof binanceData === 'object' && binanceData.buy !== undefined) {
                            p2pData = {
                                binance: {
                                    buy: parseFloat(binanceData.buy || avgPrice),
                                    sell: parseFloat(binanceData.sell || avgPrice)
                                },
                                bybit: {
                                    buy: parseFloat(bybitData.buy || avgPrice),
                                    sell: parseFloat(bybitData.sell || avgPrice)
                                },
                                yadio: {
                                    buy: parseFloat(yadioData.buy || avgPrice),
                                    sell: parseFloat(yadioData.sell || avgPrice)
                                }
                            };
                        } else {
                            const bPrice = parseFloat(binanceData) || avgPrice;
                            const byPrice = parseFloat(bybitData) || avgPrice;
                            const yPrice = parseFloat(yadioData) || avgPrice;

                            p2pData = {
                                binance: { buy: bPrice, sell: bPrice },
                                bybit: { buy: byPrice, sell: byPrice },
                                yadio: { buy: yPrice, sell: yPrice }
                            };
                        }

                        calculatedP2P = avgPrice;
                    } catch (e) {
                        console.warn('[RateService] Failed to parse details JSON:', e);
                    }
                }
            }
            const dailyData = {};

            allP2pHist.forEach(item => {
                const utcDate = new Date(item.created_at);
                const vetDate = new Date(utcDate.getTime() - (4 * 60 * 60 * 1000));
                const dateStr = vetDate.toISOString().split('T')[0];

                if (!dailyData[dateStr]) {
                    dailyData[dateStr] = { date: dateStr, sum: 0, count: 0 };
                }
                const price = parseFloat(item.price);
                if (!isNaN(price) && price > 0) {
                    dailyData[dateStr].sum += price;
                    dailyData[dateStr].count++;
                }
            });

            const recentAverages = Object.values(dailyData)
                .map(day => ({ date: day.date, usdt: day.count > 0 ? day.sum / day.count : 0 }))
                .filter(item => item.usdt > 0)
                .sort((a, b) => new Date(b.date) - new Date(a.date));

            if (recentAverages.length >= 2) {
                const todayPrice = parseFloat(recentAverages[0].usdt);
                const yesterdayPrice = parseFloat(recentAverages[1].usdt);
                if (yesterdayPrice > 0) {
                    calculatedUsdtChange = ((todayPrice - yesterdayPrice) / yesterdayPrice) * 100;
                }
            }
        }

        // Prioritize Supabase P2P if available
        if (calculatedP2P > 0) {
            parallelRate = calculatedP2P;
        }

        // Process BCV data for "next rates" feature
        const currentBCV = currentDayData;
        let nextBCV = null;

        // Check if there's a future date in history (shouldn't happen with new API, but keeping for compatibility)
        if (historyData.length > 0 && historyData[0].date > todayStr) {
            nextBCV = historyData[0];
        }

        // Format the BCV date for display
        const bcvTypicalTime = '5:00pm';
        let lastUpdateStr = '';
        if (currentBCV && currentBCV.date) {
            const bcvDate = currentBCV.date;
            const todayISO = getTodayISO();

            // Get yesterday's date
            const now = new Date();
            const vetTime = now.getTime() - (4 * 60 * 60 * 1000);
            const yesterday = new Date(vetTime);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayISO = yesterday.toISOString().split('T')[0];

            if (bcvDate === todayISO) {
                lastUpdateStr = `Hoy, ${bcvTypicalTime}`;
            } else if (bcvDate === yesterdayISO) {
                lastUpdateStr = `Ayer, ${bcvTypicalTime}`;
            } else {
                const [y, m, d] = bcvDate.split('-');
                const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                const dayName = dateObj.toLocaleDateString('es-VE', { weekday: 'long' });
                const year = y.substr(-2);
                lastUpdateStr = `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${d}/${m}/${year}, ${bcvTypicalTime}`;
            }
        } else {
            lastUpdateStr = 'Sin datos';
        }

        return {
            bcv: currentBCV ? currentBCV.usd : 0,
            euro: currentBCV ? currentBCV.eur : 0,
            usdChange: usdChange,
            eurChange: eurChange,
            parallel: parallelRate,
            usdtChange: calculatedUsdtChange,
            parallelUpdate: parallelUpdateStr,
            lastUpdate: lastUpdateStr,
            nextRates: nextRateData,
            history: historyData, // No longer slicing to 12, use the 30 days fetched
            p2p: p2pData
        };
    } catch (error) {
        console.error("Error fetching rates:", error);
        throw error;
    }
};

async function fetchBinanceP2P(type = 'BUY') {
    try {
        console.log(`[Binance P2P] Fetching ${type} rates...`);
        const response = await axios.post('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
            asset: 'USDT',
            fiat: 'VES',
            merchantCheck: false,
            page: 1,
            payTypes: [],
            publisherType: null,
            rows: 10,
            tradeType: type
        }, {
            timeout: 8000,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Origin': 'https://p2p.binance.com',
                'Referer': 'https://p2p.binance.com/es-VE/trade/all-payments/USDT?fiat=VES'
            }
        });

        console.log(`[Binance P2P] Response status:`, response.status);

        if (response.data?.data?.length > 0) {
            const prices = response.data.data.map(item => parseFloat(item.adv.price));
            const average = prices.reduce((a, b) => a + b, 0) / prices.length;
            console.log(`[Binance P2P] ${type} - Found ${prices.length} ads, average: ${average.toFixed(2)}`);
            return average;
        }

        console.warn(`[Binance P2P] ${type} - No data in response:`, response.data);
        return 0;
    } catch (e) {
        console.error(`[Binance P2P] ${type} fetch error:`, e.message);
        if (e.response) {
            console.error(`[Binance P2P] Response status:`, e.response.status);
            console.error(`[Binance P2P] Response data:`, e.response.data);
        }
        return 0;
    }
}

/**
 * Fetch Bybit P2P Rate (VES/USDT floor BUY/SELL)
 */
async function fetchBybitP2P(type = 'BUY') {
    try {
        console.log(`[Bybit P2P] Fetching ${type} rates...`);
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
            timeout: 8000,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Origin': 'https://www.bybit.com',
                'Referer': 'https://www.bybit.com/fiat/trade/otc/'
            }
        });

        console.log(`[Bybit P2P] Response status:`, response.status);

        if (response.data?.result?.items?.length > 0) {
            const prices = response.data.result.items.map(item => parseFloat(item.price));
            const average = prices.reduce((a, b) => a + b, 0) / prices.length;
            console.log(`[Bybit P2P] ${type} - Found ${prices.length} ads, average: ${average.toFixed(2)}`);
            return average;
        }

        console.warn(`[Bybit P2P] ${type} - No data in response:`, response.data);
        return 0;
    } catch (e) {
        console.error(`[Bybit P2P] ${type} fetch error:`, e.message);
        if (e.response) {
            console.error(`[Bybit P2P] Response status:`, e.response.status);
            console.error(`[Bybit P2P] Response data:`, e.response.data);
        }
        return 0;
    }
}

/**
 * Fetch Yadio Rate (Commercial Standard Only)
 */
async function fetchYadioRates() {
    try {
        console.log('[Yadio] Fetching VES/USD rate...');
        const response = await axios.get('https://api.yadio.io/json', { timeout: 8000 });

        if (response.data && response.data.USD) {
            const rate = response.data.USD.rate || 0;
            console.log(`[Yadio] VES/USD rate: ${rate.toFixed(2)}`);
            return { buy: rate, sell: rate };
        }

        console.warn('[Yadio] No USD data in response:', response.data);
        return { buy: 0, sell: 0 };
    } catch (e) {
        console.error('[Yadio] Fetch error:', e.message);
        if (e.response) {
            console.error('[Yadio] Response status:', e.response.status);
        }
        return { buy: 0, sell: 0 };
    }
}

// Helpers
function getTodayISO() {
    const now = new Date();
    // Adjust to Venezuela Time (UTC-4) by shifting the timestamp
    // So that toISOString() (which reads as UTC) outputs the VET date
    const vetTime = now.getTime() - (4 * 60 * 60 * 1000);
    return new Date(vetTime).toISOString().split('T')[0];
}

function getOneWeekAgoDate() {
    const now = new Date();
    const vetTime = now.getTime() - (4 * 60 * 60 * 1000);
    const d = new Date(vetTime);
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
}

function getDateByPeriod(period) {
    const now = new Date();
    const vetTime = now.getTime() - (4 * 60 * 60 * 1000);
    const d = new Date(vetTime);

    switch (period) {
        case 'week':
            d.setDate(d.getDate() - 7);
            break;
        case 'month':
            d.setDate(d.getDate() - 30);
            break;
        case 'year':
            d.setFullYear(d.getFullYear() - 1);
            break;
        case 'all':
            // Get data from Jan 1, 2020 or earliest available
            d.setFullYear(2020, 0, 1);
            break;
        default:
            d.setDate(d.getDate() - 8);
    }

    return d.toISOString().split('T')[0];
}

export const fetchHistoricalRates = async (period = 'week') => {
    try {
        const fromDate = getDateByPeriod(period);
        console.log(`[RateService] Fetching historical rates from Supabase since ${fromDate}`);

        // Query Supabase for bcv_rates_history
        const { data, error } = await supabase
            .from('bcv_rates_history')
            .select('date, usd, eur')
            .gte('date', fromDate)
            .order('date', { ascending: false })
            .limit(5000);

        if (error) {
            console.error('[RateService] Supabase error:', error);
            // Fallback to local data in case of connection error
            console.warn('[RateService] Falling back to local historical data...');
            const localData = await loadLocalHistoricalData();
            const allRates = localData.rates || [];
            return allRates.filter(rate => rate.date >= fromDate)
                .sort((a, b) => new Date(b.date) - new Date(a.date));
        }

        if (!data || data.length === 0) {
            console.log('[RateService] No historical data found in Supabase');
            return [];
        }

        console.log(`[RateService] Loaded ${data.length} records from Supabase`);
        return data;
    } catch (error) {
        console.error("Error fetching historical rates:", error);
        return [];
    }
};

/**
 * Fetch historical rates for a specific date from Supabase
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {Promise<{usd: number, eur: number, date: string} | null>}
 */
export const fetchHistoricalByDate = async (dateStr) => {
    try {
        console.log(`[RateService] Fetching historical rate for date: ${dateStr}`);

        const { data, error } = await supabase
            .from('bcv_rates_history')
            .select('date, usd, eur')
            .lte('date', dateStr)
            .order('date', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('[RateService] Supabase error:', error);
            // Fallback to local data
            const localData = await loadLocalHistoricalData();
            const found = localData.rates?.find(r => r.date === dateStr);
            return found || null;
        }

        if (!data) {
            console.log(`[RateService] No data found for date ${dateStr}, trying local file...`);
            const localData = await loadLocalHistoricalData();
            const found = localData.rates?.find(r => r.date === dateStr);
            return found || null;
        }

        console.log(`[RateService] Found rate for ${dateStr}: USD=${data.usd}, EUR=${data.eur}`);
        return data;
    } catch (error) {
        console.error('[RateService] Error fetching historical by date:', error);
        return null;
    }
};

function formatDate(dateStr) {
    const [y, m, d] = dateStr.split('-');
    const year = y.substr(-2); // Get last 2 digits
    return `${d}/${m}/${year}`;
}

function formatTime(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Fetch USDT P2P history from Supabase and calculate daily averages
 * @param {string} period - 'week', 'month', 'year', or 'all'
 * @returns {Array} Array of { date, usdt } objects with daily averages
 */
export const fetchUsdtHistory = async (period = 'week') => {
    try {
        const fromDate = getDateByPeriod(period);

        let allData = [];
        let hasMore = true;
        let page = 0;
        const pageSize = 1000;

        while (hasMore) {
            const { data, error } = await supabase
                .from('p2p_rate_history')
                .select('price, created_at')
                .gte('created_at', `${fromDate}T00:00:00.000Z`)
                .order('created_at', { ascending: false })
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (error) {
                console.error('Error fetching USDT history from Supabase:', error);
                return [];
            }

            if (data && data.length > 0) {
                allData = allData.concat(data);
                if (data.length < pageSize) {
                    hasMore = false;
                } else {
                    page++;
                }
            } else {
                hasMore = false;
            }

            // Safety limit to avoid infinite loops (max 30,000 records)
            if (page >= 30) {
                console.warn('[RateService] Safety limit reached while fetching USDT history.');
                hasMore = false;
            }
        }

        if (allData.length === 0) {
            return [];
        }

        // Group by date and calculate daily averages
        const dailyData = {};

        allData.forEach(item => {
            // Convert UTC timestamp to Venezuela time (UTC-4) before extracting date
            const utcDate = new Date(item.created_at);
            const vetDate = new Date(utcDate.getTime() - (4 * 60 * 60 * 1000));
            const dateStr = vetDate.toISOString().split('T')[0];

            if (!dailyData[dateStr]) {
                dailyData[dateStr] = {
                    date: dateStr,
                    prices: [],
                    sum: 0,
                    count: 0
                };
            }

            const price = parseFloat(item.price);
            if (!isNaN(price) && price > 0) {
                dailyData[dateStr].prices.push(price);
                dailyData[dateStr].sum += price;
                dailyData[dateStr].count++;
            }
        });

        // Convert to array with daily averages
        const result = Object.values(dailyData)
            .map(day => ({
                date: day.date,
                usdt: day.count > 0 ? day.sum / day.count : 0
            }))
            .filter(item => item.usdt > 0)
            .sort((a, b) => new Date(b.date) - new Date(a.date)); // Most recent first

        return result;
    } catch (error) {
        console.error('Error in fetchUsdtHistory:', error);
        return [];
    }
};
