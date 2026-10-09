# Saku 💚

**Saku** adalah aplikasi web untuk mencatat uang bulanan, dibuat khusus untuk mahasiswa yang tinggal di kos.
Catat pengeluaran dalam 3 ketukan, atur **periode pemasukan** (misalnya dari kiriman tanggal 25 sampai 24 bulan depan),
lihat **sisa uang dan jatah harian**, pasang anggaran, dan kumpulkan tabungan untuk target impianmu.

Tidak perlu akun dan tidak ada server. Semua data tersimpan di browser perangkatmu sendiri (localStorage).
Saku juga bisa **dipasang seperti aplikasi** (PWA) dan tetap bisa dibuka saat offline.

👉 Versi online: https://reyhanakielacahya016-hub.github.io/Coba-coba/

> Nama "Saku" diambil dari *uang saku*. Kalau lebih suka nama lain (misalnya "Dompetku"), ganti konstanta
> `APP_NAME` di `src/components/layout/Logo.jsx`, judul di `index.html`, dan nama di `pwa/vite-plugin-pwa.js`.

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

| Perintah | Fungsinya |
|---|---|
| `npm run build` | Membuat versi siap pakai di folder `dist/` (termasuk manifest, service worker, dan ikon) |
| `npm run preview` | Menjalankan hasil `build` secara lokal di http://localhost:4173/Coba-coba/ |
| `npm test` | Menjalankan unit test (Vitest) untuk logika perhitungan, periode, dan migrasi data |

> Service worker (mode offline) hanya aktif pada hasil `build`, bukan saat `npm run dev`,
> supaya perubahan kode langsung terlihat ketika sedang mengembangkan.

Saat pertama dibuka akan muncul **onboarding 3 layar**. Di layar terakhir pilih
**"Lihat dengan data contoh"** untuk langsung melihat aplikasi yang sudah terisi: dua periode kiriman,
transaksi dua bulan, anggaran, target tabungan, dan grafik.
Data contoh bisa dihapus kapan saja lewat *Pengaturan → Hapus semua data*.

---

## Cara deploy (menerbitkan online)

### GitHub Pages (sudah disiapkan)
Repo ini berisi workflow `.github/workflows/deploy.yml`. Setiap ada perubahan di branch `main`,
GitHub otomatis menjalankan tes, build, lalu menerbitkan isi folder `dist/`
(aplikasi, `manifest.webmanifest`, `sw.js`, dan folder `icons/`).

Pengaturan awal di GitHub (cukup sekali):
1. **Settings → General → Default branch**: pilih `main`.
2. **Settings → Pages → Build and deployment → Source**: pilih **GitHub Actions**.
3. Repo harus **publik** (GitHub Pages gratis hanya untuk repo publik).

Aplikasi terbit di `https://<nama-akun>.github.io/<nama-repo>/`.

### Nama repo atau hosting lain
Build memakai alamat folder **`/Coba-coba/`** (lihat `vite.config.js`). Kalau nama repo berbeda, atau kamu
memakai hosting di root domain seperti Vercel/Netlify, jalankan build dengan variabel `BASE_PATH`:

```bash
BASE_PATH=/ npm run build              # untuk Vercel / Netlify / domain sendiri
BASE_PATH=/nama-repo-lain/ npm run build
```

`start_url`, `scope`, path ikon, dan path service worker otomatis mengikuti nilai ini.

---

## Cara memasang aplikasi (PWA)

**Desktop (Chrome / Edge)**
- Buka alamat Saku, lalu klik ikon **Pasang** (⊕ / monitor dengan panah) di ujung kanan bilah alamat, atau
- klik tombol **"Pasang aplikasi"** di kartu Beranda atau di *Pengaturan → Aplikasi*.

**Android (Chrome)**
- Ketuk tombol **"Pasang aplikasi"** di Beranda, atau menu ⋮ → **Instal aplikasi / Tambahkan ke layar utama**.

**iPhone / iPad (Safari)**
- Ketuk tombol **Bagikan** (kotak dengan panah ke atas) → **Tambahkan ke Layar Utama**.
  Saku juga menampilkan petunjuk ini di Beranda.

Setelah terpasang, Saku terbuka di jendela sendiri, punya ikon di layar utama, dan **tetap bisa dibuka tanpa internet**.
Kalau ada versi baru, muncul notifikasi **"Versi baru Saku sudah siap · Muat ulang"**. Datamu tetap aman saat memperbarui.
Pintasan ikon (tekan lama ikon Saku di Android/desktop) **Catat transaksi** langsung membuka form catat.

---

## Fitur

### 1. Periode pemasukan ✨
- Atur rentang waktu uangmu harus cukup: **tanggal mulai** + **lama periode** (jumlah bebas dalam
  **hari, minggu, atau bulan**, misalnya 10 hari, 3 minggu, 2 bulan) **atau langsung pilih tanggal berakhir**.
- Beri nama (opsional), misalnya "Kiriman Oktober" atau "Beasiswa semester ganjil".
- Bisa dibuat langsung saat mencatat pemasukan: nyalakan **"Mulai periode baru dari pemasukan ini"**.
- Pindah periode dengan tombol **‹ ›** atau ketuk nama periode untuk memilih periode lain / bulan kalender
  / membuat periode baru. Pilihan ini berlaku untuk Beranda, Anggaran, dan Statistik.
- *Rencana → Periode*: periode yang sedang berjalan (garis waktu, sisa uang, jatah harian, sisa hari)
  dan **riwayat semua periode** beserta pemasukan, pengeluaran, dan sisanya.
- Menjelang periode berakhir, Beranda menawarkan untuk menyiapkan periode berikutnya.
- Periode hanyalah "jendela waktu": transaksi tetap terikat pada tanggalnya, jadi **periode yang selesai
  atau dihapus tidak menghilangkan data apa pun**.
- Validasi ramah: tanggal berakhir tidak boleh sebelum tanggal mulai, lama periode harus lebih dari 0,
  dan ada catatan bila periode bertumpuk dengan periode lain.

### 2. Kalender dropdown
- Dipakai di semua isian tanggal: transaksi, tenggat target, tanggal setoran, periode, dan filter riwayat.
- Navigasi lewat **dropdown bulan & tahun** atau tombol ‹ ›, sorotan **hari ini** dan **rentang** yang dipilih.
- Bisa juga **mengetik angka** tanggal / bulan / tahun secara manual (pindah kolom otomatis).
- Bisa dipakai dengan keyboard: panah (geser hari/minggu), PageUp/PageDown (geser bulan), Home/End,
  Enter untuk memilih, Esc untuk menutup.

### 3. Beranda
- **Sisa uang** periode ini dalam angka besar, **jatah harian** (sisa uang ÷ sisa hari), dan **sisa hari**.
- Status yang jelas: **Aman**, **Hampir batas**, atau **Lewat batas**, berdasarkan pengeluaran hari ini dibanding jatah.
- Perbandingan **waktu berjalan vs uang terpakai**, kartu **Hari ini**, grafik **7 hari terakhir** dengan garis jatah,
  streak, pratinjau anggaran & tabungan, tips hemat harian, dan transaksi terakhir.
- Saat belum ada data, Beranda menampilkan 3 langkah awal yang bisa langsung diketuk.

### 4. Catat transaksi cepat
- Tombol **＋** selalu ada di tengah navigasi bawah (atau tekan **N** di keyboard desktop).
- Alur tercepat: **＋ → ketik nominal → ketuk kategori → Simpan**. Tanggal otomatis hari ini.
- Nominal cepat, pilihan "Hari ini / Kemarin / kalender", catatan opsional, buat kategori baru langsung di form,
  opsi **ulangi tiap bulan**, dan notifikasi dengan tombol **Urungkan**.

### 5. Kategori
- Kategori tidak dipaksakan: pilih dari rekomendasi saat onboarding atau buat sendiri.
- Kelola di *Pengaturan → Kategori*: tambah, ganti nama/ikon, hapus (transaksinya pindah ke "Lainnya").

### 6. Anggaran per kategori (*Rencana → Anggaran*)
- Batas disimpan per bulan dan **otomatis disesuaikan** dengan panjang periode yang dipilih.
- Warna lembut: hijau (aman), kuning madu (≥ 80%), koral (lewat batas), plus pesan yang tidak menghakimi.
- **Pasang otomatis** dari rata-rata pengeluaran 3 bulan terakhir.

### 7. Target tabungan (*Rencana → Tabungan*)
- Beberapa target dengan nominal & tenggat; **setor** atau **ambil** dana (dengan tanggal).
- Saran setoran per minggu, dan perayaan kecil saat target tercapai 🎉.

### 8. Riwayat transaksi
- Ringkasan jumlah transaksi, total keluar & masuk; daftar dikelompokkan per hari.
- Cari catatan/kategori/nominal; filter jenis, kategori, **periode yang dipilih**, atau rentang tanggal lewat kalender.

### 9. Statistik
- Total pengeluaran dibanding periode sebelumnya (pada hari yang sama), rata-rata per hari, kategori terbesar.
- Proporsi per kategori, tren harian/mingguan sepanjang periode, **hari paling boros**, **hari tanpa pengeluaran**,
  dan kategori yang paling berubah dibanding periode sebelumnya.

### 10. Transaksi rutin, ekspor/impor, tema
- Transaksi rutin (bayar kos, kiriman) tercatat otomatis tanpa dobel.
- Cadangan JSON (termasuk periode), ekspor CSV, impor JSON/CSV, dan pulihkan dari cadangan saat onboarding.
- Mode **Terang**, **Gelap**, atau **Ikuti sistem**.

---

## Desain

- **Gentle**: dasar krem hangat (`#F7F3EC`), kartu off-white, sudut membulat, bayangan tipis.
- **Berani**: satu warna aksen **hijau zamrud** (`#0E7C5A`, `#3CC79A` di mode gelap) untuk tombol utama dan angka penting.
  Angka sisa uang & jatah harian besar dan tegas; informasi sekunder lebih redup.
- **Jarak konsisten**: skala 4/8px (`--space-1` … `--space-9` di `src/styles/tokens.css`).
- **Animasi halus** 150–300ms: transisi antar halaman, kartu muncul bertahap, angka berhitung, progress bar mengisi,
  kalender bergeser saat ganti bulan. Semua dimatikan bila perangkat meminta *reduce motion*.
- **Aksesibilitas**: kontras lolos WCAG AA di kedua tema, tombol minimal 44px, bisa dipakai penuh dengan keyboard,
  label untuk pembaca layar, dan tampilan tabel untuk grafik.
- Diuji di lebar 320px, 360px, 390px, tablet 768px, dan desktop 1280px.

---

## Struktur folder

```
pwa/                          plugin Vite: manifest.webmanifest + service worker (sw.js)
public/icons/                 ikon aplikasi 192/512, maskable, apple-touch-icon
src/
├─ main.jsx, App.jsx          titik masuk, routing sederhana (#/riwayat, #/rencana/periode, …)
├─ styles/                    design tokens (warna, jarak, durasi) & gaya dasar
├─ lib/                       format Rupiah & tanggal, logika periode, CSV, streak
├─ state/
│  ├─ AppProvider.jsx         Context + useReducer, simpan otomatis, periode yang sedang dilihat
│  ├─ reducer.js              semua aksi yang mengubah data
│  ├─ selectors.js            perhitungan: total, sisa, jatah harian, anggaran, tren, insight
│  ├─ scope.js                periode aktif, pindah periode, rentang yang dipilih
│  ├─ storage.js              baca/tulis, validasi, dan migrasi data
│  ├─ recurring.js, suggestions.js, seed.js
├─ pwa/                       pendaftaran service worker & tombol "Pasang aplikasi"
├─ hooks/                     toast, dialog konfirmasi, tema, router, angka beranimasi
├─ components/
│  ├─ ui/                     Button, Sheet, Calendar, DateField, ProgressBar, Illustration, dll.
│  └─ layout/                 AppShell (navigasi bawah / sidebar), Logo
└─ features/                  onboarding, dashboard, transactions, periods, plan, stats, settings
tests/                        unit test Vitest
```

### Struktur data

Semua data disimpan sebagai satu objek JSON di `localStorage` dengan kunci `saku:v1`:

```js
{
  version: 2,
  settings:     { theme, onboarded, lastBackup },
  categories:   [{ id, name, emoji, type: 'expense'|'income', budget, locked }],
  transactions: [{ id, type, amount, categoryId, date: 'YYYY-MM-DD', note, recurringId, auto, createdAt }],
  periods:      [{ id, name, start: 'YYYY-MM-DD', end: 'YYYY-MM-DD', createdAt }],   // baru di versi 2
  recurring:    [{ id, type, amount, categoryId, note, dayOfMonth, startMonth, lastGenerated, active }],
  goals:        [{ id, name, emoji, target, deadline, createdAt, achievedAt }],
  deposits:     [{ id, goalId, amount, date, note }],   // amount negatif = ambil dana
  checkins:     ['YYYY-MM-DD']                          // hari "tanpa pengeluaran" untuk streak
}
```

**Migrasi:** data versi 1 (sebelum ada fitur periode) otomatis dinaikkan ke versi 2 saat aplikasi dibuka.
Semua transaksi, kategori, anggaran, dan tabungan tetap utuh; daftar periode dimulai kosong dan aplikasi
memakai bulan kalender sampai kamu membuat periode. File cadangan lama juga tetap bisa diimpor.

---

## Catatan penting

- Data hanya ada di **browser dan perangkat yang kamu pakai** (versi terpasang dan versi browser memakai
  penyimpanan yang sama). Membersihkan data browser akan menghapusnya, jadi rajin-rajinlah **unduh cadangan**.
- Teknologi: React 19, Vite, CSS biasa dengan CSS variables, ikon [Lucide](https://lucide.dev),
  grafik & kalender dibuat sendiri tanpa library tambahan.
