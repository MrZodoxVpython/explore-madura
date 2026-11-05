import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { makeBookingCode } from '../utils.js';

const router = Router();

router.get('/mine', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin.from('reservations')
    .select('*, destinations(name,slug), reservation_items(*)')
    .eq('user_id', req.user.id).order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', requireAuth, async (req, res) => {
  const { destination_id, visit_date, customer_name, customer_email, customer_phone, items, notes } = req.body;
  if (!destination_id || !visit_date || !customer_name?.trim() || !customer_email?.trim() || !customer_phone?.trim() || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'Lengkapi data pemesanan dan minimal satu jenis tiket.' });
  }
  if (new Date(`${visit_date}T00:00:00`) < new Date(new Date().toISOString().slice(0,10) + 'T00:00:00')) {
    return res.status(400).json({ error: 'Tanggal kunjungan tidak boleh di masa lalu.' });
  }

  const { data: destination, error: destError } = await supabaseAdmin.from('destinations')
    .select('id').eq('id', destination_id).eq('published', true).single();
  if (destError || !destination) return res.status(404).json({ error: 'Destinasi tidak tersedia.' });

  const ids = [...new Set(items.map(i => i.ticket_type_id))];
  const { data: tickets, error: ticketError } = await supabaseAdmin.from('ticket_types')
    .select('id,name,price,destination_id,active').in('id', ids).eq('destination_id', destination_id).eq('active', true);
  if (ticketError || tickets.length !== ids.length) return res.status(400).json({ error: 'Jenis tiket tidak valid.' });

  let total = 0;
  const normalized = [];
  for (const item of items) {
    const ticket = tickets.find(t => t.id === item.ticket_type_id);
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) return res.status(400).json({ error: 'Jumlah tiket harus 1–20.' });
    const subtotal = ticket.price * quantity;
    total += subtotal;
    normalized.push({ ticket_type_id: ticket.id, ticket_name: ticket.name, quantity, unit_price: ticket.price, subtotal });
  }

  const { data: reservation, error: insertError } = await supabaseAdmin.from('reservations').insert({
    booking_code: makeBookingCode(), user_id: req.user.id, destination_id, visit_date,
    customer_name: customer_name.trim(), customer_email: customer_email.trim(),
    customer_phone: customer_phone.trim(), total_amount: total, notes: notes || '',
    status: 'pending', payment_method: 'bank_transfer'
  }).select().single();
  if (insertError) return res.status(500).json({ error: insertError.message });

  const rows = normalized.map(item => ({ ...item, reservation_id: reservation.id }));
  const { error: itemError } = await supabaseAdmin.from('reservation_items').insert(rows);
  if (itemError) {
    await supabaseAdmin.from('reservations').delete().eq('id', reservation.id);
    return res.status(500).json({ error: 'Gagal menyimpan rincian tiket.' });
  }
  res.status(201).json({ ...reservation, reservation_items: rows });
});

router.post('/:id/payment-proof', requireAuth, async (req, res) => {
  const { file_path } = req.body;
  if (!file_path || typeof file_path !== 'string' || file_path.includes('..')) return res.status(400).json({ error: 'Path bukti pembayaran tidak valid.' });
  const { data, error } = await supabaseAdmin.from('reservations')
    .update({ payment_proof: file_path, status: 'waiting_verification' })
    .eq('id', req.params.id).eq('user_id', req.user.id).eq('status', 'pending')
    .select().single();
  if (error || !data) return res.status(400).json({ error: 'Reservasi tidak ditemukan atau tidak dapat diperbarui.' });
  res.json(data);
});

export default router;
