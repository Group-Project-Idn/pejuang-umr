# Pejuang UMR: Jakarta Survival - Ringkasan Rekomendasi Stack, Struktur, dan Kontrak

Berdasarkan GDD v1.6, gambar referensi Game Board, dan penilaian terhadap rancangan monorepo sebelumnya. Semua angka adalah estimasi, bukan kewajiban GDD.

> **Pembaruan Oktober 2026 (GDD v1.10):** papan dirender **3D** dengan Three.js, dan monorepo memakai **npm workspaces**. Jumlah final REST dan event ada di `docs/API_CONTRACT.md` (3 endpoint, 46 event). Bagian yang berubah ditandai _(diperbarui)_.

> **Pembaruan GDD v1.12:** Realita dibuka di akhir ronde (Fase Pembalikan), Bayar Hutang lewat slider di popup Ganti Bulan, timer tidak pernah dijeda, tanpa penonton, tanpa Heksa Mati, papan selalu radius 6, pion = karakter, dan Refleksi AI masuk scope MVP. Bagian yang berubah ditandai _(v1.12)_.

> **Pembaruan GDD v1.14:** popup awal ronde serentak, Petak Emas di Langkah 5, 9, 13, 17, 21 (5 kali), katalog 117 petak dengan Tumpukan Realita per kategori, dan room uji. Perubahan kontrak dicatat di API Contract v0.7.

## 0. Scope MVP (diperbarui)

**Ditunda:** Mode Solo, serta register dan login.
**Dikerjakan:** Multiplayer (2-4 pemain, 24 langkah) dengan **pemain tamu**, termasuk log keputusan dan **Refleksi AI** di layar hasil _(v1.12)_.

| Ditunda                            | Dampak                                                                                                                                                               |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mode Solo (48 langkah)             | Tidak ada tombol Singel, `game:end-solo`, Hasil Akhir Solo, Gelar, rekor, dan Rapor Insight Solo. Skala 48 langkah dan papan radius 4 untuk Solo tidak dibangun dulu |
| Register dan login                 | Tidak ada Auth.js, Portal Pejuang UMR (profil HRD), Form Masuk Kerja, dan Daftar. Pemain cukup memasukkan **nama tamu**                                              |
| Riwayat, Hall of Fame, achievement | Tidak ada karena butuh akun                                                                                                                                          |
| MongoDB                            | Tidak wajib di MVP (lihat Bagian 1)                                                                                                                                  |

Yang tetap dikerjakan: Home, Lobby, Room, Game Board dengan overlay, Hasil Akhir Multiplayer, Pengaturan, Cara Main, dan layar Error/Reconnect (sekitar 8 layar penuh, turun dari 10).

### Keputusan UI untuk scope ini

**Home: tombol yang ditunda tetap tampil, hanya tidak bisa diklik.**

- Tombol tampil seperti biasa, tanpa label "Segera hadir". Perilakunya seperti tautan `#`: tidak berpindah halaman dan tidak ada animasi tekan.
- Berdasarkan gambar Home, yang dinonaktifkan: **Singel**, **Ajang Flexing**, dan **ikon merah** (menuju Portal, Masuk, Daftar). Yang tetap aktif: **Mabar**, **Spill Cara Main**, dan **ikon pengaturan**.
- Secara teknis cukup menandai elemen sebagai nonaktif (`aria-disabled="true"`, tanpa efek hover dan tekan, dan tidak masuk urutan fokus keyboard), supaya pembaca layar tidak menganggapnya tombol yang berfungsi.

**Pengganti login: popup "Masuk sebagai tamu".**

- Muncul satu kali saat pertama kali membuka Lobby (atau saat menekan Mabar tanpa sesi tamu).
- Isi: kolom **Nama** (ada batas panjang dan penyaring kata kasar), pilihan **Avatar** (beberapa pilihan siap pakai), dan tombol utama. Data disimpan di `localStorage`.
- Di Lobby, kartu identitas pemain memakai tombol **Edit Profile** (membuka popup yang sama untuk nama dan avatar) sebagai pengganti "Lihat Profil" _(v1.12)_. Avatar adalah karakter yang juga menjadi pion.

**Pengaturan.**

- Bagian **Akun** dihapus.
- Pilihan **Timer Giliran** (15 detik, 30 detik Cepat, atau 60 detik Santai) ada di **Room** dan hanya bisa diubah host _(v1.12)_.
- Yang tersisa: Musik, Efek suara, dan Notifikasi Ajakan.

**Layar tambahan yang perlu didesain:** popup "Masuk sebagai tamu" (juga dipakai untuk "Edit Profile"), popup Ganti Bulan dengan slider Bayar Hutang, animasi Fase Pembalikan, dan kartu Refleksi AI _(v1.12)_.

## 1. Keputusan utama

| Topik                      | Rekomendasi                                                                                                                                                                                                                                                                                         | Alasan                                                                                                                                                  |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Render papan _(v1.12)_     | **3D** dengan three, @react-three/fiber, dan @react-three/drei. HUD tetap DOM di atas canvas. Tanpa papan cadangan: perangkat tanpa WebGL mendapat pemberitahuan dan tidak bisa bermain. Mode hemat, akses keyboard, dan label pembaca layar ditunda. Interaksi heksa hanya klik/ketuk, tanpa hover | Papan 3D sudah dibangun dan hasilnya dinilai menarik (GDD v1.10). Fokus MVP desktop (GDD v1.12). Risiko: bundle sekitar 255 KB gzip dan beban GPU di HP |
| Rekomendasi awal (riwayat) | Papan datar (DOM/SVG) di belakang `BoardRenderer`, PixiJS jika FPS kurang                                                                                                                                                                                                                                      | Diganti oleh keputusan 3D di GDD v1.10                                                                                                                  |
| Web                        | Next.js (TypeScript) untuk halaman, HUD, dan klien socket                                                                                                                                                                                                                                           | Sesuai stack                                                                                                                                            |
| Game server                | Node.js + Socket.IO, **terpisah** dari Next.js                                                                                                                                                                                                                                                      | Room dan timer perlu proses yang hidup terus                                                                                                            |
| Database                   | **Ditunda.** Tanpa akun dan riwayat, state room cukup di memori server                                                                                                                                                                                                                              | Tambahkan MongoDB saat akun, riwayat, atau leaderboard dikerjakan                                                                                       |
| Redis                      | Belum wajib                                                                                                                                                                                                                                                                                         | Cukup state room di memori. Bungkus di balik `RoomStore` supaya mudah pindah                                                                            |
| Validasi                   | Zod di paket `shared`                                                                                                                                                                                                                                                                               | Frontend dan server memakai skema yang sama                                                                                                             |
| Identitas pemain           | **Hanya sesi tamu**: nama dan avatar, token bertanda tangan disimpan di `localStorage`                                                                                                                                                                                                              | Tanpa login. Token dipakai untuk masuk kembali ke room (resume). Login ditambah belakangan                                                              |
| Game engine                | **Hanya berjalan di server**                                                                                                                                                                                                                                                                        | Isi heksa rahasia. Menjalankan engine di klien berisiko membocorkan isi papan                                                                           |
| Log keputusan _(v1.12)_    | Engine mencatat keputusan per pemain di memori selama game (GDD 6.5)                                                                                                                                                                                                                                | Bahan Refleksi AI dan insight berbasis aturan, tanpa database                                                                                           |
| Refleksi AI _(v1.12)_      | LLM dipanggil dari **server** (kunci API hanya di `.env` server), hasil dikirim privat lewat `reflection:ready`. Wajib: batas waktu (usulan 15 detik), batas biaya per game, rate limit, dan fallback insight berbasis aturan jika LLM gagal                                                        | Provider dan model **belum dipilih**. Pilih berdasarkan biaya per game, latensi, dan kualitas Bahasa Indonesia                                          |

## 2. Struktur monorepo (ramping)

```
pejuang-umr/
├── apps/
│   ├── web/          # Next.js: halaman, HUD, papan 3D, klien socket
│   └── server/       # Node + Socket.IO (+ REST kecil)
├── packages/
│   ├── engine/       # aturan game murni, dipakai server. Berisi data/ (katalog petak, Realita, event, musim)
│   └── shared/       # skema Zod + tipe kontrak REST dan Socket
├── docs/             # GDD.md, API_CONTRACT.md, CONTENT_SCHEMA.md, dokumen desain dan state, audit/
├── package.json      # npm workspaces (tanpa pnpm-workspace.yaml)
└── tsconfig.base.json
```

- Pecah `engine/data` jadi paket `content` hanya jika konten sudah banyak atau sering diubah.
- Estimasi file setelah scope dipangkas: web 20-35, server 12-20, engine 12-20 (belum termasuk file data), shared 5-8. Total sekitar 50-80. Jumlah file bukan ukuran kemajuan.
- Fungsi murni yang aman dipakai klien (format Rupiah, skor dari status milik sendiri) boleh ditaruh di `shared`.

## 3. REST API (MVP: sekitar 3 endpoint)

| Method | Endpoint              | Fungsi                                                                 |
| ------ | --------------------- | ---------------------------------------------------------------------- |
| POST   | `/api/v1/guest`       | Membuat sesi tamu (nama dan avatar) lalu mengembalikan token           |
| GET    | `/api/v1/rooms/:code` | Cek room: ada, penuh, terkunci, atau sudah mulai (untuk tombol Gabung) |
| GET    | `/health`             | Pemeriksaan server                                                     |

- Ditunda: register, login, profil (`/users/me`), riwayat, leaderboard (Ajang Flexing / Hall of Fame), achievement, replay, dan endpoint hasil game.
- "Bagikan hasil" tidak butuh endpoint: gambar hasil bisa dibuat di sisi klien dari data yang sudah diterima saat `game:finished`.
- Tambahkan nama tamu: batasi panjang, saring kata kasar, dan beri rate limit pada `/guest`.
- **Pembuatan room, gabung, dan mulai game lewat Socket.IO**, bukan REST.

## 4. Socket.IO events (46 di API Contract) _(v1.12)_

Keterangan: **C→S** dari klien ke server, **S→R** dari server ke semua pemain di room, **S→C (P)** dari server ke satu pemain saja (privat).

| Kelompok                      | Event               | Arah                         | Isi singkat                                                                                            |
| ----------------------------- | ------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------ |
| Sesi (4)                      | `session:resume`    | C→S                          | Lanjutkan sesi setelah putus                                                                           |
|                               | `session:snapshot`  | S→C (P)                      | Snapshot state lengkap yang boleh dilihat pemain itu                                                   |
|                               | `player:connection` | S→R                          | Pemain terputus atau tersambung kembali                                                                |
|                               | `error`             | S→C                          | Kode dan pesan error                                                                                   |
| Room (9)                      | `room:create`       | C→S                          | Buat room, pengirim jadi host                                                                          |
|                               | `room:join`         | C→S                          | Gabung dengan kode                                                                                     |
|                               | `room:leave`        | C→S                          | Keluar                                                                                                 |
|                               | `room:ready`        | C→S                          | Tandai siap                                                                                            |
|                               | `room:avatar`       | C→S                          | Pilih karakter (unik dalam room) _(v1.12, menggantikan `room:pawn`)_                                   |
|                               | `room:timer`        | C→S                          | Host mengatur timer 15, 30, atau 60 detik                                                              |
|                               | `room:kick`         | C→S                          | Host mengeluarkan pemain                                                                               |
|                               | `room:state`        | S→R                          | Isi room (pemain, status, timer, host, kunci)                                                          |
|                               | `room:countdown`    | S→R                          | Hitung mundur 3-2-1                                                                                    |
| Game (3)                      | `game:start`        | C→S                          | Host memulai                                                                                           |
|                               | `game:started`      | S→R                          | Ukuran papan, urutan giliran, titik awal                                                               |
|                               | `game:finished`     | S→R                          | Peringkat akhir dan rincian skor (untuk halaman Hasil dan gambar "Bagikan hasil")                      |
| Sinkron (2)                   | `game:patch`        | S→R                          | Perubahan publik bernomor versi (heksa terbuka, posisi pion, Skor Sementara, langkah, bulan)           |
|                               | `player:status`     | S→C (P)                      | Kekayaan, Hutang, Kesehatan, Level Stress milik pemain                                                 |
| Kalender (4)                  | `calendar:event`    | S→R                          | Popup Event Tanggal serentak dengan batas waktu                                                        |
|                               | `calendar:answer`   | C→S                          | Ikut atau tidak                                                                                        |
|                               | `calendar:result`   | S→C (P)                      | Efek yang terjadi                                                                                      |
|                               | `season:changed`    | S→R                          | Ganti musim dan kategori rawan                                                                         |
| Bulan (2)                     | `month:summary`     | S→C (P)                      | Popup Ganti Bulan: gaji, biaya hidup, bunga, batas slider, `deadline`                                  |
|                               | `month:pay-debt`    | C→S                          | Nominal Bayar Hutang dari slider _(v1.12)_                                                             |
| Giliran (6)                   | `turn:start`        | S→R                          | Pemain aktif dan batas waktu (`deadline`)                                                              |
|                               | `turn:options`      | S→C (P, hanya pemain aktif)  | 3 heksa menyala beserta detail Rencana dan ikon risiko                                                 |
|                               | `turn:choose`       | C→S                          | Pilih heksa                                                                                            |
|                               | `turn:dead-end`     | S→C (P)                      | 3 pilihan lompat saat Jalan Buntu                                                                      |
|                               | `turn:jump`         | C→S                          | Pilih heksa untuk melompat                                                                             |
|                               | `tile:opened`       | S→R                          | Heksa terbuka (kategori dan Rencana), efek Rencana langsung berlaku. Ada penanda jika dipilih otomatis |
| Fase Pembalikan (2)           | `round:reveal`      | S→R                          | Awal Fase Pembalikan dan urutan pembukaan _(v1.12)_                                                    |
|                               | `tile:resolved`     | S→R                          | Hasil Realita (Zonk, Aman, Hoki) dan efeknya, satu per pemain sesuai urutan giliran                    |
| Petak Emas (2)                | `gold:spawned`      | S→R                          | Posisi, isi, sisa ronde                                                                                |
|                               | `gold:expired`      | S→R                          | Petak Emas hilang, heksa kembali ke petak asli (tertutup)                                              |
| Doom, eliminasi, refleksi (3) | `doom:triggered`    | S→C (P)                      | Nominal Doom Spending (di Fase Pembalikan)                                                             |
|                               | `player:eliminated` | S→R                          | Pemain tereliminasi (skor dibekukan)                                                                   |
|                               | `reflection:ready`  | S→C (P)                      | Refleksi AI atau insight berbasis aturan _(v1.12, menggantikan `spectate:enter`)_                      |
| Ajakan (5)                    | `invite:card`       | S→C (P)                      | Kartu Ajakan baru atau kartu hangus                                                                    |
|                               | `invite:send`       | C→S                          | Kirim Ajakan ke satu lawan, hanya di Fase Pilihan sendiri sebelum memilih heksa                        |
|                               | `invite:incoming`   | S→C (P, target)              | Popup Rencana tanpa motif, 15 detik                                                                    |
|                               | `invite:respond`    | C→S                          | Ikut atau Tolak                                                                                        |
|                               | `invite:resolved`   | S→C (P, pengirim dan target) | Motif terbuka dan efeknya, dikirim di Fase Pembalikan                                                  |
| Emote (2)                     | `emote:send`        | C→S                          | Kirim emote                                                                                            |
|                               | `emote:shown`       | S→R                          | Tampilkan emote                                                                                        |

Catatan: notifikasi publik bisa digabung ke `game:patch` supaya jumlah event yang harus dirawat turun. Angka 46 adalah hasil memecah semuanya secara eksplisit. `turn:timer` dan `spectate:enter` dihapus di v1.12 karena timer tidak pernah dijeda dan penonton dihapus.

## 5. Aturan kontrak

- **Setiap event C→S memakai `ack`** dengan bentuk `{ ok: true, ... }` atau `{ ok: false, error: KODE }`, dan menyertakan `requestId` agar pengiriman ganda tidak diproses dua kali.
- **Nomor versi state** (`version`) naik setiap ada perubahan. Jika klien menerima versi yang melompat, ia meminta `session:snapshot` ulang.
- **Timer berupa `deadline` (waktu server)**, bukan event tiap detik. Klien menghitung mundur sendiri.
- **Payload divalidasi dengan Zod** di server, dan Socket.IO diberi rate limit.
- Server memutuskan aturan (apakah heksa boleh dipilih), kontrak hanya mendefinisikan bentuk data.

Kode error awal:

| Kode                                           | Arti                                                                          |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| `NOT_YOUR_TURN`                                | Bukan giliranmu                                                               |
| `TILE_NOT_LIT`                                 | Heksa tidak termasuk 3 yang menyala                                           |
| `INVALID_TILE`                                 | Heksa tidak ada atau sudah terinjak                                           |
| `ROOM_NOT_FOUND` / `ROOM_FULL` / `ROOM_LOCKED` | Kode salah, room penuh, atau game sudah mulai                                 |
| `NOT_HOST`                                     | Aksi hanya untuk host                                                         |
| `GAME_FINISHED`                                | Game sudah selesai                                                            |
| `NO_INVITE_CARD` / `INVITE_NOT_ALLOWED`        | Tidak punya kartu, atau Ajakan dikirim di luar Fase Pilihan sendiri _(v1.12)_ |
| `INVALID_PAYLOAD`                              | Data tidak sesuai skema                                                       |
| `STALE_VERSION`                                | State klien sudah ketinggalan                                                 |

## 6. Data publik dan privat

| Data                                                            | Siapa yang boleh melihat                                         |
| --------------------------------------------------------------- | ---------------------------------------------------------------- |
| Isi heksa yang masih tertutup                                   | Hanya server                                                     |
| 3 heksa menyala beserta detailnya                               | Hanya pemain aktif                                               |
| Heksa yang sudah terbuka (Rencana), posisi pion, Skor Sementara | Semua pemain                                                     |
| Hasil Realita                                                   | Hanya server sampai Fase Pembalikan, lalu semua pemain _(v1.12)_ |
| Kekayaan, Hutang, Kesehatan, Level Stress                       | Hanya pemiliknya                                                 |
| Motif Ajakan                                                    | Hanya pengirim, lalu target di Fase Pembalikan _(v1.12)_         |
| Log keputusan dan Refleksi AI                                   | Hanya pemiliknya _(v1.12)_                                       |
| Petak Emas (posisi dan isi)                                     | Semua pemain                                                     |

Server **tidak boleh mengirim seluruh papan** ke klien. Kirim hanya heksa terbuka plus data yang memang boleh dilihat pemain itu.

### Room uji dan alat pengembangan _(v1.14)_

Hanya untuk pengembangan dan tes. Bukan aturan game dan bukan bagian dari 46 event produksi.

- **Room uji `UMR-0099`** hanya ada jika env `DEV_TOOLS=true`. Tidak pernah aktif di production (server menolak atau mengabaikan `DEV_TOOLS` saat `NODE_ENV=production`). Kode ini **tidak pernah dibuat generator kode room**.
- Host room uji = **pemain yang masuk pertama**. Setelah game selesai atau room kosong, room kembali ke status menunggu (`waiting`), siap dipakai lagi.
- Event **`dev:finish-game`** (C→S, **host saja**): server menyelesaikan sisa langkah dengan jawaban acak (lewat `RandomSource`), lalu mengirim `game:finished` yang sama seperti game biasa. Event ini hanya didaftarkan saat `DEV_TOOLS=true`, seperti `ping:test` yang hanya didaftarkan saat `NODE_ENV=test`. Detail di API Contract (Bagian 18).
- Tujuan: menguji layar Hasil Akhir, Refleksi AI, dan Main Lagi tanpa memainkan 24 langkah.

## 7. Dokumen yang ditulis sebelum coding

_(diperbarui)_ Yang akhirnya dibuat:

1. `GDD.md`: salinan GDD terbaru, menggantikan rencana `GAME_RULES.md`.
2. `API_CONTRACT.md`: endpoint, event, payload, respons, dan kode error.
3. `CONTENT_SCHEMA.md`: bentuk data petak, Realita, event, dan musim.

`GAME_STATE.md` tidak dibuat. State publik dan privat sudah didefinisikan di API Contract (Bagian 3) dan di `packages/engine/src/game/game-state.ts`. Folder `e2e/` dibuat nanti di kartu QA.

## 8. Urutan bangun

1. `engine`: aturan dan tes (ekonomi, Rencana dan Realita, giliran, RNG, eliminasi, skor), langsung untuk Multiplayer.
2. Papan di `web` (sekarang 3D), dites dengan beberapa pemain bot lokal tanpa jaringan.
3. Server Socket.IO, sesi tamu, dan Room.
4. Overlay, efek, dan Ajakan.
   4a. Log keputusan dan Refleksi AI (insight berbasis aturan dulu, lalu LLM) _(v1.12)_.
5. Setelah Multiplayer stabil: Mode Solo, lalu register dan login (beserta MongoDB, riwayat, dan leaderboard).
6. Simulator balancing: ribuan game bot memakai `engine` untuk menyetel angka sebelum playtest manusia. Prioritas setelah v1.12 karena pengali dihapus, bunga, Ajakan, dan rumus skor berubah.

## 9. Perbedaan dari rekomendasi sebelumnya

| Rekomendasi sebelumnya                               | Perubahan                                                                          |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Papan 3D dengan Three.js                             | Sempat diganti papan datar, lalu kembali ke **3D** di GDD v1.10 _(diperbarui)_     |
| Engine bisa dipakai frontend untuk prediksi tampilan | Engine hanya di server, demi privasi isi heksa                                     |
| 15-22 event socket                                   | 46 di API Contract _(v1.12)_                                                       |
| 8-12 endpoint REST                                   | 3 untuk MVP _(diperbarui)_                                                         |
| `game:tiles-revealed` untuk 3 opsi                   | Ganti `turn:options` (privat), dan `tile:opened` untuk heksa yang terbuka ke semua |
| `game:timer-updated` berkala                         | Kirim `deadline` sekali                                                            |
| Paket `game-content` dan `shared-types` terpisah     | Mulai dengan `engine/data` dan `shared`, pecah belakangan                          |
| Tamu tidak disebut                                   | Sesi tamu masuk kontrak, dan **menjadi satu-satunya jenis identitas di MVP**       |
| Auth.js dan MongoDB sejak awal                       | Ditunda bersama register, login, dan Mode Solo                                     |
