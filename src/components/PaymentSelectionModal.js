import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    Modal,
    Pressable,
    Platform,
    Image
} from 'react-native';
import { X, Building2, User, Phone, CreditCard, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { usePayment } from '../context/PaymentContext';
import { BANK_LOGOS } from '../constants/banks';

const shortenBankName = (name) => {
    if (!name) return '';
    const nameMap = {
        'Banco de Venezuela': 'Venezuela',
        'Banco Mercantil': 'Mercantil',
        'Banesco Banco Universal': 'Banesco',
        'Banco Provincial': 'Provincial',
        'Banco Nacional de CrÃ©dito': 'BNC',
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

const PaymentSelectionModal = ({ isVisible, onClose, onSelect }) => {
    const { colors, isDark } = useTheme();
    const { paymentMethods } = usePayment();

    const handleSelect = (method) => {
        onSelect(method);
        onClose();
    };

    return (
        <Modal
            visible={isVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Pressable style={styles.dismissArea} onPress={onClose} />
                <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    {/* Handle for indicator */}
                    <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />
                    
                    <View style={styles.header}>
                        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                            Compartir con...
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color={colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView 
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                            Selecciona datos de pago
                        </Text>

                        {paymentMethods.map((method) => {
                            const shortBank = shortenBankName(method.bankName);
                            return (
                                <TouchableOpacity
                                    key={method.id}
                                    onPress={() => handleSelect(method)}
                                    style={[
                                        styles.methodItem,
                                        { backgroundColor: colors.card, borderColor: colors.glassBorder }
                                    ]}
                                >
                                    <View style={[styles.methodIconContainer, { backgroundColor: BANK_LOGOS[method.bankCode] ? 'transparent' : 'rgba(2, 223, 130, 0.1)' }]}>
                                        {BANK_LOGOS[method.bankCode] ? (
                                            <Image 
                                                source={BANK_LOGOS[method.bankCode]} 
                                                style={{ width: 34, height: 34 }} 
                                                resizeMode="contain"
                                            />
                                        ) : (
                                            <Building2 size={24} color={colors.bcvGreen} />
                                        )}
                                    </View>
                                    <View style={styles.methodInfo}>
                                        <Text style={[styles.methodBank, { color: colors.textPrimary }]}>
                                            {shortBank}
                                        </Text>
                                        <Text style={[styles.methodDetail, { color: colors.textSecondary }]}>
                                            {method.type === 'pago_movil' ? 'Pago Móvil' : 'Transferencia'} • {method.holderName.split(' ')[0]}
                                        </Text>
                                    </View>
                                    <ChevronRight size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            );
                        })}

                        <TouchableOpacity
                            onPress={() => handleSelect(null)}
                            style={[
                                styles.methodItem,
                                styles.noneItem,
                                { backgroundColor: colors.card, borderColor: colors.glassBorder }
                            ]}
                        >
                            <View style={[styles.methodIconContainer, styles.noneIcon]}>
                                <X size={20} color={colors.textSecondary} />
                            </View>
                            <View style={styles.methodInfo}>
                                <Text style={[styles.methodBank, { color: colors.textPrimary }]}>
                                    Sin datos de pago
                                </Text>
                                <Text style={[styles.methodDetail, { color: colors.textSecondary }]}>
                                    Solo compartir el cálculo de la tasa
                                </Text>
                            </View>
                            <ChevronRight size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    dismissArea: {
        flex: 1,
    },
    modalContainer: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        maxHeight: '80%',
    },
    handle: {
        width: 40,
        height: 5,
        borderRadius: 2.5,
        alignSelf: 'center',
        marginTop: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 20,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
    },
    closeButton: {
        padding: 4,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
        marginLeft: 4,
    },
    methodItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 12,
    },
    methodIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: 'rgba(2, 223, 130, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    methodInfo: {
        flex: 1,
    },
    methodBank: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 2,
    },
    methodDetail: {
        fontSize: 13,
        fontWeight: '500',
    },
    noneItem: {
        marginTop: 8,
        opacity: 0.8,
        borderStyle: 'dashed',
    },
    noneIcon: {
        backgroundColor: 'rgba(255,255,255,0.05)',
    }
});

export default PaymentSelectionModal;
