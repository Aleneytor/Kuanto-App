import React, { useMemo, useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Modal,
    TouchableOpacity,
    FlatList,
    Platform,
    useWindowDimensions,
    ActivityIndicator,
    ScrollView
} from 'react-native';
import { X, History, Calendar, Download, ChevronLeft, AlertTriangle } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { fetchAndPrepareExportData, exportToExcel } from '../services/exportService';


const HistoryModal = ({ visible, onClose, rates, usdtHistory }) => {
    const { colors, isDark } = useTheme();
    const { height } = useWindowDimensions();
    const { showToast } = useToast();

    // View State: 'list' | 'export'
    const [view, setView] = useState('list');

    // Export State
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d;
    });
    const [endDate, setEndDate] = useState(new Date());
    const [loading, setLoading] = useState(false);
    const [progressStep, setProgressStep] = useState('');
    const [showPicker, setShowPicker] = useState(null); // 'start' | 'end' | null

    // Reset view when opening/closing
    React.useEffect(() => {
        if (visible) {
            setView('list');
            setLoading(false);
        }
    }, [visible]);


    const historyData = useMemo(() => {
        if (!rates?.history && !usdtHistory) return [];

        const unifiedHistory = {};

        // Add all BCV dates
        rates.history?.forEach(item => {
            unifiedHistory[item.date] = {
                date: item.date,
                usd: item.usd,
                eur: item.eur,
                usdt: null
            };
        });

        // Add/merge all USDT dates
        usdtHistory?.forEach(item => {
            if (unifiedHistory[item.date]) {
                unifiedHistory[item.date].usdt = item.usdt;
            } else {
                unifiedHistory[item.date] = {
                    date: item.date,
                    usd: null,
                    eur: null,
                    usdt: item.usdt
                };
            }
        });

        // Sort by date (newest first)
        return Object.values(unifiedHistory)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [rates, usdtHistory]);

    const filteredData = historyData;

    const formatDate = (dateString) => {
        if (!dateString) return '';
        // Always show year in 2-digit format (25, 24, 23, etc.)
        const date = new Date(dateString + 'T00:00:00'); // Force local time
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear().toString().substr(-2);
        return `${day}/${month}/${year}`;
    };

    const formatCurrency = (value) => {
        if (!value) return '—';
        return value.toLocaleString('es-VE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    // --- Export Logic ---
    const handleDownload = async () => {
        if (startDate > endDate) {
            showToast('La fecha de inicio no puede ser mayor a la final', 'error');
            return;
        }

        setLoading(true);
        setProgressStep('Obteniendo datos...');

        try {
            const data = await fetchAndPrepareExportData(startDate, endDate);

            if (data.length === 0) {
                showToast('No hay datos disponibles para este rango', 'warning');
                setLoading(false);
                return;
            }

            setProgressStep('Generando Excel...');
            await exportToExcel(data);

            showToast('Archivo generado correctamente', 'success');
            onClose();
        } catch (error) {
            console.error(error);
            showToast('Error al generar el archivo', 'error');
        } finally {
            setLoading(false);
            setProgressStep('');
        }
    };

    const renderDateInput = (label, date, setDate, type) => {
        return (
            <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>{label}</Text>

                {Platform.OS === 'web' ? (
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        height: 50,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                        borderColor: colors.border,
                        position: 'relative'
                    }}>
                        <Calendar size={20} color={colors.textPrimary} style={{ marginRight: 8 }} />
                        <Text style={{
                            color: isDark ? '#fff' : '#000',
                            fontSize: 16,
                            fontFamily: 'System',
                        }}>
                            {date.toLocaleDateString('es-VE')}
                        </Text>
                        <input
                            type="date"
                            value={date.toISOString().split('T')[0]}
                            onChange={(e) => setDate(new Date(e.target.value))}
                            onClick={(e) => {
                                try {
                                    if (e.target.showPicker) e.target.showPicker();
                                } catch (error) {
                                    console.log('showPicker not supported');
                                }
                            }}
                            max={new Date().toISOString().split('T')[0]}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                opacity: 0,
                                cursor: 'pointer',
                                zIndex: 10
                            }}
                        />
                    </View>
                ) : (
                    <View>
                        <TouchableOpacity
                            onPress={() => setShowPicker(type)}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                padding: 12,
                                borderRadius: 12,
                                borderWidth: 1,
                                height: 50,
                                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                                borderColor: colors.border
                            }}
                        >
                            <Calendar size={20} color={colors.textPrimary} />
                            <Text style={{ fontSize: 16, marginLeft: 8, color: colors.textPrimary }}>
                                {date.toLocaleDateString('es-VE')}
                            </Text>
                        </TouchableOpacity>
                        {showPicker === type && (
                            <DateTimePicker
                                value={date}
                                mode="date"
                                display="default"
                                maximumDate={new Date()}
                                minimumDate={new Date(2020, 0, 1)}
                                onChange={(event, selectedDate) => {
                                    setShowPicker(null);
                                    if (selectedDate) setDate(selectedDate);
                                }}
                            />
                        )}
                    </View>
                )}
            </View>
        );
    };


    // --- Render Component ---

    const renderHeader = () => (
        <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {view === 'export' ? (
                    <>
                        <TouchableOpacity onPress={() => setView('list')} style={{ padding: 4 }}>
                            <ChevronLeft size={24} color={colors.textPrimary} />
                        </TouchableOpacity>
                        <Text style={[styles.title, { color: colors.textPrimary }]}>Exportar Excel</Text>
                    </>
                ) : (
                    <>
                        <History size={20} color={colors.textSecondary} />
                        <Text style={[styles.title, { color: colors.textPrimary }]}>HISTORIAL DE PRECIOS</Text>
                    </>
                )}
            </View>
            <TouchableOpacity
                onPress={onClose}
                style={[styles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
            >
                <X size={20} color={colors.textPrimary} />
            </TouchableOpacity>
        </View>
    );

    const renderListData = () => (
        <View style={{ flex: 1 }}>
            {/* Table Header */}
            <View style={[styles.tableHeader, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                borderColor: colors.divider
            }]}>
                <View style={[styles.columnHeader, { flex: 0.8 }]}>
                    <Text style={[styles.headerText, { color: colors.textSecondary }]}>FECHA</Text>
                </View>
                <View style={[styles.columnHeader, { flex: 1, alignItems: 'flex-end' }]}>
                    <Text style={[styles.headerText, { color: colors.bcvGreen }]}>USD BCV</Text>
                </View>
                <View style={[styles.columnHeader, { flex: 1, alignItems: 'flex-end' }]}>
                    <Text style={[styles.headerText, { color: colors.euroBlue }]}>EUR BCV</Text>
                </View>
                <View style={[styles.columnHeader, { flex: 1, alignItems: 'flex-end' }]}>
                    <Text style={[styles.headerText, { color: colors.parallelOrange || '#F7931A' }]}>USDT</Text>
                </View>
            </View>

            {/* List */}
            <FlatList
                data={filteredData}
                keyExtractor={(item) => item.date}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                initialNumToRender={50}
                maxToRenderPerBatch={50}
                windowSize={21}
                renderItem={({ item, index }) => (
                    <View style={[
                        styles.row,
                        {
                            borderBottomColor: colors.divider,
                            backgroundColor: index % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)')
                        }
                    ]}>
                        <View style={[styles.cell, { flex: 0.8 }]}>
                            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                                {formatDate(item.date)}
                            </Text>
                        </View>
                        <View style={[styles.cell, { flex: 1, alignItems: 'flex-end' }]}>
                            <Text style={[styles.valueText, { color: colors.bcvGreen }]}>
                                {formatCurrency(item.usd)}
                            </Text>
                        </View>
                        <View style={[styles.cell, { flex: 1, alignItems: 'flex-end' }]}>
                            <Text style={[styles.valueText, { color: colors.euroBlue }]}>
                                {formatCurrency(item.eur)}
                            </Text>
                        </View>
                        <View style={[styles.cell, { flex: 1, alignItems: 'flex-end' }]}>
                            <Text style={[styles.valueText, { color: colors.parallelOrange || '#F7931A' }]}>
                                {formatCurrency(item.usdt)}
                            </Text>
                        </View>
                    </View>
                )}
            />
        </View>
    );

    const renderExportForm = () => (
        <ScrollView style={{ flex: 1, padding: 20 }}>
            <View style={{
                flexDirection: 'row',
                gap: 12,
                padding: 12,
                borderRadius: 12,
                marginBottom: 20,
                backgroundColor: isDark ? 'rgba(255,149,0,0.1)' : 'rgba(255,149,0,0.1)'
            }}>
                <AlertTriangle size={18} color={colors.parallelOrange} style={{ marginTop: 2 }} />
                <Text style={{ fontSize: 13, flex: 1, lineHeight: 18, color: colors.textSecondary }}>
                    El reporte incluye tasas del BCV (USD/EUR) y Promedio USDT.
                    {"\n"}
                    <Text style={{ fontWeight: 'bold' }}>Nota:</Text> Los datos de USDT están disponibles solo desde fechas recientes.
                </Text>
            </View>

            <View style={{ gap: 16 }}>
                {renderDateInput("Desde", startDate, setStartDate, 'start')}
                {renderDateInput("Hasta", endDate, setEndDate, 'end')}
            </View>
        </ScrollView>
    );

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={[styles.backdrop, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' }]}
                    activeOpacity={1}
                    onPress={onClose}
                />

                <View style={[styles.container, {
                    backgroundColor: colors.card,
                    borderColor: colors.glassBorder,
                    maxHeight: height * 0.85
                }]}>
                    {renderHeader()}

                    <View style={styles.content}>
                        {view === 'list' ? renderListData() : renderExportForm()}
                    </View>

                    {/* Footer */}
                    <View style={[styles.footer, { borderTopColor: colors.divider }]}>
                        {view === 'list' ? (
                            <TouchableOpacity
                                onPress={() => setView('export')}
                                style={[styles.downloadButton, { backgroundColor: colors.bcvGreen }]}
                                activeOpacity={0.8}
                            >
                                <Download size={18} color="#013a21" style={{ marginRight: 8 }} />
                                <Text style={[styles.downloadButtonText, { color: '#013a21' }]}>Descargar Historial en Excel</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                onPress={handleDownload}
                                disabled={loading}
                                style={[styles.downloadButton, { backgroundColor: colors.bcvGreen, opacity: loading ? 0.7 : 1 }]}
                                activeOpacity={0.8}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="#013a21" />
                                ) : (
                                    <>
                                        <Download size={18} color="#013a21" style={{ marginRight: 8 }} />
                                        <Text style={[styles.downloadButtonText, { color: '#013a21' }]}>
                                            {loading ? progressStep : 'Generar y Descargar'}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </Modal >
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        ...Platform.select({
            web: {
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)'
            }
        })
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    container: {
        width: '100%',
        maxWidth: 600,
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    closeButton: {
        padding: 8,
        borderRadius: 20,
    },
    content: {
        flex: 1,
    },
    tableHeader: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    columnHeader: {
        justifyContent: 'center',
    },
    headerText: {
        fontSize: 11,
        fontWeight: '700',
        opacity: 0.8,
    },
    row: {
        flexDirection: 'row',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        alignItems: 'center',
    },
    cell: {
        justifyContent: 'center',
    },
    dateText: {
        fontSize: 13,
        fontWeight: '600',
    },
    valueText: {
        fontSize: 14,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
    },
    downloadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        width: '100%',
    },
    downloadButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    }
});

export default HistoryModal;
