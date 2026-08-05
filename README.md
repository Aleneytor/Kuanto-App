# Kuanto 🇻🇪

Aplicación móvil moderna y eficiente para consultar las tasas de cambio oficiales (BCV) y paralelas en Venezuela al instante. Diseñada para ofrecer una experiencia de usuario premium con una interfaz oscura y minimalista.

## Características Principales ✨

- 📊 **Tasas Actualizadas**: Consulta el valor del Dólar BCV, Euro BCV y Promedio Paralelo (USDT) en tiempo real.
- 🧮 **Calculadora Inteligente**: Convierte montos de Bolívares a Divisas (y viceversa) rápidamente. Incluye botón de copiado rápido.
- 🌑 **Modo Oscuro**: Interfaz optimizada para reducir la fatiga visual y ahorrar batería (estilo AMOLED).
- 📡 **Persistencia Offline**: La app guarda automáticamente las últimas tasas conocidas, permitiendo su uso incluso sin conexión a internet.
- 📤 **Compartir Tasas**: Genera y comparte un resumen profesional de las tasas del día a través de WhatsApp, Telegram u otras redes.
- ⚖️ **Transparencia**: Acceso directo a fuentes oficiales y aviso legal integrado.

## Tecnologías Utilizadas 🛠️

- **Framework**: [React Native](https://reactnative.dev/) con [Expo](https://expo.dev/) (SDK 54).
- **Navegación**: React Navigation v7 (Stack & Tabs).
- **Almacenamiento**: `@react-native-async-storage/async-storage` para caché y preferencias.
- **Iconos**: `lucide-react-native`.
- **Estilos**: StyleSheet nativo con sistema de diseño personalizado.

## Instalación y Desarrollo 💻

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/Aleneytor/Kuanto-App.git
   cd Kuanto-App
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```
   > Nota: Se utiliza `npm` como gestor de paquetes.

3. **Ejecutar en modo desarrollo**:
   ```bash
   npx expo start
   ```
   Escanea el código QR con la app **Expo Go** en tu dispositivo Android/iOS.

## Generar APK (Android) 🤖

Para generar un archivo instalable (`.apk`) para pruebas o distribución manual:

1. Instalar EAS CLI:
   ```bash
   npm install -g eas-cli
   ```

2. Ejecutar el build:
   ```bash
   eas build -p android --profile preview
   ```
   Esto generará un enlace de descarga al finalizar.

## Aviso Legal ⚖️

La información mostrada en esta aplicación tiene un carácter exclusivamente informativo. **Kuanto** no representa ni está afiliado a ninguna entidad gubernamental. La única tasa oficial en Venezuela es la publicada por el Banco Central de Venezuela (BCV).

---
Creado con ❤️ por **[Aleneytor]** - 2025
