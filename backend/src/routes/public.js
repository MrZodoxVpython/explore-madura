import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok', service: 'Explore Madura API' }));

router.get('/destinations', async (_req, res) => {
  const { data, error } = await supabaseAdmin.from('destinations')
    .select('*, facilities(*), galleries(*), ticket_types(*)')
    .eq('published', true).order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/destinations/:slug', async (req, res) => {
  const { data, error } = await supabaseAdmin.from('destinations')
    .select('*, facilities(*), galleries(*), ticket_types(*)')
    .eq('slug', req.params.slug).eq('published', true).single();
  if (error) return res.status(404).json({ error: 'Destinasi tidak ditemukan.' });
  res.json(data);
});

export default router;
