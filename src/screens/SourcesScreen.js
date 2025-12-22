import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Linking, Platform } from 'react-native';
import {
    Database,
    ExternalLink,
    ShieldCheck,
    TrendingUp,
    ArrowLeft
} from 'lucide-react-native';
import { useRates } from '../context/RateContext';
import { COLORS } from '../theme/colors';
import { formatCurrency } from '../utils/formatting';

const SourcesScreen = ({ navigation }) => {
    const { rates } = useRates();

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <ArrowLeft size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Fuentes de Datos</Text>
                    <Text style={styles.headerSubtitle}>Transparencia en tiempo real</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.sourcesCard}>
                    <View style={styles.p2pSource}>
                        <View style={styles.sourceHeader}>
                            <Database size={16} color={COLORS.bcvGreen} />
                            <Text style={styles.sourceLabel}>BCV (Oficial)</Text>
                            <TouchableOpacity onPress={() => Linking.openURL('https://www.bcv.org.ve/')} style={{ marginLeft: 'auto' }}>
                                <ExternalLink size={16} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.p2pValues}>
                            <View style={styles.p2pValueItem}>
                                <Text style={styles.p2pLabel}>USD (OFICIAL):</Text>
                                <Text style={styles.p2pValue}>
                                    {rates.bcv ? `Bs. ${formatCurrency(rates.bcv)}` : '--'}
                                </Text>
                            </View>
                            <View style={styles.p2pDivider} />
                            <View style={styles.p2pValueItem}>
                                <Text style={styles.p2pLabel}>EUR (OFICIAL):</Text>
                                <Text style={styles.p2pValue}>
                                    {rates.euro ? `Bs. ${formatCurrency(rates.euro)}` : '--'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.p2pSource}>
                        <View style={styles.sourceHeader}>
                            <ShieldCheck size={16} color={COLORS.parallelOrange} />
                            <Text style={styles.sourceLabel}>Binance P2P</Text>
                        </View>
                        <View style={styles.p2pValues}>
                            <View style={styles.p2pValueItem}>
                                <Text style={styles.p2pLabel}>Compra:</Text>
                                <Text style={styles.p2pValue}>
                                    {rates.p2p?.binance?.sell ? `Bs. ${formatCurrency(rates.p2p.binance.sell)}` : '--'}
                                </Text>
                            </View>
                            <View style={styles.p2pDivider} />
                            <View style={styles.p2pValueItem}>
                                <Text style={styles.p2pLabel}>Venta:</Text>
                                <Text style={styles.p2pValue}>
                                    {rates.p2p?.binance?.buy ? `Bs. ${formatCurrency(rates.p2p.binance.buy)}` : '--'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.p2pSource}>
                        <View style={styles.sourceHeader}>
                            <TrendingUp size={16} color={COLORS.euroBlue} />
                            <Text style={styles.sourceLabel}>Bybit P2P</Text>
                        </View>
                        <View style={styles.p2pValues}>
                            <View style={styles.p2pValueItem}>
                                <Text style={styles.p2pLabel}>Compra:</Text>
                                <Text style={styles.p2pValue}>
                                    {rates.p2p?.bybit?.sell ? `Bs. ${formatCurrency(rates.p2p.bybit.sell)}` : '--'}
                                </Text>
                            </View>
                            <View style={styles.p2pDivider} />
                            <View style={styles.p2pValueItem}>
                                <Text style={styles.p2pLabel}>Venta:</Text>
                                <Text style={styles.p2pValue}>
                                    {rates.p2p?.bybit?.buy ? `Bs. ${formatCurrency(rates.p2p.bybit.buy)}` : '--'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.p2pSource}>
                        <View style={styles.sourceHeader}>
                            <TrendingUp size={16} color={COLORS.purple || '#9b59b6'} />
                            <Text style={styles.sourceLabel}>Yadio (Tasa Oficial)</Text>
                        </View>
                        <View style={styles.p2pValues}>
                            <View style={styles.p2pValueItem}>
                                <Text style={styles.p2pLabel}>Compra:</Text>
                                <Text style={styles.p2pValue}>
                                    {rates.p2p?.yadio?.sell ? `Bs. ${formatCurrency(rates.p2p.yadio.sell)}` : '--'}
                                </Text>
                            </View>
                            <View style={styles.p2pDivider} />
                            <View style={styles.p2pValueItem}>
                                <Text style={styles.p2pLabel}>Venta:</Text>
                                <Text style={styles.p2pValue}>
                                    {rates.p2p?.yadio?.buy ? `Bs. ${formatCurrency(rates.p2p.yadio.buy)}` : '--'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.noteContainer}>
                    <Text style={styles.noteText}>
                        * Los datos P2P se promedian en base a los 5 mejores anuncios disponibles en cada plataforma para garantizar estabilidad frente a valores atípicos.
                    </Text>
                </View>
            </ScrollView >
        </View >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 20,
        marginTop: Platform.OS === 'ios' ? 0 : 10,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    headerSubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    sourcesCard: {
        backgroundColor: COLORS.card,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    sourceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    sourceLogo: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    sourceInfo: {
        flex: 1,
    },
    sourceLabel: {
        fontSize: 16,
        color: COLORS.textPrimary,
        fontWeight: '600',
    },
    sourceProvider: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginVertical: 4,
    },
    p2pSource: {
        paddingVertical: 16,
    },
    sourceHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
    },
    p2pValues: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(52, 199, 89, 0.03)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(52, 199, 89, 0.1)',
    },
    p2pValueItem: {
        flex: 1,
        alignItems: 'center',
    },
    p2pLabel: {
        fontSize: 10,
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 6,
    },
    p2pValue: {
        fontSize: 16,
        color: COLORS.textPrimary,
        fontWeight: '700',
    },
    p2pDivider: {
        width: 1,
        height: 24,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    noteContainer: {
        marginTop: 20,
        paddingHorizontal: 10,
    },
    noteText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontStyle: 'italic',
        lineHeight: 18,
        textAlign: 'center',
    },
});

export default SourcesScreen;
