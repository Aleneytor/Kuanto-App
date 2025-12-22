import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS } from '../theme/colors';
import CurrencyConverter from '../components/CurrencyConverter';
import { useRates } from '../context/RateContext';
import { RefreshCcw } from 'lucide-react-native';

const ConverterScreen = ({ route }) => {
    const { rates, refreshRates, loading } = useRates();
    const initialCurrency = route.params?.initialCurrency; // Get param

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Calculadora</Text>
                    <Text style={styles.headerSubtitle}>Conversión de divisas al instante</Text>
                </View>
                <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={() => refreshRates(true)}
                    disabled={loading}
                >
                    <RefreshCcw color={COLORS.textPrimary} size={20} style={loading ? { opacity: 0.5 } : {}} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <CurrencyConverter rates={rates} initialCurrency={initialCurrency} />

                <View style={styles.infoBox}>
                    <Text style={styles.infoText}>
                        Esta calculadora utiliza las tasas oficiales del BCV y el promedio del paralelo para realizar los cálculos.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 20,
        marginTop: 10,
    },
    refreshButton: {
        backgroundColor: COLORS.card,
        padding: 12,
        borderRadius: 12,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    headerSubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    infoBox: {
        marginTop: 20,
        padding: 16,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    infoText: {
        color: COLORS.textSecondary,
        fontSize: 13,
        lineHeight: 20,
        textAlign: 'center',
    }
});

export default ConverterScreen;
