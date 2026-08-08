-- 1. Habilitar extensiones necesarias
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- 2. Programar la tarea para que se ejecute en el minuto 0 de cada hora
-- Esta tarea llama a tu Edge Function 'update-p2p-rates'
select cron.schedule(
    'actualizar-tasa-p2p-cada-hora', -- Nombre unico del cron
    '0 * * * *',                     -- Cron expression: Minuto 0, cualquier hora
    $$
    select
      net.http_post(
          url:='https://goiaxsdsrwxlebpsnbrx.supabase.co/functions/v1/update-p2p-rates',
          -- Usamos tu Anon Key publica para autenticar la llamada.
          -- ⚠️ Reemplaza 'TU_PUBLISHABLE_KEY_AQUI' con tu clave publishable real
          -- (Settings → API → publishable key). Aunque es pública por diseño,
          -- no se debe commitear hardcodeada: cada entorno puede tener la suya.
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer TU_PUBLISHABLE_KEY_AQUI"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
);

-- Comandos utiles para el futuro (descomentar para usar):
-- Ver tareas programadas:
-- select * from cron.job;

-- Eliminar esta tarea:
-- select cron.unschedule('actualizar-tasa-p2p-cada-hora');
