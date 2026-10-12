# Pejuang UMR: Jakarta Survival - Ringkasan Konteks (Project State)

Dokumen serah terima dari percakapan sebelumnya. Baca ini dulu, lalu dokumen lain di project knowledge. Terakhir diperbarui: 12 Oktober 2026 (GDD v1.12).

## 1. Produk dalam satu paragraf

Pejuang UMR: Jakarta Survival adalah **web app game multiplayer berbasis giliran** di papan heksagon bersama (3D, keputusan GDD v1.10). Pemain adalah karyawan bergaji UMP Jakarta yang harus bertahan 12 bulan (1 Januari sampai 31 Desember) dengan menyeimbangkan **Kekayaan, Hutang, Kesehatan, dan Level Stress**. Setiap heksa adalah satu kartu (petak) tertutup. Tiap giliran, 3 dari 6 heksa di sekeliling pion menyala. Pemain mengklik heksa untuk membuka detail (**Rencana**) lalu memilih satu. Efek Rencana langsung berlaku, sedangkan hasil **Realita** (Zonk, Aman, Hoki) semua pemain baru dibuka di akhir ronde (**Fase Pembalikan**, GDD v1.12). Ada kalender dengan Event Tanggal (Lebaran, 17 Agustus, Harbolnas, dan lainnya), musim (Hujan, Kemarau, Pancaroba), Petak Emas yang diperebutkan, Ajakan antar pemain, dan Refleksi AI di akhir permainan. Target pemain: usia 22-27 tahun di Jakarta. Mode utama: Multiplayer 2-4 pemain, 24 langkah, sekitar 30 menit.

## 2. Dokumen di project ini

| File                                         | Isi                                                                |
| -------------------------------------------- | ------------------------------------------------------------------ |
| 00_PROJECT_INSTRUCTIONS.md                   | Teks untuk kolom "Project instructions"                            |
| 01_GDD_Pejuang_UMR_v1_12.md                  | GDD terkonsolidasi: aturan game, scope MVP, Room dan sesi, backlog |
| 02_DESIGN.md                                 | Design system dan arah visual (format DESIGN.md)                   |
| 03_REKOMENDASI_Stack_Struktur_dan_Kontrak.md | Stack, monorepo, REST, event Socket.IO, kontrak, privasi data      |
| 04_UI_Screens_dan_Prompts.md                 | Status layar, prompt gambar, daftar teks yang harus persis         |
| 05_PROJECT_STATE.md                          | Dokumen ini                                                        |
| AUDIT_BACKLOG.md                             | Laporan audit kode vs dokumen (11 Oktober 2026)                    |

Di repo, semua dokumen ada di `docs/`: `GDD.md` (salinan GDD terbaru), `02_DESIGN.md`, `03_REKOMENDASI_Stack_Struktur_dan_Kontrak.md`, `04_UI_Screens_dan_Prompts.md`, `05_PROJECT_STATE.md`, `API_CONTRACT.md`, `CONTENT_SCHEMA.md`, dan `audit/AUDIT_BACKLOG.md`. Fungsi `GAME_RULES.md` dan `GAME_STATE.md` yang dulu direncanakan sudah diambil alih oleh GDD, API Contract, dan CONTENT_SCHEMA.

## 3. Riwayat konsep (untuk konteks)

- **Konsep awal "Jatah"** (chat lain): game kartu edukasi literasi keuangan untuk mahasiswa dan pekerja pemula, dimainkan solo, peran Mahasiswa atau Pekerja, refleksi AI di akhir, **Mode Kelas** dengan seed acak sama, penyimpanan hasil ke database. Peta heksa diusulkan agar lebih seperti board game. Ide yang belum diadopsi ada di GDD Bagian 8.
- **Sekarang:** berkembang menjadi Pejuang UMR, game multiplayer bergiliran di papan bersama dengan Rencana dan Realita. Nama berubah dari "JATAH - Kartu Realita" menjadi "Pejuang UMR: Jakarta Survival". Istilah "Realita" dan "Rencana" tetap dipakai sebagai mekanik (sisi belakang dan depan petak).
- Versi GDD: v1.1 sampai v1.6 dikembangkan bertahap, v1.7 mengonsolidasikan semuanya dan menambahkan scope MVP.
- GDD v1.8: Doom Spending tidak dikali, ganti bulan Multiplayer 11 kali (Langkah 3, 5, ..., 23), cakupan pengali Multiplayer.
- GDD v1.9: aturan transaksi ekonomi (kekurangan biaya menjadi Hutang, batas limit, Bayar Hutang, pinjaman, Level Stress dari Hutang), nominal Doom kelipatan Rp250.000.
- GDD v1.10 (dari audit): papan 3D, Bayar Hutang dibatasi Kekayaan, tag kebal hanya petak Kesehatan saat Pancaroba, game selesai saat tinggal 1 pemain, Keluar saat game = koneksi putus, ambang ikon risiko, Ubah nama hanya di Lobby.
- GDD v1.11 (dari pengerjaan Game loop, Room, Petak Emas, Ajakan): Petak Emas bersebelahan selalu menyala, aturan kick, penutupan room otomatis, Main Lagi.
- GDD v1.12 (dari 99 komentar tim pada v1.11): Fase Pembalikan (Realita dibuka di akhir ronde), Bangkrut = Hutang lebih dari Rp25 juta, bunga 3%, Bayar Hutang lewat slider, pengali dihapus, timer 15/30/60 tanpa jeda, Ajakan 2 motif, papan selalu 127 heksa, Heksa Mati dan penonton dihapus, skor seimbang 0-100, Refleksi AI masuk MVP, pion = karakter, klik tanpa hover, Edit Profile. API Contract naik ke v0.3 (46 event).

## 4. Keputusan kunci

**Scope MVP**

- Hanya **Multiplayer (2-4 pemain)** dan **pemain tamu**. **Mode Solo, register, dan login ditunda.** Solo, Gelar, Rapor Insight, dan rekor tetap tercatat di GDD tetapi bertanda ditunda.
- Tanpa MongoDB dan Redis di MVP (state room di memori server).
- Ajakan tetap bagian dari aturan, boleh dikerjakan paling akhir.
- **Log keputusan dan Refleksi AI masuk MVP** (GDD 6.5 v1.12). LLM dipanggil dari server; fallback insight berbasis aturan. Provider belum dipilih.

**Aturan inti (detail di GDD)**

- Petak = kartu. Semua heksa terisi sejak awal. Detail heksa hanya terlihat pemain yang melihatnya di gilirannya. Yang terlihat semua pemain hanya heksa yang sudah diinjak. Heksa hanya bisa diinjak sekali.
- Pilihan gerak: 3 dari 6 heksa bersebelahan menyala acak (hanya yang bisa dimasuki). Klik heksa membuka popup detail dengan tombol Pilih, tanpa hover. Waktu habis = acak. Jalan Buntu: 3 pilihan lompat, Level Stress +1, lompatan menggantikan langkah.
- **Fase Pembalikan (akhir ronde):** Realita dibuka berurutan, hasil Ajakan, Doom Spending, cek Bangkrut dan Burnout, lalu Skor Sementara diperbarui.
- Indikator hanya empat: Kekayaan, Hutang, Kesehatan, Level Stress. Poin Sosial dan Usaha Sampingan sudah dihapus.
- Basis Jakarta: Gaji Rp5.730.000 (UMP DKI 2026), Biaya Hidup Wajib Rp4.600.000/bulan, bunga Hutang 3%/bulan. Bangkrut jika Hutang lebih dari Rp25.000.000 saat Fase Pembalikan. Hutang dibayar lewat slider di popup Ganti Bulan (petak Bayar Hutang dihapus).
- Multiplayer 24 langkah (1 langkah = 2 minggu), semua nilai 1× (pengali dihapus). Timer Giliran 15, 30, atau 60 detik, **diatur host di Room**, dan tidak pernah dijeda.
- Papan selalu radius 6 (127 heksa) untuk 2-4 pemain, tanpa Heksa Mati. Papan skor publik menampilkan karakter, nama, dan **Skor Sementara** (0-100, rumus seimbang uang, kesehatan, ketenangan). Statistik detail hanya untuk pemiliknya (Panel Pribadi).
- Petak Emas muncul di Langkah 1, 5, 9, 13, 17, 21 dan bertahan 4 ronde. Beban Peringkat 1: +15 poin persen Peluang Zonk untuk pemain skor tertinggi, mulai Langkah 5.
- Ajakan: 1 kartu per 2 bulan (Rencana dan motif diacak), hangus jika tidak dipakai, hanya dikirim di Fase Pilihan sendiri sebelum memilih heksa, target menjawab 15 detik, hasil dibuka di Fase Pembalikan, motif Tulus 50% / Komisi 50%.

**Antarmuka**

- Web app responsif, fokus utama desktop (GDD v1.12). Papan dirender **3D** dengan Three.js. Perangkat tanpa WebGL mendapat pemberitahuan dan tidak bisa bermain. Mode hemat dan akses keyboard ditunda.
- Gaya visual: ilustrasi komik bertema kantor/HRD (map kuning, sticky note, stempel, kubikel). Detail di 02_DESIGN.md.
- Home: tombol yang ditunda (Singel, Ajang Flexing, ikon Portal/Masuk) tetap tampil tanpa efek klik dan tanpa label.
- Pengganti login: popup "Masuk sebagai tamu" (nama dan avatar/karakter). Lobby memakai tombol "Edit Profile". Pion = karakter, unik per room. Pengaturan tanpa Akun dan tanpa Aturan Mabar. Tidak ada pause dan tidak ada mode penonton.

**Teknis**

- Monorepo **npm workspaces** (bukan pnpm): `apps/web` (Next.js), `apps/server` (Node + Socket.IO), `packages/engine`, `packages/shared` (Zod).
- **Game engine hanya berjalan di server** karena isi heksa rahasia. Server otoritatif. Klien hanya menerima data yang boleh dilihat.
- REST 3 endpoint (buat sesi tamu, cek room, health) dan 46 event Socket.IO (API Contract v0.3). Daftar lengkap di `docs/API_CONTRACT.md`.
- Setiap aksi klien memakai ack `{ ok, ... }`, state bernomor versi, timer dikirim sebagai `deadline`.

## 5. Status pekerjaan

**Desain (gambar dari generator gambar)**

- Sudah ada: Home, Portal HRD, Form Masuk Kerja, Daftar, Pengaturan, Lobby (versi lama), Room dengan 5 variasi, Game Board dengan variasi, Detail Heksa dengan variasi.
- Belum ada: popup tamu, Fase Pembalikan, Popup Ganti Bulan dengan slider, Event Tanggal, Eliminasi dengan Refleksi AI, Hasil Akhir, Ajakan, overlay kecil, Cara Main, Error, pemberitahuan perangkat tidak didukung.
- Room, Game Board, dan Detail Heksa perlu dibuat ulang mengikuti GDD v1.12 (prompt di 04_UI sudah diperbarui).
- Lobby dan Pengaturan perlu direvisi (lihat 04_UI_Screens_dan_Prompts.md). Gambar desain yang ada bergaya 2D datar, sedangkan papan sekarang 3D.

**Repo**

- Lokal di macOS (zsh, Conda `base` aktif): `~/Downloads/imron-hacktiv8-excercise/pejuang-umr`. GitHub: `Group-Project-Idn/pejuang-umr` (private).
- Branch kerja harian: `development`. Fitur dikerjakan di branch `feat/...`, lalu di-merge lewat PR.
- Versi: Node 24.18.0, npm 11.16.0, Next.js 16.4.0, React 19.3.0, TypeScript 5.9.3, Tailwind 4.3.3, socket.io 4.8.4, zod 4.6.5, vitest 5.0.3. Di web juga ada three 0.186.1, @react-three/fiber 9.8.1, @react-three/drei 10.7.9, dan zustand 5.0.15 (belum dipakai).
- Port: web 3000, server **3002** (`.env.example` dan CI). Dokumen lama yang menulis 3001 sedang diselaraskan.
- Rahasia: `GUEST_TOKEN_SECRET` di `apps/server/.env` (tidak di-commit). Server menolak nilai kosong atau placeholder `change-me` di production.
- Hasil audit terakhir: typecheck, 283 tes, lint (web), dan build lulus. Build web tidak memuat teks Realita atau id petak.

**Isi kode per paket**

- `packages/shared`: tipe dan skema Zod untuk semua REST dan event, tes privasi, `formatRupiah`, geometri heksa (tidak rahasia).
- `packages/engine` (hanya dipakai server): `data` (konten), `board` (isi papan rahasia, gerak, Jalan Buntu), `score`, `economy`, `reality`, `calendar`, `turn` (alur ronde dan giliran, simulasi 200 game), `game` (state lengkap dan event domain).
- `apps/server`: REST `/health`, `POST /api/v1/guest`, `GET /api/v1/rooms/:code`, handler Socket.IO room. Engine belum disambungkan ke Socket.IO (kartu Server: Game loop).
- `apps/web`: papan 3D, HUD awal, halaman Home/Lobby dan Room (sedang dikerjakan Nickzad).

**Backlog (Superhuman, tim: Muhammad Adharul Imron dan Nickzad Pratama)**

- Done: Setup, Design layar inti, Docs API Contract, Shared, Engine (Data konten, Papan heksa, Skor, Ekonomi, Rencana dan Realita, Giliran), Server Sesi tamu, Web Fondasi UI, Web Papan heksa.
- In Progress: Web Home, Web Room (Nickzad). Server Room sebagian sudah ada.
- Berikutnya untuk Imron: perbaikan temuan audit (engine dan server), Server: Game loop, Engine: Petak Emas dan Beban Peringkat 1, Deploy.

**Cara kerja dengan agent**

- Cline dan Claude Code di VS Code, dua agent paralel lewat `git worktree` (satu branch dan satu folder per agent). Aturan agent di `CLAUDE.md` dan `.clinerules`.
- Pagar Claude Code di `.claude/settings.local.json` (melarang git commit/push dan membaca `.env`), diabaikan Git lewat `info/exclude`. Pengguna yang melakukan commit dan push.

**Perintah penting**

```
npm run dev -w @pejuang/server     # server di :3002
npm run dev -w @pejuang/web        # web di :3000
npm run typecheck && npm test      # semua workspace
npm audit --omit=dev               # cek kerentanan produksi
```

Catatan npm: `workspace:*` tidak dikenal, pakai `"*"`. Hanya satu `package-lock.json` di root.

## 6. Keputusan yang masih terbuka

- Lisensi 4 gambar karakter sprite (dari repo lain) belum dikonfirmasi. Wajib diselesaikan atau diganti sebelum repo public atau deploy. Makin penting karena sejak GDD v1.12 karakter menjadi pion dan avatar.
- Provider dan model LLM untuk Refleksi AI, beserta batas biaya per game.
- Asumsi GDD v1.12: motif Ajakan hanya dibuka untuk target, skor ditampilkan bilangan bulat, bonus lunas (Level Stress -2) bisa diulang.
- Nasib zustand (dipakai atau dihapus).
- Hutang di HUD: bar atau angka dengan badge.
- Aset gambar: perlu aset terpisah (latar meja, sprite heksa, ikon, karakter), disesuaikan dengan papan 3D.
- Semua angka (Zonk dasar, nominal 1×, bunga 3%, Ajakan, Petak Emas, rumus skor, modal awal) adalah usulan awal untuk playtest. Simulasi bot di engine wajib dipakai untuk menilainya sebelum angka dikunci.
- Katalog baru 12 petak biasa (3 Kerja, 4 Sosial, 3 Kesehatan, 2 Keuangan; target 24-30) dengan 72 varian Realita.

## 7. Langkah berikutnya yang disarankan

1. Salin dokumen v1.12 ke `docs/` di repo (GDD, API Contract v0.3, CONTENT_SCHEMA, 02-05) dan ganti file di project knowledge.
2. Engine: sesuaikan dengan GDD v1.12 (Fase Pembalikan, Realita diundi saat memilih, Bangkrut baru, bunga 3%, Stress Hutang per kelipatan, slider Bayar Hutang, pengali dihapus, papan radius 6, titik awal radius 3 untuk 2-3 pemain, tanpa Heksa Mati, posisi Petak Emas, Ajakan 2 motif, skor seimbang, log keputusan). Banyak dari 283 tes akan berubah.
3. Shared: skema event v0.3 (`room:avatar`, `month:pay-debt`, `round:reveal`, `reflection:ready`; hapus `turn:timer`, `spectate:enter`, `PawnId`, `deadHexes`).
4. Data konten: hapus Bayar Hutang, tambah Jalan-jalan, Zonk Musim baru, nilai Ajakan baru, Kondangan Rp250.000 (lihat CONTENT_SCHEMA).
5. Simulasi bot untuk menilai angka baru, lalu Server: Game loop (sambungkan engine ke Socket.IO).
6. Web (Nickzad): klik tanpa hover, popup Pilih, Rencana singkat di heksa menyala, pion karakter, label "Jalan", timer 15/30/60, Edit Profile, popup Ganti Bulan, Fase Pembalikan, pemberitahuan tanpa WebGL.
7. Refleksi AI: insight berbasis aturan dulu, lalu LLM setelah provider dipilih.
8. Deploy, lalu uji. Setelah Multiplayer stabil: Solo, login, MongoDB, riwayat, dan leaderboard.

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
