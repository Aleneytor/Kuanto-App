# Guía de Despliegue del Sistema de Scraping BCV

He completado la codificación de todos los componentes necesarios. Sigue estos pasos para desplegar el sistema en tu proyecto Supabase.

## 1. Aplicar la Migración de Base de Datos

Esto creará la tabla `bcv_rates_history` donde se guardarán las tasas.

Ejecuta en tu terminal:
```bash
npx supabase migration up
```
*Si no tienes la CLI configurada, copia el contenido de `supabase/migrations/20260127000000_create_bcv_rates_history.sql` en el SQL Editor de Supabase.*

## 2. Desplegar la Edge Function

Ejecuta:
```bash
npx supabase functions deploy bcv-scraper
```

## 3. Configurar Cron Jobs (Scheduling)

Para ejecutar a las 5:00 PM VET (21:00 UTC) y reintentar cada 30 min:

En el SQL Editor de Supabase (requiere extensión `pg_cron` y `pg_net`):

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'bcv-scrape-5pm',
  '0 21 * * *', 
  $$
  select
    net.http_post(
      url:='https://TU_PROYECTO.supabase.co/functions/v1/bcv-scraper',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer TU_SERVICE_KEY"}'::jsonb
    ) as request_id;
  $$
);
```

## 4. Verificación

La app (`rateService.js`) ya está configurada para priorizar los datos de esta tabla.
