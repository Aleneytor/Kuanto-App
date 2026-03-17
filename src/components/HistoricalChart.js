import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Platform, LayoutAnimation, UIManager, Animated, Easing } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency } from '../utils/formatting';
import { FONTS } from '../constants/typography';
import { Activity, Calendar, Clock, ChevronLeft, ChevronRight, RotateCcw, TrendingUp, TrendingDown } from 'lucide-react-native';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const RANGES = [
    { id: '7D', label: '7D', days: 7 },
    { id: '1M', label: '1M', days: 30 },
    { id: '1A', label: '1A', days: 365 },
    { id: 'ALL', label: 'TODO', days: 'all' },
];

const ASSETS = [
    { id: 'usd', label: 'BCV USD', index: 0 },
    { id: 'eur', label: 'BCV EUR', index: 1 },
    { id: 'parallel', label: 'USDT', index: 2 },
];

const RATE_CHANGE_DURATION = 500;
const RATE_CHANGE_EASING = Easing.bezier(0.16, 1, 0.3, 1);
const RATE_DIGIT_STAGGER = 15;
const CHART_ANIM_DURATION = 900;

const HistoricalChart = ({ historyData, usdtData, baseDate, onReset }) => {
    const { colors, isDark } = useTheme();
    const { width } = useWindowDimensions();
    
    const [selectedAsset, setSelectedAsset] = useState('usd');
    const [selectedRange, setSelectedRange] = useState('7D');
    const [pointingData, setPointingData] = useState(null);
    const [offsetDays, setOffsetDays] = useState(0);
    const [selectorWidth, setSelectorWidth] = useState(0);
    
    // Internal state to hold data during transition - important for glitch-free swap
    const [displayData, setDisplayData] = useState([]);
    const [isChartReady, setIsChartReady] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    
    const isMobile = width < 768;

    // Animation values
    const tabAnim = useRef(new Animated.Value(0)).current;
    const chartFadeAnim = useRef(new Animated.Value(1)).current;
    const rateCharacterAnimsRef = useRef([]);
    const previousRateRef = useRef('');
    const badgeShiftAnim = useRef(new Animated.Value(0)).current;
    const badgeVariantAnim = useRef(new Animated.Value(0)).current; // 0: zero, 1: pos, 2: neg
    const badgePulseAnim = useRef(new Animated.Value(1)).current;
    const lastDiffRef = useRef(0);

    const activeColor = useMemo(() => {
        if (selectedAsset === 'usd') return colors.bcvGreen;
        if (selectedAsset === 'eur') return colors.euroBlue;
        return colors.parallelOrange;
    }, [selectedAsset, colors]);

    // Handle tab animations
    useEffect(() => {
        const assetIndex = ASSETS.find(a => a.id === selectedAsset)?.index || 0;
        Animated.spring(tabAnim, {
            toValue: assetIndex,
            useNativeDriver: false,
            tension: 40,
            friction: 7
        }).start();
    }, [selectedAsset]);

    const handleAssetChange = (assetId) => {
        if (assetId === selectedAsset) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedAsset(assetId);
        setPointingData(null);
        setOffsetDays(0);
    };

    const handleRangeChange = (rangeId) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        Haptics.selectionAsync();
        setSelectedRange(rangeId);
        setPointingData(null);
        setOffsetDays(0);
    };

    const handleGoBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const rangeObj = RANGES.find(r => r.id === selectedRange) || RANGES[0];
        if (rangeObj.id === '7D') setOffsetDays(prev => prev + 7);
        else if (rangeObj.id === '1M') setOffsetDays(prev => prev + 30);
        else if (rangeObj.id === '1A') setOffsetDays(prev => prev + 365);
    };

    const handleGoForward = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const rangeObj = RANGES.find(r => r.id === selectedRange) || RANGES[0];
        let reduction = 0;
        if (rangeObj.id === '7D') reduction = 7;
        else if (rangeObj.id === '1M') reduction = 30;
        else if (rangeObj.id === '1A') reduction = 365;
        setOffsetDays(prev => Math.max(0, prev - reduction));
    };

    const handleResetOffset = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setOffsetDays(0);
        if (onReset) onReset();
    };

    const chartData = useMemo(() => {
        let sourceData = [];
        let valueKey = 'usd';
        if (selectedAsset === 'usd' || selectedAsset === 'eur') {
            sourceData = historyData || [];
            valueKey = selectedAsset;
        } else {
            sourceData = usdtData || [];
            valueKey = 'usdt';
        }
        if (!sourceData || sourceData.length === 0) return { data: [], stats: null };
        const now = new Date();
        const vetTime = now.getTime() - (4 * 60 * 60 * 1000);
        const todayAtStart = new Date(vetTime);
        const rangeObj = RANGES.find(r => r.id === selectedRange) || RANGES[0];
        let filteredData = sourceData;
        const baseCutoff = baseDate ? new Date(baseDate) : new Date(todayAtStart);
        baseCutoff.setDate(baseCutoff.getDate() - offsetDays);
        const baseCutoffStr = baseCutoff.toISOString().split('T')[0];
        filteredData = sourceData.filter(d => (d.date || d.created_at.split('T')[0]) <= baseCutoffStr);
        if (typeof rangeObj.days === 'number') {
            const rangeCutoff = new Date(baseCutoff);
            rangeCutoff.setDate(rangeCutoff.getDate() - rangeObj.days);
            const rangeCutoffStr = rangeCutoff.toISOString().split('T')[0];
            filteredData = filteredData.filter(d => (d.date || d.created_at.split('T')[0]) >= rangeCutoffStr);
        }
        let validData = filteredData.filter(d => d[valueKey] !== undefined && d[valueKey] > 0);
        if (validData.length === 0) return { data: [], stats: null };
        const currentVal = validData[0][valueKey];
        const oldestVal = validData[validData.length - 1][valueKey];
        let minVal = currentVal;
        let maxVal = currentVal;
        validData.forEach(d => {
            if (d[valueKey] < minVal) minVal = d[valueKey];
            if (d[valueKey] > maxVal) maxVal = d[valueKey];
        });
        const percentChange = oldestVal > 0 ? ((currentVal - oldestVal) / oldestVal) * 100 : 0;
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const formattedData = validData.map(d => {
            const dateStrRaw = d.date || d.created_at;
            const isoPart = dateStrRaw.split('T')[0];
            const [y, m, day] = isoPart.split('-');
            const dateObj = new Date(parseInt(y), parseInt(m)-1, parseInt(day));
            const displayHeaderDate = `${dayNames[dateObj.getDay()]}, ${day} ${monthNames[dateObj.getMonth()]}`;
            let itemTime = '';
            if (d.created_at && d.created_at.includes('T')) {
                const timeStr = d.created_at.split('T')[1].substring(0, 5);
                const [h, min] = timeStr.split(':');
                const hourNum = parseInt(h);
                const ampm = hourNum >= 12 ? 'PM' : 'AM';
                const hour12 = hourNum % 12 || 12;
                itemTime = `${hour12}:${min} ${ampm}`;
            }
            
            return {
                value: parseFloat(d[valueKey]),
                dateStr: `${day}/${m}/${y}`,
                displayHeaderDate: displayHeaderDate,
                rawDate: dateStrRaw,
                time: itemTime
            };
        }).reverse();
        return {
            data: formattedData,
            stats: {
                current: currentVal,
                min: minVal,
                max: maxVal,
                change: percentChange,
                startDate: formattedData[0].dateStr,
                endDate: formattedData[formattedData.length - 1].dateStr,
                isNavigated: offsetDays > 0,
                oldestVal: oldestVal
            }
        };
    }, [historyData, usdtData, selectedAsset, selectedRange, offsetDays, baseDate]);

    // Handle data updates with safe transition logic
    useEffect(() => {
        if (!chartData.data || chartData.data.length === 0) return;

        // On first real data load, just set it
        if (displayData.length === 0) {
            setDisplayData(chartData.data);
            setIsChartReady(true);
            return;
        }

        // Start transition
        setIsTransitioning(true);
        Animated.timing(chartFadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
            easing: Easing.out(Easing.quad)
        }).start(() => {
            // Unmount current chart to reset it
            setIsChartReady(false);
            
            // Allow the unmount to settle
            setTimeout(() => {
                setDisplayData(chartData.data);
                setIsChartReady(true);
                
                // Fade in immediately
                Animated.timing(chartFadeAnim, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                    easing: Easing.in(Easing.quad)
                }).start(() => {
                    setIsTransitioning(false);
                });
            }, 50);
        });
    }, [chartData.data]);

    // Handle badge shift animation
    useEffect(() => {
        Animated.spring(badgeShiftAnim, {
            toValue: pointingData ? 1 : 0,
            useNativeDriver: true,
            tension: 50,
            friction: 8
        }).start();
    }, [pointingData]);

    const stats = chartData.stats;
    const isPositive = stats ? stats.change > 0 : false;
    const isZero = stats ? stats.change === 0 : true;

    // Handle badge variant and pulse animation
    const currentDiff = useMemo(() => {
        const currentVal = pointingData ? pointingData.value : (stats?.current || 0);
        const oldestVal = stats?.oldestVal || 0;
        return oldestVal > 0 ? ((currentVal - oldestVal) / oldestVal) * 100 : 0;
    }, [pointingData, stats]);

    useEffect(() => {
        const isZeroDiff = currentDiff === 0;
        const isPos = currentDiff > 0;
        const targetVariant = isZeroDiff ? 0 : (isPos ? 1 : 2);

        // Animate color transition
        Animated.spring(badgeVariantAnim, {
            toValue: targetVariant,
            useNativeDriver: false,
            tension: 40,
            friction: 8
        }).start();

        // Pulse if we moved from zero to non-zero or back (organic feedback)
        const wasZero = lastDiffRef.current === 0;
        if (wasZero !== isZeroDiff) {
            Animated.sequence([
                Animated.timing(badgePulseAnim, { toValue: 1.12, duration: 150, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
                Animated.spring(badgePulseAnim, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true })
            ]).start();
        }
        lastDiffRef.current = currentDiff;
    }, [currentDiff]);

    // Number character animation logic
    const currentRateText = formatCurrency(pointingData ? pointingData.value : (stats?.current || 0));
    const rateDisplayCharacters = [...currentRateText.split(''), ' ', 'B', 's', '.'];
    
    useEffect(() => {
        if (previousRateRef.current === currentRateText) return;
        previousRateRef.current = currentRateText;
        
        while (rateCharacterAnimsRef.current.length < rateDisplayCharacters.length) {
            rateCharacterAnimsRef.current.push(new Animated.Value(0));
        }

        const animsToTrigger = rateCharacterAnimsRef.current.slice(0, rateDisplayCharacters.length);
        animsToTrigger.forEach(anim => anim.setValue(0));

        Animated.stagger(
            RATE_DIGIT_STAGGER,
            animsToTrigger.map(anim => Animated.timing(anim, {
                toValue: 1,
                duration: RATE_CHANGE_DURATION,
                easing: RATE_CHANGE_EASING,
                useNativeDriver: true
            }))
        ).start();
    }, [currentRateText]);

    const handlePointerUpdate = useCallback((items) => {
        if (!items || !items[0]) {
            if (pointingData !== null) setPointingData(null);
            return;
        }
        const item = items[0];
        if (!pointingData || pointingData.rawDate !== item.rawDate) {
            setPointingData({
                value: item.value,
                date: item.displayHeaderDate,
                time: item.time,
                rawDate: item.rawDate
            });
        }
    }, [pointingData]);

    const chartConfig = {
        width: width - (isMobile ? 54 : 96),
        height: 190,
        color: activeColor,
        thickness: 5,
        isAnimated: true,
        animateOnDataChange: true,
        animationDuration: CHART_ANIM_DURATION,
        onDataChangeAnimationDuration: CHART_ANIM_DURATION,
        autoCenterPointer: true,
        lineShadow: true,
        shadowColor: activeColor,
        hideRules: false,
        rulesType: 'solid',
        rulesColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        yAxisColor: 'transparent',
        xAxisColor: 'transparent',
        yAxisTextStyle: { color: colors.textSecondary, fontSize: 10, fontFamily: FONTS.medium },
        hideDataPoints: true,
        curved: false,
        adjustToWidth: true,
        startFillColor: activeColor,
        endFillColor: activeColor,
        startOpacity: 0.15,
        endOpacity: 0.0,
        yAxisOffset: stats ? Math.floor(stats.min * 0.98) : 0,
        yAxisSide: 'right',
        noOfSections: 3,
        pointerConfig: {
            pointerStripHeight: 180,
            pointerStripColor: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
            pointerStripWidth: 2,
            pointerStripUptoDataPoint: false,
            pointerColor: activeColor,
            radius: 0,
            pointerLabelWidth: 1,
            pointerLabelHeight: 1,
            activatePointersOnLongPress: false,
            autoAdjustPointerLabelPosition: false,
            hidePointerLabel: false,
            pointerLabelComponent: (items) => {
                handlePointerUpdate(items);
                return <View style={{ width: 1 }} />;
            },
            onResponderGrant: () => Haptics.selectionAsync(),
            pointerVanishDelay: 200,
        }
    };

    const tabTranslateX = tabAnim.interpolate({
        inputRange: [0, 1, 2],
        outputRange: [0, (selectorWidth - 8) / 3, ((selectorWidth - 8) / 3) * 2]
    });

    const activeTabBg = tabAnim.interpolate({
        inputRange: [0, 1, 2],
        outputRange: [colors.bcvGreen, colors.euroBlue, colors.parallelOrange]
    });

    const styles = StyleSheet.create({
        container: {
            backgroundColor: colors.card,
            borderRadius: 30,
            padding: isMobile ? 16 : 24,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
            ...Platform.select({
                ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },
                android: { elevation: 8 },
                web: { boxShadow: '0 20px 40px -10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)' },
            }),
            overflow: 'hidden',
        },
        headerLabel: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, justifyContent: 'space-between' },
        headerTitleGroup: { flexDirection: 'row', alignItems: 'center' },
        headerIcon: { marginRight: 10 },
        headerTitle: { color: colors.textSecondary, fontSize: 16, fontFamily: FONTS.bold, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
        pointingInfoContainer: { marginBottom: 4, minHeight: 20 },
        pointingDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
        pointingDateText: { color: activeColor, fontSize: 13, fontFamily: FONTS.bold, fontWeight: '800' },
        pointingTimeText: { color: colors.textSecondary, fontSize: 11, fontFamily: FONTS.medium },
        assetSelector: { 
            flexDirection: 'row', 
            backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.04)', 
            padding: 4, 
            borderRadius: 16, 
            marginBottom: 20,
            position: 'relative',
        },
        slidingIndicator: {
            position: 'absolute',
            top: 4,
            bottom: 4,
            left: 4,
            width: (selectorWidth - 8) / 3,
            borderRadius: 12,
            zIndex: 0
        },
        assetPill: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12, zIndex: 1 },
        assetPillText: { fontSize: 13, fontFamily: FONTS.bold, fontWeight: '800', color: colors.textSecondary },
        statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
        rateValueRow: { flexDirection: 'row', alignItems: 'flex-end' },
        rateCharacter: {
            fontSize: 34,
            fontFamily: FONTS.bold,
            fontWeight: '800',
            color: colors.textPrimary,
        },
        suffixCharacter: {
            fontSize: 16,
            fontFamily: FONTS.bold,
            fontWeight: '800',
            color: colors.textSecondary,
            marginBottom: 4,
        },
        subStatsRow: { flexDirection: 'column', gap: 4, alignItems: 'flex-end', justifyContent: 'center' },
        subStatItem: { 
            flexDirection: 'row', 
            alignItems: 'center', 
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', 
            paddingHorizontal: 10, 
            paddingVertical: 4, 
            borderRadius: 6,
            gap: 6,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.05)',
            justifyContent: 'space-between',
            minWidth: 90
        },
        subStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontFamily: FONTS.bold, textTransform: 'uppercase' },
        subStatValue: { fontSize: 12, color: '#FFFFFF', fontFamily: FONTS.bold },
        topInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2, height: 30, overflow: 'hidden' },
        badgeContainer: { flexDirection: 'row', alignItems: 'center', height: '100%', justifyContent: 'center' },
        changeBadgeActive: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 100, alignSelf: 'center', borderWidth: 1 },
        changeText: { fontSize: 13, fontFamily: FONTS.bold, fontWeight: '700', marginLeft: 4 },
        chartArea: { 
            marginTop: 25, 
            marginBottom: 8, 
            alignItems: 'center', 
            height: 210, 
            justifyContent: 'center', 
            width: '100%',
            overflow: 'hidden',
        },
        rangeFilters: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 20 },
        rangePill: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 14, backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderWidth: 1, borderColor: 'transparent' },
        rangePillActive: { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', borderColor: 'rgba(255,255,255,0.1)' },
        rangePillText: { fontSize: 12, fontFamily: FONTS.bold, fontWeight: '800', color: colors.textSecondary },
        footerActions: { gap: 12 },
        navigationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
        navSquare: {
            padding: 12,
            borderRadius: 12,
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.05)',
        },
        navTextContainer: {
            flex: 1,
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.03)',
        },
        navigationText: { fontSize: 12, fontFamily: FONTS.bold, fontWeight: '800', color: colors.textPrimary },
        resetButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 12,
            borderRadius: 16,
            backgroundColor: `${activeColor}10`,
            borderWidth: 1,
            borderColor: `${activeColor}40`,
            gap: 8,
        },
        resetText: { fontSize: 13, fontFamily: FONTS.bold, color: activeColor },
        timeLimitText: { fontSize: 13, fontFamily: FONTS.bold, fontWeight: '800', color: colors.textSecondary, textAlign: 'center', opacity: 0.8, paddingVertical: 12 }
    });

    return (
        <View style={styles.container}>
            <View style={styles.headerLabel}>
                <View style={styles.headerTitleGroup}>
                    <View style={styles.headerIcon}>
                        <Activity size={18} color={activeColor} />
                    </View>
                    <Text style={styles.headerTitle}>Actividad Histórica</Text>
                </View>
            </View>

            <View 
                style={styles.assetSelector}
                onLayout={(e) => setSelectorWidth(e.nativeEvent.layout.width)}
            >
                {selectorWidth > 0 && (
                    <Animated.View 
                        style={[
                            styles.slidingIndicator, 
                            { 
                                transform: [{ translateX: tabTranslateX }],
                                backgroundColor: activeTabBg
                            }
                        ]} 
                    />
                )}
                {ASSETS.map((asset) => {
                    const isActive = selectedAsset === asset.id;
                    return (
                        <TouchableOpacity key={asset.id} activeOpacity={0.8} onPress={() => handleAssetChange(asset.id)} style={styles.assetPill}>
                            <Text style={[styles.assetPillText, isActive && { color: '#1A1A1A' }]}>{asset.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {stats && (
                <View style={styles.statsRow}>
                    <View style={{ flex: 1 }}>
                        <View style={styles.topInfoRow}>
                            <Animated.View 
                                style={[
                                    styles.pointingInfoContainer,
                                    {
                                        opacity: badgeShiftAnim,
                                        transform: [{
                                            translateX: badgeShiftAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [-10, 0]
                                            })
                                        }],
                                        width: badgeShiftAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0, 85] // Reduced gap for tighter look
                                        })
                                    }
                                ]}
                            >
                                {pointingData && (
                                    <View style={styles.pointingDateRow}>
                                        <Calendar size={12} color={activeColor} />
                                        <Text style={styles.pointingDateText}>{pointingData.date.split(',')[1].trim()}</Text>
                                    </View>
                                )}
                            </Animated.View>

                            <Animated.View 
                                style={[
                                    styles.badgeContainer,
                                    { transform: [{ scale: badgePulseAnim }] }
                                ]}
                            >
                                <Animated.View style={[
                                    styles.changeBadgeActive, 
                                    { 
                                        backgroundColor: badgeVariantAnim.interpolate({
                                            inputRange: [0, 1, 2],
                                            outputRange: ['rgba(128,128,128,0.1)', 'rgba(0, 227, 120, 0.15)', 'rgba(255, 59, 48, 0.15)']
                                        }),
                                        borderColor: badgeVariantAnim.interpolate({
                                            inputRange: [0, 1, 2],
                                            outputRange: ['rgba(128,128,128,0.2)', 'rgba(0, 227, 120, 0.2)', 'rgba(255, 59, 48, 0.2)']
                                        }),
                                        borderWidth: 1
                                    }
                                ]}>
                                    {currentDiff !== 0 && (
                                        <View style={{ marginRight: 4 }}>
                                            {currentDiff > 0 ? (
                                                <TrendingUp size={14} color="#00E378" />
                                            ) : (
                                                <TrendingDown size={14} color="#FF3B30" />
                                            )}
                                        </View>
                                    )}
                                    <Animated.Text style={[
                                        styles.changeText, 
                                        { 
                                            color: badgeVariantAnim.interpolate({
                                                inputRange: [0, 1, 2],
                                                outputRange: [colors.textSecondary, '#00E378', '#FF3B30']
                                            }),
                                            marginLeft: 0 // Handled by icon View
                                        }
                                    ]}>
                                        {currentDiff > 0 ? '+' : ''}{currentDiff.toFixed(2)}%
                                    </Animated.Text>
                                </Animated.View>
                            </Animated.View>
                        </View>

                        <View style={styles.rateValueRow}>
                            {rateDisplayCharacters.map((char, i) => {
                                const isSuffix = char === 'B' || char === 's' || char === '.';
                                return (
                                    <Animated.Text
                                        key={`char-${i}`}
                                        style={[
                                            isSuffix ? styles.suffixCharacter : styles.rateCharacter,
                                            {
                                                opacity: rateCharacterAnimsRef.current[i] || 0,
                                                transform: [{
                                                    translateY: (rateCharacterAnimsRef.current[i] || new Animated.Value(0)).interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [10, 0]
                                                    })
                                                }],
                                                color: pointingData ? activeColor : (isSuffix ? colors.textSecondary : colors.textPrimary)
                                            }
                                        ]}
                                    >
                                        {char}
                                    </Animated.Text>
                                );
                            })}
                        </View>
                    </View>
                    <View style={styles.subStatsRow}>
                        <View style={styles.subStatItem}>
                            <Text style={styles.subStatLabel}>Mín</Text>
                            <Text style={styles.subStatValue}>{formatCurrency(stats.min)}</Text>
                        </View>
                        <View style={styles.subStatItem}>
                            <Text style={styles.subStatLabel}>Máx</Text>
                            <Text style={styles.subStatValue}>{formatCurrency(stats.max)}</Text>
                        </View>
                    </View>
                </View>
            )}

            <View style={{ pointerEvents: 'auto' }}>
                <Animated.View style={[styles.chartArea, { opacity: chartFadeAnim }]}>
                    {isChartReady && displayData.length > 0 ? (
                        <LineChart 
                            key={`chart-${selectedAsset}-${selectedRange}-${offsetDays}-${baseDate || 'today'}`} 
                            data={displayData} 
                            areaChart 
                            {...chartConfig} 
                        />
                    ) : (
                        <View style={{ height: 180 }} /> // Placeholder to prevent jump
                    )}
                    {!isChartReady && displayData.length === 0 && (
                        <Text style={{color: colors.textSecondary}}>Sin datos disponibles</Text>
                    )}
                </Animated.View>
            </View>

            <View style={styles.rangeFilters}>
                {RANGES.map((range) => {
                    const isActive = selectedRange === range.id;
                    return (
                        <TouchableOpacity key={range.id} activeOpacity={0.7} onPress={() => handleRangeChange(range.id)} style={[styles.rangePill, isActive && styles.rangePillActive]}>
                            <Text style={[styles.rangePillText, isActive && { color: activeColor, fontFamily: FONTS.bold }]}>{range.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View style={styles.footerActions}>
                {selectedRange !== 'ALL' ? (
                    <View style={styles.navigationRow}>
                        <TouchableOpacity style={styles.navSquare} onPress={handleGoBack}>
                            <ChevronLeft size={20} color={activeColor} />
                        </TouchableOpacity>
                        
                        <View style={styles.navTextContainer}>
                            <Text style={styles.navigationText}>
                                {stats ? `${stats.startDate} — ${stats.endDate}` : '...'}
                            </Text>
                        </View>
                        
                        <TouchableOpacity 
                            style={styles.navSquare} 
                            onPress={handleGoForward} 
                            disabled={offsetDays === 0}
                        >
                            <ChevronRight 
                                size={20} 
                                color={offsetDays === 0 ? colors.textSecondary : activeColor} 
                                style={{ opacity: offsetDays === 0 ? 0.2 : 1 }} 
                            />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <Text style={styles.timeLimitText}>No podemos viajar mas atras en el tiempo :c</Text>
                )}

                {offsetDays > 0 || baseDate ? (
                    <TouchableOpacity style={styles.resetButton} onPress={handleResetOffset} activeOpacity={0.7}>
                        <RotateCcw size={16} color={activeColor} />
                        <Text style={styles.resetText}>{baseDate ? 'Ver Hoy' : 'Volver al presente'}</Text>
                    </TouchableOpacity>
                ) : null}
            </View>
        </View>
    );
};

export default HistoricalChart;
