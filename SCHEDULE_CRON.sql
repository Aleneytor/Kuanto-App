-- Programar el scraper para ejecutarse a las 5:00 PM VET (21:00 UTC)
-- ⚠️ ANTES DE EJECUTAR: reemplaza 'TU_SB_SECRET_AQUI' con tu clave real de
-- Supabase (Settings → API → service_role secret). NUNCA subas la clave real
-- al repositorio. Si la clave ya estaba commiteada, hay que rotarla en el
-- dashboard de Supabase y purgar el historial de git.

select cron.schedule(
  'bcv-scrape-5pm-daily',
  '0 21 * * *', -- 21:00 UTC = 17:00 VET
  $$
  select
    net.http_post(
      url:='https://goiaxsdsrwxlebpsnbrx.supabase.co/functions/v1/bcv-scraper',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer TU_SB_SECRET_AQUI"}'::jsonb
    ) as request_id;
  $$
);

-- Reintento 5:30 PM VET
select cron.schedule(
  'bcv-scrape-530pm-daily',
  '30 21 * * *', 
  $$
  select
    net.http_post(
      url:='https://goiaxsdsrwxlebpsnbrx.supabase.co/functions/v1/bcv-scraper',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer TU_SB_SECRET_AQUI"}'::jsonb
    ) as request_id;
  $$
);

-- Reintento 6:00 PM VET
select cron.schedule(
  'bcv-scrape-6pm-daily',
  '0 22 * * *', 
  $$
  select
    net.http_post(
      url:='https://goiaxsdsrwxlebpsnbrx.supabase.co/functions/v1/bcv-scraper',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer TU_SB_SECRET_AQUI"}'::jsonb
    ) as request_id;
  $$
);
