# Pejuang UMR: Jakarta Survival - Ringkasan Konteks (Project State)

Dokumen serah terima dari percakapan sebelumnya. Baca ini dulu, lalu dokumen lain di project knowledge. Terakhir diperbarui: 14 Oktober 2026 (GDD v1.14, API Contract v0.7 [kode masih di v0.6], migrasi kode G1-G7 dan W1 selesai).

## 1. Produk dalam satu paragraf

Pejuang UMR: Jakarta Survival adalah **web app game multiplayer berbasis giliran** di papan heksagon bersama (3D, keputusan GDD v1.10). Pemain adalah karyawan bergaji UMP Jakarta yang harus bertahan 12 bulan (1 Januari sampai 31 Desember) dengan menyeimbangkan **Kekayaan, Hutang, Kesehatan, dan Level Stress**. Setiap heksa adalah satu kartu (petak) tertutup. Tiap giliran, 3 dari 6 heksa di sekeliling pion menyala. Pemain mengklik heksa untuk membuka detail (**Rencana**) lalu memilih satu. Efek Rencana langsung berlaku, sedangkan hasil **Realita** (Zonk, Aman, Hoki) semua pemain baru dibuka di akhir ronde (**Fase Pembalikan**, GDD v1.12). Ada kalender dengan Event Tanggal (Lebaran, 17 Agustus, Harbolnas, dan lainnya), musim (Hujan, Kemarau, Pancaroba), Petak Emas yang diperebutkan, Ajakan antar pemain, dan Refleksi AI di akhir permainan. Target pemain: usia 22-27 tahun di Jakarta. Mode utama: Multiplayer 2-4 pemain, 24 langkah, sekitar 30 menit.

## 2. Dokumen di project ini

| File                                         | Isi                                                                |
| -------------------------------------------- | ------------------------------------------------------------------ |
| 00_PROJECT_INSTRUCTIONS.md                   | Teks untuk kolom "Project instructions"                            |
| 01_GDD_Pejuang_UMR_v1_14.md                  | GDD terkonsolidasi: aturan game, scope MVP, Room dan sesi, backlog |
| 02_DESIGN.md                                 | Design system dan arah visual (format DESIGN.md)                   |
| 03_REKOMENDASI_Stack_Struktur_dan_Kontrak.md | Stack, monorepo, REST, event Socket.IO, kontrak, privasi data      |
| 04_UI_Screens_dan_Prompts.md                 | Status layar, prompt gambar, daftar teks yang harus persis         |
| 05_PROJECT_STATE.md                          | Dokumen ini                                                        |
| AUDIT_BACKLOG.md                             | Laporan audit kode vs dokumen (11 Oktober 2026)                    |

Di repo, semua dokumen ada di `docs/`: `GDD.md` (salinan GDD terbaru), `02_DESIGN.md`, `03_REKOMENDASI_Stack_Struktur_dan_Kontrak.md`, `04_UI_Screens_dan_Prompts.md`, `05_PROJECT_STATE.md`, `API_CONTRACT.md`, `CONTENT_SCHEMA.md`, dan `audit/AUDIT_BACKLOG.md`. Rencana dan panduan migrasi v1.12 ada di `docs/RENCANA_Migrasi_v1_12.md` dan `docs/PANDUAN_Migrasi_v1_12_*.md` (G1-G7 dan Web). Fungsi `GAME_RULES.md` dan `GAME_STATE.md` yang dulu direncanakan sudah diambil alih oleh GDD, API Contract, dan CONTENT_SCHEMA.

## 3. Riwayat konsep (untuk konteks)

- **Konsep awal "Jatah"** (chat lain): game kartu edukasi literasi keuangan untuk mahasiswa dan pekerja pemula, dimainkan solo, peran Mahasiswa atau Pekerja, refleksi AI di akhir, **Mode Kelas** dengan seed acak sama, penyimpanan hasil ke database. Peta heksa diusulkan agar lebih seperti board game. Ide yang belum diadopsi ada di GDD Bagian 8.
- **Sekarang:** berkembang menjadi Pejuang UMR, game multiplayer bergiliran di papan bersama dengan Rencana dan Realita. Nama berubah dari "JATAH - Kartu Realita" menjadi "Pejuang UMR: Jakarta Survival". Istilah "Realita" dan "Rencana" tetap dipakai sebagai mekanik (sisi belakang dan depan petak).
- Versi GDD: v1.1 sampai v1.6 dikembangkan bertahap, v1.7 mengonsolidasikan semuanya dan menambahkan scope MVP.
- GDD v1.8: Doom Spending tidak dikali, ganti bulan Multiplayer 11 kali (Langkah 3, 5, ..., 23), cakupan pengali Multiplayer.
- GDD v1.9: aturan transaksi ekonomi (kekurangan biaya menjadi Hutang, batas limit, Bayar Hutang, pinjaman, Level Stress dari Hutang), nominal Doom kelipatan Rp250.000.
- GDD v1.10 (dari audit): papan 3D, Bayar Hutang dibatasi Kekayaan, tag kebal hanya petak Kesehatan saat Pancaroba, game selesai saat tinggal 1 pemain, Keluar saat game = koneksi putus, ambang ikon risiko, Ubah nama hanya di Lobby.
- GDD v1.11 (dari pengerjaan Game loop, Room, Petak Emas, Ajakan): Petak Emas bersebelahan selalu menyala, aturan kick, penutupan room otomatis, Main Lagi.
- GDD v1.12 (dari 99 komentar tim pada v1.11): Fase Pembalikan (Realita dibuka di akhir ronde), Bangkrut = Hutang lebih dari Rp25 juta, bunga 3%, Bayar Hutang lewat slider, pengali dihapus, timer 15/30/60 tanpa jeda, Ajakan 2 motif, papan selalu 127 heksa, Heksa Mati dan penonton dihapus, skor seimbang 0-100, Refleksi AI masuk MVP, pion = karakter, klik tanpa hover, Edit Profile. API Contract naik ke v0.3 (46 event).
- GDD v1.14 (14 Oktober 2026): Petak Emas 5 kali (Langkah 5, 9, 13, 17, 21), popup awal ronde serentak dalam satu grid (8 detik informasi, 15 detik ada keputusan; menggantikan popup berurutan dan keputusan D2), animasi Pembalikan bergelombang dan kartu hasil pribadi serentak, katalog 117 petak biasa dan 8 Petak Emas (5 dipakai per game, hadiah maksimal Rp10.000.000), Tumpukan Realita per kategori, warna indikator (Level Stress merah mulai 8, Kesehatan merah di bawah 4), room uji UMR-0099 dan `dev:finish-game`, hasil akhir skor 0-100. API Contract v0.7 (hanya catatan; kode menyusul).
- GDD v1.13 (keputusan selama migrasi kode): pemain berhutang dengan Kekayaan 0 tetap ditunggu (D5), Fase Pembalikan menunggu Ajakan terbuka (D6), kalender tidak maju selama jeda, host tereliminasi digantikan saat game selesai dan Main Lagi bisa ditolak (D7), label timer "Kilat", avatar 4 karakter. API Contract v0.4 disesuaikan dengan kode akhir.

## 4. Keputusan kunci

**Scope MVP**

- Hanya **Multiplayer (2-4 pemain)** dan **pemain tamu**. **Mode Solo, register, dan login ditunda.** Solo, Gelar, Rapor Insight, dan rekor tetap tercatat di GDD tetapi bertanda ditunda.
- Tanpa MongoDB dan Redis di MVP (state room di memori server).
- Ajakan tetap bagian dari aturan, boleh dikerjakan paling akhir.
- **Log keputusan dan Refleksi AI masuk MVP** (GDD 6.5 v1.12). LLM dipanggil dari server; fallback insight berbasis aturan. Provider belum dipilih.

**Aturan inti (detail di GDD)**

- Petak = kartu. Semua heksa terisi sejak awal. Detail heksa hanya terlihat pemain yang melihatnya di gilirannya. Yang terlihat semua pemain hanya heksa yang sudah diinjak. Heksa hanya bisa diinjak sekali.
- Pilihan gerak: 3 dari 6 heksa bersebelahan menyala acak (hanya yang bisa dimasuki). Klik heksa membuka popup detail dengan tombol Pilih, tanpa hover. Waktu habis = acak. Jalan Buntu: 3 pilihan lompat, Level Stress +1, lompatan menggantikan langkah.
- **Popup awal ronde serentak (v1.14):** Ganti Bulan, Event Tanggal, notifikasi musim, Petak Emas, dan Beban Peringkat 1 tampil dalam satu grid dengan satu hitung mundur (8 detik informasi, 15 detik ada keputusan). Popup keputusan bertag "Butuh keputusanmu!" tanpa X; popup informasi punya X.
- **Fase Pembalikan (akhir ronde):** animasi bergelombang dari heksa ronde itu (Realita terbuka), hasil Ajakan, Doom Spending, cek Bangkrut dan Burnout, Skor Sementara diperbarui, lalu kartu hasil pribadi tampil serentak.
- Indikator hanya empat: Kekayaan, Hutang, Kesehatan, Level Stress. Poin Sosial dan Usaha Sampingan sudah dihapus.
- Basis Jakarta: Gaji Rp5.730.000 (UMP DKI 2026), Biaya Hidup Wajib Rp4.600.000/bulan, bunga Hutang 3%/bulan. Bangkrut jika Hutang lebih dari Rp25.000.000 saat Fase Pembalikan. Hutang dibayar lewat slider di popup Ganti Bulan (petak Bayar Hutang dihapus).
- Multiplayer 24 langkah (1 langkah = 2 minggu), semua nilai 1× (pengali dihapus). Timer Giliran 15, 30, atau 60 detik, **diatur host di Room**, dan tidak pernah dijeda.
- Papan selalu radius 6 (127 heksa) untuk 2-4 pemain, tanpa Heksa Mati. Papan skor publik menampilkan karakter, nama, dan **Skor Sementara** (0-100, rumus seimbang uang, kesehatan, ketenangan). Statistik detail hanya untuk pemiliknya (Panel Pribadi).
- Petak Emas muncul di Langkah 5, 9, 13, 17, 21 (5 kali, v1.14) dan bertahan 4 ronde. Tiap game memakai 5 dari 8 Petak Emas tanpa pengulangan; hadiah maksimal Rp10.000.000. Beban Peringkat 1: +15 poin persen Peluang Zonk untuk pemain skor tertinggi, mulai Langkah 5.
- Ajakan: 1 kartu per 2 bulan (Rencana dan motif diacak), hangus jika tidak dipakai, hanya dikirim di Fase Pilihan sendiri sebelum memilih heksa, target menjawab 15 detik, hasil dibuka di Fase Pembalikan, motif Tulus 50% / Komisi 50%.

**Antarmuka**

- Web app responsif, fokus utama desktop (GDD v1.12). Papan dirender **3D** dengan Three.js. Perangkat tanpa WebGL mendapat pemberitahuan dan tidak bisa bermain. Mode hemat dan akses keyboard ditunda.
- Gaya visual: ilustrasi komik bertema kantor/HRD (map kuning, sticky note, stempel, kubikel). Detail di 02_DESIGN.md.
- Home: tombol yang ditunda (Singel, Ajang Flexing, ikon profil (Portal/Masuk/Daftar)) tetap tampil tanpa efek klik dan tanpa label.
- Pengganti login: popup "Masuk sebagai tamu" (nama dan avatar/karakter). Lobby memakai tombol "Edit Profile". Pion = karakter, unik per room. Pengaturan tanpa Akun dan tanpa Aturan Mabar. Tidak ada pause dan tidak ada mode penonton.

**Teknis**

- Monorepo **npm workspaces** (bukan pnpm): `apps/web` (Next.js), `apps/server` (Node + Socket.IO), `packages/engine`, `packages/shared` (Zod).
- **Game engine hanya berjalan di server** karena isi heksa rahasia. Server otoritatif. Klien hanya menerima data yang boleh dilihat.
- REST 3 endpoint (buat sesi tamu, cek room, health) dan 46 event Socket.IO (API Contract v0.4). Daftar lengkap di `docs/API_CONTRACT.md`.
- Setiap aksi klien memakai ack `{ ok, ... }`, state bernomor versi, timer dikirim sebagai `deadline`.
- **Migrasi v1.12 (keputusan 12 Oktober 2026):** (D1) server mengirim hasil Fase Pembalikan sekaligus lalu menunggu `REVEAL_STEP_MS` (usulan 2.500 ms) × jumlah pemain; (D2) popup Ganti Bulan tanpa pemain berhutang lanjut setelah sekitar 3 detik; (D3) kontrak shared diubah dengan pola **expand lalu contract**: skema baru ditambah dulu, field lama ditandai `@deprecated` dan baru dihapus setelah web pindah; (D4) Refleksi AI dimulai dengan antarmuka dan insight berbasis aturan, LLM menyusul. Rencana kerja di `docs/RENCANA_Migrasi_v1_12.md`. Ditambah (D5) debtor dengan Kekayaan 0 tetap ditunggu, (D6) Fase Pembalikan menunggu Ajakan terbuka, (D7) host tereliminasi digantikan saat game selesai dan Main Lagi ditolak `NOT_ENOUGH_PLAYERS` jika tidak ada pemain yang memenuhi syarat.
- **Kontrak final (v0.4):** semua field dan event lama sudah dihapus dari kode (G7). Daftar 46 event dan 25 kode error dikunci tes di `packages/shared`. Snapshot divalidasi dengan skema yang sama seperti event.

## 5. Status pekerjaan

**Desain (gambar dari generator gambar)**

- Sudah ada: Home, Portal HRD, Form Masuk Kerja, Daftar, Pengaturan, Lobby (versi lama), Room dengan 5 variasi, Game Board dengan variasi, Detail Heksa dengan variasi.
- Belum ada: popup tamu, Fase Pembalikan, Popup Ganti Bulan dengan slider, Event Tanggal, Eliminasi dengan Refleksi AI, Hasil Akhir, Ajakan, overlay kecil, Cara Main, Error, pemberitahuan perangkat tidak didukung.
- Room, Game Board, dan Detail Heksa perlu dibuat ulang mengikuti GDD v1.12 (prompt di 04_UI sudah diperbarui).
- Lobby dan Pengaturan perlu direvisi (lihat 04_UI_Screens_dan_Prompts.md). Gambar desain datar yang ada belum mencerminkan papan 3D.

**Repo**

- Lokal di macOS (zsh, Conda `base` aktif): `~/Downloads/imron-hacktiv8-excercise/pejuang-umr`. GitHub: `Group-Project-Idn/pejuang-umr` (sudah **public**).
- Branch kerja harian: `development`. Fitur dikerjakan di branch `feat/...`, lalu di-merge lewat PR.
- Versi: Node 24.18.0, npm 11.16.0, Next.js 16.4.0, React 19.3.0, TypeScript 5.9.3, Tailwind 4.3.3, socket.io 4.8.4, zod 4.6.5, vitest 5.0.3. Di web juga ada three 0.186.1, @react-three/fiber 9.8.1, dan @react-three/drei 10.7.9. zustand sudah dihapus (store UI-nya kode mati, tidak dipakai komponen mana pun).
- Port: web 3000, server **3002** (`.env.example` dan CI). Dokumen lama yang menulis 3001 sedang diselaraskan.
- Rahasia: `GUEST_TOKEN_SECRET` di `apps/server/.env` (tidak di-commit). Server menolak nilai kosong atau placeholder `change-me` di production.
- Setelah G7 (13 Oktober 2026): typecheck dan lint web lulus; tes shared 76, engine 332, server 152, web 78. Tes privasi menyeluruh (satu game penuh 4 bot) terbukti mendeteksi kebocoran yang disisipkan sengaja.
- Worktree aktif: `../pejuang-umr-v112` (engine/server) dan `../pejuang-umr-web` (web). Saat membuat worktree baru, salin `apps/server/.env` dan `apps/web/.env.local` (atau buat dari `apps/web/.env.example`).

**Isi kode per paket**

- `packages/shared`: tipe dan skema Zod untuk semua REST dan event, tes privasi, `formatRupiah`, geometri heksa (tidak rahasia).
- `packages/engine` (hanya dipakai server): `data` (konten), `board` (isi papan rahasia, gerak, Jalan Buntu), `score`, `economy`, `reality`, `calendar`, `turn` (alur ronde dan giliran, simulasi 200 game), `game` (state lengkap dan event domain).
- `packages/engine` juga memuat: Fase Pembalikan, fase Ganti Bulan dengan slider, Ajakan v1.12, log keputusan (`log/`), dan insight berbasis aturan (`reflection/`).
- `apps/server`: REST, Room (karakter, kick, Main Lagi), GameSession lengkap (giliran, Ganti Bulan, Event Tanggal, Ajakan, Fase Pembalikan, eliminasi, hasil akhir), layanan Refleksi (`services/reflection/`, provider LLM belum disambungkan), snapshot tervalidasi.
- `apps/web`: Lobby, popup tamu, Room (karakter, timer), papan 3D, giliran, Event Tanggal, Fase Pembalikan. **Belum ada:** popup Ganti Bulan dengan slider, overlay Doom, Ajakan, Layar Eliminasi, Hasil Akhir, Main Lagi, kartu Refleksi, Edit Profile, pemberitahuan tanpa WebGL (W2-W6 di `docs/PANDUAN_Migrasi_v1_12_Web.md`). Game belum bisa dimainkan sampai selesai lewat web.

**Backlog (Superhuman, tim: Muhammad Adharul Imron dan Nickzad Pratama)**

- Done: Setup, Design layar inti, Docs API Contract, Shared, Engine (Data konten, Papan heksa, Skor, Ekonomi, Rencana dan Realita, Giliran), Server Sesi tamu, Web Fondasi UI, Web Papan heksa.
- In Progress: Web Home, Web Room (Nickzad). Server Room sebagian sudah ada.
- Berikutnya untuk Imron: perbaikan temuan audit (engine dan server), Server: Game loop, Engine: Petak Emas dan Beban Peringkat 1, Deploy.

**Cara kerja dengan agent**

- Cline dan Claude Code di VS Code, dua agent paralel lewat `git worktree` (satu branch dan satu folder per agent). Aturan agent di `CLAUDE.md` dan `.clinerules`.
- Pola migrasi yang terbukti: satu prompt bertahap per kelompok, Plan mode dulu, prompt menyuruh agent mengecek `pwd` dan branch, commit dipecah per tahap oleh pengguna, lalu `git fetch` dan cek `HEAD..origin/development` sebelum push. Buka sesi Claude Code dari jendela VS Code worktree yang benar (`code .` di folder worktree).
- Koordinasi dengan Nickzad: satu area kerja satu pemegang. Perubahan paralel di file yang sama (terutama `game-session.ts`, `turn.ts`, `packages/shared`, `lobby-client.tsx`) beberapa kali menimbulkan pekerjaan ganda dan konflik.
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
- Asumsi GDD v1.12: motif Ajakan hanya dibuka untuk pengirim dan target, skor ditampilkan bilangan bulat, bonus lunas (Level Stress -2) bisa diulang.
- **Keseimbangan angka:** simulasi 200 game menunjukkan rata-rata skor 89, eliminasi 0%, Doom 0,1 kali per pemain, rata-rata Kekayaan akhir Rp26,6 juta. Game terlalu mudah, terutama karena sisa gaji +Rp1,13 juta per bulan dan Poin Keuangan cepat mentok. Usulan: simulasi pembanding (Biaya Hidup, pembagi Poin Keuangan, Zonk, pengali status, tiga jenis bot) dengan target skor 55-70, eliminasi 10-20%, Doom 25-40% pemain. Ditunda atas permintaan pengguna.
- `ping:test` (event khusus tes) masih terdaftar di server produksi; usulan hanya didaftarkan saat `NODE_ENV=test`.
- Op `phase` di `game:patch`: dikirim server atau dihapus dari kontrak (API Contract Keputusan Terbuka #12).
- `npm install` melaporkan 5 kerentanan high. Cek dengan `npm audit --omit=dev` setelah fitur web selesai; jangan `npm audit fix --force` di tengah pekerjaan.
- Pembagian W2-W6 dengan Nickzad (usulan di panduan web: Imron W2 dan W5, Nickzad W3 dan W4, W6 siapa pun).
- Hutang di HUD: bar atau angka dengan badge.
- Aset gambar: perlu aset terpisah (latar meja, sprite heksa, ikon, karakter), disesuaikan dengan papan 3D.
- Semua angka (Zonk dasar, nominal 1×, bunga 3%, Ajakan, Petak Emas, rumus skor, modal awal) adalah usulan awal untuk playtest. Simulasi bot di engine wajib dipakai untuk menilainya sebelum angka dikunci.
- Katalog v1.14: 117 petak biasa (Kerja 29, Sosial 37, Kesehatan 29, Keuangan 22) dan 8 Petak Emas sudah ditetapkan di dokumen (`docs/katalog_master_sisi_rencana.md` + `docs/revisi_kesulitan_katalog.md`). Belum ada di kode. Isi Tumpukan Realita per kategori (termasuk pool `finance-debt`) belum ditulis.
- **Opsi yang menunggu simulasi (Prompt 16):** Level Stress pasif per Ganti Bulan dan Biaya Hidup baru. Keduanya hanya opsi, bukan keputusan, sampai simulasi pembanding dijalankan.
- API Contract v0.7 baru mencatat perubahan; skema di `packages/shared` dan kode server/web belum diubah (popup serentak, jadwal Petak Emas, `dev:finish-game`).

## 7. Langkah berikutnya yang disarankan

1. Web W2-W6 (`docs/PANDUAN_Migrasi_v1_12_Web.md`) sesuai pembagian dengan Nickzad, supaya game bisa dimainkan sampai Hasil Akhir.
2. Simulasi pembanding untuk keseimbangan angka (Prompt 16: termasuk opsi Level Stress pasif per Ganti Bulan dan Biaya Hidup baru), lalu satu prompt kecil menerapkan angka. GDD v1.14 sudah ditulis.
2a. Terapkan v1.14 ke kode lewat prompt kecil berurutan: skema shared (API Contract v0.7), katalog 117 petak dan Petak Emas 5 kali di engine, popup serentak di server dan web, `dev:finish-game` dan room uji.
3. Pilih provider LLM, lalu satu prompt kecil menyambungkannya ke layanan Refleksi.
4. Tugas kecil: `ping:test` hanya di tes, putuskan op `phase`, cek `npm audit`.
5. Desain layar baru (Popup Ganti Bulan, Fase Pembalikan, Eliminasi, Hasil Akhir, Ajakan) dan revisi Room, Game Board, Detail Heksa.
6. Lisensi sprite karakter (repo sudah public).
7. Deploy, lalu playtest. Setelah Multiplayer stabil: Solo, login, MongoDB, riwayat, dan leaderboard.

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
