import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Share as NativeShare } from 'react-native';
import { Calendar, Clock, TrendingUp as Up, TrendingDown as Down, Share2 as ShareIcon } from 'lucide-react-native';
import { COLORS } from '../theme/colors';
import { formatCurrency } from '../utils/formatting';

const RateCard = ({ title, rate, color, icon, nextRate, nextDate, lastUpdated, change, onPress }) => {
    const isPositive = change > 0;

    const handleShare = async () => {
        try {
            const message = `📈 *Tasa Al Cambio*\n\n💰 ${title}: *${formatCurrency(rate)} Bs*\n📅 Fecha: ${lastUpdated || 'Hoy'}\n\nDescarga la App para más información.`;
            await NativeShare.share({
                message: message,
            });
        } catch (error) {
            console.error(error.message);
        }
    };

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
                        {icon}
                    </View>
                    <Text style={styles.cardTitle}>{title}</Text>
                </View>
                <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
                    <ShareIcon size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
            </View>

            <View style={styles.rateRow}>
                <Text style={[styles.rateText, { color: color }]}>{formatCurrency(rate)} Bs</Text>
                {change !== undefined && change !== 0 && (
                    <View style={[styles.changeBadge, { backgroundColor: isPositive ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)' }]}>
                        {isPositive ? <Up size={12} color="#34C759" /> : <Down size={12} color="#FF3B30" />}
                        <Text style={[styles.changeText, { color: isPositive ? '#34C759' : '#FF3B30' }]}>
                            {Math.abs(change).toFixed(2)}%
                        </Text>
                    </View>
                )}
            </View>

            <View style={styles.footerInfo}>
                {nextRate && (
                    <View style={styles.badge}>
                        <Calendar size={14} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
                        <Text style={styles.badgeText}>
                            Para mañana ({nextDate}): <Text style={{ color: COLORS.textPrimary }}>{formatCurrency(nextRate)} Bs</Text>
                        </Text>
                    </View>
                )}

                {lastUpdated && (
                    <View style={styles.badge}>
                        <Clock size={14} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
                        <Text style={styles.badgeText}>
                            Actualizado: <Text style={{ color: COLORS.textPrimary }}>{lastUpdated}</Text>
                        </Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.card,
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
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
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    rateRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    rateText: {
        fontSize: 40,
        fontWeight: '800',
    },
    changeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginBottom: 8,
    },
    changeText: {
        fontSize: 12,
        fontWeight: '700',
        marginLeft: 4,
    },
    footerInfo: {
        marginTop: 4,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    badgeText: {
        color: COLORS.textSecondary,
        fontSize: 13,
        fontWeight: '500',
    },
});

export default RateCard;
