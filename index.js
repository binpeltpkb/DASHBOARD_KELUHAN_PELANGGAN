const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const app = express();
const port = Number(process.env.PORT) || 3000;
app.use(cors());
app.use(express.json({ limit: '1mb' }));
function getSupabase() {
  const { SUPABASE_URL, SUPABASE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('SUPABASE_URL dan SUPABASE_KEY harus diatur di environment variable');
  }
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}
function getModel() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY harus diatur di environment variable');
  }
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });
}
app.get('/health', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('complaints_tickets')
      .select('id')
      .limit(1);
    if (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }
    return res.json({ status: 'ok' });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
});
async function classifyMessage(pesanWA) {
  const systemPrompt = `Kamu menyaring pesan grup WhatsApp operasional pelabuhan.
Tugas: tentukan apakah pesan ini KELUHAN PELANGGAN sungguhan (bukan basa-basi/diskusi biasa).
Kalau ya, tentukan kategori & PIC tujuan mengikuti aturan:
- Kata kunci IT/TOS/OCR/sistem/network -> PIC: ILCS
- Kata kunci billing/invoice/storage/tagihan/bayar -> PIC: SIVIA
- Selain itu (peralatan, crane, delivery, yard, dsb) -> PIC: Operasi / Asman Operasi
Balas HANYA dalam format JSON tanpa teks lain, contoh:
{"is_complaint": true, "category": "Peralatan", "pic": "Operasi / Asman Operasi"}`;
  const model = getModel();
  const result = await model.generateContent(`${systemPrompt}\n\nPesan: "${pesanWA}"`);
  const text = result.response.text().replace(/```json|```/gi, '').trim();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Respons Gemini bukan JSON yang valid');
  }
}
app.post('/api/classify', async (req, res) => {
  const { message } = req.body || {};
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({
      status: 'error',
      message: 'Field message wajib berupa teks dan tidak boleh kosong',
    });
  }
  try {
    const hasil = await classifyMessage(message.trim());
    return res.json(hasil);
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
});
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({
      status: 'error',
      message: 'Request body harus berupa JSON yang valid',
    });
  }
  return next(error);
});
if (require.main === module) {
  app.listen(port, '0.0.0.0', () => {
    console.log(`Backend jalan di port ${port}`);
  });
}
module.exports = { app, classifyMessage };
