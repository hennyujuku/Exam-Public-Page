// 設定 ── Supabase 接続情報（フロントに置いてよい値）
//
// anon キーは「公開前提」の鍵です。実際のアクセス制御は RLS が担うため、
// フロントに書いても安全です（service_role キーは絶対にフロントに置かない）。
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL = "https://drmoefhhovpzmuzdqhax.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRybW9lZmhob3Zwem11emRxaGF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NjU3OTUsImV4cCI6MjA5MjA0MTc5NX0.2R_ijVxHWiB8augZ-j1Rw9tpixmYtplkMFbmQ92Sj50";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 回答を採点・記録する Edge Function 名
export const SUBMIT_FUNCTION = "submit-exam";
