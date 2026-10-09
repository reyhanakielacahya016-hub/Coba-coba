# Saku 💚

**Saku** adalah aplikasi web untuk mencatat uang bulanan, dibuat khusus untuk mahasiswa yang tinggal di kos.
Catat pengeluaran dalam 3 ketukan, atur **periode pemasukan** (misalnya dari kiriman tanggal 25 sampai 24 bulan depan),
lihat **sisa uang dan jatah harian**, pasang **batasan pengeluaran** sesuai ritmemu, dan kumpulkan tabungan untuk target impianmu.

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
**"Lihat dengan data contoh"** untuk langsung melihat aplikasi yang sudah terisi: periode bulanan yang
berulang tiap **tanggal 25** (pemasukan dicatat otomatis, sisa periode lalu ikut dibawa), lima contoh
**batasan** (jatah harian otomatis, makan per hari, jajan 10% dari pemasukan, transportasi per 3 hari dengan
sisa dibawa, hiburan per 14 hari yang hampir habis), target tabungan, dan grafik.
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

### 1. Periode yang bisa dikustom penuh ✨
Periode adalah rentang waktu uangmu harus cukup. Atur di *Rencana → Periode → Baru* (atau lewat pemilih periode).

- **Jenis periode**
  - **Harian**: setiap hari jadi satu periode (cocok untuk uang jajan harian).
  - **Mingguan**: pilih hari mulai, misalnya **Senin** atau **Sabtu**.
  - **Bulanan**: pilih **tanggal mulai 1–31**, misalnya tanggal 25 kalau uang bulanan datang tanggal 25.
    Untuk tanggal 29–31, di bulan yang lebih pendek periode dimulai di hari terakhir bulan itu
    (contoh tanggal 31: 31 Jan – 27 Feb, lalu 28 Feb – 30 Mar).
  - **Kustom**: isi angka dan satuan bebas (10 hari, 2 minggu, 3 bulan), atau pilih tanggal mulai dan
    tanggal akhir lewat kalender.
- **Ulangi otomatis**: periode baru dimulai sendiri saat periode lama berakhir. Kalau aplikasi lama tidak dibuka,
  periode yang terlewat ikut dibuat (tanpa dobel). Bisa juga **sekali saja**.
- **Pemasukan per periode**: isi jumlah uang yang diterima di awal periode (misalnya Rp 1.500.000 tiap tanggal 25).
  Nyalakan **"Catat otomatis tiap periode baru"**, atau biarkan mati dan Saku akan menampilkan pengingat
  "Catat" satu ketukan.
- **Sisa uang dari periode sebelumnya** (di *Atur lebih detail*):
  - **Bawa ke periode berikutnya**: sisa positif menambah saldo awal periode berikutnya (sisa minus tidak dibawa).
    Dihitung ulang terus, jadi tetap benar walau transaksi lama diedit.
  - **Pindahkan ke tabungan**: saat periode selesai, sisanya disetor otomatis ke target tabungan pilihanmu.
  - **Abaikan**: setiap periode mulai dari pemasukannya sendiri.
- **Template cepat**: *Uang bulanan anak kos*, *Gaji mingguan*, *Hemat akhir bulan*. Semua isian tetap bisa diubah,
  dan template bisa sekaligus membuat batasan yang disarankan.
- **Pratinjau langsung** saat mengatur, misalnya
  *"Periode: 25 Okt – 24 Nov 2026 (31 hari) · Jatah harian ±Rp 48.000"*, ditambah tanggal mulai periode berikutnya.
- **Ganti dan lihat periode**: tombol **‹ ›** di Beranda, Riwayat, Batasan, Statistik, dan Periode; ketuk nama periode
  untuk memilih periode lain atau bulan kalender. Tab *Periode* menampilkan rincian (sisa periode lalu, pemasukan,
  pengeluaran, ditabung, sisa), **rencana berulang** (ubah aturan, hentikan, lanjutkan), dan **riwayat periode**
  beserta lencana "+Rp X dari periode lalu", "Rp X dibawa", atau "Rp X ke tabungan".
- Mengubah aturan berlaku mulai periode berikutnya; satu periode juga bisa diubah sendiri (nama, tanggal, aturan sisa).
- Periode hanyalah "jendela waktu": **periode yang selesai atau dihapus tidak menghilangkan transaksi apa pun**.
- Validasi ramah: tanggal akhir tidak boleh sebelum tanggal mulai, jumlah pemasukan tidak boleh nol,
  pilih target tabungan bila sisa dipindah ke tabungan, dan catatan bila periode bertumpuk.

### 2. Batasan pengeluaran yang bisa dikustom penuh 🎯
Atur di *Rencana → Batasan*.

- **Untuk apa**: total semua pengeluaran, atau satu kategori (makan, jajan, transportasi, dan lainnya).
- **Rentang bebas, tidak harus sama dengan periode**: per hari, per minggu (hari mulai bebas), per bulan
  (tanggal mulai bebas), **per N hari** (contoh Rp 100.000 per 3 hari), **ikut periode**, atau **rentang tanggal**
  tertentu lewat kalender.
- **Besarnya**:
  - **Nominal tetap** (contoh makan maksimal Rp 30.000 per hari).
  - **Persen dari pemasukan periode** (contoh jajan maksimal 10%). Kalau rentangnya lebih pendek dari periode,
    nilainya disesuaikan (10% per minggu = 10% × pemasukan × 7/panjang periode).
  - **Hitung otomatis** (khusus batas total): sisa uang ÷ sisa hari di periode berjalan.
- **Sisa batas yang tidak terpakai**: **hangus**, atau **ditambahkan ke rentang berikutnya** (sampai periode berakhir,
  supaya tidak menumpuk berbulan-bulan).
- **Peringatan yang bisa diatur**: geser ambangnya 50–100% (bawaan 80%). Warnanya berubah lembut
  (hijau → kuning madu → koral) dengan pesan yang tidak menghakimi.
- Setiap kartu menampilkan **sisa batas hari ini** dan **yang masih aman dipakai**; ringkasan di atas menampilkan
  **"Aman dipakai hari ini"** untuk semua batasan sekaligus.
- Batas total bisa **mengabaikan transaksi rutin** (misalnya bayar kos) supaya jatah harian tidak langsung "lewat".
- Batasan bisa **diaktifkan/dinonaktifkan** lewat sakelar, **diubah**, dan **dihapus** (dengan Urungkan) kapan saja.
- Peringatan bila batas kategori lebih besar dari pemasukan periode (tetap boleh disimpan), ide batasan siap pakai,
  dan saran batas dari rata-rata pengeluaran 3 bulan terakhir.
- Setelah mencatat pengeluaran, notifikasi memberi tahu sisa batas yang relevan, misalnya
  *"Makan masih aman Rp 21.000 hari ini."*

### 3. Kalender dropdown
- Dipakai di semua isian tanggal: transaksi, tenggat target, tanggal setoran, periode, dan filter riwayat.
- Navigasi lewat **dropdown bulan & tahun** atau tombol ‹ ›, sorotan **hari ini** dan **rentang** yang dipilih.
- Bisa juga **mengetik angka** tanggal / bulan / tahun secara manual (pindah kolom otomatis).
- Bisa dipakai dengan keyboard: panah (geser hari/minggu), PageUp/PageDown (geser bulan), Home/End,
  Enter untuk memilih, Esc untuk menutup.

### 4. Beranda
- **Sisa uang** periode ini dalam angka besar (termasuk sisa periode lalu bila dibawa), **jatah harian**
  (sisa uang ÷ sisa hari), dan **sisa hari**.
- Status yang jelas: **Aman**, **Hampir batas**, atau **Lewat batas**, berdasarkan pengeluaran hari ini dibanding jatah.
- Perbandingan **waktu berjalan vs uang terpakai**, kartu **Hari ini**, grafik **7 hari terakhir** dengan garis jatah,
  streak, pratinjau batasan (aman dipakai hari ini) & tabungan, tips hemat harian, dan transaksi terakhir.
- Saat belum ada data, Beranda menampilkan 3 langkah awal yang bisa langsung diketuk.

### 5. Catat transaksi cepat
- Tombol **＋** selalu ada di tengah navigasi bawah (atau tekan **N** di keyboard desktop).
- Alur tercepat: **＋ → ketik nominal → ketuk kategori → Simpan**. Tanggal otomatis hari ini.
- Nominal cepat, pilihan "Hari ini / Kemarin / kalender", catatan opsional, buat kategori baru langsung di form,
  opsi **ulangi tiap bulan**, dan notifikasi dengan tombol **Urungkan**.

### 6. Kategori
- Kategori tidak dipaksakan: pilih dari rekomendasi saat onboarding atau buat sendiri.
- Kelola di *Pengaturan → Kategori*: tambah, ganti nama/ikon, hapus (transaksinya pindah ke "Lainnya").

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
- Cadangan JSON (termasuk periode, rencana berulang, dan batasan), ekspor CSV, impor JSON/CSV, dan pulihkan dari cadangan saat onboarding.
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
│  └─ windows.js              jendela waktu: harian, mingguan, bulanan (tgl bebas), per-N, rentang
├─ state/
│  ├─ AppProvider.jsx         Context + useReducer, simpan otomatis, periode yang sedang dilihat
│  ├─ reducer.js              semua aksi yang mengubah data
│  ├─ selectors.js            perhitungan: total, sisa, jatah harian, tren, insight
│  ├─ scope.js                periode aktif, pindah periode, rentang yang dipilih
│  ├─ cycles.js               periode berulang, pemasukan otomatis, sisa ke tabungan
│  ├─ ledger.js               buku besar per periode (sisa bawaan, sisa akhir)
│  ├─ limits.js               batasan: rentang, nominal/persen/otomatis, sisa dibawa, peringatan
│  ├─ templates.js            template cepat periode & batasan
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
  version: 3,
  settings:     { theme, onboarded, lastBackup },
  categories:   [{ id, name, emoji, type: 'expense'|'income', locked }],
  transactions: [{ id, type, amount, categoryId, date: 'YYYY-MM-DD', note, recurringId, periodId, auto, createdAt }],
  periods:      [{ id, name, start, end, cycleId, carry: 'carry'|'save'|'ignore', goalId, settled, createdAt }],
  cycles:       [{ id, name, kind: 'daily'|'weekly'|'monthly'|'custom', weekStart, monthDay, count, unit,
                   anchor, repeat, income: { amount, categoryId, auto } | null, carry, goalId, active, until }],
  limits:       [{ id, name, target: 'total' | <id kategori>,
                   window: { kind: 'day'|'week'|'month'|'ndays'|'range'|'period', weekStart, monthDay, count, anchor, start, end },
                   mode: 'fixed'|'percent'|'auto', amount, percent, rollover: 'reset'|'carry',
                   warnAt, skipRecurring, active, since }],
  recurring:    [{ id, type, amount, categoryId, note, dayOfMonth, startMonth, lastGenerated, active }],
  goals:        [{ id, name, emoji, target, deadline, createdAt, achievedAt }],
  deposits:     [{ id, goalId, amount, date, note, periodId, auto }],   // amount negatif = ambil dana
  checkins:     ['YYYY-MM-DD']                                        // hari "tanpa pengeluaran" untuk streak
}
```

- `weekStart`: 0 = Senin … 6 = Minggu. `monthDay`: 1–31.
- `cycles` adalah **aturan**; setiap periode yang dibuat dari aturan itu disimpan di `periods` dengan `cycleId`.
  `until` adalah tanggal akhir periode terakhir yang sudah dibuat, supaya tidak ada yang dobel.
- `settled` mencatat sisa yang sudah dipindah ke tabungan saat periode selesai.

**Migrasi otomatis** saat aplikasi dibuka (juga saat mengimpor cadangan lama):
- **v1 → v2**: menambah daftar periode (kosong).
- **v2 → v3**: anggaran kategori lama (`budget`) menjadi **batasan "per bulan, nominal tetap"** yang dimulai pada
  tanggal mulai periode terakhirmu (atau tanggal 1 kalau belum punya periode). Periode lama menjadi periode
  "sekali saja" dengan sisa diabaikan, jadi angka-angkanya tidak berubah. Transaksi, kategori, dan tabungan tetap utuh.

Logika periode dan batasan punya unit test sendiri (`tests/cycles-limits.test.js`): bulan 28/29/30/31 hari,
tahun kabisat, periode yang melewati pergantian tahun, periode mulai tanggal 31, minggu mulai Sabtu, per-N hari,
sisa dibawa/ke tabungan, persen, hitung otomatis, validasi, dan migrasi.

---

## Catatan penting

- Data hanya ada di **browser dan perangkat yang kamu pakai** (versi terpasang dan versi browser memakai
  penyimpanan yang sama). Membersihkan data browser akan menghapusnya, jadi rajin-rajinlah **unduh cadangan**.
- Teknologi: React 19, Vite, CSS biasa dengan CSS variables, ikon [Lucide](https://lucide.dev),
  grafik & kalender dibuat sendiri tanpa library tambahan.
