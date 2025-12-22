import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import { ArrowLeftRight, Calendar, Copy, Check } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { COLORS } from '../theme/colors';

const CurrencyConverter = ({ rates, initialCurrency }) => {
    const [foreignAmount, setForeignAmount] = useState('1');
    const [bsAmount, setBsAmount] = useState('');
    const [selectedCurrency, setSelectedCurrency] = useState(initialCurrency || 'usd'); // usd, eur, parallel
    const [useTomorrow, setUseTomorrow] = useState(false);

    // Update selected currency if initialCurrency prop changes (e.g. from navigation)
    useEffect(() => {
        if (initialCurrency) {
            setSelectedCurrency(initialCurrency);
        }
    }, [initialCurrency]);

    // States for "copied" feedback
    const [copiedForeign, setCopiedForeign] = useState(false);
    const [copiedBs, setCopiedBs] = useState(false);

    // Helper functions for formatting
    const parseCurrency = (value) => {
        if (!value) return 0;
        // Remove dots (thousands) and replace comma with dot (decimal)
        const normalized = value.replace(/\./g, '').replace(',', '.');
        const parsed = parseFloat(normalized);
        return isNaN(parsed) ? 0 : parsed;
    };

    const formatCurrency = (value) => {
        if (value === 0 || value === '0') return ''; // Optional: decide if 0 should be shown
        // Fix to 2 decimals
        const num = parseFloat(value);
        if (isNaN(num)) return '';

        let [integer, decimal] = num.toFixed(2).split('.');

        // Add thousands separators
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
        setForeignAmount(val);
        if (val === '') {
            setBsAmount('');
            return;
        }
        const num = parseCurrency(val);
        if (num > 0) {
            setBsAmount(formatCurrency(num * currentRate));
        } else {
            setBsAmount('');
        }
    };

    const handleBsChange = (val) => {
        setBsAmount(val);
        if (val === '') {
            setForeignAmount('');
            return;
        }
        const num = parseCurrency(val);
        if (num > 0) {
            setForeignAmount(formatCurrency(num / currentRate));
        } else {
            setForeignAmount('');
        }
    };

    useEffect(() => {
        const num = parseCurrency(foreignAmount);
        if (num > 0) {
            setBsAmount(formatCurrency(num * currentRate));
        }
    }, [selectedCurrency, useTomorrow, rates]);

    const copyToClipboard = async (text, type) => {
        if (!text) return;
        await Clipboard.setStringAsync(text);

        if (type === 'foreign') {
            setCopiedForeign(true);
            setTimeout(() => setCopiedForeign(false), 2000);
        } else {
            setCopiedBs(true);
            setTimeout(() => setCopiedBs(false), 2000);
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
        if (!rates.nextRates) return '';
        const [d, m, y] = rates.nextRates.date.split('/');
        const nextDateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        nextDateObj.setHours(0, 0, 0, 0);
        const diffTime = nextDateObj.getTime() - today.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) return 'Mañana';
        const daysArr = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        return daysArr[nextDateObj.getDay()];
    };

    const hasNextRates = rates.nextRates && (selectedCurrency === 'usd' || selectedCurrency === 'eur');

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>Conversor</Text>

                {hasNextRates && (
                    <TouchableOpacity
                        style={[styles.tomorrowToggle, useTomorrow && styles.tomorrowToggleActive]}
                        onPress={() => setUseTomorrow(!useTomorrow)}
                        activeOpacity={0.7}
                    >
                        <Calendar size={14} color={useTomorrow ? COLORS.bcvGreen : COLORS.textSecondary} />
                        <View style={{ marginLeft: 8 }}>
                            <Text style={[styles.tomorrowToggleSubtitle, useTomorrow && { color: 'rgba(52, 199, 89, 0.7)' }]}>
                                {useTomorrow ? 'Usando' : 'Ver'}
                            </Text>
                            <Text style={[styles.tomorrowToggleText, useTomorrow && styles.tomorrowToggleTextActive]}>
                                {getFriendlyNextDate()} ({rates.nextRates.date.substring(0, 5)})
                            </Text>
                        </View>
                    </TouchableOpacity>
                )}
            </View>

            {/* Currency Selector */}
            <View style={styles.selectorContainer}>
                {['usd', 'eur', 'parallel'].map((curr) => (
                    <TouchableOpacity
                        key={curr}
                        style={[styles.chip, selectedCurrency === curr && styles.activeChip]}
                        onPress={() => setSelectedCurrency(curr)}
                    >
                        <Text style={[styles.chipText, selectedCurrency === curr && styles.activeChipText]}>
                            {curr === 'parallel' ? 'Promedio USDT' : `${curr.toUpperCase()} BCV`}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.converterBox}>
                {/* Foreign Input */}
                <View style={styles.inputSection}>
                    <View style={styles.inputWrapper}>
                        <Text style={styles.inputLabel}>{getSymbol()}</Text>
                        <TextInput
                            style={styles.input}
                            value={foreignAmount}
                            onChangeText={handleForeignChange}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                            placeholderTextColor={COLORS.textSecondary}
                        />
                    </View>
                    <TouchableOpacity
                        style={[styles.copyButton, copiedForeign && styles.copyButtonSuccess]}
                        onPress={() => copyToClipboard(foreignAmount, 'foreign')}
                    >
                        {copiedForeign ? <Check size={16} color={COLORS.bcvGreen} /> : <Copy size={16} color={COLORS.textSecondary} />}
                    </TouchableOpacity>
                    <Text style={styles.currencySubLabel}>{getCurrencyLabel()}</Text>
                </View>

                <View style={styles.divider}>
                    <ArrowLeftRight color={COLORS.textSecondary} size={16} />
                </View>

                {/* Bs Input */}
                <View style={styles.inputSection}>
                    <View style={styles.inputWrapper}>
                        <Text style={styles.inputLabel}>Bs</Text>
                        <TextInput
                            style={[styles.input, { color: COLORS.bcvGreen }]}
                            value={bsAmount}
                            onChangeText={handleBsChange}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                            placeholderTextColor={COLORS.textSecondary}
                        />
                    </View>
                    <TouchableOpacity
                        style={[styles.copyButton, copiedBs && styles.copyButtonSuccess]}
                        onPress={() => copyToClipboard(bsAmount, 'bs')}
                    >
                        {copiedBs ? <Check size={16} color={COLORS.bcvGreen} /> : <Copy size={16} color={COLORS.textSecondary} />}
                    </TouchableOpacity>
                    <Text style={styles.currencySubLabel}>BOLÍVARES</Text>
                </View>
            </View>

            <Text style={styles.rateInfo}>
                Tasa aplicada: <Text style={{ fontWeight: 'bold', color: useTomorrow && hasNextRates ? COLORS.bcvGreen : COLORS.textPrimary }}>
                    {formatCurrency(currentRate)} Bs {useTomorrow && hasNextRates ? `(${getFriendlyNextDate()})` : '(Hoy)'}
                </Text>
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.card,
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        elevation: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        color: COLORS.textPrimary,
        fontSize: 18,
        fontWeight: '700',
    },
    tomorrowToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    tomorrowToggleActive: {
        backgroundColor: 'rgba(52, 199, 89, 0.1)',
        borderColor: 'rgba(52, 199, 89, 0.3)',
    },
    tomorrowToggleSubtitle: {
        color: COLORS.textSecondary,
        fontSize: 9,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: -2,
    },
    tomorrowToggleText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontWeight: '700',
    },
    tomorrowToggleTextActive: {
        color: COLORS.bcvGreen,
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
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    activeChip: {
        backgroundColor: 'rgba(52, 199, 89, 0.15)',
        borderColor: COLORS.bcvGreen,
    },
    chipText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
    activeChipText: {
        color: COLORS.bcvGreen,
    },
    converterBox: {
        backgroundColor: 'rgba(0,0,0,0.2)',
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
        color: COLORS.textSecondary,
        fontSize: 20,
        fontWeight: '600',
        width: 35,
    },
    input: {
        flex: 1,
        color: COLORS.textPrimary,
        fontSize: 26,
        fontWeight: '800',
        padding: 0,
    },
    copyButton: {
        padding: 10,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.03)',
        marginHorizontal: 8,
    },
    copyButtonSuccess: {
        backgroundColor: 'rgba(52, 199, 89, 0.1)',
    },
    currencySubLabel: {
        color: COLORS.textSecondary,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        width: 50,
        textAlign: 'right',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    rateInfo: {
        color: COLORS.textSecondary,
        fontSize: 12,
        marginTop: 16,
        textAlign: 'center',
    }
});

export default CurrencyConverter;
