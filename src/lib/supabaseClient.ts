import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.ts';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY são obrigatórias (ver .env.example)');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
