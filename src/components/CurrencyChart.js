import React, { useState, useMemo, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform, ActivityIndicator, Pressable } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { DollarSign, Banknote, Coins, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Calendar } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency } from '../utils/formatting';
import { useRates } from '../context/RateContext';

/**
 * Shared Currency Chart Component
 * Extracted from HistoryScreen - Used in both HomeScreen and HistoryScreen
 */
const CurrencyChart = ({
    width,
    onCurrencyChange,
    onPeriodChange,
    initialCurrency = 'usd',
    initialPeriod = 'week',
    showHeaderCard = true,
    historicalRates = null,  // Historical rates for selected date
    selectedDate = null,     // Selected historical date
}) => {
    const { colors, isDark } = useTheme();
    const {
        rates,
        refreshRates,
        usdtHistory,
        usdtHourlyData,
        fetchUsdtHourlyDataForDay,
        usdtHourlyLoading,
        chartHistory,
        chartUsdtHistory,
        chartLoading,
        chartUsdtLoading,
        fetchChartData,
        fetchChartUsdtData
    } = useRates();

    const [selectedCurrency, setSelectedCurrency] = useState(initialCurrency);
    const [timePeriod, setTimePeriod] = useState(initialPeriod);
    const [selectedPoint, setSelectedPoint] = useState(null);
    const [selectedDayOffset, setSelectedDayOffset] = useState(0);
    const [hoveredItem, setHoveredItem] = useState(null);
    const [containerWidth, setContainerWidth] = useState(0); // State for dynamic width measurement

    // Helper functions
    const getDateFromOffset = (offset) => {
        const date = new Date();
        date.setDate(date.getDate() - offset);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getDateLabel = (offset) => {
        const date = new Date();
        date.setDate(date.getDate() - offset);
        if (offset === 0) return 'Hoy';
        if (offset === 1) return 'Ayer';
        return date.toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: '2-digit' });
    };

    const sampleData = (data) => {
        switch (timePeriod) {
            case 'day':
                return data.length > 24 ? data.filter((_, index) => index % Math.ceil(data.length / 24) === 0) : data;
            case 'week':
                return data;
            case 'month':
                return data.filter((_, index) => index % 2 === 0);
            case 'year':
                return data.filter((_, index) => index % 7 === 0);
            case 'all':
                return data.filter((_, index) => index % 30 === 0);
            default:
                return data;
        }
    };

    const getLabelFrequency = () => {
        switch (timePeriod) {
            case 'day': return 4;
            case 'week': return 1;
            case 'month': return 4;
            case 'year': return 8;
            case 'all': return 8;
            default: return 1;
        }
    };

    // Initial data fetch on mount - Get current rates AND pre-fetch charts
    useEffect(() => {
        // Fetch current rates (USD, EUR) on component mount
        refreshRates();
        // Pre-fetch chart data so it's ready when user clicks
        fetchChartData(initialPeriod);
        // Pre-fetch USDT data (use week if period is day, as daily needs specific trigger)
        fetchChartUsdtData(initialPeriod === 'day' ? 'week' : initialPeriod);
    }, []);

    // Fetch historical data when currency or period changes
    useEffect(() => {
        if (selectedCurrency === 'usdt') {
            if (timePeriod === 'day') {
                fetchChartUsdtData('week');
            } else {
                fetchChartUsdtData(timePeriod);
            }
        } else if (selectedCurrency === 'gap') {
            // For Gap view, we need BOTH datasets
            fetchChartData(timePeriod);
            if (timePeriod === 'day') {
                // For day view, we also need underlying week data for context if needed, 
                // though mostly hourly data is used
                fetchChartUsdtData('week');
            } else {
                fetchChartUsdtData(timePeriod);
            }
        } else {
            // For USD and EUR, fetch chart data
            fetchChartData(timePeriod);
        }
    }, [selectedCurrency, timePeriod]);

    // Fetch hourly USDT data for specific day
    useEffect(() => {
        // Support hourly data for both USDT and Gap views
        if ((selectedCurrency === 'usdt' || selectedCurrency === 'gap') && timePeriod === 'day') {
            const dateString = getDateFromOffset(selectedDayOffset);
            fetchUsdtHourlyDataForDay(dateString);
        }
    }, [selectedCurrency, timePeriod, selectedDayOffset]);

    // Reset day offset when switching away from USDT day view
    useEffect(() => {
        if (selectedCurrency !== 'usdt' || timePeriod !== 'day') {
            setSelectedDayOffset(0);
        }
    }, [selectedCurrency, timePeriod]);

    // Chart configuration (extracted from HistoryScreen)
    const chartConfig = useMemo(() => {
        // Special handling for "Brecha" (Gap) view
        if (selectedCurrency === 'gap') {
            // Get data from chartHistory for USD/EUR and chartUsdtHistory for USDT
            const historyData = chartHistory || [];
            if (historyData.length > 0) {
                console.log('[CurrencyChart] Using history data (first item):', historyData[0]);
            }
            // For day view, use hourly USDT data, otherwise use daily
            const usdtData = timePeriod === 'day' ? (usdtHourlyData || []) : (chartUsdtHistory || []);

            if (historyData.length === 0 || usdtData.length === 0) {
                return {
                    isGapView: true,
                    data: [],
                    dataUsd: [],
                    dataEur: [],
                    dataUsdt: [],
                    color: colors.accent || '#00E378',
                    yAxisOffset: 0,
                    title: 'Brecha Cambiaria',
                    gaps: null,
                };
            }

            const labelFreq = getLabelFrequency();
            const sampledHistoryData = sampleData(historyData);
            const sampledUsdtData = sampleData(usdtData);

            // Process USD data
            const dataUsd = sampledHistoryData
                .filter(item => item.usd !== undefined && item.usd !== null && !isNaN(parseFloat(item.usd)))
                .map((item, index) => ({
                    value: parseFloat(item.usd),
                    label: index % labelFreq === 0
                        ? new Date(item.date).toLocaleDateString('es-VE', {
                            day: 'numeric',
                            month: 'short',
                            year: '2-digit'
                        })
                        : '',
                    fullDate: new Date(item.date).toLocaleDateString('es-VE', {
                        day: 'numeric',
                        month: 'short',
                        year: '2-digit'
                    }),
                }))
                .reverse();

            // Process EUR data
            const dataEur = sampledHistoryData
                .filter(item => item.eur !== undefined && item.eur !== null && !isNaN(parseFloat(item.eur)))
                .map((item, index) => ({
                    value: parseFloat(item.eur),
                    label: index % labelFreq === 0
                        ? new Date(item.date).toLocaleDateString('es-VE', {
                            day: 'numeric',
                            month: 'short',
                            ...(timePeriod === 'all' && { year: '2-digit' })
                        })
                        : '',
                    fullDate: new Date(item.date).toLocaleDateString('es-VE', {
                        day: 'numeric',
                        month: 'short',
                        year: '2-digit'
                    }),
                }))
                .reverse();

            // Process USDT data
            const dataUsdt = sampledUsdtData
                .filter(item => item.usdt !== undefined && item.usdt !== null && !isNaN(parseFloat(item.usdt)))
                .map((item, index) => {
                    const isHourly = item.time !== undefined;
                    return {
                        value: parseFloat(item.usdt),
                        label: isHourly
                            ? (index % labelFreq === 0 ? item.time : '')
                            : (index % labelFreq === 0
                                ? new Date(item.date).toLocaleDateString('es-VE', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: '2-digit'
                                })
                                : ''),
                        fullDate: isHourly
                            ? item.time
                            : new Date(item.date).toLocaleDateString('es-VE', {
                                day: 'numeric',
                                month: 'short',
                                year: '2-digit'
                            }),
                    };
                });

            // Don't reverse hourly data, but reverse daily data
            if (timePeriod !== 'day') {
                dataUsdt.reverse();
            }

            // Calculate current gaps using latest rates
            const currentBcv = rates?.bcv || 0;
            const currentEur = rates?.euro || 0;
            const currentUsdt = rates?.parallel || 0;

            const gaps = {
                bcvUsdt: {
                    percentage: currentBcv > 0 ? ((currentUsdt - currentBcv) / currentBcv) * 100 : 0,
                    absolute: currentUsdt - currentBcv,
                    isPositive: currentUsdt > currentBcv,
                },
                eurUsdt: {
                    percentage: currentEur > 0 ? ((currentUsdt - currentEur) / currentEur) * 100 : 0,
                    absolute: currentUsdt - currentEur,
                    isPositive: currentUsdt > currentEur,
                },
                bcvEur: {
                    percentage: currentBcv > 0 ? ((currentEur - currentBcv) / currentBcv) * 100 : 0,
                    absolute: currentEur - currentBcv,
                    isPositive: currentEur > currentBcv,
                },
            };

            // Calculate combined min/max for Y-axis
            const allValues = [...dataUsd.map(d => d.value), ...dataEur.map(d => d.value), ...dataUsdt.map(d => d.value)];
            const min = allValues.length > 0 ? Math.min(...allValues) : 0;
            const max = allValues.length > 0 ? Math.max(...allValues) : 0;
            const padding = (max - min) * 0.3 || 2;

            return {
                isGapView: true,
                data: dataUsd, // Use USD as primary for spacing
                dataUsd,
                dataEur,
                dataUsdt,
                color: colors.accent || '#00E378',
                yAxisOffset: min > 0 ? Math.floor(min - padding) : 0,
                title: 'Brecha Cambiaria',
                gaps,
                colors: {
                    usd: colors.bcvGreen,
                    eur: colors.euroBlue,
                    usdt: colors.usdtOrange || '#F7931A',
                },
            };
        }

        // Regular single-currency view logic
        let historyData = [];
        try {
            if (selectedCurrency === 'usd' || selectedCurrency === 'eur') {
                historyData = chartHistory || [];
            } else if (selectedCurrency === 'usdt') {
                if (timePeriod === 'day') {
                    historyData = usdtHourlyData || [];
                } else {
                    historyData = chartUsdtHistory || [];
                }
            }
        } catch (error) {
            console.error('Error getting history data:', error);
            historyData = [];
        }

        const isHourlyData = selectedCurrency === 'usdt' && timePeriod === 'day';

        if (!historyData || historyData.length === 0) {
            return {
                data: [],
                color: selectedCurrency === 'usd' ? colors.bcvGreen : selectedCurrency === 'eur' ? colors.euroBlue : colors.usdtOrange || '#F7931A',
                yAxisOffset: 0,
                change: 0,
                currentRate: 0,
                title: selectedCurrency === 'usd' ? 'Dólar BCV' : selectedCurrency === 'eur' ? 'Euro BCV' : 'USDT',
                symbol: selectedCurrency === 'usd' ? '$' : selectedCurrency === 'eur' ? '€' : '₮',
                isHourlyData: false
            };
        }

        const labelFreq = getLabelFrequency();
        const sampledData = sampleData(historyData);

        const data = sampledData
            .filter(item => {
                const val = selectedCurrency === 'usd' ? item.usd : selectedCurrency === 'eur' ? item.eur : item.usdt;
                return val !== undefined && val !== null && !isNaN(parseFloat(val));
            })
            .map((item, index) => {
                const isHourly = item.time !== undefined;
                const labelText = isHourly
                    ? (index % labelFreq === 0 ? item.time : '')
                    : (index % labelFreq === 0
                        ? new Date(item.date).toLocaleDateString('es-VE', {
                            day: 'numeric',
                            month: 'short',
                            year: '2-digit'
                        })
                        : '');

                const fullDateText = isHourly
                    ? item.time
                    : new Date(item.date).toLocaleDateString('es-VE', {
                        day: 'numeric',
                        month: 'short',
                        year: '2-digit'
                    });

                return {
                    value: parseFloat(selectedCurrency === 'usd' ? item.usd : selectedCurrency === 'eur' ? item.eur : item.usdt),
                    label: labelText,
                    fullDate: fullDateText,
                    originalValue: parseFloat(selectedCurrency === 'usd' ? item.usd : selectedCurrency === 'eur' ? item.eur : item.usdt)
                };
            });

        if (!isHourlyData) {
            data.reverse();
        }

        if (data.length === 0) {
            return {
                data: [],
                color: selectedCurrency === 'usd' ? colors.bcvGreen : selectedCurrency === 'eur' ? colors.euroBlue : colors.usdtOrange || '#F7931A',
                yAxisOffset: 0,
                change: 0,
                currentRate: 0,
                title: selectedCurrency === 'usd' ? 'Dólar BCV' : selectedCurrency === 'eur' ? 'Euro BCV' : isHourlyData ? (selectedDayOffset > 0 ? 'USDT (Histórico)' : 'USDT (Hoy)') : 'USDT Promedio',
                symbol: selectedCurrency === 'usd' ? '$' : selectedCurrency === 'eur' ? '€' : '₮',
                isHourlyData
            };
        }

        const values = data.map(d => d.value);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const padding = (max - min) * 0.3 || 2;

        let periodChange = 0;
        try {
            if (isHourlyData) {
                if (usdtHistory && Array.isArray(usdtHistory) && usdtHistory.length > selectedDayOffset + 1) {
                    const targetDay = usdtHistory[selectedDayOffset];
                    const prevDay = usdtHistory[selectedDayOffset + 1];
                    if (targetDay && prevDay && targetDay.usdt && prevDay.usdt) {
                        const targetDayPrice = parseFloat(targetDay.usdt);
                        const prevDayPrice = parseFloat(prevDay.usdt);
                        if (!isNaN(targetDayPrice) && !isNaN(prevDayPrice) && prevDayPrice > 0) {
                            periodChange = ((targetDayPrice - prevDayPrice) / prevDayPrice) * 100;
                        }
                    }
                } else if (data.length > 1) {
                    const firstPrice = parseFloat(data[0].value);
                    const lastPrice = parseFloat(data[data.length - 1].value);
                    if (!isNaN(firstPrice) && !isNaN(lastPrice) && firstPrice > 0) {
                        periodChange = ((lastPrice - firstPrice) / firstPrice) * 100;
                    }
                }
            } else if (selectedCurrency === 'usdt' && Array.isArray(chartUsdtHistory) && chartUsdtHistory.length > 1) {
                const current = chartUsdtHistory[0];
                const oldest = chartUsdtHistory[chartUsdtHistory.length - 1];
                if (current && oldest && current.usdt && oldest.usdt) {
                    const currentPrice = parseFloat(current.usdt);
                    const oldestPrice = parseFloat(oldest.usdt);
                    if (!isNaN(currentPrice) && !isNaN(oldestPrice) && oldestPrice > 0) {
                        periodChange = ((currentPrice - oldestPrice) / oldestPrice) * 100;
                    }
                }
            } else if (data.length > 1) {
                const currentPrice = data[data.length - 1].value;
                const oldestPrice = data[0].value;
                if (!isNaN(currentPrice) && !isNaN(oldestPrice) && oldestPrice > 0) {
                    periodChange = ((currentPrice - oldestPrice) / oldestPrice) * 100;
                }
            }
        } catch (error) {
            console.error('Error calculating period change:', error);
            periodChange = 0;
        }

        // Safely get current rate
        let currentRate = 0;
        let isViewingHistory = false;

        try {
            // Check if we're viewing a historical date
            if (selectedDate) {
                const today = new Date();
                isViewingHistory = selectedDate.toDateString() !== today.toDateString();
            }

            if (isHourlyData) {
                // For hourly USDT data, use the last data point or current parallel rate
                currentRate = data.length > 0 ? data[data.length - 1].value : (rates?.parallel || 0);
            } else if (isViewingHistory && historicalRates) {
                // Use historical rates when viewing past dates
                if (selectedCurrency === 'usd') {
                    currentRate = historicalRates.bcv || 0;
                } else if (selectedCurrency === 'eur') {
                    currentRate = historicalRates.euro || 0;
                } else if (selectedCurrency === 'usdt') {
                    // USDT not available for historical dates
                    currentRate = 0;
                }
            } else {
                // For current rates (not viewing history)
                // Note: rates object has 'bcv' for USD and 'euro' for EUR
                if (selectedCurrency === 'usd') {
                    currentRate = rates?.bcv || 0;
                } else if (selectedCurrency === 'eur') {
                    currentRate = rates?.euro || 0;
                } else if (selectedCurrency === 'usdt') {
                    // For USDT week/month view: calculate average from chartUsdtHistory
                    if (chartUsdtHistory && chartUsdtHistory.length > 0) {
                        const sum = chartUsdtHistory.reduce((acc, item) => {
                            const val = parseFloat(item.usdt);
                            return acc + (isNaN(val) ? 0 : val);
                        }, 0);
                        currentRate = sum / chartUsdtHistory.length;
                    } else {
                        // Fallback to current parallel rate if no history available
                        currentRate = rates?.parallel || 0;
                    }
                }
            }

            // Debug logging
            if (currentRate === 0 && selectedCurrency !== 'usdt') {
                console.log('[CurrencyChart] Warning: currentRate is 0');
                console.log('selectedCurrency:', selectedCurrency);
                console.log('isViewingHistory:', isViewingHistory);
                console.log('historicalRates:', historicalRates);
                console.log('rates.bcv:', rates?.bcv);
                console.log('rates.euro:', rates?.euro);
                console.log('rates.parallel:', rates?.parallel);
                console.log('isHourlyData:', isHourlyData);
            }
        } catch (error) {
            console.error('Error getting current rate:', error);
            currentRate = 0;
        }

        // Generate title based on currency and viewing mode
        let title = '';
        if (selectedCurrency === 'usd') {
            title = isViewingHistory ? 'Dólar BCV (Histórico)' : 'Dólar BCV';
        } else if (selectedCurrency === 'eur') {
            title = isViewingHistory ? 'Euro BCV (Histórico)' : 'Euro BCV';
        } else {
            title = isHourlyData ? (selectedDayOffset > 0 ? 'USDT (Histórico)' : 'USDT (Hoy)') : 'USDT Promedio';
        }

        // Calculate stats for desktop view
        const minValue = data.length > 0 ? Math.min(...data.map(d => d.value)) : 0;
        const maxValue = data.length > 0 ? Math.max(...data.map(d => d.value)) : 0;
        const openValue = data.length > 0 ? data[0].value : 0;
        const closeValue = data.length > 0 ? data[data.length - 1].value : 0;

        return {
            data,
            color: selectedCurrency === 'usd' ? colors.bcvGreen : selectedCurrency === 'eur' ? colors.euroBlue : colors.usdtOrange || '#F7931A',
            yAxisOffset: min > 0 ? Math.floor(min - padding) : 0,
            change: periodChange,
            currentRate,
            title,
            symbol: selectedCurrency === 'usd' ? '$' : selectedCurrency === 'eur' ? '€' : '₮',
            isHourlyData,
            // Stats for desktop grid
            minValue,
            maxValue,
            openValue,
            closeValue,
        };
    }, [rates, selectedCurrency, colors, timePeriod, chartHistory, chartUsdtHistory, usdtHourlyData, usdtHistory, selectedDayOffset, historicalRates, selectedDate]);

    const handleCurrencyChange = (currency) => {
        Haptics.selectionAsync();
        setSelectedCurrency(currency);
        setSelectedPoint(null);
        setHoveredItem(null); // Clear hover state prevents sticky hover on touch
        if (onCurrencyChange) onCurrencyChange(currency);
    };

    const handlePeriodChange = (period) => {
        Haptics.selectionAsync();
        setTimePeriod(period);
        setSelectedPoint(null);
        setHoveredItem(null);
        if (onPeriodChange) onPeriodChange(period);
    };

    const isPositive = chartConfig.change >= 0;
    const TrendIcon = isPositive ? TrendingUp : TrendingDown;

    const styles = StyleSheet.create({
        // Currency Tabs - Glassmorphism style
        tabsContainer: {
            flexDirection: 'row',
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderRadius: 16,
            padding: 4,
            marginBottom: 20,
            ...Platform.select({
                web: {
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                },
            }),
        },
        tab: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingVertical: 12,
            paddingHorizontal: 8,
            borderRadius: 12,
        },
        tabActive: {
            backgroundColor: 'rgba(255,255,255,0.03)',
            ...Platform.select({
                ios: {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 12,
                },
                android: { elevation: 4 },
                web: { boxShadow: '0 4px 12px rgba(0,0,0,0.2)' },
            }),
        },
        tabText: {
            fontSize: 14,
            fontWeight: '500',
        },
        tabTextActive: {
            fontWeight: '600',
        },
        // Period Buttons - Glow effect when active
        periodContainer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 20,
            paddingHorizontal: 4,
        },
        periodButton: {
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 20,
            alignItems: 'center',
        },
        periodButtonActive: {
            ...Platform.select({
                web: { boxShadow: '0 0 15px var(--accent-glow, rgba(0,227,120,0.3))' },
                ios: {
                    shadowColor: '#00E378',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.4,
                    shadowRadius: 15,
                },
            }),
        },
        periodText: {
            fontSize: 13,
            fontWeight: '500',
        },
        periodTextActive: {
            fontWeight: '700',
        },
        // Rate Card - Premium glass effect
        rateCard: {
            backgroundColor: colors.card,
            borderRadius: 30,
            padding: 24,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
            ...Platform.select({
                ios: {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 30 },
                    shadowOpacity: 0.4,
                    shadowRadius: 60,
                },
                android: { elevation: 12 },
                web: {
                    boxShadow: '0 30px 60px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
                },
            }),
            position: 'relative',
            overflow: 'hidden',
        },
        rateCardGlow: {
            position: 'absolute',
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            opacity: 0.4,
            pointerEvents: 'none',
        },
        rateCardHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
            zIndex: 2,
        },
        rateCardTitle: {
            fontSize: 13,
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: 1,
        },
        // Change Badge - Pill style
        changeBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 100,
            gap: 4,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
        },
        changeText: {
            fontSize: 14,
            fontWeight: '600',
        },
        // Main Price - Large display
        rateValue: {
            fontSize: width >= 768 ? 64 : 48,
            fontWeight: '700',
            marginBottom: 8,
            letterSpacing: -1.5,
            lineHeight: width >= 768 ? 72 : 54,
            zIndex: 2,
        },
        rateSubtext: {
            fontSize: 13,
            lineHeight: 18,
            zIndex: 2,
        },
        // Selected Point Card
        selectedCard: {
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            borderWidth: 2,
        },
        selectedHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
        },
        selectedDate: {
            fontSize: 12,
            fontWeight: '600',
            textTransform: 'capitalize',
        },
        selectedValue: {
            fontSize: 32,
            fontWeight: '800',
        },
        // Chart Container
        chartContainer: {
            backgroundColor: colors.card,
            borderRadius: 24,
            paddingVertical: 20,
            paddingHorizontal: 12,
            marginBottom: 16,
            height: width >= 768 ? 350 : 280,
            overflow: 'visible',
        },
        // Stats Grid (Desktop only - visibility controlled in JSX)
        statsGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
            marginTop: 20,
            zIndex: 2,
        },
        statCard: {
            flex: 1,
            minWidth: '45%',
            backgroundColor: 'rgba(255,255,255,0.03)',
            padding: 12,
            paddingHorizontal: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
        },
        statTitle: {
            fontSize: 11,
            textTransform: 'uppercase',
            marginBottom: 4,
        },
        statValue: {
            fontSize: 16,
            fontWeight: '600',
        },
        // Gap Statistics Styles
        gapStat: {
            backgroundColor: 'rgba(255,255,255,0.03)',
            padding: 14,
            paddingLeft: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
        },
        gapLabel: {
            fontSize: 15,
            fontWeight: '600',
        },
        gapPercentage: {
            fontSize: 18,
            fontWeight: '700',
        },
        gapAbsolute: {
            fontSize: 12,
            marginTop: 4,
        },
        // Chart Legend
        legendContainer: {
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 16,
            marginTop: 12,
            paddingHorizontal: 12,
            flexWrap: 'wrap',
        },
        legendItem: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
        },
        legendDot: {
            width: 10,
            height: 10,
            borderRadius: 5,
        },
        legendText: {
            fontSize: 12,
            fontWeight: '500',
        },
    });

    const isWide = width >= 768;

    return (
        <View style={isWide ? { flexDirection: 'row', gap: 24, padding: 4 } : {}}>
            {/* Left Column: Controls & Stats */}
            <View style={isWide ? { flex: 0.45, minWidth: 320 } : {}}>
                {/* Currency Tabs */}
                <View style={styles.tabsContainer}>
                    <Pressable
                        style={[
                            styles.tab,
                            selectedCurrency === 'usd' && [styles.tabActive, { backgroundColor: `${colors.bcvGreen}15` }],
                            hoveredItem === 'usd' && selectedCurrency !== 'usd' && {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                            }
                        ]}
                        onPress={() => handleCurrencyChange('usd')}
                        onHoverIn={() => setHoveredItem('usd')}
                        onHoverOut={() => setHoveredItem(null)}
                    >
                        <Text style={{ opacity: 0.7 }}></Text>
                        <Text style={[
                            styles.tabText,
                            selectedCurrency === 'usd' && styles.tabTextActive,
                            { color: selectedCurrency === 'usd' ? colors.bcvGreen : colors.textSecondary }
                        ]}>
                            USD
                        </Text>
                    </Pressable>
                    <Pressable
                        style={[
                            styles.tab,
                            selectedCurrency === 'eur' && [styles.tabActive, { backgroundColor: `${colors.euroBlue}15` }],
                            hoveredItem === 'eur' && selectedCurrency !== 'eur' && {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                            }
                        ]}
                        onPress={() => handleCurrencyChange('eur')}
                        onHoverIn={() => setHoveredItem('eur')}
                        onHoverOut={() => setHoveredItem(null)}
                    >
                        <Text style={{ opacity: 0.7 }}></Text>
                        <Text style={[
                            styles.tabText,
                            selectedCurrency === 'eur' && styles.tabTextActive,
                            { color: selectedCurrency === 'eur' ? colors.euroBlue : colors.textSecondary }
                        ]}>
                            EUR
                        </Text>
                    </Pressable>
                    <Pressable
                        style={[
                            styles.tab,
                            selectedCurrency === 'usdt' && [styles.tabActive, { backgroundColor: `${colors.usdtOrange || '#F7931A'}15` }],
                            hoveredItem === 'usdt' && selectedCurrency !== 'usdt' && {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                            }
                        ]}
                        onPress={() => handleCurrencyChange('usdt')}
                        onHoverIn={() => setHoveredItem('usdt')}
                        onHoverOut={() => setHoveredItem(null)}
                    >
                        <Text style={{ opacity: 0.7 }}></Text>
                        <Text style={[
                            styles.tabText,
                            selectedCurrency === 'usdt' && styles.tabTextActive,
                            { color: selectedCurrency === 'usdt' ? (colors.usdtOrange || '#F7931A') : colors.textSecondary }
                        ]}>
                            USDT
                        </Text>
                    </Pressable>
                    <Pressable
                        style={[
                            styles.tab,
                            selectedCurrency === 'gap' && [styles.tabActive, { backgroundColor: `${colors.accent || '#00E378'}15` }],
                            hoveredItem === 'gap' && selectedCurrency !== 'gap' && {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                            }
                        ]}
                        onPress={() => handleCurrencyChange('gap')}
                        onHoverIn={() => setHoveredItem('gap')}
                        onHoverOut={() => setHoveredItem(null)}
                    >
                        <TrendingUp size={16} color={selectedCurrency === 'gap' ? (colors.accent || '#00E378') : colors.textSecondary} style={{ opacity: 0.7 }} />
                        <Text style={[
                            styles.tabText,
                            selectedCurrency === 'gap' && styles.tabTextActive,
                            { color: selectedCurrency === 'gap' ? (colors.accent || '#00E378') : colors.textSecondary }
                        ]}>
                            Brecha
                        </Text>
                    </Pressable>
                </View>

                {/* Period Filters */}
                <View style={styles.periodContainer}>
                    {[
                        { key: 'day', label: '1D' },
                        { key: 'week', label: '7D' },
                        { key: 'month', label: '1M' },
                        { key: 'year', label: '1Y' },
                        { key: 'all', label: 'Todo' }
                    ]
                        .filter(period => {
                            // USDT only supports day, week, and month
                            if (selectedCurrency === 'usdt' && (period.key === 'year' || period.key === 'all')) return false;
                            // Gap (Brecha) only supports day, week, and month
                            if (selectedCurrency === 'gap' && (period.key === 'year' || period.key === 'all')) return false;
                            // Day view only for USDT and Gap
                            if (period.key === 'day' && selectedCurrency !== 'usdt' && selectedCurrency !== 'gap') return false;
                            return true;
                        })
                        .map(period => (
                            <Pressable
                                key={period.key}
                                style={[
                                    styles.periodButton,
                                    timePeriod === period.key && {
                                        backgroundColor: chartConfig.isGapView ? (colors.accent || '#00E378') : chartConfig.color,
                                        ...Platform.select({
                                            web: { boxShadow: `0 0 15px ${chartConfig.isGapView ? (colors.accent || '#00E378') : chartConfig.color}40` },
                                            ios: {
                                                shadowColor: chartConfig.isGapView ? (colors.accent || '#00E378') : chartConfig.color,
                                                shadowOffset: { width: 0, height: 0 },
                                                shadowOpacity: 0.4,
                                                shadowRadius: 15,
                                            },
                                        }),
                                    },
                                    hoveredItem === period.key && timePeriod !== period.key && {
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                                    }
                                ]}
                                onPress={() => handlePeriodChange(period.key)}
                                onHoverIn={() => setHoveredItem(period.key)}
                                onHoverOut={() => setHoveredItem(null)}
                            >
                                <Text style={[
                                    styles.periodText,
                                    timePeriod === period.key && styles.periodTextActive,
                                    {
                                        color: timePeriod === period.key
                                            ? '#121214'  // Dark text on colored bg
                                            : colors.textSecondary
                                    }
                                ]}>
                                    {period.label}
                                </Text>
                            </Pressable>
                        ))}
                </View>

                {/* Day Navigation - USDT 1D only */}
                {selectedCurrency === 'usdt' && timePeriod === 'day' && (
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 16,
                        marginVertical: 12,
                        paddingHorizontal: 16
                    }}>
                        <TouchableOpacity
                            onPress={() => {
                                Haptics.selectionAsync();
                                setSelectedDayOffset(prev => prev + 1);
                            }}
                            style={{
                                padding: 10,
                                borderRadius: 8,
                                backgroundColor: `${colors.usdtOrange || '#F7931A'}20`
                            }}
                        >
                            <ChevronLeft size={22} color={colors.usdtOrange || '#F7931A'} />
                        </TouchableOpacity>
                        <Text style={{
                            color: colors.usdtOrange || '#F7931A',
                            fontWeight: '600',
                            fontSize: 16,
                            minWidth: 90,
                            textAlign: 'center'
                        }}>
                            {getDateLabel(selectedDayOffset)}
                        </Text>
                        <TouchableOpacity
                            onPress={() => {
                                Haptics.selectionAsync();
                                if (selectedDayOffset > 0) {
                                    setSelectedDayOffset(prev => prev - 1);
                                }
                            }}
                            disabled={selectedDayOffset === 0}
                            style={{
                                padding: 10,
                                borderRadius: 8,
                                backgroundColor: selectedDayOffset === 0 ? 'transparent' : `${colors.usdtOrange || '#F7931A'}20`,
                                opacity: selectedDayOffset === 0 ? 0.3 : 1
                            }}
                        >
                            <ChevronRight size={22} color={colors.usdtOrange || '#F7931A'} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Current Rate Card & Stats OR Gap Statistics Card */}
                {chartConfig && chartConfig.data && chartConfig.data.length > 0 && showHeaderCard && (
                    chartConfig.isGapView && chartConfig.gaps ? (
                        // Gap Statistics Card
                        <View style={styles.rateCard}>
                            {/* Dynamic Glow Effect Background */}
                            {Platform.OS === 'web' && (
                                <View style={[
                                    styles.rateCardGlow,
                                    {
                                        background: `radial-gradient(circle at 50% 80%, ${colors.accent || '#00E378'}25, transparent 40%)`,
                                    }
                                ]} />
                            )}

                            <View style={styles.rateCardHeader}>
                                <Text style={[styles.rateCardTitle, { color: colors.textSecondary }]}>
                                    {chartConfig.title}
                                </Text>
                            </View>

                            <Text style={[styles.rateSubtext, { color: colors.textSecondary, marginBottom: 16 }]}>
                                Diferencias porcentuales entre las tasas de cambio
                            </Text>

                            {/* Gap Stats */}
                            <View style={{ gap: 12 }}>
                                {/* BCV - USDT Gap */}
                                <View style={[styles.gapStat, { borderLeftColor: colors.usdtOrange || '#F7931A', borderLeftWidth: 3 }]}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={[styles.gapLabel, { color: colors.textPrimary }]}>BCV ↔ USDT</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            {chartConfig.gaps.bcvUsdt.isPositive ? (
                                                <TrendingUp size={16} color={colors.bcvGreen} />
                                            ) : (
                                                <TrendingDown size={16} color="#FF3B30" />
                                            )}
                                            <Text style={[styles.gapPercentage, {
                                                color: chartConfig.gaps.bcvUsdt.isPositive ? colors.bcvGreen : '#FF3B30'
                                            }]}>
                                                {chartConfig.gaps.bcvUsdt.isPositive ? '+' : ''}{chartConfig.gaps.bcvUsdt.percentage.toFixed(2)}%
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.gapAbsolute, { color: colors.textSecondary }]}>
                                        Diferencia: Bs. {formatCurrency(Math.abs(chartConfig.gaps.bcvUsdt.absolute))}
                                    </Text>
                                </View>

                                {/* EUR - USDT Gap */}
                                <View style={[styles.gapStat, { borderLeftColor: colors.euroBlue, borderLeftWidth: 3 }]}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={[styles.gapLabel, { color: colors.textPrimary }]}>EUR ↔ USDT</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            {chartConfig.gaps.eurUsdt.isPositive ? (
                                                <TrendingUp size={16} color={colors.bcvGreen} />
                                            ) : (
                                                <TrendingDown size={16} color="#FF3B30" />
                                            )}
                                            <Text style={[styles.gapPercentage, {
                                                color: chartConfig.gaps.eurUsdt.isPositive ? colors.bcvGreen : '#FF3B30'
                                            }]}>
                                                {chartConfig.gaps.eurUsdt.isPositive ? '+' : ''}{chartConfig.gaps.eurUsdt.percentage.toFixed(2)}%
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.gapAbsolute, { color: colors.textSecondary }]}>
                                        Diferencia: Bs. {formatCurrency(Math.abs(chartConfig.gaps.eurUsdt.absolute))}
                                    </Text>
                                </View>

                                {/* BCV - EUR Gap */}
                                <View style={[styles.gapStat, { borderLeftColor: colors.bcvGreen, borderLeftWidth: 3 }]}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={[styles.gapLabel, { color: colors.textPrimary }]}>BCV ↔ EUR</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            {chartConfig.gaps.bcvEur.isPositive ? (
                                                <TrendingUp size={16} color={colors.bcvGreen} />
                                            ) : (
                                                <TrendingDown size={16} color="#FF3B30" />
                                            )}
                                            <Text style={[styles.gapPercentage, {
                                                color: chartConfig.gaps.bcvEur.isPositive ? colors.bcvGreen : '#FF3B30'
                                            }]}>
                                                {chartConfig.gaps.bcvEur.isPositive ? '+' : ''}{chartConfig.gaps.bcvEur.percentage.toFixed(2)}%
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.gapAbsolute, { color: colors.textSecondary }]}>
                                        Diferencia: Bs. {formatCurrency(Math.abs(chartConfig.gaps.bcvEur.absolute))}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ) : (
                        // Regular Single Currency Card
                        <View style={styles.rateCard}>
                            {/* Dynamic Glow Effect Background */}
                            {Platform.OS === 'web' && (
                                <View style={[
                                    styles.rateCardGlow,
                                    {
                                        background: `radial-gradient(circle at 50% 80%, ${chartConfig.color}25, transparent 40%)`,
                                    }
                                ]} />
                            )}

                            <View style={styles.rateCardHeader}>
                                <Text style={[styles.rateCardTitle, { color: colors.textSecondary }]}>
                                    {chartConfig.title}
                                </Text>
                                <View style={[styles.changeBadge, { backgroundColor: isPositive ? `${colors.bcvGreen}10` : 'rgba(255,59,48,0.1)' }]}>
                                    <TrendIcon size={14} color={isPositive ? colors.bcvGreen : '#FF3B30'} />
                                    <Text style={[styles.changeText, { color: isPositive ? colors.bcvGreen : '#FF3B30' }]}>
                                        {isPositive ? '+' : ''}{Number(chartConfig.change).toFixed(2)}%
                                    </Text>
                                </View>
                            </View>

                            <Text style={[styles.rateValue, { color: chartConfig.color }]}>
                                Bs. {formatCurrency(chartConfig.currentRate)}
                            </Text>

                            <Text style={[styles.rateSubtext, { color: colors.textSecondary }]}>
                                {selectedCurrency === 'usdt'
                                    ? 'Promedio de las tasas de cambio'
                                    : 'Tasa oficial del Banco Central de Venezuela'}
                            </Text>

                            {/* Stats Grid */}
                            {width >= 768 && chartConfig.data.length > 0 && (
                                <View style={styles.statsGrid}>
                                    <View style={styles.statCard}>
                                        <Text style={[styles.statTitle, { color: colors.textSecondary }]}>Mínimo</Text>
                                        <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                                            Bs. {formatCurrency(chartConfig.minValue)}
                                        </Text>
                                    </View>
                                    <View style={styles.statCard}>
                                        <Text style={[styles.statTitle, { color: colors.textSecondary }]}>Máximo</Text>
                                        <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                                            Bs. {formatCurrency(chartConfig.maxValue)}
                                        </Text>
                                    </View>
                                    <View style={styles.statCard}>
                                        <Text style={[styles.statTitle, { color: colors.textSecondary }]}>Apertura</Text>
                                        <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                                            Bs. {formatCurrency(chartConfig.openValue)}
                                        </Text>
                                    </View>
                                    <View style={styles.statCard}>
                                        <Text style={[styles.statTitle, { color: colors.textSecondary }]}>Cierre</Text>
                                        <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                                            Bs. {formatCurrency(chartConfig.closeValue)}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    )
                )}

                {/* Selected Point Card */}
                {selectedPoint && (
                    <View style={[styles.selectedCard, { borderColor: chartConfig.color }]}>
                        <View style={styles.selectedHeader}>
                            <Calendar size={14} color={colors.textSecondary} />
                            <Text style={[styles.selectedDate, { color: colors.textSecondary }]}>
                                {new Date(selectedPoint.fullDate).toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long', year: '2-digit' })}
                            </Text>
                        </View>
                        <Text style={[styles.selectedValue, { color: chartConfig.color }]}>
                            Bs. {formatCurrency(selectedPoint.originalValue)}
                        </Text>
                    </View>
                )}
            </View>

            {/* Right Column: Chart */}
            <View style={isWide ? { flex: 0.55, justifyContent: 'center' } : {}}>
                {/* Chart Content */}
                {chartConfig && chartConfig.data && chartConfig.data.length > 0 ? (
                    <View
                        style={[styles.chartContainer, isWide && { height: 'auto', minHeight: 480, flex: 1, marginBottom: 0 }]}
                        onLayout={(event) => {
                            const { width } = event.nativeEvent.layout;
                            setContainerWidth(width);
                        }}
                    >
                        {width && (width > 0 || containerWidth > 0) ? (
                            (() => {
                                // Dynamic Width Logic:
                                // 1. Use measured containerWidth if available (minus paddingHorizontal 12*2 = 24)
                                // 2. Fallback to heuristic if measuring (initial render), preventing flash
                                const effectiveWidth = containerWidth > 0
                                    ? containerWidth - 24
                                    : (isWide ? (width * 0.49) : Math.max(width - 46, 50));

                                const chartHeight = isWide ? 450 : (width >= 768 ? 280 : 220);
                                const totalSpacing = effectiveWidth - 20; // effectiveWidth - (initialSpacing 10 + endSpacing 10)
                                const spacing = Math.max(totalSpacing / Math.max(chartConfig.data.length - 1, 1), 2);

                                // Dynamic Font Size for Labels
                                const labelFontSize = effectiveWidth < 350 ? 9 : 10;
                                const showLabels = effectiveWidth > 200;

                                return (
                                    <>
                                        <LineChart
                                            data={chartConfig.data}
                                            width={effectiveWidth}
                                            height={chartHeight}
                                            spacing={spacing}
                                            initialSpacing={10}
                                            endSpacing={10}
                                            hideDataPoints={!chartConfig.isGapView}
                                            yAxisLabelWidth={45}
                                            xAxisLabelTextStyle={{
                                                color: colors.textSecondary,
                                                fontSize: labelFontSize,
                                                fontWeight: '500',
                                                display: showLabels ? 'flex' : 'none'
                                            }}
                                            color={chartConfig.isGapView ? chartConfig.colors.usd : chartConfig.color}
                                            thickness={chartConfig.isGapView ? 2 : 2.5}
                                            dataPointsColor={chartConfig.isGapView ? chartConfig.colors.usd : chartConfig.color}
                                            dataPointsRadius={4}
                                            // Multi-line support for gap view
                                            {...(chartConfig.isGapView && chartConfig.dataEur && chartConfig.dataUsdt && {
                                                dataSet: [
                                                    {
                                                        data: chartConfig.dataUsd,
                                                        color: chartConfig.colors.usd,
                                                        dataPointsColor: chartConfig.colors.usd,
                                                        thickness: 2,
                                                        hideDataPoints: false,
                                                        dataPointsRadius: 4,
                                                        areaChart: true,
                                                        startFillColor: chartConfig.colors.usd,
                                                        startOpacity: 0.15,
                                                        endFillColor: colors.background,
                                                        endOpacity: 0,
                                                    },
                                                    {
                                                        data: chartConfig.dataEur,
                                                        color: chartConfig.colors.eur,
                                                        dataPointsColor: chartConfig.colors.eur,
                                                        thickness: 2,
                                                        hideDataPoints: false,
                                                        dataPointsRadius: 4,
                                                        areaChart: true,
                                                        startFillColor: chartConfig.colors.eur,
                                                        startOpacity: 0.15,
                                                        endFillColor: colors.background,
                                                        endOpacity: 0,
                                                    },
                                                    {
                                                        data: chartConfig.dataUsdt,
                                                        color: chartConfig.colors.usdt,
                                                        dataPointsColor: chartConfig.colors.usdt,
                                                        thickness: 2,
                                                        hideDataPoints: false,
                                                        dataPointsRadius: 4,
                                                        areaChart: true,
                                                        startFillColor: chartConfig.colors.usdt,
                                                        startOpacity: 0.15,
                                                        endFillColor: colors.background,
                                                        endOpacity: 0,
                                                    },
                                                ],
                                            })}
                                            noOfSections={5}
                                            yAxisOffset={chartConfig.yAxisOffset}
                                            yAxisColor="transparent"
                                            xAxisColor="transparent"
                                            yAxisTextStyle={{
                                                color: colors.textSecondary,
                                                fontSize: 11,
                                                fontWeight: '600',
                                                fontVariant: ['tabular-nums'],
                                            }}

                                            rulesType="dashed"
                                            dashWidth={4}
                                            dashGap={6}
                                            rulesColor={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
                                            showVerticalLines={false}
                                            curved
                                            curvature={0.2}
                                            {...(!chartConfig.isGapView && {
                                                areaChart: true,
                                                startFillColor: chartConfig.color,
                                                startOpacity: 0.25,
                                                endFillColor: colors.background,
                                                endOpacity: 0,
                                            })}
                                            pointerConfig={{
                                                pointerStripUptoDataPoint: true,
                                                pointerStripColor: `${chartConfig.isGapView ? (colors.accent || '#00E378') : chartConfig.color}50`,
                                                pointerStripWidth: 1,
                                                strokeDashArray: [4, 4],
                                                pointerColor: chartConfig.isGapView ? (colors.accent || '#00E378') : chartConfig.color,
                                                radius: 5,
                                                pointerLabelWidth: chartConfig.isGapView ? 180 : 140,
                                                pointerLabelHeight: chartConfig.isGapView ? 120 : 60,
                                                activatePointersOnLongPress: false,
                                                autoAdjustPointerLabelPosition: true,
                                                pointerLabelComponent: items => {
                                                    const item = items[0];
                                                    return (
                                                        <View style={{
                                                            backgroundColor: isDark ? 'rgba(28,28,30,0.95)' : 'rgba(255,255,255,0.95)',
                                                            paddingHorizontal: 14,
                                                            paddingVertical: 12,
                                                            borderRadius: 12,
                                                            borderWidth: 1,
                                                            borderColor: `${chartConfig.isGapView ? (colors.accent || '#00E378') : chartConfig.color}40`,
                                                            ...Platform.select({
                                                                ios: {
                                                                    shadowColor: chartConfig.isGapView ? (colors.accent || '#00E378') : chartConfig.color,
                                                                    shadowOffset: { width: 0, height: 4 },
                                                                    shadowOpacity: 0.25,
                                                                    shadowRadius: 10,
                                                                },
                                                                android: { elevation: 8 },
                                                                web: {
                                                                    boxShadow: `0 4px 20px ${chartConfig.isGapView ? (colors.accent || '#00E378') : chartConfig.color}30`,
                                                                    backdropFilter: 'blur(8px)',
                                                                    WebkitBackdropFilter: 'blur(8px)',
                                                                },
                                                            }),
                                                        }}>
                                                            {chartConfig.isGapView ? (
                                                                // Multi-line tooltip
                                                                <>
                                                                    {/* Date/Time */}
                                                                    <Text style={{
                                                                        color: colors.textSecondary,
                                                                        fontSize: 11,
                                                                        textAlign: 'center',
                                                                        marginBottom: 8,
                                                                    }}>
                                                                        {item.fullDate || item.label || ''}
                                                                    </Text>

                                                                    {/* USD */}
                                                                    {chartConfig.dataUsd[items[0].index] && (
                                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: chartConfig.colors.usd }} />
                                                                            <Text style={{ color: chartConfig.colors.usd, fontWeight: '600', fontSize: 14, flex: 1 }}>
                                                                                USD: Bs. {formatCurrency(chartConfig.dataUsd[items[0].index].value)}
                                                                            </Text>
                                                                        </View>
                                                                    )}

                                                                    {/* EUR */}
                                                                    {chartConfig.dataEur[items[0].index] && (
                                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: chartConfig.colors.eur }} />
                                                                            <Text style={{ color: chartConfig.colors.eur, fontWeight: '600', fontSize: 14, flex: 1 }}>
                                                                                EUR: Bs. {formatCurrency(chartConfig.dataEur[items[0].index].value)}
                                                                            </Text>
                                                                        </View>
                                                                    )}

                                                                    {/* USDT */}
                                                                    {chartConfig.dataUsdt[items[0].index] && (
                                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: chartConfig.colors.usdt }} />
                                                                            <Text style={{ color: chartConfig.colors.usdt, fontWeight: '600', fontSize: 14, flex: 1 }}>
                                                                                USDT: Bs. {formatCurrency(chartConfig.dataUsdt[items[0].index].value)}
                                                                            </Text>
                                                                        </View>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                // Single line tooltip
                                                                <>
                                                                    {/* Price Value */}
                                                                    <Text style={{
                                                                        color: chartConfig.color,
                                                                        fontWeight: '700',
                                                                        fontSize: 18,
                                                                        textAlign: 'center',
                                                                    }}>
                                                                        Bs. {formatCurrency(item.value)}
                                                                    </Text>

                                                                    {/* Date/Time */}
                                                                    <Text style={{
                                                                        color: colors.textSecondary,
                                                                        fontSize: 11,
                                                                        textAlign: 'center',
                                                                        marginTop: 4,
                                                                    }}>
                                                                        {item.fullDate || item.label || ''}
                                                                    </Text>
                                                                </>
                                                            )}
                                                        </View>
                                                    );
                                                },
                                                pointerVanishDelay: 300,
                                            }}
                                        />

                                        {/* Legend for Gap View */}
                                        {chartConfig.isGapView && (
                                            <View style={styles.legendContainer}>
                                                <View style={styles.legendItem}>
                                                    <View style={[styles.legendDot, { backgroundColor: chartConfig.colors.usd }]} />
                                                    <Text style={[styles.legendText, { color: colors.textPrimary }]}>Dólar BCV</Text>
                                                </View>
                                                <View style={styles.legendItem}>
                                                    <View style={[styles.legendDot, { backgroundColor: chartConfig.colors.eur }]} />
                                                    <Text style={[styles.legendText, { color: colors.textPrimary }]}>Euro BCV</Text>
                                                </View>
                                                <View style={styles.legendItem}>
                                                    <View style={[styles.legendDot, { backgroundColor: chartConfig.colors.usdt }]} />
                                                    <Text style={[styles.legendText, { color: colors.textPrimary }]}>USDT</Text>
                                                </View>
                                            </View>
                                        )}
                                    </>
                                );
                            })()
                        ) : (
                            <View style={{ height: 220, justifyContent: 'center', alignItems: 'center' }}>
                                <Text style={{ color: colors.textSecondary }}>
                                    Cargando gráfico...
                                </Text>
                            </View>
                        )}

                        {/* Loading overlay */}
                        {((chartLoading || chartUsdtLoading || usdtHourlyLoading) && chartConfig.data.length === 0) && (
                            <View style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: `${colors.background}80`,
                                justifyContent: 'center',
                                alignItems: 'center',
                                borderRadius: 24,
                            }}>
                                <ActivityIndicator size="large" color={chartConfig.color} />
                            </View>
                        )}
                    </View>
                ) : (
                    <View style={[styles.chartContainer, { height: 300, justifyContent: 'center', alignItems: 'center' }, isWide && { flex: 1, height: 'auto', minHeight: 400 }]}>
                        {(chartLoading || chartUsdtLoading || (selectedCurrency === 'usdt' && timePeriod === 'day' && usdtHourlyLoading)) ? (
                            <ActivityIndicator size="large" color={chartConfig.color} />
                        ) : (
                            <Text style={{ color: colors.textSecondary, fontSize: 15 }}>
                                {chartConfig.isHourlyData ? 'Sin datos para este día' : 'Sin datos históricos disponibles'}
                            </Text>
                        )}
                    </View>
                )}
            </View>
        </View>
    );
};

export default CurrencyChart;
