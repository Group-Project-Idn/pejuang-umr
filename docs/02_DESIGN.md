---
name: "Pejuang UMR: Jakarta Survival"
description: "Design system untuk web app game Pejuang UMR (simulasi kehidupan di papan heksagon), responsif, untuk karyawan 22-27 tahun di Jakarta. Arah visual aktual: ilustrasi komik bertema kantor/HRD (map kuning, sticky note, stempel, latar kubikel) dengan palet kuning, hijau, koral, dan navy. Realita pahit yang dibungkus hangat."
colors:
  primary: "#F5C542"
  on-primary: "#3C2F09"
  primary-container: "#FBE6B1"
  on-primary-container: "#3C2F09"
  secondary: "#3FB871"
  on-secondary: "#092010"
  secondary-container: "#86DA99"
  on-secondary-container: "#092010"
  tertiary: "#E0614A"
  on-tertiary: "#390803"
  tertiary-container: "#F4B7AE"
  tertiary-soft: "#FAE2DC"
  tertiary-dark: "#7C2A19"
  progress-stress-pink: "#D6527F"
  progress-bahaya: "#D9381E"
  on-tertiary-container: "#390803"
  neutral: "#243040"
  surface: "#0A1422"
  surface-container: "#17202F"
  surface-container-high: "#212B39"
  outline: "#555F6F"
  on-surface: "#D9E3F7"
  on-surface-variant: "#CFC5B0"
  on-surface-muted: "#85837C"
  inverted: "#D9E3F7"
  on-inverted: "#131C2A"
  paper: "#F5D56B"
  paper-card: "#EBC25A"
  ink: "#3B2A12"
  button-green: "#8BD450"
  button-green-ink: "#2D5A12"
  button-blue: "#7FB0F5"
  button-blue-ink: "#1F3F73"
  button-orange: "#F5A623"
  stamp-red: "#C0392B"
typography:
  display-lg:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 48px
    fontWeight: 800
    lineHeight: 1.1
  headline-md:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.2
  title-md:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.3
  body-md:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  label-md:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.3
rounded:
  sm: 8px
  md: 16px
  lg: 24px
  full: 9999px
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
components:
  button-primary:
    backgroundColor: "{colors.primary-container}"
    textColor: "{colors.on-primary-container}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "{spacing.sm}"
  button-accent:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
  button-secondary:
    backgroundColor: "{colors.surface-container-high}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "{spacing.sm}"
  button-inverted:
    backgroundColor: "{colors.inverted}"
    textColor: "{colors.on-inverted}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "{spacing.sm}"
  button-outlined:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "{spacing.sm}"
  search-bar:
    backgroundColor: "{colors.surface-container-high}"
    textColor: "{colors.on-surface-variant}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
  nav-pill:
    backgroundColor: "{colors.surface-container-high}"
    rounded: "{rounded.full}"
    padding: "{spacing.xs}"
  nav-item-active:
    backgroundColor: "{colors.primary-container}"
    textColor: "{colors.on-primary-container}"
    rounded: "{rounded.full}"
  card:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  bottom-sheet:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  chip:
    backgroundColor: "{colors.surface-container-high}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xs}"
  progress-track:
    backgroundColor: "{colors.surface-container-high}"
    rounded: "{rounded.full}"
  progress-kekayaan:
    backgroundColor: "{colors.primary-container}"
    rounded: "{rounded.full}"
  progress-kesehatan:
    backgroundColor: "{colors.secondary-container}"
    rounded: "{rounded.full}"
  progress-stress:
    backgroundColor: "{colors.progress-stress-pink}"
    rounded: "{rounded.full}"
  progress-bahaya:
    backgroundColor: "{colors.progress-bahaya}"
    rounded: "{rounded.full}"
  badge-hutang:
    backgroundColor: "{colors.tertiary-dark}"
    textColor: "{colors.tertiary-soft}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "{spacing.xs}"
  hex-tile-closed:
    backgroundColor: "{colors.neutral}"
  hex-tile-lit:
    backgroundColor: "{colors.primary}"
  hex-tile-open:
    backgroundColor: "{colors.surface-container-high}"
---

# Pejuang UMR: Jakarta Survival: Design System

## Arah Visual Aktual **[v1.7]**

Halaman yang sudah dibuat (Home, Lobby, Room, Game Board, Detail Heksa) memakai ilustrasi komik bertema kantor/HRD. Arah ini menggantikan gaya "bento flat" sebagai tampilan utama. Palet dasar (kuning, hijau, koral, navy) tetap dipakai.

- **Tema:** pemain adalah karyawan. Layar diibaratkan berkas HRD: kartu berbentuk **map kuning** (manila folder), **sticky note**, **klip kertas**, dan **stempel "CONFIDENTIAL"** berwarna merah. Latar berupa **kubikel kantor** yang berantakan (tumpukan kertas, kopi, lampu meja). Beberapa layar memakai bingkai "jendela browser".
- **Garis dan bentuk:** kontur tebal berwarna cokelat tua (`ink`), sudut membulat, bayangan kecil di bawah tombol.
- **Tombol:** hijau (aksi utama seperti Buat Room, Mulai, Pilih Heksa Ini), biru (aksi sekunder seperti Gabung, Lihat Profil), oranye (navigasi seperti Kembali), outlined untuk aksi ringan (Cara Main).
- **HUD Game Board:** kartu kertas kuning ("Kartu Status Pribadi", "Papan Skor"), papan heksa 3D bergaya maket low-poly di atas meja kerja (GDD v1.10), karakter sprite sebagai pion (karakter = avatar pilihan pemain, juga tampil di Papan Skor), label "Jalan" pada pemain yang sedang giliran (GDD v1.12), tanda mahkota untuk peringkat 1, dan catatan "Kamus Petak" sebagai legenda ikon kategori.
- **Bahasa visual kantor di teks:** "Absen Masuk", "SOP & Pengaturan Hidup", "Ruang Rapat", "Portal Pejuang UMR - HRD System", "Kartu Identitas Pemain".
- **Tetap berlaku:** warna mengikuti arti (kuning = uang, hijau = sehat, koral = stres/hutang), ikon atau bentuk selalu menyertai warna, kontras teks, dan semua teks berbahasa Indonesia.
- **Catatan implementasi:** gambar utuh dari generator tidak bisa menjadi UI yang responsif. Untuk game, pakai gambar hanya sebagai **latar**, dan bangun kartu, tombol, serta teks sebagai komponen UI sungguhan. Minta aset terpisah (sprite heksa per kondisi, ikon kategori, karakter, latar meja).
- Token `paper`, `paper-card`, `ink`, dan `button-*` di atas adalah perkiraan dari gambar yang sudah dibuat dan bisa disesuaikan.

## Overview

**Persona.** Karyawan usia 22-27 tahun (lahir sekitar 1999-2004) yang tinggal di Jakarta dengan gaji setara UMR. Mereka Gen Z (sebagian di batas atas zillennial), dan aman juga untuk milenial muda. Kebiasaan: terbiasa scan cepat, bermain sambil commute (KRL, TransJakarta, ojol), sebagian besar di Android (kadang juga di laptop kantor), dan akrab dengan humor getir ("tanggal tua", "gaji numpang lewat", paylater, burnout). Mereka tidak suka digurui, ditakut-takuti, atau diberi desain yang kekanak-kanakan.

**Konsep visual:** _"realita pahit yang dibungkus hangat"_. Suasana malam sepulang kerja (dark navy), aksen hangat, bentuk membulat, dan terasa seperti diorama kota kecil di atas meja.

**Nada:** jenaka dan berempati, bukan menghakimi.

## Colors

| Peran         | Warna                | Dipakai untuk                                            |
| ------------- | -------------------- | -------------------------------------------------------- |
| **Primary**   | Kuning #F5C542       | Aksi utama, **Kekayaan**, Petak Emas                     |
| **Secondary** | Hijau #3FB871        | **Kesehatan**, hasil **Hoki**, status berhasil           |
| **Tertiary**  | Merah-oranye #E0614A | **Hutang**, hasil **Zonk**, peringatan, dan indikator yang masuk zona bahaya (Level Stress ≥ 8, Kesehatan < 4) |
| **Neutral**   | Navy #243040         | Latar, kartu, teks sekunder, heksa tertutup              |

Token turunan (surface, container, on-surface, outline) diambil dari skala tonal pada papan style guide.

**Aturan penggunaan:**

1. **Dark mode sebagai default.** Light mode ditunda ke versi berikutnya, tapi token dipisah supaya mudah ditambah.
2. **Warna mengikuti arti.** Satu warna selalu punya satu makna di seluruh game: kuning = uang/hadiah, hijau = sehat/untung, merah = bahaya/rugi. Tiga progress bar (kuning, hijau, pink) dipakai untuk Kekayaan, Kesehatan, dan Level Stress. **Warna indikator [v1.14]:** bar tetap memakai warna identitasnya selama aman. **Level Stress berubah merah mulai 8 ke atas** (bar penuh, disertai ikon peringatan), dan **Kesehatan merah di bawah 4** (juga dengan ikon peringatan). Merah tidak dipakai untuk bar di luar ambang itu, sehingga "merah = bahaya" tetap satu makna. **Token bar [v1.14]:** `progress-stress` = pink #D6527F (menggantikan #FAE2DC yang hanya 1,01:1 terhadap kertas kuning), `progress-bahaya` = merah-oranye #D9381E untuk Level Stress 8-10 dan Kesehatan 0-3 (di luar itu: pink dan hijau). Kontras terhitung: pink 3,2:1 terhadap kartu #F9E8AD dan 3,5:1 terhadap trek #FFF3BF (minimal 3:1 untuk bar); teks #3B2A12 12,3:1 terhadap trek (minimal 4,5:1). Teks HUD minimal 12px.
3. **Hutang** tidak memakai bar. Tampilkan sebagai angka dengan badge minus dalam merah tua, supaya tidak tertukar dengan Level Stress.
4. **Warna kategori petak** mengikuti indikator yang paling dipengaruhi: Keuangan kuning, Kesehatan hijau, Sosial salmon, Kerja biru-abu (netral), Emas kuning dengan glow.
5. **Musim** memakai nada dari palet yang sama, tanpa warna baru: Hujan biru-abu dingin, Kemarau amber hangat, Pancaroba hijau-abu pucat.
6. **Pion pemain (GDD v1.12):** pion adalah karakter (avatar) yang dipilih pemain, unik dalam satu room. Pasangan warna dan bentuk pion lama tidak dipakai lagi. Karakter dibedakan lewat siluet dan pakaian, bukan hanya warna, dan karakter yang sama tampil di Papan Skor.
7. **Heksa Mati dihapus (GDD v1.12).** Petak Emas yang tidak diambil kembali tampil sebagai heksa tertutup biasa.
8. **Latar bertingkat:** permukaan paling gelap untuk latar, makin terang untuk kartu dan panel. Di dark mode, kedalaman dibuat dengan perbedaan terang-gelap, bukan bayangan.
9. **Jangan hanya mengandalkan warna.** Merah dan hijau mudah tertukar bagi buta warna, jadi selalu tambahkan ikon dan bentuk.
10. **Kontras:** teks minimal 4.5:1 dan ikon/elemen UI minimal 3:1. Teks di atas tombol kuning memakai cokelat tua.

## Typography

Font: **Plus Jakarta Sans** untuk semua peran.

| Peran    | Ukuran (mobile) | Bobot     | Dipakai untuk                |
| -------- | --------------- | --------- | ---------------------------- |
| Display  | 40-56           | ExtraBold | Skor akhir, Gelar            |
| Headline | 24-32           | Bold      | Judul screen dan popup       |
| Title    | 18-20           | SemiBold  | Judul kartu dan panel        |
| Body     | 14-16           | Regular   | Penjelasan dan Rencana petak |
| Label    | 12-13           | Medium    | Tombol, chip, indikator      |

- Skala dasar 16px, rasio sekitar 1,2. Hanya pakai 3-4 bobot.
- **Angka uang dan skor harus rata** (tabular figures). Cek apakah font mendukungnya, kalau tidak pasangkan font angka khusus.
- **Format Rupiah:** di HUD ringkas (Rp5,7jt), di detail lengkap (Rp5.730.000) dengan titik ribuan.
- Teks Bahasa Indonesia cenderung panjang, jadi sisakan ruang tambahan sekitar 30% di tombol dan kartu.
- Hindari huruf kapital semua kecuali label sangat pendek.
- Token tipografi di atas memakai nilai tengah dari rentang tabel. Nilai line-height adalah nilai standar dan bisa disesuaikan.

## Layout

- **Grid 4px:** jarak 4/8/12/16/24/32/48.
- **Web app responsif, fokus utama desktop (GDD v1.12).** Layout tetap diusahakan nyaman di HP portrait dan tablet. Area sentuh minimal 44-48px, aksi utama di mobile ada di bagian bawah layar (jangkauan jempol), dan hormati safe area.

| Breakpoint | Lebar          | Penyesuaian layout                                                                                                                                                                                                                                                                                                    |
| ---------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mobile     | di bawah 640px | Satu kolom. Navigasi bawah (pill). HUD ringkas di atas. Popup detail heksa (dengan tombol Pilih) dan Ajakan berupa bottom sheet.                                                                                                                                                                                      |
| Tablet     | 640-1023px     | Satu kolom lebar atau dua kolom sederhana. Navigasi bawah atau samping. Panel samping bisa dibuka-tutup.                                                                                                                                                                                                              |
| Desktop    | 1024px ke atas | Navigasi di bar atas. Game Board: sidebar kiri (statistik pribadi), sidebar kanan (Papan Skor dan kalender), papan di tengah, bar aksi di bawah tengah. Popup detail heksa (dengan tombol Pilih) dan Ajakan berupa panel samping atau modal di tengah (lebar sekitar 480px). Konten non-game dibatasi lebar maksimum. |

- Layar HP landscape boleh dipakai: papan memenuhi layar dan panel menjadi overlay samping.
- Input yang didukung: sentuh, mouse, dan keyboard untuk elemen DOM (urutan fokus jelas, ring fokus terlihat, Esc menutup modal). **Tidak ada hover di papan (GDD v1.12):** detail heksa hanya dibuka dengan klik atau ketuk. Hover pada tombol DOM boleh sebagai efek visual saja, tidak pernah menjadi satu-satunya cara melihat informasi.
- Satu tombol Primary per layar.
- HUD dan teks dibuat dengan DOM (bukan di dalam WebGL), papan permainan 3D berada di belakangnya.

## Elevation & Depth

Kedalaman dibuat dengan **tingkat terang-gelap permukaan**, bukan bayangan: surface (#0A1422) paling gelap untuk latar, surface-container (#17202F) untuk kartu dan panel, surface-container-high (#212B39) untuk elemen di atas kartu (search bar, navigasi, chip, track progress). Garis tepi tipis 1px dari neutral memisahkan kartu.

## Shapes

- **Radius besar** bergaya bento: 8 (chip), 16 (kartu), 24 (panel dan bottom sheet), pill penuh (tombol dan navigasi).
- **Ikon:** grid 24px, garis 1,75-2px dengan ujung membulat, outline untuk biasa dan solid untuk aktif.
- **Ilustrasi:** flat dengan sedikit tekstur grain, karakter siluet tanpa wajah agar inklusif.
- **Sentuhan lokal Jakarta:** KRL, warteg, kos-kosan, ojol, kopi susu, struk minimarket, notifikasi paylater. **Jangan memakai logo merek asli.**
- **Papan 3D:** gaya maket low-poly seperti mainan, material matte, cahaya hangat, dan heksa yang terlihat tebal.
- **Aturan papan 3D (GDD v1.12):** tidak ada papan cadangan. Jika WebGL tidak tersedia, tampilkan pemberitahuan bahwa perangkat belum didukung. Mode hemat, pemilihan heksa dengan keyboard, dan label pembaca layar ditunda (bukan prioritas MVP). Keadaan heksa (tertutup, menyala, terbuka, Petak Emas) dibedakan dengan bentuk atau ikon, tidak hanya warna. Heksa tertutup tampil gelap; heksa menyala menampilkan ikon kategori di permukaannya (detail Rencana hanya di popup). Gambar desain datar yang sudah ada dipakai sebagai acuan warna dan HUD, bukan sudut kamera.

## Components

- **Tombol:** Primary (kuning terisi), Secondary (gelap tonal), Inverted (biru muda terisi, untuk aksi kontras seperti "Ajak"), Outlined (aksi sekunder, garis tepi outline). Setiap tombol punya state default, hover, pressed, focus, disabled, dan loading.
- **Navigasi bawah (pill):** Home, Lobby, Profil/Pengaturan. Item aktif berupa lingkaran kuning muda. Di desktop menjadi navigasi di bar atas dengan item yang sama.
- **Search bar:** untuk Glosarium dan cari room.
- **Tombol ikon bulat:** emote, Ajakan, kamera. Tidak ada tombol pause (GDD v1.12).
- **Komponen khusus game (tambahan v1.7):** popup "Masuk sebagai tamu" (nama dan pilihan avatar), kartu identitas pemain dengan tombol "Edit Profile" (GDD v1.12), slot pemain Room (kartu ID dengan karakter, status Siap, dan label HOST), dan tombol nonaktif tanpa efek klik untuk fitur yang ditunda.
- **Komponen khusus game:**
  - Heksa dengan 4 state: tertutup (gelap), menyala (kuning dengan glow dan ikon kategori; detail Rencana hanya di popup), terbuka (permukaan terang dengan ikon kategori; sisi Rencana sampai Fase Pembalikan, lalu sisi Realita), Petak Emas.
  - Pion karakter, mahkota Peringkat 1, dan label "Jalan" pada pemain yang sedang giliran.
  - Popup Detail Heksa dengan tombol Pilih (bottom sheet di mobile, panel samping kanan di desktop). Klik heksa menyala lain langsung mengganti isinya. Heksa terbuka juga bisa diklik semua pemain untuk melihat detailnya, tanpa tombol Pilih.
  - Popup Ganti Bulan: rincian Gaji, Biaya Hidup, Bunga, Kekayaan baru, dan slider Bayar Hutang dengan batas waktu.
  - Animasi Fase Pembalikan (heksa dibalik satu per satu sesuai urutan giliran).
  - Kartu Refleksi AI di Layar Eliminasi dan Hasil Akhir.
  - Indikator risiko Rendah/Sedang/Tinggi, dibedakan lewat jumlah garis atau bentuk ikon (bukan hanya warna).
  - Kartu Ajakan.
  - Popup Event Tanggal.
  - Timer berbentuk cincin.
  - Baris Papan Skor.
  - Banner pengumuman dan tooltip istilah.

## Motion

- **Prinsip:** gerak menjelaskan sebab-akibat. Angka yang berubah harus terlihat bergerak dari sumbernya ke indikator.
- **Durasi:** UI biasa 150-250 ms, momen utama (heksa terbalik, reveal Realita) 400-800 ms.
- **Easing:** ease-out saat masuk, ease-in saat keluar, dan spring ringan untuk pion.
- **Batas total animasi per giliran 3-4 detik**, dengan tap-to-skip. Tombol Percepat (2x/3x/5x) dihapus; yang dipertahankan hanya tombol X dan tap-to-skip **[v1.14]**. Fase Pembalikan sekitar 2-3 detik per pemain di akhir ronde (GDD v1.12). Animasinya: semua heksa yang pernah terinjak berputar bergelombang dari heksa ronde itu, heksa ronde itu berakhir di sisi Realita, dan Petak Emas berkilau beranimasi (GDD 4.2 v1.14).
- Di desktop, tombol DOM boleh punya state hover (naik sedikit atau glow) dan tooltip istilah boleh muncul saat hover. Heksa di papan tidak memakai hover (GDD v1.12). Di mobile, tooltip muncul dengan tekan lama.
- Opsi **kurangi gerakan** ditunda bersama mode hemat (GDD v1.12). Efek musim (hujan, heat haze) hanya dekoratif dan bisa dimatikan.
- **Popup serentak awal ronde (GDD 4.2 v1.14):** semua popup (Ganti Bulan, Event Tanggal, notifikasi musim, Petak Emas, Beban Peringkat 1) tampil bersamaan dalam satu grid dengan satu cincin hitung mundur bersama. Popup yang butuh keputusan memakai tag "Butuh keputusanmu!" dan tanpa tombol X. Popup informasi punya tombol X yang hanya menutup di layar sendiri. Hanya informasi 8 detik, ada keputusan 15 detik. Kartu hasil pribadi di akhir ronde memakai aturan yang sama (8 detik, ada X).
- **Transisi antar screen:** wipe berbentuk heksagon (iris). Ganti bulan memakai halaman kalender yang terbalik.

## Microcopy

- Bahasa Indonesia santai, sapaan **"kamu"**, kalimat pendek, kata kerja aktif, dan sedikit slang saja. Emoji hemat dan hanya di momen emote.
- Istilah selalu sama dengan glosarium (Kekayaan, bukan Saldo).
- Humor menertawakan **situasi**, bukan orangnya.
- **Topik sensitif:** pinjol, hutang, burnout, dan kesehatan mental jangan dijadikan bahan olok-olok. Tambahkan catatan bahwa ini simulasi tanpa uang sungguhan.

| Momen         | Teks                                                      |
| ------------- | --------------------------------------------------------- |
| Ganti bulan   | "Gajian masuk. Tagihan juga."                             |
| Zonk          | "Realita datang tanpa permisi."                           |
| Hoki          | "Sekali-sekali, semesta baik."                            |
| Doom Spending | "Checkout dulu, nyesel belakangan."                       |
| Bangkrut      | "Saldo habis, tanggal masih tua."                         |
| Sudden Death  | "Hari ini kamu perlu istirahat." (netral, bukan mengejek) |

## Accessibility

- Jangan hanya mengandalkan warna (selalu ada ikon atau bentuk).
- Teks bisa diperbesar, dan ada opsi mode buta warna.
- Getar (haptics) bisa dimatikan.
- Elemen interaktif punya label untuk pembaca layar.
- Semua aksi game bisa dilakukan dengan keyboard di desktop (Tab untuk berpindah, Enter untuk memilih, Esc untuk menutup), dengan ring fokus yang jelas.

## Do's and Don'ts

**Do**

- Pakai satu warna untuk satu makna (kuning = uang, hijau = sehat, merah = bahaya).
- Satu tombol Primary per layar, aksi utama di bagian bawah.
- Tambahkan ikon atau bentuk di samping setiap warna status.
- Pakai bahasa kamu yang santai dan empatik.

**Don't**

- Jangan menampilkan Hutang sebagai progress bar.
- Jangan memakai logo merek asli.
- Jangan memakai bayangan tebal di dark mode, pakai tingkat permukaan.
- Jangan menjadikan hutang, pinjol, burnout, atau kesehatan mental sebagai bahan olok-olok.
- Jangan memakai huruf kapital semua untuk kalimat panjang.

## Catatan Implementasi

- Dua lapis token: nama mentah (kuning-500) dan nama makna (indikator-kekayaan, permukaan, teks-utama). Kode hanya memakai nama makna.
- Di Figma pakai Variables. Di kode ekspor ke CSS variables atau konfigurasi Tailwind.
- Format file ini adalah DESIGN.md (YAML token di atas, penjelasan di bawah). Validasi dengan `npx @google/design.md lint DESIGN.md`.
