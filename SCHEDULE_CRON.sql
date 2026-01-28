-- Programar el scraper para ejecutarse a las 5:00 PM VET (21:00 UTC)
-- REEMPLAZA 'TU_SERVICE_ROLE_KEY' CON TU CLAVE REAL DE SUPABASE (settings -> API -> service_role secret)

select cron.schedule(
  'bcv-scrape-5pm-daily',
  '0 21 * * *', -- 21:00 UTC = 17:00 VET
  $$
  select
    net.http_post(
      url:='https://goiaxsdsrwxlebpsnbrx.supabase.co/functions/v1/bcv-scraper',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer sb_secret_yRUdkZwiQwSG1ccSZ7i8Zg_lbIQtfMB"}'::jsonb
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
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer sb_secret_yRUdkZwiQwSG1ccSZ7i8Zg_lbIQtfMB"}'::jsonb
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
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer sb_secret_yRUdkZwiQwSG1ccSZ7i8Zg_lbIQtfMB"}'::jsonb
    ) as request_id;
  $$
);
