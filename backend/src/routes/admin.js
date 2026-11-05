import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get('/summary', async (_req, res) => {
  const [dest, bookings, confirmed, pending] = await Promise.all([
    supabaseAdmin.from('destinations').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('reservations').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('reservations').select('total_amount').eq('status', 'confirmed'),
    supabaseAdmin.from('reservations').select('id', { count: 'exact', head: true }).in('status', ['pending','waiting_verification'])
  ]);
  if (dest.error || bookings.error || confirmed.error || pending.error) return res.status(500).json({ error: 'Gagal mengambil ringkasan dashboard.' });
  res.json({
    destinations: dest.count || 0,
    reservations: bookings.count || 0,
    pending: pending.count || 0,
    confirmedRevenue: (confirmed.data || []).reduce((sum, row) => sum + row.total_amount, 0)
  });
});

router.get('/reservations', async (_req, res) => {
  const { data, error } = await supabaseAdmin.from('reservations')
    .select('*, destinations(name), reservation_items(*)')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.patch('/reservations/:id/status', async (req, res) => {
  const allowed = ['confirmed','rejected','cancelled'];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ error: 'Status tidak valid.' });
  const { data, error } = await supabaseAdmin.from('reservations')
    .update({ status: req.body.status }).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});


router.post('/tickets', async (req, res) => {
  const { destination_id, name, description = '', price } = req.body;
  if (!destination_id || !name?.trim() || !Number.isInteger(Number(price)) || Number(price) < 0) {
    return res.status(400).json({ error: 'Destinasi, nama tiket, dan harga yang valid wajib diisi.' });
  }
  const { data, error } = await supabaseAdmin.from('ticket_types')
    .insert({ destination_id, name: name.trim(), description, price: Number(price), active: true })
    .select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

router.patch('/tickets/:id', async (req, res) => {
  const payload = {};
  if (req.body.name !== undefined) payload.name = String(req.body.name).trim();
  if (req.body.description !== undefined) payload.description = req.body.description;
  if (req.body.price !== undefined) {
    if (!Number.isInteger(Number(req.body.price)) || Number(req.body.price) < 0) return res.status(400).json({ error: 'Harga tiket tidak valid.' });
    payload.price = Number(req.body.price);
  }
  if (req.body.active !== undefined) payload.active = Boolean(req.body.active);
  const { data, error } = await supabaseAdmin.from('ticket_types').update(payload).eq('id', req.params.id).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

router.delete('/tickets/:id', async (req, res) => {
  const { error } = await supabaseAdmin.from('ticket_types').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Jenis tiket berhasil dihapus.' });
});

router.post('/destinations', async (req, res) => {
  const payload = pickDestination(req.body);
  if (!payload.name || !payload.slug) return res.status(400).json({ error: 'Nama dan slug wajib diisi.' });
  const { data, error } = await supabaseAdmin.from('destinations').insert(payload).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

router.patch('/destinations/:id', async (req, res) => {
  const payload = pickDestination(req.body);
  const { data, error } = await supabaseAdmin.from('destinations').update(payload).eq('id', req.params.id).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

router.delete('/destinations/:id', async (req, res) => {
  const { error } = await supabaseAdmin.from('destinations').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Destinasi berhasil dihapus.' });
});

function pickDestination(body) {
  const keys = ['name','slug','short_description','description','address','village','district','regency','province','latitude','longitude','hero_image','published'];
  return Object.fromEntries(keys.filter(k => body[k] !== undefined).map(k => [k, body[k]]));
}
export default router;
