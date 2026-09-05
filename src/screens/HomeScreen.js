import React, { useMemo, useRef, useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, Animated, Platform, Image, useWindowDimensions, ScrollView, ActivityIndicator, Pressable, LayoutAnimation, UIManager } from 'react-native';
import { Banknote, RefreshCcw, TrendingUp, TrendingDown, DollarSign, ChevronRight, ChevronLeft, Info, WifiOff, Calendar as CalendarIcon, Settings, Coins, ArrowRight, ChevronDown, Share2, X, Euro, FileText, Menu, CalendarSearch } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../context/ThemeContext';
import RateCard from '../components/RateCard';
import SkeletonCard from '../components/SkeletonCard';
import HistoricalChart from '../components/HistoricalChart';
import CurrencyGap from '../components/CurrencyGap';
import { useRates } from '../context/RateContext';
import { fetchHistoricalByDate } from '../services/rateService';
import { formatCurrency } from '../utils/formatting';
import AdBanner from '../components/AdBanner';
import NativeAdComponent from '../components/NativeAd';
import PaymentMethodsModal from '../components/PaymentMethodsModal';
import HistoryModal from '../components/HistoryModal';
// TusDatosIcon is small, can keep static or lazy if needed, but modals are the big ones.
import TusDatosIcon from '../components/TusDatosIcon';
import UsdtIcon from '../components/UsdtIcon';
import WebCalendar from '../components/WebCalendar';

const WebBannerAd = () => {
    // Only render on Web
    return null; // Ads disabled by user request
};

const MainAd = () => {
    // Only render on Web
    return null; // Ads disabled by user request
};

const CARD_LAYOUT_ANIMATION = {
    duration: 800,
    create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
    },
    update: {
        type: LayoutAnimation.Types.easeInEaseOut,
    },
    delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
    },
};

const HomeScreen = ({ navigation, route }) => {
    const { width, height: screenHeight } = useWindowDimensions();
    const { rates, loading, refreshRates, order, isOffline, getTimeSinceUpdate, usdtHistory, fetchUsdtHistoricalData, fetchHistoricalData } = useRates();
    const { colors, isDark } = useTheme();
    const scrollY = useRef(new Animated.Value(0)).current;
    const [expandedCards, setExpandedCards] = useState({}); // Map of cardId -> boolean
    const [selectedDate, setSelectedDate] = React.useState(new Date());

    const [historicalRates, setHistoricalRates] = React.useState(null);
    const [loadingHistorical, setLoadingHistorical] = React.useState(false);
    const [globalUseTomorrow, setGlobalUseTomorrow] = useState(false);
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
    const [historyModalVisible, setHistoryModalVisible] = useState(false);
    const [showPaymentTooltip, setShowPaymentTooltip] = useState(false);
    const [webCalendarVisible, setWebCalendarVisible] = useState(false);
    const dateInputRef = useRef(null);
    const tooltipScale = useRef(new Animated.Value(0)).current;
    const buttonHighlight = useRef(new Animated.Value(0)).current;
    const [menuVisible, setMenuVisible] = useState(false);
    const menuAnim = useRef(new Animated.Value(0)).current;
    const scrollViewRef = useRef(null);
    const cardRefs = useRef({});
    const cardsContainerY = useRef(0);

    const [showDateTooltip, setShowDateTooltip] = useState(false);
    const dateTooltipAnim = useRef(new Animated.Value(0)).current;
    const screenFade = useRef(new Animated.Value(0)).current;
    const tooltipTimeout = useRef(null);

    // "Historial completo" se abre desde Configuración: esa pantalla vuelve a Home
    // con el parámetro y acá se levanta el modal. El parámetro se limpia enseguida
    // para que volver a Home más tarde no lo reabra solo.
    const openHistoryParam = route?.params?.openHistory;
    useEffect(() => {
        if (!openHistoryParam) return;
        setHistoryModalVisible(true);
        navigation.setParams({ openHistory: undefined });
    }, [openHistoryParam, navigation]);

    const toggleMenu = () => {
        const toValue = menuVisible ? 0 : 1;
        setMenuVisible(!menuVisible);
        Animated.spring(menuAnim, {
            toValue,
            useNativeDriver: true,
            tension: 50,
            friction: 7
        }).start();
    };

    const hideDateTooltip = () => {
        if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
        Animated.timing(dateTooltipAnim, {
            toValue: 0,
            duration: 350,
            useNativeDriver: true
        }).start(() => setShowDateTooltip(false));
    };

    const triggerDatePicker = () => {
        Haptics.selectionAsync();

        // Show Tooltip with Pop animation
        if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
        setShowDateTooltip(true);
        Animated.spring(dateTooltipAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 50, // Higher tension for faster pop
            friction: 6   // Lower friction for more bounce
        }).start();

        // Hide after 8 seconds (fallback)
        tooltipTimeout.current = setTimeout(() => {
            hideDateTooltip();
        }, 8000);

        // Directly open native custom calendar picker
        setWebCalendarVisible(true);
    };

    // Show tooltip on mount for mobile
    useEffect(() => {
        // Soft screen fade in
        Animated.timing(screenFade, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true
        }).start();

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

    const capitalizeSpanishDate = (str) => {
        if (!str) return str;
        return str.split(' ').map((word, index) => {
            if (word.toLowerCase() === 'de') return 'de';
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(' ');
    };

    const formatFriendlyDate = (dateStr) => {
        if (!dateStr) return '';
        const [y, m, d] = dateStr.split('-');
        const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        return capitalizeSpanishDate(dateObj.toLocaleDateString('es-VE', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        }));
    };

    const animateCardLayout = () => {
        LayoutAnimation.configureNext(CARD_LAYOUT_ANIMATION);
    };

    const closeAllCards = () => {
        if (Object.values(expandedCards).every(v => !v)) return;
        animateCardLayout();
        setExpandedCards({});
    };

    const handleCardPress = (currencyId) => {
        const isCurrentlyExpanded = !!expandedCards[currencyId];
        animateCardLayout();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        setExpandedCards(prev => ({
            ...prev,
            [currencyId]: !isCurrentlyExpanded
        }));

        // Auto-scroll when expanding to center the card
        if (!isCurrentlyExpanded) {
            // Use a slightly longer timeout to allow the layout to start changing
            setTimeout(() => {
                cardRefs.current[currencyId]?.measure((x, y, width, height, px, py) => {
                    // measure gives px, py (position in window)
                    // We can use the current scrollY to find the absolute Y in the scrollview
                    // Since the header and container have fixed/calculated positions, 
                    // a more reliable way is to find the target scroll based on current window position
                    
                    const cardCenterY = py + (height / 2);
                    const screenCenterY = screenHeight / 2;
                    const diff = cardCenterY - screenCenterY;
                    
                    // Add the difference to current scroll position
                    // We need to access the current scroll value. 
                    // Animated.Value doesn't have a simple synchronous .getValue() without listeners,
                    // but we can use the internal _value or better, just use the ScrollView's current position if we tracked it in a ref.
                    
                    // Let's use the py/px to calculate the relative move
                    scrollViewRef.current?.scrollTo({
                        y: Math.max(0, scrollY._value + diff),
                        animated: true
                    });
                });
            }, 100);
        }
    };

    const handleClickOutside = () => {
        closeAllCards();
    };

    const handleDateChange = (event, date) => {
        // Hide tooltip as soon as anything happens in the picker
        hideDateTooltip();

        if (Platform.OS !== 'web') {
            setShowDatePicker(Platform.OS === 'ios');
        }

        if (date) {
            setGlobalUseTomorrow(false); // Reset tomorrow mode if we pick a specific date
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

        // setHistoricalRates(null); // Keep old data visible for smoother transition
        setLoadingHistorical(true);

        try {
            // Format date as YYYY-MM-DD
            const dateStr = date.toISOString().split('T')[0];

            // Fetch from Supabase using rateService (now uses LTE for smart fallback)
            const rateData = await fetchHistoricalByDate(dateStr);

            if (rateData) {
                // Also find the closest USDT rate for this date
                // Since we already have usdtHistory in the context, we can search it
                // LIMIT: Only search if date is on or after 2026-01-12
                const dataDate = new Date(rateData.date);
                const firstUsdtDate = new Date('2026-01-12');
                
                let closestUsdt = null;
                if (dataDate >= firstUsdtDate) {
                    closestUsdt = usdtHistory.find(u => u.date <= rateData.date);
                }

                const historicalState = {
                    bcv: rateData.usd,
                    euro: rateData.eur,
                    date: rateData.date,
                    usdt: closestUsdt ? closestUsdt.usdt : 0,
                    usdtDate: closestUsdt ? closestUsdt.date : rateData.date,
                    nextRates: null
                };
                setHistoricalRates(historicalState);
                console.log(`[HomeScreen] Loaded historical rate for ${dateStr} (Found ${rateData.date}): USD=${rateData.usd}, EUR=${rateData.eur}, USDT=${historicalState.usdt}`);
            } else {
                console.log(`[HomeScreen] No historical data found on or before ${dateStr}`);
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
        animateCardLayout();
        setSelectedDate(new Date());
        setHistoricalRates(null);
    };



    // Fetch USDT history AND BCV history on mount for the table (fetch 'all' to ensure we have all rows since DB inception)
    // Fetch full history data in the background AFTER the main screen has loaded to prevent UI block
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsdtHistoricalData('all');
            fetchHistoricalData('all');
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    // Check if viewing a date other than today
    const isViewingHistory = selectedDate.toDateString() !== new Date().toDateString();

    const cardData = useMemo(() => {

        const dataMap = {
            usd: {
                id: 'usd',
                title: 'Tasa BCV (USD)',
                rate: isViewingHistory && historicalRates ? historicalRates.bcv : rates.bcv,
                color: colors.bcvGreen,
                icon: <DollarSign color={colors.bcvGreen} size={18} />,
                nextRate: isViewingHistory ? (historicalRates?.nextRates?.usd || null) : rates.nextRates?.usd,
                nextDate: isViewingHistory ? (historicalRates?.nextRates?.date || null) : rates.nextRates?.date,
                nextRawDate: isViewingHistory ? (historicalRates?.nextRates?.rawDate || null) : rates.nextRates?.rawDate,
                change: isViewingHistory ? 0 : rates.usdChange,
                isHistorical: isViewingHistory,
                lastUpdated: isViewingHistory && historicalRates 
                    ? formatFriendlyDate(historicalRates.date) 
                    : rates.lastUpdate
            },
            eur: {
                id: 'eur',
                title: 'Tasa BCV (EUR)',
                rate: isViewingHistory && historicalRates ? historicalRates.euro : rates.euro,
                color: colors.euroBlue,
                icon: <Euro color={colors.euroBlue} size={18} />,
                nextRate: isViewingHistory ? (historicalRates?.nextRates?.eur || null) : rates.nextRates?.eur,
                nextDate: isViewingHistory ? (historicalRates?.nextRates?.date || null) : rates.nextRates?.date,
                nextRawDate: isViewingHistory ? (historicalRates?.nextRates?.rawDate || null) : rates.nextRates?.rawDate,
                change: isViewingHistory ? 0 : rates.eurChange,
                isHistorical: isViewingHistory,
                lastUpdated: isViewingHistory && historicalRates 
                    ? formatFriendlyDate(historicalRates.date) 
                    : rates.lastUpdate
            },
            parallel: {
                id: 'parallel',
                title: 'Promedio USDT',
                rate: isViewingHistory && historicalRates ? historicalRates.usdt : rates.parallel,
                color: colors.parallelOrange,
                icon: <UsdtIcon color={colors.parallelOrange} size={18} />,
                lastUpdated: isViewingHistory && historicalRates 
                    ? (historicalRates.usdt > 0 ? formatFriendlyDate(historicalRates.usdtDate) : 'No disponible')
                    : rates.parallelUpdate,
                change: isViewingHistory ? 0 : rates.usdtChange
            }
        };

        return order.map(id => dataMap[id]);
    }, [rates, order, colors, isViewingHistory, historicalRates, selectedDate, usdtHistory]);

    const isAnyCardExpanded = Object.values(expandedCards).some(v => v);

    // Check if we have real data loaded
    const hasData = rates.bcv > 0;

    const renderItem = ({ item, index }) => {
        const isLoadingCurrent = !isViewingHistory && (loading || !hasData);
        const isLoadingPast = isViewingHistory && (loadingHistorical || !historicalRates);

        if (isLoadingCurrent || isLoadingPast) {
            return <SkeletonCard index={index} />;
        }
        
        return (
            <RateCard 
                {...item} 
                index={index} 
                onPress={() => handleCardPress(item.id)} 
                onManagePayments={() => setPaymentModalVisible(true)}
            />
        );
    };
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

    const LogoElement = useMemo(() => (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: isViewingHistory ? 70 : 48 }}>
            <Image
                source={require('../../assets/Logo nombre completo.png')}
                resizeMode="contain"
                style={{
                    maxWidth: '100%',
                    width: 180,
                    height: 44,
                }}
            />
            {isViewingHistory && historicalRates && (
                <Text style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: colors.textSecondary,
                    marginTop: 4,
                    textTransform: 'capitalize'
                }}>
                    {formatFriendlyDate(historicalRates.date)}
                </Text>
            )}
        </View>
    ), [isViewingHistory, historicalRates, colors]);

    const TitleElement = null; // Removing the title per user request

    const CompactDateButton = (
        <Pressable
            onPress={() => {
                Haptics.selectionAsync();
                setWebCalendarVisible(true);
            }}
            style={({ pressed, hovered }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: colors.card,
                height: 44, // Slightly reduced height
                minWidth: 120, // Threshold to prevent too small
                paddingHorizontal: 16,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
                ...Platform.select({
                    ios: {
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: 0.3,
                        shadowRadius: 20,
                    },
                    android: { elevation: 8 },
                    web: {
                        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                        transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                        cursor: 'pointer',
                    },
                }),
                transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
        >
            <CalendarIcon size={24} color={showPaymentTooltip && !isWideScreen ? '#02DF82' : colors.bcvGreen} strokeWidth={2.5} />
            <Text style={{
                color: colors.textSecondary,
                fontSize: 14,
                fontWeight: '600'
            }}>
                {`${String(selectedDate.getDate()).padStart(2, '0')}/${String(selectedDate.getMonth() + 1).padStart(2, '0')}/${String(selectedDate.getFullYear()).slice(-2)}`}
            </Text>
        </Pressable>
    );

    const TodayButton = isViewingHistory && (
        <Pressable
            onPress={resetToToday}
            style={({ pressed, hovered }) => ({
                backgroundColor: hovered
                    ? `${colors.bcvGreen}35`
                    : `${colors.bcvGreen}20`,
                paddingHorizontal: 16,
                height: 44, // Slightly reduced height
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                borderWidth: 1,
                borderColor: hovered
                    ? `${colors.bcvGreen}60`
                    : `${colors.bcvGreen}40`,
                transform: [{ translateY: pressed ? 1 : 0 }],
                minWidth: 80, // Threshold
            })}
        >
            <CalendarIcon size={22} color={colors.bcvGreen} strokeWidth={2.5} />
            <Text style={{
                color: colors.bcvGreen,
                fontSize: 14,
                fontWeight: '600' // Same as rate cards
            }}>
                Hoy
            </Text>
        </Pressable>
    );

    const FloatingDatePickerButton = useMemo(() => (
        <TouchableOpacity
            onPress={() => {
                if (isViewingHistory) {
                    resetToToday();
                } else {
                    triggerDatePicker();
                }
            }}
            style={{
                backgroundColor: isViewingHistory ? colors.bcvGreen : colors.card,
                padding: 10,
                borderRadius: 12,
                borderWidth: isViewingHistory ? 1.5 : 1,
                borderColor: isViewingHistory ? colors.bcvGreen : 'rgba(255,255,255,0.08)',
                ...Platform.select({
                    ios: {
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.2,
                        shadowRadius: 5,
                    },
                    android: { elevation: 4 },
                }),
            }}
        >
            {isViewingHistory ? (
                <ArrowRight size={24} color="#121214" strokeWidth={3} />
            ) : (
                <CalendarSearch size={24} color={colors.textPrimary} strokeWidth={2.2} />
            )}
            
            {(loadingHistorical) && (
                <View style={{ position: 'absolute', right: -5, top: -5, backgroundColor: colors.card, borderRadius: 10, padding: 2 }}>
                    <ActivityIndicator size="small" color={colors.bcvGreen} />
                </View>
            )}
        </TouchableOpacity>
    ), [isViewingHistory, colors, isDark, loadingHistorical, triggerDatePicker, resetToToday]);

    const HiddenWebDateInput = null;

    const FloatingMenuButton = useMemo(() => (
        <TouchableOpacity
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleMenu();
            }}
            style={{
                backgroundColor: colors.card,
                padding: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
                ...Platform.select({
                    ios: {
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.2,
                        shadowRadius: 5,
                    },
                    android: { elevation: 4 },
                }),
            }}
        >
            <Menu size={24} color={colors.textPrimary} strokeWidth={2.2} />
        </TouchableOpacity>
    ), [colors, isDark, toggleMenu]);

    const ActionsElement = null; // Centralized in Floating Menu

    const Header = useMemo(() => (
        <View style={[styles.headerContainer, { paddingBottom: 10 }]}>
            <View style={styles.logoRow}>
                <View>
                    {FloatingDatePickerButton}
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                    {LogoElement}
                </View>
                {FloatingMenuButton}
            </View>
            {HiddenWebDateInput}
        </View>
    ), [FloatingDatePickerButton, HiddenWebDateInput, LogoElement, FloatingMenuButton]);

    const MENU_ITEMS = [
        { id: 'payment', label: 'Tus Datos', icon: <TusDatosIcon width={22} height={22} color={colors.textPrimary} /> },
        { id: 'settings', label: 'Configuración', icon: <Settings size={22} color={colors.textPrimary} strokeWidth={2.2} /> },
    ];

    const FloatingMenuOverlay = menuVisible && (
        <Pressable
            style={StyleSheet.absoluteFill}
            onPress={toggleMenu}
        >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} />
            <Animated.View style={{
                position: 'absolute',
                top: 70,
                right: 20,
                width: 260,
                backgroundColor: isDark ? 'rgba(30,30,32,0.85)' : 'rgba(255,255,255,0.85)',
                borderRadius: 24,
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.12)',
                opacity: menuAnim,
                transform: [
                    { translateY: menuAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) },
                    { scale: menuAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }
                ],
                ...Platform.select({
                    ios: {
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 20 },
                        shadowOpacity: 0.4,
                        shadowRadius: 30,
                    },
                    android: { elevation: 20 },
                    web: {
                        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(15px)',
                        WebkitBackdropFilter: 'blur(15px)',
                    }
                })
            }}>
                {/* Menu Items — solo "Tus Datos" y "Configuración", igual que la app
                    móvil. Historial completo, Fuentes, Actualizar tasas y Aviso Legal
                    viven dentro de Configuración para no saturar este menú. */}
                {MENU_ITEMS.map((item, idx) => (
                    <TouchableOpacity
                        key={item.id}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            toggleMenu();
                            if (item.id === 'payment') setPaymentModalVisible(true);
                            if (item.id === 'settings') navigation.navigate('Settings');
                        }}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 14,
                            paddingHorizontal: 8,
                            borderBottomWidth: idx === MENU_ITEMS.length - 1 ? 0 : 0.5,
                            borderBottomColor: 'rgba(255,255,255,0.08)',
                        }}
                    >
                        <View style={{ width: 34, alignItems: 'center' }}>
                            {item.icon}
                        </View>
                        <Text style={{
                            color: colors.textPrimary,
                            fontSize: 15,
                            fontWeight: '600',
                            marginLeft: 12
                        }}>{item.label}</Text>
                    </TouchableOpacity>
                ))}
            </Animated.View>
        </Pressable>
    );

    const DateTooltip = showDateTooltip && !webCalendarVisible && (
        <Animated.View style={{
            position: 'absolute',
            bottom: Platform.OS === 'ios' ? 240 : 100,
            left: 20,
            right: 20,
            zIndex: 10000,
            opacity: dateTooltipAnim,
            transform: [
                { translateY: dateTooltipAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
                { scale: dateTooltipAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }
            ]
        }}>
            <View style={{
                backgroundColor: '#FFFFFF',
                padding: 20,
                borderRadius: 24,
                borderWidth: 1.5,
                borderColor: 'rgba(0,0,0,0.08)',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                ...Platform.select({
                    ios: {
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 12 },
                        shadowOpacity: 0.25,
                        shadowRadius: 18,
                    },
                    android: { elevation: 12 }
                })
            }}>
                <View style={{ 
                    width: 44, 
                    height: 44, 
                    borderRadius: 14, 
                    backgroundColor: 'rgba(0,0,0,0.06)', 
                    justifyContent: 'center', 
                    alignItems: 'center' 
                }}>
                    <Info size={24} color="#121214" strokeWidth={2.8} />
                </View>
                <Text style={{ 
                    color: '#121214',
                    fontSize: 16, 
                    fontWeight: '900', // Increased to 900 for extra punch
                    flex: 1,
                    lineHeight: 22,
                    letterSpacing: -0.3
                }}>
                    Selecciona una fecha para ver la tasa de ese día.
                </Text>
            </View>
        </Animated.View>
    );

    const Footer = (
        <>
            <View style={styles.footerInfo}>
                <Text style={[styles.footerText, { color: colors.textSecondary }]}>Tasas BCV y promedio USDT de múltiples fuentes</Text>
            </View>








            {/* Modals */}
            <WebCalendar
                visible={webCalendarVisible}
                onClose={() => setWebCalendarVisible(false)}
                selectedDate={selectedDate}
                onSelectDate={(newDate) => {
                    // Robust comparison: check day, month, year
                    const isSameDay = newDate.getDate() === selectedDate.getDate() &&
                                    newDate.getMonth() === selectedDate.getMonth() &&
                                    newDate.getFullYear() === selectedDate.getFullYear();
                    
                    if (!isSameDay || globalUseTomorrow) {
                        handleDateChange(null, newDate);
                    }
                }}
            />

            <HistoryModal
                visible={historyModalVisible}
                onClose={() => setHistoryModalVisible(false)}
                rates={rates}
                usdtHistory={usdtHistory}
                onOpenDatePicker={triggerDatePicker}
            />

            <PaymentMethodsModal
                visible={paymentModalVisible}
                onClose={() => setPaymentModalVisible(false)}
            />
        </>
    );

    // ── Custom Pull-to-Refresh (touch-event based for mobile web) ──
    const [pullRefreshing, setPullRefreshing] = useState(false);
    const lastRefreshTime = useRef(0);
    const PULL_THRESHOLD = 80;
    const COOLDOWN_MS = 15000;

    const [pullState, setPullState] = useState('idle');
    const [cooldownRemaining, setCooldownRemaining] = useState(0);
    const pullDistance = useRef(new Animated.Value(0)).current;
    const spinAnim = useRef(new Animated.Value(0)).current;
    const touchStartY = useRef(0);
    const currentScrollY = useRef(0);
    const isPulling = useRef(false);

    // Track current scroll position via listener
    useEffect(() => {
        const id = scrollY.addListener(({ value }) => {
            currentScrollY.current = value;
        });
        return () => scrollY.removeListener(id);
    }, []);

    // Spin animation for refreshing state
    useEffect(() => {
        if (pullState === 'refreshing') {
            const spin = Animated.loop(
                Animated.timing(spinAnim, { toValue: 1, duration: 800, useNativeDriver: true })
            );
            spin.start();
            return () => spin.stop();
        } else {
            spinAnim.setValue(0);
        }
    }, [pullState]);

    const spinInterpolate = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const handlePullRefresh = async () => {
        if (pullRefreshing) return;
        const now = Date.now();
        const elapsed = now - lastRefreshTime.current;

        if (elapsed < COOLDOWN_MS) {
            const remaining = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
            setCooldownRemaining(remaining);
            setPullState('cooldown');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setTimeout(() => {
                setPullState('idle');
                setCooldownRemaining(0);
                Animated.timing(pullDistance, { toValue: 0, duration: 300, useNativeDriver: true }).start();
            }, 2000);
            return;
        }

        setPullRefreshing(true);
        setPullState('refreshing');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        lastRefreshTime.current = Date.now();
        Animated.timing(pullDistance, { toValue: 50, duration: 200, useNativeDriver: true }).start();

        try {
            await refreshRates(true);
        } finally {
            setPullRefreshing(false);
            setPullState('idle');
            isPulling.current = false;
            Animated.timing(pullDistance, { toValue: 0, duration: 300, useNativeDriver: true }).start();
        }
    };

    const onPullTouchStart = (e) => {
        if (pullState === 'refreshing' || pullState === 'cooldown') return;
        touchStartY.current = e.nativeEvent.pageY;
    };

    const onPullTouchMove = (e) => {
        if (pullState === 'refreshing' || pullState === 'cooldown') return;
        if (currentScrollY.current > 2) {
            if (isPulling.current) {
                isPulling.current = false;
                setPullState('idle');
                pullDistance.setValue(0);
            }
            return;
        }

        const delta = e.nativeEvent.pageY - touchStartY.current;
        if (delta > 10) {
            isPulling.current = true;
            const distance = Math.min(delta * 0.5, 120);
            pullDistance.setValue(distance);

            if (distance >= PULL_THRESHOLD && pullState !== 'ready') {
                setPullState('ready');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } else if (distance < PULL_THRESHOLD && distance > 0 && pullState !== 'pulling') {
                setPullState('pulling');
            }
        }
    };

    const onPullTouchEnd = () => {
        if (pullState === 'refreshing' || pullState === 'cooldown') return;
        if (pullState === 'ready') {
            handlePullRefresh();
        } else {
            isPulling.current = false;
            setPullState('idle');
            Animated.timing(pullDistance, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        }
    };

    const getPullText = () => {
        switch (pullState) {
            case 'pulling': return '¿Actualizar Tasas?';
            case 'ready': return 'Suelta para actualizar';
            case 'refreshing': return 'Actualizando...';
            case 'cooldown': return `Espera ${cooldownRemaining}s`;
            default: return '';
        }
    };

    const getPullColor = () => {
        switch (pullState) {
            case 'ready': return colors.bcvGreen;
            case 'refreshing': return colors.bcvGreen;
            case 'cooldown': return colors.parallelOrange;
            default: return colors.textSecondary;
        }
    };

    const PullToRefreshIndicator = (
        <Animated.View
            pointerEvents="none"
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 100,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                opacity: pullDistance.interpolate({
                    inputRange: [0, 20, 40],
                    outputRange: [0, 0.5, 1],
                    extrapolate: 'clamp',
                }),
                transform: [{
                    translateY: pullDistance.interpolate({
                        inputRange: [0, 44, 120],
                        outputRange: [-44, 0, 10],
                        extrapolate: 'clamp',
                    })
                }],
            }}
        >
            <Animated.View style={{
                transform: [{ rotate: pullState === 'refreshing' ? spinInterpolate : '0deg' }],
            }}>
                <RefreshCcw size={18} color={getPullColor()} strokeWidth={2.5} />
            </Animated.View>
            <Text style={{
                color: getPullColor(),
                fontSize: 14,
                fontWeight: '600',
                letterSpacing: -0.2,
            }}>
                {getPullText()}
            </Text>
        </Animated.View>
    );

    return (
        <Animated.View
            style={[styles.container, { backgroundColor: colors.background, opacity: screenFade }]}
            onTouchStart={onPullTouchStart}
            onTouchMove={onPullTouchMove}
            onTouchEnd={onPullTouchEnd}
        >
            <OfflineBanner />
            {PullToRefreshIndicator}
            <Animated.ScrollView
                ref={scrollViewRef}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: Platform.OS === 'web' ? 40 : 160 }]}
                showsVerticalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
            >
                {Header}


                {isViewingHistory && historicalRates && (
                    <View style={{ marginHorizontal: 20, marginBottom: 15 }}>
                        <CurrencyGap 
                            rates={historicalRates} 
                            isHistorical={true} 
                            selectedDate={selectedDate} 
                            onReset={resetToToday}
                        />
                    </View>
                )}


                {/* Global Date Selector - Float above cards */}
                {!isViewingHistory && hasData && (rates.nextRates?.usd || rates.nextRates?.eur) && (
                    <View style={{
                        marginLeft: 20,
                        marginRight: 20,
                        marginBottom: 10,
                        zIndex: 10
                    }}>
                        {/* Instructional text above buttons */}
                        <Text style={{
                            fontSize: 13,
                            fontWeight: '500',
                            color: colors.textSecondary,
                            marginBottom: 8,
                            textAlign: 'center',
                            paddingHorizontal: 20,
                        }}>
                            Selecciona la tasa de hoy o la siguiente tasa disponible
                        </Text>
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            alignSelf: 'stretch',
                            gap: 12,
                        }}>
                            {/* Today Button */}
                            <Pressable
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    setGlobalUseTomorrow(false);
                                }}
                                style={({ pressed, hovered }) => ({
                                    flex: 1,
                                    height: 52, // Reduced from 60
                                    paddingHorizontal: 12,
                                    borderRadius: 30,
                                    backgroundColor: !globalUseTomorrow ? '#02DF82' : colors.card,
                                    borderWidth: 1,
                                    borderColor: !globalUseTomorrow ? '#02DF82' : 'rgba(255,255,255,0.08)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    ...Platform.select({
                                        ios: {
                                            shadowColor: !globalUseTomorrow ? '#02DF82' : '#000',
                                            shadowOffset: { width: 0, height: !globalUseTomorrow ? 0 : 10 },
                                            shadowOpacity: !globalUseTomorrow ? 0.4 : 0.3,
                                            shadowRadius: !globalUseTomorrow ? 15 : 20,
                                        },
                                        android: { elevation: !globalUseTomorrow ? 8 : 8 },
                                        web: {
                                            boxShadow: !globalUseTomorrow
                                                ? '0 0 15px rgba(2, 223, 130, 0.4)'
                                                : '0 20px 40px -10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                                            transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                                            cursor: 'pointer',
                                        },
                                    }),
                                    transform: [{ scale: pressed ? 0.97 : 1 }],
                                })}
                            >
                                <Text style={{
                                    fontSize: 16,
                                    fontWeight: '600', // Matches rate cards
                                    color: !globalUseTomorrow ? '#121214' : '#FFFFFF',
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
                                    return {
                                        flex: 1,
                                        height: 52, // Reduced from 60
                                        paddingHorizontal: 12,
                                        borderRadius: 30,
                                        backgroundColor: globalUseTomorrow ? '#02DF82' : colors.card,
                                        borderWidth: 1,
                                        borderColor: globalUseTomorrow ? '#02DF82' : 'rgba(255,255,255,0.08)',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        ...Platform.select({
                                            ios: {
                                                shadowColor: globalUseTomorrow ? '#02DF82' : '#000',
                                                shadowOffset: { width: 0, height: globalUseTomorrow ? 0 : 10 },
                                                shadowOpacity: globalUseTomorrow ? 0.4 : 0.3,
                                                shadowRadius: globalUseTomorrow ? 15 : 20,
                                            },
                                            android: { elevation: globalUseTomorrow ? 8 : 8 },
                                            web: {
                                                boxShadow: globalUseTomorrow
                                                    ? '0 0 15px rgba(2, 223, 130, 0.4)'
                                                    : '0 20px 40px -10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                                                transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                                                cursor: 'pointer',
                                            },
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
                                                fontWeight: '600', // Matches rate cards
                                                color: globalUseTomorrow ? '#121214' : '#FFFFFF',
                                            }}>
                                                {friendlyDate}
                                            </Text>
                                            {shortDate && (
                                                <Text style={{
                                                    fontSize: 11,
                                                    fontWeight: '600',
                                                    color: globalUseTomorrow ? 'rgba(18, 18, 20, 0.7)' : (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'),
                                                    marginTop: -2,
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
                {hasData && (
                    <Text style={{
                        fontSize: 13,
                        fontWeight: isViewingHistory ? '700' : '500',
                        color: colors.textSecondary,
                        marginHorizontal: 20,
                        marginBottom: 12,
                        textAlign: 'center',
                        textTransform: isViewingHistory ? 'capitalize' : 'none',
                    }}>
                        {isViewingHistory ? (
                            selectedDate.toLocaleDateString('es-ES', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                            })
                        ) : (
                            'Presiona la tasa para calcular 👇'
                        )}
                    </Text>
                )}



                {/* Backdrop overlay - only visible when any card is expanded */}
                {isAnyCardExpanded && (
                    <Pressable
                        style={[StyleSheet.absoluteFill, { zIndex: 1 }]}
                        onPress={handleClickOutside}
                    />
                )}

                {/* Rate Cards Container */}
                <View 
                    onLayout={(event) => {
                        cardsContainerY.current = event.nativeEvent.layout.y;
                    }}
                    style={[
                        styles.cardsContainer,
                        isWideScreen && styles.cardsContainerWide,
                        isAnyCardExpanded && { zIndex: 2 }
                    ]}
                >
                    {hasData && !(isViewingHistory && (loadingHistorical || !historicalRates)) ? (
                        <>
                            {cardData.map((item, index) => (
                                <View
                                    key={item.id}
                                    ref={el => cardRefs.current[item.id] = el}
                                    style={[
                                        isWideScreen && styles.cardWide
                                    ]}
                                >
                                    <RateCard
                                        {...item}
                                        index={index}
                                        onPress={() => handleCardPress(item.id)}
                                        isExpanded={!!expandedCards[item.id]}
                                        globalUseTomorrow={globalUseTomorrow}
                                    />
                                </View>
                            ))}
                        </>
                    ) : (
                        <>
                            <SkeletonCard index={0} />
                            <SkeletonCard index={1} />
                            <SkeletonCard index={2} />
                        </>
                    )}
                </View>



                {/* Historical Chart & Brecha Module */}
                {hasData && (
                    <View style={[
                        { marginTop: 20, zIndex: isAnyCardExpanded ? 1 : 5 },
                        { opacity: (isViewingHistory && !historicalRates) || loadingHistorical ? 0.3 : 1 },
                        isWideScreen && { flexDirection: 'row', gap: 20, marginHorizontal: 0 }
                    ]}>
                        <View style={isWideScreen ? { flex: 2 } : { marginBottom: 20 }}>
                            <HistoricalChart 
                                historyData={rates.history} 
                                usdtData={usdtHistory}
                                currentRates={rates}
                                baseDate={isViewingHistory && historicalRates ? historicalRates.date : null}
                                onReset={isViewingHistory ? resetToToday : null}
                            />
                        </View>
                        
                        <View style={isWideScreen ? { flex: 1.2 } : null}>
                            <CurrencyGap 
                                rates={isViewingHistory && historicalRates ? {
                                    bcv: historicalRates.bcv,
                                    euro: historicalRates.euro,
                                    parallel: historicalRates.usdt
                                } : rates} 
                                isHistorical={isViewingHistory}
                                selectedDate={isViewingHistory && historicalRates ? new Date(historicalRates.date + 'T12:00:00') : selectedDate}
                                onReset={isViewingHistory ? resetToToday : null}
                            />
                        </View>
                    </View>
                )}

                {hasData && (
                    <View style={{ position: 'relative', zIndex: isAnyCardExpanded ? 10 : 0 }}>
                        {Footer}
                    </View>
                )}
            </Animated.ScrollView>

            {FloatingMenuOverlay}
            {DateTooltip}
            
            {/* <AdBanner style={styles.adBanner} /> */}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerContainer: {
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingBottom: 10,
        zIndex: 999999,
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        height: 80,
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 10,
    },
    headerLogo: {
        width: 240,
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

});

export default HomeScreen;


