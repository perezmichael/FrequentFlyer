import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

// createClient requires non-empty strings — provide a no-op placeholder at
// build time so Next.js page-data collection doesn't throw. Real requests
// will fail gracefully at runtime if the vars are truly missing.
export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseKey || 'placeholder-key'
);
