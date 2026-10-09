# Saku 💚

**Saku** adalah aplikasi web untuk mencatat uang bulanan, dibuat khusus untuk mahasiswa yang tinggal di kos.
Catat pengeluaran dalam 3 ketukan, lihat sisa uang bulan ini, atur anggaran, dan kumpulkan tabungan untuk target impianmu.

Tidak perlu akun dan tidak ada server. Semua data tersimpan di browser perangkatmu sendiri (localStorage).

> Nama "Saku" diambil dari *uang saku*. Kalau lebih suka nama lain (misalnya "Dompetku"), ganti konstanta
> `APP_NAME` di `src/components/layout/Logo.jsx` dan judul di `index.html`.

---

## Cara menjalankan

Yang dibutuhkan: **Node.js versi 20.19 atau lebih baru** ([unduh di sini](https://nodejs.org)).

```bash
# 1. pasang semua paket (cukup sekali)
npm install

# 2. jalankan mode pengembangan
npm run dev
```

Buka alamat yang muncul di terminal (biasanya http://localhost:5173).
Supaya bisa dicoba di HP, sambungkan HP ke Wi-Fi yang sama lalu jalankan `npm run dev -- --host`
dan buka alamat "Network" yang tampil.

Perintah lain:

| Perintah | Fungsinya |
|---|---|
| `npm run build` | Membuat versi siap pakai di folder `dist/` (bisa diunggah ke Netlify, Vercel, GitHub Pages, dll.) |
| `npm run preview` | Menjalankan hasil `build` secara lokal untuk dicek |
| `npm test` | Menjalankan unit test (Vitest) untuk logika perhitungan |

Saat pertama dibuka akan muncul **onboarding 3 layar**. Di layar terakhir pilih
**"Lihat dengan data contoh"** untuk langsung melihat aplikasi yang sudah terisi dua bulan catatan anak kos.
Data contoh bisa dihapus kapan saja lewat *Pengaturan → Hapus semua data*.

---

## Fitur

### 1. Beranda (dashboard bulanan)
- **Sisa uang bulan ini** dalam angka besar = pemasukan − pengeluaran − yang ditabung.
- Ringkasan pemasukan, pengeluaran, dan tabungan.
- Satu kalimat insight yang ramah, misalnya *"Sisa 23 hari lagi. Kira-kira Rp 33.500 per hari supaya aman."*
- Pemilih bulan ‹ Oktober 2026 › untuk melihat bulan-bulan sebelumnya.
- Streak hari mencatat, 3 anggaran yang paling mendekati batas, dan 5 transaksi terakhir.

### 2. Catat transaksi cepat
- Tombol **＋** selalu ada di tengah navigasi bawah (atau tekan **N** di keyboard desktop).
- Alur tercepat: **＋ → ketik nominal → ketuk kategori → Simpan**. Tanggal otomatis hari ini.
- Kategori diurutkan dari yang paling sering kamu pakai, ada nominal cepat (5rb, 10rb, …),
  pilihan "Hari ini / Kemarin / tanggal lain", catatan opsional, dan bisa membuat kategori baru langsung dari situ.
- Setelah menyimpan muncul notifikasi singkat dengan tombol **Urungkan**.

### 3. Kategori
- Kategori **tidak dipaksakan**. Saat onboarding kamu memilih dari rekomendasi (Makan, Kos, Transportasi,
  Pulsa/Internet, Jajan, Belajar, Hiburan, Laundry, Kesehatan, Kiriman Ortu, Beasiswa, Kerja Sampingan)
  atau membuat sendiri.
- Kelola di *Pengaturan → Kategori*: tambah, ganti nama/ikon, hapus. Ada bagian **Rekomendasi** untuk
  menambah kategori saran dengan satu ketukan.
- Kategori **Lainnya** selalu ada sebagai cadangan. Saat kategori dihapus, transaksinya dipindah ke sana, jadi tidak ada data yang hilang.

### 4. Anggaran per kategori (*Rencana → Anggaran*)
- Pasang batas bulanan per kategori. Saku bisa menyarankan angka dari rata-rata 3 bulan terakhir.
- Progress bar berubah warna dengan lembut: **hijau** (aman), **kuning madu** (≥ 80%), **koral** (lewat batas).
- Pesannya tidak menghakimi, misalnya *"Tinggal Rp 10.000 untuk hiburan, pelan-pelan ya."*

### 5. Target tabungan (*Rencana → Tabungan*)
- Buat beberapa target (nama, ikon, nominal, tenggat opsional).
- **Setor** atau **Ambil** dana. Kalau ada tenggat, Saku menyarankan berapa yang perlu disisihkan per minggu.
- Saat target tercapai muncul perayaan kecil dengan konfeti dan pesan penyemangat 🎉.

### 6. Riwayat transaksi
- Dikelompokkan per hari, lengkap dengan subtotal harian.
- Cari berdasarkan catatan, nama kategori, atau nominal.
- Filter jenis (masuk/keluar), kategori, dan rentang tanggal (7 hari, bulan ini, bulan lalu, atau pilih sendiri).
- Ketuk transaksi untuk mengubah atau menghapus (bisa diurungkan).

### 7. Statistik
- Total pengeluaran dibanding periode yang sama bulan lalu, rata-rata per hari, dan kategori terbesar.
- **Ke mana uangmu pergi**: proporsi pengeluaran per kategori dalam bentuk bar.
- **Tren pengeluaran** harian atau mingguan dengan garis rata-rata. Detail tiap kolom bisa dilihat lewat
  kursor, sentuhan, atau tombol panah. Pengeluaran rutin seperti kos bisa disembunyikan supaya pola harian lebih jelas.
- Tersedia tampilan tabel untuk pembaca layar.

### 8. Transaksi rutin
- Aktifkan **"Ulangi tiap bulan"** saat mencatat, atau atur di *Pengaturan → Transaksi rutin*.
- Contoh: bayar kos tiap tanggal 1, kiriman ortu tiap tanggal 1. Saku otomatis mencatatnya saat tanggalnya tiba,
  termasuk mengisi bulan yang terlewat kalau aplikasi lama tidak dibuka. Tidak pernah tercatat dobel.
- Jadwal bisa dijeda, diubah, atau dihapus (transaksi yang sudah tercatat tetap ada).

### 9. Ekspor & impor
- **Unduh cadangan (JSON)**: berisi semua data. Saku mengingatkan kalau cadangan terakhir sudah lama.
- **Ekspor CSV**: daftar transaksi yang bisa dibuka di Excel atau Google Sheets.
- **Impor**: file JSON dari Saku (pilih *Gabungkan* atau *Ganti semua*), atau CSV dengan kolom
  `tanggal, jenis, kategori, nominal, catatan` (pemisah koma atau titik koma, tanggal `2026-10-09` atau `09/10/2026`).
- Di layar onboarding juga ada pilihan **"Pulihkan dari cadangan"** untuk yang baru ganti HP.

### 10. Mode gelap & terang
- Pilih *Terang*, *Gelap*, atau *Ikuti sistem* di Pengaturan.

---

## Desain

- **Gentle**: dasar krem hangat (`#F7F3EC`), kartu off-white, sudut membulat, bayangan tipis, animasi tenang.
- **Berani**: satu warna aksen **hijau zamrud** (`#0E7C5A`, versi terang `#3CC79A` di mode gelap) untuk tombol utama
  dan angka penting. Angka saldo memakai huruf besar dan tebal.
- **Font**: *Bricolage Grotesque* untuk judul dan angka, *Plus Jakarta Sans* (dirancang di Indonesia) untuk teks.
  Keduanya sudah dibundel, jadi tetap tampil walau offline.
- **Aksesibilitas**: kontras warna lolos WCAG AA di kedua tema, tombol minimal 44px, bisa dipakai penuh dengan
  keyboard (Tab, Enter, Esc, panah di grafik), ada "Lompat ke konten", label untuk pembaca layar, dan animasi
  dimatikan bila perangkat meminta *reduce motion*.

---

## Struktur folder

```
src/
├─ main.jsx, App.jsx          titik masuk & routing sederhana (#/riwayat, #/rencana, …)
├─ styles/                    design tokens (warna, radius, font) & gaya dasar
├─ lib/                       fungsi bantu: format Rupiah & tanggal, CSV, streak
├─ state/                     data aplikasi
│  ├─ AppProvider.jsx         Context + useReducer, simpan otomatis ke localStorage
│  ├─ reducer.js              semua aksi yang mengubah data
│  ├─ selectors.js            perhitungan: total, sisa, anggaran, tren, insight
│  ├─ recurring.js            pembuat transaksi rutin
│  ├─ storage.js              baca/tulis + validasi data
│  ├─ suggestions.js          rekomendasi kategori
│  └─ seed.js                 data contoh
├─ hooks/                     toast, dialog konfirmasi, tema, router, angka beranimasi
├─ components/
│  ├─ ui/                     Button, Sheet, ProgressBar, input nominal, chip, dll.
│  └─ layout/                 AppShell (navigasi bawah / sidebar), Logo
└─ features/                  satu folder per fitur
   ├─ onboarding/  dashboard/  transactions/  plan/ (budget, goals)  stats/  settings/
tests/                        unit test Vitest
```

### Struktur data

Semua data disimpan sebagai satu objek JSON di `localStorage` dengan kunci `saku:v1`:

```js
{
  version: 1,
  settings:     { theme, onboarded, lastBackup },
  categories:   [{ id, name, emoji, type: 'expense'|'income', budget, locked }],
  transactions: [{ id, type, amount, categoryId, date: 'YYYY-MM-DD', note, recurringId, auto, createdAt }],
  recurring:    [{ id, type, amount, categoryId, note, dayOfMonth, startMonth, lastGenerated, active }],
  goals:        [{ id, name, emoji, target, deadline, createdAt, achievedAt }],
  deposits:     [{ id, goalId, amount, date, note }],   // amount negatif = ambil dana
  checkins:     ['YYYY-MM-DD']                          // hari "tanpa pengeluaran" untuk streak
}
```

Nominal selalu disimpan sebagai angka bulat rupiah, dan tanggal sebagai teks lokal supaya bebas masalah zona waktu.

---

## Catatan penting

- Data hanya ada di **browser dan perangkat yang kamu pakai**. Membersihkan data browser atau memakai mode
  penyamaran akan menghapusnya, jadi rajin-rajinlah **unduh cadangan** dari Pengaturan.
- Teknologi: React 19, Vite, CSS biasa dengan CSS variables, ikon [Lucide](https://lucide.dev). Grafik dibuat
  dengan SVG sendiri tanpa library tambahan.
