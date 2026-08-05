
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

// Proyecto "kuanto-mobile": el mismo backend Supabase que usa la app móvil
// (tabla pública de solo lectura `daily_rates`, protegida por RLS). La
// publishable key es pública por diseño, no requiere variables de entorno.
const supabaseUrl = 'https://ghyznbisjcdmtuaelhmg.supabase.co';
const supabaseKey = 'sb_publishable_cEBA0AOt9yrhP0-5Sp5bHw_AzkMQlFj';

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
