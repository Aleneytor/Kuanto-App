const fs = require('fs');
const path = require('path');

const distPath = path.join(process.cwd(), 'dist');
const indexPath = path.join(distPath, 'index.html');

// Copy manifest.json to dist
const manifestSrc = path.join(process.cwd(), 'public', 'manifest.json');
const manifestDest = path.join(distPath, 'manifest.json');
if (fs.existsSync(manifestSrc)) {
    fs.copyFileSync(manifestSrc, manifestDest);
    console.log('✅ manifest.json copied to dist/');
}

// Copy kuanto-icon.png to dist
const iconSrc = path.join(process.cwd(), 'assets', 'kuanto-icon.png');
const iconDest = path.join(distPath, 'kuanto-icon.png');
if (fs.existsSync(iconSrc)) {
    fs.copyFileSync(iconSrc, iconDest);
    console.log('✅ kuanto-icon.png copied to dist/');
}

// Read the current index.html
let html = fs.readFileSync(indexPath, 'utf8');

// AdSense script
// AdSense script (Now EffectiveGateCPM)
const adsenseScript = `
<script async="async" data-cfasync="false" src="https://pl28550995.effectivegatecpm.com/a0674cf56fa90f8f848548993f61c612/invoke.js"></script>
`;

// PWA links for icons
const pwaLinks = `
    <link rel="manifest" href="./manifest.json">
    <link rel="apple-touch-icon" href="./kuanto-icon.png">
    <link rel="icon" type="image/png" sizes="192x192" href="./kuanto-icon.png">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black">
    <meta name="apple-mobile-web-app-title" content="Kuanto">`;

let modified = false;

// Inject AdSense if not present
// if (!html.includes('effectivegatecpm.com')) {
//     html = html.replace('<head>', `<head>\n    ${adsenseScript}`);
//     modified = true;
//     console.log('✅ AdSense script injected!');
// }

// Inject PWA links if not present
// DISABLED: PWA configuration is now handled in web/index.html and deploy-prep.js
/*
if (!html.includes('rel="manifest"')) {
    html = html.replace('</head>', `${pwaLinks}\n  </head>`);
    modified = true;
    console.log('✅ PWA links injected!');
}
*/

if (modified) {
    fs.writeFileSync(indexPath, html, 'utf8');
    console.log('✅ index.html updated successfully!');
} else {
    console.log('ℹ️ All scripts already present.');
}
