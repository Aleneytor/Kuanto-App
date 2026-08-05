import { supabase } from '../database/supabaseClient';

// Las tasas (BCV y P2P/USDT) vienen de la tabla `daily_rates` del backend
// móvil de Kuanto (proyecto Supabase compartido con la app Android/iOS):
// una fila por día, ver KuantoMobileDefinitivo/docs/MOBILE_BACKEND.md.
// Yadio no forma parte de ese contrato (se excluyó del promedio porque
// distorsionaba mucho el valor) — por eso ya no aparece en p2p.

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

        const { data, error } = await supabase
            .from('daily_rates')
            .select('rate_date, bcv_usd, bcv_eur, p2p_average, p2p_daily_average, p2p_sources, bcv_published_at, p2p_observed_at')
            .order('rate_date', { ascending: false })
            .limit(45);

        let bcvHistory = [];
        let nextRateData = null;
        let p2pRows = [];

        if (!error && data) {
            const bcvRows = data
                .filter((r) => r.bcv_usd > 0 && r.bcv_eur > 0)
                .map((r) => ({ date: r.rate_date, usd: parseFloat(r.bcv_usd), eur: parseFloat(r.bcv_eur) }));

            bcvHistory = bcvRows.filter((r) => r.date <= todayStr);

            const futureBcv = bcvRows
                .filter((r) => r.date > todayStr)
                .sort((a, b) => a.date.localeCompare(b.date))[0];

            if (futureBcv) {
                const [y, m, d] = futureBcv.date.split('-');
                const nextDateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                const daysArr = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                const dayLabel = daysArr[nextDateObj.getDay()];
                nextRateData = {
                    usd: futureBcv.usd,
                    eur: futureBcv.eur,
                    date: `${dayLabel} (${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')})`,
                    rawDate: futureBcv.date,
                };
            }

            p2pRows = data
                .filter((r) => r.rate_date <= todayStr && parseFloat(r.p2p_average || 0) > 0)
                .map((r) => ({
                    date: r.rate_date,
                    average: parseFloat(r.p2p_average),
                    dailyAverage: parseFloat(r.p2p_daily_average || r.p2p_average),
                    sources: r.p2p_sources || {},
                    observedAt: r.p2p_observed_at,
                }));
        } else {
            console.warn('[RateService] Supabase failed, falling back to local data:', error);
            const localData = await loadLocalHistoricalData();
            bcvHistory = (localData.rates || []).sort((a, b) => new Date(b.date) - new Date(a.date));
        }

        const currentBCV = bcvHistory.find((r) => r.date <= todayStr) || { date: todayStr, usd: 0, eur: 0 };
        const historyData = bcvHistory.slice(0, 30);

        let usdChange = 0;
        let eurChange = 0;
        if (bcvHistory.length >= 2) {
            usdChange = calculateChange(currentBCV.usd, bcvHistory[1].usd);
            eurChange = calculateChange(currentBCV.eur, bcvHistory[1].eur);
        }

        // Process P2P Latest
        let p2pData = { binance: { buy: 0, sell: 0 }, bybit: { buy: 0, sell: 0 } };
        let parallelRate = 0;
        let parallelUpdateStr = formatTime(new Date());
        let calculatedUsdtChange = 0;

        const currentP2p = p2pRows[0];
        if (currentP2p) {
            parallelRate = currentP2p.average;
            if (currentP2p.observedAt) {
                parallelUpdateStr = formatTime(currentP2p.observedAt);
            }

            const sources = currentP2p.sources || {};
            const binanceData = sources.binance || {};
            const bybitData = sources.bybit || {};
            p2pData = {
                binance: {
                    buy: parseFloat(binanceData.buy ?? parallelRate) || 0,
                    sell: parseFloat(binanceData.sell ?? parallelRate) || 0,
                },
                bybit: {
                    buy: parseFloat(bybitData.buy ?? parallelRate) || 0,
                    sell: parseFloat(bybitData.sell ?? parallelRate) || 0,
                },
            };

            if (p2pRows.length >= 2) {
                calculatedUsdtChange = calculateChange(currentP2p.dailyAverage, p2pRows[1].dailyAverage);
            }
        }

        // Format the BCV date for display
        const bcvTypicalTime = '5:00pm';
        let lastUpdateStr = '';
        if (currentBCV && currentBCV.date) {
            const bcvDate = currentBCV.date;
            const todayISO = getTodayISO();

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
            usdChange,
            eurChange,
            parallel: parallelRate,
            usdtChange: calculatedUsdtChange,
            parallelUpdate: parallelUpdateStr,
            lastUpdate: lastUpdateStr,
            nextRates: nextRateData,
            history: historyData,
            p2p: p2pData,
        };
    } catch (error) {
        console.error("Error fetching rates:", error);
        throw error;
    }
};

// Helpers
function getTodayISO() {
    const now = new Date();
    // Adjust to Venezuela Time (UTC-4) by shifting the timestamp
    // So that toISOString() (which reads as UTC) outputs the VET date
    const vetTime = now.getTime() - (4 * 60 * 60 * 1000);
    return new Date(vetTime).toISOString().split('T')[0];
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

        const { data, error } = await supabase
            .from('daily_rates')
            .select('rate_date, bcv_usd, bcv_eur')
            .gte('rate_date', fromDate)
            .not('bcv_usd', 'is', null)
            .order('rate_date', { ascending: false })
            .limit(5000);

        if (error) {
            console.error('[RateService] Supabase error:', error);
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
        return data.map((r) => ({ date: r.rate_date, usd: parseFloat(r.bcv_usd), eur: parseFloat(r.bcv_eur) }));
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
            .from('daily_rates')
            .select('rate_date, bcv_usd, bcv_eur')
            .lte('rate_date', dateStr)
            .not('bcv_usd', 'is', null)
            .order('rate_date', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('[RateService] Supabase error:', error);
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

        const result = { date: data.rate_date, usd: parseFloat(data.bcv_usd), eur: parseFloat(data.bcv_eur) };
        console.log(`[RateService] Found rate for ${dateStr}: USD=${result.usd}, EUR=${result.eur}`);
        return result;
    } catch (error) {
        console.error('[RateService] Error fetching historical by date:', error);
        return null;
    }
};

function formatTime(dateInput) {
    const d = new Date(dateInput);
    return d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Fetch USDT P2P daily averages from `daily_rates`.
 * @param {string} period - 'week', 'month', 'year', or 'all'
 * @returns {Array} Array of { date, usdt } objects with daily averages
 */
export const fetchUsdtHistory = async (period = 'week') => {
    try {
        const fromDate = getDateByPeriod(period);

        const { data, error } = await supabase
            .from('daily_rates')
            .select('rate_date, p2p_average, p2p_daily_average')
            .gte('rate_date', fromDate)
            .order('rate_date', { ascending: false });

        if (error) {
            console.error('Error fetching USDT history from Supabase:', error);
            return [];
        }

        if (!data || data.length === 0) {
            return [];
        }

        return data
            .map((r) => ({
                date: r.rate_date,
                usdt: parseFloat(r.p2p_daily_average ?? r.p2p_average ?? 0),
            }))
            .filter((item) => item.usdt > 0)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
        console.error('Error in fetchUsdtHistory:', error);
        return [];
    }
};
