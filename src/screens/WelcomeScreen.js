import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, Image } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { ArrowRight, TrendingUp, Calculator, Bell } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {
    const { colors, isDark } = useTheme();

    const FeatureItem = ({ icon, title, description }) => (
        <View style={styles.featureItem}>
            <View style={[styles.iconContainer, {
                backgroundColor: colors.card,
                borderColor: colors.glassBorder
            }]}>
                {icon}
            </View>
            <View style={styles.textContainer}>
                <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>{title}</Text>
                <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>{description}</Text>
            </View>
        </View>
    );

    const onGetStarted = async () => {
        try {
            await AsyncStorage.setItem('@app_intro_shown', 'true');
            navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
            });
        } catch (e) {
            console.error('Error saving welcome status', e);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <Image
                        source={require('../../assets/Logo nombre completo.png')}
                        style={styles.logoImage}
                        resizeMode="contain"
                    />
                    <Text style={[styles.sloganText, { color: colors.textSecondary }]}>
                        No preguntes cuánto,{"\n"}
                        revisa <Text style={[styles.sloganHighlight, { color: colors.bcvGreen }]}>Kuanto</Text>.
                    </Text>
                </View>

                <View style={styles.featuresContainer}>
                    <FeatureItem
                        icon={<TrendingUp color={colors.bcvGreen} size={24} />}
                        title="Tasas en Tiempo Real"
                        description="Consulta el valor oficial del BCV y el promedio paralelo USDT al instante."
                    />
                    <FeatureItem
                        icon={<Calculator color={colors.euroBlue} size={24} />}
                        title="Calculadora Inteligente"
                        description="Convierte entre USD, EUR y Bolívares de forma rápida y sencilla."
                    />
                    <FeatureItem
                        icon={<Bell color={colors.parallelOrange} size={24} />}
                        title="Alertas Diarias"
                        description="Recibe notificaciones con la tasa actualizada del dólar, sin tener que entrar a la app."
                    />
                </View>

                <TouchableOpacity
                    style={[styles.button, {
                        backgroundColor: colors.bcvGreen,
                        shadowColor: colors.bcvGreen
                    }]}
                    onPress={onGetStarted}
                    activeOpacity={0.8}
                >
                    <Text style={styles.buttonText}>Comenzar</Text>
                    <ArrowRight color="#000" size={20} style={{ marginLeft: 8 }} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
        paddingHorizontal: 30,
        paddingVertical: 40,
        alignItems: 'center',
        width: '100%',
    },
    header: {
        marginTop: 40,
        alignItems: 'center',
    },
    logoImage: {
        width: width * 0.7,
        height: 80,
        marginBottom: 24,
    },
    sloganText: {
        fontSize: 24,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 32,
    },
    sloganHighlight: {
        fontWeight: '800',
    },
    featuresContainer: {
        gap: 32,
        width: '100%',
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 20,
        borderWidth: 1,
    },
    textContainer: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    featureDescription: {
        fontSize: 14,
        lineHeight: 20,
    },
    button: {
        borderRadius: 20,
        paddingVertical: 18,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 10,
        width: '100%',
    },
    buttonText: {
        color: '#000',
        fontSize: 18,
        fontWeight: '800',
    }
});

export default WelcomeScreen;
