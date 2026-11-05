# Explore Madura — Full-stack starter

Platform informasi, promosi, dan reservasi wisata alam. Destinasi contoh: Pantai Sembilan, Desa Bringsang, Kecamatan Giligenting, Kabupaten Sumenep, Madura.

## Stack
- Frontend: React + Vite + Tailwind CSS + React Router
- Backend: Node.js + Express
- Database/Auth/Storage: Supabase (PostgreSQL, Supabase Auth, Storage)

## Persyaratan
Node.js 20+ dan akun/proyek Supabase.

## 1. Siapkan Supabase
1. Buat proyek di https://supabase.com.
2. Buka SQL Editor dan jalankan seluruh isi `supabase/schema.sql`.
3. Buka Project Settings → API. Salin Project URL, anon/public key, dan service_role key.
4. Di Authentication → URL Configuration, atur Site URL saat development ke `http://localhost:5173`.
5. Buat akun admin melalui halaman Register aplikasi, lalu jalankan SQL berikut di SQL Editor:
   ```sql
   update public.profiles
   set role = 'admin'
   where email = 'EMAIL_ADMIN_ANDA';
   ```
   Ganti email dengan email akun yang didaftarkan. Jangan pernah menaruh service_role key di frontend.

## 2. Konfigurasi backend
```bash
cd backend
cp .env.example .env
```
Isi `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, dan `CLIENT_ORIGIN`.
Kemudian:
```bash
npm install
npm run dev
```
Backend berjalan di `http://localhost:4000`.

## 3. Konfigurasi frontend
Di terminal kedua:
```bash
cd frontend
cp .env.example .env
```
Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` dengan URL dan anon key yang sama.
Kemudian:
```bash
npm install
npm run dev
```
Buka `http://localhost:5173`.

## 4. Alur penggunaan
- Pengunjung membuka halaman destinasi dan melihat detail.
- Pengunjung mendaftar / login, lalu membuat reservasi tiket.
- Pengunjung dapat melihat reservasinya di menu Reservasi Saya.
- Admin login menggunakan akun yang role-nya sudah diubah menjadi `admin`.
- Admin dapat menambah/mengubah/menghapus destinasi dan memperbarui status reservasi.

## Catatan penting sebelum produksi
- Data Pantai Sembilan, tarif, jam operasional, fasilitas, dan kontak dalam seed adalah data contoh. Verifikasi langsung dengan pengelola sebelum dipublikasikan.
- Pembayaran pada versi ini menggunakan metode transfer/manual dan status menunggu verifikasi admin. Aplikasi tidak memproses transfer secara otomatis.
- Untuk produksi, aktifkan SMTP Supabase, atur domain redirect, gunakan HTTPS, batasi ukuran/jenis file upload, siapkan backup database, dan lakukan pengujian keamanan.
- Jangan mengubah role pengguna menjadi admin melalui frontend. Ubah role hanya melalui Supabase SQL Editor atau proses admin yang terlindungi.
- Jangan pernah mengirim `SUPABASE_SERVICE_ROLE_KEY` ke browser atau memasukkannya ke repository publik.
