import 'server-only';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

// createClient requires non-empty strings — provide a no-op placeholder at
// build time so Next.js page-data collection doesn't throw. Real requests
// will fail gracefully at runtime if the vars are truly missing.
// Pass cache: 'no-store' through every Supabase fetch so Next.js's data
// cache never serves a stale DB response after rows are approved/rejected.
export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseKey || 'placeholder-key',
    {
        global: {
            fetch: (url, options = {}) => fetch(url, { ...options, cache: 'no-store' }),
        },
    }
);
