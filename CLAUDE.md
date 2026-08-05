# Kuanto Web — Notas de traspaso

> Repo: `Aleneytor/Kuanto-App` (sitio kuanto.online, desplegado en Netlify). Clon local de trabajo en `C:\Projects\KuantoMobileDefinitivo\temp_kuanto_web` (carpeta de referencia dentro del repo de la app móvil, ver `.gitignore` de ese repo: `temp_kuanto_web/`).

## ▶️ Por dónde seguir

**Último commit en `main`:** `53dfd0e` — pusheado y confirmado en GitHub.

**Pendiente sin cerrar — confirmar el deploy en vivo:** se subió `dist/` a Netlify vía un `.zip` (`kuanto-dist.zip`, generado en la raíz del repo, gitignorado) porque arrastrar la carpeta `dist/` directo a Netlify Drop cortó la subida a mitad de camino (ver "Qué pasó con el deploy" abajo). Verificado por curl que en este momento `kuanto.online/` y `kuanto.online/app/` responden 200 y la fuente Poppins ya sirve con `Content-Type: font/ttf` correcto (antes devolvía HTML disfrazado de fuente). Sin embargo, el usuario mostró una captura de "Page not found" al ver "la versión que subimos" desde el dashboard de Netlify — probablemente estaba viendo la URL de *preview* de ese deploy (`https://<hash>--kuantoonline.netlify.app`), no el dominio real `kuanto.online`. **Falta que el usuario confirme entrando directo a `kuanto.online` (no desde el dashboard) que todo carga bien.**

**⚠️ Acción de seguridad pendiente, no se llegó a hacer:** `SCHEDULE_CRON.sql` (raíz del repo) tiene un secreto de Supabase **filtrado en el historial de git** (clave `sb_secret_...` del proyecto viejo, en texto plano). El usuario pidió rotarla pero la sesión se desvió a resolver el deploy y no se completó. Pasos: Supabase Dashboard → proyecto "Kuanto App" (`goiaxsdsrwxlebpsnbrx`) → Settings → API Keys → regenerar la `sb_secret_...`. Después hay que volver a correr los `cron.schedule(...)` de `SCHEDULE_CRON.sql` en el SQL Editor de ese proyecto con la clave nueva (no commitear el valor real al archivo).

**Decisión no tomada — ¿conectar Netlify a GitHub?** El sitio actualmente se despliega por **Netlify Drop manual** (arrastrar/subir un zip de `dist/`), no está conectado al repo de GitHub para deploy automático en cada push (se confirmó viendo el panel de Netlify: "Last deployed from Netlify Drop"). El usuario está en el plan gratis y quiere minimizar deploys/builds. Cada cambio futuro requiere: `npm run build:web` local → comprimir `dist/` → subir el zip a mano en Netlify. Si en algún momento prefieren deploy automático, hay que conectar el repo en Netlify (**Project configuration → Build & deploy**) — dispara un build por cada push a `main`, lo cual sí consume minutos de build del plan gratis (a diferencia de Netlify Drop, que no consume build minutes).

## 🗓️ Qué se hizo en esta sesión (2026-08-05)

### Migración completa al backend Supabase nuevo (`daily_rates`)
La app usaba el proyecto Supabase viejo (`goiaxsdsrwxlebpsnbrx`, tablas `bcv_rates_history` + `p2p_rate_history`, miles de ticks P2P sin agregar). Se migró por completo al proyecto **`kuanto-mobile`** (`ghyznbisjcdmtuaelhmg`), el mismo backend que ya usa la app móvil hermana — ver `KuantoMobileDefinitivo/docs/MOBILE_BACKEND.md` para el contrato completo de la tabla `daily_rates` (una fila por día).

- **`src/database/supabaseClient.js`**: credenciales del proyecto nuevo, hardcodeadas directo en el código (decisión explícita del usuario para no depender de configurar variables de entorno en Netlify — la publishable key es pública por diseño, protegida por RLS, así que no hay riesgo real).
- **`src/services/rateService.js`**: reescrito para consultar `daily_rates` en vez de las dos tablas viejas. `fetchAllRates()` pasa de 2 queries a 1. `fetchUsdtHistory()` ya no pagina miles de ticks crudos — `daily_rates.p2p_daily_average` viene pre-agregado por día. Se eliminaron `fetchBinanceP2P`/`fetchBybitP2P`/`fetchYadioRates` (scraping client-side muerto, sin ningún caller).
- **`src/screens/SourcesScreen.js`**: se quitó la tarjeta de **Yadio** — el contrato nuevo de `p2p_sources` solo trae Binance y Bybit (Yadio se excluyó porque distorsionaba mucho el promedio, mismo criterio que ya se aplicó en la app móvil). Se borró también `assets/yadio-logo.png` (huérfano).
- Verificado con una query real contra `daily_rates` (vía Node ad-hoc) que los nombres de columna y la forma de `p2p_sources` (ya viene como objeto JS parseado, no como string) coinciden exactamente con lo que espera el código nuevo.

### Limpieza del repo
- Borrado: `dist-check/` (build de Expo commiteado por error, 4.6 MB, nunca tocado desde marzo), `database/Listas de Banco.json` (duplicaba `src/constants/banks.js`), `assets/NUEVA GRAFICA.txt` (CSS con extensión `.txt`, experimento abandonado), `src/screens/ConverterScreen.js` (importada en `App.js` pero fuera del `Stack.Navigator`, código muerto), `bcv-scraper-vercel/test.js` y `test-bcv-scraper.js` (scripts de prueba manual sueltos).
- `README.md`, `DEPLOY_NETLIFY.md`, `Configuracion de Deploys con Netlify y Github.md`: corregido el nombre/URL del repo viejo ("Al Cambio App" / `al-cambio-app`) por Kuanto / `Kuanto-App`.
- `scripts/deploy-prep.js`: ya no reinyecta el CSS crítico ni el viewport que `web/index.html` ya trae correctos (estaban duplicados, dos fuentes de verdad tocando el mismo `<head>`). Solo agrega lo que de verdad falta: meta tags Open Graph/Twitter y el favicon SVG.
- `DEPLOY_NETLIFY.md`: se sacó la sección de variables de entorno (ya no aplica, ver arriba).

### Digital Asset Links / verificación AdMob (sesión previa, ya en `main`)
`Landing Page/app-ads.txt` y `Landing Page/.well-known/assetlinks.json` ya están commiteados y pusheados — permiten verificar la cuenta de AdMob de la app Android y habilitar App Links / credenciales compartidas entre el sitio y la app.

## Qué pasó con el deploy (para contexto, ya resuelto)

1. Se arrastró `dist/` completo a Netlify Drop → la subida se cortó a mitad de camino (común con muchas carpetas anidadas con archivos chicos, en este caso las fuentes Poppins).
2. Los archivos de fuente faltantes, al pedirse, caían en la regla de redirect de SPA (`/app/* → /app/index.html 200`) y el servidor devolvía HTML disfrazado de fuente (`Content-Type: text/html` en vez de `font/ttf`) → el navegador tiraba `Failed to decode font` / `OTS parsing error` y usaba una tipografía de respaldo en vez de Poppins.
3. Se generó `kuanto-dist.zip` (zip completo de `dist/`, confirmado con 104 archivos incluyendo todas las fuentes y `_redirects`) y se subió como archivo único — más confiable que arrastrar carpetas con muchos archivos anidados. Confirmado por curl que quedó bien.

## Stack / estructura (sin cambios de sesiones previas)

- Expo + React Native Web, exportado a estático (`expo export --platform web`) y post-procesado por `scripts/deploy-prep.js` para separar Landing Page (raíz de `dist/`) de la app (`dist/app/`).
- `netlify.toml`: `command = "npm run build:web"`, `publish = "dist"` — pero **no se usa actualmente** porque el sitio no está conectado a GitHub (deploy manual, ver arriba).
- Backend: Supabase `kuanto-mobile` (`daily_rates`), compartido con la app móvil.
