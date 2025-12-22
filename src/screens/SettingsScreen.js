import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Linking, Share, Platform, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    Settings,
    Info,
    Share2,
    Database,
    Github,
    ChevronRight,
    ShieldCheck,
    Mail,
    Bell,
} from 'lucide-react-native';
import { useRates } from '../context/RateContext';
import { COLORS } from '../theme/colors';

const SettingsScreen = ({ navigation }) => {
    const { rates } = useRates();
    const [notificationsEnabled, setNotificationsEnabled] = React.useState(false);

    React.useEffect(() => {
        AsyncStorage.getItem('@app_notifications').then(val => {
            if (val !== null) setNotificationsEnabled(JSON.parse(val));
        });
    }, []);

    const toggleNotifications = async (val) => {
        setNotificationsEnabled(val);
        await AsyncStorage.setItem('@app_notifications', JSON.stringify(val));
        if (val) {
            // Here you would trigger push permission request
        }
    };

    const settingsSections = [
        {
            title: 'Información',
            items: [
                {
                    id: 'sources',
                    icon: <Database size={20} color={COLORS.bcvGreen} />,
                    label: 'Fuentes de información',
                    onPress: () => navigation.navigate('Sources')
                },
                {
                    id: 'status',
                    icon: <ShieldCheck size={20} color={COLORS.euroBlue} />,
                    label: 'Estado de las APIs',
                    value: 'Operativo'
                },
                {
                    id: 'legal',
                    icon: <Info size={20} color={COLORS.textSecondary} />,
                    label: 'Aviso Legal',
                    onPress: () => navigation.navigate('Legal')
                },
            ]

        },
        {
            title: 'Notificaciones',
            items: [
                {
                    id: 'notify_daily',
                    icon: <Bell size={20} color={COLORS.parallelOrange} />,
                    label: 'Activar Notificaciones',
                    type: 'switch',
                    value: notificationsEnabled,
                    onValueChange: toggleNotifications
                }
            ]
        },
        {
            title: 'Aplicación',
            items: [
                {
                    id: 'contact',
                    icon: <Mail size={20} color={COLORS.textPrimary} />,
                    label: 'Contactar Soporte',
                    onPress: () => Linking.openURL('mailto:soporte@alcambio.app')
                },
                {
                    id: 'share',
                    icon: <Share2 size={20} color={COLORS.parallelOrange} />,
                    label: 'Compartir Aplicación',
                    onPress: async () => {
                        try {
                            await Share.share({
                                message: '¡Hola! Te recomiendo "Al Cambio App" para consultar las tasas del BCV y Paralelo al instante. 🚀',
                                url: Platform.OS === 'ios' ? 'https://apple.co/...' : 'https://play.google.com/...'
                            });
                        } catch (error) {
                            console.error(error);
                        }
                    }
                },
            ]
        }
    ];

    const SettingItem = ({ icon, label, value, onPress, disabled, type, onValueChange }) => (
        <TouchableOpacity
            style={[styles.item, disabled && { opacity: 0.5 }]}
            onPress={type === 'switch' ? () => onValueChange(!value) : onPress}
            disabled={disabled || (!onPress && type !== 'switch')}
            activeOpacity={type === 'switch' ? 1 : 0.7}
        >
            <View style={styles.itemLeft}>
                <View style={styles.iconContainer}>
                    {icon}
                </View>
                <Text style={styles.itemLabel}>{label}</Text>
            </View>
            <View style={styles.itemRight}>
                {type === 'switch' ? (
                    <Switch
                        value={value}
                        onValueChange={onValueChange}
                        trackColor={{ false: '#767577', true: 'rgba(52, 199, 89, 0.3)' }}
                        thumbColor={value ? COLORS.bcvGreen : '#f4f3f4'}
                        ios_backgroundColor="#3e3e3e"
                    />
                ) : value ? (
                    <Text style={styles.itemValue}>{value}</Text>
                ) : (
                    onPress && <ChevronRight size={18} color={COLORS.textSecondary} />
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Ajustes</Text>
                <Text style={styles.headerSubtitle}>Configuración y transparencia</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {settingsSections.map((section, idx) => (
                    <View key={idx} style={styles.section}>
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                        {section.customContent ? (
                            section.customContent
                        ) : (
                            <View style={styles.sectionCard}>
                                {section.items.map((item, itemIdx) => (
                                    <View key={item.id}>
                                        <SettingItem {...item} />
                                        {itemIdx < section.items.length - 1 && <View style={styles.divider} />}
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                ))}

                <View style={styles.footer}>
                    <Text style={styles.versionText}>Al Cambio App v0.6.5</Text>
                    <Text style={styles.creatorText}>© 2025 - Tu aliado financiero</Text>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        marginTop: 10,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    headerSubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
        marginLeft: 4,
    },
    sectionCard: {
        backgroundColor: COLORS.card,
        borderRadius: 20,
        overflow: 'hidden',
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    itemLabel: {
        fontSize: 16,
        color: COLORS.textPrimary,
        fontWeight: '500',
    },
    itemRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    itemValue: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginLeft: 64,
    },
    footer: {
        marginTop: 20,
        alignItems: 'center',
    },
    versionText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontWeight: '600',
    },
    creatorText: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 10,
        marginTop: 4,
    },
});

export default SettingsScreen;
