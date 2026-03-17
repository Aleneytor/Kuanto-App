import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Modal,
    useWindowDimensions,
    Platform,
    Alert,
    Share,
    FlatList,
    Animated,
    Image
} from 'react-native';
import { ArrowLeft, Plus, Edit2, Trash2, Building2, Phone, CreditCard, User, X, Share2, FileText, CheckCircle, ChevronDown, Search, ShieldCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../context/ThemeContext';
import { usePayment } from '../context/PaymentContext';
import { VENEZUELAN_BANKS, ACCOUNT_TYPES, BANK_LOGOS } from '../constants/banks';

// Bank Picker Component
const BankPicker = ({ selectedBank, selectedBankName, onSelectBank, colors }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredBanks = VENEZUELAN_BANKS.filter(bank =>
        bank.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bank.code.includes(searchQuery)
    );

    const selectedBankDisplay = selectedBankName || 'Seleccionar banco';

    return (
        <>
            <TouchableOpacity
                onPress={() => {
                    setIsOpen(true);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                    styles.bankPickerButton,
                    { backgroundColor: colors.card, borderColor: colors.glassBorder }
                ]}
            >
                <Text style={[
                    styles.bankPickerText,
                    { color: selectedBankName ? colors.textPrimary : colors.textSecondary }
                ]}>
                    {selectedBankDisplay}
                </Text>
                <ChevronDown size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <Modal
                visible={isOpen}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsOpen(false)}
            >
                <View style={[styles.bankPickerOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                    <View style={[styles.bankPickerModal, { backgroundColor: colors.background }]}>
                        {/* Header */}
                        <View style={[styles.bankPickerHeader, { borderBottomColor: colors.divider }]}>
                            <Text style={[styles.bankPickerTitle, { color: colors.textPrimary }]}>
                                Seleccionar Banco
                            </Text>
                            <TouchableOpacity onPress={() => setIsOpen(false)}>
                                <X size={24} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        {/* Search */}
                        <View style={[styles.bankSearchContainer, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                            <Search size={18} color={colors.textSecondary} />
                            <TextInput
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholder="Buscar banco..."
                                placeholderTextColor={colors.textSecondary}
                                style={[styles.bankSearchInput, { color: colors.textPrimary }]}
                            />
                        </View>

                        {/* Bank List */}
                        <FlatList
                            showsVerticalScrollIndicator={false}
                            data={filteredBanks}
                            keyExtractor={(item) => item.code}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    onPress={() => {
                                        onSelectBank(item);
                                        setIsOpen(false);
                                        setSearchQuery('');
                                    }}
                                    style={[
                                        styles.bankItem,
                                        { borderBottomColor: colors.divider },
                                        selectedBank === item.code && { backgroundColor: `${colors.bcvGreen}15` }
                                    ]}
                                >
                                    <View style={[styles.bankItemIcon, { backgroundColor: BANK_LOGOS[item.code] ? 'transparent' : `${colors.bcvGreen}20` }]}>
                                        {BANK_LOGOS[item.code] ? (
                                            <Image 
                                                source={BANK_LOGOS[item.code]} 
                                                style={{ width: 32, height: 32 }} 
                                                resizeMode="contain"
                                            />
                                        ) : (
                                            <Building2 size={20} color={colors.bcvGreen} />
                                        )}
                                    </View>
                                    <View style={styles.bankItemInfo}>
                                        <Text style={[styles.bankItemName, { color: colors.textPrimary }]}>
                                            {item.name}
                                        </Text>
                                        <Text style={[styles.bankItemCode, { color: colors.textSecondary }]}>
                                            {item.code}
                                        </Text>
                                    </View>
                                    {selectedBank === item.code && (
                                        <CheckCircle size={20} color={colors.bcvGreen} />
                                    )}
                                </TouchableOpacity>
                            )}
                            contentContainerStyle={styles.bankListContent}
                        />
                    </View>
                </View>
            </Modal>
        </>
    );
};

const PaymentMethodsModal = ({ visible, onClose }) => {
    const { width } = useWindowDimensions();
    const { colors, isDark } = useTheme();
    const { paymentMethods, savePaymentMethod, updatePaymentMethod, deletePaymentMethod } = usePayment();

    // View state: 'list' or 'form'
    const [viewMode, setViewMode] = useState('list');
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        type: '',
        bankCode: '',
        bankName: '',
        accountNumber: '',
        phoneNumber: '',
        holderName: '',
        holderId: '',
    });
    const [isTransferSelected, setIsTransferSelected] = useState(false);
    const [showToast, setShowToast] = useState(false); // Web toast state

    const isWideScreen = width >= 768;
    const isTablet = width >= 600; // Tablets and landscape phones

    // Animations
    const modalScale = React.useRef(new Animated.Value(0.95)).current;
    const modalOpacity = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        if (visible) {
            // Trigger opening animation
            Animated.parallel([
                Animated.spring(modalScale, {
                    toValue: 1,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
                Animated.timing(modalOpacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                })
            ]).start();
        } else {
            // Reset for next opening
            modalScale.setValue(0.95);
            modalOpacity.setValue(0);
        }
    }, [visible]);

    const resetForm = () => {
        setFormData({
            type: '',
            bankCode: '',
            bankName: '',
            accountNumber: '',
            phoneNumber: '',
            holderName: '',
            holderId: '',
        });
        setIsTransferSelected(false);
        setViewMode('list');
    };


    const handleBack = () => {
        Haptics.selectionAsync();
        resetForm();
    };

    const handleAddMethod = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        resetForm();
        setViewMode('form');
        setEditingId(null);
    };

    const handleSave = async () => {
        // Validation
        if (!formData.bankCode && !formData.bankName) {
            console.error('Validation error: Bank is required');
            if (Platform.OS === 'web') {
                alert('Por favor ingresa el nombre del banco');
            } else {
                Alert.alert('Error', 'Por favor ingresa el nombre del banco');
            }
            return;
        }

        if (!formData.holderName || !formData.holderId) {
            console.error('Validation error: Holder name and ID required');
            if (Platform.OS === 'web') {
                alert('Por favor completa Nombre y Cédula/RIF');
            } else {
                Alert.alert('Error', 'Por favor completa Nombre y Cédula/RIF');
            }
            return;
        }

        if (formData.type === 'pago_movil') {
            if (!formData.phoneNumber) {
                console.error('Validation error: Phone number required for Pago Móvil');
                if (Platform.OS === 'web') {
                    alert('El número de teléfono es obligatorio para Pago Móvil');
                } else {
                    Alert.alert('Error', 'El número de teléfono es obligatorio para Pago Móvil');
                }
                return;
            }
        } else {
            // Validate account number for bank transfers
            if (!formData.accountNumber) {
                console.error('Validation error: Account number required');
                if (Platform.OS === 'web') {
                    alert('El número de cuenta es obligatorio para transferencias');
                } else {
                    Alert.alert('Error', 'El número de cuenta es obligatorio para transferencias');
                }
                return;
            }
        }

        try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            if (editingId) {
                await updatePaymentMethod(editingId, formData);
            } else {
                await savePaymentMethod(formData);
            }

            console.log('Payment method saved successfully');
            resetForm();
        } catch (error) {
            console.error('Error saving payment method:', error);
            if (Platform.OS === 'web') {
                alert('No se pudo guardar el método de pago');
            } else {
                Alert.alert('Error', 'No se pudo guardar el método de pago');
            }
        }
    };

    const handleEdit = (method) => {
        setFormData({
            ...method,
            holderId: method.holderId || '',
        });
        setEditingId(method.id);
        setIsTransferSelected(method.type !== 'pago_movil');
        setViewMode('form');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const [deleteId, setDeleteId] = useState(null); // ID to delete for custom modal

    const handleDeleteClick = (id) => {
        setDeleteId(id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await deletePaymentMethod(deleteId);
            setDeleteId(null);
        } catch (error) {
            Alert.alert('Error', 'No se pudo eliminar el método de pago');
        }
    };

    const handleShare = async (method) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const bankName = getBank(method.bankCode)?.name || method.bankName;
        // Include bank code if available
        const bankDisplay = method.bankCode ? `${bankName} (${method.bankCode})` : bankName;

        const typeLabel = ACCOUNT_TYPES.find(t => t.value === method.type)?.label;

        let message = '';

        if (method.type === 'pago_movil') {
            message += `Pago Movil ${method.holderName}\n\n`;
            message += ` ${bankDisplay}\n`;
            message += ` ${method.holderId}\n`;
            message += ` ${method.phoneNumber}\n`;
        } else {
            message += `Numero de Cuenta ${method.holderName}\n\n`;
            message += ` ${bankDisplay}\n`;
            message += ` ${method.holderName}\n`;
            message += ` ${method.holderId}\n`;
            message += ` ${typeLabel}\n`;
            message += ` ${method.accountNumber}\n`;
        }

        message += `\nEnviado desde kuanto.online`;

        try {
            // Desktop/Web: Copy to clipboard or use Navigator Share on Mobile
            if (Platform.OS === 'web') {
                if (!isWideScreen && navigator.share) {
                    try {
                        await navigator.share({
                            title: 'Mis Datos de Pago',
                            text: message,
                        });
                    } catch (error) {
                        if (error.name !== 'AbortError') {
                            await Clipboard.setStringAsync(message);
                            setShowToast(true);
                            setTimeout(() => setShowToast(false), 2500);
                        }
                    }
                } else {
                    await Clipboard.setStringAsync(message);
                    setShowToast(true);
                    setTimeout(() => setShowToast(false), 2500);
                }
            } else {
                // Native share for mobile (Whatsapp, etc)
                await Share.share({
                    message: message,
                    title: 'Mis Datos de Pago'
                });
            }
        } catch (error) {
            console.error('Error sharing', error);
        }
    };

    const getBank = (code) => VENEZUELAN_BANKS.find(b => b.code === code);

    return (
        <Modal
            visible={visible}
            animationType="none" // Manual animation for softer feel
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlayOuter}>
                <Animated.View 
                    style={[
                        styles.modalOverlay,
                        {
                            backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.3)',
                            opacity: modalOpacity,
                            ...Platform.select({
                                web: {
                                    backdropFilter: 'blur(10px)',
                                    WebkitBackdropFilter: 'blur(10px)',
                                },
                                default: {}
                            })
                        }
                    ]}
                >
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={viewMode === 'list' ? onClose : undefined}
                        style={{ flex: 1 }}
                    />
                </Animated.View>

                <Animated.View 
                    style={[
                        styles.container, 
                        isWideScreen && styles.containerWide,
                        {
                            opacity: modalOpacity,
                            transform: [{ scale: modalScale }]
                        }
                    ]}
                >

                        {/* Header */}
                        <View style={[styles.header, { borderBottomColor: colors.divider }]}>
                            {viewMode === 'form' ? (
                                <TouchableOpacity onPress={resetForm} style={styles.iconButton}>
                                    <ArrowLeft size={24} color={colors.textSecondary} />
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity onPress={onClose} style={styles.iconButton}>
                                    <X size={24} color={colors.textPrimary} />
                                </TouchableOpacity>
                            )}

                            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                                {viewMode === 'form'
                                    ? (editingId ? 'Editar Método' : 'Agregar Método')
                                    : 'Tus Datos de Pago'
                                }
                            </Text>

                            <View style={styles.headerSpacer} />
                        </View>

                        {/* Content */}
                        <View style={styles.content}>
                            {viewMode === 'list' ? (
                                <ScrollView
                                    contentContainerStyle={styles.scrollContent}
                                    showsVerticalScrollIndicator={false}
                                >
                                    {paymentMethods.length === 0 ? (
                                        <View style={styles.emptyState}>
                                            <ShieldCheck size={64} color={colors.bcvGreen} />
                                            <Text style={[styles.emptyText, { color: colors.textPrimary }]}>
                                                Guarda y luego comparte tus metodos de pago.
                                            </Text>
                                            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                                                La información se guarda de forma segura unicamente en tu dispositivo
                                            </Text>
                                            <TouchableOpacity
                                                onPress={handleAddMethod}
                                                style={[styles.emptyActionButton, { backgroundColor: colors.bcvGreen }]}
                                            >
                                                <Plus size={20} color="#013a21" />
                                                <Text style={styles.emptyActionButtonText}>
                                                    Agregar metodo de pago
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <View style={styles.cardsGrid}>
                                            {paymentMethods.map((method) => (
                                                <View
                                                    key={method.id}
                                                    style={[
                                                        styles.paymentCard,
                                                        {
                                                            backgroundColor: colors.card,
                                                            borderColor: colors.glassBorder,
                                                            // Responsive width for grid layout
                                                            width: isTablet ? 'calc(50% - 8px)' : '100%',
                                                            flexBasis: isTablet ? 'calc(50% - 8px)' : '100%',
                                                        },
                                                    ]}
                                                >
                                                    {/* Card Header: Icon & Share */}
                                                    <View style={styles.cardHeader}>
                                                        <View style={[styles.cardIcon, { backgroundColor: BANK_LOGOS[method.bankCode] ? 'transparent' : `${colors.bcvGreen}20` }]}>
                                                            {BANK_LOGOS[method.bankCode] ? (
                                                                <Image 
                                                                    source={BANK_LOGOS[method.bankCode]} 
                                                                    style={{ width: 44, height: 44 }} 
                                                                    resizeMode="contain"
                                                                />
                                                            ) : (
                                                                <Building2 size={28} color={colors.bcvGreen} />
                                                            )}
                                                        </View>
                                                        <View style={styles.actionRow}>
                                                            <TouchableOpacity
                                                                onPress={() => handleShare(method)}
                                                                style={[styles.actionButton, { backgroundColor: `${colors.bcvGreen}20` }]}
                                                            >
                                                                <Share2 size={20} color={colors.bcvGreen} />
                                                            </TouchableOpacity>
                                                            <TouchableOpacity
                                                                onPress={() => handleEdit(method)}
                                                                style={[styles.actionButton, { backgroundColor: `${colors.euroBlue}15` }]}
                                                            >
                                                                <Edit2 size={20} color={colors.euroBlue} />
                                                            </TouchableOpacity>
                                                            <TouchableOpacity
                                                                onPress={() => handleDeleteClick(method.id)}
                                                                style={[styles.actionButton, { backgroundColor: 'rgba(255,0,0,0.15)' }]}
                                                            >
                                                                <Trash2 size={20} color="#ff4444" />
                                                            </TouchableOpacity>
                                                        </View>
                                                    </View>

                                                    {/* Card Content */}
                                                    <View style={styles.cardContent}>
                                                        <Text style={[styles.bankName, { color: colors.textPrimary }]}>
                                                            {getBank(method.bankCode)?.name || method.bankName}
                                                        </Text>
                                                        <Text style={[styles.accountType, { color: colors.textSecondary }]}>
                                                            {ACCOUNT_TYPES.find(t => t.value === method.type)?.label}
                                                        </Text>

                                                        <View style={styles.cardDetails}>
                                                            {method.type !== 'pago_movil' && (
                                                                <View style={styles.detailRow}>
                                                                    <CreditCard size={14} color={colors.textSecondary} />
                                                                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                                                                        {method.accountNumber}
                                                                    </Text>
                                                                </View>
                                                            )}

                                                            {method.phoneNumber && (
                                                                <View style={styles.detailRow}>
                                                                    <Phone size={14} color={colors.textSecondary} />
                                                                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                                                                        {method.phoneNumber}
                                                                    </Text>
                                                                </View>
                                                            )}

                                                            <View style={styles.detailRow}>
                                                                <User size={14} color={colors.textSecondary} />
                                                                <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                                                                    {method.holderName}
                                                                </Text>
                                                            </View>

                                                            {method.holderId ? (
                                                                <View style={styles.detailRow}>
                                                                    <FileText size={14} color={colors.textSecondary} />
                                                                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                                                                        {method.holderId}
                                                                    </Text>
                                                                </View>
                                                            ) : null}
                                                        </View>
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                </ScrollView>
                            ) : (
                                <View style={styles.formContainer}>
                                    <ScrollView
                                        contentContainerStyle={styles.formContent}
                                        showsVerticalScrollIndicator={false}
                                    >
                                        <View style={styles.stepContainer}>
                                            <Text style={[styles.label, { color: colors.textPrimary, marginTop: 0 }]}>¿Qué desea agregar?</Text>
                                            
                                            <View style={styles.typeOptionGroup}>
                                                {/* Pago Móvil Option */}
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        Haptics.selectionAsync();
                                                        if (formData.type === 'pago_movil' && !isTransferSelected) {
                                                            setFormData({ ...formData, type: '' });
                                                        } else {
                                                            setFormData({ ...formData, type: 'pago_movil' });
                                                            setIsTransferSelected(false);
                                                        }
                                                    }}
                                                    style={[
                                                        styles.primaryTypeButton,
                                                        { borderColor: colors.glassBorder, backgroundColor: colors.card },
                                                        formData.type === 'pago_movil' && !isTransferSelected && {
                                                            backgroundColor: isDark ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.08)',
                                                            borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)',
                                                        },
                                                    ]}
                                                >
                                                    <Phone size={24} color={colors.textSecondary} />
                                                    <Text
                                                        style={[
                                                            styles.primaryTypeButtonText,
                                                            { color: formData.type === 'pago_movil' && !isTransferSelected ? colors.textPrimary : colors.textSecondary },
                                                        ]}
                                                    >
                                                        Pago Móvil
                                                    </Text>
                                                </TouchableOpacity>

                                                {/* Transferencia Option */}
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        Haptics.selectionAsync();
                                                        if (isTransferSelected) {
                                                            setIsTransferSelected(false);
                                                            setFormData({ ...formData, type: '' });
                                                        } else {
                                                            setIsTransferSelected(true);
                                                        }
                                                    }}
                                                    style={[
                                                        styles.primaryTypeButton,
                                                        { borderColor: colors.glassBorder, backgroundColor: colors.card },
                                                        isTransferSelected && {
                                                            backgroundColor: isDark ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.08)',
                                                            borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)',
                                                        },
                                                    ]}
                                                >
                                                    <Building2 size={24} color={colors.textSecondary} />
                                                    <Text
                                                        style={[
                                                            styles.primaryTypeButtonText,
                                                            { color: isTransferSelected ? colors.textPrimary : colors.textSecondary },
                                                        ]}
                                                    >
                                                        Transferencia Bancaria
                                                    </Text>
                                                </TouchableOpacity>

                                                {/* Sub-menu for Transferencia */}
                                                {isTransferSelected && (
                                                    <View style={styles.subMenuContainer}>
                                                        <Text style={[styles.subLabel, { color: colors.textSecondary }]}>Seleccione el tipo de cuenta:</Text>
                                                        <View style={styles.subTypeRow}>
                                                            <TouchableOpacity
                                                                onPress={() => {
                                                                    Haptics.selectionAsync();
                                                                    setFormData({ ...formData, type: 'cuenta_corriente' });
                                                                }}
                                                                style={[
                                                                    styles.subTypeButton,
                                                                    { backgroundColor: colors.card, borderColor: colors.glassBorder },
                                                                    formData.type === 'cuenta_corriente' && {
                                                                        backgroundColor: isDark ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.08)',
                                                                        borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)',
                                                                        borderWidth: 2
                                                                    }
                                                                ]}
                                                            >
                                                                <Text style={[styles.subTypeButtonText, { color: formData.type === 'cuenta_corriente' ? colors.textPrimary : colors.textSecondary }]}>Corriente</Text>
                                                            </TouchableOpacity>
                                                            <TouchableOpacity
                                                                onPress={() => {
                                                                    Haptics.selectionAsync();
                                                                    setFormData({ ...formData, type: 'cuenta_ahorro' });
                                                                }}
                                                                style={[
                                                                    styles.subTypeButton,
                                                                    { backgroundColor: colors.card, borderColor: colors.glassBorder },
                                                                    formData.type === 'cuenta_ahorro' && {
                                                                        backgroundColor: isDark ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.08)',
                                                                        borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)',
                                                                        borderWidth: 2
                                                                    }
                                                                ]}
                                                            >
                                                                <Text style={[styles.subTypeButtonText, { color: formData.type === 'cuenta_ahorro' ? colors.textPrimary : colors.textSecondary }]}>Ahorro</Text>
                                                            </TouchableOpacity>
                                                        </View>
                                                    </View>
                                                )}
                                            </View>

                                            {formData.type ? (
                                                <View>
                                                    <View style={styles.separator} />

                                                    <Text style={[styles.label, { color: colors.textPrimary }]}>Banco</Text>
                                                    <BankPicker
                                                        selectedBank={formData.bankCode}
                                                        selectedBankName={formData.bankName}
                                                        onSelectBank={(bank) => {
                                                            setFormData({ ...formData, bankCode: bank.code, bankName: bank.name });
                                                            Haptics.selectionAsync();
                                                        }}
                                                        colors={colors}
                                                    />

                                                    <Text style={[styles.label, { color: colors.textPrimary }]}>Nombre y Apellido</Text>
                                                    <TextInput
                                                        value={formData.holderName}
                                                        onChangeText={(text) => setFormData({ ...formData, holderName: text })}
                                                        placeholder="Ej: Juan Pérez"
                                                        placeholderTextColor={colors.textSecondary}
                                                        style={[styles.input, { backgroundColor: colors.card, color: colors.textPrimary, borderColor: colors.glassBorder }]}
                                                    />

                                                    <Text style={[styles.label, { color: colors.textPrimary }]}>Cédula o RIF</Text>
                                                    <TextInput
                                                        value={formData.holderId}
                                                        onChangeText={(text) => setFormData({ ...formData, holderId: text.replace(/[^0-9]/g, '') })}
                                                        placeholder="Ej: 12345678"
                                                        placeholderTextColor={colors.textSecondary}
                                                        keyboardType="numeric"
                                                        style={[styles.input, { backgroundColor: colors.card, color: colors.textPrimary, borderColor: colors.glassBorder }]}
                                                    />

                                                    {formData.type === 'pago_movil' && (
                                                        <View>
                                                            <Text style={[styles.label, { color: colors.textPrimary }]}>Teléfono Celular *</Text>
                                                            <TextInput
                                                                value={formData.phoneNumber}
                                                                onChangeText={(text) => setFormData({ ...formData, phoneNumber: text.replace(/[^0-9]/g, '') })}
                                                                placeholder="04121234567"
                                                                placeholderTextColor={colors.textSecondary}
                                                                keyboardType="phone-pad"
                                                                maxLength={11}
                                                                style={[styles.input, { backgroundColor: colors.card, color: colors.textPrimary, borderColor: colors.glassBorder }]}
                                                            />
                                                        </View>
                                                    )}

                                                    {formData.type !== 'pago_movil' && (
                                                        <View>
                                                            <Text style={[styles.label, { color: colors.textPrimary }]}>Número de Cuenta *</Text>
                                                            <TextInput
                                                                value={formData.accountNumber}
                                                                onChangeText={(text) => setFormData({ ...formData, accountNumber: text.replace(/[^0-9]/g, '') })}
                                                                placeholder="0102..."
                                                                placeholderTextColor={colors.textSecondary}
                                                                keyboardType="numeric"
                                                                maxLength={20}
                                                                style={[styles.input, { backgroundColor: colors.card, color: colors.textPrimary, borderColor: colors.glassBorder }]}
                                                            />
                                                        </View>
                                                    )}
                                                </View>
                                            ) : null}
                                        </View>
                                    </ScrollView>

                                    {/* Navigation Buttons */}
                                    <View style={styles.navigationButtons}>
                                        <TouchableOpacity
                                            onPress={handleBack}
                                            style={[styles.navButton, { borderColor: colors.glassBorder }]}
                                        >
                                            <Text style={[styles.navButtonText, { color: colors.textPrimary }]}>Cancelar</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={handleSave}
                                            disabled={!formData.type}
                                            style={[
                                                styles.navButton, 
                                                styles.primaryNavButton, 
                                                { backgroundColor: formData.type ? colors.bcvGreen : 'rgba(255,255,255,0.05)' }
                                            ]}
                                        >
                                            <Text style={[styles.primaryNavButtonText, { color: formData.type ? '#013a21' : colors.textSecondary }]}>
                                                {editingId ? 'Actualizar' : 'Guardar'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </View>
                    </Animated.View>
                
                {/* Custom Delete Confirmation Modal */}
                {deleteId && (
                    <View style={styles.confirmationOverlay}>
                        <View style={[styles.confirmationBox, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                            <View style={styles.warningIcon}>
                                <Trash2 size={32} color="#ff4444" />
                            </View>
                            <Text style={[styles.confirmTitle, { color: colors.textPrimary }]}>
                                ¿Eliminar Datos?
                            </Text>
                            <Text style={[styles.confirmMessage, { color: colors.textSecondary }]}>
                                ¿Realmente quieres eliminar tus datos?
                            </Text>
                            <View style={styles.confirmButtons}>
                                <TouchableOpacity
                                    onPress={() => setDeleteId(null)}
                                    style={[styles.cancelButton, { borderColor: colors.glassBorder }]}
                                >
                                    <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>NO</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={confirmDelete}
                                    style={[styles.deleteConfirmButton, { backgroundColor: '#ff4444' }]}
                                >
                                    <Text style={styles.deleteConfirmText}>SI</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}

                {/* Floating Toast for Web */}
                {showToast && (
                    <View style={[styles.toastContainer, { backgroundColor: colors.bcvGreen }]}>
                        <CheckCircle size={24} color="#FFFFFF" />
                        <Text style={styles.toastText}>Datos Copiado Exitosamente</Text>
                    </View>
                )}
            </View>
        </Modal >
    );
};

const styles = StyleSheet.create({
    modalOverlayOuter: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    container: {
        width: '100%',
        height: '100%',
        maxWidth: 900, // Increased width for better use of space on tablets/landscape
        alignSelf: 'center',
    },
    containerWide: {
        height: '92%', // Slightly taller popup on desktop
        marginTop: '4%',
        borderRadius: 24,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 20,
        borderBottomWidth: 1,
    },
    iconButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        flex: 1,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    headerSpacer: {
        width: 40,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40, // Extra bottom padding
    },
    emptyState: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 80,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 20,
        textAlign: 'center',
        maxWidth: 360,
    },
    emptySubtext: {
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
        maxWidth: 360,
    },
    emptyActionButton: {
        marginTop: 24,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 14,
    },
    emptyActionButtonText: {
        color: '#013a21',
        fontSize: 16,
        fontWeight: '700',
    },
    cardsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        justifyContent: 'flex-start',
    },
    paymentCard: {
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        minWidth: '100%', // Full width on mobile by default
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
            },
            android: {
                elevation: 4,
            },
            web: {
                // On wider screens, cards take half width (2 columns)
                '@media (min-width: 600px)': {
                    minWidth: 'calc(50% - 8px)',
                    maxWidth: 'calc(50% - 8px)',
                },
            },
        }),
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 18,
    },
    cardIcon: {
        width: 56,
        height: 56,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionRow: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardContent: {
        gap: 4,
    },
    bankName: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    accountType: {
        fontSize: 15,
        marginBottom: 14,
        opacity: 0.8,
    },
    cardDetails: {
        gap: 8,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    detailText: {
        fontSize: 15,
        fontWeight: '500',
    },
    formContainer: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
    },
    formContent: {
        padding: 20,
        flexGrow: 1,
    },
    stepContainer: {
        gap: 16,
    },
    stepTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 10,
    },
    badgeContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 20,
        borderWidth: 1,
    },
    badgeLabel: {
        fontSize: 12,
        fontWeight: '500',
        marginRight: 4,
    },
    badgeValue: {
        fontSize: 12,
        fontWeight: '700',
    },
    navigationButtons: {
        flexDirection: 'row',
        gap: 12,
        padding: 20,
        borderTopWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        backgroundColor: 'rgba(0,0,0,0.2)', // Slight bg to separate
    },
    navButton: {
        flex: 1,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 14,
        borderWidth: 1,
    },
    primaryNavButton: {
        borderWidth: 0,
    },
    navButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    primaryNavButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 16,
    },
    typeSelector: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
    },
    typeButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    typeButtonText: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
    // Simplified Type Selector
    typeOptionGroup: {
        gap: 12,
        width: '100%',
    },
    primaryTypeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderRadius: 16,
        borderWidth: 2,
        gap: 16,
    },
    primaryTypeButtonText: {
        fontSize: 18,
        fontWeight: '700',
    },
    subMenuContainer: {
        marginTop: 4,
        paddingLeft: 12,
        borderLeftWidth: 3,
        borderLeftColor: 'rgba(0,0,0,0.1)',
        gap: 12,
    },
    subLabel: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 4,
    },
    subTypeRow: {
        flexDirection: 'row',
        gap: 10,
    },
    subTypeButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
    },
    subTypeButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    separator: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginVertical: 8,
    },
    pickerContainer: {
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    input: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 12,
        fontSize: 16,
    },
    saveButton: {
        marginTop: 32,
        marginBottom: 40,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    toastContainer: {
        position: 'absolute',
        bottom: 40,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 50,
        gap: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
        zIndex: 1000,
    },
    toastText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    confirmationOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1100, // Above toast
    },
    confirmationBox: {
        width: '85%',
        maxWidth: 320,
        padding: 24,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 10,
            },
            android: {
                elevation: 10,
            },
            web: {
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)', // Web shadow fix
            }
        }),
    },
    warningIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255, 68, 68, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    confirmTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
    },
    confirmMessage: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
    },
    confirmButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    deleteConfirmButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteConfirmText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    // BankPicker Styles
    bankPickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 12,
        borderWidth: 1,
        padding: 12,
    },
    bankPickerText: {
        fontSize: 16,
    },
    bankPickerOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    bankPickerModal: {
        maxHeight: '70%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 20,
    },
    bankPickerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
    },
    bankPickerTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    bankSearchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 16,
        marginTop: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        gap: 8,
    },
    bankSearchInput: {
        flex: 1,
        fontSize: 16,
        padding: 0,
    },
    bankListContent: {
        paddingHorizontal: 16,
    },
    bankItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        gap: 12,
    },
    bankItemIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bankItemInfo: {
        flex: 1,
    },
    bankItemName: {
        fontSize: 16,
        fontWeight: '600',
    },
    bankItemCode: {
        fontSize: 12,
        marginTop: 2,
    },
});

export default PaymentMethodsModal;
