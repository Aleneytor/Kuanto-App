import React, { useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, RefreshControl, FlatList } from 'react-native';
import { Banknote, RefreshCcw, TrendingUp, DollarSign, History, ChevronRight, Info } from 'lucide-react-native';
import { COLORS } from '../theme/colors';
import RateCard from '../components/RateCard';
import { useRates } from '../context/RateContext';
import { formatCurrency } from '../utils/formatting';

const HomeScreen = ({ navigation }) => {
    const { rates, loading, refreshRates, order } = useRates();

    const formatDate = (dateStr) => {
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}`;
    };

    const handleCardPress = (currencyId) => {
        navigation.navigate('Calculadora', { initialCurrency: currencyId });
    };

    const cardData = useMemo(() => {
        const dataMap = {
            usd: {
                id: 'usd',
                title: 'Tasa BCV (USD)',
                rate: rates.bcv,
                color: COLORS.bcvGreen,
                icon: <DollarSign color={COLORS.bcvGreen} size={24} />,
                nextRate: rates.nextRates?.usd,
                nextDate: rates.nextRates?.date,
                change: rates.usdChange
            },
            eur: {
                id: 'eur',
                title: 'Tasa BCV (EUR)',
                rate: rates.euro,
                color: COLORS.euroBlue,
                icon: <Banknote color={COLORS.euroBlue} size={24} />,
                nextRate: rates.nextRates?.eur,
                nextDate: rates.nextRates?.date,
                change: rates.eurChange
            },
            parallel: {
                id: 'parallel',
                title: 'Promedio USDT',
                rate: rates.parallel,
                color: COLORS.parallelOrange,
                icon: <TrendingUp color={COLORS.parallelOrange} size={24} />,
                lastUpdated: rates.parallelUpdate
            }
        };

        return order.map(id => dataMap[id]);
    }, [rates, order]);

    const renderItem = ({ item }) => <RateCard {...item} onPress={() => handleCardPress(item.id)} />;

    const Header = (
        <View style={styles.header}>
            <View>
                <Text style={styles.headerTitle}>Tasas del Día</Text>
                <Text style={styles.headerSubtitle}>Tasa Oficial y Promedio USDT</Text>
                <Text style={[styles.hintText, { marginTop: 12, textAlign: 'left', fontSize: 13 }]}>👉 Toca una tarjeta para calcular</Text>
            </View>
            <TouchableOpacity
                style={styles.infoButton}
                onPress={() => navigation.navigate('Legal')}
                activeOpacity={0.7}
            >
                <Info size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
        </View>
    );

    const Footer = (
        <>
            {/* History Section */}
            {rates.history && rates.history.length > 0 && (
                <View style={styles.historySection}>
                    <TouchableOpacity
                        style={styles.sectionHeader}
                        onPress={() => navigation.navigate('HistoryChart')}
                        activeOpacity={0.7}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <History size={18} color={COLORS.textSecondary} />
                            <Text style={styles.sectionTitle}>Historial Última Semana</Text>
                        </View>
                        <ChevronRight size={16} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                    <View style={styles.historyCard}>
                        <View style={styles.historyHeader}>
                            <Text style={styles.historyLabel}>Fecha</Text>
                            <Text style={[styles.historyLabel, { textAlign: 'right' }]}>USD BCV</Text>
                            <Text style={[styles.historyLabel, { textAlign: 'right' }]}>EUR BCV</Text>
                        </View>
                        {rates.history.map((item, index) => (
                            <View key={item.date} style={[styles.historyRow, index === rates.history.length - 1 && { borderBottomWidth: 0 }]}>
                                <Text style={styles.historyDate}>{formatDate(item.date)}</Text>
                                <Text style={styles.historyValue}>{formatCurrency(item.usd)}</Text>
                                <Text style={styles.historyValue}>{formatCurrency(item.eur)}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}
            <View style={styles.footerInfo}>
                <Text style={styles.footerText}>Datos oficiales del Banco Central de Venezuela</Text>
            </View>
        </>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={cardData}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                ListHeaderComponent={Header}
                ListFooterComponent={Footer}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={() => refreshRates(true)} tintColor={COLORS.bcvGreen} />
                }
            />
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
        paddingVertical: 20,
        marginBottom: 8,
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
    refreshButton: {
        backgroundColor: COLORS.card,
        padding: 12,
        borderRadius: 12,
    },
    infoButton: {
        backgroundColor: COLORS.card,
        padding: 12,
        borderRadius: 12,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    historySection: {
        marginTop: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        color: COLORS.textSecondary,
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    historyCard: {
        backgroundColor: COLORS.card,
        borderRadius: 20,
        padding: 16,
    },
    historyHeader: {
        flexDirection: 'row',
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    historyLabel: {
        flex: 1,
        color: COLORS.textSecondary,
        fontSize: 12,
        fontWeight: '700',
    },
    historyRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    historyDate: {
        flex: 1,
        color: COLORS.textPrimary,
        fontSize: 14,
        fontWeight: '600',
    },
    historyValue: {
        flex: 1,
        color: COLORS.textPrimary,
        fontSize: 14,
        textAlign: 'right',
        fontVariant: ['tabular-nums'],
    },
    footerInfo: {
        paddingVertical: 30,
        alignItems: 'center',
    },
    footerText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        textAlign: 'center',
    },
    hintText: {
        color: COLORS.textSecondary,
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
        opacity: 0.8
    }
});

export default HomeScreen;
