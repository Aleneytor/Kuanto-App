import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, Platform } from 'react-native';
import { AlertCircle, CheckCircle } from 'lucide-react-native';
import { COLORS } from '../theme/colors';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
    const [toast, setToast] = useState(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();

        setTimeout(() => {
            hideToast();
        }, 3000);
    };

    const hideToast = () => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start(() => setToast(null));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {toast && (
                <Animated.View
                    style={[
                        styles.toastContainer,
                        { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }
                    ]}
                >
                    <View style={[styles.toast, typeStyles[toast.type]]}>
                        {toast.type === 'error' ? (
                            <AlertCircle size={20} color={COLORS.textPrimary} style={styles.icon} />
                        ) : (
                            <CheckCircle size={20} color={COLORS.textPrimary} style={styles.icon} />
                        )}
                        <Text style={styles.message}>{toast.message}</Text>
                    </View>
                </Animated.View>
            )}
        </ToastContext.Provider>
    );
};

export const useToast = () => useContext(ToastContext);

const typeStyles = {
    info: { backgroundColor: COLORS.card, borderLeftColor: COLORS.bcvGreen },
    error: { backgroundColor: '#3A1E1E', borderLeftColor: '#FF453A' }, // Using a dark red for error/warning background
    success: { backgroundColor: '#1E3A2A', borderLeftColor: '#34C759' }
};

const styles = StyleSheet.create({
    toastContainer: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 80 : 60, // Position at bottom with some padding
        left: 20,
        right: 20,
        zIndex: 9999,
        alignItems: 'center',
    },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: COLORS.card,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.30,
        shadowRadius: 4.65,
        elevation: 8,
        borderLeftWidth: 4,
        minWidth: '90%',
    },
    icon: {
        marginRight: 10,
    },
    message: {
        color: COLORS.textPrimary,
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    }
});
