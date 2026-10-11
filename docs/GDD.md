# Pejuang UMR: Jakarta Survival

### Game Design Document (GDD) Ringkas - v1.9

> **Logline:** Game simulasi kehidupan berbasis papan heksagonal di mana pemain harus bertahan hidup selama 12 bulan dengan menyeimbangkan uang, kesehatan, dan kewarasan mental di tengah kejamnya realita finansial Jakarta.

Bagian yang baru atau berubah ditandai **[v1.9]** (perubahan terbaru), **[v1.8]**, **[v1.7]**, atau **[v1.6]**. Ringkasan perubahan dan daftar asumsi ada di Bagian 10. Dokumen ini adalah versi terkonsolidasi: aturan game dari v1.6, scope MVP dan alur Room dari v1.7, dan ide dari konsep awal "Jatah" yang dicatat sebagai backlog.

### Konsep Inti: Petak adalah Kartu **[v1.6]**

Pejuang UMR bukan game kartu biasa. **Petak heksagon itu sendiri adalah kartunya.** Tidak ada deck yang ditarik, tidak ada kartu di tangan, dan tidak ada kartu yang dibuang. Sejak permainan dimulai, setiap heksa di papan sudah berisi satu petak (kartu) tertutup. Di tiap giliran, **3 heksa di sekeliling pion menyala secara acak**. Pemain mengklik heksa yang menyala untuk melihat detailnya, lalu melangkah ke salah satunya. Heksa yang dipilih menentukan efek sekaligus arah. Satu-satunya kartu yang dipegang pemain adalah **Kartu Ajakan** (4.8).

**Platform:** web app responsif, dimainkan di browser pada HP, tablet, dan desktop. Papan dirender **2D** (heksa datar tampak atas dengan karakter sprite), bukan 3D.

### Scope MVP **[v1.7]**

**Dikerjakan dulu:** Multiplayer 2-4 pemain (24 langkah) dengan **pemain tamu** (nama dan avatar, tanpa akun).

| Ditunda (bukan MVP)                                                   | Bagian GDD yang terpengaruh                                  |
| --------------------------------------------------------------------- | ------------------------------------------------------------ |
| Mode Solo (48 langkah), Akhiri Permainan, Gelar, rekor                | 1.1, 6.3, 6.4, kolom Solo di 1.3, kelompok glosarium N dan T |
| Register, login, profil akun, riwayat, Hall of Fame ("Ajang Flexing") | Bagian 9 (identitas tamu menggantikan akun)                  |
| Database (MongoDB)                                                    | Tidak dibutuhkan tanpa akun dan riwayat                      |

Bagian yang ditunda **tidak dihapus** dari dokumen agar aturan tidak hilang. Ajakan (4.8) tetap bagian dari aturan dan boleh dikerjakan paling akhir di MVP.

### Profil Game **[v1.7]**

| Dimensi       | Pejuang UMR                                                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Jumlah pemain | 2-4 (Solo ditunda)                                                                                                           |
| Durasi        | ±30 menit untuk 4 pemain pada Timer 30 detik (estimasi, perlu playtest)                                                      |
| Kompleksitas  | Ringan sampai menengah. Inti mudah (pilih 1 dari 3 heksa); lapisan tambahan: 4 indikator, kalender, musim, Ajakan            |
| Interaksi     | Semi-kompetitif: balapan Petak Emas, menutup jalur lawan, Ajakan, Beban Peringkat 1. Tanpa serangan langsung                 |
| Mekanik       | Papan heksa bersama, informasi tersembunyi, RNG terkontrol (Rencana vs Realita), manajemen sumber daya, giliran dengan timer |
| Tema          | Simulasi kehidupan dan literasi finansial karyawan UMR Jakarta                                                               |
| Target pemain | Usia 22-27 tahun, tinggal di Jakarta                                                                                         |
| Platform      | Web app responsif                                                                                                            |

---

## 1. Mode Permainan & Kondisi Menang

### 1.1 Mode Solo (Refleksi & Pencapaian) **[Ditunda, bukan MVP]**

Pemain bermain sendirian untuk bertahan hingga bulan ke-12 (48 langkah) dan mencapai Skor Kesejahteraan setinggi mungkin. Tujuannya membuka Achievement dan memecahkan rekor skor serta gelar dari permainan sebelumnya. Mode Solo tidak memakai timer giliran.

**Akhiri Permainan [v1.4]:** pemain Solo boleh mengakhiri permainan kapan saja di awal giliran (dengan konfirmasi). Pemain tetap mendapat **Rapor Insight** (lihat 6.4), tetapi **tidak mendapat Skor, Gelar, maupun pencatatan rekor**. Hal yang sama berlaku jika permainan berakhir karena Sudden Death (1.4).

### 1.2 Mode Multiplayer (2-4 Pemain)

Pemain berjalan di **satu papan heksagon bersama** selama 24 langkah (12 bulan). Pemenang adalah pemain dengan Skor Kesejahteraan tertinggi di akhir permainan.

**Aturan multiplayer:**

- Semua pemain selalu berada di langkah (tanggal) yang sama. Satu **ronde** = semua pemain yang masih hidup sudah melangkah satu kali.
- **Pemain berjalan bergantian [v1.4].** Urutan giliran diputar tiap bulan agar adil: di awal setiap bulan, pemain pertama pindah ke urutan terakhir, dan pemain yang tereliminasi dilewati **[v1.9]**. Setiap giliran dibatasi **Timer Giliran** yang diatur **host di Room** sebelum game dimulai (lihat 4.3 dan 9.3).
- **Setiap heksa hanya bisa diinjak satu kali.** Heksa yang sudah diinjak tidak bisa dimasuki lagi oleh siapa pun, termasuk pemain yang menginjaknya.
- **Papan Skor** selalu tampil di layar dan menampilkan **hanya Skor Sementara** semua pemain. Statistik detail hanya terlihat oleh pemiliknya (lihat 4.6).
- Pemain pemilik skor tertinggi menanggung Beban Peringkat 1 (lihat 4.6).
- Pemain bisa saling mengirim **Ajakan secara realtime**, di luar giliran dan tanpa menghabiskan langkah (lihat 4.8).
- Pemain yang tereliminasi tetap tercatat di papan peringkat, di bawah semua pemain yang bertahan. Antar pemain yang tereliminasi, yang bertahan lebih lama peringkatnya lebih tinggi. Pion pemain yang tereliminasi tetap di papan dan heksanya tetap terisi.
- **Tie-breaker:** jika skor sama, pemenang adalah yang Hutang-nya lebih kecil, lalu yang Level Stress-nya lebih rendah. Jika masih sama persis, pemain mendapat peringkat yang sama dan peringkat berikutnya dilewati (contoh: 1, 1, 3) **[v1.8]**.

### 1.3 Durasi & Skala Mode

Target Multiplayer 4 pemain adalah **sekitar 30 menit** pada Timer 30 detik. Karena itu jumlah langkah dipangkas dan nilai petak disesuaikan.

|                                                | Solo                 | Multiplayer (2-4)                                     |
| ---------------------------------------------- | -------------------- | ----------------------------------------------------- |
| Jumlah langkah                                 | 48                   | 24                                                    |
| 1 langkah =                                    | 1 minggu             | 2 minggu                                              |
| Langkah per bulan                              | 4                    | 2                                                     |
| Cara bermain                                   | Sendiri, tanpa timer | **Bergantian, Timer Giliran 30 atau 60 detik [v1.4]** |
| Nominal Rupiah di petak                        | ×1                   | ×2                                                    |
| Efek status di petak (Kesehatan, Level Stress) | ×1                   | ×2, maksimal ±3 **per efek** **[v1.8]**               |
| Gaji, Biaya Hidup Wajib, bunga                 | per bulan            | per bulan (sama)                                      |

**Perkiraan durasi Multiplayer [v1.4]** (estimasi, perlu playtest):

| Pemain | Total giliran (24 ronde) | Timer 30 dtk (rata-rata ±16 dtk/giliran) | Timer 60 dtk (rata-rata ±30 dtk/giliran) |
| ------ | ------------------------ | ---------------------------------------- | ---------------------------------------- |
| 2      | 48                       | ±13 + 3 menit = **±16 menit**            | ±24 + 3 = **±27 menit**                  |
| 3      | 72                       | ±19 + 3 = **±22 menit**                  | ±36 + 3 = **±39 menit**                  |
| 4      | 96                       | ±26 + 3 = **±29 menit**                  | ±48 + 3 = **±51 menit**                  |

3 menit tambahan = pembuka dan layar skor. Timer 60 detik adalah mode **Santai** dan melewati target 30 menit untuk 4 pemain. Event Tanggal (6 kali, maksimal 15 detik, serentak untuk semua pemain) dan Ajakan (4.8, maksimal 10 detik jawaban, 1 Ajakan per ronde) menambah sekitar 2-5 menit, jadi target 30 menit untuk 4 pemain bisa terlampaui bila Ajakan sering dipakai. Tanpa tarik kartu, waktu per giliran mungkin lebih singkat dari estimasi. Semua perlu playtest.

Katalog petak di Bagian 5 menampilkan nilai mode Solo. Angka pengali masih perlu playtest.

**Cakupan pengali Multiplayer [v1.8]:**

| Dikali (Rupiah ×2, status ×2 maksimal ±3 per efek) | Tidak dikali                                           |
| -------------------------------------------------- | ------------------------------------------------------ |
| Rencana dan Realita petak biasa (5.1, 5.2)         | Petak Emas (5.1, angkanya sudah nilai Multiplayer)     |
| Zonk Musim (3.4)                                   | Ajakan (4.8, angkanya sudah nilai Multiplayer)         |
| Event Tanggal (3.3)                                | Doom Spending (2.5)                                    |
|                                                    | Gaji, Biaya Hidup Wajib, bunga, dan Limit Hutang (2.3) |

Contoh: Realita "Bos marah" (Level Stress +3, Kesehatan -2) di Multiplayer menjadi Level Stress +3 (6 dibatasi menjadi 3) dan Kesehatan -3 (-4 dibatasi menjadi -3). Batas ±3 berlaku untuk tiap efek, bukan total satu kartu.

### 1.4 Kondisi Kalah Dini (Sudden Death)

Pemain langsung tereliminasi (Game Over) sebelum langkah terakhir jika:

- **Bangkrut:** Kekayaan tidak cukup untuk membayar Biaya Hidup Wajib (lihat 2.3) **DAN** sisa limit Hutang (Rp 25.000.000) tidak cukup untuk menutup kekurangannya. Bangkrut hanya dicek saat ganti bulan dan setelah Doom Spending (2.5). Kekurangan dari petak atau Realita yang melewati limit tidak mengeliminasi pemain (lihat aturan transaksi di 2.3) **[v1.9]**.
- **Burnout Total:** Kesehatan mencapai 0/10, **ATAU** Level Stress 10/10 bersamaan dengan Kesehatan ≤ 3/10.

---

## 2. Latar Karakter & Indikator Status

### 2.1 Latar Karakter **[v1.4]**

Di awal permainan, layar pembuka menjelaskan latar pemain agar aturan penghasilan masuk akal:

> _"Kamu seorang karyawan kantoran di Jakarta dengan gaji sebesar UMP. Tiap bulan gajimu habis dipotong kos, makan, transport motor, dan tagihan. Bertahanlah 12 bulan, dari 1 Januari sampai 31 Desember."_

Semua pemain memulai sebagai **Karyawan** dengan gaji tetap. Tidak ada jalur usaha sampingan (dihapus di v1.4).

### 2.2 Penamaan Indikator **[v1.4]**

| Nama Lama      | Nama Baru                               |
| -------------- | --------------------------------------- |
| Saldo (Cash)   | **Kekayaan** (uang tunai yang dimiliki) |
| Utang          | **Hutang**                              |
| Fisik (Health) | **Kesehatan**                           |
| Stres (Mental) | **Level Stress**                        |

Poin Sosial dihapus di v1.4 karena tidak relevan dengan tujuan permainan.

Kesehatan dan Level Stress dibatasi (clamp) pada rentang 0-10.

| Indikator        | Nilai Awal   | Keterangan                                                                                           |
| ---------------- | ------------ | ---------------------------------------------------------------------------------------------------- |
| **Kekayaan**     | Rp 7.500.000 | Uang tunai untuk bertransaksi di petak.                                                              |
| **Hutang**       | Rp 0         | Bertambah jika mengambil pinjaman/paylater. Bunga dipotong otomatis tiap ganti bulan.                |
| **Kesehatan**    | 10/10        | Berkurang karena lembur/begadang/sakit, bertambah karena istirahat/olahraga.                         |
| **Level Stress** | 0/10         | Bertambah karena tagihan, kerja keras, atau hutang; berkurang karena hiburan/belanja/bersosialisasi. |

### 2.3 Parameter Ekonomi (basis Jakarta) **[v1.4]**

| Parameter             | Nilai                         | Keterangan                                                                                                                                         |
| --------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Gaji**              | Rp 5.730.000 / bulan          | Mengacu UMP DKI Jakarta 2026 (Rp5.729.876), dibulatkan. Otomatis masuk ke Kekayaan setiap ganti bulan.                                             |
| **Biaya Hidup Wajib** | Rp 4.600.000 / bulan          | Kos Rp1.500.000, makan Rp1.800.000, transport dan bensin Rp600.000, listrik/internet/kebutuhan lain Rp700.000. Dipotong otomatis tiap ganti bulan. |
| **Bunga Hutang**      | 10% dari total Hutang / bulan | Jika Kekayaan tidak cukup, bunga ditambahkan ke pokok Hutang (selama di bawah limit).                                                              |
| **Limit Hutang**      | Rp 25.000.000 total           | Batas pinjaman maksimal.                                                                                                                           |

Sisa gaji bersih per bulan hanya sekitar **Rp 1.130.000** (±20% dari gaji), sama proporsinya dengan versi sebelumnya. Biaya Hidup Wajib adalah **asumsi desain** (kisaran sumber: kos Rp1-4 juta, makan Rp1,3-2 juta, transport dan utilitas ratusan ribu) dan boleh disesuaikan.

Tiap kelipatan Rp 5.000.000 Hutang baru memberi +1 Level Stress (dibulatkan ke atas per transaksi). Pokok Hutang hanya berkurang lewat petak **[Bayar Hutang]**.

**Aturan transaksi [v1.9]** (berlaku untuk efek petak, Realita, Event Tanggal, Ajakan, Doom Spending, dan ganti bulan):

| #   | Kasus                                                 | Aturan                                                                                                                                                                                  |
| --- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Biaya lebih besar dari Kekayaan                       | Kekurangan otomatis menjadi Hutang selama sisa limit cukup. Kekayaan tidak pernah minus.                                                                                                |
| 2   | Kekurangan melewati limit Hutang                      | Hutang berhenti di Rp25.000.000 dan sisa kekurangan dihapus. Pemain tidak langsung tereliminasi, kecuali kekurangan itu terjadi saat ganti bulan atau Doom Spending (Bangkrut, 1.4).    |
| 3   | Bayar Hutang melebihi sisa Hutang                     | Hanya sisa Hutang yang dibayar. Kekayaan berkurang sebesar yang benar-benar dibayar.                                                                                                    |
| 4   | Pinjaman saat Hutang hampir penuh (Pinjol / Paylater) | Pinjaman dibatasi sisa limit. Kekayaan yang diterima sama dengan Hutang yang benar-benar bertambah.                                                                                     |
| 5   | +1 Level Stress per Rp5.000.000 Hutang baru           | Berlaku untuk **semua** kenaikan Hutang dalam satu transaksi (pinjaman, denda, kekurangan otomatis, dan bunga yang masuk pokok), dihitung ke atas: `ceil(kenaikan Hutang / 5.000.000)`. |

Contoh Multiplayer: Kekayaan Rp300.000 lalu menginjak petak dengan efek Kekayaan -Rp1.000.000 → Kekayaan Rp0, Hutang +Rp700.000, Level Stress +1.

### 2.4 Urutan Proses Saat Ganti Bulan **[v1.4]**

1. Gaji masuk (+Rp 5.730.000)
2. Biaya Hidup Wajib dipotong (-Rp 4.600.000)
3. Bunga Hutang dipotong
4. Cek Doom Spending
5. Cek Bangkrut dan Burnout

**Jadwal ganti bulan Multiplayer [v1.8]:** ganti bulan terjadi **11 kali**, di awal Langkah 3, 5, 7, ..., 23 (1 Februari sampai 1 Desember), pada Fase Kalender. Bulan Januari memakai Kekayaan awal Rp7.500.000 tanpa gaji dan tanpa Biaya Hidup Wajib. Tidak ada proses ganti bulan setelah Langkah 24: skor langsung dihitung setelah giliran terakhir, sehingga tidak ada pemain yang tereliminasi tanpa sempat bereaksi.

### 2.5 Doom Spending

Jika Level Stress **≥ 9** (saat ganti bulan atau saat menginjak petak apa pun), event "Doom Spending" terpicu: pemain kehilangan **Rp 750.000-1.500.000** (acak, salah satu dari Rp750.000, Rp1.000.000, Rp1.250.000, atau Rp1.500.000 **[v1.9]**) untuk jajan impulsif, lalu Level Stress turun 1. Event ini bisa memicu Bangkrut.

Nominal Doom Spending **sama di Solo dan Multiplayer (tidak dikali)** **[v1.8]**. Ganti bulan terjadi sama seringnya di kedua mode, dan Level Stress di Multiplayer sudah naik lebih cepat karena efek status dikali.

---

## 3. Waktu: Kalender & Musim

### 3.1 Konversi Waktu

Permainan berjalan dari **1 Januari sampai 31 Desember**.

|                     | Solo                                                                         | Multiplayer                                    |
| ------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------- |
| 1 langkah           | 1 minggu                                                                     | 2 minggu                                       |
| Pembagian bulan     | Minggu 1: tgl 1-7, Minggu 2: 8-14, Minggu 3: 15-21, Minggu 4: 22-akhir bulan | Paruh 1: tgl 1-14, Paruh 2: tgl 15-akhir bulan |
| Rumus nomor langkah | (Bulan - 1) × 4 + Minggu                                                     | (Bulan - 1) × 2 + Paruh                        |
| Contoh: 17 Agustus  | Langkah 31                                                                   | Langkah 16                                     |

### 3.2 Visual Kalender (HUD)

Layar permainan selalu menampilkan: tanggal dan bulan berjalan, nomor langkah (x/48 atau x/24), ikon musim aktif, hitung mundur Event Tanggal berikutnya (contoh: "17 Agustus - 3 langkah lagi"), **Timer Giliran dan nama pemain yang sedang jalan [v1.4]**, **Papan Skor** (hanya Skor Sementara semua pemain), dan **Panel Pribadi** (statistik detail milik sendiri) **[v1.6]** (lihat 4.6).

### 3.3 Event Tanggal

Saat langkah mencapai periode sebuah event, **popup Event Tanggal muncul ke semua pemain secara bersamaan** di awal ronde (Fase Kalender), tanpa menunggu giliran masing-masing **[v1.6]**. Tiap pemain memilih **ikut atau tidak** secara mandiri dalam **15 detik** (usulan, terpisah dari Timer Giliran). Jika waktu habis, otomatis **tidak ikut**. Keduanya punya konsekuensi. Efek langsung berlaku dan **tidak menghabiskan langkah**: setelah memilih, pemain tetap melangkah seperti biasa di gilirannya. Di Solo tidak ada batas waktu.

Nilai di bawah sudah disesuaikan ke skala gaji Jakarta (×5 dari v1.3, dibulatkan) dan **tanpa Poin Sosial [v1.4]**.

| #   | Event                                  | Tanggal          | Langkah Solo / Multi | Jika IKUT                                                                                                                            | Jika TIDAK ikut                                                          |
| --- | -------------------------------------- | ---------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| 1   | Tahun Baru                             | 1 Jan            | 1 / 1                | Kekayaan -Rp750rb, Level Stress -2                                                                                                   | Kesehatan +1 (tidur cukup)                                               |
| 2   | Lebaran & THR\*                        | Bln 3, tgl 15-21 | 11 / 6               | THR +Rp2.500.000, tapi mudik -Rp3.000.000. Level Stress -2                                                                           | THR +Rp2.500.000 tetap diterima, hemat. Level Stress +1 (rindu keluarga) |
| 3   | Libur Hari Buruh                       | 1 Mei            | 17 / 9               | Liburan: Kekayaan -Rp1.500.000, Level Stress -2, Kesehatan +1                                                                        | Ambil lembur: Kekayaan +Rp1.500.000, Kesehatan -1, Level Stress +1       |
| 4   | Kondangan Teman                        | Bln 6, tgl 15-21 | 23 / 12              | Datang: Kekayaan -Rp1.000.000 (amplop), Level Stress -1                                                                              | Level Stress +1 (tidak enak hati)                                        |
| 5   | 17 Agustus (Lomba & Kerja Bakti Warga) | 17 Agu           | 31 / 16              | Kekayaan -Rp250rb, Level Stress -1. 25% menang lomba: +Rp750rb                                                                       | Tidak ada perubahan                                                      |
| 6   | Harbolnas 11.11                        | 11 Nov           | 42 / 21              | Belanja: Kekayaan -Rp1.500.000 (atau lewat Paylater: Hutang +Rp1.500.000), Level Stress -3. 30% barang tidak sesuai: Level Stress +1 | Tidak ada perubahan                                                      |

_\*Tanggal Lebaran bergeser tiap tahun. Di game disederhanakan ke Bulan 3, tanggal 15-21. THR aslinya sebesar 1× gaji; di game dibuat lebih kecil demi keseimbangan. Nominal pada tabel adalah nilai mode Solo; Multiplayer memakai pengali di 1.3._

**Harbolnas [v1.8]:** Paylater adalah **pilihan terpisah** di popup, bukan otomatis. Popup Harbolnas berisi tiga pilihan: Belanja (Kekayaan), Belanja lewat Paylater (Hutang), dan Tidak ikut. Waktu habis tetap dihitung Tidak ikut.

### 3.4 Musim **[v1.5]**

Musim **hanya memperbesar peluang Zonk pada bagian tertentu** dan tidak punya efek lain. Tiap musim punya **Fokus Zonk** yang berbeda supaya tidak terasa seperti template:

| Musim             | Periode             | Fokus Zonk      | Bagian yang terkena | Kategori Rawan (+10 poin persen Zonk) |
| ----------------- | ------------------- | --------------- | ------------------- | ------------------------------------- |
| **Musim Hujan**   | Des, Jan, Feb       | Cuci Kendaraan  | Kekayaan            | Kerja                                 |
| **Musim Kemarau** | Jun-Agu             | Kendaraan Rusak | Kekayaan            | Keuangan, Sosial                      |
| **Pancaroba**     | Mar-Mei dan Sep-Nov | Sakit           | Kesehatan           | Kesehatan                             |

**Cara kerja:** pada petak kategori rawan, Peluang Zonk naik +10 poin persen (4.5). Jika Zonk muncul di petak tersebut, 50% kemungkinan memakai **Zonk Musim** sesuai Fokus Zonk (satu dari 3 varian di bawah), sisanya memakai varian Zonk bawaan petak.

**Imunitas Sakit:** jika **Kesehatan ≥ 8**, pemain tidak terkena Zonk Musim Sakit. Selama Pancaroba, kenaikan +10 poin persen tidak berlaku bagi pemain dengan Kesehatan ≥ 8 dan Zonk Musim Sakit tidak akan muncul untuknya. Imunitas hanya berlaku untuk Sakit, bukan untuk Zonk bawaan petak (misalnya cedera di Olahraga Pagi).

**Zonk Musim** (3 varian per musim, 9 total):

| Musim     | Fokus           | Kartu                              | Efek                                   |
| --------- | --------------- | ---------------------------------- | -------------------------------------- |
| Hujan     | Cuci Kendaraan  | Motor Kena Lumpur Banjir           | Kekayaan -Rp250rb, Level Stress +1     |
| Hujan     | Cuci Kendaraan  | Cuci dan Ganti Oli Habis Kehujanan | Kekayaan -Rp500rb                      |
| Hujan     | Cuci Kendaraan  | Bodi dan Jok Berjamur              | Kekayaan -Rp750rb, Level Stress +1     |
| Kemarau   | Kendaraan Rusak | Mesin Overheat                     | Kekayaan -Rp1.500.000, Level Stress +1 |
| Kemarau   | Kendaraan Rusak | Aki Soak                           | Kekayaan -Rp1.000.000                  |
| Kemarau   | Kendaraan Rusak | Ban Pecah di Aspal Panas           | Kekayaan -Rp750rb, Level Stress +1     |
| Pancaroba | Sakit           | Demam Pancaroba                    | Kesehatan -2, Level Stress +1          |
| Pancaroba | Sakit           | Flu dan Batuk                      | Kesehatan -2, Kekayaan -Rp250rb (obat) |
| Pancaroba | Sakit           | Meriang Seharian                   | Kesehatan -1, Level Stress +2          |

---

## 4. Mekanik Inti, Papan & Interaksi

### 4.1 Papan Heksagon & Petak sebagai Kartu **[v1.6]**

Semua pemain berjalan di **satu papan heksagon bersama**. Papan tersusun dari heksa-heksa kecil, dan **setiap heksa adalah satu petak (kartu)** yang sudah terisi sejak permainan dimulai.

**Isi papan:**

- Di awal permainan, sistem mengisi semua heksa (kecuali heksa titik awal) dengan jenis petak acak dari katalog (Bagian 5), bobot sama untuk tiap jenis. Papan 4 pemain berisi 127 - 4 = **123 petak**, jadi tiap jenis dari 12 petak biasa muncul sekitar 10 kali.
- Petak Emas tidak ada di papan awal. Ia muncul menggantikan isi satu heksa yang belum diinjak (4.7).

| Mode     | Radius | Jumlah heksa | Heksa terpakai (titik awal + langkah) | Tingkat isi akhir |
| -------- | ------ | ------------ | ------------------------------------- | ----------------- |
| 4 pemain | 6      | 127          | 4 + 96 = 100                          | ±79%              |
| 3 pemain | 5      | 91           | 3 + 72 = 75                           | ±82%              |
| 2 pemain | 4      | 61           | 2 + 48 = 50                           | ±82%              |
| Solo     | 4      | 61           | 1 + 48 = 49                           | ±80%              |

Angka belum termasuk Petak Emas yang tidak diambil (maksimal +6). Jika terasa sesak saat playtest, naikkan satu radius.

**Status heksa:**

| Status       | Keterangan                                                                                                        |
| ------------ | ----------------------------------------------------------------------------------------------------------------- |
| **Tertutup** | Belum diinjak. Detailnya hanya terlihat oleh pemain yang heksa itu **menyala** baginya di gilirannya (lihat 4.3). |
| **Terbuka**  | Sudah diinjak. Petaknya terlihat oleh semua pemain dan tidak bisa dimasuki lagi.                                  |
| **Mati**     | Heksa Mati, yaitu bekas Petak Emas yang hangus. Tertutup dan tidak bisa dimasuki.                                 |

**Titik awal:**

- **4 pemain:** di cincin radius 2 dari pusat, berselang 3 heksa di antara pemain yang bersebelahan.
- **3 pemain:** di cincin radius 2, tiap pemain berjarak 4 heksa.
- **2 pemain:** di cincin radius 2, saling berseberangan (jarak 4 heksa).
- **Solo:** di heksa pusat.

**Aturan pergerakan:**

- Pion memiliki **6 heksa bersebelahan**. Di awal Fase Pilihan, sistem **menyalakan 3 dari 6 heksa itu secara acak**. Pemain **memilih satu heksa yang menyala** lalu pindah ke sana. Heksa yang dipilih menentukan **efek (petak) sekaligus arah** gerak.
- **Hanya heksa yang bisa dimasuki yang ikut diundi**, yaitu heksa tertutup. Heksa yang sudah diinjak atau Heksa Mati tidak pernah menyala. Contoh: jika dari 6 sisi hanya 4 yang bisa dimasuki, sistem memilih 3 acak dari 4 itu. Jika yang bisa dimasuki 3 atau kurang, semuanya menyala. Jika tidak ada, berlaku Jalan Buntu.
- **Tidak ada pengambilan kartu.** Pilihan langsung berada di heksa. Sebelum memilih, pemain mengklik heksa yang menyala untuk melihat detail petak (lihat 4.3).
- Heksa yang sudah diinjak tidak bisa dimasuki lagi oleh siapa pun, termasuk pemain yang menginjaknya. Tidak ada mundur.
- **Jalan Buntu:** jika semua heksa di sekeliling pion sudah terinjak atau mati, pemain mendapat **3 pilihan heksa untuk melompat**, yaitu 3 heksa tertutup terdekat dari posisinya (jika jaraknya seri, dipilih acak di antara yang seri; jika tersedia kurang dari 3, semuanya ditampilkan). Detail ketiganya bisa dilihat dengan klik seperti biasa, dan **tidak ada pengambilan kartu**. Pemain memilih satu dan pindah ke sana, **Level Stress +1** (kena macet dan nyasar). Lompatan ini menggantikan langkah biasa pada giliran tersebut, dan petak di heksa tujuan dijalankan seperti biasa (Rencana dan Realita).
- **Tidak ada heksa tersisa:** jika tidak ada satu pun heksa tertutup yang bisa dimasuki di seluruh papan, giliran pemain itu dilewati tanpa efek. Dengan tingkat isi papan sekitar 80% kasus ini hampir tidak terjadi **[v1.9]**.
- **Strategi blocking:** pemain boleh sengaja menutup jalur lawan, terutama saat berebut Petak Emas.

### 4.2 Urutan Fase **[v1.6]**

**Di awal ronde (berlaku untuk semua pemain):**

1. **Fase Kalender:** HUD diperbarui. Di awal bulan baru, proses ganti bulan berjalan (2.4; Multiplayer di Langkah 3, 5, ..., 23) **[v1.8]**. Jika ada Event Tanggal, popup muncul ke semua pemain bersamaan (3.3). Di awal Bulan 1, 3, 5, 7, 9, dan 11, tiap pemain menerima Kartu Ajakan (4.8). Jika Petak Emas dijadwalkan muncul, ia muncul sekarang (4.7). Beban Peringkat 1 ditetapkan dari Skor Sementara terakhir (4.6).

**Di giliran tiap pemain:** 2. **Fase Pilihan:** Timer Giliran berjalan. 3 dari 6 heksa di sekeliling pion menyala secara acak. Pemain mengklik heksa yang menyala untuk melihat detail, lalu memilih satu heksa tujuan. 3. **Fase Berjalan:** pion pindah, heksa terbuka untuk semua pemain, dan efek **Rencana** diterapkan. 4. **Fase Realita:** hasil **Realita** ditentukan (4.4) dan terbuka untuk semua. Setelah itu **Skor Sementara diperbarui** (4.6).

**Di luar fase (kapan saja, Multiplayer):** Ajakan realtime (4.8) dan Saran Lisan. Ajakan tidak menghabiskan langkah siapa pun dan tidak menunggu giliran.

### 4.3 Fase Pilihan: Detail Rahasia & Giliran Bergantian **[v1.6]**

- Pemain bisa **mengklik heksa yang menyala** untuk membuka panel detail: kategori, efek **Rencana**, dan **ikon risiko** (Rendah / Sedang / Tinggi). Heksa yang tidak menyala tidak bisa dibuka dan tidak bisa dipilih. Karena heksa yang menyala diundi di awal Fase Pilihan, detail hanya bisa dibuka di giliran sendiri.
- **Detail hanya terlihat oleh pemain yang membukanya.** Bagi pemain lain, heksa itu tetap tertutup. **Satu-satunya yang bisa dilihat semua pemain adalah heksa yang sudah dipilih (diinjak).** Tidak ada kartu yang dibuang, karena sejak awal semua kartu sudah berada di heksa.
- Ikon risiko sudah memperhitungkan Beban Peringkat 1 dan Musim milik pemain yang melihatnya, sehingga risiko yang tampil adalah risiko sebenarnya.
- Pemain lain tetap bisa membaca pola lawan lewat heksa yang terbuka (misalnya lawan menginjak Beli Vitamin = kesehatannya sedang turun), tanpa tahu isi heksa lain di sekitarnya.
- Karena hanya 3 dari 6 heksa yang menyala dan diundi acak, pemain tidak selalu punya semua opsi. Heksa bagus yang tidak menyala bagimu bisa saja menyala bagi lawan di gilirannya, jadi tiap giliran menghadirkan pilihan yang berbeda.
- Pengecualian: **Petak Emas** terlihat terbuka oleh semua pemain sejak muncul (lihat 4.7).

**Timer Giliran (Multiplayer):**

- **Host** memilih di Room sebelum game dimulai: **30 detik** (Cepat, default) atau **60 detik** (Santai). Berlaku untuk semua pemain dan tidak bisa diubah saat game berjalan **[v1.7]**.
- Timer dihitung dari awal Fase Pilihan. Jika waktu habis, heksa tujuan dipilih **acak** dari 3 heksa yang menyala. Timer **dijeda** saat pemain sedang menjawab Ajakan. Event Tanggal dan Ajakan punya batas waktu sendiri (3.3 dan 4.8).
- Karena pemain berjalan bergantian, tidak ada konflik heksa. Siapa yang jalan lebih dulu di ronde itu otomatis mendapat heksa yang ia pilih.

Contoh tampilan sisi Rencana (nilai Solo):

| Petak             | Efek Terlihat                         |
| ----------------- | ------------------------------------- |
| **Lembur Proyek** | Kekayaan +Rp 2.500.000                |
| **Nongkrong**     | Kekayaan -Rp 500.000, Level Stress -2 |
| **Beli Vitamin**  | Kekayaan -Rp 250.000, Kesehatan +2    |

> "Gaji" pada petak adalah pemasukan satu kali. Gaji bulanan diatur terpisah di 2.3.

### 4.4 Fase Realita (RNG dengan Tumpukan Realita) **[v1.4]**

Sisi belakang petak kini bernama **Realita**. Setiap jenis petak punya **Tumpukan Realita** berisi **6 varian** (3 Zonk, 2 Aman, 1 Hoki), supaya pemain tidak bisa menghafal apa yang akan terjadi.

Cara kerjanya:

1. Sistem menentukan **jenis hasil** memakai peluang di 4.5 (Zonk / Aman / Hoki).
2. Sistem mengambil **satu varian acak** dari jenis tersebut di Tumpukan Realita petak itu. Tumpukan dikocok ulang setiap kali dipakai.

| Hasil    | Keterangan                                                                   |
| -------- | ---------------------------------------------------------------------------- |
| **Zonk** | Konsekuensi negatif. Ada 3 varian per petak.                                 |
| **Aman** | Tidak terjadi apa-apa tambahan (hanya teks suasana). Ada 2 varian per petak. |
| **Hoki** | Bonus kecil. Ada 1 varian per petak. Peluang tetap 10% di semua petak.       |

Hasil Realita terbuka dan terlihat semua pemain. Daftar lengkap 72 varian ada di Bagian 5.

### 4.5 Peluang Zonk

```
Peluang Zonk = Zonk Dasar Petak
             + 15 poin persen   (jika kena Beban Peringkat 1)
             + 10 poin persen   (jika kategori petak sedang rawan karena Musim;
                                 tidak berlaku di Pancaroba bagi pemain Kesehatan >= 8)
Maksimal 80%
```

Peluang Hoki tetap 10%. Sisanya menjadi Aman. Jika Zonk muncul pada petak kategori rawan, 50% kemungkinan memakai **Zonk Musim** sesuai Fokus Zonk musim itu (3.4, satu dari 3 varian dipilih acak), sisanya memakai varian Zonk bawaan petak. Musim tidak punya pengaruh lain selain menaikkan peluang Zonk ini.

### 4.6 Papan Skor, Panel Pribadi & Beban Peringkat 1 (Kompetitif) **[v1.6]**

**Papan Skor (tampil di layar, publik):**

- Selalu terlihat di layar selama permainan, di Solo maupun Multiplayer.
- Menampilkan untuk tiap pemain **hanya nama dan Skor Sementara**, diurutkan dari peringkat 1. Pemain **tidak bisa melihat** Kekayaan, Hutang, Kesehatan, atau Level Stress milik lawan.
- **Skor Sementara** = rumus skor akhir (Bagian 6) yang dihitung dari status saat ini, hanya memakai empat indikator. **Diperbarui setiap kali satu giliran selesai** (setelah Fase Realita pemain tersebut).
- Di Solo, Papan Skor menampilkan Skor Sementara pemain dan rekor terbaik sebelumnya.

**Panel Pribadi (privat):**

- Menampilkan **Kekayaan, Hutang, Kesehatan, dan Level Stress** secara detail. Hanya terlihat oleh pemiliknya.
- Akibatnya, lawan hanya bisa menebak kondisimu dari naik-turunnya Skor Sementara dan heksa yang kamu injak.

**Beban Peringkat 1:**

- Hanya di mode Multiplayer, mulai **Bulan 3** (Langkah 5), saat selisih skor sudah berarti.
- Pemain dengan **Skor Sementara tertinggi** di awal ronde mendapat tanda mahkota dan menanggung **+15 poin persen** Peluang Zonk di semua petak.
- Jika beberapa pemain seri di peringkat 1, semuanya kena beban.
- Tujuannya agar pemain yang unggul tetap berisiko dan pemain di belakang punya peluang menyusul.

### 4.7 Petak Emas (Rebutan Petak) - Khusus Multiplayer **[v1.6]**

**Petak Emas** adalah event langka (misal "Beasiswa Penuh" atau "Menang Giveaway") yang ditempatkan sistem **menggantikan isi satu heksa yang belum diinjak**.

- Muncul di awal Langkah **1, 5, 9, 13, 17, 21** (tiap 4 langkah, total 6 kali) dan terlihat oleh semua pemain beserta isinya dan posisinya di papan.
- **Hanya satu Petak Emas yang aktif dalam satu waktu. Petak Emas bertahan 4 ronde** dan hilang saat Petak Emas berikutnya muncul (atau saat permainan berakhir). Petak yang tidak diambil menjadi **Heksa Mati** (tertutup, tidak bisa dimasuki).
- Muncul di cincin luar papan (radius ≥ 4) pada posisi dengan jarak kurang lebih sama dari semua pemain.
- Pemain mengambilnya dengan **memilih heksa tersebut** saat pionnya bersebelahan, seperti heksa biasa. Karena tiap heksa hanya bisa diinjak sekali, hanya 1 pemain yang mendapatkannya, yaitu yang gilirannya lebih dulu.
- **Dilema:** 4 ronde cukup untuk mengubah rute dan benar-benar berebut, tapi pemain harus meninggalkan petak bagus di sekitarnya demi berjalan ke arah Petak Emas. Karena petak hangus saat kemunculan berikutnya tiba, FOMO tetap terjaga dan papan tetap rapi.
- Hadiah dijaga seimbang (kira-kira Rp 5.000.000-10.000.000 atau perbaikan status) supaya tidak menentukan pemenang sendirian.
- Petak Emas hanya punya Rencana, **tidak punya Realita**.

### 4.8 Ajakan (Interaksi Realtime Antar Pemain) **[v1.6]**

Khusus Multiplayer. Ajakan adalah **ajakan langsung ke pemain lain, bersifat realtime dan terbebas dari giliran maupun langkah**. Ajakan tidak memakai heksa, tidak menggerakkan pion, dan tidak menghabiskan langkah siapa pun. Pemain yang diajak tetap bisa melangkah di gilirannya sendiri, apa pun jawabannya. Nilai Ajakan di bawah sudah **nilai Multiplayer** (tidak dikali lagi).

**Kartu Ajakan:**

- Setiap pemain menerima **1 Kartu Ajakan setiap 2 bulan**, yaitu di awal Bulan 1, 3, 5, 7, 9, dan 11 (Fase Kalender). Total 6 kartu per pemain per permainan.
- **Kartu yang tidak dipakai hangus** saat kartu baru diterima, jadi pemain memegang maksimal 1 kartu.
- Tiap kartu punya dua sisi: **Rencana** (tawaran yang terlihat) dan **Realita** (motif sebenarnya, hanya diketahui pengirim).
- Motif dibagikan acak saat kartu didapat: **Tulus 50%, Komisi 25%, Jebakan 25%** (setengah ajakan tulus, setengah tidak tulus; angka usulan).

**Cara memakai (realtime):**

- Pengirim boleh memakai Kartu Ajakan **kapan saja**, tidak harus di gilirannya sendiri, dengan memilih **satu pemain lawan** sebagai target.
- Target **langsung mendapat notifikasi popup** berisi sisi **Rencana**, lalu menjawab **Ikut** atau **Tolak** dalam **10 detik**. Jika target sedang giliran jalannya, **Timer Giliran dijeda** selama ia menjawab. Jika waktu habis, dihitung **Tolak**.
- Sisi **Realita** disembunyikan sampai target menjawab. Setelah target ikut, motif terbuka **untuk target** (semua motif). Jika target menolak, motif tidak dibuka, kecuali motif Tulus yang dibuka ke semua pemain (lihat tabel di bawah) **[v1.8]**.
- **Maksimal 1 Ajakan per ronde untuk seluruh meja.** Jika dua pemain mengirim hampir bersamaan, yang tercatat lebih dulu diproses dan yang lain ditolak sistem tanpa memakai kartunya.
- Efek langsung berlaku pada pemain, tanpa lewat papan. Giliran dan langkah semua pemain tidak berubah.
- Ajakan tidak bisa ditujukan ke pemain yang sudah tereliminasi.

**Rencana Ajakan (4 jenis):**

| Rencana                  | Efek jika dijalankan pada target                     |
| ------------------------ | ---------------------------------------------------- |
| Ajak Nongkrong           | Kekayaan -Rp1.000.000, Level Stress -3               |
| Ajak Lari Pagi           | Kesehatan +2, Level Stress -2                        |
| Ajak Proyek Bareng       | Kekayaan +Rp5.000.000, Kesehatan -2                  |
| Ajak Staycation Patungan | Kekayaan -Rp2.000.000, Kesehatan +2, Level Stress -3 |

**Motif dan hasilnya:**

| Motif       | Jika target IKUT                                                                                                         | Jika target MENOLAK                                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| **Tulus**   | Efek Rencana berlaku pada target. Level Stress -1 untuk target **dan** pengirim.                                         | **Penolak kena minus: Kekayaan -Rp3.000.000** (kebalikan dari bonus Komisi, ajakan tulus ditolak). Motif Tulus dibuka ke semua. |
| **Komisi**  | Efek Rencana berlaku pada target, tapi target Level Stress +2 (merasa dimanfaatkan). **Pengirim Kekayaan +Rp3.000.000.** | Tidak terjadi apa-apa. Motif tidak dibuka.                                                                                      |
| **Jebakan** | Rencana **tidak berlaku**. Target kena Zonk: Kekayaan -Rp2.000.000, Level Stress +2.                                     | Tidak terjadi apa-apa. Motif tidak dibuka.                                                                                      |

Menolak ajakan **gratis** kecuali motifnya Tulus. Karena target tidak tahu motifnya, menolak pun berisiko: ajakan Tulus yang ditolak membuat target rugi, sedangkan menerima bisa berarti dimanfaatkan atau dijebak.

**Saran Lisan (table talk):** pemain bebas membujuk, berjanji, atau berbohong secara lisan kapan saja, termasuk saat 10 detik jawaban. Saran Lisan **tidak punya efek mekanik** dan tidak mengikat.

Ajakan tidak berlaku di mode Solo.

---

## 5. Katalog Petak Awal & Tumpukan Realita **[v1.4]**

Katalog kini berisi **14 petak**: 12 petak biasa (masing-masing punya Tumpukan Realita 6 varian) dan 2 Petak Emas. Kategori Usaha dihapus.

**Catatan [v1.6]:** 14 petak ini adalah **katalog awal (starter set) untuk playtest**, bukan jumlah final. Karena papan 4 pemain butuh 123 petak terisi, tiap jenis akan muncul sekitar 10 kali. Target pengembangan adalah **24-30 jenis petak biasa** (6-8 per kategori, sekitar 150-180 varian Realita) supaya papan lebih bervariasi (lihat Bagian 8).

Nilai di bawah adalah nilai mode Solo (×5 dari v1.3, dibulatkan; Multiplayer memakai pengali di 1.3), **kecuali Petak Emas** yang sudah bernilai Multiplayer dan tidak dikali **[v1.8]**. Angka masih usulan awal untuk playtest. Batas maksimal 3 efek per kartu agar mudah dibaca sekilas.

### 5.1 Ringkasan Rencana

| Kategori  | Petak               | Efek Rencana (Sisi Depan)                                   | Zonk Dasar |
| --------- | ------------------- | ----------------------------------------------------------- | ---------- |
| Kerja     | Lembur Proyek       | Kekayaan +Rp2.500.000                                       | 30%        |
| Kerja     | Freelance Kilat     | Kekayaan +Rp1.500.000, Kesehatan -1                         | 20%        |
| Kerja     | Dinas Luar Kota     | Kekayaan +Rp2.000.000, Level Stress +1                      | 25%        |
| Sosial    | Nongkrong           | Kekayaan -Rp500rb, Level Stress -2                          | 20%        |
| Sosial    | Ketemu Teman Lama   | Kekayaan -Rp250rb, Level Stress -1                          | 10%        |
| Sosial    | Arisan              | Kekayaan -Rp750rb, Level Stress -1                          | 25%        |
| Kesehatan | Beli Vitamin        | Kekayaan -Rp250rb, Kesehatan +2                             | 10%        |
| Kesehatan | Olahraga Pagi       | Kesehatan +1, Level Stress -1                               | 20%        |
| Kesehatan | Istirahat Penuh     | Kesehatan +2, Level Stress -1                               | 10%        |
| Keuangan  | Pinjol / Paylater   | Kekayaan +Rp5.000.000, Hutang +Rp5.000.000, Level Stress +1 | 35%        |
| Keuangan  | Bayar Hutang        | Kekayaan -Rp2.500.000, Hutang -Rp2.500.000, Level Stress -1 | 10%        |
| Keuangan  | Belanja Self-Reward | Kekayaan -Rp1.000.000, Level Stress -2                      | 30%        |
| Emas      | Beasiswa Penuh      | Kekayaan +Rp7.500.000, Level Stress -2 (nilai Multiplayer)  | -          |
| Emas      | Menang Giveaway     | Kekayaan +Rp5.000.000, Kesehatan +1 (nilai Multiplayer)     | -          |

### 5.2 Tumpukan Realita per Petak (3 Zonk, 2 Aman, 1 Hoki)

**Kerja**

_Lembur Proyek_
| Jenis | Realita |
|---|---|
| Zonk | Bos marah: Level Stress +3, Kesehatan -2 |
| Zonk | Proyek direvisi total: Level Stress +2, Kesehatan -1 |
| Zonk | Lembur tidak dihitung penuh: Kekayaan -Rp1.500.000 |
| Aman | Proyek selesai tepat waktu |
| Aman | Lembur sampai malam, tapi lancar |
| Hoki | Bos puas dan kasih bonus: Kekayaan +Rp1.000.000 |

_Freelance Kilat_
| Jenis | Realita |
|---|---|
| Zonk | Klien kabur, pemasukan batal: Kekayaan -Rp1.500.000 |
| Zonk | Revisi tanpa akhir: Level Stress +2, Kesehatan -1 |
| Zonk | Laptop error saat deadline: Kekayaan -Rp750.000 (servis) |
| Aman | Klien membayar sesuai janji |
| Aman | Brief jelas, kerjaan mulus |
| Hoki | Klien puas dan kasih tip: Kekayaan +Rp750.000 |

_Dinas Luar Kota_
| Jenis | Realita |
|---|---|
| Zonk | Macet dan masuk angin: Kesehatan -2 |
| Zonk | Uang dinas harus ditalangi dulu: Kekayaan -Rp1.000.000 |
| Zonk | Tiket delay semalaman: Level Stress +2, Kesehatan -1 |
| Aman | Perjalanan lancar |
| Aman | Hotel nyaman, tidur cukup |
| Hoki | Uang saku dinas bersisa: Kekayaan +Rp750.000 |

**Sosial**

_Nongkrong_
| Jenis | Realita |
|---|---|
| Zonk | Patungan membengkak: Kekayaan -Rp750.000 |
| Zonk | Pulang kemalaman: Kesehatan -1, Level Stress +1 |
| Zonk | Obrolan berujung debat panas: Level Stress +2 |
| Aman | Ngobrol santai, pulang cepat |
| Aman | Tempatnya ramai tapi seru |
| Hoki | Ditraktir teman: Kekayaan +Rp500.000 |

_Ketemu Teman Lama_
| Jenis | Realita |
|---|---|
| Zonk | Teman pinjam uang: Kekayaan -Rp1.000.000 |
| Zonk | Ternyata dia sekarang jualan MLM: Level Stress +2 |
| Zonk | Ketularan pilek temannya: Kesehatan -1 |
| Aman | Reuni singkat yang hangat |
| Aman | Ngopi sebentar lalu pulang |
| Hoki | Dapat tawaran proyek sampingan: Kekayaan +Rp1.000.000 |

_Arisan_
| Jenis | Realita |
|---|---|
| Zonk | Arisan bubar: Kekayaan -Rp1.500.000 |
| Zonk | Gosip panas di arisan: Level Stress +2 |
| Zonk | Iuran naik mendadak: Kekayaan -Rp500.000, Level Stress +1 |
| Aman | Iuran tertib, tidak ada drama |
| Aman | Arisan berjalan biasa saja |
| Hoki | Dapat giliran arisan: Kekayaan +Rp3.000.000 |

**Kesehatan**

_Beli Vitamin_
| Jenis | Realita |
|---|---|
| Zonk | Vitamin abal-abal: Kesehatan -1 |
| Zonk | Alergi ringan: Kesehatan -1, Level Stress +1 |
| Zonk | Salah beli, harga ternyata mahal: Kekayaan -Rp250.000 |
| Aman | Minum rutin, hasilnya belum terasa |
| Aman | Badan terasa sedikit lebih segar |
| Hoki | Diskon apotek, uang kembali: Kekayaan +Rp250.000 |

_Olahraga Pagi_
| Jenis | Realita |
|---|---|
| Zonk | Cedera ringan: Kesehatan -2 |
| Zonk | Hujan deras, olahraga batal: Level Stress +1 |
| Zonk | Polusi pagi bikin batuk: Kesehatan -1 |
| Aman | Lari lancar |
| Aman | Jalan santai keliling komplek |
| Hoki | Ketemu komunitas lari yang seru: Level Stress -1 |

_Istirahat Penuh_
| Jenis | Realita |
|---|---|
| Zonk | Tetangga renovasi: Level Stress +2 |
| Zonk | Listrik padam, kamar gerah: Kesehatan -1 |
| Zonk | Kebanyakan tidur, badan pegal: Level Stress +1 |
| Aman | Tidur nyenyak |
| Aman | Rebahan seharian |
| Hoki | Bangun dengan badan sangat segar: Kesehatan +1 |

**Keuangan**

_Pinjol / Paylater_
| Jenis | Realita |
|---|---|
| Zonk | Denda dan biaya admin: Hutang +Rp1.500.000 |
| Zonk | Penagih menelepon terus: Level Stress +3 |
| Zonk | Bunga promo ternyata dihitung harian: Hutang +Rp750.000, Level Stress +1 |
| Aman | Proses cair cepat |
| Aman | Dana cair sesuai pengajuan |
| Hoki | Biaya admin dibebaskan: Level Stress -1 |

_Bayar Hutang_
| Jenis | Realita |
|---|---|
| Zonk | Salah transfer: Kekayaan -Rp500.000 |
| Zonk | Denda keterlambatan tercatat: Hutang +Rp500.000 |
| Zonk | Aplikasi error, antre di CS: Level Stress +2 |
| Aman | Pembayaran lunas tercatat |
| Aman | Pembayaran masuk, notifikasi terkirim |
| Hoki | Cashback pelunasan: Kekayaan +Rp500.000 |

_Belanja Self-Reward_
| Jenis | Realita |
|---|---|
| Zonk | Menyesal setelah checkout: Level Stress +2 |
| Zonk | Barang rusak saat sampai: Kekayaan -Rp500.000 |
| Zonk | Ongkir dan pajak membengkak: Kekayaan -Rp750.000, Level Stress +1 |
| Aman | Barang datang sesuai harapan |
| Aman | Dipakai sekali lalu disimpan |
| Hoki | Voucher dan cashback: Kekayaan +Rp500.000 |

**Emas** (Petak Emas hanya punya Rencana, tidak punya Realita; nilai Multiplayer, tidak dikali **[v1.8]**)

| Petak           | Efek                                   |
| --------------- | -------------------------------------- |
| Beasiswa Penuh  | Kekayaan +Rp7.500.000, Level Stress -2 |
| Menang Giveaway | Kekayaan +Rp5.000.000, Kesehatan +1    |

---

## 6. Sistem Penilaian Akhir (Scoring & Rapor)

Jika pemain mencapai langkah terakhir (31 Desember), game menghitung **Skor Kesejahteraan Hidup**. Skor hanya bergantung pada empat indikator: **Kekayaan, Hutang, Kesehatan, dan Level Stress** **[v1.4]**.

### 6.1 Harta Bersih

```
Harta Bersih = Kekayaan - (Hutang × 1.5)
```

Hutang dikali 1.5 sebagai penalti "bunga tersembunyi".

### 6.2 Modifier Kesehatan & Stress (Wellness Modifier) **[v1.4]**

| Prioritas | Kondisi                                  | Efek                                         |
| --------- | ---------------------------------------- | -------------------------------------------- |
| 1         | Kesehatan 0-3 **ATAU** Level Stress 8-10 | **Penalti 50%** (Biaya Rumah Sakit & Terapi) |
| 2         | Kesehatan 8-10 **DAN** Level Stress 0-3  | **Bonus 20%** (Bonus Produktivitas)          |
| 3         | Selain itu                               | Tidak ada perubahan                          |

Hanya satu efek yang berlaku, yaitu kondisi dengan prioritas tertinggi. Penalti Sosial dihapus bersama Poin Sosial.

**Rumus skor:**

```
Skor Akhir = Harta Bersih + (|Harta Bersih| × Persentase Modifier)
```

Persentase: penalti berat = -50%, bonus = +20%, netral = 0%. Memakai nilai absolut memastikan penalti selalu memperburuk skor, juga saat Harta Bersih negatif.

#### Simulasi Skor: 3 Skenario **[v1.6]**

Angka di bawah hanya ilustrasi untuk memeriksa rumus (bukan hasil playtest).

|                                              | **Skenario 1: Hemat & Sehat**                        | **Skenario 2: Seimbang**                       | **Skenario 3: Berhutang & Burnout**                   |
| -------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------- |
| Kekayaan                                     | Rp 27.000.000                                        | Rp 12.000.000                                  | Rp 8.000.000                                          |
| Hutang                                       | Rp 0                                                 | Rp 5.000.000                                   | Rp 10.000.000                                         |
| Kesehatan                                    | 9                                                    | 6                                              | 2                                                     |
| Level Stress                                 | 2                                                    | 5                                              | 9                                                     |
| **Harta Bersih** = Kekayaan - (Hutang × 1,5) | 27.000.000 - 0 = **Rp 27.000.000**                   | 12.000.000 - 7.500.000 = **Rp 4.500.000**      | 8.000.000 - 15.000.000 = **-Rp 7.000.000**            |
| **Modifier**                                 | Kesehatan 8-10 dan Stress 0-3 → **Bonus +20%**       | Tidak masuk penalti maupun bonus → **0%**      | Kesehatan ≤ 3 dan Stress ≥ 8 → **Penalti -50%**       |
| **Skor Akhir** = HB + (\|HB\| × %)           | 27.000.000 + (27.000.000 × 0,20) = **Rp 32.400.000** | 4.500.000 + (4.500.000 × 0) = **Rp 4.500.000** | -7.000.000 + (7.000.000 × -0,50) = **-Rp 10.500.000** |
| Gelar (Solo, 6.3)                            | Suhu Finansial                                       | Warga Biasa yang Masih Napas                   | Budak Paylater                                        |

**Catatan:**

- Di Multiplayer, urutan peringkat dari simulasi ini adalah Skenario 1 > 2 > 3.
- Skenario 3 menunjukkan alasan memakai nilai absolut. Jika penalti hanya "dipotong 50%" dari angka negatif, skornya menjadi -Rp 3.500.000 (lebih baik dari Harta Bersihnya). Dengan rumus yang benar skornya turun menjadi -Rp 10.500.000.
- Skenario 3 belum tereliminasi (Kesehatan 2, bukan 0, dan Level Stress 9, bukan 10), tetapi Level Stress 9 sudah memicu Doom Spending (2.5) tiap ganti bulan.
- Skenario 2 menunjukkan bahwa pemain yang "biasa saja" tidak mendapat bonus maupun penalti, dan Kekayaan Rp 12 juta bernilai jauh lebih kecil karena Hutang dikali 1,5.

### 6.3 Penentuan Gelar (Khusus Solo) **[v1.4]** **[Ditunda, bukan MVP]**

Pengecekan berurutan dari atas, gelar pertama yang cocok yang dipakai. Hanya diberikan jika pemain menamatkan 12 bulan. Ambang uang disesuaikan ke skala baru.

| #   | Gelar                                            | Syarat                                                               |
| --- | ------------------------------------------------ | -------------------------------------------------------------------- |
| 1   | **Budak Paylater**                               | Hutang > Kekayaan                                                    |
| 2   | **Pekerja Keras Rawan Tipu**                     | Kekayaan ≥ Rp15.000.000, Kesehatan ≤ 3, Level Stress ≥ 8             |
| 3   | **Sultan Gelisah** _(pengganti Sultan Kesepian)_ | Kekayaan ≥ Rp25.000.000 dan Level Stress ≥ 7                         |
| 4   | **Si Foya-Foya**                                 | Level Stress ≤ 3 dan Hutang ≥ Rp10.000.000                           |
| 5   | **Suhu Finansial**                               | Kekayaan ≥ Rp25.000.000, Hutang = 0, Kesehatan ≥ 6, Level Stress ≤ 5 |
| 6   | **Warga Biasa yang Masih Napas**                 | Gelar bawaan                                                         |

Angka ambang adalah usulan awal untuk playtest.

### 6.4 Akhiri Permainan & Rapor Insight (Solo) **[v1.4]** **[Ditunda, bukan MVP]**

Jika pemain Solo memilih **Akhiri Permainan** atau tereliminasi lewat Sudden Death, game menampilkan **Rapor Insight** berisi:

- **Ringkasan status:** Kekayaan, Hutang, Kesehatan, dan Level Stress terakhir.
- **Tren per bulan:** grafik singkat keempat indikator sampai langkah terakhir yang dimainkan.
- **Keputusan paling berdampak:** 3 petak atau event dengan efek terbesar.
- **Pola kebiasaan:** misalnya "7 kali memilih Lembur, Kesehatan turun tiap bulan".
- **Saran:** 1-2 kalimat refleksi.

Rapor Insight **tidak** menampilkan Skor Kesejahteraan, Gelar, atau perbandingan dengan rekor, dan permainan tidak tercatat di rekor skor.

---

## 7. Glosarium & Inventaris Istilah **[v1.4]**

Total **78 istilah inti** dalam **21 kelompok**. Dari v1.6 (72 istilah) ditambah kelompok U (Room dan sesi, 6 istilah) **[v1.7]**. Istilah Solo (kelompok N dan T, serta Solo di kelompok A) tetap tercatat tetapi ditunda.

| #   | Kelompok                 | Jumlah | Isi                                                                                                                                                          |
| --- | ------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A   | Mode permainan           | 2      | Solo (48 langkah, ditunda), Multiplayer (24 langkah)                                                                                                         |
| B   | Satuan waktu             | 4      | Langkah (1-2 minggu), Bulan, Ronde, Tahun Permainan                                                                                                          |
| C   | Indikator status         | 4      | Kekayaan, Hutang, Kesehatan, Level Stress                                                                                                                    |
| D   | Parameter ekonomi        | 4      | Gaji (UMP Jakarta), Biaya Hidup Wajib, Bunga Hutang, Limit Hutang                                                                                            |
| E   | Jenis petak (= kartu)    | 5      | Kerja, Sosial, Kesehatan, Keuangan, Emas                                                                                                                     |
| F   | Bagian petak             | 3      | Rencana (info terbuka), Realita (hasil RNG), Tumpukan Realita (6 varian per petak)                                                                           |
| G   | Fase giliran             | 4      | Fase Kalender, Fase Pilihan, Fase Berjalan, Fase Realita                                                                                                     |
| H   | Hasil Realita            | 3      | Zonk, Aman, Hoki                                                                                                                                             |
| I   | Jenis kejadian           | 5      | Kejadian Petak (RNG), Event Tanggal, Event Musim, Doom Spending, Event Petak Emas                                                                            |
| J   | Musim                    | 3      | Hujan, Kemarau, Pancaroba                                                                                                                                    |
| K   | Fokus Zonk Musim         | 3      | Sakit (Pancaroba), Cuci Kendaraan (Hujan), Kendaraan Rusak (Kemarau)                                                                                         |
| L   | Kondisi kalah            | 2      | Bangkrut, Burnout Total                                                                                                                                      |
| M   | Modifier skor            | 2      | Penalti Kesehatan/Stress (-50%), Bonus Produktivitas (+20%)                                                                                                  |
| N   | Gelar (solo, ditunda)    | 6      | Budak Paylater, Pekerja Keras Rawan Tipu, Sultan Gelisah, Si Foya-Foya, Suhu Finansial, Warga Biasa yang Masih Napas                                         |
| O   | Mekanik khusus           | 8      | Pilihan Rahasia (detail heksa tertutup), Giliran Bergantian, Timer Giliran, Rebutan Petak Emas, Beban Peringkat 1, Skor Sementara, Papan Skor, Panel Pribadi |
| P   | Latar                    | 1      | Karyawan                                                                                                                                                     |
| Q   | Skor                     | 2      | Harta Bersih, Skor Kesejahteraan                                                                                                                             |
| R   | Papan                    | 4      | Heksa, Titik Awal, Jalan Buntu, Heksa Mati                                                                                                                   |
| S   | Ajakan                   | 5      | Kartu Ajakan, Saran Lisan, Motif Tulus, Motif Komisi, Motif Jebakan                                                                                          |
| T   | Akhir solo (ditunda)     | 2      | Akhiri Permainan, Rapor Insight                                                                                                                              |
| U   | Room dan sesi **[v1.7]** | 6      | Pemain Tamu, Room, Kode Room, Host, Siap, Penonton                                                                                                           |

### Jumlah Konten Awal

| Konten                                                        | Jumlah                                                                          |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Petak contoh (katalog awal / starter set, target 24-30 jenis) | 14 (3 Kerja, 3 Sosial, 3 Kesehatan, 3 Keuangan, 2 Emas)                         |
| Petak terisi di papan (4 pemain)                              | 123 (127 heksa - 4 titik awal), tiap jenis ±10 kali                             |
| Varian Realita                                                | 72 (12 petak × 6: 3 Zonk, 2 Aman, 1 Hoki)                                       |
| Kartu Ajakan                                                  | 4 Rencana × 3 Motif; tiap pemain menerima 6 kartu per permainan (1 per 2 bulan) |
| Event Tanggal                                                 | 6                                                                               |
| Zonk Musim                                                    | 9 (3 varian per musim, sesuai Fokus Zonk)                                       |
| Kemunculan Petak Emas per permainan                           | 6                                                                               |
| Gelar solo                                                    | 6                                                                               |
| Kondisi kalah                                                 | 2                                                                               |
| Heksa papan                                                   | 127 (4 pemain), 91 (3 pemain), 61 (2 pemain dan Solo)                           |

---

## 8. Usulan Pengembangan (Belum Masuk Scope v1)

**Ide dari konsep awal "Jatah" (backlog) [v1.7]:** konsep awal game ini berupa game kartu edukasi literasi keuangan untuk mahasiswa dan pekerja pemula, dimainkan solo. Ide yang belum diadopsi dan dicatat di sini:

- **Mode Kelas:** guru membuat room dengan kode, semua siswa memakai **urutan kejadian yang sama (seeded random)** sehingga perbedaan hasil murni dari keputusan, lalu hasil dibandingkan di papan peringkat kelas. Cocok setelah Solo dibuat, karena berupa "solitaire paralel dengan seed yang sama".
- **Peran:** pilihan Mahasiswa atau Pekerja Pemula dengan parameter ekonomi berbeda. Saat ini hanya ada peran Karyawan.
- **Tujuan belajar eksplisit:** menetapkan 3-4 kebiasaan yang dilatih (dana darurat, hindari paylater impulsif, bedakan kebutuhan dan keinginan) dan memastikan tiap petak melayani tujuan itu.
- **Refleksi AI:** Rapor Insight (6.4) bisa diperluas dengan ringkasan pola keputusan yang dikirim ke LLM lewat server (kunci API tidak boleh di klien), dengan nada suportif dan tidak menghakimi.
- **Prototipe kertas:** menguji 20-30 petak di kertas sebelum angka dikunci.
- **Penyimpanan hasil ke database** (misalnya Supabase atau Postgres) untuk papan perbandingan, bersama akun dan riwayat.

- **Rival Bayangan (Solo):** ghost dari rekor terbaik sebagai pengganti Beban Peringkat 1.
- **Event Tanggal tambahan:** Ramadan, Tahun Ajaran Baru, Natal, sesuai budaya pemain.
- **Tingkat kesulitan:** ubah Biaya Hidup Wajib, bunga Hutang, dan Zonk dasar (Santai / Realistis / Tanggal Tua).
- **Bulan awal acak:** supaya Musim dan Event Tanggal tidak selalu sama tiap permainan.
- **Onboarding bertahap:** Bulan 1-2 hanya menampilkan Kekayaan, Kesehatan, dan Level Stress; Hutang dimunculkan bertahap.
- **Achievement Solo:** "Tanpa Hutang Sama Sekali", "Bertahan dengan Kesehatan 1", "Datang ke Semua Event".
- **Ajakan lanjutan:** variasi Rencana Ajakan dan motif tambahan jika Ajakan terbukti seru saat playtest.
- **Perluasan katalog petak [v1.6]:** dari 12 petak biasa menjadi 24-30 jenis (6-8 per kategori) dengan 6 varian Realita tiap jenis, atau tambahkan varian nominal (misal Lembur +Rp1,5jt / +Rp2,5jt / +Rp4jt dengan Zonk dasar yang naik mengikuti nominal).

---

## 9. Room, Sesi, dan Identitas Pemain (MVP) **[v1.7]**

Bagian ini mengatur apa yang terjadi sebelum, selama, dan sesudah game Multiplayer. Hal yang bertanda _(asumsi)_ belum diputuskan dan perlu dikonfirmasi.

### 9.1 Identitas pemain: tamu

- Tidak ada akun. Saat pertama kali membuka Lobby (atau menekan Mabar tanpa sesi), muncul popup **"Masuk sebagai tamu"**: kolom **Nama** (ada batas panjang dan penyaring kata kasar) dan pilihan **Avatar**.
- Data tersimpan di perangkat (`localStorage`) bersama token sesi yang dipakai untuk masuk kembali ke room saat koneksi putus.
- Di Lobby, kartu identitas pemain memiliki tombol **Ubah nama** (membuka popup yang sama).
- Riwayat dan rekor tidak tersimpan (butuh akun, ditunda).

### 9.2 Home dan Lobby

- **Home:** tombol **Mabar**, **Spill Cara Main**, dan ikon pengaturan aktif. Tombol **Singel**, **Ajang Flexing**, dan ikon Portal/Masuk tetap tampil tetapi **tidak bisa diklik** (tanpa efek hover dan tekan, tanpa label "Segera hadir").
- **Lobby:** **Buat Room (Host)** dan kolom **Kode Room** dengan tombol **Gabung**. Kode tampil sebagai placeholder (contoh "UMR-4821"), otomatis huruf besar, dan Enter berfungsi sebagai Gabung. Ada keterangan aturan Mabar: 2-4 pemain, 24 langkah, ±30 menit.
- **Kondisi khusus Lobby:** kode salah ("Kode room tidak ketemu."), room penuh (4/4), game sudah berjalan, server bermasalah (tombol nonaktif dan "Coba lagi"), dan kartu **"Lanjutkan permainan"** jika game sebelumnya masih berjalan.
- **Pengaturan:** hanya Musik, Efek suara, dan Notifikasi Ajakan. Bagian Akun dan pilihan Aturan Mabar dihapus (timer dipindah ke Room).

### 9.3 Room (ruang tunggu)

- Pemain yang menekan **Buat Room** menjadi **Host**. Room memiliki **Kode Room** unik (contoh `UMR-4821`) yang bisa disalin atau dibagikan sebagai link.
- **4 slot pemain.** Tiap pemain memiliki **warna dan bentuk pion** berbeda (tidak hanya warna). Warna dan bentuk berpasangan tetap: **krem-lingkaran, biru es-kotak, mint-segitiga, salmon-wajik**. Saat masuk, pemain mendapat pasangan pertama yang kosong dan bisa menggantinya selama pasangan itu belum dipakai pemain lain **[v1.8]**.
- **Host mengatur Timer Giliran** (30 detik Cepat atau 60 detik Santai). **Jumlah pemain tidak diatur manual**: papan mengikuti jumlah pemain yang masuk (2 pemain radius 4, 3 pemain radius 5, 4 pemain radius 6).
- **Siap:** setiap pemain selain host menekan **Siap**.
- **Mulai** (hanya host) aktif jika ada **minimal 2 pemain** dan semua pemain selain host sudah **Siap**. Jika belum, tombol nonaktif dengan penjelasan ("Menunggu minimal 2 pemain" atau "Menunggu pemain siap").
- Host bisa **mengeluarkan** (kick) pemain.
- Saat host menekan Mulai: room **terkunci** (hanya pemain yang terputus boleh masuk kembali), hitung mundur **3-2-1** ("Papan sedang disiapkan..."), lalu pindah ke Game Board di 1 Januari, Langkah 1.
- **Host keluar sebelum game mulai:** peran host berpindah ke pemain yang masuk paling awal. Room kosong ditutup. _(asumsi)_ Room tanpa aktivitas lama (usulan 10 menit) ditutup otomatis.

### 9.4 Selama game

- **Koneksi putus:** pemain bisa masuk kembali dengan token sesi. Jika batas waktu giliran habis saat terputus, pilihan diambil **acak** sesuai aturan 4.3. _(asumsi: tidak ada bot pengganti)_
- **Tereliminasi:** muncul layar "Hari ini kamu perlu istirahat." dengan pilihan **Lihat hasil** atau **Jadi penonton** (**Penonton** tetap bisa menyaksikan sampai game selesai tanpa melihat data privat pemain lain).
- **Host keluar saat game berjalan:** game tetap lanjut, peran host tidak diperlukan lagi.
- **Pause:** di Multiplayer, pause hanya membuka menu pribadi dan **tidak menghentikan game**. _(asumsi)_

### 9.5 Akhir game

- Layar **Hasil Akhir Multiplayer:** podium dan peringkat Skor Kesejahteraan, rincian skor yang bisa dibuka (Harta Bersih dan modifier), serta tombol **Main Lagi** (kembali ke Room yang sama), **Kembali ke Lobby**, dan **Bagikan hasil** (gambar dibuat di sisi klien).
- _(asumsi)_ Main Lagi dikendalikan host dan pemain lain tetap perlu menekan Siap.

---

## 10. Ringkasan Revisi

### v1.9 (aturan transaksi dan penyelarasan dengan engine)

| #   | Keputusan                                                                                                   | Perubahan                 |
| --- | ----------------------------------------------------------------------------------------------------------- | ------------------------- |
| 1   | Kekurangan biaya otomatis menjadi Hutang, Kekayaan tidak pernah minus                                       | 2.3 (aturan transaksi #1) |
| 2   | Kekurangan yang melewati limit dihapus; Bangkrut hanya saat ganti bulan dan Doom Spending                   | 1.4, 2.3 (#2)             |
| 3   | Bayar Hutang hanya sebesar sisa Hutang                                                                      | 2.3 (#3)                  |
| 4   | Pinjaman dibatasi sisa limit                                                                                | 2.3 (#4)                  |
| 5   | +1 Level Stress per Rp5.000.000 berlaku untuk semua kenaikan Hutang, termasuk bunga dan kekurangan otomatis | 2.3 (#5)                  |
| 6   | Nominal Doom Spending kelipatan Rp250.000                                                                   | 2.5                       |
| 7   | Cara memutar urutan giliran tiap bulan                                                                      | 1.2                       |
| 8   | Giliran dilewati jika tidak ada heksa tersisa                                                               | 4.1                       |

**Belum diputuskan (dicatat agar tidak lupa):**

- Game berakhir lebih cepat jika tinggal 1 pemain yang belum tereliminasi? Engine saat ini tetap berjalan sampai Langkah 24.
- Pemain yang menekan Keluar saat game berjalan diperlakukan seperti koneksi putus? (usulan API Contract)
- Ambang ikon risiko Rendah ≤15%, Sedang 16-34%, Tinggi ≥35% (usulan API Contract, sudah dipakai engine).
- Ubah nama hanya di Lobby (usulan API Contract).

### v1.8 (keputusan ekonomi Multiplayer dan penyelarasan dengan kode)

| #   | Keputusan                                                                                                                          | Perubahan                            |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| 1   | Doom Spending tidak dikali di Multiplayer                                                                                          | 2.5 dan tabel cakupan pengali di 1.3 |
| 2   | Ganti bulan Multiplayer 11 kali (Langkah 3, 5, ..., 23), Januari memakai Kekayaan awal, tanpa proses setelah Langkah 24            | 2.4 dan 4.2                          |
| 3   | Cakupan pengali: petak biasa, Zonk Musim, dan Event Tanggal dikali; Petak Emas, Ajakan, Doom Spending, dan parameter ekonomi tidak | 1.3                                  |
| 4   | Batas ±3 berlaku per efek, bukan per kartu                                                                                         | 1.3                                  |
| 5   | Angka Petak Emas adalah nilai Multiplayer                                                                                          | Bagian 5                             |
| 6   | Paylater Harbolnas menjadi pilihan terpisah                                                                                        | 3.3                                  |
| 7   | Motif Ajakan terbuka untuk target setiap kali target ikut                                                                          | 4.8                                  |
| 8   | Peringkat seri setelah tie-breaker mendapat peringkat sama (1, 1, 3)                                                               | 1.2                                  |
| 9   | Pion: pasangan warna dan bentuk tetap                                                                                              | 9.3                                  |

Keputusan 3-9 menyelaraskan GDD dengan kode yang sudah dibuat (data konten, skor, dan kontrak API). Nilai angka lain di Bagian 2-6 tidak berubah.

### v1.7 (konsolidasi, scope MVP, Room, dan identitas tamu)

| #   | Keputusan                                                                     | Perubahan                                                    |
| --- | ----------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | Solo ditunda                                                                  | Tag **[Ditunda]** pada 1.1, 6.3, 6.4. Aturan tetap tersimpan |
| 2   | Register dan login ditunda                                                    | Hanya pemain tamu (nama dan avatar). Bagian 9.1              |
| 3   | Platform web responsif, papan 2D                                              | Catatan platform di awal dokumen                             |
| 4   | Tombol Home yang ditunda tetap tampil tanpa efek klik                         | Bagian 9.2                                                   |
| 5   | Pengganti login: popup "Masuk sebagai tamu"; tombol "Ubah nama"               | Bagian 9.1 dan 9.2                                           |
| 6   | Pilihan timer pindah dari Pengaturan ke Room, diatur host                     | 1.2, 4.3, dan 9.3                                            |
| 7   | Aturan Room (host, Siap, minimal 2 pemain, kunci room, hitung mundur)         | Bagian 9.3                                                   |
| 8   | Profil game (jumlah pemain, durasi, kompleksitas, interaksi, mekanik)         | Bagian "Profil Game"                                         |
| 9   | Ide dari konsep awal Jatah (Mode Kelas, peran, refleksi AI, prototipe kertas) | Dicatat di Bagian 8 sebagai backlog                          |
| 10  | Glosarium                                                                     | 72 menjadi 78 istilah (kelompok U: Room dan sesi)            |

Aturan inti game (Bagian 2 sampai 6) **tidak berubah** dari v1.6.

### v1.6 (Petak adalah kartu, Ajakan realtime)

| #   | Masukan / Keputusan                                                                                                     | Perubahan                                                                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Tidak perlu mengambil kartu; pilihan langsung di heksa, klik heksa untuk melihat detail, heksa menentukan arah          | **Petak = kartu.** Semua heksa sudah berisi petak sejak awal, pilihan adalah heksa yang bersebelahan, tanpa tarik kartu (Konsep Inti, 4.1, 4.2, 4.3). |
| 2   | Tidak ada kartu yang dibuang; pemain lain hanya melihat heksa yang dipilih                                              | Detail heksa tertutup hanya terlihat pemain yang membukanya. Yang terlihat semua pemain hanya heksa yang sudah diinjak (4.3).                         |
| 3   | Jalan Buntu punya 3 pilihan lompat, tanpa kartu, Level Stress +1                                                        | Pemain memilih 1 dari 3 heksa tertutup terdekat. Lompatan menggantikan langkah, Level Stress +1 (4.1).                                                |
| 4   | Petak Emas hilang saat kemunculan berikutnya tiba (bertahan 4 ronde)                                                    | Maksimal 1 Petak Emas aktif, bertahan 4 ronde, jadwal diubah ke Langkah 1, 5, 9, 13, 17, 21 (4.7).                                                    |
| 5   | Kartu Ajakan per 2 bulan, hangus jika tidak dipakai                                                                     | 1 kartu tiap 2 bulan (Bulan 1, 3, 5, 7, 9, 11), maksimal dipegang 1, hangus saat kartu baru datang (4.8).                                             |
| 6   | Ajakan realtime, terbebas dari langkah                                                                                  | Ajakan bisa dikirim kapan saja, target langsung dapat popup. Fase Ajakan dihapus (4.2, 4.8).                                                          |
| 7   | Event Tanggal popup ke semua pemain, tetap bisa melangkah                                                               | Popup serentak di awal ronde, 15 detik, tidak menghabiskan langkah (3.3).                                                                             |
| 8   | Papan skor hanya menampilkan skor sementara; statistik detail privat; skor diperbarui tiap giliran                      | Papan Skor publik hanya Skor Sementara, Panel Pribadi untuk statistik, update setiap giliran selesai (4.6).                                           |
| 9   | Simulasi untuk rumus Skor Akhir                                                                                         | 3 skenario: Hemat & Sehat, Seimbang, Berhutang & Burnout (6.2).                                                                                       |
| 10  | 14 petak di 5.1 hanya contoh?                                                                                           | Ya, itu katalog awal. Target 24-30 jenis petak (Bagian 5 dan 8).                                                                                      |
| 11  | Glosarium                                                                                                               | Tetap 72 istilah (Fase Ajakan dihapus, Panel Pribadi ditambahkan).                                                                                    |
| 12  | Pilihan gerak: 6 heksa bersebelahan, tapi hanya 3 yang menyala acak; jika yang bisa dimasuki lebih dari 3, pilih 3 acak | Aturan menyala 3 dari 6, hanya heksa yang bisa dimasuki yang ikut diundi, detail hanya bisa dibuka di giliran sendiri (4.1, 4.2, 4.3).                |

### v1.5 (Ajakan langsung, Zonk Musim berfokus)

| #   | Masukan / Keputusan                                                                 | Perubahan                                                                                                                                                                                               |
| --- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Ajakan bersifat langsung, bukan dari jalan                                          | Ajakan tidak lagi jadi pilihan ke-4 di giliran lawan. Ada Fase Ajakan: pengirim mengajak satu pemain langsung, target menjawab Ikut/Tolak dalam 10 detik, efek langsung berlaku tanpa heksa (4.2, 4.8). |
| 2   | Dibuat 50%-50%                                                                      | Motif Ajakan: Tulus 50%, tidak tulus 50% (Komisi 25%, Jebakan 25%) (4.8).                                                                                                                               |
| 3   | Kesehatan ≥ 8 tidak kena kartu zonk sakit                                           | Imunitas Sakit: bonus +10 poin persen Pancaroba tidak berlaku dan Zonk Musim Sakit tidak muncul (3.4, 4.5).                                                                                             |
| 4   | Zonk musim lebih acak, tidak template                                               | Tiap musim punya Fokus Zonk berbeda: Hujan = Cuci Kendaraan, Kemarau = Kendaraan Rusak, Pancaroba = Sakit. Tiap musim 3 varian kartu (3.4).                                                             |
| 5   | Zonk musim hanya memperbesar peluang zonk di bagian tertentu                        | Musim tidak punya efek lain selain +10 poin persen Zonk di kategori rawan dan Zonk Musim sesuai Fokus (Kekayaan atau Kesehatan) (3.4, 4.5).                                                             |
| 6   | Gaji dan biaya hidup Jakarta; Tulus ditolak kena minus; Rencana/Realita; Ajakan 8.1 | Sudah diterapkan di v1.4, tidak berubah.                                                                                                                                                                |

### v1.4 (Rencana/Realita, Ajakan, giliran bergantian, basis Jakarta)

| #   | Masukan / Keputusan                                                      | Perubahan                                                                                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Kondisi musim lewat kartu RNG: sakit, cuci kendaraan, kendaraan rusak    | Kartu Zonk Musim jadi 9 kartu (3 jenis × 3 musim). Kartu lama (Banjir Dadakan, Cuaca Tak Menentu, Tagihan Listrik) dihapus. Musim Hujan hanya rawan di Kerja (3.4).                                                                             |
| 2   | Giliran bergantian dengan timer 30 atau 60 detik (opsional)              | Pilih serentak dan konflik heksa dihapus. Timer Giliran dipilih di awal, perkiraan durasi dihitung ulang (1.3, 4.3).                                                                                                                            |
| 3   | Solo bisa mengakhiri permainan, dapat insight tanpa skor                 | Tombol Akhiri Permainan dan Rapor Insight (1.1, 6.4).                                                                                                                                                                                           |
| 4   | Poin Sosial dan Usaha tidak relevan                                      | Poin Sosial, Dukungan Teman, Kesepian, Penalti Sosial, Usaha Sampingan, petak Modal Usaha dan Pesanan Besar dihapus. Petak Sosial tetap ada tapi hanya memengaruhi Kekayaan dan Level Stress. Gelar "Sultan Kesepian" diganti "Sultan Gelisah". |
| 5   | Papan skor di layar, skor dari kekayaan, kesehatan, level stress, hutang | Papan Skor tampil terus (4.6). Skor hanya memakai empat indikator (Bagian 6).                                                                                                                                                                   |
| 6   | Gaji UMR Jakarta dan biaya hidup Jakarta                                 | Gaji Rp5.730.000 (UMP DKI 2026), Biaya Hidup Wajib Rp4.600.000. Semua nominal (petak, event, hutang, doom spending) dikali ±5 dan dibulatkan (2.3, 3.3, Bagian 5).                                                                              |
| 7   | Ajakan Tulus yang ditolak kena minus, kebalikan dari bonus Komisi        | Penolak Ajakan Tulus kena Kekayaan -Rp3.000.000 (4.8).                                                                                                                                                                                          |
| 8   | Terapkan Rencana/Realita dengan tumpukan 6 varian                        | Sisi Depan jadi Rencana, Sisi Belakang jadi Realita. 72 varian Realita ditulis (4.4, 5.2).                                                                                                                                                      |
| 9   | Terapkan Ajakan (sebelumnya kandidat v1.5)                               | Bagian 4.8 baru. Istilah baru ditambahkan di glosarium.                                                                                                                                                                                         |

### Asumsi yang perlu dikonfirmasi saat playtest

- **Penalti Tulus ditolak** dikenakan pada pihak yang **menolak** (bukan pengirim), senilai komisi (Rp3.000.000). Jika maksudnya berbeda, cukup ubah baris Tulus di 4.8.
- **Motif dibagikan acak** bersama kartu (Tulus 50%, Komisi 25%, Jebakan 25%), bukan dipilih pengirim. Tafsiran "50%-50%": setengah tulus, setengah tidak tulus.
- **Mekanisme Tumpukan Realita:** jenis hasil tetap ditentukan dulu lewat peluang Zonk, lalu varian diambil acak. Dengan begitu rumus Beban Peringkat 1 dan Musim tetap berlaku.
- **Biaya Hidup Rp4.600.000, nilai ×5, ambang gelar, dan angka Ajakan** adalah usulan awal.
- Estimasi durasi Multiplayer (1.3) belum diuji. Timer 60 detik melewati target 30 menit untuk 4 pemain.
- **Ajakan realtime (v1.6):** pengirim bisa mengajak kapan saja, efek Rencana hanya berlaku pada target (pengirim untung lewat motif), batas 10 detik jawaban adalah usulan, dan Timer Giliran dijeda saat target yang sedang giliran menjawab.
- **Imunitas Sakit (v1.5):** hanya menghapus bonus +10 poin persen dan Zonk Musim Sakit. Zonk bawaan petak yang mengurangi Kesehatan tetap bisa terjadi.
- **Heksa menyala (v1.6):** 3 heksa diundi di awal Fase Pilihan tiap pemain, jadi detail hanya bisa dibuka di giliran sendiri (tidak bisa mengintip saat menunggu). Jika Timer habis, heksa dipilih acak dari 3 yang menyala. Bobot undian sama untuk semua heksa yang bisa dimasuki.
- **Jalan Buntu (v1.6):** lompatan menggantikan langkah biasa (menghabiskan langkah) dan petak tujuan dijalankan. Sebelumnya tertulis "tidak menghabiskan langkah"; ubah jika maksudnya berbeda.
- **Jadwal Petak Emas (v1.6):** diubah ke Langkah 1, 5, 9, 13, 17, 21 supaya tiap Petak Emas benar-benar bertahan 4 ronde. Jadwal lama (3, 7, ..., 23) membuat Petak Emas terakhir hanya sempat 2 ronde. Petak Emas di cincin luar mungkin sulit dijangkau semua pemain dalam 4 ronde; perlu dicek saat playtest.
- **Isi papan (v1.6):** diisi acak dengan bobot sama per jenis petak. Aturan agar jenis tidak menumpuk di satu area belum dibuat.
- **Event Tanggal (v1.6):** batas 15 detik adalah usulan.
- **Simulasi skor (6.2):** angka skenario adalah ilustrasi, bukan hasil playtest.

### v1.3

Papan heksagon bersama, titik awal, aturan heksa sekali pakai, Jalan Buntu dan Heksa Mati, mode Multiplayer 24 langkah untuk target 30 menit, Petak Emas, pergerakan memilih 1 dari hingga 3 kartu.

### v1.2

Kartu pilihan rahasia, Poin Sosial, penamaan Kekayaan/Hutang/Kesehatan/Level Stress, latar Karyawan dan Usaha Sampingan, Beban Peringkat 1, kalender dan Event Tanggal, Musim, katalog 16 petak, tiga hasil RNG, dan glosarium.

### v1.1

Biaya Hidup Wajib, bunga dan limit Hutang, perbaikan syarat Burnout, nominal Doom Spending, rumus skor berbasis nilai absolut, aturan Petak Emas, dan prioritas gelar solo.
