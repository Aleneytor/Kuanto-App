import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { ArrowLeft, TrendingUp, Calendar, Info } from 'lucide-react-native';
import { useRates } from '../context/RateContext';

const { width } = Dimensions.get('window');

// Hardcoded theme to assume zero risk of import errors
const THEME = {
    background: '#1c1c1e',
    card: '#2c2c2e',
    bcvGreen: '#34c759',
    euroBlue: '#3b82f6',
    textPrimary: '#ffffff',
    textSecondary: '#8e8e93',
    success: 'rgba(52, 199, 89, 0.1)',
};

const HistoryScreen = ({ navigation }) => {
    const { rates } = useRates();
    const [selectedCurrency, setSelectedCurrency] = useState('usd'); // 'usd' or 'eur'

    // Reverse logic: History is [Newest, ..., Oldest]. 
    // We want chart Left->Right to be Oldest->Newest.
    const historyData = rates.history ? [...rates.history].reverse() : [];

    const formatData = (currency) => {
        return historyData.map(item => ({
            value: currency === 'usd' ? item.usd : item.eur,
            label: item.date.split('-')[2], // Just the day number to save space
            fullDate: item.date, // Store full date for tooltip
            dataPointText: '',
        }));
    };

    const chartData = formatData(selectedCurrency);

    // Dynamic display values (initialized with the latest value)
    const latestValue = chartData.length > 0 ? chartData[chartData.length - 1].value : 0;
    const latestDate = chartData.length > 0 ? chartData[chartData.length - 1].fullDate : '';

    // We use a trick: pointerLabelComponent updates a specific standard view? 
    // Actually dynamic state updates from chart callbacks can be tricky in RN. 
    // Instead we will use the pointerLabelComponent to render the "Floating Info" right on top of the finger.

    // Calculate range
    const values = chartData.map(d => d.value);
    const minVal = values.length ? Math.min(...values) * 0.995 : 0;
    const maxVal = values.length ? Math.max(...values) * 1.005 : 100;

    const currentColor = selectedCurrency === 'usd' ? THEME.bcvGreen : THEME.euroBlue;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={THEME.textPrimary} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Tendencia Histórica</Text>
                    <Text style={styles.headerSubtitle}>Comportamiento de los últimos 7 días</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Currency Tabs */}
                <View style={styles.tabsContainer}>
                    <TouchableOpacity
                        style={[styles.tab, selectedCurrency === 'usd' && styles.activeTab]}
                        onPress={() => setSelectedCurrency('usd')}
                    >
                        <View style={[styles.tabIndicator, selectedCurrency === 'usd' ? { backgroundColor: THEME.bcvGreen } : { backgroundColor: 'transparent' }]} />
                        <Text style={[styles.tabText, selectedCurrency === 'usd' && styles.activeTabText]}>Dolar BCV</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, selectedCurrency === 'eur' && styles.activeTab]}
                        onPress={() => setSelectedCurrency('eur')}
                    >
                        <View style={[styles.tabIndicator, selectedCurrency === 'eur' ? { backgroundColor: THEME.euroBlue } : { backgroundColor: 'transparent' }]} />
                        <Text style={[styles.tabText, selectedCurrency === 'eur' && styles.activeTabText]}>Euro BCV</Text>
                    </TouchableOpacity>
                </View>

                {/* Big Value Display */}
                <View style={styles.summaryContainer}>
                    <Text style={styles.summaryLabel}>Valor Actual</Text>
                    <Text style={[styles.summaryValue, { color: currentColor }]}>
                        {latestValue.toFixed(2)} Bs
                    </Text>
                    <View style={styles.dateBadge}>
                        <Calendar size={12} color={THEME.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={styles.dateText}>{latestDate}</Text>
                    </View>
                </View>

                {/* The Chart */}
                <View style={styles.chartWrapper}>
                    <LineChart
                        data={chartData}
                        height={250}
                        width={width - 40}
                        spacing={(width - 80) / Math.max(chartData.length - 1, 1)}
                        initialSpacing={20}
                        endSpacing={20}
                        color={currentColor}
                        thickness={3}
                        hideRules
                        hideYAxisText={false}
                        yAxisTextStyle={{ color: THEME.textSecondary, fontSize: 10 }}
                        yAxisColor="transparent"
                        xAxisColor="transparent"
                        xAxisLabelTextStyle={{ color: THEME.textSecondary, fontSize: 11, fontWeight: 'bold' }}
                        dataPointsHeight={10}
                        dataPointsWidth={10}
                        dataPointsColor={THEME.card}
                        dataPointsShape="circle"
                        customDataPoint={() => (
                            <View style={{
                                width: 12,
                                height: 12,
                                backgroundColor: THEME.card,
                                borderWidth: 3,
                                borderColor: currentColor,
                                borderRadius: 6
                            }} />
                        )}
                        areaChart
                        startFillColor={currentColor}
                        endFillColor={currentColor}
                        startOpacity={0.25}
                        endOpacity={0.0}
                        curved
                        isAnimated
                        animationDuration={1200}
                        yAxisDomain={[minVal, maxVal]}
                        pointerConfig={{
                            pointerStripHeight: 160,
                            pointerStripColor: 'rgba(255,255,255,0.2)',
                            pointerStripWidth: 2,
                            pointerColor: currentColor,
                            radius: 6,
                            pointerLabelWidth: 100,
                            pointerLabelHeight: 90,
                            activatePointersOnLongPress: true,
                            autoAdjustPointerLabelPosition: false,
                            pointerLabelComponent: items => {
                                return (
                                    <View
                                        style={{
                                            height: 80,
                                            width: 100,
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            marginTop: -30,
                                            marginLeft: -35,
                                            zIndex: 999
                                        }}>
                                        <View style={{
                                            paddingHorizontal: 12,
                                            paddingVertical: 8,
                                            borderRadius: 12,
                                            backgroundColor: '#2c2c2e',
                                            borderWidth: 1,
                                            borderColor: 'rgba(255,255,255,0.1)',
                                            shadowColor: "#000",
                                            shadowOffset: { width: 0, height: 4 },
                                            shadowOpacity: 0.3,
                                            shadowRadius: 4,
                                            elevation: 5,
                                            alignItems: 'center'
                                        }}>
                                            <Text style={{ color: THEME.textSecondary, fontSize: 10, marginBottom: 2 }}>{items[0].fullDate}</Text>
                                            <Text style={{ fontWeight: 'bold', fontSize: 16, color: THEME.textPrimary }}>
                                                {items[0].value.toFixed(2)}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            },
                        }}
                    />
                </View>

                <View style={styles.footerNote}>
                    <Info size={14} color={THEME.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={styles.footerText}>Mantén presionado para ver detalles</Text>
                </View>

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 20,
        backgroundColor: THEME.background,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: THEME.card,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: THEME.textPrimary,
    },
    headerSubtitle: {
        fontSize: 13,
        color: THEME.textSecondary,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 24,
        gap: 12,
    },
    tab: {
        flex: 1,
        backgroundColor: THEME.card,
        borderRadius: 16,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.03)',
    },
    activeTab: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderColor: 'rgba(255,255,255,0.08)',
    },
    tabIndicator: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: THEME.textSecondary,
    },
    activeTabText: {
        color: THEME.textPrimary,
        fontWeight: '700',
    },
    summaryContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    summaryLabel: {
        color: THEME.textSecondary,
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 36,
        fontWeight: '800',
        marginBottom: 8,
    },
    dateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: THEME.card,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    dateText: {
        color: THEME.textSecondary,
        fontSize: 12,
        fontWeight: '600',
    },
    chartWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerNote: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        opacity: 0.6,
    },
    footerText: {
        color: THEME.textSecondary,
        fontSize: 12,
    }
});

export default HistoryScreen;
