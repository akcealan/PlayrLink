import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xotojenohtytbsywckjz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvdG9qZW5vaHR5dGJzeXdja2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyNjA2MTUsImV4cCI6MjA2NTgzNjYxNX0.W-NZgCAFSt1ihVZkwYjaZHK-9bOkJRfvLooBB3SAY1k';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);