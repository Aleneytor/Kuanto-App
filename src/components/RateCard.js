import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Share as NativeShare, Animated, TextInput, Platform, Pressable, useWindowDimensions, Easing } from 'react-native';
import { Calendar, Clock, TrendingUp as Up, TrendingDown as Down, Share2 as ShareIcon, ArrowLeftRight, Copy, Check, RotateCcw, ChevronUp, Clipboard as PasteIcon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useRates } from '../context/RateContext';
import { usePayment } from '../context/PaymentContext';
import { formatCurrency } from '../utils/formatting';
import { FONTS } from '../constants/typography';
import { ACCOUNT_TYPES } from '../constants/banks';
import { Building2, Settings2 } from 'lucide-react-native';
import PaymentSelectionModal from './PaymentSelectionModal';

const shortenBankName = (name) => {
    if (!name) return '';
    const nameMap = {
        'Banco de Venezuela': 'Venezuela',
        'Banco Mercantil': 'Mercantil',
        'Banesco Banco Universal': 'Banesco',
        'Banco Provincial': 'Provincial',
        'Banco Nacional de Crédito': 'BNC',
        'Bancamiga Banco Microfinanciero': 'Bancamiga',
        'Banco del Tesoro': 'Tesoro',
        'Banco Bicentenario': 'Bicentenario',
        'Banco Exterior': 'Exterior',
        '100% Banco': '100%',
        'Bancaribe': 'Bancaribe',
    };
    
    if (nameMap[name]) return nameMap[name];
    
    return name.replace(/Banco (de |del )?/gi, '')
               .replace(/ Banco Universal| Banco Microfinanciero/gi, '')
               .split(' ')[0]
               .trim();
};

const CARD_TOGGLE_DURATION = 700;
const CARD_TOGGLE_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const RATE_CHANGE_DURATION = 700;
const RATE_CHANGE_EASING = Easing.bezier(0.16, 1, 0.3, 1);
const RATE_DIGIT_STAGGER = 24;
const FOOTER_HEIGHT_FALLBACK = 56;
const CALCULATOR_HEIGHT_FALLBACK = 340;

const RateCard = ({ title, rate, color, icon, nextRate, nextDate, nextRawDate, lastUpdated, change, onPress, index = 0, isExpanded = false, id, isHistorical = false, globalUseTomorrow = false, onManagePayments }) => {
    const { colors, isDark } = useTheme();
    const { showToast } = useToast();
    const { clipboardValue, setClipboardValue, clipboardSource, setClipboardSource } = useRates();
    const { paymentMethods } = usePayment();
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
    const [selectedPaymentId, setSelectedPaymentId] = useState(null);
    const [footerContentHeight, setFooterContentHeight] = useState(FOOTER_HEIGHT_FALLBACK);
    const [calculatorContentHeight, setCalculatorContentHeight] = useState(CALCULATOR_HEIGHT_FALLBACK);
    const [selectionModalVisible, setSelectionModalVisible] = useState(false);
    // Removed: Local useTomorrow state - now controlled by parent via globalUseTomorrow prop

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;
    const expandAnim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;
    const rateCharacterAnimsRef = useRef([]);
    const dateLabelAnim = useRef(new Animated.Value(1)).current;
    const [showSecondaryInfo, setShowSecondaryInfo] = useState(0); // 0 for nextRate, 1 for lastUpdated
    const footerLoopAnim = useRef(new Animated.Value(1)).current;
    const pasteAnimForeign = useRef(new Animated.Value(0)).current;
    const pasteAnimBs = useRef(new Animated.Value(0)).current;

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
    const currentRateText = formatCurrency(currentRate);
    const previousRateRef = useRef(currentRateText);
    const rateDisplayCharacters = [...currentRateText.split(''), ' ', 'B', 's', '.'];
    const rateCharacterAnims = rateDisplayCharacters.map((_, index) => {
        if (!rateCharacterAnimsRef.current[index]) {
            rateCharacterAnimsRef.current[index] = new Animated.Value(1);
        }
        return rateCharacterAnimsRef.current[index];
    });

    const resetCalculatorState = () => {
        setForeignAmount('1,00');
        setBsAmount('');
        setIsSwapped(false);
        setCopiedForeign(false);
        setCopiedBs(false);
        setSelectedPaymentId(null);
    };

    const initializeCalculatorState = () => {
        setCopiedForeign(false);
        setCopiedBs(false);
        setIsSwapped(false);
        handleForeignChange('100');
    };

    const handleMeasuredHeight = (setter) => ({ nativeEvent }) => {
        const nextHeight = Math.ceil(nativeEvent.layout.height);
        if (!nextHeight) return;
        setter((currentHeight) => currentHeight === nextHeight ? currentHeight : nextHeight);
    };

    const footerMaxHeight = expandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [footerContentHeight, 0],
    });

    const footerOpacity = expandAnim.interpolate({
        inputRange: [0, 0.35, 1],
        outputRange: [1, 0.18, 0],
    });

    const footerTranslateY = expandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -14],
    });

    const calculatorMaxHeight = expandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, calculatorContentHeight],
    });

    const calculatorOpacity = expandAnim.interpolate({
        inputRange: [0, 0.45, 1],
        outputRange: [0, 0.12, 1],
    });

    const calculatorTranslateY = expandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [18, 0],
    });

    const calculatorScale = expandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.985, 1],
    });

    const shareButtonOpacity = expandAnim.interpolate({
        inputRange: [0, 0.4, 1],
        outputRange: [1, 0.35, 0],
    });

    const shareButtonScale = expandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0.92],
    });

    const collapseArrowOpacity = expandAnim.interpolate({
        inputRange: [0, 0.6, 1],
        outputRange: [0, 0, 1],
    });

    const cardLift = expandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -6],
    });

    const cardScale = expandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.012],
    });

    const glowOpacity = expandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.75, 1],
    });

    const glowScale = expandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.06],
    });

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

    useEffect(() => {
        if (previousRateRef.current === currentRateText) return;

        previousRateRef.current = currentRateText;
        rateCharacterAnims.forEach((animation) => {
            animation.stopAnimation();
            animation.setValue(0);
        });

        dateLabelAnim.stopAnimation();
        dateLabelAnim.setValue(globalUseTomorrow ? 0 : 1);

        const allAnims = [...rateCharacterAnims, dateLabelAnim];

        Animated.stagger(
            RATE_DIGIT_STAGGER,
            allAnims.map((animation) => Animated.timing(animation, {
                toValue: 1,
                duration: RATE_CHANGE_DURATION,
                easing: RATE_CHANGE_EASING,
                useNativeDriver: true,
            }))
        ).start();
    }, [currentRateText, globalUseTomorrow]);

    useEffect(() => {
        if (isExpanded) {
            initializeCalculatorState();
        }

        Animated.timing(expandAnim, {
            toValue: isExpanded ? 1 : 0,
            duration: CARD_TOGGLE_DURATION,
            easing: CARD_TOGGLE_EASING,
            useNativeDriver: false,
        }).start(({ finished }) => {
            if (finished && !isExpanded) {
                resetCalculatorState();
            }
        });
    }, [isExpanded]);

    // Secondary Info Loop Animation
    useEffect(() => {
        // Set initial state based on what's available
        if (hasNextRates) {
            setShowSecondaryInfo(0);
        } else if (lastUpdated) {
            setShowSecondaryInfo(1);
        }

        // If we don't have both pieces of info, don't loop
        if (!hasNextRates || !lastUpdated) return;

        const interval = setInterval(() => {
            // Animate out (down and fade)
            Animated.timing(footerLoopAnim, {
                toValue: 0,
                duration: 600,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }).start(() => {
                // Change state
                setShowSecondaryInfo(prev => (prev === 0 ? 1 : 0));

                // Prepare for entry (from top)
                footerLoopAnim.setValue(2);

                // Animate in (to center)
                Animated.timing(footerLoopAnim, {
                    toValue: 1,
                    duration: 600,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }).start();
            });
        }, 6000);

        return () => clearInterval(interval);
    }, [hasNextRates, lastUpdated, nextRate, nextDate]);

    // Paste Button Animation
    useEffect(() => {
        const isForeignVisible = clipboardValue && clipboardSource !== `${id}-foreign`;
        const isBsVisible = clipboardValue && clipboardSource !== `${id}-bs`;

        Animated.parallel([
            Animated.spring(pasteAnimForeign, {
                toValue: isForeignVisible ? 1 : 0,
                friction: 8,
                tension: 40,
                useNativeDriver: true
            }),
            Animated.spring(pasteAnimBs, {
                toValue: isBsVisible ? 1 : 0,
                friction: 8,
                tension: 40,
                useNativeDriver: true
            })
        ]).start();
    }, [clipboardValue, clipboardSource, id]);

    const infoLoopTranslateY = footerLoopAnim.interpolate({
        inputRange: [0, 1, 2],
        outputRange: [12, 0, -12],
    });

    const infoLoopOpacity = footerLoopAnim.interpolate({
        inputRange: [0, 1, 2],
        outputRange: [0, 1, 0],
    });

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
            setClipboardValue(text);
            setClipboardSource(`${id}-${type}`);
        } else {
            setCopiedBs(true);
            setTimeout(() => setCopiedBs(false), 2000);
            setClipboardValue(text);
            setClipboardSource(`${id}-${type}`);
        }
    };

    const handlePaste = (type) => {
        if (!clipboardValue) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (type === 'foreign') {
            handleForeignChange(clipboardValue);
        } else {
            handleBsChange(clipboardValue);
        }
        setClipboardValue(null);
        setClipboardSource(null);
        showToast('Monto pegado', 'success');
    };

    const handleReset = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setForeignAmount('1,00');
        setBsAmount(formatCurrencyInput(1.00 * currentRate));
    };

    const handleShare = (method = null) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // If no method provided and user has payment methods, show selection modal
        if (method === null && paymentMethods.length > 0) {
            setSelectionModalVisible(true);
            return;
        }

        performShare(method);
    };

    const performShare = async (selectedMethod = null) => {
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

                message = `💱 *Kuanto*\n\n${currencyIcon} *${foreignAmount} ${currencyName}*  ➡️  🇻🇪 *${bsAmount} Bs*\n\n📊 Tasa: *${formatCurrency(currentRate)} Bs*\n📅 ${dateStr}`;

                // Add payment method info if selected
                if (selectedMethod) {
                    const method = selectedMethod;
                    const bankDisplay = (method.bankName || 'Banco') + (method.bankCode ? ` (${method.bankCode})` : '');
                    const holderId = method.holderId || '';
                    const contactInfo = method.type === 'pago_movil' ? (method.phoneNumber || '') : (method.accountNumber || '');

                    message += `\n\n*DATOS DE PAGO*`;
                    message += `\n*--------------------*`;
                    if (bankDisplay) message += `\n${bankDisplay}`;
                    if (holderId) message += `\n${holderId}`;
                    if (contactInfo) message += `\n${contactInfo}`;
                }

                message += `\n\n_Enviado desde kuanto.online_ 📲`;
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

            // Descomenta la línea de abajo para ver qué plataforma detecta tu celular
            // showToast(`Plataforma detectada: ${Platform.OS}`, 'info');

            if (Platform.OS !== 'web') {
                // APP NATIVA (Expo Go o Instalada)
                await NativeShare.share({ 
                    message,
                    title: 'Kuanto App'
                });
            } else if (navigator.share) {
                // NAVEGADOR MÓVIL (Con soporte de compartir, requiere HTTPS)
                try {
                    await navigator.share({
                        title: 'Kuanto App',
                        text: message,
                    });
                } catch (error) {
                    if (error.name !== 'AbortError') {
                        await Clipboard.setStringAsync(message);
                        showToast('Tasa Copiada al Portapapeles', 'success');
                    }
                }
            } else {
                // ESCRITORIO o NAVEGADOR SIN SOPORTE (O sin HTTPS)
                await Clipboard.setStringAsync(message);
                showToast('Tasa Copiada al Portapapeles', 'success');
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
            padding: 14,
            marginBottom: 8,
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
                    transition: 'transform 0.8s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.8s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.8s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
                },
            }),
            position: 'relative',
            overflow: 'hidden',
        },
        cardHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 4,
        },
        iconContainer: {
            marginRight: 12,
        },
        cardTitle: {
            fontSize: 16,
            color: colors.textSecondary,
            fontWeight: '800',
            fontFamily: FONTS.bold,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
        },
        rateRow: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: 6,
        },
        rateText: {
            fontSize: 42,
            fontWeight: '800',
            fontFamily: FONTS.bold,
            letterSpacing: -1.5,
            lineHeight: 44,
            includeFontPadding: false,
        },
        rateValueRow: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            alignSelf: 'flex-start',
        },
        rateCharacterBase: {
            marginBottom: 0,
        },
        rateSuffixCharacter: {
            fontSize: 16,
            lineHeight: 18,
            fontWeight: '800',
            fontFamily: FONTS.bold,
            opacity: 0.7,
            letterSpacing: -0.2,
            marginBottom: 5,
            includeFontPadding: false,
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
            marginTop: 4, // Increased from 0
            minHeight: 20,
        },
        badge: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            paddingVertical: 5,
            paddingHorizontal: 10,
            borderRadius: 8,
            alignSelf: 'flex-start',
            marginBottom: 6,
        },
        badgeText: {
            color: colors.textSecondary,
            fontSize: 12,
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
            display: 'none',
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
            marginLeft: 12,
        },
        currencySubLabel: {
            color: colors.textSecondary,
            fontSize: 14,
            fontWeight: '800',
            letterSpacing: 0.5,
            width: 45,
            textAlign: 'left',
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
        actionRow: {
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 16, // Slightly adjusted from 12 as rateInfo is gone
            alignSelf: 'center',
            gap: 8
        },
        actionButton: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 8,
            paddingHorizontal: 12,
            gap: 8,
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
        },
        // Corner labels styles
        cornerLabel: {
            position: 'absolute',
            zIndex: 10,
        },
        updateLabel: {
            bottom: 14,
            right: 18,
        },
        nextRateLabel: {
            bottom: 14,
            left: 18,
        },
        cornerLabelText: {
            color: colors.textSecondary,
            fontSize: 10,
            fontWeight: '600',
            opacity: 0.8,
            fontFamily: FONTS.semiBold,
        },
        cornerLabelValue: {
            color: colors.textPrimary,
            fontWeight: '700',
        },
        paymentChipTextSelected: {
            color: color,
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
                <Animated.View style={{
                    position: 'absolute',
                    top: '-50%',
                    left: '-50%',
                    width: '200%',
                    height: '200%',
                    background: `radial-gradient(circle at 50% 50%, ${color}15 0%, transparent 60%)`,
                    opacity: glowOpacity,
                    transform: [{ scale: glowScale }],
                    pointerEvents: 'none',
                    zIndex: 0
                }} />
            )}
            <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, zIndex: 1 }}>
                    <View style={styles.iconContainer}>
                        {icon}
                    </View>
                    <Text style={styles.cardTitle}>{title}</Text>
                </View>

                <View style={{ width: 34, height: 34 }}>
                    {/* Share icon — fades out & slides down */}
                    <Animated.View
                        pointerEvents={isExpanded ? 'none' : 'auto'}
                        style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: shareButtonOpacity,
                            transform: [{
                                translateY: expandAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, 8]
                                })
                            }],
                        }}
                    >
                        <TouchableOpacity 
                            onPress={(e) => {
                                e.stopPropagation();
                                handleShare();
                            }} 
                            style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}
                        >
                            <ShareIcon size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Collapse arrow — fades in & slides up from below */}
                    <Animated.View
                        pointerEvents={isExpanded ? 'auto' : 'none'}
                        style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: collapseArrowOpacity,
                            transform: [{
                                translateY: expandAnim.interpolate({
                                    inputRange: [0, 0.6, 1],
                                    outputRange: [10, 10, 0]
                                })
                            }],
                        }}
                    >
                        <TouchableOpacity 
                            onPress={(e) => {
                                e.stopPropagation();
                                onPress();
                            }} 
                            style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}
                        >
                            <ChevronUp size={22} color={colors.textSecondary} strokeWidth={2.8} />
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </View>

            <View style={styles.rateRow}>
                <View>
                    <View style={styles.rateValueRow}>
                        {rateDisplayCharacters.map((character, index) => {
                            const characterOpacity = rateCharacterAnims[index].interpolate({
                                inputRange: [0, 0.3, 1],
                                outputRange: [0, 0.55, 1],
                            });

                            const characterTranslateY = rateCharacterAnims[index].interpolate({
                                inputRange: [0, 1],
                                outputRange: [22, 0],
                            });

                            const characterScale = rateCharacterAnims[index].interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.98, 1],
                            });

                            const isSuffixCharacter = index >= currentRateText.length;
                            const characterStyle = isSuffixCharacter
                                ? styles.rateSuffixCharacter
                                : styles.rateText;

                            return (
                                <Animated.Text
                                    key={`${character}-${index}-${currentRateText}`}
                                    style={[characterStyle, styles.rateCharacterBase, {
                                        color: color,
                                        opacity: characterOpacity,
                                        transform: [
                                            { translateY: characterTranslateY },
                                            { scale: characterScale }
                                        ],
                                    }]}
                                >
                                    {character}
                                </Animated.Text>
                            );
                        })}
                    </View>
                    {globalUseTomorrow && hasNextRates && (
                        <Animated.Text style={{
                            position: 'absolute',
                            bottom: -15,
                            color: color,
                            fontSize: 13,
                            fontWeight: '700',
                            letterSpacing: 0.5,
                            opacity: dateLabelAnim.interpolate({
                                inputRange: [0, 0.3, 1],
                                outputRange: [0, 0.55, 1],
                            }),
                            transform: [
                                {
                                    translateY: dateLabelAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [22, 0],
                                    }),
                                },
                                {
                                    scale: dateLabelAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.98, 1],
                                    })
                                }
                            ]
                        }}>
                            {getFriendlyNextDate()}
                        </Animated.Text>
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

            <Animated.View
                style={{
                    maxHeight: footerMaxHeight,
                    opacity: footerOpacity,
                    overflow: 'hidden',
                    transform: [{ translateY: footerTranslateY }],
                    pointerEvents: isExpanded ? 'none' : 'auto'
                }}
            >
                <View onLayout={handleMeasuredHeight(setFooterContentHeight)}>
                    <View style={[styles.footerInfo, { justifyContent: 'center', alignItems: 'flex-start' }]}>
                        <Animated.View style={{
                            opacity: infoLoopOpacity,
                            transform: [{ translateY: infoLoopTranslateY }],
                            width: '100%',
                            alignItems: 'flex-start',
                        }}>
                            {showSecondaryInfo === 0 && hasNextRates ? (
                                <Text style={[styles.cornerLabelText, { textAlign: 'left' }]}>
                                    {getNextRateLabel()} {nextDate}: <Text style={styles.cornerLabelValue}>{formatCurrency(nextRate)} Bs</Text>
                                </Text>
                            ) : lastUpdated ? (
                                <Text style={[styles.cornerLabelText, { textAlign: 'left' }]}>
                                    Actualizado: <Text style={styles.cornerLabelValue}>{lastUpdated}</Text>
                                </Text>
                            ) : null}
                        </Animated.View>
                    </View>
                </View>
            </Animated.View>

            <Animated.View
                pointerEvents={isExpanded ? 'auto' : 'none'}
                style={{
                    maxHeight: calculatorMaxHeight,
                    opacity: calculatorOpacity,
                    overflow: 'hidden',
                    transform: [
                        { translateY: calculatorTranslateY },
                        { scale: calculatorScale }
                    ]
                }}
            >
                <View onLayout={handleMeasuredHeight(setCalculatorContentHeight)}>
                    <Pressable onPress={(e) => e.stopPropagation()} style={{ cursor: 'auto' }}>
                        <View style={styles.converterBox}>
                            {!isSwapped ? (
                                <>
                                    {/* Foreign Input */}
                                    <View style={styles.inputSection}>
                                        <Text style={styles.currencySubLabel}>{getCurrencyLabel()}</Text>
                                        <View style={styles.inputWrapper}>
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
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Animated.View 
                                                pointerEvents={clipboardValue && clipboardSource !== `${id}-foreign` ? 'auto' : 'none'}
                                                style={{ 
                                                    opacity: pasteAnimForeign,
                                                    transform: [
                                                        { scale: pasteAnimForeign.interpolate({
                                                            inputRange: [0, 1],
                                                            outputRange: [0.8, 1]
                                                        }) },
                                                        { translateY: pasteAnimForeign.interpolate({
                                                            inputRange: [0, 1],
                                                            outputRange: [4, 0]
                                                        }) }
                                                    ],
                                                    marginRight: 8
                                                }}
                                            >
                                                <TouchableOpacity
                                                    style={[styles.copyButton, { marginLeft: 0 }]}
                                                    onPress={() => handlePaste('foreign')}
                                                >
                                                    <PasteIcon size={16} color={colors.textSecondary} />
                                                </TouchableOpacity>
                                            </Animated.View>
                                            <TouchableOpacity
                                                style={[styles.copyButton, copiedForeign && { backgroundColor: `${color}1A` }]}
                                                onPress={() => copyToClipboard(foreignAmount, 'foreign')}
                                            >
                                                {copiedForeign ? <Check size={16} color={color} /> : <Copy size={16} color={colors.textSecondary} />}
                                            </TouchableOpacity>
                                        </View>
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
                                        <Text style={styles.currencySubLabel}>VES</Text>
                                        <View style={styles.inputWrapper}>
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
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Animated.View 
                                                pointerEvents={clipboardValue && clipboardSource !== `${id}-bs` ? 'auto' : 'none'}
                                                style={{ 
                                                    opacity: pasteAnimBs,
                                                    transform: [
                                                        { scale: pasteAnimBs.interpolate({
                                                            inputRange: [0, 1],
                                                            outputRange: [0.8, 1]
                                                        }) },
                                                        { translateY: pasteAnimBs.interpolate({
                                                            inputRange: [0, 1],
                                                            outputRange: [4, 0]
                                                        }) }
                                                    ],
                                                    marginRight: 8
                                                }}
                                            >
                                                <TouchableOpacity
                                                    style={[styles.copyButton, { marginLeft: 0 }]}
                                                    onPress={() => handlePaste('bs')}
                                                >
                                                    <PasteIcon size={16} color={colors.textSecondary} />
                                                </TouchableOpacity>
                                            </Animated.View>
                                            <TouchableOpacity
                                                style={[styles.copyButton, copiedBs && { backgroundColor: `${color}1A` }]}
                                                onPress={() => copyToClipboard(bsAmount, 'bs')}
                                            >
                                                {copiedBs ? <Check size={16} color={color} /> : <Copy size={16} color={colors.textSecondary} />}
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </>
                            ) : (
                                <>
                                    {/* Bs Input (Swapped) */}
                                    <View style={styles.inputSection}>
                                        <Text style={styles.currencySubLabel}>VES</Text>
                                        <View style={styles.inputWrapper}>
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
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Animated.View 
                                                pointerEvents={clipboardValue && clipboardSource !== `${id}-bs` ? 'auto' : 'none'}
                                                style={{ 
                                                    opacity: pasteAnimBs,
                                                    transform: [
                                                        { scale: pasteAnimBs.interpolate({
                                                            inputRange: [0, 1],
                                                            outputRange: [0.8, 1]
                                                        }) },
                                                        { translateY: pasteAnimBs.interpolate({
                                                            inputRange: [0, 1],
                                                            outputRange: [4, 0]
                                                        }) }
                                                    ],
                                                    marginRight: 8
                                                }}
                                            >
                                                <TouchableOpacity
                                                    style={[styles.copyButton, { marginLeft: 0 }]}
                                                    onPress={() => handlePaste('bs')}
                                                >
                                                    <PasteIcon size={16} color={colors.textSecondary} />
                                                </TouchableOpacity>
                                            </Animated.View>
                                            <TouchableOpacity
                                                style={[styles.copyButton, copiedBs && { backgroundColor: `${color}1A` }]}
                                                onPress={() => copyToClipboard(bsAmount, 'bs')}
                                            >
                                                {copiedBs ? <Check size={16} color={color} /> : <Copy size={16} color={colors.textSecondary} />}
                                            </TouchableOpacity>
                                        </View>
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
                                        <Text style={styles.currencySubLabel}>{getCurrencyLabel()}</Text>
                                        <View style={styles.inputWrapper}>
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
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Animated.View 
                                                pointerEvents={clipboardValue && clipboardSource !== `${id}-foreign` ? 'auto' : 'none'}
                                                style={{ 
                                                    opacity: pasteAnimForeign,
                                                    transform: [
                                                        { scale: pasteAnimForeign.interpolate({
                                                            inputRange: [0, 1],
                                                            outputRange: [0.8, 1]
                                                        }) },
                                                        { translateY: pasteAnimForeign.interpolate({
                                                            inputRange: [0, 1],
                                                            outputRange: [4, 0]
                                                        }) }
                                                    ],
                                                    marginRight: 8
                                                }}
                                            >
                                                <TouchableOpacity
                                                    style={[styles.copyButton, { marginLeft: 0 }]}
                                                    onPress={() => handlePaste('foreign')}
                                                >
                                                    <PasteIcon size={16} color={colors.textSecondary} />
                                                </TouchableOpacity>
                                            </Animated.View>
                                            <TouchableOpacity
                                                style={[styles.copyButton, copiedForeign && { backgroundColor: `${color}1A` }]}
                                                onPress={() => copyToClipboard(foreignAmount, 'foreign')}
                                            >
                                                {copiedForeign ? <Check size={16} color={color} /> : <Copy size={16} color={colors.textSecondary} />}
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </>
                            )}
                        </View>

                        <PaymentSelectionModal 
                            isVisible={selectionModalVisible}
                            onClose={() => setSelectionModalVisible(false)}
                            onSelect={(method) => performShare(method)}
                        />




                        <View style={styles.actionRow}>
                            <TouchableOpacity style={styles.actionButton} onPress={handleReset}>
                                <RotateCcw size={18} color={colors.textSecondary} />
                                <Text style={styles.actionButtonText}>Reiniciar</Text>
                            </TouchableOpacity>

                            <View style={styles.actionDivider} />

                            <TouchableOpacity style={styles.actionButton} onPress={() => handleShare()}>
                                <ShareIcon size={18} color={color} />
                                <Text style={[styles.actionButtonText, { color: color }]}>Compartir</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </View>
            </Animated.View>
        </View>
    );

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
            <Animated.View
                style={{
                    transform: [
                        { translateY: cardLift },
                        { scale: cardScale }
                    ],
                }}
            >
                {isExpanded ? (
                    <Pressable onPress={handleCardPress}>
                        {content(false, false)}
                    </Pressable>
                ) : (
                    <Pressable onPress={handleCardPress}>
                        {({ pressed, hovered }) => content(hovered, pressed)}
                    </Pressable>
                )}
            </Animated.View>
        </Animated.View>
    );
};

export default RateCard;
