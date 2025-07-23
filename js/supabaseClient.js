const supabaseUrl = 'https://bibbfmrdieyhnfxghodt.supabase.co'; // Pega aquí la URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpYmJmbXJkaWV5aG5meGdob2R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNzMwMzIsImV4cCI6MjA2ODg0OTAzMn0.HnpwHH9v6SE9hjFM3XnewtNgQ2qWqA5iRRnpx0-FCp4'; // Pega aquí la clave

const supabase = supabase.createClient(supabaseUrl, supabaseKey);
