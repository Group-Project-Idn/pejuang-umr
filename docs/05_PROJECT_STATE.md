# Pejuang UMR: Jakarta Survival - Ringkasan Konteks (Project State)

Dokumen serah terima dari percakapan sebelumnya. Baca ini dulu, lalu dokumen lain di project knowledge. Terakhir diperbarui: Oktober 2026.

## 1. Produk dalam satu paragraf

Pejuang UMR: Jakarta Survival adalah **web app game multiplayer berbasis giliran** di papan heksagon bersama (2D). Pemain adalah karyawan bergaji UMP Jakarta yang harus bertahan 12 bulan (1 Januari sampai 31 Desember) dengan menyeimbangkan **Kekayaan, Hutang, Kesehatan, dan Level Stress**. Setiap heksa adalah satu kartu (petak) tertutup. Tiap giliran, 3 dari 6 heksa di sekeliling pion menyala. Pemain membuka detail (**Rencana**), memilih satu, lalu heksa dibalik dan hasil **Realita** (Zonk, Aman, Hoki) terungkap. Ada kalender dengan Event Tanggal (Lebaran, 17 Agustus, Harbolnas, dan lainnya), musim (Hujan, Kemarau, Pancaroba), Petak Emas yang diperebutkan, dan Ajakan antar pemain. Target pemain: usia 22-27 tahun di Jakarta. Mode utama: Multiplayer 2-4 pemain, 24 langkah, sekitar 30 menit.

## 2. Dokumen di project ini

| File                                         | Isi                                                                |
| -------------------------------------------- | ------------------------------------------------------------------ |
| 00_PROJECT_INSTRUCTIONS.md                   | Teks untuk kolom "Project instructions"                            |
| 01_GDD_Pejuang_UMR_v1_9.md                   | GDD terkonsolidasi: aturan game, scope MVP, Room dan sesi, backlog |
| 02_DESIGN.md                                 | Design system dan arah visual (format DESIGN.md)                   |
| 03_REKOMENDASI_Stack_Struktur_dan_Kontrak.md | Stack, monorepo, REST, event Socket.IO, kontrak, privasi data      |
| 04_UI_Screens_dan_Prompts.md                 | Status layar, prompt gambar, daftar teks yang harus persis         |
| 05_PROJECT_STATE.md                          | Dokumen ini                                                        |

## 3. Riwayat konsep (untuk konteks)

- **Konsep awal "Jatah"** (chat lain): game kartu edukasi literasi keuangan untuk mahasiswa dan pekerja pemula, dimainkan solo, peran Mahasiswa atau Pekerja, refleksi AI di akhir, **Mode Kelas** dengan seed acak sama, penyimpanan hasil ke database. Peta heksa diusulkan agar lebih seperti board game. Ide yang belum diadopsi ada di GDD Bagian 8.
- **Sekarang:** berkembang menjadi Pejuang UMR, game multiplayer bergiliran di papan bersama dengan Rencana dan Realita. Nama berubah dari "JATAH - Kartu Realita" menjadi "Pejuang UMR: Jakarta Survival". Istilah "Realita" dan "Rencana" tetap dipakai sebagai mekanik (sisi belakang dan depan petak).
- Versi GDD: v1.1 sampai v1.6 dikembangkan bertahap, v1.7 mengonsolidasikan semuanya dan menambahkan scope MVP.
- GDD v1.8: Doom Spending tidak dikali, ganti bulan Multiplayer 11 kali (Langkah 3, 5, ..., 23), cakupan pengali Multiplayer.
- GDD v1.9: aturan transaksi ekonomi (kekurangan biaya menjadi Hutang, batas limit, Bayar Hutang, pinjaman, Level Stress dari Hutang), nominal Doom kelipatan Rp250.000.

## 4. Keputusan kunci

**Scope MVP**

- Hanya **Multiplayer (2-4 pemain)** dan **pemain tamu**. **Mode Solo, register, dan login ditunda.** Solo, Gelar, Rapor Insight, dan rekor tetap tercatat di GDD tetapi bertanda ditunda.
- Tanpa MongoDB dan Redis di MVP (state room di memori server).
- Ajakan tetap bagian dari aturan, boleh dikerjakan paling akhir.

**Aturan inti (detail di GDD)**

- Petak = kartu. Semua heksa terisi sejak awal. Detail heksa hanya terlihat pemain yang melihatnya di gilirannya. Yang terlihat semua pemain hanya heksa yang sudah diinjak. Heksa hanya bisa diinjak sekali.
- Pilihan gerak: 3 dari 6 heksa bersebelahan menyala acak (hanya yang bisa dimasuki). Jalan Buntu: 3 pilihan lompat, Level Stress +1, lompatan menggantikan langkah.
- Indikator hanya empat: Kekayaan, Hutang, Kesehatan, Level Stress. Poin Sosial dan Usaha Sampingan sudah dihapus.
- Basis Jakarta: Gaji Rp5.730.000 (UMP DKI 2026), Biaya Hidup Wajib Rp4.600.000/bulan, bunga Hutang 10%/bulan, limit Hutang Rp25.000.000.
- Multiplayer 24 langkah (1 langkah = 2 minggu), nilai Rupiah ×2, efek status ×2 (maksimal ±3). Timer Giliran 30 atau 60 detik, **diatur host di Room**.
- Papan: radius 6 (4 pemain), 5 (3 pemain), 4 (2 pemain). Papan skor publik hanya menampilkan **Skor Sementara**. Statistik detail hanya untuk pemiliknya (Panel Pribadi).
- Petak Emas muncul di Langkah 1, 5, 9, 13, 17, 21 dan bertahan 4 ronde. Beban Peringkat 1: +15 poin persen Peluang Zonk untuk pemain skor tertinggi, mulai Langkah 5.
- Ajakan: 1 kartu per 2 bulan, hangus jika tidak dipakai, realtime, tidak menghabiskan langkah, motif Tulus 50% / Komisi 25% / Jebakan 25%.

**Antarmuka**

- Web app responsif (mobile, tablet, desktop). Papan dirender 2D, bukan 3D.
- Gaya visual: ilustrasi komik bertema kantor/HRD (map kuning, sticky note, stempel, kubikel). Detail di 02_DESIGN.md.
- Home: tombol yang ditunda (Singel, Ajang Flexing, ikon Portal/Masuk) tetap tampil tanpa efek klik dan tanpa label.
- Pengganti login: popup "Masuk sebagai tamu" (nama dan avatar). Lobby memakai tombol "Ubah nama". Pengaturan tanpa Akun dan tanpa Aturan Mabar.

**Teknis**

- Monorepo **npm workspaces** (bukan pnpm): `apps/web` (Next.js), `apps/server` (Node + Socket.IO), `packages/engine`, `packages/shared` (Zod).
- **Game engine hanya berjalan di server** karena isi heksa rahasia. Server otoritatif. Klien hanya menerima data yang boleh dilihat.
- REST sekitar 3 endpoint (buat sesi tamu, cek room, health). Socket.IO sekitar 42 event (daftar di 03_REKOMENDASI...).
- Setiap aksi klien memakai ack `{ ok, ... }`, state bernomor versi, timer dikirim sebagai `deadline`.

## 5. Status pekerjaan

**Desain (gambar dari generator gambar)**

- Sudah ada: Home, Portal HRD, Form Masuk Kerja, Daftar, Pengaturan, Lobby (versi lama), Room dengan 5 variasi, Game Board dengan variasi, Detail Heksa dengan variasi.
- Belum ada: popup tamu, Reveal Realita, Ringkasan Ganti Bulan, Event Tanggal, Eliminasi, Hasil Akhir, Ajakan, overlay kecil, Cara Main, Error.
- Lobby dan Pengaturan perlu direvisi sesuai keputusan di atas (lihat 04_UI_Screens_dan_Prompts.md).

**Repo (lokal di macOS, terminal zsh dengan Conda `base` aktif)**

- Folder: `~/Downloads/imron-hacktiv8-excercise/pejuang-umr` (disarankan dipindah ke folder tetap seperti `~/Projects`). Remote GitHub: repo private `pejuang-umr`, cabang `main`.
- Versi terpasang: Node v24.18.0, npm 11.16.0, Next.js 16.4.0, React 19.3.0, TypeScript 5.9.3, Tailwind 4.3.3, socket.io dan socket.io-client 4.8.4, zod 4.6.5, vitest 5.0.3, `@types/node` 24.19.2 (sudah diselaraskan dari 20 dan 26).
- Workspace: `@pejuang/web`, `@pejuang/server`, `@pejuang/shared`, `@pejuang/engine`.
- Port: web 3000, server 3001. Server punya `/health`.
- Uji sambungan **berhasil**: halaman web menampilkan "Status: terhubung" dan tombol ping ke server menampilkan balasan. Event uji: `ping:test` dengan skema `PingSchema` di `shared`.
- `npm audit --omit=dev` melaporkan 0 kerentanan. Ada 5 temuan "high" di alat pengembangan yang ditunda (jangan `npm audit fix --force`). Peringatan `allow-scripts` untuk `esbuild`, `fsevents`, dan `unrs-resolver` belum ditangani (cek bila ada error).
- Terakhir terlihat: 3 file belum di-commit (penyelarasan `@types/node`). Pesan commit memakai **bahasa Inggris** (contoh: `chore: align @types/node with Node 24`). Status commit setelah itu belum dikonfirmasi.
- `apps/web/AGENTS.md` dibuat otomatis oleh `create-next-app` (boleh dihapus).

**Struktur file yang ada (git ls-files, ringkas)**

```
package.json, package-lock.json, tsconfig.base.json, .gitignore, README.md
apps/server/{package.json, tsconfig.json, src/index.ts}
apps/web/{package.json, next.config.ts, tsconfig.json, eslint.config.mjs, src/app/{layout.tsx, page.tsx, globals.css}}
packages/engine/{package.json, tsconfig.json, src/index.ts, src/index.test.ts}
packages/shared/{package.json, tsconfig.json, src/index.ts}
```

**Perintah penting**

```
npm run dev -w @pejuang/server     # server di :3001
npm run dev -w @pejuang/web        # web di :3000
npm test                           # tes engine (vitest)
npm ls @types/node                 # cek versi tipe
npm audit --omit=dev               # cek kerentanan produksi
```

Catatan npm: `workspace:*` tidak dikenal, pakai `"*"`. Hanya satu `package-lock.json` di root.

## 6. Keputusan yang masih terbuka

- Asumsi di GDD Bagian 9 (Room): Main Lagi dikendalikan host, tidak ada bot pengganti saat putus, pause tidak menghentikan game, batas idle room 10 menit.
- Hutang di HUD: bar atau angka dengan badge.
- Aset gambar: gambar utuh dari generator tidak bisa dipakai langsung. Perlu aset terpisah (latar meja, sprite heksa, ikon, karakter).
- Semua angka (Zonk dasar, pengali ×2, nominal, ambang gelar, Ajakan) adalah usulan awal untuk playtest.
- Katalog baru 12 petak biasa (target 24-30) dengan 72 varian Realita.

## 7. Langkah berikutnya yang disarankan

1. Tulis `docs/GAME_RULES.md`, `docs/API_CONTRACT.md`, `docs/GAME_STATE.md`, dan `docs/CONTENT_SCHEMA.md` dari GDD v1.7 dan 03_REKOMENDASI...
2. Mulai `packages/engine` dengan tes dulu: ekonomi (gaji, biaya hidup, bunga), lalu Rencana dan Realita (Tumpukan Realita, peluang Zonk), giliran, Petak Emas, eliminasi, dan skor.
3. Implementasikan kontrak di `packages/shared` (skema Zod untuk event dan payload).
4. Papan 2D di `apps/web`, diuji dengan pemain bot lokal tanpa jaringan.
5. Server Socket.IO, sesi tamu, dan Room.
6. Lanjutkan desain layar yang belum ada (Reveal Realita, Ringkasan Ganti Bulan, Event Tanggal, Hasil Akhir, popup tamu).
7. Setelah Multiplayer stabil: Solo, login, MongoDB, riwayat, dan leaderboard.

## 8. Cara bekerja dengan pengguna

- Berbahasa Indonesia. Pesan commit Git dalam bahasa Inggris.
- Suka petunjuk langkah demi langkah dengan perintah terminal yang bisa disalin, dan hasil dalam file `.md`.
- Meminta penilaian objektif dan jujur (setuju atau tidak beserta alasan), bukan sekadar menyetujui.
- Untuk gambar UI, pengguna memakai generator gambar dan meminta prompt (instruksi bahasa Inggris, teks UI bahasa Indonesia, dengan daftar teks yang harus persis).
- Mengunggah screenshot terminal atau hasil desain untuk dicek. Berikan umpan balik spesifik.
- Tidak membuat file besar atau menulis ulang dokumen yang sudah ada kecuali diminta. Perubahan sebaiknya diterapkan sebagai edit terarah.

## 9. Hal yang perlu diwaspadai

- **Privasi data:** jangan mengirim isi heksa tertutup atau statistik pemain lain ke klien. Jangan menjalankan engine di klien.
- **Konsistensi istilah:** gunakan istilah dari glosarium GDD (Kekayaan, Hutang, Kesehatan, Level Stress, Rencana, Realita, Petak, Heksa).
- **Jangan menyebut fitur yang ditunda sebagai bagian MVP** (Solo, login, Rapor Insight, Gelar).
- Jangan menaruh token, password, atau isi `.env` di chat atau dokumen.
