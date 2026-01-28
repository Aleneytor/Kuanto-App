import React, { useEffect } from 'react';
import { StyleSheet, Text, View, useWindowDimensions, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useRates } from '../context/RateContext';
import { useTheme } from '../context/ThemeContext';
import AdBanner from '../components/AdBanner';
import NativeAdComponent from '../components/NativeAd';
import CurrencyChart from '../components/CurrencyChart';

const HistoryScreen = ({ navigation }) => {
    const { width } = useWindowDimensions();
    const { fetchHistoricalData, fetchUsdtHistoricalData } = useRates();
    const { colors, isDark } = useTheme();

    // Fetch data for the table on mount (independent of chart)
    useEffect(() => {
        // Fetch adequate history for the table (e.g., month)
        fetchHistoricalData('month');
        fetchUsdtHistoricalData('month');
    }, []);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => {
                        if (navigation.canGoBack()) {
                            navigation.goBack();
                        } else {
                            navigation.navigate('Home');
                        }
                    }}
                    style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
                >
                    <ArrowLeft size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <View>
                    <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Historial de Precios</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Evolución de la Tasa BCV</Text>
                </View>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <CurrencyChart
                    width={width}
                    initialCurrency="usd"
                    initialPeriod="week"
                    showHeaderCard={true}
                />

                {/* <NativeAdComponent style={{ marginHorizontal: 0, marginBottom: 20 }} /> */}
            </ScrollView>
            {/* <AdBanner style={styles.adBanner} /> */}
        </View >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 20,
        marginTop: Platform.OS === 'ios' ? 40 : 10,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
    },
    headerSubtitle: {
        fontSize: 14,
        marginTop: 2,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    adBanner: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
});

export default HistoryScreen;
