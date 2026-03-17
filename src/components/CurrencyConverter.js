import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, Share, Platform, useWindowDimensions } from 'react-native';
import { ArrowLeftRight, Calendar, Copy, Check, RotateCcw, Share2 } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { usePayment } from '../context/PaymentContext';
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

const CurrencyConverter = ({ rates, initialCurrency, onManagePayments }) => {
    const { showToast } = useToast();
    const { colors, isDark } = useTheme();
    const { paymentMethods } = usePayment();
    const { width } = useWindowDimensions();
    const isMobile = width < 768; // Detect mobile screen
    const [foreignAmount, setForeignAmount] = useState('1,00');
    const [bsAmount, setBsAmount] = useState('');
    const [selectedCurrency, setSelectedCurrency] = useState(initialCurrency || 'usd');
    const [useTomorrow, setUseTomorrow] = useState(false);
    const [isSwapped, setIsSwapped] = useState(false);
    const [selectionModalVisible, setSelectionModalVisible] = useState(false);

    useEffect(() => {
        if (initialCurrency) {
            setSelectedCurrency(initialCurrency);
        }
    }, [initialCurrency]);

    const getActiveColor = () => {
        switch (selectedCurrency) {
            case 'eur': return colors.euroBlue;
            case 'parallel': return colors.parallelOrange;
            default: return colors.bcvGreen;
        }
    };

    const activeColor = getActiveColor();

    const [copiedForeign, setCopiedForeign] = useState(false);
    const [copiedBs, setCopiedBs] = useState(false);

    const parseCurrency = (value) => {
        if (!value) return 0;
        const digits = value.replace(/\D/g, '');
        const parsed = parseFloat(digits) / 100;
        return isNaN(parsed) ? 0 : parsed;
    };

    const formatCurrency = (value) => {
        if (value === 0 || isNaN(value)) return '';
        let num = parseFloat(value);
        let [integer, decimal] = num.toFixed(2).split('.');
        integer = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        return `${integer},${decimal}`;
    };

    const getCurrentRate = () => {
        if (useTomorrow && rates.nextRates && (selectedCurrency === 'usd' || selectedCurrency === 'eur')) {
            return selectedCurrency === 'usd' ? rates.nextRates.usd : rates.nextRates.eur;
        }
        return selectedCurrency === 'usd' ? rates.bcv :
            selectedCurrency === 'eur' ? rates.euro :
                rates.parallel;
    };

    const currentRate = getCurrentRate();

    const handleForeignChange = (val) => {
        const digits = val.replace(/\D/g, '');
        if (digits === '' || parseInt(digits) === 0) {
            setForeignAmount('');
            setBsAmount('');
            return;
        }
        const rawValue = parseFloat(digits) / 100;
        setForeignAmount(formatCurrency(rawValue));
        if (rawValue > 0) {
            setBsAmount(formatCurrency(rawValue * currentRate));
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
        setBsAmount(formatCurrency(rawValue));
        if (rawValue > 0) {
            setForeignAmount(formatCurrency(rawValue / currentRate));
        }
    };

    useEffect(() => {
        if (!foreignAmount) return;
        const digits = foreignAmount.replace(/\D/g, '');
        if (digits) {
            const rawValue = parseFloat(digits) / 100;
            if (rawValue > 0) {
                setBsAmount(formatCurrency(rawValue * currentRate));
            }
        }
    }, [selectedCurrency, useTomorrow, rates]);

    const copyToClipboard = async (text, type) => {
        if (!text) return;
        await Clipboard.setStringAsync(text);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (type === 'foreign') {
            setCopiedForeign(true);
            showToast('Cantidad en divisas copiada', 'success');
            setTimeout(() => setCopiedForeign(false), 2000);
        } else {
            setCopiedBs(true);
            showToast('Cantidad en Bolívares copiada', 'success');
            setTimeout(() => setCopiedBs(false), 2000);
        }
    };

    const handleReset = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setForeignAmount('1,00');
        const rawValue = 1.00;
        setBsAmount(formatCurrency(rawValue * currentRate));
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
            const dateStr = useTomorrow && hasNextRates ?
                `${getFriendlyNextDate()} (${rates.nextRates.date.substring(0, 5)})` :
                `Hoy ${formattedToday}`;
            const currencyName = selectedCurrency === 'parallel' ? 'USDT' : selectedCurrency.toUpperCase();
            const currencyIcon = selectedCurrency === 'eur' ? '🇪🇺' : selectedCurrency === 'parallel' ? '🪙' : '🇺🇸';
            let message =
                `💱 *Kuanto*\n\n${currencyIcon} *${foreignAmount} ${currencyName}*  ➡️  🇻🇪 *${bsAmount} Bs*\n\n📊 Tasa: *${formatCurrency(currentRate)} Bs*\n📅 ${dateStr}`;

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

            // Desktop/Web: Copy to clipboard
            // Desktop/Web: Copy to clipboard or use Navigator Share on Mobile
            // Detection of real desktop vs mobile for better UX
            const isReallyMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (Platform.OS === 'web' && 'ontouchstart' in window);

            if (Platform.OS === 'web') {
                if (isReallyMobile && navigator.share) {
                    try {
                        await navigator.share({
                            title: 'Kuanto App',
                            text: message,
                        });
                    } catch (error) {
                        if (error.name !== 'AbortError') {
                            await Clipboard.setStringAsync(message);
                            showToast('Copiado al portapapeles', 'success');
                        }
                    }
                } else {
                    // Desktop or no share support: Copy to clipboard
                    await Clipboard.setStringAsync(message);
                    showToast('Copiado al portapapeles', 'success');
                }
            } else {
                // Native Mobile: Use native share
                await Share.share({ message: message });
            }
        } catch (error) {
            console.error(error);
        }
    };

    const getSymbol = () => {
        if (selectedCurrency === 'eur') return '€';
        return '$';
    };

    const getCurrencyLabel = () => {
        if (selectedCurrency === 'parallel') return 'USDT';
        return selectedCurrency.toUpperCase();
    };

    const getFriendlyNextDate = () => {
        if (!rates.nextRates || !rates.nextRates.rawDate) return '';
        const now = new Date();
        const vetTime = now.getTime() - (4 * 60 * 60 * 1000);
        const today = new Date(vetTime);
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const tomorrowISO = tomorrow.toISOString().split('T')[0];
        if (rates.nextRates.rawDate === tomorrowISO) {
            return 'Mañana';
        }
        const [y, m, d] = rates.nextRates.rawDate.split('-');
        const nextDateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        const daysArr = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        return daysArr[nextDateObj.getDay()];
    };

    const hasNextRates = rates.nextRates && (selectedCurrency === 'usd' || selectedCurrency === 'eur');

    // Dynamic styles based on theme
    const styles = StyleSheet.create({
        container: {
            backgroundColor: colors.card,
            borderRadius: 24,
            padding: 20,
            marginBottom: 20,
            elevation: 8,
            shadowColor: isDark ? "#000" : "#888",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: isDark ? 0.3 : 0.15,
            shadowRadius: 8,
        },
        headerRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
        },
        title: {
            color: colors.textPrimary,
            fontSize: 18,
            fontWeight: '700',
        },
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
        selectorContainer: {
            flexDirection: 'row',
            marginBottom: 24,
            gap: 8,
        },
        chip: {
            flex: 1,
            paddingVertical: 10,
            borderRadius: 14,
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: 'transparent',
        },
        chipText: {
            color: colors.textSecondary,
            fontSize: 12,
            fontWeight: '600',
            textAlign: 'center',
        },
        converterBox: {
            backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.04)',
            borderRadius: 20,
            padding: 16,
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
            fontSize: 26,
            fontWeight: '800',
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
        },
        paymentChipText: {
            fontSize: 11,
            fontWeight: '700',
            color: colors.textSecondary,
        },
    });

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>Conversor</Text>

                {hasNextRates && (
                    <TouchableOpacity
                        style={[styles.tomorrowToggle, useTomorrow && {
                            backgroundColor: `${activeColor}15`,
                            borderColor: `${activeColor}40`
                        }]}
                        onPress={() => setUseTomorrow(!useTomorrow)}
                        activeOpacity={0.7}
                    >
                        <Calendar size={14} color={useTomorrow ? activeColor : colors.textSecondary} />
                        <View style={{ marginLeft: 8 }}>
                            <Text style={[styles.tomorrowToggleSubtitle, useTomorrow && { color: activeColor }]}>
                                {useTomorrow ? 'Usando' : 'Ver'}
                            </Text>
                            <Text style={[styles.tomorrowToggleText, useTomorrow && { color: activeColor }]}>
                                {getFriendlyNextDate()} ({rates.nextRates.date.substring(0, 5)})
                            </Text>
                        </View>
                    </TouchableOpacity>
                )}
            </View>

            {/* Currency Selector */}
            <View style={styles.selectorContainer}>
                {['usd', 'eur', 'parallel'].map((curr) => {
                    const isSelected = selectedCurrency === curr;
                    let chipColor = colors.bcvGreen;
                    if (curr === 'eur') chipColor = colors.euroBlue;
                    if (curr === 'parallel') chipColor = colors.parallelOrange;

                    return (
                        <TouchableOpacity
                            key={curr}
                            style={[
                                styles.chip,
                                isSelected && {
                                    backgroundColor: `${chipColor}26`,
                                    borderColor: chipColor
                                }
                            ]}
                            onPress={() => {
                                Haptics.selectionAsync();
                                setSelectedCurrency(curr);
                            }}
                        >
                            <Text style={[
                                styles.chipText,
                                isSelected && { color: chipColor }
                            ]}>
                                {curr === 'parallel' ? 'Promedio USDT' : `${curr.toUpperCase()} BCV`}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View style={styles.converterBox}>
                {!isSwapped ? (
                    <>
                        {/* Foreign Input */}
                        <View style={styles.inputSection}>
                            <Text style={styles.currencySubLabel}>{getCurrencyLabel()}</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    value={foreignAmount}
                                    onChangeText={handleForeignChange}
                                    keyboardType="number-pad"
                                    placeholder="0.00"
                                    placeholderTextColor={colors.textSecondary}
                                />
                            </View>
                            <TouchableOpacity
                                style={[styles.copyButton, copiedForeign && { backgroundColor: `${activeColor}1A` }]}
                                onPress={() => copyToClipboard(foreignAmount, 'foreign')}
                            >
                                {copiedForeign ? <Check size={16} color={activeColor} /> : <Copy size={16} color={colors.textSecondary} />}
                            </TouchableOpacity>
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
                                    style={[styles.input, { color: activeColor }]}
                                    value={bsAmount}
                                    onChangeText={handleBsChange}
                                    keyboardType="number-pad"
                                    placeholder="0.00"
                                    placeholderTextColor={colors.textSecondary}
                                />
                            </View>
                            <TouchableOpacity
                                style={[styles.copyButton, copiedBs && { backgroundColor: `${activeColor}1A` }]}
                                onPress={() => copyToClipboard(bsAmount, 'bs')}
                            >
                                {copiedBs ? <Check size={16} color={activeColor} /> : <Copy size={16} color={colors.textSecondary} />}
                            </TouchableOpacity>
                        </View>
                    </>
                ) : (
                    <>
                        {/* Bs Input (Swapped) */}
                        <View style={styles.inputSection}>
                            <Text style={styles.currencySubLabel}>VES</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={[styles.input, { color: activeColor }]}
                                    value={bsAmount}
                                    onChangeText={handleBsChange}
                                    keyboardType="number-pad"
                                    placeholder="0.00"
                                    placeholderTextColor={colors.textSecondary}
                                />
                            </View>
                            <TouchableOpacity
                                style={[styles.copyButton, copiedBs && { backgroundColor: `${activeColor}1A` }]}
                                onPress={() => copyToClipboard(bsAmount, 'bs')}
                            >
                                {copiedBs ? <Check size={16} color={activeColor} /> : <Copy size={16} color={colors.textSecondary} />}
                            </TouchableOpacity>
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
                                    style={styles.input}
                                    value={foreignAmount}
                                    onChangeText={handleForeignChange}
                                    keyboardType="number-pad"
                                    placeholder="0.00"
                                    placeholderTextColor={colors.textSecondary}
                                />
                            </View>
                            <TouchableOpacity
                                style={[styles.copyButton, copiedForeign && { backgroundColor: `${activeColor}1A` }]}
                                onPress={() => copyToClipboard(foreignAmount, 'foreign')}
                            >
                                {copiedForeign ? <Check size={16} color={activeColor} /> : <Copy size={16} color={colors.textSecondary} />}
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </View>

            <PaymentSelectionModal 
                isVisible={selectionModalVisible}
                onClose={() => setSelectionModalVisible(false)}
                onSelect={(method) => performShare(method)}
            />

            <Text style={styles.rateInfo}>
                Tasa aplicada: <Text style={{ fontWeight: 'bold', color: useTomorrow && hasNextRates ? activeColor : colors.textPrimary }}>
                    {formatCurrency(currentRate)} Bs {useTomorrow && hasNextRates ? `(${getFriendlyNextDate()})` : '(Hoy)'}
                </Text>
            </Text>

            <View style={styles.actionRow}>
                <TouchableOpacity style={styles.actionButton} onPress={handleReset}>
                    <RotateCcw size={18} color={colors.textSecondary} />
                    <Text style={styles.actionButtonText}>Reiniciar</Text>
                </TouchableOpacity>

                <View style={styles.actionDivider} />

                <TouchableOpacity style={styles.actionButton} onPress={() => handleShare()}>
                    <Share2 size={18} color={activeColor} />
                    <Text style={[styles.actionButtonText, { color: activeColor }]}>Compartir</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default CurrencyConverter;
