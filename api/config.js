// api/config.js — GET /api/config
// Returns public Supabase configuration for client-side initialization.
// The anon key is safe to expose (it's designed for public client usage with RLS).
export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  res.status(200).json({
    supabaseUrl: process.env.SUPABASE_URL || null,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || null
  });
}
