import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Linking, Platform, StatusBar as RNStatusBar } from 'react-native';
import { ArrowLeft, ExternalLink } from 'lucide-react-native';
import { COLORS } from '../theme/colors';

const LegalScreen = ({ navigation }) => {
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Aviso Legal</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.card}>
                    <Text style={styles.paragraph}>
                        La información mostrada en esta aplicación tiene un carácter <Text style={styles.bold}>exclusivamente informativo</Text>. Al Cambio App no representa ni está afiliado a ninguna entidad gubernamental y no establece ninguna de las tasas aquí publicadas. La única tasa oficial en Venezuela es la publicada por el <Text style={styles.bold}>Banco Central de Venezuela (BCV)</Text>, disponible en su sitio web oficial.
                    </Text>

                    <TouchableOpacity onPress={() => Linking.openURL('https://www.bcv.org.ve/')} style={styles.linkButton}>
                        <Text style={styles.linkText}>Visitar bcv.org.ve</Text>
                        <ExternalLink size={14} color={COLORS.bcvGreen} />
                    </TouchableOpacity>

                    <Text style={styles.paragraph}>
                        En la aplicación, la tasa oficial del BCV se actualiza tras su publicación oficial en los días hábiles. Esta tasa solo se refleja en la calculadora cuando entra en vigencia según lo indicado oficialmente por el BCV.
                    </Text>

                    <Text style={styles.paragraph}>
                        Se muestra asimismo una referencia del valor del <Text style={styles.bold}>USDT (Tether)</Text> frente al bolívar, calculada a partir de un promedio estadístico de anuncios en mercados P2P. El USDT es una stablecoin, pero no es dinero fiduciario ni debe interpretarse como una tasa oficial del dólar estadounidense. (1 USDT ≈ 1 USD, pero puede variar).
                    </Text>

                    <Text style={styles.paragraph}>
                        La Tasa USDT mostrada se debe entender únicamente como una <Text style={styles.bold}>referencia estadística</Text>. En los mercados digitales P2P no existe un precio único, sino rangos de valores dinámicos. Por lo tanto, la cifra mostrada no equivale a un precio garantizado ni constituye una recomendación financiera.
                    </Text>

                    <Text style={styles.paragraph}>
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
        backgroundColor: COLORS.background,
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
        backgroundColor: COLORS.card,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: COLORS.card,
        borderRadius: 20,
        padding: 24,
    },
    paragraph: {
        fontSize: 15,
        color: COLORS.textSecondary,
        lineHeight: 24,
        marginBottom: 20,
        textAlign: 'justify'
    },
    bold: {
        color: COLORS.textPrimary,
        fontWeight: '700',
    },
    linkButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(52, 199, 89, 0.1)',
        alignSelf: 'flex-start',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginBottom: 24,
    },
    linkText: {
        color: COLORS.bcvGreen,
        fontWeight: '600',
        fontSize: 14,
    }
});

export default LegalScreen;
