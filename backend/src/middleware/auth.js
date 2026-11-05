import { supabaseAdmin, supabasePublic } from '../config/supabase.js';

export async function requireAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });
    const { data: { user }, error } = await supabasePublic.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Sesi login tidak valid.' });
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles').select('id,full_name,email,role').eq('id', user.id).single();
    if (profileError || !profile) return res.status(403).json({ error: 'Profil pengguna tidak ditemukan.' });
    req.user = { ...user, profile };
    next();
  } catch {
    res.status(401).json({ error: 'Tidak dapat memverifikasi sesi.' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.profile?.role !== 'admin') {
    return res.status(403).json({ error: 'Akses khusus administrator.' });
  }
  next();
}
