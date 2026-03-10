import { createClient } from '@supabase/supabase-js';

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

// Validate URL format to prevent crashes
try {
  new URL(supabaseUrl);
} catch (e) {
  console.warn(`Invalid Supabase URL provided: ${supabaseUrl}. Falling back to placeholder.`);
  supabaseUrl = 'https://placeholder.supabase.co';
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && 
         !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && 
         process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co' &&
         supabaseUrl !== 'https://placeholder.supabase.co';
};
