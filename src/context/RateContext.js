import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { fetchAllRates, fetchHistoricalRates, fetchUsdtHistory } from '../services/rateService';
import { INITIAL_RATES } from '../constants/rates';
import { useToast } from './ToastContext';

const RateContext = createContext();

const STORAGE_KEY = '@app_rate_order';
const RATES_STORAGE_KEY = '@app_rates_cache';
const LAST_UPDATE_KEY = '@app_last_update_timestamp';
const HISTORY_CACHE_KEY = '@app_history_cache_';

export const RateProvider = ({ children }) => {
    const [rates, setRates] = useState(INITIAL_RATES);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastFetched, setLastFetched] = useState(null);
    const [isOffline, setIsOffline] = useState(false);
    const [lastSuccessfulUpdate, setLastSuccessfulUpdate] = useState(null);
    const [hasCachedRates, setHasCachedRates] = useState(false);
    const [historicalLoading, setHistoricalLoading] = useState(false);
    const [usdtHistory, setUsdtHistory] = useState([]);
    const [usdtHistoryLoading, setUsdtHistoryLoading] = useState(false);
    const [clipboardValue, setClipboardValue] = useState(null);
    const [clipboardSource, setClipboardSource] = useState(null);
    const { showToast } = useToast();

    // Default order of cards
    const [order, setOrder] = useState(['usd', 'eur', 'parallel']);

    // Guard: prevent false "came back online" detection on startup.
    // NetInfo's isInternetReachable starts as null → true, which looks like a reconnection.
    const hasInitialized = useRef(false);
    useEffect(() => {
        const timer = setTimeout(() => { hasInitialized.current = true; }, 5000);
        return () => clearTimeout(timer);
    }, []);

    // Monitor network connectivity
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            const offline = !state.isConnected || !state.isInternetReachable;
            setIsOffline(offline);

            // Only trigger reconnection refresh AFTER initial startup
            if (!offline && isOffline && hasInitialized.current) {
                refreshRates(true);
            }
        });

        // Check initial state
        NetInfo.fetch().then(state => {
            setIsOffline(!state.isConnected || !state.isInternetReachable);
        });

        return () => unsubscribe();
    }, [isOffline]);

    // Load saved data on mount (parallelized for speed)
    useEffect(() => {
        const loadSavedData = async () => {
            try {
                // Parallel reads — 3x faster than sequential
                const [savedOrder, cached, lastUpdate] = await Promise.all([
                    AsyncStorage.getItem(STORAGE_KEY),
                    AsyncStorage.getItem(RATES_STORAGE_KEY),
                    AsyncStorage.getItem(LAST_UPDATE_KEY),
                ]);

                if (savedOrder) {
                    setOrder(JSON.parse(savedOrder));
                }

                // Cache loaded for offline fallback — NOT displayed yet
                // Skeletons stay visible until fresh data arrives from Supabase
                if (cached) {
                    setHasCachedRates(true);
                    // Store in state but keep loading=true so skeletons show
                    setRates(JSON.parse(cached));
                }

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

        setLoading(true);
        setError(null);

        try {
            let newRates;

            // If we're forcing, refresh historical data at the same time as all rates
            if (force) {
                console.log('[RateContext] Forcing refresh of all data and history in parallel...');
                
                // Keep the loading state true from the beginning of refreshRates
                const [ratesResult, histResult, usdtResult] = await Promise.allSettled([
                    fetchAllRates(),
                    fetchHistoricalData('all', true),
                    fetchUsdtHistoricalData('all', true)
                ]);

                if (ratesResult.status === 'fulfilled') {
                    newRates = ratesResult.value;
                } else {
                    throw ratesResult.reason; // If main rates fail, throw error
                }
            } else {
                // Normal background/auto refresh
                newRates = await fetchAllRates();
            }

            setRates(prev => {
                // If the new rates have a shorter history than what we already have,
                // keep the existing (larger) history.
                const updatedHistory = (newRates.history?.length || 0) > (prev.history?.length || 0)
                    ? newRates.history
                    : prev.history;
                
                return { ...newRates, history: updatedHistory };
            });

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

            // If we have cached rates and fetch failed, show cached data as fallback
            if (hasCachedRates && rates.bcv > 0) {
                console.log('[RateContext] Fetch failed, showing cached rates as fallback');
            }

            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistoricalData = async (period = 'week', force = false) => {
        setHistoricalLoading(true);
        try {
            // Check cache first
            const cacheKey = `${HISTORY_CACHE_KEY}${period}`;
            const cached = await AsyncStorage.getItem(cacheKey);
            const now = Date.now();

            if (cached && !force) {
                const { data, timestamp } = JSON.parse(cached);
                // Cache for 1 minute
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

    const fetchUsdtHistoricalData = async (period = 'week', force = false) => {
        setUsdtHistoryLoading(true);
        try {
            // Check cache first
            const cacheKey = `@app_usdt_history_cache_${period}`;
            const cached = await AsyncStorage.getItem(cacheKey);
            const now = Date.now();

            if (cached && !force) {
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
        // Start fetching fresh rates immediately on mount
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
            clipboardValue,
            setClipboardValue,
            clipboardSource,
            setClipboardSource
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
