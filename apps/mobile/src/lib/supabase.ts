import 'react-native-url-polyfill/auto';
import 'expo-sqlite/localStorage/install';

import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import type { Database } from './database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const forceDemoMode = process.env.EXPO_PUBLIC_FORCE_DEMO === 'true';

export const isCloudConfigured = !forceDemoMode && Boolean(supabaseUrl && supabasePublishableKey);
export const passwordResetRedirectUrl = Platform.OS === 'web' && typeof globalThis.location?.origin === 'string'
  ? globalThis.location.origin
  : undefined;

export const supabase = isCloudConfigured
  ? createClient<Database>(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        storage: globalThis.localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
      },
    })
  : null;
