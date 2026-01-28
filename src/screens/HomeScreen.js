import React, { useMemo, useRef, useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, RefreshControl, FlatList, Animated, Platform, Image, useWindowDimensions, ScrollView, ActivityIndicator, Pressable, LayoutAnimation, UIManager } from 'react-native';
import { Banknote, RefreshCcw, TrendingUp, TrendingDown, DollarSign, History, ChevronRight, ChevronLeft, Info, WifiOff, Calendar as CalendarIcon, Settings, Coins, ArrowRight, ChevronDown, Share2, X, Euro, FileText } from 'lucide-react-native';
import { LineChart } from 'react-native-gifted-charts';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../context/ThemeContext';
import RateCard from '../components/RateCard';
import SkeletonCard from '../components/SkeletonCard';
import { useRates } from '../context/RateContext';
import { fetchHistoricalByDate } from '../services/rateService';
import { formatCurrency } from '../utils/formatting';
import AdBanner from '../components/AdBanner';
import NativeAdComponent from '../components/NativeAd';
import CurrencyChart from '../components/CurrencyChart';
import PaymentMethodsModal from '../components/PaymentMethodsModal';
import HistoryModal from '../components/HistoryModal';
// TusDatosIcon is small, can keep static or lazy if needed, but modals are the big ones.
import TusDatosIcon from '../components/TusDatosIcon';

const WebBannerAd = () => {
    // Only render on Web
    return null; // Ads disabled by user request
};

const MainAd = () => {
    // Only render on Web
    return null; // Ads disabled by user request
};

const HomeScreen = ({ navigation }) => {
    const { width } = useWindowDimensions();
    const { rates, loading, refreshRates, order, isOffline, getTimeSinceUpdate, usdtHistory, fetchUsdtHistoricalData, usdtHourlyData, fetchUsdtHourlyDataForDay, usdtHourlyLoading, fetchHistoricalData } = useRates();
    const { colors, isDark } = useTheme();
    const scrollY = useRef(new Animated.Value(0)).current;
    const [expandedCard, setExpandedCard] = React.useState(null);
    const [selectedDate, setSelectedDate] = React.useState(new Date());
    const [showDatePicker, setShowDatePicker] = React.useState(false);
    const [historicalRates, setHistoricalRates] = React.useState(null);
    const [loadingHistorical, setLoadingHistorical] = React.useState(false);
    const [embeddedCurrency, setEmbeddedCurrency] = React.useState('usd');
    const [globalUseTomorrow, setGlobalUseTomorrow] = useState(false);
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
    const [historyModalVisible, setHistoryModalVisible] = useState(false);
    const [showPaymentTooltip, setShowPaymentTooltip] = useState(false);
    const dateInputRef = useRef(null);
    const tooltipScale = useRef(new Animated.Value(0)).current;
    const buttonHighlight = useRef(new Animated.Value(0)).current;

    // Show tooltip on mount for mobile
    useEffect(() => {
        if (!isWideScreen) {
            // Delay slightly
            const timer = setTimeout(() => {
                setShowPaymentTooltip(true);
                // Animate In
                Animated.spring(tooltipScale, {
                    toValue: 1,
                    useNativeDriver: true,
                    tension: 50,
                    friction: 7
                }).start();

                // Highlight button loop
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(buttonHighlight, { toValue: 1, duration: 800, useNativeDriver: false }),
                        Animated.timing(buttonHighlight, { toValue: 0, duration: 800, useNativeDriver: false })
                    ])
                ).start();

                // Hide after 5 seconds
                setTimeout(() => {
                    Animated.timing(tooltipScale, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true
                    }).start(() => setShowPaymentTooltip(false));
                }, 5000);
            }, 1000); // 1s delay
            return () => clearTimeout(timer);
        }
    }, []);

    // Detect if screen is wide (desktop/tablet)
    const isWideScreen = width >= 768;
    // Detect extra wide screens for side-by-side history + chart layout
    const isExtraWideScreen = width >= 1300;

    // Auto-reset globalUseTomorrow when next day rates are not available
    useEffect(() => {
        const hasNextRates = rates.nextRates?.usd || rates.nextRates?.eur;
        if (!hasNextRates && globalUseTomorrow) {
            setGlobalUseTomorrow(false);
        }
    }, [rates.nextRates, globalUseTomorrow]);

    // Enable LayoutAnimation for Android
    useEffect(() => {
        if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
            UIManager.setLayoutAnimationEnabledExperimental(true);
        }
    }, []);

    // Force inject apple-touch-icon for Safari if missing (Safety net)
    useEffect(() => {
        if (Platform.OS === 'web') {
            const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
            // Ensure we have an apple-touch-icon
            let appleIcon = document.querySelector("link[rel='apple-touch-icon']");
            if (!appleIcon) {
                appleIcon = document.createElement('link');
                appleIcon.rel = 'apple-touch-icon';
                document.head.appendChild(appleIcon);
            }
            // Set correct path (relative to /app/ if deployed there)
            appleIcon.href = './icon.png?v=3';
        }
    }, []);


    const formatDate = (dateStr) => {
        const [y, m, d] = dateStr.split('-');
        const year = y.substr(-2); // Get last 2 digits of year
        const formatted = `${d}/${m}/${year}`;
        console.log(`[HomeScreen] Formatting date: ${dateStr} -> ${formatted}`);
        return formatted;
    };

    const handleCardPress = (currencyId) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setExpandedCard(expandedCard === currencyId ? null : currencyId);
    };

    const handleClickOutside = () => {
        if (expandedCard) {
            setExpandedCard(null);
        }
    };

    const handleDateChange = (event, date) => {
        if (Platform.OS !== 'web') {
            setShowDatePicker(Platform.OS === 'ios');
        }

        if (date) {
            setSelectedDate(date);
            fetchHistoricalRatesByDate(date);
        }
    };



    const fetchHistoricalRatesByDate = async (date) => {
        // Check if selected date is today
        const today = new Date();
        const isToday = date.toDateString() === today.toDateString();

        if (isToday) {
            setHistoricalRates(null);
            return;
        }

        setLoadingHistorical(true);

        try {
            // Format date as YYYY-MM-DD
            // Logic for Weekend: If Sat or Sun, fetch data from previous Friday
            let queryDate = new Date(date);
            const dayOfWeek = queryDate.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

            if (dayOfWeek === 0) { // Sunday
                queryDate.setDate(queryDate.getDate() - 2); // Go to Friday
            } else if (dayOfWeek === 6) { // Saturday
                queryDate.setDate(queryDate.getDate() - 1); // Go to Friday
            }

            const dateStr = queryDate.toISOString().split('T')[0];

            // Fetch from Supabase using rateService
            const rateData = await fetchHistoricalByDate(dateStr);

            if (rateData) {
                const historicalState = {
                    bcv: rateData.usd,
                    euro: rateData.eur,
                    date: rateData.date,
                    nextRates: null
                };
                setHistoricalRates(historicalState);
                console.log(`[HomeScreen] Loaded historical rate for ${dateStr}: USD=${rateData.usd}, EUR=${rateData.eur}`);
            } else {
                console.log(`[HomeScreen] No historical data found for ${dateStr}`);
                setHistoricalRates(null);
            }
        } catch (error) {
            console.error('[HomeScreen] Error fetching historical rates:', error);
            setHistoricalRates(null);
        } finally {
            setLoadingHistorical(false);
        }
    };

    const resetToToday = () => {
        setSelectedDate(new Date());
        setHistoricalRates(null);
    };



    // Fetch USDT history AND BCV history on mount for the table (fetch month to ensure we have enough rows)
    useEffect(() => {
        fetchUsdtHistoricalData('month');
        fetchHistoricalData('month');
    }, []);

    // Check if viewing a date other than today
    const isViewingHistory = selectedDate.toDateString() !== new Date().toDateString();

    const cardData = useMemo(() => {
        // Calculate USDT change (Daily change: Today vs Yesterday)
        let usdtChange = 0;
        if (usdtHistory && usdtHistory.length > 1) {
            const todayPrice = parseFloat(usdtHistory[0].usdt);
            const yesterdayPrice = parseFloat(usdtHistory[1].usdt);
            if (yesterdayPrice > 0) {
                usdtChange = ((todayPrice - yesterdayPrice) / yesterdayPrice) * 100;
            }
        } else if (usdtHourlyData && usdtHourlyData.length > 1) {
            // Fallback to hourly data if history is not ready (intraday change)
            const first = parseFloat(usdtHourlyData[0].usdt);
            const last = parseFloat(usdtHourlyData[usdtHourlyData.length - 1].usdt);
            if (first > 0) {
                usdtChange = ((last - first) / first) * 100;
            }
        }

        const dataMap = {
            usd: {
                id: 'usd',
                title: 'Tasa BCV (USD)',
                rate: isViewingHistory && historicalRates ? historicalRates.bcv : rates.bcv,
                color: colors.bcvGreen,
                icon: <DollarSign color={colors.bcvGreen} size={24} />,
                nextRate: isViewingHistory ? (historicalRates?.nextRates?.usd || null) : rates.nextRates?.usd,
                nextDate: isViewingHistory ? (historicalRates?.nextRates?.date || null) : rates.nextRates?.date,
                nextRawDate: isViewingHistory ? (historicalRates?.nextRates?.rawDate || null) : rates.nextRates?.rawDate,
                change: isViewingHistory ? 0 : rates.usdChange,
                isHistorical: isViewingHistory,
                lastUpdated: isViewingHistory ? selectedDate.toLocaleDateString('es-VE', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: '2-digit'
                }) : rates.lastUpdate
            },
            eur: {
                id: 'eur',
                title: 'Tasa BCV (EUR)',
                rate: isViewingHistory && historicalRates ? historicalRates.euro : rates.euro,
                color: colors.euroBlue,
                icon: <Euro color={colors.euroBlue} size={24} />,
                nextRate: isViewingHistory ? (historicalRates?.nextRates?.eur || null) : rates.nextRates?.eur,
                nextDate: isViewingHistory ? (historicalRates?.nextRates?.date || null) : rates.nextRates?.date,
                nextRawDate: isViewingHistory ? (historicalRates?.nextRates?.rawDate || null) : rates.nextRates?.rawDate,
                change: isViewingHistory ? 0 : rates.eurChange,
                isHistorical: isViewingHistory,
                lastUpdated: isViewingHistory ? selectedDate.toLocaleDateString('es-VE', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: '2-digit'
                }) : rates.lastUpdate
            },
            parallel: {
                id: 'parallel',
                title: 'Promedio USDT',
                rate: isViewingHistory ? 0 : rates.parallel,
                color: colors.parallelOrange,
                icon: <TrendingUp color={colors.parallelOrange} size={24} />,
                lastUpdated: isViewingHistory ? 'Promedio no Disponible' : rates.parallelUpdate,
                change: isViewingHistory ? 0 : usdtChange
            }
        };

        return order.map(id => dataMap[id]);
    }, [rates, order, colors, isViewingHistory, historicalRates, selectedDate, usdtHistory, usdtHourlyData]);

    // Check if we have real data loaded
    const hasData = rates.bcv > 0;

    const renderItem = ({ item, index }) => <RateCard {...item} index={index} onPress={() => handleCardPress(item.id)} />;
    const renderSkeleton = ({ index }) => <SkeletonCard index={index} />;

    // Subtle animation for header scaling as you scroll
    const headerScale = scrollY.interpolate({
        inputRange: [-100, 0, 100],
        outputRange: [1.1, 1, 0.95],
        extrapolate: 'clamp',
    });

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
                            Última actualización {timeSince}
                        </Text>
                    )}
                </View>
                <TouchableOpacity
                    onPress={() => refreshRates(true)}
                    style={[styles.retryButton, { backgroundColor: `${colors.parallelOrange}20` }]}
                >
                    <RefreshCcw size={14} color={colors.parallelOrange} />
                </TouchableOpacity>
            </View>
        );
    };

    const isSmallScreen = width < 380;

    const isVerySmallScreen = width < 375;

    const LogoElement = (
        <Image source={require('../../assets/app-logo.svg')} style={styles.headerLogo} resizeMode="contain" />
    );

    const TitleElement = (
        <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.8}
                    style={[styles.headerTitle, { color: colors.textPrimary, fontSize: width < 410 ? 29 : 36 }]}
                >
                    {isViewingHistory ? 'Tasas Pasadas' : 'Tasas del Día'}
                </Text>
                {/* Show "Ver Tasa de Hoy" next to title only on mobile */}
                {
                    isViewingHistory && !isWideScreen && (
                        <Pressable
                            onPress={resetToToday}
                            style={({ pressed, hovered }) => ({
                                backgroundColor: hovered
                                    ? `${colors.bcvGreen}35`
                                    : `${colors.bcvGreen}20`,
                                paddingHorizontal: 12,
                                paddingVertical: 10,
                                borderRadius: 10,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                                borderWidth: 1,
                                borderColor: hovered
                                    ? `${colors.bcvGreen}60`
                                    : `${colors.bcvGreen}40`,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: hovered ? 6 : 3 },
                                shadowOpacity: hovered ? 0.35 : 0.25,
                                shadowRadius: hovered ? 8 : 5,
                                elevation: hovered ? 6 : 3,
                                transform: [{ translateY: pressed ? 1 : 0 }],
                                transition: 'all 0.2s ease',
                            })}
                        >
                            <CalendarIcon size={16} color={colors.bcvGreen} />
                            <Text style={{
                                color: colors.bcvGreen,
                                fontSize: 14,
                                fontWeight: '700'
                            }}>
                                Ver Tasa de Hoy
                            </Text>
                        </Pressable>
                    )
                }
            </View >
            {/* Date button and "Ver Tasa de Hoy" button in same row on wide screens */}
            < View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                <Pressable
                    onPress={() => {
                        Haptics.selectionAsync();
                        setShowDatePicker(true);
                    }}
                    style={({ pressed, hovered }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        backgroundColor: hovered
                            ? (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)')
                            : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'),
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: hovered
                            ? (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)')
                            : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'),
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: hovered ? 5 : 2 },
                        shadowOpacity: hovered ? 0.25 : 0.15,
                        shadowRadius: hovered ? 6 : 3,
                        elevation: hovered ? 5 : 2,
                        transform: [{ translateY: pressed ? 1 : 0 }],
                        transition: 'all 0.2s ease',
                    })}
                >
                    <CalendarIcon size={17} color={colors.textSecondary} />
                    <Text style={{
                        color: colors.textSecondary,
                        fontSize: 14,
                        fontWeight: '600'
                    }}>
                        {/* Compact date format: DD/MM/YY */}
                        {`${String(selectedDate.getDate()).padStart(2, '0')}/${String(selectedDate.getMonth() + 1).padStart(2, '0')}/${String(selectedDate.getFullYear()).slice(-2)}`}
                    </Text>
                </Pressable>
                {/* Show "Ver Tasa de Hoy" next to date button on wide screens */}
                {
                    isViewingHistory && isWideScreen && (
                        <Pressable
                            onPress={resetToToday}
                            style={({ pressed, hovered }) => ({
                                backgroundColor: hovered
                                    ? `${colors.bcvGreen}35`
                                    : `${colors.bcvGreen}20`,
                                paddingHorizontal: 12,
                                paddingVertical: 10,
                                borderRadius: 10,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                                borderWidth: 1,
                                borderColor: hovered
                                    ? `${colors.bcvGreen}60`
                                    : `${colors.bcvGreen}40`,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: hovered ? 6 : 3 },
                                shadowOpacity: hovered ? 0.35 : 0.25,
                                shadowRadius: hovered ? 8 : 5,
                                elevation: hovered ? 6 : 3,
                                transform: [{ translateY: pressed ? 1 : 0 }],
                                transition: 'all 0.2s ease',
                            })}
                        >
                            <CalendarIcon size={16} color={colors.bcvGreen} />
                            <Text style={{
                                color: colors.bcvGreen,
                                fontSize: 14,
                                fontWeight: '700'
                            }}>
                                Ver Tasa de Hoy
                            </Text>
                        </Pressable>
                    )
                }
            </View >
        </View >
    );

    const ActionsElement = (
        <View style={{ flexDirection: 'row', gap: 12 }}>
            {/* Refresh button - visible on all screens */}
            {/* Payment Methods Button - Replaces Refresh */}
            <View style={{ position: 'relative' }}>
                {/* Tooltip Bubble */}
                {showPaymentTooltip && !isWideScreen && (
                    <Animated.View style={{
                        position: 'absolute',
                        top: '120%', // Shift to below the button
                        right: 0, // Align right to match button
                        backgroundColor: colors.bcvGreen,
                        padding: 10,
                        borderRadius: 12,
                        width: 200,
                        zIndex: 999999, // Extreme zIndex to force on top
                        elevation: 999999, // Maximum elevation for Android
                        transform: [{ scale: tooltipScale }],
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 5,
                    }}>
                        <Text style={{
                            color: '#000',
                            fontSize: 12,
                            fontWeight: '700',
                            textAlign: 'center'
                        }}>
                            Aquí puedes guardar tus datos de pago, para compartirlos rápidamente.
                        </Text>
                        {/* Triangle Arrow (Pointing Up) */}
                        <View style={{
                            position: 'absolute',
                            top: -6, // Position at top of tooltip
                            right: 20,
                            width: 0,
                            height: 0,
                            borderLeftWidth: 6,
                            borderRightWidth: 6,
                            borderBottomWidth: 6, // Point up
                            borderLeftColor: 'transparent',
                            borderRightColor: 'transparent',
                            borderBottomColor: colors.bcvGreen
                        }} />
                    </Animated.View>
                )}

                <Animated.View style={!isWideScreen && showPaymentTooltip ? {
                    transform: [{
                        scale: buttonHighlight.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [1, 1.1, 1]
                        })
                    }]
                } : {}}>
                    <TouchableOpacity
                        style={[styles.infoButton, {
                            backgroundColor: showPaymentTooltip && !isWideScreen ? colors.bcvGreen : colors.glass,
                            borderColor: showPaymentTooltip && !isWideScreen ? colors.bcvGreen : colors.glassBorder,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 10,
                            paddingHorizontal: isWideScreen ? 16 : 14,
                        }]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setExpandedCard(null); // Close any open calculator
                            setPaymentModalVisible(true);
                        }}
                        activeOpacity={0.7}
                    >
                        <TusDatosIcon
                            width={24}
                            height={24}
                            color={showPaymentTooltip && !isWideScreen ? '#FFFFFF' : colors.bcvGreen}
                        />
                        {isWideScreen && (
                            <Text style={{
                                color: colors.textPrimary,
                                fontSize: 14,
                                fontWeight: '600'
                            }}>
                                Datos de Pago Movil
                            </Text>
                        )}
                    </TouchableOpacity>
                </Animated.View>
            </View>

            {/* History Button - Wide Screen Only */}
            {isWideScreen && (
                <TouchableOpacity
                    style={[styles.infoButton, {
                        backgroundColor: colors.glass,
                        borderColor: colors.glassBorder,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        paddingHorizontal: 16,
                    }]}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setExpandedCard(null); // Close any open calculator
                        setHistoryModalVisible(true);
                    }}
                    activeOpacity={0.7}
                >
                    <History size={20} color={colors.textPrimary} />
                    <Text style={{
                        color: colors.textPrimary,
                        fontSize: 14,
                        fontWeight: '600'
                    }}>
                        Historial de Precios
                    </Text>
                </TouchableOpacity>
            )}

            {/* Legal and Settings - only on wide screens */}
            {isWideScreen && (
                <TouchableOpacity
                    style={[styles.infoButton, {
                        backgroundColor: colors.glass,
                        borderColor: colors.glassBorder
                    }]}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        navigation.navigate('Legal');
                    }}
                    activeOpacity={0.7}
                >
                    <Info size={24} color={colors.textSecondary} />
                </TouchableOpacity>
            )}
            {isWideScreen && (
                <TouchableOpacity
                    style={[styles.infoButton, {
                        backgroundColor: colors.glass,
                        borderColor: colors.glassBorder
                    }]}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        navigation.navigate('Settings');
                    }}
                    activeOpacity={0.7}
                >
                    <Settings size={24} color={colors.textSecondary} />
                </TouchableOpacity>
            )}
        </View>
    );

    const Header = (
        <>
            <Animated.View
                style={[
                    styles.header,
                    { transform: [{ scale: headerScale }] }
                ]}
            >
                <View style={[styles.headerLeft, isSmallScreen && { flex: 1 }]}>
                    {LogoElement}
                    {TitleElement}
                </View>
                {ActionsElement}
            </Animated.View>
        </>
    );

    const Footer = (
        <>


            {/* Mobile: Show CurrencyChart instead of History Table */}
            {!isWideScreen && rates.history && rates.history.length > 0 && (
                <View style={styles.historySection}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <TrendingUp
                            size={18}
                            color={
                                embeddedCurrency === 'usd' ? colors.bcvGreen :
                                    embeddedCurrency === 'eur' ? colors.euroBlue :
                                        embeddedCurrency === 'usdt' ? colors.parallelOrange :
                                            embeddedCurrency === 'gap' ? (colors.accent || '#00E378') :
                                                colors.bcvGreen
                            }
                        />
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Evolución de Tasas</Text>
                    </View>

                    <CurrencyChart
                        width={width - 40}
                        initialCurrency="usd"
                        initialPeriod="week"
                        showHeaderCard={true}
                        onCurrencyChange={setEmbeddedCurrency}
                        historicalRates={historicalRates}
                        selectedDate={selectedDate}
                    />


                </View>
            )}

            {/* Desktop/Wide: Show History Table Section */}
            {isWideScreen && rates.history && rates.history.length > 0 && (
                <View style={[
                    styles.historySection,
                    styles.historySectionWide // Always apply wide styling for isWideScreen
                ]}>

                    {/* Main Content Area */}
                    {width > 0 && (
                        <View style={[styles.historyTableContainer, { flex: 1, paddingLeft: 0 }]}>

                            {/* Button Section */}


                            {/* Chart Moved Here - Below the Button */}
                            <View style={styles.embeddedChartContainer}>
                                {/* Safe render with error boundary */}
                                {(() => {
                                    try {
                                        return (
                                            <CurrencyChart
                                                width={width * 0.9} // Use more width as it's now in a flexible container
                                                initialCurrency="usd"
                                                initialPeriod="week"
                                                showHeaderCard={true}
                                                onCurrencyChange={setEmbeddedCurrency}
                                                historicalRates={historicalRates}
                                                selectedDate={selectedDate}
                                            />
                                        );
                                    } catch (error) {
                                        console.error('Error rendering CurrencyChart:', error);
                                        return (
                                            <View style={{ padding: 20, alignItems: 'center' }}>
                                                <Text style={{ color: colors.textSecondary }}>
                                                    Error al cargar el gráfico
                                                </Text>
                                            </View>
                                        );
                                    }
                                })()}
                            </View>
                        </View>
                    )}
                </View>

            )}
            <View style={styles.footerInfo}>
                <Text style={[styles.footerText, { color: colors.textSecondary }]}>Tasas BCV y promedio USDT de múltiples fuentes</Text>
            </View>



            {
                !isWideScreen && (
                    <View style={{ gap: 12, paddingBottom: 20, paddingTop: 8 }}>
                        <TouchableOpacity
                            style={[styles.legalFooterButton, { backgroundColor: colors.card, marginBottom: 0, marginHorizontal: 20 }]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setExpandedCard(null); // Close any open calculator
                                setHistoryModalVisible(true);
                            }}
                            activeOpacity={0.7}
                        >
                            <History size={20} color={colors.textPrimary} />
                            <Text style={[styles.legalFooterText, { color: colors.textPrimary }]}>Ver Historial Completo</Text>
                        </TouchableOpacity>


                        <TouchableOpacity
                            style={[styles.legalFooterButton, { backgroundColor: colors.card, marginBottom: 0, marginHorizontal: 20 }]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                refreshRates(true);
                            }}
                            activeOpacity={0.7}
                        >
                            <RefreshCcw size={20} color={colors.textPrimary} />
                            <Text style={[styles.legalFooterText, { color: colors.textPrimary }]}>Actualizar Tasas</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.legalFooterButton, { backgroundColor: colors.card, marginBottom: 0, marginHorizontal: 20 }]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                navigation.navigate('Settings');
                            }}
                            activeOpacity={0.7}
                        >
                            <Settings size={20} color={colors.textPrimary} />
                            <Text style={[styles.legalFooterText, { color: colors.textPrimary }]}>Configuración</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.legalFooterButton, { backgroundColor: colors.card, marginBottom: 0, marginHorizontal: 20 }]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                navigation.navigate('Legal');
                            }}
                            activeOpacity={0.7}
                        >
                            <Info size={20} color={colors.textPrimary} />
                            <Text style={[styles.legalFooterText, { color: colors.textPrimary }]}>Aviso Legal</Text>
                        </TouchableOpacity>


                    </View>
                )
            }




            {/* Modals */}
            <HistoryModal
                visible={historyModalVisible}
                onClose={() => setHistoryModalVisible(false)}
                rates={rates}
                usdtHistory={usdtHistory}
            />

            <PaymentMethodsModal
                visible={paymentModalVisible}
                onClose={() => setPaymentModalVisible(false)}
            />
        </>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <OfflineBanner />
            <Animated.ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingBottom: Platform.OS === 'web' ? 40 : 160 }]}
                showsVerticalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
                refreshControl={
                    <RefreshControl
                        refreshing={loading}
                        onRefresh={() => refreshRates(true)}
                        tintColor={colors.bcvGreen}
                        colors={[colors.bcvGreen]}
                    />
                }
            >
                {Header}


                {/* Global Date Selector - Float above cards */}
                {!isViewingHistory && hasData && (rates.nextRates?.usd || rates.nextRates?.eur) && (
                    <View style={{
                        marginLeft: 20,
                        marginRight: 20,
                        marginBottom: 16,
                        zIndex: 10
                    }}>
                        {/* Instructional text above buttons */}
                        <Text style={{
                            fontSize: 13,
                            fontWeight: '500',
                            color: colors.textSecondary,
                            marginBottom: 12,
                            textAlign: 'center',
                            paddingHorizontal: 20,
                        }}>
                            Selecciona la tasa de hoy o la siguiente tasa disponible
                        </Text>
                        <View style={{
                            backgroundColor: '#2E2E30',
                            borderRadius: 16,
                            padding: 4,
                            flexDirection: 'row',
                            alignItems: 'center',
                            alignSelf: 'stretch',
                            gap: 4,
                        }}>
                            {/* Today Button */}
                            <Pressable
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    setGlobalUseTomorrow(false);
                                }}
                                style={({ pressed, hovered }) => ({
                                    flex: 1,
                                    paddingVertical: 16,
                                    paddingHorizontal: 16,
                                    borderRadius: 12,
                                    backgroundColor: !globalUseTomorrow ? '#264339' : 'transparent',
                                    borderWidth: !globalUseTomorrow ? 2 : 1,
                                    borderColor: !globalUseTomorrow ? '#02DF82' : '#515153',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minHeight: 79,
                                    ...(Platform.OS === 'web' && {
                                        transition: 'all 0.2s ease',
                                        cursor: 'pointer',
                                    }),
                                    transform: [{ scale: pressed ? 0.97 : 1 }],
                                })}
                            >
                                <Text style={{
                                    fontSize: 16,
                                    fontWeight: '700',
                                    color: !globalUseTomorrow ? '#02DF82' : '#FFFFFF',
                                }}>
                                    Hoy
                                </Text>
                            </Pressable>

                            {/* Tomorrow Button */}
                            <Pressable
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    setGlobalUseTomorrow(true);
                                }}
                                style={({ pressed, hovered }) => {
                                    const getFriendlyNextDate = () => {
                                        const nextRawDate = rates.nextRates?.rawDate;
                                        if (!nextRawDate) return 'Próxima';
                                        const daysArr = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                                        const [y, m, d] = nextRawDate.split('-');
                                        const nextDateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                                        return daysArr[nextDateObj.getDay()];
                                    };

                                    return {
                                        flex: 1,
                                        paddingVertical: 16,
                                        paddingHorizontal: 16,
                                        borderRadius: 12,
                                        backgroundColor: globalUseTomorrow ? '#264339' : 'transparent',
                                        borderWidth: globalUseTomorrow ? 2 : 1,
                                        borderColor: globalUseTomorrow ? '#02DF82' : '#515153',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        minHeight: 79,
                                        ...(Platform.OS === 'web' && {
                                            transition: 'all 0.2s ease',
                                            cursor: 'pointer',
                                        }),
                                        transform: [{ scale: pressed ? 0.97 : 1 }],
                                    };
                                }}
                            >
                                {(() => {
                                    const getFriendlyNextDate = () => {
                                        const nextRawDate = rates.nextRates?.rawDate;
                                        if (!nextRawDate) return 'Próxima';
                                        const daysArr = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                                        const [y, m, d] = nextRawDate.split('-');
                                        const nextDateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                                        return daysArr[nextDateObj.getDay()];
                                    };

                                    const nextDateLabel = rates.nextRates?.date;
                                    const friendlyDate = getFriendlyNextDate();

                                    // Extract DD/MM from rawDate (YYYY-MM-DD format)
                                    const rawDate = rates.nextRates?.rawDate;
                                    const shortDate = rawDate ? `${rawDate.substring(8, 10)}/${rawDate.substring(5, 7)}` : '';

                                    return (
                                        <View style={{ alignItems: 'center' }}>
                                            <Text style={{
                                                fontSize: 16,
                                                fontWeight: '700',
                                                color: globalUseTomorrow ? '#02DF82' : '#FFFFFF',
                                            }}>
                                                {friendlyDate}
                                            </Text>
                                            {shortDate && (
                                                <Text style={{
                                                    fontSize: 11,
                                                    fontWeight: '600',
                                                    color: globalUseTomorrow ? colors.textSecondary : (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'),
                                                    marginTop: 2,
                                                }}>
                                                    {shortDate}
                                                </Text>
                                            )}
                                        </View>
                                    );
                                })()}
                            </Pressable>
                        </View>
                    </View>
                )}

                {/* Instructional text above cards */}
                {!isViewingHistory && hasData && (
                    <Text style={{
                        fontSize: 13,
                        fontWeight: '500',
                        color: colors.textSecondary,
                        marginHorizontal: 20,
                        marginBottom: 12,
                        textAlign: 'center',
                    }}>
                        Presiona la tasa para calcular 👇
                    </Text>
                )}



                {/* Backdrop overlay - only visible when a card is expanded */}
                {expandedCard && (
                    <Pressable
                        style={[StyleSheet.absoluteFill, { zIndex: 1 }]}
                        onPress={handleClickOutside}
                    />
                )}

                {/* Rate Cards Container */}
                <View style={[
                    styles.cardsContainer,
                    isWideScreen && styles.cardsContainerWide,
                    expandedCard && { zIndex: 2 }
                ]}>
                    {hasData ? (
                        cardData.map((item, index) => (
                            <View
                                key={item.id}
                                style={[
                                    isWideScreen && styles.cardWide
                                ]}
                            >
                                <RateCard
                                    {...item}
                                    index={index}
                                    onPress={() => handleCardPress(item.id)}
                                    isExpanded={expandedCard === item.id}
                                    globalUseTomorrow={globalUseTomorrow}
                                />
                            </View>
                        ))
                    ) : (
                        <>
                            <SkeletonCard index={0} />
                            <SkeletonCard index={1} />
                            <SkeletonCard index={2} />
                        </>
                    )}
                </View>



                {hasData && (
                    <View style={{ position: 'relative', zIndex: expandedCard ? 10 : 0 }}>
                        {Footer}
                    </View>
                )}
            </Animated.ScrollView>
            {/* <AdBanner style={styles.adBanner} /> */}

            {/* Date Picker Modal for Web */}
            {showDatePicker && (
                <View style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 9999
                }}>
                    <View style={{
                        backgroundColor: colors.card,
                        padding: 24,
                        borderRadius: 16,
                        minWidth: 320,
                        maxWidth: 400,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 5
                    }}>
                        <Text style={{
                            color: colors.textPrimary,
                            fontSize: 20,
                            fontWeight: 'bold',
                            marginBottom: 20,
                            textAlign: 'center'
                        }}>
                            {selectedDate.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long', year: '2-digit' })}
                        </Text>

                        <TouchableOpacity
                            style={{
                                backgroundColor: colors.bcvGreen,
                                borderRadius: 8,
                                marginBottom: 16,
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                            onPress={() => {
                                try {
                                    dateInputRef.current.showPicker();
                                } catch (e) {
                                    console.log('showPicker not supported', e);
                                    // Fallback: try to focus/click if showPicker fails
                                    dateInputRef.current.click();
                                }
                            }}
                            activeOpacity={0.9}
                        >
                            <View style={{ padding: 14, alignItems: 'center' }}>
                                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                                    Seleccionar Fecha
                                </Text>
                            </View>
                            <input
                                ref={dateInputRef}
                                type="date"
                                value={selectedDate.toISOString().split('T')[0]}
                                max={new Date().toISOString().split('T')[0]}
                                min="2023-01-01"
                                onChange={(e) => {
                                    if (e.target.value) {
                                        const newDate = new Date(e.target.value + 'T00:00:00');
                                        handleDateChange(null, newDate);
                                    }
                                }}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    width: '100%',
                                    height: '100%',
                                    opacity: 0,
                                    zIndex: 10,
                                    cursor: 'pointer',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setShowDatePicker(false)}
                            style={{
                                backgroundColor: isDark ? '#333333' : '#e5e5e5',
                                padding: 14,
                                borderRadius: 8,
                                alignItems: 'center'
                            }}
                        >
                            <Text style={{
                                color: isDark ? '#cccccc' : '#666666',
                                fontWeight: 'bold',
                                fontSize: 16
                            }}>
                                Cerrar
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
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
        paddingVertical: 24,
        marginBottom: 12,
        zIndex: 999999, // Ensure header (and tooltip) stays on top of content below
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
    infoButton: {
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
    },
    cardsContainer: {
        width: '100%',
    },
    cardsContainerWide: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    cardWide: {
        flex: 1,
        minWidth: 280,
    },
    adBanner: {
        position: 'absolute',
        bottom: 95,
        left: 0,
        right: 0,
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
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    historyCard: {
        borderRadius: 20,
        padding: 20,
    },
    historyHeader: {
        flexDirection: 'row',
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    historyLabel: {
        flex: 1,
        fontSize: 12,
        fontWeight: '700',
    },
    historyRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    historyDate: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
    },
    historyValue: {
        flex: 1,
        fontSize: 14,
        textAlign: 'right',
        fontVariant: ['tabular-nums'],
    },
    footerInfo: {
        paddingVertical: 30,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        textAlign: 'center',
    },
    hintText: {
        fontSize: 13,
        fontWeight: '600',
        marginTop: 12,
        textAlign: 'left',
        opacity: 0.8
    },
    // Offline Banner Styles
    offlineBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginTop: 8,
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
    retryButton: {
        padding: 10,
        borderRadius: 10,
    },
    legalFooterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 16,
        gap: 8,
    },
    legalFooterText: {
        fontSize: 15,
        fontWeight: '600',
    },
    // Extra wide screen styles (>1300px)
    historySectionWide: {
        flexDirection: 'row',
        gap: 24,
        alignItems: 'stretch',
    },
    historyTableContainer: {
        flex: 1,
        minWidth: 300,
    },
    // Styles for the container of the CurrencyChart in wide mode
    embeddedChartContainer: {
        flex: 1.5,
        minWidth: 400,
        backgroundColor: 'transparent',
    },
    embeddedChartHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    embeddedChartTitle: {
        fontSize: 14,
        fontWeight: '600',
    },


    footerInfo: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        textAlign: 'center',
    },
    legalFooterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    legalFooterText: {
        fontSize: 16,
        fontWeight: '600',
    },
});

export default HomeScreen;
