# Operational Complaints Backend

Backend Node.js/Express untuk memeriksa kesehatan koneksi Supabase dan mengklasifikasikan pesan keluhan operasional menggunakan Gemini.

## Environment variables

Salin `.env.example` sebagai acuan. Nilai rahasia harus disimpan melalui Secrets/environment variables, bukan di source code:

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `GEMINI_API_KEY`
- `PORT` (opsional, default `3000`)

## Endpoints

- `GET /health` — memeriksa koneksi ke tabel `complaints_tickets`.
- `POST /api/classify` — menerima JSON `{ "message": "..." }` dan mengembalikan hasil klasifikasi Gemini.