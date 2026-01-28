# BCV Scraper - Vercel

Scraper del BCV que ignora errores de SSL y extrae las tasas directamente.

## Despliegue en Vercel

1. Ve a [vercel.com](https://vercel.com) e inicia sesión con GitHub
2. Crea un nuevo proyecto y sube la carpeta `bcv-scraper-vercel`
3. Deploy automático

## O desde terminal:

```bash
cd bcv-scraper-vercel
npx vercel --prod
```

## Endpoint

Una vez desplegado, tu endpoint será:
```
GET https://tu-proyecto.vercel.app/api/bcv
```

### Respuesta:
```json
{
  "success": true,
  "date": "2026-01-28",
  "usd": 361.4906,
  "eur": 432.71509291,
  "source": "bcv-direct",
  "fetchedAt": "2026-01-28T01:54:06.858Z"
}
```

## Integración con Supabase

Actualiza tu Edge Function en Supabase para llamar a tu endpoint de Vercel:

```typescript
const response = await fetch('https://tu-proyecto.vercel.app/api/bcv');
const data = await response.json();
// data.usd, data.eur, data.date
```
