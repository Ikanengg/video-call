import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ibbekdckqhwxcuhxedde.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_sznR5tJ-oaIOfZIJj8clzg_YMyRNt0y';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
