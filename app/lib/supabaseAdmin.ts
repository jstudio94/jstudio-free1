import { createClient } from '@supabase/supabase-js'

// NEXT_PUBLIC_ 접두사가 붙어 있어야 브라우저에서 읽을 수 있습니다.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("환경 변수가 비어 있습니다! .env.local 파일을 확인하세요.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);