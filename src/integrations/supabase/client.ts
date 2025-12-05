import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gkjyajysblgdxujbdwxc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdranlhanlzYmxnZHh1amJkd3hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMxMjcwNTksImV4cCI6MjA1ODcwMzA1OX0.-wSgfH1Rzsk3PGFuITiNBlLel4QgjO-tTKn5k16N1LI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);