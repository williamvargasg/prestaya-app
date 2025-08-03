import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qfufirwnoppswqwnkuja.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdWZpcndub3Bwc3dxd25rdWphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NDE0NDksImV4cCI6MjA2OTUxNzQ0OX0.gTFJxqD5UK2RuLjRLmu62lQebxSI09ng5jK_Hjz2Rzc'

export const supabase = createClient(supabaseUrl, supabaseKey)
