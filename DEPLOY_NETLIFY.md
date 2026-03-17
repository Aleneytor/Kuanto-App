# 🚀 Hacer Deploy en Netlify - Pasos Simples

## ✅ Código Ya Subido a GitHub

Tu código está actualizado en:
**https://github.com/Aleneytor/al-cambio-app**

---

## 📝 Pasos para Deploy en Netlify

### **1. Ir a Netlify**
Abre tu navegador y ve a: https://app.netlify.com/sites

### **2. Encontrar tu sitio**
Busca tu sitio actual en la lista (probablemente se llama algo como "beamish-hamster-3d4841" o similar).

### **3. Hacer Re-deploy con la nueva versión**

Tienes 2 opciones:

#### **Opción A: Trigger Deploy (Más Fácil)**

1. En tu sitio, ve a la pestaña **"Deploys"**
2. Haz clic en **"Trigger deploy"** → **"Clear cache and deploy site"**
3. Netlify bajará el código actualizado de GitHub
4. Espera 3-5 minutos

#### **Opción B: Re-conectar el Repositorio (Si el anterior no funciona)**

1. En tu sitio, ve a **"Site configuration"** → **"Build & deploy"**
2. En la sección **"Build settings"**, verifica:
   - **Build command:** `npm run build:web`
   - **Publish directory:** `dist`
3. Si está mal, corrígelo y haz clic en "Save"
4. Ve a **"Deploys"** → **"Trigger deploy"** → **"Deploy site"**

---

## ⚠️ IMPORTANTE: Variables de Entorno

Si es la primera vez que conectas Netlify con este repo, o si el deploy falla, verifica que tengas las variables de entorno configuradas:

### **Ir a Site Settings:**
1. En tu sitio de Netlify, ve a **"Site configuration"** → **"Environment variables"**

### **Agregar estas 2 variables:**

| Variable | Valor | Dónde obtenerlo |
|----------|-------|-----------------|
| `EXPO_PUBLIC_SUPABASE_URL` | https://xxxxx.supabase.co | https://supabase.com/dashboard → Settings → API |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | eyJhbGci... | https://supabase.com/dashboard → Settings → API |

### **Después de agregar variables:**
- Ve a **Deploys** → **Trigger deploy** → **Deploy site**

---

## 🔍 Verificar el Deploy

### **Ver el Log del Build:**
1. En **Deploys**, haz clic en el deploy que está corriendo (el más reciente)
2. Verás el log en tiempo real
3. Debe decir cosas como:
   - `npm run build:web`
   - `Expo export --platform web`
   - `Deploy successful`

### **Si el Build Falla:**

**Error común:** "dependencies not installed"

**Solución:**
1. Ve a **Site configuration** → **Build & deploy** → **Build settings**
2. Verifica que tenga:
   - Build command: `npm run build:web`
   - Publish directory: `dist`
3. Si está usando `expo export -p web` en lugar de `npm run build:web`, cámbialo
4. Guarda y haz **Trigger deploy** nuevamente

---

## 📊 Monitorear el Deploy

### **Ver el progreso:**
- **Building** (2-4 min) → Compilando
- **Deploying** (30 seg) → Subiendo archivos
- **Published** ✅ → ¡Listo!

### **Ver el sitio:**
Una vez que diga "Published", haz clic en el URL de tu sitio o en el botón "Open production deploy"

---

## 🎯 Flujo Futuro

Una vez que Netlify esté conectado correctamente a GitHub, el flujo será:

```bash
# 1. Haces cambios en tu código local
# ...

# 2. Subes a GitHub
npm run upload

# 3. Netlify detecta el cambio automáticamente
# 4. Build automático (3-5 min)
# 5. ✅ App actualizada en producción
```

**Ya no necesitarás trigger manual**, Netlify hará deploy automático cada vez que uses `npm run upload`.

---

## 🐛 Troubleshooting

### **Deploy falla con "build.command failed"**

**Causa:** Netlify está usando el comando incorrecto o las dependencias no están correctas.

**Solución:**
1. Verifica que `package.json` tenga el script:
   ```json
   "build:web": "expo export --platform web && node scripts/inject-adsense.js && node scripts/deploy-prep.js"
   ```
2. Verifica que `netlify.toml` tenga:
   ```toml
   [build]
     command = "npm run build:web"
     publish = "dist"
   ```
3. Clear cache y re-deploy

### **El sitio se despliega pero está en blanco**

**Causa:** Variables de entorno faltantes.

**Solución:**
1. Agrega las variables de Supabase (ver arriba)
2. Re-deploy

### **"Error: Cannot find module 'react-dom'"**

**Causa:** Netlify está usando `expo export -p web` en lugar de `npm run build:web`.

**Solución:**
1. Ve a Build settings
2. Cambia el comando a: `npm run build:web`
3. Save y re-deploy

---

## ✅ Checklist Final

Antes de hacer el deploy, verifica:

- [ ] ✅ Código subido a GitHub
- [ ] Variables de entorno configuradas en Netlify
- [ ] Build command es `npm run build:web`
- [ ] Publish directory es `dist`
- [ ] Netlify está conectado al repo correcto

---

## 🎉 ¡Listo para Deploy!

**Siguiente paso:**
1. Ve a https://app.netlify.com/sites
2. Selecciona tu sitio
3. Haz clic en "Trigger deploy" → "Clear cache and deploy site"
4. Espera 3-5 minutos
5. ✅ ¡Disfruta tu app actualizada!

---

**URL de tu repo:** https://github.com/Aleneytor/al-cambio-app
**Panel de Netlify:** https://app.netlify.com/sites
