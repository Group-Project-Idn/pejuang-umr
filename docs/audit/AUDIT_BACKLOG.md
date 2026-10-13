# Audit Backlog: Kode vs Dokumen Sumber

Audit baca-saja pada branch `development` (commit `ea69fdd`), 11 Oktober 2026. Tidak ada file kode atau dokumen yang diubah. Satu-satunya file yang ditulis adalah laporan ini.

Dokumen sumber: docs/GDD.md (v1.9), docs/API_CONTRACT.md, docs/CONTENT_SCHEMA.md, docs/05_PROJECT_STATE.md, docs/03_REKOMENDASI_Stack_Struktur_dan_Kontrak.md, docs/02_DESIGN.md, docs/04_UI_Screens_dan_Prompts.md, CLAUDE.md, .clinerules.

---

## 0. Ringkasan

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run typecheck` | **Lulus** (4 workspace, exit 0) |
| `npm test` | **Lulus**: 283 tes di 35 file. server 29, web 10, engine 190, shared 54 |
| `npm run lint --workspaces --if-present` | **Lulus**, tetapi hanya `@pejuang/web` yang punya skrip lint (lihat S4) |
| `npm run build -w @pejuang/web` | **Lulus** (Next.js 16.4.0, rute `/`, `/_not-found`, `/room/[code]`) |
| Cek kebocoran di apps/web/.next | **Bersih**. Teks "Bos marah", "Klien kabur", "Lembur tidak dihitung", id `overtime-project`, dan `baseZonkPct` tidak ditemukan |

| Tingkat | Jumlah | Arti |
| --- | --- | --- |
| Tinggi | 6 | Melanggar aturan GDD, membocorkan data rahasia, atau keamanan |
| Sedang | 16 | Beda dengan API Contract, tes kurang, atau aturan kerja dilanggar |
| Rendah | 42 | Kerapian, penamaan, atau dokumen kurang lengkap |

Jumlah di atas menghitung setiap temuan satu kali. Temuan yang muncul lagi di kartu lain ditandai "lihat ...". Pertentangan antar dokumen (Bagian 3) dihitung terpisah.

Catatan cakupan: Petak Emas, Kartu Ajakan, handler Socket.IO untuk game (`turn:*`, `calendar:*`, `invite:*`, dan lainnya), serta layar Game Board interaktif belum ada di kartu yang diaudit. Fitur itu masih `TODO` di packages/engine/src/turn/round.ts:178-179 dan packages/engine/src/turn/turn.ts:187, dan tidak dicatat sebagai temuan.

---

## 1. Temuan per kartu

### 1.1 Setup: Monorepo dan uji sambungan

| # | Tingkat | Temuan | Lokasi (file:baris) | Seharusnya (dokumen + bagian) |
| --- | --- | --- | --- | --- |
| S1 | Sedang | Port server tidak konsisten. Kode default 3001, sedangkan `.env.example` dan CI memakai 3002. | apps/server/src/config.ts:27; apps/server/.env.example:1; apps/web/.env.example:1; .github/workflows/ci.yml:43 | Server 3001 (API_CONTRACT §0 baris 24; 05_PROJECT_STATE §5 baris 74 dan 93) |
| S2 | Rendah | `.DS_Store` ter-commit dan kini berstatus modified. .gitignore di root tidak mengabaikannya. | .DS_Store; .gitignore:1-5 | Tidak ada file nyasar (permintaan audit langkah 4) |
| S3 | Rendah | .gitignore berisi baris `/Users/`, sisa dari path absolut yang tidak sengaja dibuat. | .gitignore:5 | CLAUDE.md "Selalu pakai path relatif" |
| S4 | Rendah | Hanya apps/web yang punya skrip `lint`. Engine, server, dan shared tidak pernah di-lint, walaupun CI menjalankan `npm run lint`. | apps/web/package.json:9; package.json:13 | Pemeriksaan kualitas yang sama di semua workspace (05_PROJECT_STATE §5) |
| S5 | Rendah | README.md di root berisi salinan GDD v1.7 yang sudah usang. | README.md:1-37 | GDD v1.9 adalah sumber kebenaran (CLAUDE.md, .clinerules:4) |
| S6 | Rendah | apps/web/README.md masih bawaan create-next-app (menyebut yarn/pnpm/bun). AGENTS.md juga masih ada. | apps/web/README.md:1-20; apps/web/AGENTS.md | npm workspaces (05_PROJECT_STATE §4); "AGENTS.md boleh dihapus" (05_PROJECT_STATE §5 baris 78) |

### 1.2 Docs: API Contract dan dokumen aturan

| # | Tingkat | Temuan | Lokasi (file:baris) | Seharusnya (dokumen + bagian) |
| --- | --- | --- | --- | --- |
| D1 | Rendah | Header API Contract masih menulis "Sumber aturan: GDD v1.7". Bagian 17 juga masih merujuk v1.7. | docs/API_CONTRACT.md:3, 1319 | GDD v1.9 (docs/GDD.md:3) |
| D2 | Rendah | GAME_RULES.md dan GAME_STATE.md direncanakan, tetapi tidak ada di repo dan tidak disebut di CLAUDE.md. | docs/03_REKOMENDASI_Stack_Struktur_dan_Kontrak.md:172-177; docs/05_PROJECT_STATE.md:112 | Dokumen yang ditulis sebelum coding (03 §7) |
| D3 | Rendah | Contoh id di CONTENT_SCHEMA (`overheat-engine`) berbeda dengan data (`dry-overheat-engine`). | docs/CONTENT_SCHEMA.md:36; packages/engine/src/data/season-zonks.ts:37 | Contoh harus sesuai data |
| D4 | Rendah | Status repo dan daftar file di 05_PROJECT_STATE sudah usang: hanya 5 file per workspace dan masih menulis "3 file belum di-commit". | docs/05_PROJECT_STATE.md:77, 80-88 | Dokumen serah terima harus menggambarkan keadaan terbaru |

### 1.3 Shared: Skema Zod kontrak

| # | Tingkat | Temuan | Lokasi (file:baris) | Seharusnya (dokumen + bagian) |
| --- | --- | --- | --- | --- |
| H1 | Rendah | `PrivateStatusSchema.wealth` tidak dibatasi `nonnegative()`. | packages/shared/src/schemas/common.ts:27 | "Kekayaan tidak pernah minus" (GDD 2.3, aturan transaksi #1) |
| H2 | Rendah | Tipe `Ack` dan `RequestPayload` ditulis manual. `RequestPayload` menduplikasi `RequestPayloadSchema`. | packages/shared/src/common/ack.ts:3-5; packages/shared/src/common/request.ts:1-3 | "Tipe diturunkan dari skema dengan z.infer, jangan ditulis dua kali" (.clinerules:7) |
| H3 | Rendah | Skema aksi Room memakai `z.object` (field asing lolos), sedangkan skema aksi game memakai `z.strictObject`. | packages/shared/src/schemas/room-actions.ts:8-32; packages/shared/src/schemas/game-actions.ts:4-47 | Validasi Zod yang seragam (03 §5) |
| H4 | Rendah | Enum musim ditulis ulang, tidak memakai `SeasonSchema`. | packages/shared/src/schemas/game.ts:62, 158 | Satu sumber skema (.clinerules:7) |
| H5 | Rendah | `AvatarIdSchema` menerima string apa pun (1-64 karakter). | packages/shared/src/schemas/common.ts:11 | Usulan `"avatar-01" ... "avatar-08"` (API_CONTRACT §3 baris 164) |

### 1.4 Engine: Data konten

Data sudah dicocokkan baris demi baris dengan GDD: 12 petak biasa (Rencana dan Zonk Dasar, GDD 5.1), 72 varian Realita (GDD 5.2), 2 Petak Emas (GDD 5.1 v1.8), 6 Event Tanggal (GDD 3.3), 9 Zonk Musim (GDD 3.4), 4 Rencana Ajakan dan bobot motif (GDD 4.8), musim per bulan, dan kategori rawan. Semua angka sesuai.

| # | Tingkat | Temuan | Lokasi (file:baris) | Seharusnya (dokumen + bagian) |
| --- | --- | --- | --- | --- |
| C1 | Rendah | `eventId` Lebaran di data adalah `lebaran-thr`, sedangkan kontrak menulis `"lebaran"`. | packages/engine/src/data/calendar-events.ts:27 | API_CONTRACT §10 `calendar:event` baris 788 |

### 1.5 Engine: Skor dan peringkat

Rumus Harta Bersih, Wellness Modifier, dan Skor Akhir (GDD 6.1-6.2) serta tie-breaker dan peringkat seri 1, 1, 3 (GDD 1.2) sudah sesuai: packages/engine/src/score/score.ts:29-63 dan packages/engine/src/score/ranking.ts:37-126.

| # | Tingkat | Temuan | Lokasi (file:baris) | Seharusnya (dokumen + bagian) |
| --- | --- | --- | --- | --- |
| K1 | Sedang | Papan Skor awal diisi `provisionalScore: 0` dengan peringkat 1..n yang berbeda-beda. Dari status awal, skor seharusnya Rp9.000.000 (7.500.000 + bonus 20%) dan semua pemain seri di peringkat 1. | packages/engine/src/game/initial-state.ts:80-85 | Skor Sementara dihitung dari status saat ini (GDD 4.6); seri mendapat peringkat sama (GDD 1.2) |

### 1.6 Engine: Papan heksa

Radius papan, jumlah heksa, Titik Awal di cincin radius 2, isi acak berbobot sama, aturan 3 heksa menyala, Jalan Buntu (3 heksa terdekat, seri diacak), dan giliran dilewati saat papan penuh sudah sesuai GDD 4.1: packages/engine/src/board/movement.ts:35-81, packages/engine/src/game/initial-state.ts:6-36, packages/engine/src/turn/turn.ts:79-83.

| # | Tingkat | Temuan | Lokasi (file:baris) | Seharusnya (dokumen + bagian) |
| --- | --- | --- | --- | --- |
| P1 | Rendah | `createInitialGameState` mengisi kalender dengan `dateLabel: "Januari · Pekan 1"` dan `nextEvent: null`. Server memakai fungsi ini (lihat M6). | packages/engine/src/game/initial-state.ts:63-71 | Format `"1 Jan"` dari `getCalendarInfo` (packages/engine/src/calendar/calendar.ts:30-33); "Pekan" bukan istilah glosarium (GDD 7 kelompok B) |

### 1.7 Engine: Ekonomi dan ganti bulan

Gaji, Biaya Hidup Wajib, bunga 10%, Limit Hutang, aturan transaksi #1-#5, Doom Spending (ambang 9, nominal kelipatan Rp250.000, tidak dikali), urutan ganti bulan, jadwal Langkah 3, 5, ..., 23, Bangkrut, dan Burnout Total sudah sesuai GDD 1.4, 2.3-2.5: packages/engine/src/economy/*.ts.

| # | Tingkat | Temuan | Lokasi (file:baris) | Seharusnya (dokumen + bagian) |
| --- | --- | --- | --- | --- |
| E1 | Rendah | Interface `MonthSummary` menduplikasi `MonthSummaryPayloadSchema`, lalu di-cast. Tipe `EliminationReason` juga menduplikasi enum `reason` di shared. | packages/engine/src/economy/month-change.ts:8-17; packages/engine/src/turn/round.ts:139; packages/engine/src/economy/elimination.ts:3 | Tipe dari z.infer (.clinerules:7) |
| E2 | Rendah | **Tidak bisa dipastikan.** Bayar Hutang saat Kekayaan kurang membuat kekurangan berpindah ke Hutang lagi dan menambah Level Stress. Contoh Multiplayer: Kekayaan 0 dan Hutang Rp5 jt, lalu menginjak Bayar Hutang (Kekayaan -Rp5 jt, Hutang -Rp5 jt, Level Stress -2). Hasilnya Hutang tetap Rp5 jt, ditambah +1 Level Stress dari Hutang baru, sehingga bersihnya Level Stress -1. GDD tidak mengatur kasus ini. | packages/engine/src/economy/apply-effects.ts:32-47 | GDD 2.3 aturan #1 dan #3 tidak menjelaskan gabungan keduanya |

### 1.8 Engine: Rencana dan Realita

Peluang Zonk (dasar +15 +10, maksimal 80), Hoki tetap 10%, Zonk Musim 50% di kategori rawan, Imunitas Sakit, pengali ×2 dengan batas ±3 per efek, dan ambang risiko sudah sesuai GDD 1.3, 3.4, 4.4, 4.5, API_CONTRACT §3: packages/engine/src/reality/*.ts, packages/engine/src/data/multiplier.ts.

| # | Tingkat | Temuan | Lokasi (file:baris) | Seharusnya (dokumen + bagian) |
| --- | --- | --- | --- | --- |
| R1 | Rendah | **Tidak bisa dipastikan.** Tag `immune` ikut dikirim untuk semua kategori selama Pancaroba (misalnya petak Kerja), padahal imunitas hanya relevan untuk kategori rawan. | packages/engine/src/reality/zonk-chance.ts:79-80, 134-136 | GDD 3.4 dan API_CONTRACT §3 `riskTags` tidak mengatur kapan tag dikirim |

### 1.9 Engine: Giliran, kalender, musim

| # | Tingkat | Temuan | Lokasi (file:baris) | Seharusnya (dokumen + bagian) |
| --- | --- | --- | --- | --- |
| G1 | Tinggi | Rotasi urutan giliran memutar `baseTurnOrder` sebanyak (bulan-1) **lalu** membuang pemain yang tereliminasi. Akibatnya, setelah ada eliminasi, pemain yang sama bisa jalan pertama dua bulan berturut-turut. Contoh: urutan [A,B,C,D] dan C tereliminasi. Bulan 3 menjadi [D,A,B], dan Bulan 4 juga [D,A,B]. | packages/engine/src/turn/round.ts:97-103 | "Di awal setiap bulan, pemain pertama pindah ke urutan terakhir, dan pemain yang tereliminasi dilewati" (GDD 1.2 [v1.9]) |
| G2 | Tinggi | Setelah efek Event Tanggal tidak ada cek Burnout Total (`TODO`). Event bisa menurunkan Kesehatan ke 0, misalnya Libur Hari Buruh "Tidak ikut" memberi Kesehatan -2. | packages/engine/src/turn/round.ts:252-253 | Burnout Total: Kesehatan 0/10 langsung tereliminasi (GDD 1.4) |
| G3 | Sedang | Beban Peringkat 1 tidak pernah ditetapkan (`TODO`), jadi `rankOneBurden` selalu `[]` dan +15 poin persen tidak pernah berlaku. Fungsi pendukung sudah ada di zonk-chance.ts. Tidak bisa dipastikan apakah ini lingkup kartu ini atau kartu Skor. | packages/engine/src/turn/round.ts:180; packages/engine/src/turn/turn.ts:49 | Mulai Bulan 3 (Langkah 5), ditetapkan di Fase Kalender dari Skor Sementara terakhir (GDD 4.2, 4.6) |
| G4 | Sedang | Tidak ada tes rotasi giliran lintas beberapa bulan dengan pemain tereliminasi. Tes yang ada hanya mencakup satu bulan, sehingga G1 lolos. | packages/engine/src/turn/round.test.ts:40-65; packages/engine/src/turn/turn.test.ts:114 | "Setiap perubahan disertai tes Vitest" (CLAUDE.md) |
| G5 | Rendah | `chooseHex` tidak memeriksa mode. `turn:choose` bisa dipakai saat Jalan Buntu dan `turn:jump` bisa dipakai saat giliran normal. | packages/engine/src/turn/turn.ts:290-307 | `turn:jump` khusus Jalan Buntu (API_CONTRACT §11) |

### 1.10 Server: Sesi tamu (REST)

`POST /api/v1/guest` sudah sesuai: validasi Zod, nama 2-20, penyaring kata kasar (422), rate limit 10/menit, token HMAC 7 hari, ubah nama dengan Bearer, serta `GET /health`. Lihat apps/server/src/http/router.ts:23-109 dan apps/server/src/services/*.ts.

| # | Tingkat | Temuan | Lokasi (file:baris) | Seharusnya (dokumen + bagian) |
| --- | --- | --- | --- | --- |
| T1 | Tinggi | Rate limit memakai header `X-Forwarded-For` tanpa syarat. Klien bisa memalsukan header ini untuk melewati batas 10 request/menit. Dampaknya terbatas pada pembuatan sesi tamu. | apps/server/src/http/router.ts:17-21, 29 | Rate limit per IP pada `/guest` (API_CONTRACT §4.1; 03 §3) |
| T2 | Sedang | Ubah nama/avatar tidak ditolak saat pemain sedang berada di Room atau game. | apps/server/src/http/router.ts:53-70 | "Ubah nama hanya di Lobby, tidak saat berada di Room atau game" (API_CONTRACT §4.1) |
| T3 | Rendah | Semua rute yang tidak dikenal dijawab `404 ROOM_NOT_FOUND`. | apps/server/src/http/router.ts:127 | Kode error sesuai arti (API_CONTRACT §15) |

### 1.11 Server: Room (sebagian, termasuk GET /api/v1/rooms/:code)

| # | Tingkat | Temuan | Lokasi (file:baris) | Seharusnya (dokumen + bagian) |
| --- | --- | --- | --- | --- |
| M1 | Tinggi | `canStart` dan `beginCountdown` mewajibkan **semua** pemain Siap, termasuk host. Host yang mengirim `room:ready` juga tidak ditolak. Tes integrasi ikut menyuruh host Siap. | apps/server/src/repositories/room-repository.ts:26-28, 120-122, 176; apps/server/src/room.integration.test.ts:151 | "Setiap pemain selain host menekan Siap"; Mulai aktif jika semua pemain selain host Siap (GDD 9.3). Host yang mengirim event ini mendapat `INVALID_PAYLOAD` (API_CONTRACT §7 `room:ready`) |
| M2 | Tinggi | Pemain masuk dengan `pawn: null` dan harus memilih sendiri. Mulai juga diblokir sampai semua pemain punya pion. | apps/server/src/repositories/room-repository.ts:26-28, 247 | "Saat masuk, pemain mendapat pasangan pertama yang kosong" (GDD 9.3 [v1.8]; API_CONTRACT §7 `room:pawn`) |
| M3 | Sedang | `GET /api/v1/rooms/:code` mengembalikan `{ ok, room }` berisi RoomState lengkap, yaitu nama, `playerId`, avatar, dan status koneksi semua pemain, kepada siapa saja tanpa token. Field `playerCount`, `joinable`, `reason`, dan `isMember` tidak ada. Tes ikut mengunci bentuk yang salah. | apps/server/src/http/router.ts:116-124; apps/server/src/room.integration.test.ts:108-113 | Bentuk respons API_CONTRACT §4.2; data hanya sebatas pengecekan |
| M4 | Sedang | Kode yang tidak cocok `^UMR-\d{4}$` (misalnya huruf kecil) jatuh ke `404 ROOM_NOT_FOUND`. | apps/server/src/http/router.ts:116, 127 | `400 INVALID_PAYLOAD` (API_CONTRACT §4.2) |
| M5 | Sedang | `session:resume` ke room yang ada tetapi pemain bukan anggotanya dijawab `ROOM_NOT_FOUND`. | apps/server/src/socket/register-room-handlers.ts:314-320 | `NOT_IN_ROOM` (API_CONTRACT §6, §15) |
| M6 | Sedang | `game:start` hanya membuat `PublicGameState` (`createInitialGameState`). State engine lengkap (papan rahasia, status pemain) dibuang dan tidak disimpan. `player:status` awal tidak dikirim, dan snapshot selalu `me.status: null`. | apps/server/src/socket/register-room-handlers.ts:258-296; apps/server/src/repositories/game-repository.ts:8; apps/server/src/services/snapshot.ts:15 | "Status awal tiap pemain dikirim lewat `player:status`" (API_CONTRACT §8 `game:started`); snapshot berisi status sendiri (API_CONTRACT §6) |
| M7 | Sedang | Tidak ada rate limit untuk event Socket.IO. | apps/server/src/server.ts:66-105 | "Payload divalidasi dengan Zod di server, dan Socket.IO diberi rate limit" (03 §5) |
| M8 | Rendah | `game:start` divalidasi dengan `RoomCreateRequestSchema` (tidak strict), bukan `GameStartRequestSchema`. | apps/server/src/socket/register-room-handlers.ts:235 | Skema `game:start` di packages/shared/src/schemas/game-actions.ts:4 |
| M9 | Rendah | Pesan 404 berbunyi "Room tidak ditemukan." | apps/server/src/http/router.ts:120 | "Kode room tidak ketemu." (GDD 9.2; API_CONTRACT §15) |
| M10 | Rendah | `room:leave` saat game berjalan dijawab `ROOM_LOCKED`. | apps/server/src/repositories/room-repository.ts:100 | Usulan: diperlakukan seperti putus permanen (API_CONTRACT §17 #1; GDD 10 v1.9 belum diputuskan) |
| M11 | Rendah | Belum ada penutupan room tanpa aktivitas selama 10 menit. | apps/server/src/repositories/room-repository.ts:41-254 | Asumsi GDD 9.3; API_CONTRACT §17 #2 |

### 1.12 Web: Fondasi UI dan klien socket

| # | Tingkat | Temuan | Lokasi (file:baris) | Seharusnya (dokumen + bagian) |
| --- | --- | --- | --- | --- |
| W1 | Sedang | Klien tidak mendeteksi `version` yang melompat (`!== lastVersion + 1`) untuk memanggil `session:resume`. Event lama hanya diabaikan. | apps/web/src/lib/game-view.ts:34, 53 | API_CONTRACT §1.4 |
| W2 | Sedang | Error ditampilkan sebagai kode mentah, misalnya "Gagal: ROOM_NOT_FOUND". | apps/web/src/app/page.tsx:97, 112, 136; apps/web/src/app/room/[code]/lobby-client.tsx:73, 165 | Teks UI per kode (API_CONTRACT §15), misalnya "Kode room tidak ketemu." |
| W3 | Rendah | Font yang dipakai Geist. | apps/web/src/app/layout.tsx:2-14 | Plus Jakarta Sans (02_DESIGN Typography) |
| W4 | Rendah | Warna Tailwind bawaan (stone/amber) dan latar terang di game, bukan token desain. | apps/web/src/app/globals.css:3-6; apps/web/src/app/page.tsx:154 | Token `colors.*`, dark mode default (02_DESIGN Colors aturan 1; Catatan Implementasi) |
| W5 | Rendah | Tipe `HealthResponse` ditulis manual tanpa skema Zod di shared. | apps/web/src/lib/api-client.ts:9-14 | Tipe dari skema (.clinerules:7) |

### 1.13 Web: Papan heksa datar

| # | Tingkat | Temuan | Lokasi (file:baris) | Seharusnya (dokumen + bagian) |
| --- | --- | --- | --- | --- |
| B1 | Tinggi | Papan dirender **3D** dengan Three.js (`Canvas`, `OrbitControls`, `RoundedBox`, bayangan), diberi label "Papan permainan heksagonal 3D", dengan petunjuk "drag untuk memutar · scroll untuk zoom". Detail library ada di Bagian 4. | apps/web/src/app/components/game/GameBoard.tsx:5-8, 180-187, 201-209; apps/web/src/app/components/game/GameInterface.tsx:126 | "Papan dirender datar (heksa datar tampak atas dengan karakter sprite), bukan 3D" (GDD baris 13; v1.7 #3); 03 §1; 05 §4 |
| B2 | Sedang | Pion memakai sprite karakter, bukan pasangan warna dan bentuk. Warna aksen juga tidak cocok: `cream-circle` hijau, `mint-triangle` ungu. | apps/web/src/data/game.ts:16-36; apps/web/src/app/components/game/GameCharacters.tsx:26-31 | Pasangan krem-lingkaran, biru es-kotak, mint-segitiga, salmon-wajik (GDD 9.3 [v1.8]; 02_DESIGN Colors aturan 6) |
| B3 | Sedang | Skor Sementara ditampilkan sebagai "… poin". | apps/web/src/app/components/game/Scoreboard.tsx:47 | Skor Sementara dalam Rupiah (API_CONTRACT §3 `ScoreRow`), format Rupiah (02_DESIGN Typography) |
| B4 | Sedang | Empat PNG karakter disalin dari repo lain yang tidak punya lisensi. Izin redistribusi belum dikonfirmasi. | apps/web/public/characters/README.md:12-14; apps/web/public/characters/*.png | Risiko hak cipta sebelum rilis publik (dicatat sendiri oleh README tersebut) |
| B5 | Rendah | Istilah di luar glosarium: "Level stres", "Kerja (Karier)", "Keuangan / Rezeki", "Kartu ajakan", "Musim hujan", "Life strategy game". Kategori Emas juga tidak ada di Kamus Petak. | apps/web/src/app/components/game/StatusPanel.tsx:46, 55-58; apps/web/src/app/components/game/GameInterface.tsx:11-12, 71, 121 | Glosarium GDD 7 (kelompok C, E, J, S); 04_UI §3 |
| B6 | Rendah | Catatan "Beban peringkat 1: peluang zonk +15%" selalu tampil, tanpa tanda mahkota pada pemain yang terkena. | apps/web/src/app/components/game/Scoreboard.tsx:53-55 | Tanda mahkota untuk pemain yang terkena (GDD 4.6) |
| B7 | Rendah | Petak Emas ditulis "Hangus pada langkah N". | apps/web/src/app/components/game/Scoreboard.tsx:59 | "Hangus dalam N ronde" (04_UI §5; API_CONTRACT §12) |
| B8 | Rendah | Pada lebar 760-1050px, `min-width: 760px` membuat halaman bisa digeser ke samping. Tata letak disusun dari desktop ke bawah. | apps/web/src/app/globals.css:26-27 | Mobile-first (02_DESIGN Layout) |
| B9 | Rendah | Ada tombol "Ulang" yang tidak dikenal di GDD atau desain. | apps/web/src/app/components/game/GameInterface.tsx:119 | Tombol kamera, emote, Kartu Ajakan, pause (04_UI §4.4) |

### 1.14 Web: Home (sedang dikerjakan)

| # | Tingkat | Temuan | Lokasi (file:baris) | Seharusnya (dokumen + bagian) |
| --- | --- | --- | --- | --- |
| O1 | Sedang | Home dan Lobby digabung dalam satu halaman. Belum ada Mabar, Spill Cara Main, tombol nonaktif (Singel, Ajang Flexing, ikon Portal), popup "Masuk sebagai tamu", kartu "Lanjutkan permainan", maupun kondisi server bermasalah dengan "Coba lagi". | apps/web/src/app/page.tsx:153-206 | GDD 9.1, 9.2; API_CONTRACT §2 |
| O2 | Rendah | Tombol Gabung tidak memanggil `GET /api/v1/rooms/:code` lebih dulu. | apps/web/src/app/page.tsx:118-141 | API_CONTRACT §2 (Lobby, Gabung) |
| O3 | Rendah | Avatar diisi lewat input teks bebas. | apps/web/src/app/page.tsx:175-178 | Pilihan Avatar (GDD 9.1; API_CONTRACT §3) |
| O4 | Rendah | Ada teks Inggris atau teknis untuk pemain ("Multiplayer lobby", "Socket", "Player" berisi UUID, "Hapus sesi lokal"). Placeholder kode tertulis "UMR-1234". | apps/web/src/app/page.tsx:157, 163-165, 193, 202 | Teks pemain bahasa Indonesia (CLAUDE.md); placeholder "Contoh: UMR-4821" (04_UI §4.9) |

### 1.15 Web: Room (sedang dikerjakan)

| # | Tingkat | Temuan | Lokasi (file:baris) | Seharusnya (dokumen + bagian) |
| --- | --- | --- | --- | --- |
| L1 | (lihat M1) | Tombol "Saya siap" juga tampil untuk host, karena server mewajibkan host Siap. | apps/web/src/app/room/[code]/lobby-client.tsx:285-301 | GDD 9.3 |
| L2 | Rendah | Istilah tidak sesuai: "pawn", "Ready", "Kick", "online/offline", status mentah `waiting`, "Mulai game" (seharusnya MULAI), "Saya siap" (seharusnya SIAP), "Salmon · Berlian" (seharusnya wajik). | apps/web/src/app/room/[code]/lobby-client.tsx:30, 220, 233, 237-238, 262, 300, 350 | Glosarium GDD 7 kelompok U; GDD 9.3; 04_UI §5 |
| L3 | Rendah | Teks bantuan berbeda dari kontrak. Masih ada teks basi "Game start akan diimplementasikan pada fase berikutnya." | apps/web/src/app/room/[code]/lobby-client.tsx:330 | "Menunggu minimal 2 pemain" / "Menunggu pemain siap" (API_CONTRACT §7 `room:state`) |
| L4 | Rendah | Tidak ada overlay hitung mundur 3-2-1 "Papan sedang disiapkan...". Yang berubah hanya label tombol. | apps/web/src/app/room/[code]/lobby-client.tsx:100-102, 350 | GDD 9.3; 04_UI §4.2 varian D |
| L5 | Rendah | Pemain yang dikeluarkan langsung kembali ke `/` tanpa pesan. | apps/web/src/app/room/[code]/lobby-client.tsx:135-138 | "Kembali ke Lobby dengan pesan" (API_CONTRACT §7 `room:kicked`) |
| L6 | Rendah | Tidak ada tombol Salin kode dan Bagikan link. | apps/web/src/app/room/[code]/lobby-client.tsx:206-213 | GDD 9.3; 04_UI §4.1 |

---

## 2. Temuan lintas kartu

| # | Tingkat | Temuan | Lokasi (file:baris) | Seharusnya (dokumen + bagian) |
| --- | --- | --- | --- | --- |
| X1 | Sesuai | apps/web tidak mengimpor `@pejuang/engine`. Hal ini juga dijaga oleh tes. | apps/web/package.json:13-22; packages/shared/src/web-dependency.test.ts:18-21 | CLAUDE.md Aturan |
| X2 | Sesuai | Data konten dan isi papan hanya ada di engine. Teks petak di shared hanya muncul sebagai fixture tes. | packages/shared/src/schemas/game-payloads.test.ts:33, 199, 216 | CLAUDE.md; .clinerules:6 |
| X3 | (lihat M3) | Payload privat. Engine dan shared bersih: `turn:options`, `player:status`, `calendar:result`, dan `month:summary` hanya ditujukan ke pemain, dan ada tes privasi. Satu-satunya kebocoran ada di REST `GET /rooms/:code` (daftar pemain tanpa token). | packages/engine/src/turn/turn.ts:90, 104-117; packages/shared/src/schemas/privacy.test.ts; apps/server/src/http/router.ts:123 | API_CONTRACT §1.8; 03 §6 |
| X4 | Sesuai | Build web tidak berisi teks Realita atau id petak. | apps/web/.next (hasil grep kosong) | 03 §1 (engine hanya di server) |
| X5 | Rendah | Semua handler C→S yang ada sudah memvalidasi Zod. Namun peta `ClientEventSchemas` di shared tidak dipakai server, jadi skema bisa tidak sinkron (lihat M8). | packages/shared/src/socket/client-event-schemas.ts:26-46; apps/server/src/socket/register-room-handlers.ts:86-310 | 03 §5 |
| X6 | Sesuai | `Math.random` hanya ada di `MathRandomSource` (implementasi RandomSource). Engine lain memakai `RandomSource`. | packages/engine/src/random.ts:21, 28 | CLAUDE.md (RandomSource) |
| X7 | (lihat H2, E1, W5) | Ada tipe yang ditulis dua kali, tidak diturunkan dari Zod. | packages/shared/src/common/ack.ts:3; packages/engine/src/economy/month-change.ts:8; apps/web/src/lib/api-client.ts:9 | .clinerules:7 |
| X8 | (lihat S2, S3) | File .env tidak ter-commit, hanya `.env.example`. Tidak ada path absolut di kode. Ada `.DS_Store` dan baris `/Users/` di .gitignore. | git ls-files | CLAUDE.md |
| X9 | (lihat S1) | Port tidak konsisten antara config, .env.example, CI, API_CONTRACT, dan 05_PROJECT_STATE. | lihat S1 | API_CONTRACT §0; 05 §5 |
| X10 | (lihat B5, L2, O4) | Istilah UI belum mengikuti glosarium di Home, Room, dan Game Board. | lihat baris terkait | GDD 7 |
| X11 | Tidak bisa dipastikan | three, @react-three/fiber, @react-three/drei, dan @types/three ditambahkan di commit `ffc0075`. zustand ada di dependensi web. Riwayat repo tidak bisa memastikan apakah dependensi ini ditambah dengan izin pengguna. | apps/web/package.json:16-22 | "Jangan menambah dependensi npm tanpa izin" (CLAUDE.md) |

---

## 3. Dokumen yang tidak konsisten

| # | Pertentangan | Dokumen A | Dokumen B |
| --- | --- | --- | --- |
| I1 | Papan datar atau 3D | GDD baris 13 dan v1.7 #3 (datar, bukan 3D); 03 §1; 05 §1 dan §4; 04_UI §3 baris 38 ("Tidak perlu Three.js"); CLAUDE.md baris 3 | 02_DESIGN baris 250 ("papan permainan 3D berada di belakangnya") dan baris 262 ("Papan 3D: gaya maket low-poly") |
| I2 | Game berakhir lebih cepat jika tinggal 1 pemain hidup | GDD 10 v1.9 "Belum diputuskan … engine tetap berjalan sampai Langkah 24" | API_CONTRACT §8 `game:finished` (Aksi) dan §17 #3 ("Ya") |
| I3 | Nilai Beasiswa Penuh | GDD 5.1 dan 5.2: Rp7.500.000 (nilai Multiplayer, tidak dikali, v1.8) | 04_UI §4.8 varian B: "Kekayaan +Rp10.000.000" |
| I4 | Alat workspace | 05 §4 dan CLAUDE.md: npm workspaces | 03 §2: `pnpm-workspace.yaml` |
| I5 | Jumlah endpoint REST | 03 §3: "sekitar 3 endpoint"; API_CONTRACT §0: 3 | 03 §9: "Sekitar 6 untuk MVP" |
| I6 | Jumlah event Socket.IO | API_CONTRACT §0: 45 | 03 §4 dan §9, 05 §4: "sekitar 42" |
| I7 | Versi GDD acuan | GDD.md: v1.9 | API_CONTRACT baris 3 dan 1319: v1.7; 03 baris 3 dan 174: v1.6; 05 §7 baris 112: v1.7; README.md: salinan v1.7 |
| I8 | Nama dan lokasi file dokumen | Repo: docs/GDD.md, docs/03_REKOMENDASI_Stack_Struktur_dan_Kontrak.md, docs/04_UI_Screens_dan_Prompts.md | 05 §2: `00_PROJECT_INSTRUCTIONS.md` dan `01_GDD_Pejuang_UMR_v1_9.md` (tidak ada di repo). Permintaan audit menyebut `docs/03_REKOMENDASI.md` dan `docs/04_UI_SCREENS.md` |
| I9 | Isi folder docs dan e2e | 03 §2: docs berisi GAME_RULES.md dan GAME_STATE.md, ada folder `e2e/` | Repo dan CLAUDE.md: keduanya tidak ada |
| I10 | Port server | API_CONTRACT §0, 05 §5: 3001 | apps/server/.env.example, apps/web/.env.example, CI: 3002 (bukan dokumen, tetapi berlaku sebagai konfigurasi resmi) |

---

## 4. Stack di luar daftar

Stack yang terdokumentasi (03 §1, 05 §5): Next.js, React, TypeScript, Tailwind, socket.io dan socket.io-client, zod, vitest, `@types/node`. Render papan datar dengan DOM/SVG di balik antarmuka `BoardRenderer`, lalu PixiJS jika FPS kurang. Three.js hanya jika kamera 3D memang diinginkan.

| Library | Versi | Dipakai di | Fungsi | Bertentangan dengan |
| --- | --- | --- | --- | --- |
| three | 0.186.1 | apps/web/src/app/components/game/GameBoard.tsx:8; apps/web/src/app/components/game/CharacterSprite.tsx:6 | Mesin 3D WebGL: instancedMesh heksa silinder, material, cahaya, bayangan, sprite karakter | GDD baris 13 dan v1.7 #3; 03 §1 dan §9; 05 §1, §4 dan §7; 04_UI §3; CLAUDE.md baris 3 |
| @react-three/fiber | 9.8.1 | GameBoard.tsx:6 (`Canvas`); CharacterSprite.tsx:4 (`useFrame`) | Renderer React untuk three, plus loop animasi pion | Sama dengan three |
| @react-three/drei | 10.7.9 | GameBoard.tsx:5 (`Html`, `OrbitControls`, `RoundedBox`); CharacterSprite.tsx:3 (`Html`, `useTexture`) | Kamera putar/zoom, meja 3D, label HTML di ruang 3D, pemuat tekstur | Sama dengan three; 03 §1 ("Three.js hanya jika kamera 3D diinginkan") |
| @types/three (dev) | 0.186.0 | Tipe untuk three | Tipe TypeScript | Sama dengan three |
| zustand | 5.0.15 | **Tidak dipakai** di apps/web/src (tidak ada impor, tidak ada di bundle) | Pengelola state (rencana) | Tidak tercantum di 03 maupun 05 |

Catatan: `@tailwindcss/turbopack` 4.3.3 (apps/web/next.config.ts:8) adalah loader pendukung Tailwind. Tailwind sendiri tercantum di 05 §5, jadi loader ini tidak dianggap bertentangan.

Ukuran yang terukur dari build saat ini: chunk terbesar apps/web/.next/static/chunks/3-vt-j5ub6s_-.js berisi WebGLRenderer, berukuran 961.606 byte mentah atau sekitar 255 KB gzip. Seluruh folder chunks berukuran 1,7 MB. Performa di HP Android kelas menengah **tidak bisa dipastikan** karena belum ada uji perangkat.

### Penyesuaian yang perlu dilakukan

#### Jalur A: pertahankan library dan perbarui dokumen

Langkah:
1. docs/GDD.md: ubah catatan Platform di baris 13 dan Profil Game, lalu tambah entri revisi (v1.10) yang menyatakan papan 3D dengan sprite karakter. Catatan v1.7 #3 tetap disimpan sebagai riwayat. **Kecil.**
2. docs/03_REKOMENDASI_Stack_Struktur_dan_Kontrak.md: ubah §1 (Render papan, Three.js) dan §9 baris 192, lalu tambahkan three, @react-three/fiber, dan @react-three/drei ke stack. **Kecil.**
3. docs/05_PROJECT_STATE.md: ubah §1 (label papan datar), §4 Antarmuka baris 49, daftar versi baris 72, dan §7 langkah 4. **Kecil.**
4. docs/02_DESIGN.md: baris 250 dan 262 sudah 3D. Selaraskan "Arah Visual Aktual" baris 180 ("papan heksa datar tampak atas"), lalu tambahkan aturan performa (dpr, bayangan, opsi kurangi gerakan) dan fallback saat WebGL tidak tersedia. **Kecil.**
5. docs/04_UI_Screens_dan_Prompts.md §3 baris 38 dan CLAUDE.md baris 3: ganti label papan datar atau "Tidak perlu Three.js". **Kecil.**
6. Putuskan nasib zustand: dicatat di stack atau dibiarkan tidak dipakai. **Kecil.**
7. Tambahan teknis yang dibutuhkan agar 3D memenuhi aturan lain di 02_DESIGN: navigasi keyboard Tab/Enter ke heksa di dalam canvas, label pembaca layar, fallback tanpa WebGL, dan uji FPS di Android menengah. **Sedang.**

Konsekuensi:
- Bundle: chunk three sekitar 255 KB gzip tetap ada. Waktu muat awal di jaringan seluler lebih lama.
- HP: render WebGL dengan `shadows`, shadow map 1024, `dpr` sampai 1,6, dan `powerPreference: "high-performance"` (GameBoard.tsx:153-154, 203-206) berisiko panas dan boros baterai saat main sekitar 30 menit. Dampak nyata tidak bisa dipastikan tanpa uji perangkat.
- Kartu yang belum dikerjakan (heksa menyala dan klik Detail Heksa, glow Petak Emas, Heksa Mati retak, animasi Reveal Realita, tooltip istilah, akses keyboard) harus dibangun di dalam scene 3D: raycasting, `Html` drei, dan shader atau material untuk glow. Pekerjaan ini umumnya lebih rumit daripada DOM/SVG.
- Gambar desain yang sudah dibuat bergaya datar (04_UI §3), sehingga aset visual perlu disesuaikan atau dibuat ulang untuk sudut kamera 3D.
- Pekerjaan yang sudah ada (GameBoard, CharacterSprite, uji data/game.ts) tidak terbuang.

#### Jalur B: ganti ke implementasi sesuai dokumen (papan datar SVG/DOM)

Langkah:
1. Buat renderer datar (SVG) di balik antarmuka `BoardRenderer` (03 §1) untuk menggantikan apps/web/src/app/components/game/GameBoard.tsx. Gunakan heksa flat-top, 4 state (tertutup, menyala, terbuka, mati), dan ikon kategori. **Sedang.**
2. Ganti apps/web/src/app/components/game/GameCharacters.tsx dan CharacterSprite.tsx dengan pion SVG (`<image>` sprite PNG atau bentuk warna) beserta transisi CSS untuk gerak pion. **Kecil sampai sedang.**
3. apps/web/src/data/game.ts: ganti `hexToWorld` dan ukuran meja dengan `hexToPixel` (axial ke piksel flat-top), lalu perbarui apps/web/src/data/game.test.ts. **Kecil.**
4. apps/web/src/app/components/game/GameInterface.tsx:126 (petunjuk drag/zoom) dan apps/web/src/app/globals.css (`.board-canvas`): sesuaikan. **Kecil.**
5. three, @react-three/fiber, @react-three/drei, dan @types/three tidak lagi dipakai. Mengubah apps/web/package.json dan package-lock.json butuh izin pengguna (CLAUDE.md). **Kecil.**
6. Logika state (`PublicGameState`, game-view.ts, Scoreboard, StatusPanel) tidak berubah.

Konsekuensi:
- Bundle: chunk three sekitar 255 KB gzip hilang. Besar penghematan pastinya baru diketahui setelah build ulang.
- HP: SVG dengan sekitar 127 elemen umumnya ringan dan tidak memerlukan GPU khusus. 03 §1 menyediakan jalan ke PixiJS jika nanti FPS kurang.
- Kartu yang belum dikerjakan lebih mudah: heksa SVG bisa diberi `tabIndex`, `aria-label`, dan event klik langsung untuk Detail Heksa, akses keyboard, dan tooltip. Glow, retak, dan animasi cukup dengan CSS. Hasilnya cocok dengan gambar desain datar yang sudah ada.
- Rotasi dan zoom kamera, bayangan, serta tampilan meja 3D hilang. Komponen 3D yang sudah ditulis (sekitar 400 baris) tidak terpakai.

---

## 5. Daftar perbaikan berurutan

Urutan dari yang paling mendesak. Semua temuan Tinggi dan Sedang, satu baris per temuan.

| Urutan | # | Tingkat | Perbaikan | Kartu backlog yang cocok |
| --- | --- | --- | --- | --- |
| 1 | M1 | Tinggi | Host tidak perlu Siap; `room:ready` dari host ditolak `INVALID_PAYLOAD`; perbarui tes dan UI | Server: Room (+ Web: Room) |
| 2 | M2 | Tinggi | Beri pion pertama yang kosong saat create/join | Server: Room |
| 3 | G1 | Tinggi | Putar urutan giliran dari urutan bulan sebelumnya yang sudah tanpa pemain tereliminasi | Engine: Giliran, kalender, musim |
| 4 | G2 | Tinggi | Cek Burnout Total setelah efek Event Tanggal | Engine: Giliran, kalender, musim |
| 5 | T1 | Tinggi | Jangan percaya `X-Forwarded-For` kecuali di balik proxy yang dikonfigurasi | Server: Sesi tamu (REST) |
| 6 | B1 | Tinggi | Putuskan Jalur A atau Jalur B (Bagian 4) | Web: Papan heksa datar |
| 7 | M6 | Sedang | Simpan `GameState` engine lengkap (`createGame`), kirim `player:status` awal, isi `me.status` di snapshot | Server: Room (lanjutan, sebelum kartu game loop server) |
| 8 | S1 | Sedang | Samakan port server di config, .env.example, CI, dan dokumen | Setup: Monorepo dan uji sambungan |
| 9 | M3 | Sedang | Bentuk respons `GET /api/v1/rooms/:code` sesuai kontrak, tanpa daftar pemain; perbarui tes | Server: Room |
| 10 | M5 | Sedang | `session:resume` mengembalikan `NOT_IN_ROOM` untuk non-anggota | Server: Room |
| 11 | M4 | Sedang | Kode room tidak valid dijawab `400 INVALID_PAYLOAD` | Server: Room |
| 12 | G3 | Sedang | Tetapkan Beban Peringkat 1 di Fase Kalender mulai Langkah 5 | Engine: Skor dan peringkat / Engine: Giliran |
| 13 | K1 | Sedang | Hitung Skor Sementara awal dari status awal | Engine: Skor dan peringkat |
| 14 | G4 | Sedang | Tes rotasi giliran lintas bulan dengan pemain tereliminasi | Engine: Giliran, kalender, musim |
| 15 | W1 | Sedang | Deteksi `version` melompat lalu panggil `session:resume` | Web: Fondasi UI dan klien socket |
| 16 | W2 | Sedang | Peta kode error ke teks UI API_CONTRACT §15 | Web: Fondasi UI dan klien socket |
| 17 | T2 | Sedang | Tolak ubah nama saat pemain berada di Room atau game | Server: Sesi tamu (REST) |
| 18 | M7 | Sedang | Rate limit event Socket.IO | Server: Room |
| 19 | B2 | Sedang | Pion dengan pasangan warna dan bentuk tetap | Web: Papan heksa datar |
| 20 | B3 | Sedang | Tampilkan Skor Sementara dalam format Rupiah | Web: Papan heksa datar |
| 21 | B4 | Sedang | Konfirmasi lisensi aset karakter atau ganti aset | Web: Papan heksa datar |
| 22 | O1 | Sedang | Lengkapi Home dan Lobby sesuai GDD 9.1-9.2 | Web: Home |
