import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Linking, Platform, StatusBar as RNStatusBar } from 'react-native';
import { ArrowLeft, ExternalLink } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

const LegalScreen = ({ navigation }) => {
    const { colors, isDark } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={[styles.backButton, { backgroundColor: colors.card }]}
                >
                    <ArrowLeft size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Aviso Legal</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={[styles.card, { backgroundColor: colors.card }]}>
                    <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                        La información mostrada en esta aplicación tiene un carácter <Text style={[styles.bold, { color: colors.textPrimary }]}>exclusivamente informativo</Text>. Kuanto no representa ni está afiliado a ninguna entidad gubernamental y no establece ninguna de las tasas aquí publicadas. La única tasa oficial en Venezuela es la publicada por el <Text style={[styles.bold, { color: colors.textPrimary }]}>Banco Central de Venezuela (BCV)</Text>, disponible en su sitio web oficial.
                    </Text>

                    <TouchableOpacity onPress={() => Linking.openURL('https://www.bcv.org.ve/')} style={styles.linkButton}>
                        <Text style={[styles.linkText, { color: colors.bcvGreen }]}>Visitar bcv.org.ve</Text>
                        <ExternalLink size={14} color={colors.bcvGreen} />
                    </TouchableOpacity>

                    <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                        En la aplicación, la tasa oficial del BCV se actualiza tras su publicación oficial en los días hábiles. Esta tasa solo se refleja en la calculadora cuando entra en vigencia según lo indicado oficialmente por el BCV.
                    </Text>

                    <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                        Se muestra asimismo una referencia del valor del <Text style={[styles.bold, { color: colors.textPrimary }]}>USDT (Tether)</Text> frente al bolívar, calculada a partir de un promedio estadístico de anuncios en mercados P2P. El USDT es una stablecoin, pero no es dinero fiduciario ni debe interpretarse como una tasa oficial del dólar estadounidense. (1 USDT ≈ 1 USD, pero puede variar).
                    </Text>

                    <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                        La Tasa USDT mostrada se debe entender únicamente como una <Text style={[styles.bold, { color: colors.textPrimary }]}>referencia estadística</Text>. En los mercados digitales P2P no existe un precio único, sino rangos de valores dinámicos. Por lo tanto, la cifra mostrada no equivale a un precio garantizado ni constituye una recomendación financiera.
                    </Text>

                    <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                        Esta aplicación no intermedia operaciones, no fija precios y no mantiene afiliación ni respaldo con ninguna plataforma de intercambio. El uso de esta información queda bajo la responsabilidad exclusiva del usuario.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    card: {
        borderRadius: 20,
        padding: 24,
    },
    paragraph: {
        fontSize: 15,
        lineHeight: 24,
        marginBottom: 20,
        textAlign: 'justify'
    },
    bold: {
        fontWeight: '700',
    },
    linkButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(2, 223, 130, 0.1)',
        alignSelf: 'flex-start',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginBottom: 24,
    },
    linkText: {
        fontWeight: '600',
        fontSize: 14,
    }
});

export default LegalScreen;
