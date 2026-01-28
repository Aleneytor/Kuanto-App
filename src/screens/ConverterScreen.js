import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import CurrencyConverter from '../components/CurrencyConverter';
import { useRates } from '../context/RateContext';
import { RefreshCcw, WifiOff } from 'lucide-react-native';
import AdBanner from '../components/AdBanner';
import NativeAdComponent from '../components/NativeAd';

const ConverterScreen = ({ route }) => {
    const { rates, refreshRates, loading, isOffline, getTimeSinceUpdate } = useRates();
    const { colors, isDark } = useTheme();
    const initialCurrency = route.params?.initialCurrency;

    const [resetKey, setResetKey] = React.useState(0);

    const handleRefresh = () => {
        refreshRates(true);
        setResetKey(prev => prev + 1);
    };

    const OfflineBanner = () => {
        if (!isOffline) return null;

        const timeSince = getTimeSinceUpdate();

        return (
            <View style={[styles.offlineBanner, {
                backgroundColor: isDark ? 'rgba(255, 149, 0, 0.15)' : 'rgba(255, 149, 0, 0.12)',
                borderColor: isDark ? 'rgba(255, 149, 0, 0.3)' : 'rgba(255, 149, 0, 0.25)'
            }]}>
                <WifiOff size={16} color={colors.parallelOrange} />
                <View style={styles.offlineTextContainer}>
                    <Text style={[styles.offlineTitle, { color: colors.parallelOrange }]}>
                        Sin conexión
                    </Text>
                    {timeSince && (
                        <Text style={[styles.offlineSubtitle, { color: colors.textSecondary }]}>
                            Tasas de {timeSince}
                        </Text>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Image
                        source={require('../../assets/app-logo.svg')}
                        style={styles.headerLogo}
                        resizeMode="contain"
                    />
                    <View>
                        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Calculadora</Text>
                        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Conversión de divisas al instante</Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={[styles.refreshButton, {
                        backgroundColor: colors.glass,
                        borderColor: colors.glassBorder
                    }]}
                    onPress={handleRefresh}
                    disabled={loading}
                >
                    <RefreshCcw color={colors.textPrimary} size={20} style={loading ? { opacity: 0.5 } : {}} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <OfflineBanner />

                <CurrencyConverter key={resetKey} rates={rates} initialCurrency={initialCurrency} />

                <View style={[styles.infoBox, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                    borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                }]}>
                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                        {isOffline
                            ? 'Estás sin conexión. Las tasas mostradas son las últimas guardadas.'
                            : 'Esta calculadora utiliza las tasas oficiales del BCV y el promedio del paralelo para realizar los cálculos.'
                        }
                    </Text>
                </View>

                {/* <NativeAdComponent style={{ marginHorizontal: 0, marginTop: 16 }} /> */}
            </ScrollView>
            {/* <AdBanner style={styles.adBanner} /> */}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 24,
        marginTop: 8,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    headerLogo: {
        width: 60,
        height: 60,
    },
    refreshButton: {
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 15,
        marginTop: 6,
        fontWeight: '500',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 160,
    },
    adBanner: {
        position: 'absolute',
        bottom: 95,
        left: 0,
        right: 0,
    },
    infoBox: {
        marginTop: 20,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    infoText: {
        fontSize: 13,
        lineHeight: 20,
        textAlign: 'center',
    },
    // Offline Banner Styles
    offlineBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        gap: 12,
    },
    offlineTextContainer: {
        flex: 1,
    },
    offlineTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    offlineSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
});

export default ConverterScreen;
