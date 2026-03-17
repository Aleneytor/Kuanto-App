import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { FONTS } from '../constants/typography';
import { TrendingUp, Layers, RotateCcw } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';

const GapCard = ({ label1, label2, value1, value2, color, colors, isDark }) => {
    const diff = Math.abs(value1 - value2);
    const percent = (diff / Math.min(value1, value2)) * 100;
    
    return (
        <View style={[styles.gapCard, { 
            backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
            borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        }]}>
            {/* Premium Glow Effect */}
            <View style={[styles.glowCircle, { backgroundColor: color, opacity: 0.15 }]} />
            
            <View style={styles.topRow}>
                <View style={styles.labelContainer}>
                    <Text style={[styles.assetLabel, { color: colors.textPrimary }]}>{label1}</Text>
                    <Text style={[styles.separator, { color: colors.textSecondary }]}>↔</Text>
                    <Text style={[styles.assetLabel, { color: colors.textPrimary }]}>{label2}</Text>
                </View>

                <View style={[
                    styles.badge, 
                    { 
                        backgroundColor: 'rgba(0, 227, 120, 0.1)',
                        borderColor: 'rgba(0, 227, 120, 0.2)',
                    }
                ]}>
                    <TrendingUp size={14} color="#00E378" strokeWidth={2.5} />
                    <Text style={[styles.badgeText, { color: '#00E378' }]}>+{percent.toFixed(2)}%</Text>
                </View>
            </View>

            <Text style={[styles.diffText, { color: colors.textSecondary }]}>Diferencia:</Text>
            <Text style={[styles.diffValue, { color: color }]}>Bs. {diff.toFixed(2).replace('.', ',')}</Text>
        </View>
    );
};

const CurrencyGap = ({ rates, isHistorical, selectedDate, onReset }) => {
    const { colors, isDark } = useTheme();
    
    if (!rates || !rates.bcv || !rates.euro || !rates.parallel) return null;

    const formattedDate = useMemo(() => {
        if (!selectedDate) return '';
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const monthNames = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        return `${dayNames[selectedDate.getDay()]}, ${selectedDate.getDate()} de ${monthNames[selectedDate.getMonth()]} de ${selectedDate.getFullYear()}`;
    }, [selectedDate]);

    return (
        <View style={[styles.container, { 
            backgroundColor: colors.card,
            shadowColor: '#000',
            borderColor: 'rgba(255,255,255,0.08)'
        }]}>
            <View style={styles.header}>
                <View style={styles.headerTitleGroup}>
                    <View style={styles.headerIcon}>
                        <Layers size={18} color="rgba(255,255,255,0.4)" />
                    </View>
                    <View>
                        <Text style={[styles.headerTitle, { color: colors.textSecondary }]}>
                            {isHistorical ? `Brecha del` : 'Brecha de Hoy'}
                        </Text>
                        {isHistorical && (
                            <Text style={[styles.headerTitle, { color: colors.textSecondary, fontSize: 14, marginTop: -2 }]}>
                                {formattedDate.split(', ')[1]}
                            </Text>
                        )}
                    </View>
                </View>

                {isHistorical && onReset && (
                    <TouchableOpacity 
                        onPress={onReset}
                        style={{
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 10,
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            borderWidth: 1,
                            borderColor: 'rgba(255,255,255,0.1)'
                        }}
                    >
                        <Text style={{ fontSize: 10, color: colors.textPrimary, fontWeight: '700', textTransform: 'uppercase' }}>
                            Hoy
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.cardsContainer}>
                <GapCard 
                    label1="BCV" 
                    label2="EUR" 
                    value1={rates.bcv} 
                    value2={rates.euro} 
                    color={colors.bcvGreen || '#34C759'}
                    colors={colors}
                    isDark={isDark}
                />
                <GapCard 
                    label1="EUR" 
                    label2="USDT" 
                    value1={rates.euro} 
                    value2={rates.parallel} 
                    color={colors.euroBlue || '#007AFF'}
                    colors={colors}
                    isDark={isDark}
                />
                <GapCard 
                    label1="USDT" 
                    label2="BCV" 
                    value1={rates.parallel} 
                    value2={rates.bcv} 
                    color={colors.parallelOrange || '#FF9F0A'}
                    colors={colors}
                    isDark={isDark}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        borderRadius: 30,
        padding: 24,
        marginBottom: 20,
        borderWidth: 1,
        ...Platform.select({
            ios: { shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },
            android: { elevation: 8 },
            web: { boxShadow: '0 20px 40px -10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)' },
        }),
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        justifyContent: 'space-between',
    },
    headerTitleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIcon: {
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 16,
        fontFamily: FONTS.bold,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    cardsContainer: {
        gap: 0,
    },
    gapCard: {
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        marginBottom: 16,
        position: 'relative',
        overflow: 'hidden',
        ...Platform.select({
            ios: { 
                shadowColor: '#000', 
                shadowOffset: { width: 0, height: 8 }, 
                shadowOpacity: 0.25, 
                shadowRadius: 15 
            },
            android: { elevation: 6 },
            web: { 
                boxShadow: '0 12px 24px -6px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
            }
        }),
    },
    glowCircle: {
        position: 'absolute',
        top: -40,
        right: -40,
        width: 120,
        height: 120,
        borderRadius: 60,
        ...Platform.select({
            web: { filter: 'blur(30px)' },
            default: { opacity: 0.2 } // Fallback for native if blur not available
        }),
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    assetLabel: {
        fontSize: 16,
        fontFamily: FONTS.bold,
        fontWeight: '800',
    },
    separator: {
        fontSize: 14,
        opacity: 0.4,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 100,
        borderWidth: 1,
        gap: 4,
    },
    badgeText: {
        fontSize: 13,
        fontFamily: FONTS.bold,
        fontWeight: '800',
    },
    diffText: {
        fontSize: 13,
        fontFamily: FONTS.medium,
        opacity: 0.6,
        marginBottom: 2,
    },
    diffValue: {
        fontSize: 24,
        fontFamily: FONTS.bold,
        fontWeight: '900',
    }
});

export default CurrencyGap;
