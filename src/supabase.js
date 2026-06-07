import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export let supabase = null;

try {
  if (supabaseUrl.includes('your-project.supabase.co') || supabaseKey.includes('your-anon-key')) {
    console.error(
      "%c[Supabase Config Error]%c You are using placeholder credentials for Supabase in your .env file.\n" +
      "OTP emails and backend services WILL NOT WORK until you provide real VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
      "color: red; font-weight: bold; font-size: 14px;", ""
    );
    // Explicitly leaving supabase as null to trigger UI errors
  } else if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
  } else {
    console.warn("[Supabase Config Warning] Missing Supabase environment variables.");
  }
} catch (error) {
  console.error("[Supabase Config Error] Failed to initialize Supabase client:", error);
}
