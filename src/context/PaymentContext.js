import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PaymentContext = createContext();

const STORAGE_KEY = '@payment_methods';

export const PaymentProvider = ({ children }) => {
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [loading, setLoading] = useState(true);

    // Load payment methods from AsyncStorage
    useEffect(() => {
        loadPaymentMethods();
    }, []);

    const loadPaymentMethods = async () => {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEY);
            if (data) {
                setPaymentMethods(JSON.parse(data));
            }
        } catch (error) {
            console.error('Error loading payment methods:', error);
        } finally {
            setLoading(false);
        }
    };

    const savePaymentMethod = async (method) => {
        try {
            const newMethod = {
                ...method,
                id: Date.now().toString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            const updatedMethods = [...paymentMethods, newMethod];
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMethods));
            setPaymentMethods(updatedMethods);
            return newMethod;
        } catch (error) {
            console.error('Error saving payment method:', error);
            throw error;
        }
    };

    const updatePaymentMethod = async (id, updatedData) => {
        try {
            const updatedMethods = paymentMethods.map(method =>
                method.id === id
                    ? { ...method, ...updatedData, updatedAt: new Date().toISOString() }
                    : method
            );
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMethods));
            setPaymentMethods(updatedMethods);
        } catch (error) {
            console.error('Error updating payment method:', error);
            throw error;
        }
    };

    const deletePaymentMethod = async (id) => {
        try {
            const updatedMethods = paymentMethods.filter(method => method.id !== id);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMethods));
            setPaymentMethods(updatedMethods);
        } catch (error) {
            console.error('Error deleting payment method:', error);
            throw error;
        }
    };

    return (
        <PaymentContext.Provider
            value={{
                paymentMethods,
                loading,
                savePaymentMethod,
                updatePaymentMethod,
                deletePaymentMethod,
                refreshPaymentMethods: loadPaymentMethods,
            }}
        >
            {children}
        </PaymentContext.Provider>
    );
};

export const usePayment = () => {
    const context = useContext(PaymentContext);
    if (!context) {
        throw new Error('usePayment must be used within a PaymentProvider');
    }
    return context;
};
