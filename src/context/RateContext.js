import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { fetchAllRates, fetchHistoricalRates, fetchUsdtHistory, fetchUsdtHourlyData } from '../services/rateService';
import { INITIAL_RATES } from '../constants/rates';
import { useToast } from './ToastContext';

const RateContext = createContext();

const STORAGE_KEY = '@app_rate_order';
const RATES_STORAGE_KEY = '@app_rates_cache';
const LAST_UPDATE_KEY = '@app_last_update_timestamp';
const HISTORY_CACHE_KEY = '@app_history_cache_';

export const RateProvider = ({ children }) => {
    const [rates, setRates] = useState(INITIAL_RATES);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastFetched, setLastFetched] = useState(null);
    const [isOffline, setIsOffline] = useState(false);
    const [lastSuccessfulUpdate, setLastSuccessfulUpdate] = useState(null);
    const [historicalLoading, setHistoricalLoading] = useState(false);
    const [usdtHistory, setUsdtHistory] = useState([]);
    const [usdtHistoryLoading, setUsdtHistoryLoading] = useState(false);
    const [usdtHourlyData, setUsdtHourlyData] = useState([]);
    const [usdtHourlyLoading, setUsdtHourlyLoading] = useState(false);
    const { showToast } = useToast();

    // Default order of cards
    const [order, setOrder] = useState(['usd', 'eur', 'parallel']);

    // Monitor network connectivity
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            const offline = !state.isConnected || !state.isInternetReachable;
            setIsOffline(offline);

            // If we just came back online, try to refresh
            if (!offline && isOffline) {
                refreshRates(true);
            }
        });

        // Check initial state
        NetInfo.fetch().then(state => {
            setIsOffline(!state.isConnected || !state.isInternetReachable);
        });

        return () => unsubscribe();
    }, [isOffline]);

    // Load saved data on mount
    useEffect(() => {
        const loadSavedData = async () => {
            try {
                // Load order
                const savedOrder = await AsyncStorage.getItem(STORAGE_KEY);
                if (savedOrder) {
                    setOrder(JSON.parse(savedOrder));
                }

                // Load cached rates
                const cached = await AsyncStorage.getItem(RATES_STORAGE_KEY);
                if (cached) {
                    setRates(JSON.parse(cached));
                }

                // Load last update timestamp
                const lastUpdate = await AsyncStorage.getItem(LAST_UPDATE_KEY);
                if (lastUpdate) {
                    setLastSuccessfulUpdate(parseInt(lastUpdate, 10));
                }
            } catch (e) {
                console.error("Failed to load saved data", e);
            }
        };

        loadSavedData();
    }, []);

    const updateOrder = async (newOrder) => {
        setOrder(newOrder);
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder));
        } catch (e) {
            console.error("Failed to save order", e);
        }
    };

    const refreshRates = async (force = false) => {
        const now = Date.now();

        // Prevent spamming: if force is true but last fetch was less than 15 seconds ago, ignore.
        if (lastFetched && (now - lastFetched < 15000)) {
            if (force) {
                const remaining = Math.ceil((15000 - (now - lastFetched)) / 1000);
                showToast(`Espera ${remaining}s para actualizar nuevamente`, 'error');
            }
            return;
        }

        // If not force (auto-refresh), keep the 2-minute cache.
        if (!force && lastFetched && (now - lastFetched < 120000)) {
            return;
        }

        // Check if offline before attempting
        const netState = await NetInfo.fetch();
        if (!netState.isConnected || !netState.isInternetReachable) {
            setIsOffline(true);
            if (force) {
                showToast('Sin conexión a internet', 'error');
            }
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const newRates = await fetchAllRates();
            setRates(newRates);
            setLastFetched(Date.now());
            setLastSuccessfulUpdate(Date.now());
            setIsOffline(false);

            // Cache rates and timestamp
            await AsyncStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(newRates));
            await AsyncStorage.setItem(LAST_UPDATE_KEY, Date.now().toString());

            if (force) showToast('Tasas actualizadas correctamente', 'success');
        } catch (err) {
            setError("No se pudieron actualizar las tasas");

            // Check if it's a network error
            const currentNetState = await NetInfo.fetch();
            if (!currentNetState.isConnected || !currentNetState.isInternetReachable) {
                setIsOffline(true);
                if (force) showToast('Sin conexión a internet', 'error');
            } else {
                if (force) showToast('Error al actualizar las tasas', 'error');
            }
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistoricalData = async (period = 'week') => {
        setHistoricalLoading(true);
        try {
            // Check cache first
            const cacheKey = `${HISTORY_CACHE_KEY}${period}`;
            const cached = await AsyncStorage.getItem(cacheKey);
            const now = Date.now();

            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                // Cache for 1 minute (reduced to ensure we get Supabase data)
                if (now - timestamp < 60000) {
                    setRates(prev => ({ ...prev, history: data }));
                    setHistoricalLoading(false);
                    return data;
                }
            }

            // Fetch from API
            const historyData = await fetchHistoricalRates(period);

            // Update rates with new history
            setRates(prev => ({ ...prev, history: historyData }));

            // Cache the data
            await AsyncStorage.setItem(cacheKey, JSON.stringify({
                data: historyData,
                timestamp: now
            }));

            setHistoricalLoading(false);
            return historyData;
        } catch (error) {
            console.error("Error fetching historical data:", error);
            setHistoricalLoading(false);
            showToast('Error al cargar datos históricos', 'error');
            return [];
        }
    };

    const fetchUsdtHistoricalData = async (period = 'week') => {
        setUsdtHistoryLoading(true);
        try {
            // Check cache first
            const cacheKey = `@app_usdt_history_cache_${period}`;
            const cached = await AsyncStorage.getItem(cacheKey);
            const now = Date.now();

            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                // Cache for 30 minutes (since data updates hourly)
                if (now - timestamp < 1800000) {
                    setUsdtHistory(data);
                    setUsdtHistoryLoading(false);
                    return data;
                }
            }

            // Fetch from Supabase
            const historyData = await fetchUsdtHistory(period);
            setUsdtHistory(historyData);

            // Cache the data
            await AsyncStorage.setItem(cacheKey, JSON.stringify({
                data: historyData,
                timestamp: now
            }));

            setUsdtHistoryLoading(false);
            return historyData;
        } catch (error) {
            console.error('Error fetching USDT historical data:', error);
            setUsdtHistoryLoading(false);
            showToast('Error al cargar historial USDT', 'error');
            return [];
        }
    };

    // Fetch USDT hourly data for a specific day
    const fetchUsdtHourlyDataForDay = async (dateString) => {
        console.log('=== fetchUsdtHourlyDataForDay called ===');
        console.log('Date requested:', dateString);

        setUsdtHourlyLoading(true);
        try {
            const cacheKey = `@app_usdt_hourly_cache_${dateString}`;
            const cached = await AsyncStorage.getItem(cacheKey);
            const now = Date.now();

            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                console.log('Found cached data:', data?.length || 0, 'records, age:', Math.round((now - timestamp) / 1000), 'seconds');
                // Cache for 2 minutes for hourly data (reduced for debugging)
                if (now - timestamp < 120000 && data && data.length > 0) {
                    console.log('Using cached data');
                    setUsdtHourlyData(data);
                    setUsdtHourlyLoading(false);
                    return data;
                }
            }

            console.log('Fetching fresh data from Supabase...');
            // Fetch from Supabase
            const hourlyData = await fetchUsdtHourlyData(dateString);
            console.log('Received hourly data:', hourlyData?.length || 0, 'records');
            console.log('Data sample:', hourlyData?.slice(0, 3));

            setUsdtHourlyData(hourlyData);

            // Only cache if we have data
            if (hourlyData && hourlyData.length > 0) {
                await AsyncStorage.setItem(cacheKey, JSON.stringify({
                    data: hourlyData,
                    timestamp: now
                }));
            }

            setUsdtHourlyLoading(false);
            return hourlyData;
        } catch (error) {
            console.error('Error fetching USDT hourly data:', error);
            setUsdtHourlyLoading(false);
            showToast('Error al cargar datos por hora', 'error');
            return [];
        }
    };

    // --- Chart Specific Data Fetching (Decoupled) ---
    const [chartHistory, setChartHistory] = useState([]);
    const [chartUsdtHistory, setChartUsdtHistory] = useState([]);
    const [chartLoading, setChartLoading] = useState(false);
    const [chartUsdtLoading, setChartUsdtLoading] = useState(false);

    const fetchChartData = async (period = 'week') => {
        setChartLoading(true);
        try {
            const cacheKey = `@app_chart_history_${period}`;
            const cached = await AsyncStorage.getItem(cacheKey);
            const now = Date.now();

            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                if (now - timestamp < 60000) { // 1 min cache (reduced)
                    setChartHistory(data);
                    setChartLoading(false);
                    return data;
                }
            }

            const historyData = await fetchHistoricalRates(period);
            setChartHistory(historyData);

            await AsyncStorage.setItem(cacheKey, JSON.stringify({
                data: historyData,
                timestamp: now
            }));

            setChartLoading(false);
            return historyData;
        } catch (error) {
            console.error("Error fetching chart data:", error);
            setChartLoading(false);
            return [];
        }
    };

    const fetchChartUsdtData = async (period = 'week') => {
        setChartUsdtLoading(true);
        try {
            const cacheKey = `@app_chart_usdt_history_${period}`;
            const cached = await AsyncStorage.getItem(cacheKey);
            const now = Date.now();

            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                if (now - timestamp < 1800000) { // 30 min cache
                    setChartUsdtHistory(data);
                    setChartUsdtLoading(false);
                    return data;
                }
            }

            const historyData = await fetchUsdtHistory(period);
            setChartUsdtHistory(historyData);

            await AsyncStorage.setItem(cacheKey, JSON.stringify({
                data: historyData,
                timestamp: now
            }));

            setChartUsdtLoading(false);
            return historyData;
        } catch (error) {
            console.error('Error fetching chart USDT data:', error);
            setChartUsdtLoading(false);
            return [];
        }
    };

    // Get time since last update in a friendly format
    const getTimeSinceUpdate = () => {
        if (!lastSuccessfulUpdate) return null;

        const now = Date.now();
        const diff = now - lastSuccessfulUpdate;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (days > 0) return `hace ${days} día${days > 1 ? 's' : ''}`;
        if (hours > 0) return `hace ${hours} hora${hours > 1 ? 's' : ''}`;
        if (minutes > 0) return `hace ${minutes} min`;
        return 'hace un momento';
    };

    useEffect(() => {
        refreshRates();

        // Auto-refresh every 10 minutes (600,000 ms) to keep in sync with Supabase Cron
        const intervalId = setInterval(() => {
            console.log('[RateContext] Auto-refreshing rates...');
            refreshRates();
        }, 600000);

        return () => clearInterval(intervalId);
    }, []);

    return (
        <RateContext.Provider value={{
            rates,
            loading,
            error,
            refreshRates,
            order,
            updateOrder,
            isOffline,
            lastSuccessfulUpdate,
            getTimeSinceUpdate,
            fetchHistoricalData,
            historicalLoading,
            usdtHistory,
            fetchUsdtHistoricalData,
            usdtHistoryLoading,
            usdtHourlyData,
            fetchUsdtHourlyDataForDay,
            usdtHourlyLoading,
            // Chart specific data (decoupled from table)
            chartHistory,
            chartUsdtHistory,
            chartLoading,
            chartUsdtLoading,
            fetchChartData,
            fetchChartUsdtData
        }}>
            {children}
        </RateContext.Provider>
    );
};

export const useRates = () => {
    const context = useContext(RateContext);
    if (!context) {
        throw new Error('useRates must be used within a RateProvider');
    }
    return context;
};
