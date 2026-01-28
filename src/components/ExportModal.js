import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    ActivityIndicator,
    ScrollView
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { X, Calendar, Download, FileText, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { fetchAndPrepareExportData, exportToExcel } from '../services/exportService';
import { useToast } from '../context/ToastContext';

const ExportModal = ({ visible, onClose }) => {
    const { colors, isDark } = useTheme();
    const { showToast } = useToast();

    // Default range: Last 30 days
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d;
    });
    const [endDate, setEndDate] = useState(new Date());

    const [loading, setLoading] = useState(false);
    const [progressStep, setProgressStep] = useState(''); // 'fetching', 'generating'

    // Date Picker State (Mobile)
    const [showPicker, setShowPicker] = useState(null); // 'start' or 'end' or null

    const handleDownload = async () => {
        if (startDate > endDate) {
            showToast('La fecha de inicio no puede ser mayor a la final', 'error');
            return;
        }

        setLoading(true);
        setProgressStep('Obteniendo datos...');

        try {
            // 1. Fetch Data
            const data = await fetchAndPrepareExportData(startDate, endDate);

            if (data.length === 0) {
                showToast('No hay datos disponibles para este rango', 'warning');
                setLoading(false);
                return;
            }

            setProgressStep('Generando Excel...');

            // 2. Generate and Download
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

    const onDateChange = (event, selectedDate) => {
        if (Platform.OS === 'android') {
            // Check which picker was open (stored in showPicker state is tough with async, 
            // but standard behavior is to close immediately)
            // We need a way to know WHICH variable to update.
            // Simplified: The DateTimePicker component will likely require separate rendering or conditional
        }
    };

    // Helper for rendering Date Picker on Mobile
    const renderMobileDatePicker = (type, date, setDate) => {
        if (Platform.OS === 'web') return null;

        return (
            showPicker === type && (
                <DateTimePicker
                    value={date}
                    mode="date"
                    display="default"
                    maximumDate={new Date()} // Can't select future
                    minimumDate={new Date(2020, 0, 1)} // Data starts ~2020
                    onChange={(event, selectedDate) => {
                        setShowPicker(null);
                        if (selectedDate) setDate(selectedDate);
                    }}
                />
            )
        );
    };

    // Helper for rendering the Date Input Button (Mobile) or HTML Input (Web)
    const renderDateInput = (label, date, setDate, type) => {
        return (
            <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>

                {Platform.OS === 'web' ? (
                    <View style={[styles.dateButton, {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                        borderColor: colors.border,
                        position: 'relative' // Ensure container is relative
                    }]}>
                        <Calendar size={20} color={colors.textPrimary} style={{ marginRight: 8 }} />
                        {/* Visual Text Representation */}
                        <Text style={{
                            color: isDark ? '#fff' : '#000',
                            fontSize: 16,
                            fontFamily: 'System', // Use default font
                        }}>
                            {date.toLocaleDateString('es-VE')}
                        </Text>

                        {/* Invisible Functional Input */}
                        <input
                            type="date"
                            value={date.toISOString().split('T')[0]}
                            onChange={(e) => setDate(new Date(e.target.value))}
                            onClick={(e) => {
                                // Force open the native picker on click (Desktop Web fix)
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
                                opacity: 0, // Hidden but clickable
                                cursor: 'pointer',
                                zIndex: 10
                            }}
                        />
                    </View>
                ) : (
                    <TouchableOpacity
                        onPress={() => setShowPicker(type)}
                        style={[styles.dateButton, {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                            borderColor: colors.border
                        }]}
                    >
                        <Calendar size={20} color={colors.textPrimary} />
                        <Text style={[styles.dateText, { color: colors.textPrimary }]}>
                            {date.toLocaleDateString('es-VE')}
                        </Text>
                    </TouchableOpacity>
                )}
                {renderMobileDatePicker(type, date, setDate)}
            </View>
        );
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, {
                    backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                    borderColor: isDark ? '#333' : '#e5e5e5'
                }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={[styles.iconContainer, { backgroundColor: `${colors.bcvGreen}20` }]}>
                                <FileText size={24} color={colors.bcvGreen} />
                            </View>
                            <Text style={[styles.title, { color: colors.textPrimary }]}>
                                Descargar Histórico
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} disabled={loading}>
                            <X size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <ScrollView style={styles.content}>
                        <View style={[styles.infoBox, { backgroundColor: isDark ? 'rgba(255,149,0,0.1)' : 'rgba(255,149,0,0.1)' }]}>
                            <AlertTriangle size={18} color={colors.parallelOrange} style={{ marginTop: 2 }} />
                            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                                El reporte incluye tasas del BCV (USD/EUR) y Promedio USDT.
                                {"\n"}
                                <Text style={{ fontWeight: 'bold' }}>Nota:</Text> Los datos de USDT están disponibles solo desde fechas recientes.
                            </Text>
                        </View>

                        <View style={styles.inputsRow}>
                            {renderDateInput("Desde", startDate, setStartDate, 'start')}
                            {renderDateInput("Hasta", endDate, setEndDate, 'end')}
                        </View>
                    </ScrollView>

                    {/* Footer */}
                    <View style={[styles.footer, { borderTopColor: colors.border }]}>
                        <TouchableOpacity
                            style={[styles.cancelButton, { borderColor: colors.border }]}
                            onPress={onClose}
                            disabled={loading}
                        >
                            <Text style={[styles.cancelText, { color: colors.textPrimary }]}>Cancelar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.downloadButton, { backgroundColor: colors.bcvGreen, opacity: loading ? 0.7 : 1 }]}
                            onPress={handleDownload}
                            disabled={loading}
                        >
                            {loading ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <ActivityIndicator size="small" color="#fff" />
                                    <Text style={styles.downloadText}>{progressStep}</Text>
                                </View>
                            ) : (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Download size={20} color="#fff" />
                                    <Text style={styles.downloadText}>Descargar Excel</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        ...Platform.select({
            web: {
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)' // Safari support
            }
        })
    },
    modalContent: {
        width: '100%',
        maxWidth: 500,
        borderRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
        // Shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
    },
    iconContainer: {
        padding: 8,
        borderRadius: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    content: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    inputsRow: {
        marginTop: 20,
        gap: 16,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        height: 50,
    },
    dateText: {
        fontSize: 16,
        marginLeft: 8,
    },
    infoBox: {
        flexDirection: 'row',
        gap: 12,
        padding: 12,
        borderRadius: 12,
        marginTop: 0,
    },
    infoText: {
        fontSize: 13,
        flex: 1,
        lineHeight: 18,
    },
    footer: {
        flexDirection: 'row',
        padding: 20,
        gap: 12,
        borderTopWidth: 1,
    },
    cancelButton: {
        flex: 1,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelText: {
        fontSize: 16,
        fontWeight: '600',
    },
    downloadButton: {
        flex: 2,
        padding: 14,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    downloadText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default ExportModal;
