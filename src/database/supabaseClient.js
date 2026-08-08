
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

// Proyecto "kuanto-mobile": el mismo backend Supabase que usa la app móvil
// (tabla pública de solo lectura `daily_rates`, protegida por RLS).
//
// La publishable key es pública por diseño (RLS protege los datos), pero se
// lee de variables de entorno (EXPO_PUBLIC_*) en vez de hardcodearla: así
// cada entorno (desarrollo, producción) puede apuntar a su propio backend sin
// tocar el código. Configurar en .env o app.json → extra → expo.extra.
//
// Fallback temporal: si las variables no están definidas (ej. build viejo),
// se usa el valor anterior para no romper la app existente. Esto se debe
// eliminar una vez que todos los builds usen las variables de entorno.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
    || 'https://ghyznbisjcdmtuaelhmg.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    || 'sb_publishable_cEBA0AOt9yrhP0-5Sp5bHw_AzkMQlFj';

export const supabase = createClient(
    supabaseUrl,
    supabaseKey,
    {
        auth: {
            storage: AsyncStorage,
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
        },
    }
);

// Tells Supabase Auth to continuously refresh the session automatically
// if the app is in the foreground. When this is added, you will continue
// to receive `onAuthStateChange` events with the `TOKEN_REFRESHED` or
// `SIGNED_OUT` event if the user's session is terminated. This should
// only be registered once.
AppState.addEventListener('change', (state) => {
    if (state === 'active') {
        supabase.auth.startAutoRefresh();
    } else {
        supabase.auth.stopAutoRefresh();
    }
});
