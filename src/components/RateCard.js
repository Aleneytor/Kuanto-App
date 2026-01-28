import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Share as NativeShare, Animated, TextInput, Platform, Pressable, useWindowDimensions } from 'react-native';
import { Calendar, Clock, TrendingUp as Up, TrendingDown as Down, Share2 as ShareIcon, ArrowLeftRight, Copy, Check, RotateCcw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/formatting';
import { FONTS } from '../constants/typography';

const RateCard = ({ title, rate, color, icon, nextRate, nextDate, nextRawDate, lastUpdated, change, onPress, index = 0, isExpanded = false, id, isHistorical = false, globalUseTomorrow = false }) => {
    const { colors, isDark } = useTheme();
    const { showToast } = useToast();
    const { width } = useWindowDimensions();
    const isPositive = change > 0;
    // Detect if it's a mobile screen (< 768px)
    const isMobile = width < 768;

    // Calculator state
    const [foreignAmount, setForeignAmount] = useState('1,00');
    const [bsAmount, setBsAmount] = useState('');
    const [isSwapped, setIsSwapped] = useState(false);
    const [copiedForeign, setCopiedForeign] = useState(false);
    const [copiedBs, setCopiedBs] = useState(false);
    // Removed: Local useTomorrow state - now controlled by parent via globalUseTomorrow prop

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    // Determine if this card has next rates available
    const hasNextRates = nextRate && (id === 'usd' || id === 'eur');

    // Get the current rate based on globalUseTomorrow toggle
    const getCurrentRate = () => {
        if (globalUseTomorrow && hasNextRates) {
            return nextRate;
        }
        return rate;
    };

    const currentRate = getCurrentRate();

    const getFriendlyNextDate = () => {
        if (!nextRawDate) return '';
        const now = new Date();
        const vetTime = now.getTime() - (4 * 60 * 60 * 1000);
        const today = new Date(vetTime);
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const tomorrowISO = tomorrow.toISOString().split('T')[0];
        if (nextRawDate === tomorrowISO) {
            return 'Mañana';
        }
        const daysArr = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const [y, m, d] = nextRawDate.split('-');
        const nextDateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        return daysArr[nextDateObj.getDay()];
    };

    useEffect(() => {
        const delay = index * 100;
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                delay,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 400,
                delay,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                delay,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    // Reset calculator when collapsed
    useEffect(() => {
        if (!isExpanded) {
            setForeignAmount('1,00');
            setBsAmount('');
            setIsSwapped(false);
        } else {
            // Initialize with 1.00
            handleForeignChange('100');
        }
    }, [isExpanded]);

    const formatCurrencyInput = (value) => {
        if (value === 0 || isNaN(value)) return '';
        let num = parseFloat(value);
        let [integer, decimal] = num.toFixed(2).split('.');
        integer = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        return `${integer},${decimal}`;
    };

    const handleForeignChange = (val) => {
        const digits = val.replace(/\D/g, '');
        if (digits === '' || parseInt(digits) === 0) {
            setForeignAmount('');
            setBsAmount('');
            return;
        }
        const rawValue = parseFloat(digits) / 100;
        setForeignAmount(formatCurrencyInput(rawValue));
        if (rawValue > 0) {
            setBsAmount(formatCurrencyInput(rawValue * currentRate));
        }
    };

    const handleBsChange = (val) => {
        const digits = val.replace(/\D/g, '');
        if (digits === '' || parseInt(digits) === 0) {
            setBsAmount('');
            setForeignAmount('');
            return;
        }
        const rawValue = parseFloat(digits) / 100;
        setBsAmount(formatCurrencyInput(rawValue));
        if (rawValue > 0) {
            setForeignAmount(formatCurrencyInput(rawValue / currentRate));
        }
    };

    // Recalculate when globalUseTomorrow changes
    useEffect(() => {
        if (!foreignAmount || !isExpanded) return;
        const digits = foreignAmount.replace(/\D/g, '');
        if (digits) {
            const rawValue = parseFloat(digits) / 100;
            if (rawValue > 0) {
                setBsAmount(formatCurrencyInput(rawValue * currentRate));
            }
        }
    }, [globalUseTomorrow]);

    const copyToClipboard = async (text, type) => {
        if (!text) return;
        await Clipboard.setStringAsync(text);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (type === 'foreign') {
            setCopiedForeign(true);
            setTimeout(() => setCopiedForeign(false), 2000);
        } else {
            setCopiedBs(true);
            setTimeout(() => setCopiedBs(false), 2000);
        }
    };

    const handleReset = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setForeignAmount('1,00');
        setBsAmount(formatCurrencyInput(1.00 * currentRate));
    };

    const handleShare = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const today = new Date();
            const formattedToday = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

            // Determine mode: Share Calculation vs Share Rate
            // Share calculation if expanded AND has valid amounts
            const isCalculatorMode = isExpanded &&
                foreignAmount && foreignAmount !== '0,00' &&
                bsAmount && bsAmount !== '0,00';

            let message = '';

            if (isCalculatorMode) {
                let currencyName = id.toUpperCase();
                if (id === 'parallel' || title.toUpperCase().includes('USDT')) currencyName = 'USDT';
                else if (id === 'usd') currencyName = 'USD';
                else if (id === 'eur') currencyName = 'EUR';

                const currencyIcon = id === 'eur' ? '🇪🇺' : (currencyName === 'USDT' ? '🪙' : '🇺🇸');
                const dateStr = globalUseTomorrow && hasNextRates ?
                    `${getFriendlyNextDate()} (${nextDate.substring(0, 5)})` :
                    `Hoy ${formattedToday}`;

                message = `💱 *Kuanto*\n\n${currencyIcon} *${foreignAmount} ${currencyName}*  ➡️  🇻🇪 *${bsAmount} Bs*\n\n📊 Tasa: *${formatCurrency(currentRate)} Bs*\n📅 ${dateStr}\n\n_Enviado desde kuanto.online_ 📲`;
            } else {
                let shareTitle = title;
                if (id === 'usd') shareTitle = 'BCV USD';
                else if (id === 'eur') shareTitle = 'BCV EUR';
                else if (id === 'parallel') shareTitle = 'Promedio USDT';

                message = `💱 *Kuanto*\n\n📊 *${shareTitle}*\n💰 *${formatCurrency(currentRate)} Bs*` +
                    (change && change !== 0 ? ` (${change > 0 ? '+' : ''}${change.toFixed(2)}%)` : '') +
                    `\n\n` +
                    (nextRate ? `🔮 Mañana: *${formatCurrency(nextRate)} Bs*\n` : '') +
                    `📅 ${formattedToday}\n\n_Enviado desde kuanto.online_ 📲`;
            }

            // Desktop/Web: Copy to clipboard or use Navigator Share on Mobile
            if (Platform.OS === 'web') {
                if (isMobile && navigator.share) {
                    try {
                        await navigator.share({
                            title: 'Kuanto App',
                            text: message,
                        });
                    } catch (error) {
                        // If user cancels or share fails, fallback to clipboard if not AbortError
                        if (error.name !== 'AbortError') {
                            await Clipboard.setStringAsync(message);
                            showToast('Tasa Copiada Exitosamente', 'success');
                        }
                    }
                } else {
                    await Clipboard.setStringAsync(message);
                    showToast('Tasa Copiada Exitosamente', 'success');
                }
            } else {
                // Mobile: Use native share
                await NativeShare.share({ message });
            }
        } catch (error) {
            console.error(error);
        }
    };

    const getNextRateLabel = () => {
        if (!nextRawDate) return "Próxima tasa";
        const now = new Date();
        const vetTime = now.getTime() - (4 * 60 * 60 * 1000);
        const today = new Date(vetTime);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const tomorrowISO = tomorrow.toISOString().split('T')[0];
        return nextRawDate === tomorrowISO ? "Para mañana" : "Próxima tasa";
    };

    const getSymbol = () => {
        if (id === 'eur') return '€';
        return '$';
    };

    const getCurrencyLabel = () => {
        if (id === 'parallel') return 'USDT';
        return id.toUpperCase();
    };

    const styles = StyleSheet.create({
        card: {
            backgroundColor: colors.card,
            borderRadius: 30,
            padding: 24,
            marginBottom: 20,
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
                },
            }),
            position: 'relative',
            overflow: 'hidden',
        },
        cardHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 12,
        },
        iconContainer: {
            padding: 8,
            borderRadius: 10,
            marginRight: 12,
        },
        cardTitle: {
            fontSize: 16,
            color: colors.textSecondary,
            fontWeight: '600',
            fontFamily: FONTS.semiBold,
        },
        rateRow: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: 12,
        },
        rateText: {
            fontSize: 48,
            fontWeight: '800',
            fontFamily: FONTS.bold,
            letterSpacing: -1.5,
        },
        changeBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 100,
            marginBottom: 12,
        },
        changeText: {
            fontSize: 12,
            fontWeight: '700',
            marginLeft: 4,
            fontFamily: FONTS.bold,
        },
        footerInfo: {
            marginTop: 4,
            minHeight: 72, // Ensure consistent card height across USD/EUR/USDT
        },
        badge: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 8,
            alignSelf: 'flex-start',
            marginBottom: 8,
        },
        badgeText: {
            color: colors.textSecondary,
            fontSize: 13,
            fontWeight: '500',
        },
        shareButton: {
            padding: 8,
        },
        // Tomorrow toggle styles
        tomorrowToggle: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: 'transparent',
        },
        tomorrowToggleSubtitle: {
            color: colors.textSecondary,
            fontSize: 9,
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginBottom: -2,
        },
        tomorrowToggleText: {
            color: colors.textSecondary,
            fontSize: 12,
            fontWeight: '700',
        },
        // Calculator styles
        converterBox: {
            backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
            borderRadius: 24,
            padding: 20,
            marginTop: 20,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        },
        inputSection: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 8,
        },
        inputWrapper: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
        },
        inputLabel: {
            color: colors.textSecondary,
            fontSize: 20,
            fontWeight: '600',
            width: 35,
        },
        input: {
            flex: 1,
            color: colors.textPrimary,
            fontSize: 22,
            fontWeight: '800',
            fontFamily: FONTS.bold,
            padding: 0,
        },
        copyButton: {
            padding: 10,
            borderRadius: 10,
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
            marginHorizontal: 8,
        },
        currencySubLabel: {
            color: colors.textSecondary,
            fontSize: 12,
            fontWeight: '700',
            letterSpacing: 1,
            width: 50,
            textAlign: 'right',
        },
        divider: {
            height: 1,
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
            marginVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
        },
        swapButton: {
            backgroundColor: colors.card,
            padding: 8,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.glassBorder,
        },
        rateInfo: {
            color: colors.textSecondary,
            fontSize: 12,
            marginTop: 16,
            textAlign: 'center',
            marginBottom: 4,
        },
        actionRow: {
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 20,
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
            borderRadius: 16,
            padding: 4,
            alignSelf: 'center',
            gap: 4
        },
        actionButton: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 10,
            paddingHorizontal: 16,
            gap: 8,
            borderRadius: 12,
        },
        actionDivider: {
            width: 1,
            height: 20,
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        },
        actionButtonText: {
            color: colors.textSecondary,
            fontSize: 14,
            fontWeight: '600',
        }
    });

    const handleCardPress = (e) => {
        e.stopPropagation();
        onPress();
    };

    const content = (hovered = false, pressed = false) => (
        <View style={[
            styles.card,
            // Only apply hover effects on non-mobile screens (>= 768px)
            !isMobile && hovered && {
                borderWidth: 2,
                borderColor: `${color}80`,
                backgroundColor: isDark
                    ? `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, 0.1)`
                    : colors.card,
                shadowOpacity: 0,
                elevation: 0,
            },
            pressed && {
                opacity: 0.95,
            }
        ]}>
            {Platform.OS === 'web' && (
                <View style={{
                    position: 'absolute',
                    top: '-50%',
                    left: '-50%',
                    width: '200%',
                    height: '200%',
                    background: `radial-gradient(circle at 50% 50%, ${color}15 0%, transparent 60%)`,
                    pointerEvents: 'none',
                    zIndex: 0
                }} />
            )}
            <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, zIndex: 1 }}>
                    <View style={[styles.iconContainer, { backgroundColor: `${color}15`, borderRadius: 14, padding: 10 }]}>
                        {icon}
                    </View>
                    <Text style={[styles.cardTitle, { fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700' }]}>{title}</Text>
                </View>

                {!isExpanded && (
                    <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
                        <ShareIcon size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.rateRow}>
                <View>
                    <Text style={[styles.rateText, {
                        color: color,
                        textShadowColor: color,
                        textShadowOffset: { width: 0, height: 0 },
                        textShadowRadius: 10,
                        ...(Platform.OS === 'web' && { textShadow: `0 0 25px ${color}60` })
                    }]}>{formatCurrency(currentRate)} <Text style={{ fontSize: 20, opacity: 0.7 }}>Bs</Text></Text>
                    {globalUseTomorrow && hasNextRates && (
                        <Text style={{ color: color, fontSize: 12, fontWeight: '600', marginTop: 2 }}>
                            {getFriendlyNextDate()}
                        </Text>
                    )}
                </View>
                {change !== undefined && change !== 0 && (
                    <View style={[styles.changeBadge, { backgroundColor: isPositive ? 'rgba(0, 227, 120, 0.15)' : 'rgba(255, 59, 48, 0.15)', borderWidth: 1, borderColor: isPositive ? 'rgba(0, 227, 120, 0.2)' : 'rgba(255, 59, 48, 0.2)' }]}>
                        {isPositive ? <Up size={14} color="#00E378" /> : <Down size={14} color="#FF3B30" />}
                        <Text style={[styles.changeText, { color: isPositive ? '#00E378' : '#FF3B30', fontSize: 13 }]}>
                            {Math.abs(change).toFixed(2)}%
                        </Text>
                    </View>
                )}
            </View>

            {!isExpanded ? (
                <View style={styles.footerInfo}>
                    {nextRate ? (
                        <View style={styles.badge}>
                            <Calendar size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                            <Text style={styles.badgeText}>
                                {getNextRateLabel()} ({nextDate}): <Text style={{ color: colors.textPrimary }}>{formatCurrency(nextRate)} Bs</Text>
                            </Text>
                        </View>
                    ) : (
                        <View style={[styles.badge, { opacity: 0 }]}>
                            <Calendar size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                            <Text style={styles.badgeText}>
                                Próxima tasa (00/00/0000): 000,00 Bs
                            </Text>
                        </View>
                    )}

                    {lastUpdated && (
                        <View style={styles.badge}>
                            <Clock size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                            <Text style={styles.badgeText}>
                                Actualizado: <Text style={{ color: colors.textPrimary }}>{lastUpdated}</Text>
                            </Text>
                        </View>
                    )}
                </View>
            ) : (
                <>
                    <Pressable onPress={(e) => e.stopPropagation()} style={{ cursor: 'auto' }}>
                        <View style={styles.converterBox}>
                            {!isSwapped ? (
                                <>
                                    {/* Foreign Input */}
                                    <View style={styles.inputSection}>
                                        <View style={styles.inputWrapper}>
                                            <Text style={styles.inputLabel}>{getSymbol()}</Text>
                                            <TextInput
                                                style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' }]}
                                                value={foreignAmount}
                                                onChangeText={handleForeignChange}
                                                keyboardType="number-pad"
                                                placeholder="0.00"
                                                placeholderTextColor={colors.textSecondary}
                                                selectTextOnFocus={true}
                                            />
                                        </View>
                                        <TouchableOpacity
                                            style={[styles.copyButton, copiedForeign && { backgroundColor: `${color}1A` }]}
                                            onPress={() => copyToClipboard(foreignAmount, 'foreign')}
                                        >
                                            {copiedForeign ? <Check size={16} color={color} /> : <Copy size={16} color={colors.textSecondary} />}
                                        </TouchableOpacity>
                                        <Text style={styles.currencySubLabel}>{getCurrencyLabel()}</Text>
                                    </View>

                                    <View style={styles.divider}>
                                        <TouchableOpacity onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                            setIsSwapped(!isSwapped);
                                        }} style={styles.swapButton}>
                                            <ArrowLeftRight color={colors.textPrimary} size={16} />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Bs Input */}
                                    <View style={styles.inputSection}>
                                        <View style={styles.inputWrapper}>
                                            <Text style={styles.inputLabel}>Bs</Text>
                                            <TextInput
                                                style={[styles.input, { color: color }, Platform.OS === 'web' && { outlineStyle: 'none' }]}
                                                value={bsAmount}
                                                onChangeText={handleBsChange}
                                                keyboardType="number-pad"
                                                placeholder="0.00"
                                                placeholderTextColor={colors.textSecondary}
                                                selectTextOnFocus={true}
                                            />
                                        </View>
                                        <TouchableOpacity
                                            style={[styles.copyButton, copiedBs && { backgroundColor: `${color}1A` }]}
                                            onPress={() => copyToClipboard(bsAmount, 'bs')}
                                        >
                                            {copiedBs ? <Check size={16} color={color} /> : <Copy size={16} color={colors.textSecondary} />}
                                        </TouchableOpacity>
                                        <Text style={styles.currencySubLabel}>VES</Text>
                                    </View>
                                </>
                            ) : (
                                <>
                                    {/* Bs Input (Swapped) */}
                                    <View style={styles.inputSection}>
                                        <View style={styles.inputWrapper}>
                                            <Text style={styles.inputLabel}>Bs</Text>
                                            <TextInput
                                                style={[styles.input, { color: color }, Platform.OS === 'web' && { outlineStyle: 'none' }]}
                                                value={bsAmount}
                                                onChangeText={handleBsChange}
                                                keyboardType="number-pad"
                                                placeholder="0.00"
                                                placeholderTextColor={colors.textSecondary}
                                                selectTextOnFocus={true}
                                            />
                                        </View>
                                        <TouchableOpacity
                                            style={[styles.copyButton, copiedBs && { backgroundColor: `${color}1A` }]}
                                            onPress={() => copyToClipboard(bsAmount, 'bs')}
                                        >
                                            {copiedBs ? <Check size={16} color={color} /> : <Copy size={16} color={colors.textSecondary} />}
                                        </TouchableOpacity>
                                        <Text style={styles.currencySubLabel}>VES</Text>
                                    </View>

                                    <View style={styles.divider}>
                                        <TouchableOpacity onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                            setIsSwapped(!isSwapped);
                                        }} style={styles.swapButton}>
                                            <ArrowLeftRight color={colors.textPrimary} size={16} />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Foreign Input (Swapped) */}
                                    <View style={styles.inputSection}>
                                        <View style={styles.inputWrapper}>
                                            <Text style={styles.inputLabel}>{getSymbol()}</Text>
                                            <TextInput
                                                style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' }]}
                                                value={foreignAmount}
                                                onChangeText={handleForeignChange}
                                                keyboardType="number-pad"
                                                placeholder="0.00"
                                                placeholderTextColor={colors.textSecondary}
                                                selectTextOnFocus={true}
                                            />
                                        </View>
                                        <TouchableOpacity
                                            style={[styles.copyButton, copiedForeign && { backgroundColor: `${color}1A` }]}
                                            onPress={() => copyToClipboard(foreignAmount, 'foreign')}
                                        >
                                            {copiedForeign ? <Check size={16} color={color} /> : <Copy size={16} color={colors.textSecondary} />}
                                        </TouchableOpacity>
                                        <Text style={styles.currencySubLabel}>{getCurrencyLabel()}</Text>
                                    </View>
                                </>
                            )}
                        </View>

                        <Text style={styles.rateInfo}>
                            Tasa aplicada: <Text style={{ fontWeight: 'bold', color: globalUseTomorrow && hasNextRates ? color : colors.textPrimary }}>
                                {formatCurrency(currentRate)} Bs {globalUseTomorrow && hasNextRates ? `(${getFriendlyNextDate()})` : (isHistorical ? '' : '(Hoy)')}
                            </Text>
                        </Text>

                        <View style={styles.actionRow}>
                            <TouchableOpacity style={styles.actionButton} onPress={handleReset}>
                                <RotateCcw size={18} color={colors.textSecondary} />
                                <Text style={styles.actionButtonText}>Reiniciar</Text>
                            </TouchableOpacity>

                            <View style={styles.actionDivider} />

                            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                                <ShareIcon size={18} color={color} />
                                <Text style={[styles.actionButtonText, { color: color }]}>Compartir</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </>
            )}
        </View>
    );

    if (!isExpanded) {
        return (
            <Animated.View
                style={{
                    opacity: fadeAnim,
                    transform: [
                        { translateY: slideAnim },
                        { scale: scaleAnim }
                    ],
                }}
            >
                <Pressable onPress={handleCardPress}>
                    {({ pressed, hovered }) => content(hovered, pressed)}
                </Pressable>
            </Animated.View>
        );
    }

    return (
        <Animated.View
            style={{
                opacity: fadeAnim,
                transform: [
                    { translateY: slideAnim },
                    { scale: scaleAnim }
                ],
            }}
        >
            <Pressable onPress={handleCardPress} activeOpacity={1}>
                {content(false, false)}
            </Pressable>
        </Animated.View >
    );
};

export default RateCard;
