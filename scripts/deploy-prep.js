const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const APP_DIR = path.join(DIST_DIR, 'app');
const LANDING_PAGE_DIR = path.join(__dirname, '..', 'Landing Page');

async function prepareDeployment() {
    console.log('🚀 Preparing deployment structure...');

    if (!fs.existsSync(DIST_DIR)) {
        console.error('❌ Error: "dist" directory not found. Please run "npm run build:web" first.');
        process.exit(1);
    }

    // 1. Create 'dist/app' directory
    if (!fs.existsSync(APP_DIR)) {
        fs.mkdirSync(APP_DIR);
        console.log('✅ Created "dist/app" directory.');
    }

    // 2. Move existing build artifacts to 'dist/app'
    const items = fs.readdirSync(DIST_DIR);

    for (const item of items) {
        if (item === 'app') continue; // Don't move the destination folder

        const srcPath = path.join(DIST_DIR, item);
        const destPath = path.join(APP_DIR, item);

        // Using cpSync + rmSync instead of renameSync to avoid EPERM on Windows
        try {
            fs.cpSync(srcPath, destPath, { recursive: true });
            fs.rmSync(srcPath, { recursive: true, force: true });
            // console.log(`Moved ${item} to app/${item}`);
        } catch (err) {
            console.error(`Error moving ${item}:`, err);
        }
    }
    console.log('✅ Moved App build files to "dist/app/"');

    // 3. Fix Absolute Paths in dist/app/index.html
    // 4. Copiar carpeta assets si existe
    if (fs.existsSync(path.join(DIST_DIR, 'assets'))) {
        console.log('📂 Copiando carpeta assets a dist/app/assets...');
        // Copiar recursivamente
        try {
            fs.cpSync(path.join(DIST_DIR, 'assets'), path.join(APP_DIR, 'assets'), { recursive: true });
        } catch (e) {
            // Node < 16.7 fallback
            const copyRecursiveSync = (src, dest) => {
                const exists = fs.existsSync(src);
                const stats = exists && fs.statSync(src);
                const isDirectory = exists && stats.isDirectory();
                if (isDirectory) {
                    if (!fs.existsSync(dest)) fs.mkdirSync(dest);
                    fs.readdirSync(src).forEach((childItemName) => {
                        copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
                    });
                } else {
                    fs.copyFileSync(src, dest);
                }
            };
            copyRecursiveSync(path.join(DIST_DIR, 'assets'), path.join(APP_DIR, 'assets'));
        }
    }

    // 5. Arreglar rutas absolutas en index.html de la APP
    console.log('🔧 Ajustando rutas en dist/app/index.html...');
    const appIndexPath = path.join(APP_DIR, 'index.html');
    if (fs.existsSync(appIndexPath)) {
        let htmlContent = fs.readFileSync(appIndexPath, 'utf8');

        // Replace absolute paths with relative ones for subdirectory deployment
        // target: src="/_expo", href="/assets", content="/static", etc.
        // We broadly replace root-relative paths that point to expected Expo folders

        // 5b. Patch JS files to fix absolute asset paths (Critical for subfolder deployment)
        // Find all JS files in dist/app/_expo/static/js/web/
        const jsDir = path.join(APP_DIR, '_expo', 'static', 'js', 'web');
        if (fs.existsSync(jsDir)) {
            console.log('🔧 Patching JS bundles for subpath support...');
            const jsFiles = fs.readdirSync(jsDir).filter(file => file.endsWith('.js'));

            for (const file of jsFiles) {
                const filePath = path.join(jsDir, file);
                let jsContent = fs.readFileSync(filePath, 'utf8');

                // Rewrite /assets/ paths to /app/assets/
                // Used in requires: modules.exports = "/assets/..."
                if (jsContent.includes('"/assets/')) {
                    console.log(`   - Patching ${file}...`);
                    jsContent = jsContent.replace(/"\/assets\//g, '"/app/assets/');
                    fs.writeFileSync(filePath, jsContent);
                }
            }
            console.log('✅ JS Bundles patched.');
        }

        htmlContent = htmlContent.replace(/src="\/_expo/g, 'src="/app/_expo');
        htmlContent = htmlContent.replace(/href="\/_expo/g, 'href="/app/_expo');

        // Reemplazos CRÍTICOS para que funcione en /app/
        // 1. Assets (js, css, images) que empiezan con /assets -> /app/assets
        htmlContent = htmlContent.replace(/src="\/assets\//g, 'src="/app/assets/');
        htmlContent = htmlContent.replace(/href="\/assets\//g, 'href="/app/assets/');

        // 2. Rutas relativas simples assets/ -> /app/assets/ (por si acaso)
        htmlContent = htmlContent.replace(/src="assets\//g, 'src="/app/assets/');
        htmlContent = htmlContent.replace(/href="assets\//g, 'href="/app/assets/');

        // 3. Manifest y favicon (Standard PWA Icon PNG)
        htmlContent = htmlContent.replace(/href="\/manifest.json"/g, 'href="/app/manifest.json"');
        htmlContent = htmlContent.replace(/href="manifest.json"/g, 'href="/app/manifest.json"');

        // Reemplazar iconos para usar icon.png (Máxima compatibilidad con navegadores móviles)
        // Agregamos ?v=2 para romper caché del icono
        htmlContent = htmlContent.replace(/href="\/favicon.ico"/g, 'href="/app/icon.png?v=2"');
        htmlContent = htmlContent.replace(/href="favicon.ico"/g, 'href="/app/icon.png?v=2"');
        htmlContent = htmlContent.replace(/href="\/icon.png"/g, 'href="/app/icon.png?v=2"');
        htmlContent = htmlContent.replace(/href="icon.png"/g, 'href="/app/icon.png?v=2"');

        // Ajustar ruta del apple-touch-icon.png
        htmlContent = htmlContent.replace(/href="\/apple-touch-icon.png"/g, 'href="/app/apple-touch-icon.png?v=2"');
        htmlContent = htmlContent.replace(/href="apple-touch-icon.png"/g, 'href="/app/apple-touch-icon.png?v=2"');

        // Eliminado reemplazo de mimeType porque usaremos PNG estándar

        // 6. INJECT CRITICAL CSS & VIEWPORT FIX FOR IOS SAFARI
        // (Expo export appears to reset index.html styles, so we re-inject them here)
        const criticalCss = `
    <style>
      /* FIX: iOS Safari White Boxes & Overscroll */
      * { box-sizing: border-box; }
      html { height: 100%; height: 100dvh; width: 100%; background-color: #1c1c1e; overscroll-behavior: none; }
      body { height: 100%; width: 100%; background-color: #1c1c1e; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom); overflow: hidden; }
      #root { height: 100%; width: 100%; display: flex; flex-direction: column; }
    </style>`;

        if (htmlContent.includes('</head>')) {
            htmlContent = htmlContent.replace('</head>', `${criticalCss}\n</head>`);
        }

        // Fix Viewport for Notch (viewport-fit=cover)
        // Replaces the standard Expo viewport tag
        htmlContent = htmlContent.replace(
            /<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" \/>/,
            '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover, maximum-scale=1, user-scalable=no" />'
        );

        // 7. INJECT OPEN GRAPH & META TAGS (Link Previews)
        const metaTags = `
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://kuanto.online/app">
    <meta property="og:title" content="Kuanto - La App que necesitas">
    <meta property="og:description" content="En Venezuela, saber el precio de hoy es vital. Kuanto te muestra las tasas del BCV, Euro y USDT al día.">
    <meta property="og:image" content="/banner.jpg">

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="https://kuanto.online/app">
    <meta property="twitter:title" content="Kuanto - La App que necesitas">
    <meta property="twitter:description" content="En Venezuela, saber el precio de hoy es vital. Kuanto te muestra las tasas del BCV, Euro y USDT al día.">
    <meta property="twitter:image" content="/banner.jpg">
    
    <!-- Favicon SVG -->
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
        `;

        if (htmlContent.includes('</head>')) {
            htmlContent = htmlContent.replace('</head>', `${metaTags}\n</head>`);
        }

        fs.writeFileSync(appIndexPath, htmlContent);
        console.log('✅ Fixed absolute paths in "dist/app/index.html" for subdirectory');
    }

    // 6. Copy PWA assets (icon.png and manifest.json) to dist/app/
    console.log('🔧 Copying PWA assets (icon.png, manifest.json)...');
    const publicDir = path.join(__dirname, '..', 'public');

    if (fs.existsSync(publicDir)) {
        // Copy icon.png
        const iconSource = path.join(publicDir, 'icon.png');
        const iconDest = path.join(APP_DIR, 'icon.png');
        if (fs.existsSync(iconSource)) {
            fs.copyFileSync(iconSource, iconDest);
            console.log('   ✅ Copied icon.png to dist/app/');
        }

        // Copy ad_728.html (Leaderboard Ad)
        // const adSource = path.join(publicDir, 'ad_728.html');
        // const adDest = path.join(APP_DIR, 'ad_728.html');
        // if (fs.existsSync(adSource)) {
        //     fs.copyFileSync(adSource, adDest);
        //     console.log('   ✅ Copied ad_728.html to dist/app/');
        // }

        // Copy apple-touch-icon.png (CRITICAL FOR IOS PWA)
        const appleIconSource = path.join(publicDir, 'apple-touch-icon.png');
        const appleIconDest = path.join(APP_DIR, 'apple-touch-icon.png');
        if (fs.existsSync(appleIconSource)) {
            fs.copyFileSync(appleIconSource, appleIconDest);
            console.log('   ✅ Copied apple-touch-icon.png to dist/app/');
        }

        // Copy manifest.json
        const manifestSource = path.join(publicDir, 'manifest.json');
        const manifestDest = path.join(APP_DIR, 'manifest.json');
        if (fs.existsSync(manifestSource)) {
            // Read manifest and update icon paths for /app subdirectory
            let manifestContent = JSON.parse(fs.readFileSync(manifestSource, 'utf8'));
            manifestContent.icons = manifestContent.icons.map(icon => ({
                ...icon,
                src: icon.src.replace('/icon.png', '/app/icon.png')
            }));
            manifestContent.start_url = '/app/';
            manifestContent.scope = '/app/';
            fs.writeFileSync(manifestDest, JSON.stringify(manifestContent, null, 2));
            console.log('   ✅ Copied and updated manifest.json to dist/app/');
        }
    }
    console.log('✅ PWA assets configured successfully');

    // 4. Copy Landing Page files to 'dist/' (Root)
    if (fs.existsSync(LANDING_PAGE_DIR)) {
        const landingItems = fs.readdirSync(LANDING_PAGE_DIR);

        for (const item of landingItems) {
            // Skip .DS_Store or other system files if needed
            const srcPath = path.join(LANDING_PAGE_DIR, item);
            const destPath = path.join(DIST_DIR, item);

            try {
                fs.cpSync(srcPath, destPath, { recursive: true });
                // console.log(`Copied ${item} to root`);
            } catch (err) {
                console.error(`Error copying ${item}:`, err);
            }
        }
        console.log('✅ Copied Landing Page to "dist/" (Root)');
    } else {
        console.warn('⚠️ Warning: Landing Page directory not found at:', LANDING_PAGE_DIR);
    }

    // 4. Create SPA Configuration (Vercel & Netlify)
    const vercelConfig = {
        rewrites: [
            {
                source: "/app/(.*)",
                destination: "/app/index.html"
            }
        ]
    };

    fs.writeFileSync(path.join(DIST_DIR, 'vercel.json'), JSON.stringify(vercelConfig, null, 2));
    fs.writeFileSync(path.join(DIST_DIR, '_redirects'), '/app/*  /app/index.html  200');

    console.log('✅ Created SPA routing config (vercel.json, _redirects)');

    console.log('🎉 Deployment preparation complete!');
    console.log(' - Root (/): Landing Page');
    console.log(' - App (/app): Web App');
}

prepareDeployment();
