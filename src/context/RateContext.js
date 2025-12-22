import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchAllRates } from '../services/rateService';
import { INITIAL_RATES } from '../constants/rates';
import { useToast } from './ToastContext'; // Import useToast

const RateContext = createContext();

const STORAGE_KEY = '@app_rate_order';
const RATES_STORAGE_KEY = '@app_rates_cache';

export const RateProvider = ({ children }) => {
    const [rates, setRates] = useState(INITIAL_RATES);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastFetched, setLastFetched] = useState(null);
    const { showToast } = useToast(); // Use the hook

    // Default order of cards
    const [order, setOrder] = useState(['usd', 'eur', 'parallel']);

    // ... loadOrder logic unchanged ...
    useEffect(() => {
        const loadOrder = async () => {
            try {
                const savedOrder = await AsyncStorage.getItem(STORAGE_KEY);
                if (savedOrder) {
                    setOrder(JSON.parse(savedOrder));
                }
            } catch (e) {
                console.error("Failed to load order", e);
            }
        };

        const loadCachedRates = async () => {
            try {
                const cached = await AsyncStorage.getItem(RATES_STORAGE_KEY);
                if (cached) {
                    setRates(JSON.parse(cached));
                }
            } catch (e) {
                console.error("Failed to load cached rates", e);
            }
        };

        loadOrder();
        loadCachedRates();
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
        // If force is false (auto-refresh), keep the 2-minute cache.
        if (lastFetched && (now - lastFetched < 15000)) {
            if (force) {
                const remaining = Math.ceil((15000 - (now - lastFetched)) / 1000);
                showToast(`Espera ${remaining}s para actualizar nuevamente`, 'error');
            }
            return;
        }
        if (!force && lastFetched && (now - lastFetched < 120000)) {
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const newRates = await fetchAllRates();
            setRates(newRates);
            setLastFetched(Date.now());
            await AsyncStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(newRates)); // Cache rates
            if (force) showToast('Tasas actualizadas correctamente', 'success');
        } catch (err) {
            setError("No se pudieron actualizar las tasas");
            showToast('Error al actualizar las tasas', 'error');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshRates();
    }, []);

    return (
        <RateContext.Provider value={{ rates, loading, error, refreshRates, order, updateOrder }}>
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
