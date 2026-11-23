import { createClient } from '@supabase/supabase-js';

// The URL and anon key are public by design (Row Level Security protects the data).
// They come from Vercel env vars, with the project defaults as a fallback.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://qxafigbrfpxdklwoqkxj.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4YWZpZ2JyZnB4ZGtsd29xa3hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4NTkwOTIsImV4cCI6MjA2MjQzNTA5Mn0.UZ6Kq-8SgYAQcXL2nRwz14sl3ly7YEO71PN8bwn948c";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 