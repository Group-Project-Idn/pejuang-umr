# API Contract - Pejuang UMR: Jakarta Survival (MVP)

Versi 0.7 · 14 Oktober 2026 · Sumber aturan: GDD v1.14 · Sumber stack: 03_REKOMENDASI

**Perubahan v0.7 (GDD v1.14, hanya dicatat; skema di `packages/shared` dan kode diubah di prompt berikutnya):**

> Catatan versi: permintaan awal menyebut "naikkan ke v0.5", tetapi kontrak ini sudah di v0.6, jadi versi baru adalah v0.7.

1. **Jadwal Petak Emas:** `gold:spawned` kini hanya di awal Langkah 5, 9, 13, 17, 21 (5 kali). Langkah 1 dihapus, jadi tidak ada `gold:spawned` di ronde pertama. Judul Petak Emas berasal dari 5 dari 8 petak Emas, tanpa pengulangan dalam satu game (GDD 4.7).
2. **Popup serentak awal ronde (GDD 4.2):** `month:summary`, `calendar:event`, `season:changed`, `gold:spawned`, dan pemberitahuan Beban Peringkat 1 ditampilkan klien dalam satu grid dengan **satu hitung mundur bersama**. Server memakai satu `deadline` bersama: 8 detik jika semua popup hanya informasi, 15 detik jika ada keputusan (`payDebt` bukan `null` atau ada `calendar:event`). `calendar:event` tidak lagi menunggu popup Ganti Bulan selesai; keduanya dikirim bersamaan. Hitung mundur selesai lebih cepat jika semua keputusan sudah dijawab. Waktu habis: Bayar Hutang Rp0, Event Tanggal dianggap `skip`. Keputusan D2 (popup Ganti Bulan tanpa debtor ditutup setelah `MONTH_SUMMARY_ONLY_MS` 3 detik) diganti: tanpa keputusan, hitung mundur 8 detik. Usulan field: `deadline` bersama dan penanda `needsDecision` per popup di state publik; bentuk pastinya ditetapkan di prompt skema.
3. **Fase Pembalikan (GDD 4.2):** urutan event tidak berubah. Animasi papan menjadi gelombang dari heksa ronde itu. Setelah animasi, `invite:resolved`, `doom:triggered`, dan `player:eliminated` ditampilkan klien sebagai kartu hasil pribadi serentak dengan hitung mundur 8 detik (informasi saja, ada tombol X yang hanya menutup di layar sendiri). Server perlu memasukkan jeda kartu ini ke `revealEndsAt` (bentuk field ditetapkan di prompt skema).
4. **Event dev:** `dev:finish-game` (C→S, host saja) dan room uji `UMR-0099`, hanya saat `DEV_TOOLS=true`. **Bukan bagian dari 46 event produksi** (Bagian 18).
5. **Isi papan dan konten (GDD 4.1, 5):** tidak ada perubahan payload. `TileView.title` dan `plan` tetap; `reality` kini berasal dari Tumpukan Realita per kategori. Hadiah `GoldTile.plan` maksimal Rp10.000.000.

**Perubahan v0.6 (penutupan celah snapshot T11):** semua field baru wajib, divalidasi skema Zod, diisi server, dan ikut `game:patch` bila berubah.

1. `PublicGameState.revealOrder` (id pemain menurut urutan giliran ronde ini; `[]` di luar `phase` = `"reveal"`) dan `PublicGameState.revealStepMs` (durasi pembalikan per heksa dari konfigurasi server). `round:reveal` dan `game:started` juga membawa `revealStepMs`. Web tidak lagi menurunkan urutan sendiri dan tidak memakai konstanta 2.500 ms. Op `game:patch` baru: `revealOrder`.
2. `PublicGameState.eliminationReasons`: daftar `{ playerId, reason }` untuk pemain yang tereliminasi (alasan sudah publik lewat `player:eliminated`). Layar Eliminasi memakainya. Op `game:patch` baru: `eliminationReasons` (daftar lengkap).
3. `CalendarInfo.seasonHint` (string): keterangan musim tetap ada setelah snapshot; op `calendar` otomatis membawanya. `season:changed` tetap membawa `hint` dengan teks yang sama.
4. `packages/shared` mengekspor tipe `DoomTriggeredPayload`, `CalendarResultPayload`, `EliminationReason`, dan `EliminationReasonEntry`; web memakainya.

**Perubahan v0.3 (GDD v1.12):** Realita dibuka di Fase Pembalikan (`round:reveal`), Bayar Hutang lewat `month:pay-debt`, `room:pawn` diganti `room:avatar`, `turn:timer` dan `spectate:enter` dihapus, `reflection:ready` ditambah, skor 0-100, motif Ajakan hanya Tulus/Komisi, papan selalu radius 6, semua nilai 1×.

**Perubahan v0.4 (sesuai kode setelah migrasi G1-G7):** kontrak ini sekarang mencerminkan kode di `packages/shared` apa adanya. Field dan event lama sudah dihapus dari kode, `avatarId` hanya menerima 4 karakter, `invite:send` wajib membawa `turnId`, dan `tile:resolved` tidak lagi membawa `turnId`. Ditambah: aturan host saat game selesai dan Main Lagi (D7), `player:status` setelah Doom, kalender selama jeda Fase Pembalikan, validasi snapshot, dan config Refleksi. Daftar event dikunci oleh tes `packages/shared/src/socket/contract-events.test.ts`.
**Perubahan v0.5 (penutupan celah kontrak T1):**

1. `round:reveal` membawa `revealEndsAt`, dan `PublicGameState.revealEndsAt` (angka saat `phase` = `"reveal"`, selain itu `null`) agar snapshot saat reconnect tahu kapan animasi selesai.
2. `PublicGameState.inviteBusyPlayerIds` dan op `game:patch` baru `inviteBusy` (id target yang punya Ajakan belum dijawab, tanpa motif, isi, atau pengirim).
3. `Snapshot.me.inviteResults`: payload `invite:resolved` milik pemain itu dari Fase Pembalikan terakhir, dikosongkan saat ronde berikutnya dimulai.
4. Server sekarang mengirim op `game:patch` `phase` setiap `public.phase` berubah (Keputusan Terbuka #12 diputuskan).
5. `ping:test` hanya didaftarkan saat `NODE_ENV=test` (Keputusan Terbuka #11 diputuskan).

Scope: **Multiplayer 2-4 pemain, 24 langkah, pemain tamu.** Solo, login, dan database tidak ada di kontrak ini.

**Cara membaca.** Setiap endpoint dan event ditulis dengan pola yang sama:

- **Arah**: C→S (klien ke server), S→R (server ke semua pemain di room), S→C (P) (server ke satu pemain, privat).
- **Layar**: layar atau overlay yang memakainya.
- **Aksi**: tombol atau kejadian yang memicunya.
- **Payload / Respons**: bentuk data (TypeScript, nanti jadi skema Zod di `packages/shared`).
- **Catatan**: aturan GDD yang perlu diingat dan error yang mungkin muncul.

Kontrak hanya mendefinisikan **bentuk data**. Keputusan aturan (boleh atau tidak) selalu di server.

---

## 0. Ringkasan

| Jenis        | Jumlah                  | Keterangan                                                                           |
| ------------ | ----------------------- | ------------------------------------------------------------------------------------ |
| REST         | 3                       | `POST /api/v1/guest`, `GET /api/v1/rooms/:code`, `GET /health`                       |
| Socket.IO    | 46                      | 44 dari 03_REKOMENDASI + 2 tambahan bertanda **[+]** (`room:kicked`, `room:rematch`). Di luar itu ada `ping:test` (C→S) yang hanya didaftarkan saat `NODE_ENV=test`; lihat Keputusan Terbuka #11. Juga `dev:finish-game` (C→S) yang hanya didaftarkan saat `DEV_TOOLS=true`, di luar 46 event produksi (Bagian 18) |
| Server lokal | `http://localhost:3002` | REST dan Socket.IO di port yang sama                                                 |
| Web lokal    | `http://localhost:3000` | Next.js                                                                              |

---

## 1. Konvensi

### 1.1 Nama field

Nama field dan nilai enum di kode memakai bahasa Inggris. Teks yang tampil di UI tetap memakai istilah glosarium GDD.

| Glosarium GDD                                         | Di kode                                           |
| ----------------------------------------------------- | ------------------------------------------------- |
| Kekayaan / Hutang / Kesehatan / Level Stress          | `wealth` / `debt` / `health` / `stress`           |
| Rencana / Realita                                     | `plan` / `reality`                                |
| Zonk / Aman / Hoki                                    | `zonk` / `safe` / `lucky`                         |
| Heksa / Petak                                         | `hex` / `tile`                                    |
| Langkah / Ronde / Bulan                               | `step` / `round` / `month`                        |
| Petak Emas                                            | `gold`                                            |
| Fase Pembalikan                                       | `reveal` (event `round:reveal`)                   |
| Refleksi AI                                           | `reflection`                                      |
| Skor Sementara / Beban Peringkat 1                    | `provisionalScore` / `rankOneBurden`              |
| Ajakan / Kartu Ajakan                                 | `invite` / `inviteCard`                           |
| Musim Hujan / Kemarau / Pancaroba                     | `rainy` / `dry` / `transition`                    |
| Kategori Kerja / Sosial / Kesehatan / Keuangan / Emas | `work` / `social` / `health` / `finance` / `gold` |

### 1.2 Ack (wajib untuk semua event C→S)

Setiap event C→S dikirim dengan callback. Server selalu membalas satu kali.

```ts
// Klien
socket.emit("turn:choose", { requestId, turnId, hex }, (res: Ack) => { ... });

type Ack<T = {}> =
  | ({ ok: true } & T)
  | { ok: false; error: ErrorCode; message?: string };
```

### 1.3 requestId

Setiap payload C→S berisi `requestId: string` (UUID dari `crypto.randomUUID()`). Jika server menerima `requestId` yang sama dua kali (misalnya klien mengirim ulang setelah koneksi goyang), server mengembalikan ack yang sama tanpa memproses ulang. Server mengingat `requestId` selama **60 detik** per pemain.

### 1.4 version (state publik)

- Semua event S→R selama game membawa `version: number` yang naik 1 setiap ada perubahan publik.
- Klien menyimpan `lastVersion`. Jika event datang dengan `version !== lastVersion + 1`, klien memanggil `session:resume` untuk meminta snapshot ulang.
- Event privat (S→C P) **tidak** memakai version. Isinya selalu state lengkap (misalnya `player:status` selalu mengirim keempat indikator), jadi aman diterima ulang.

### 1.5 deadline

Semua batas waktu dikirim sebagai `deadline: number` (epoch ms waktu server), bukan tick tiap detik. Klien menghitung mundur sendiri. Untuk menghindari jam HP yang meleset, `session:snapshot` dan `game:started` membawa `serverTime`, dan klien menyimpan selisihnya (`offset = serverTime - Date.now()`).

Server menjadi acuan batas waktu (GDD 9.4 v1.12). Aksi yang tiba lebih dari **500 ms** setelah `deadline` ditolak, lalu aturan waktu habis berlaku. **Tidak ada timer yang dijeda** dalam keadaan apa pun.

Secara inklusif, aksi pada `deadline + 500 ms` masih diterima; mulai `deadline + 501 ms` server menjalankan aturan waktu habis. `deadline` yang dikirim ke klien tetap batas nominal dan tidak ditambah 500 ms.

### 1.6 Angka

- Uang dalam **Rupiah bulat** (`number`), misalnya `5000000`. Format "Rp5,7jt" atau "Rp5.730.000" dibuat di klien (util di `shared`).
- Kesehatan dan Level Stress `0-10`.
- Semua nilai dipakai apa adanya (1×), tanpa pengali Multiplayer (GDD 1.3 v1.12).
- Skor Sementara dan Skor Kesejahteraan berupa angka desimal 0-100 (GDD 6.2 v1.12). Klien menampilkannya sebagai bilangan bulat.

### 1.7 Koordinat heksa

Koordinat axial `{ q, r }`, heksa flat-top, pusat papan `{ q: 0, r: 0 }`. Papan Multiplayer selalu `boardRadius: 6` (127 heksa) untuk 2-4 pemain (GDD 4.1 v1.12). Klien bisa membangun seluruh bentuk papan dari angka ini, jadi server tidak perlu mengirim daftar heksa tertutup.

### 1.8 Privasi data (ringkas dari 03_REKOMENDASI Bagian 6)

| Data                                                 | Dikirim ke                                                                   |
| ---------------------------------------------------- | ---------------------------------------------------------------------------- |
| Isi heksa tertutup                                   | Tidak pernah dikirim                                                         |
| 3 heksa menyala + detail Rencana + risiko            | Hanya pemain aktif (`turn:options`)                                          |
| Heksa terbuka (Rencana), posisi pion, Skor Sementara | Semua (`tile:opened`, `game:patch`)                                          |
| Id target yang punya Ajakan belum dijawab            | Semua (`inviteBusyPlayerIds`, op `inviteBusy`); tanpa motif, isi, atau pengirim |
| Hasil Realita                                        | Semua, di Fase Pembalikan (`tile:resolved`)                                  |
| Kekayaan, Hutang, Kesehatan, Level Stress            | Hanya pemiliknya (`player:status`)                                           |
| Motif Ajakan                                         | Pengirim (`invite:card`), lalu target di Fase Pembalikan (`invite:resolved`) |
| Refleksi AI                                          | Hanya pemiliknya (`reflection:ready`)                                        |
| Petak Emas (posisi dan isi)                          | Semua (`gold:spawned`)                                                       |

### 1.9 Batas laju (rate limit)

- Semua event C→S: maksimal **20 event per 5 detik per socket**. Kelebihan dijawab ack `{ ok: false, error: "RATE_LIMITED" }`, koneksi tidak diputus.
- `emote:send` punya batas tambahan: **1 emote per 3 detik per pemain**.
- `POST /api/v1/guest`: 10 request per menit per IP. Header `X-Forwarded-For` hanya dipakai jika server diset `TRUST_PROXY=true`.

---

## 2. Peta Layar → API

Pakai tabel ini untuk tahu layar mana memanggil apa.

| Layar / overlay                       | Aksi pengguna atau kejadian                     | API                                                                                                                       |
| ------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Home**                              | Tekan Mabar                                     | Jika belum ada sesi tamu di `localStorage`: buka popup tamu. Jika ada: ke Lobby. Tidak memanggil server                   |
| Home                                  | Singel, Ajang Flexing, ikon Portal              | Tidak ada (nonaktif)                                                                                                      |
| **Popup Masuk sebagai tamu**          | Isi nama + avatar, tekan tombol utama           | `POST /api/v1/guest`                                                                                                      |
| Popup (mode Edit Profile, dari Lobby) | Ubah nama/avatar (karakter)                     | `POST /api/v1/guest` dengan header `Authorization`                                                                        |
| **Lobby**                             | Halaman dibuka                                  | `GET /health` (chip "Server ...: Normal" dan kondisi server bermasalah)                                                   |
| Lobby                                 | Kartu "Lanjutkan permainan"                     | `GET /api/v1/rooms/:code` (kode terakhir dari `localStorage`), lalu `session:resume`                                      |
| Lobby                                 | Buat Room (Host)                                | `room:create`                                                                                                             |
| Lobby                                 | Isi kode, tekan Gabung / Enter                  | `GET /api/v1/rooms/:code` (cek cepat), lalu `room:join`                                                                   |
| **Room (Ruang Tunggu)**               | Masuk halaman / ada perubahan                   | `room:state` (diterima)                                                                                                   |
| Room                                  | Pilih karakter (pion)                           | `room:avatar`                                                                                                             |
| Room                                  | Host pilih 15 / 30 / 60 dtk                     | `room:timer`                                                                                                              |
| Room                                  | Tamu tekan SIAP                                 | `room:ready`                                                                                                              |
| Room                                  | Host tekan "..." → Keluarkan                    | `room:kick` → target menerima `room:kicked` [+]                                                                           |
| Room                                  | Keluar / Kembali                                | `room:leave`                                                                                                              |
| Room                                  | Host tekan MULAI                                | `game:start` → `room:countdown` → `game:started`                                                                          |
| Room varian E (Menyambungkan ulang)   | Socket tersambung lagi                          | `session:resume` → `session:snapshot`                                                                                     |
| **Game Board**                        | Awal ronde (Fase Kalender)                      | `game:patch`, `season:changed`, `gold:spawned` / `gold:expired`, `invite:card`                                            |
| Game Board                            | Giliran mulai                                   | `turn:start` (semua), `turn:options` (pemain aktif)                                                                       |
| Game Board                            | Pemain lain putus/sambung                       | `player:connection`                                                                                                       |
| **Popup Detail Heksa**                | Klik heksa menyala (tanpa hover)                | **Tidak ada request.** Detail ketiga heksa sudah dikirim di `turn:options`                                                |
| Popup Detail Heksa                    | Klik heksa terbuka (semua pemain)               | **Tidak ada request.** Data dari `openedHexes` di state publik                                                            |
| Popup Detail Heksa                    | PILIH HEKSA INI / AMBIL PETAK EMAS              | `turn:choose`                                                                                                             |
| **Overlay Jalan Buntu**               | Tidak ada heksa menyala                         | `turn:dead-end` → `turn:jump`                                                                                             |
| **Fase Berjalan**                     | Pion pindah, Rencana berlaku                    | `tile:opened`                                                                                                             |
| **Fase Pembalikan**                   | Akhir ronde, heksa dibalik berurutan            | `round:reveal` → `tile:resolved` (per pemain) → `invite:resolved` → `doom:triggered` → `player:eliminated` → `game:patch` |
| **Grid popup serentak** (v0.7)         | Awal ronde, satu hitung mundur bersama          | `month:summary`, `calendar:event`, `season:changed`, `gold:spawned` diterima bersamaan; keputusan lewat `month:pay-debt` dan `calendar:answer` |
| **Popup Ganti Bulan**                 | Bulan berganti, geser slider Bayar Hutang       | `month:summary` → `month:pay-debt`                                                                                        |
| **Popup Event Tanggal**               | Event muncul serentak                           | `calendar:event` → `calendar:answer` → `calendar:result`                                                                  |
| **Overlay Doom Spending**             | Level Stress ≥ 9 di Fase Pembalikan             | `doom:triggered`                                                                                                          |
| **Banner musim / Petak Emas**         | Musim ganti, Petak Emas muncul/hilang           | `season:changed`, `gold:spawned`, `gold:expired`                                                                          |
| **Layar Eliminasi**                   | Bangkrut / Burnout Total                        | `player:eliminated` → `reflection:ready` → Kembali ke Lobby: `room:leave`                                                 |
| **Ajakan** (pilih target)             | Fase Pilihan sendiri: kartu → pion → konfirmasi | `invite:send`                                                                                                             |
| Ajakan (masuk)                        | Popup diterima, Ikut / Tolak                    | `invite:incoming` → `invite:respond`                                                                                      |
| Ajakan (hasil)                        | Fase Pembalikan, motif terbuka                  | `invite:resolved`                                                                                                         |
| **Emote**                             | Tekan ikon smiley                               | `emote:send` → `emote:shown`                                                                                              |
| **Hasil Akhir Multiplayer**           | Langkah 24 selesai atau tinggal 1 pemain        | `game:finished`, lalu `reflection:ready`                                                                                  |
| Hasil Akhir                           | Main Lagi (host)                                | `room:rematch` [+]                                                                                                        |
| Hasil Akhir                           | Kembali ke Lobby                                | `room:leave`                                                                                                              |
| Hasil Akhir                           | Bagikan hasil                                   | Tidak ada request (gambar dibuat di klien dari `game:finished`)                                                           |
| **Pengaturan**                        | Musik, Efek suara, Notifikasi Ajakan            | Tidak ada request (disimpan di `localStorage`)                                                                            |
| **Cara Main**                         | Buka                                            | Tidak ada request (konten statis)                                                                                         |
| **Error / Reconnect**                 | Event `error`, `connect_error`, ack gagal       | Lihat Bagian 15                                                                                                           |

---

## 3. Tipe data bersama

Semua tipe ini nanti menjadi skema Zod di `packages/shared/src`.

```ts
type HexCoord = { q: number; r: number };

type Category = "work" | "social" | "health" | "finance" | "gold";
type Outcome = "zonk" | "safe" | "lucky";
type Risk = "low" | "medium" | "high"; // Rendah / Sedang / Tinggi
type Season = "rainy" | "dry" | "transition";
type CharacterId = "michael" | "raka" | "sinta" | "icha"; // karakter = avatar = pion (GDD 9.3 v1.12)
type AvatarId = CharacterId; // alias
type TurnSeconds = 15 | 30 | 60; // v1.12
type Motive = "sincere" | "commission"; // Tulus / Komisi (v1.12)

type Stat = "wealth" | "debt" | "health" | "stress";
type Effect = { stat: Stat; delta: number }; // wealth/debt dalam Rupiah, health/stress poin

type PublicPlayer = {
  playerId: string;
  name: string;
  avatarId: AvatarId; // karakter di room ini, unik dalam room (v1.12)
  connected: boolean;
};

type RoomPlayer = PublicPlayer & {
  isHost: boolean;
  ready: boolean;
  joinedAt: number;
};

type RoomState = {
  code: string; // "UMR-4821"
  status: "waiting" | "countdown" | "playing" | "finished";
  hostId: string;
  turnSeconds: TurnSeconds;
  players: RoomPlayer[]; // maksimal 4
  maxPlayers: 4;
  canStart: boolean;
  startBlockReason: null | "NEED_MIN_PLAYERS" | "WAITING_READY";
};

type RevealedReality = {
  outcome: Outcome;
  text: string; // "Bos marah"
  effects: Effect[];
  seasonal: boolean;
};

type OpenedHex = {
  hex: HexCoord;
  category: Category;
  title: string; // "Lembur Proyek"
  plan: Effect[]; // v1.12: untuk popup detail heksa terbuka
  reality: RevealedReality | null; // null sampai Fase Pembalikan, atau untuk Petak Emas
  byPlayerId: string;
  step: number;
};

type GoldTile = {
  goldId: string;
  hex: HexCoord;
  title: string; // "Menang Undian Bank BUMN"
  plan: Effect[];
  expiresAtStep: number; // hilang saat langkah ini dimulai, heksa kembali ke petak asli
};

type ScoreRow = {
  playerId: string;
  provisionalScore: number; // Skor Sementara 0-100 (desimal), diperbarui di Fase Pembalikan
  rank: number;
  eliminated: boolean; // skor dibekukan saat eliminasi
};

type CalendarInfo = {
  step: number; // 1-24
  totalSteps: 24;
  round: number;
  month: number; // 1-12
  dateLabel: string; // "15 Mei"
  season: Season;
  seasonHint: string; // v0.6: "Pancaroba: petak Kesehatan lebih rawan"; sama dengan season:changed.hint
  nextEvent: { name: string; stepsLeft: number } | null; // "Kondangan Teman - 2 langkah lagi"
};

type PublicGameState = {
  version: number;
  gameId: string;
  boardRadius: 6; // v1.12: selalu 127 heksa
  calendar: CalendarInfo;
  phase: "calendar" | "turn" | "reveal" | "finished"; // v1.12
  turnOrder: string[];
  activePlayerId: string | null;
  turnDeadline: number | null;
  revealEndsAt: number | null; // v0.5: epoch ms animasi Fase Pembalikan selesai; angka hanya saat phase "reveal"
  revealOrder: string[]; // v0.6: playerId menurut urutan giliran ronde ini; [] di luar phase "reveal"
  revealStepMs: number; // v0.6: durasi pembalikan per heksa (ms), dari konfigurasi server
  eliminationReasons: { playerId: string; reason: "bankrupt" | "burnout" }[]; // v0.6
  inviteBusyPlayerIds: string[]; // v0.5: id target dengan Ajakan belum dijawab (K3)
  pawns: { playerId: string; hex: HexCoord }[];
  openedHexes: OpenedHex[];
  gold: GoldTile | null;
  scores: ScoreRow[];
  rankOneBurden: string[]; // playerId yang kena (bisa >1 jika seri)
  eliminated: string[];
};

type PrivateStatus = {
  wealth: number;
  debt: number; // Rupiah bulat >= 0, tanpa cap di tengah ronde
  debtLimit: 25000000; // batas Bangkrut: lebih dari angka ini saat Fase Pembalikan = tereliminasi
  health: number;
  stress: number;
};

type TileOption = {
  hex: HexCoord;
  category: Category;
  title: string;
  plan: Effect[]; // efek Rencana (1×)
  risk: Risk | null; // null untuk Petak Emas
  riskTags: Array<
    | { type: "rankOne"; plusPct: 15 }
    | { type: "season"; season: Season; plusPct: 10 }
    | { type: "immune"; reason: "health>=8" }
  >;
  isGold: boolean;
};

type InviteCard = {
  cardId: string;
  plan: "hangout" | "morningRun" | "jointProject" | "staycation"; // diacak bersama kartu
  planEffects: Effect[];
  motive: Motive; // hanya pemilik kartu
  expiresAtMonth: number;
};

type Reflection = {
  source: "ai" | "rules"; // "rules" = fallback insight berbasis aturan
  summary: string;
  insights: Array<{ title: string; body: string; reference?: string }>; // reference: judul buku dan penulis
};
```

`debtLimit` adalah ambang pemeriksaan Bangkrut di Fase Pembalikan, **bukan** batas pinjaman/transaksi. Pinjaman cair penuh; kekurangan Kekayaan otomatis menambah Hutang tanpa menghapus sisa. Bunga 3% dibulatkan ke Rupiah terdekat dan kekurangannya menambah Hutang. Setiap kenaikan yang melewati (bukan tepat mencapai) kelipatan Rp5.000.000 menaikkan Level Stress +1 per kelipatan; kelipatan yang sama dapat terpicu lagi setelah Hutang turun lalu naik. Pemeriksaan Bangkrut tidak dilakukan di tengah giliran atau saat ganti bulan (GDD 1.4, 2.3–2.4 v1.12).

Nilai Rencana petak, Realita, Zonk Musim, Event Tanggal, Ajakan, Petak Emas, dan Doom Spending berlaku 1× di Solo dan Multiplayer, tanpa batas ±3 per efek (GDD 1.3 v1.12). Katalog GDD 5.1–5.2 mengganti Bayar Hutang dengan Jalan-jalan; Kondangan kini -Rp250.000 dan Zonk Musim Hujan/Kemarau mengikuti GDD 3.4. Motif Ajakan hanya Tulus dan Komisi (masing-masing 50%); `InviteMotiveSchema` tidak lagi menerima `trap`. Bentuk event tidak berubah, tetapi `planEffects`, `effectsForYou`, dan hasil status memakai nilai baru (GDD 4.8 v1.12).

**Level risiko (GDD 4.3 v1.10):** `low` jika Peluang Zonk ≤ 15%, `medium` 16-34%, `high` ≥ 35%. Peluang Zonk sudah memperhitungkan Beban Peringkat 1, Musim, dan imunitas pemain yang melihat (GDD 4.3, 4.5). Persentase asli **tidak** dikirim, hanya level dan tag.

**Tag `immune` (GDD 3.4 v1.10):** hanya dikirim untuk petak kategori `health` saat `season` adalah `"transition"` dan Kesehatan pemain yang melihat ≥ 8. Petak kategori lain tidak pernah membawa tag ini.

---

## 4. REST API

Format error REST sama dengan ack: `{ ok: false, error: ErrorCode, message?: string }` plus status HTTP.

### 4.1 `POST /api/v1/guest` - Buat atau ubah sesi tamu

|       |                                                                                                                           |
| ----- | ------------------------------------------------------------------------------------------------------------------------- |
| Layar | Popup "Masuk sebagai tamu", popup yang sama dalam mode "Edit Profile"                                                     |
| Aksi  | Pertama kali membuka Lobby, menekan Mabar tanpa sesi, atau menekan "Edit Profile" di Kartu Identitas Pemain               |
| Auth  | Tidak wajib. Jika header `Authorization: Bearer <token>` valid, server **mengubah** nama/avatar dan `playerId` tetap sama |

Request:

```ts
{
  name: string;
  avatarId: AvatarId;
}
```

- `name`: di-trim, 2-20 karakter, huruf/angka/spasi dan `.-'`, lalu disaring kata kasar.
- `avatarId`: harus salah satu dari 4 karakter (`CharacterId`). Nilai lain ditolak `400 INVALID_PAYLOAD`. Token lama yang menyimpan avatar tidak sah tetap diterima; server menganggap pemain itu belum punya karakter dan memberi karakter kosong pertama saat masuk room.

Respons `201`:

```ts
{
  ok: true;
  playerId: string;
  name: string;
  avatarId: AvatarId;
  token: string; // token bertanda tangan, kunci rahasia hanya di .env server
  expiresAt: number; // usulan 7 hari
}
```

Error: `400 INVALID_PAYLOAD`, `401 UNAUTHORIZED` (token tidak valid), `409 ALREADY_IN_ROOM` (Edit Profile saat di Room atau game), `422 NAME_REJECTED` (kata kasar), `429 RATE_LIMITED` (usulan 10 request/menit per IP).

Catatan:

- Klien menyimpan `{ playerId, name, avatarId, token }` di `localStorage` (usulan key `pejuang.guest`).
- **Edit Profile hanya di Lobby** (GDD 9.1 v1.10, v1.12), tidak saat berada di Room atau game, supaya nama dan karakter di Papan Skor tidak berubah di tengah permainan. Jika request membawa token valid dan pemain itu sedang tercatat di Room atau game, server menolak dengan `409`:

```ts
{
  ok: false;
  error: "ALREADY_IN_ROOM";
  message: "Edit Profile hanya bisa di Lobby.";
}
```

### 4.2 `GET /api/v1/rooms/:code` - Cek room

|       |                                                                                          |
| ----- | ---------------------------------------------------------------------------------------- |
| Layar | Lobby (Gabung dan kartu "Lanjutkan permainan"), link undangan `/room/UMR-4821`           |
| Aksi  | Sebelum `room:join`, untuk menampilkan error lebih cepat dan menonaktifkan tombol Gabung |
| Auth  | Opsional. Jika ada token, respons menyertakan `isMember`                                 |

Path: `code` cocok dengan `^UMR-\d{4}$` (klien mengubah input ke huruf besar).

Respons `200`:

```ts
{
  ok: true;
  code: string;
  status: "waiting" | "countdown" | "playing" | "finished";
  playerCount: number;
  maxPlayers: 4;
  joinable: boolean;
  reason: null | "ROOM_FULL" | "ROOM_LOCKED";
  isMember?: boolean;      // true jika pemain ini terdaftar di room (bisa resume)
}
```

Error: `404 ROOM_NOT_FOUND`, `400 INVALID_PAYLOAD`.

Catatan:

- Kartu "Lanjutkan permainan" muncul jika `isMember === true` dan `status` adalah `waiting` atau `playing`.
- Endpoint ini hanya pengecekan. Status sebenarnya tetap diputuskan oleh `room:join` (room bisa penuh di antara dua request).

### 4.3 `GET /health` - Pemeriksaan server

|       |                                                                          |
| ----- | ------------------------------------------------------------------------ |
| Layar | Lobby (chip "Server Jakarta Pusat: Normal"), kondisi "server bermasalah" |
| Aksi  | Saat Lobby dibuka dan saat tombol "Coba lagi" ditekan                    |

Respons `200`:

```ts
{
  status: "ok";
  uptime: number;
  version: string;
  serverTime: number;
}
```

Jika request gagal atau timeout (usulan 5 detik), Lobby menampilkan kondisi server bermasalah: tombol nonaktif dan "Coba lagi".

---

## 5. Socket.IO: koneksi

```ts
const socket = io(SERVER_URL, { auth: { token } });
```

- Server memeriksa token saat handshake. Token tidak valid atau kedaluwarsa: `connect_error` dengan `message: "UNAUTHORIZED"`. Klien menghapus sesi lokal dan membuka popup tamu lagi.
- Setelah `connect`, jika `localStorage` menyimpan kode room terakhir, klien memanggil `session:resume`.
- Satu pemain = satu socket aktif. Jika pemain membuka tab kedua, socket lama diputus (usulan).

---

## 6. Sesi (4 event)

### `session:resume` · C→S

|       |                                                                                    |
| ----- | ---------------------------------------------------------------------------------- |
| Layar | Room varian E, Game Board setelah koneksi putus, Lobby kartu "Lanjutkan permainan" |
| Aksi  | Socket tersambung lagi, atau klien mendeteksi `version` melompat                   |

```ts
// payload
{
  requestId: string;
  roomCode: string;
}
// ack
Ack<{ snapshot: Snapshot }>;
```

Error: `ROOM_NOT_FOUND`, `NOT_IN_ROOM`.
Catatan: `me.inviteResults` berisi payload `invite:resolved` milik pemain ini dari Fase Pembalikan terakhir, supaya hasil yang terlewat saat putus tetap terbaca; isinya dikosongkan saat ronde berikutnya dimulai dan divalidasi dengan skema `invite:resolved`. `game.revealEndsAt` memberi tahu kapan animasi Fase Pembalikan selesai.
Catatan: server juga mengirim ulang popup yang masih berjalan (popup Ganti Bulan, Event Tanggal, Ajakan masuk, `turn:options`) beserta `deadline`-nya di dalam snapshot, supaya pemain bisa melanjutkan (GDD 9.4 v1.12).

### `session:snapshot` · S→C (P)

|       |                                                                               |
| ----- | ----------------------------------------------------------------------------- |
| Layar | Semua layar room/game (dipakai untuk menggambar ulang)                        |
| Aksi  | Dikirim sebagai isi ack `session:resume`, dan bisa didorong server bila perlu |

```ts
type Snapshot = {
  serverTime: number;
  room: RoomState;
  game: PublicGameState | null; // null jika masih di Room
  me: {
    playerId: string;
    status: PrivateStatus | null; // null jika belum mulai
    inviteCard: InviteCard | null;
    pendingTurn: TurnOptionsPayload | DeadEndPayload | null;
    pendingMonth: MonthSummaryPayload | null; // v1.12: popup Ganti Bulan yang masih terbuka
    inviteResults: InviteResolvedPayload[]; // v0.5 (K4): hasil Ajakan pemain ini dari Fase Pembalikan terakhir; kosong saat ronde berikutnya dimulai
    pendingCalendar: CalendarEventPayload | null;
    pendingInvite: InviteIncomingPayload | null;
    reflection: Reflection | null; // v1.12
  };
  result: GameFinishedPayload | null; // terisi jika game sudah selesai
};
```

### `player:connection` · S→R

|       |                                                          |
| ----- | -------------------------------------------------------- |
| Layar | Room (slot redup), Game Board (ikon putus di Papan Skor) |
| Aksi  | Pemain lain terputus atau tersambung kembali             |

```ts
{ version?: number; playerId: string; connected: boolean; at: number }
```

Catatan: pemain yang putus tetap punya giliran. Jika timer habis, heksa dipilih acak (GDD 4.3, 9.4). Popup Ganti Bulan = bayar Rp0, Event Tanggal = Tidak ikut, Ajakan = Tolak (GDD 9.4 v1.12). Tidak ada bot pengganti (GDD 9.4 v1.10).

### `error` · S→C

|       |                                                                         |
| ----- | ----------------------------------------------------------------------- |
| Layar | Toast atau layar Error                                                  |
| Aksi  | Error yang tidak terkait ack (misalnya server menutup room karena idle) |

```ts
{
  code: ErrorCode;
  message: string;
  fatal: boolean;
} // fatal: true → arahkan ke Lobby
```

Room ditutup karena tidak aktif (GDD 9.3 v1.11): `{ code: "ROOM_NOT_FOUND", message: "Room ditutup karena tidak aktif.", fatal: true }`.

---

## 7. Room (9 + 2 event)

### `room:create` · C→S

|       |                           |
| ----- | ------------------------- |
| Layar | Lobby                     |
| Aksi  | Tombol "Buat Room (Host)" |

```ts
{
  requestId: string;
}
// ack
Ack<{ room: RoomState }>;
```

Error: `ALREADY_IN_ROOM`. Pengirim menjadi Host, `turnSeconds` default 30. Klien pindah ke `/room/[code]`. Karakter pemain diambil dari profil tamunya.

### `room:join` · C→S

|       |                                               |
| ----- | --------------------------------------------- |
| Layar | Lobby, atau membuka link `/room/UMR-4821`     |
| Aksi  | Tombol "Gabung" atau Enter di kolom Kode Room |

```ts
{
  requestId: string;
  roomCode: string;
}
// ack
Ack<{ room: RoomState }>;
```

Error: `ROOM_NOT_FOUND` ("Kode room tidak ketemu."), `ROOM_FULL`, `ROOM_LOCKED`, `ALREADY_IN_ROOM`.
Catatan: pemain yang terputus dan sudah terdaftar di room yang terkunci memakai `session:resume`, bukan `room:join`. Jika karakter profilnya sudah dipakai pemain lain di room, server memberi karakter kosong pertama (GDD 9.3 v1.12).

### `room:leave` · C→S

|       |                                                        |
| ----- | ------------------------------------------------------ |
| Layar | Room (Keluar, Kembali), Hasil Akhir (Kembali ke Lobby) |
| Aksi  | Tombol keluar                                          |

```ts
{
  requestId: string;
}
// ack
Ack;
```

Catatan:

- Host keluar sebelum game: host pindah ke pemain yang masuk paling awal. Room kosong ditutup.
- Pemain yang **tereliminasi** lalu menekan Kembali ke Lobby: dikeluarkan dari room (pemain lain menerima `room:state`) dan tidak ikut Main Lagi. Jika ia host, peran host pindah. Pion dan heksanya tetap di papan, dan ia tetap muncul di `game:finished` dengan nama dan karakternya (GDD 9.4 v1.12).
- Keluar saat game berjalan (`status` `playing`) oleh pemain yang belum tereliminasi: **tidak ditolak**, ack `{ ok: true }`. Diperlakukan sama seperti koneksi putus (GDD 9.4 v1.10): pemain tetap di game dan di papan, gilirannya menunggu Timer Giliran habis lalu heksa dipilih acak, popup Ganti Bulan bayar Rp0, Event Tanggal otomatis Tidak ikut, Ajakan dihitung Tolak, dan ia bisa kembali lewat `session:resume` selama game belum selesai. Pemain lain menerima `player:connection` dengan `connected: false`.

### `room:ready` · C→S

|       |                                     |
| ----- | ----------------------------------- |
| Layar | Room varian B (tampilan tamu) dan C |
| Aksi  | Tombol "SIAP" (toggle)              |

```ts
{
  requestId: string;
  ready: boolean;
}
// ack
Ack;
```

Host tidak perlu Siap. Host yang mengirim event ini mendapat `INVALID_PAYLOAD`.

### `room:avatar` · C→S

|       |                                                        |
| ----- | ------------------------------------------------------ |
| Layar | Room                                                   |
| Aksi  | Memilih karakter (pion) yang belum dipakai pemain lain |

```ts
{
  requestId: string;
  avatarId: AvatarId;
}
// ack
Ack;
```

Error: `AVATAR_TAKEN`, `ROOM_LOCKED`. Menggantikan `room:pawn` (GDD 9.3 v1.12). Karakter unik dalam satu room dan juga tampil di Papan Skor. Saat bergabung, server memakai karakter dari profil tamu; jika sudah dipakai, server memberi karakter kosong pertama. Perubahan ini hanya berlaku di room, profil tamu tidak berubah.

### `room:timer` · C→S

|       |                                                                 |
| ----- | --------------------------------------------------------------- |
| Layar | Room, kartu "TIMER GILIRAN (diatur host)"                       |
| Aksi  | Host memilih "15 dtk", "30 dtk - Cepat", atau "60 dtk - Santai" |

```ts
{
  requestId: string;
  turnSeconds: TurnSeconds;
}
// ack
Ack;
```

Error: `NOT_HOST`, `ROOM_LOCKED` (tidak bisa diubah setelah game mulai, GDD 4.3).

### `room:kick` · C→S

|       |                                                |
| ----- | ---------------------------------------------- |
| Layar | Room, menu "..." pada slot pemain (hanya host) |
| Aksi  | "Keluarkan"                                    |

```ts
{
  requestId: string;
  targetPlayerId: string;
}
// ack
Ack;
```

Error: `NOT_HOST`, `INVALID_TARGET` (diri sendiri atau bukan anggota), `ROOM_LOCKED` (room sudah mulai). Hanya bisa saat status `waiting`. Karakter pemain yang dikeluarkan kembali tersedia (GDD 9.3 v1.11).

### `room:kicked` · S→C (P) **[+]**

|       |                                                                |
| ----- | -------------------------------------------------------------- |
| Layar | Room (pemain yang dikeluarkan) → kembali ke Lobby dengan pesan |
| Aksi  | Host mengeluarkan pemain ini                                   |

```ts
{
  roomCode: string;
}
```

Alasan ditambahkan: tanpa event ini, pemain yang dikeluarkan hanya melihat dirinya hilang dari `room:state` tanpa penjelasan.

### `room:rematch` · C→S **[+]**

|       |                          |
| ----- | ------------------------ |
| Layar | Hasil Akhir Multiplayer  |
| Aksi  | Host menekan "Main Lagi" |

```ts
{
  requestId: string;
}
// ack
Ack<{ room: RoomState }>;
```

Error: `NOT_HOST`, `INVALID_PAYLOAD` (status bukan `finished`), `NOT_ENOUGH_PLAYERS` (setelah pemain tereliminasi dan yang tidak tersambung dikeluarkan, tidak ada pemain tersisa; room tidak berubah). Sesi game lama dihapus, room kembali ke `waiting`, karakter tetap, semua `ready` jadi `false`, pemain yang tereliminasi dan yang tidak tersambung dikeluarkan, lalu `room:state` dikirim.

**Host saat game selesai (D7, GDD 9.5 v1.13):** jika host sudah tereliminasi, peran host pindah ke pemain yang belum tereliminasi dan masih tersambung dengan peringkat terbaik di `game:finished`, lalu `room:state` dikirim. Klien harus menampilkan tombol Main Lagi mengikuti `hostId` terbaru. Game berikutnya memulai `version` dari 1. Pemain lain yang menekan Main Lagi hanya pindah ke tampilan Room dan menunggu. Jika host sudah putus saat game selesai, peran host berpindah ke pemain paling awal yang masih tersambung (GDD 9.5 v1.11).

### `room:state` · S→R

|       |                                                                          |
| ----- | ------------------------------------------------------------------------ |
| Layar | Room (semua varian), Lobby setelah create/join berhasil                  |
| Aksi  | Setiap perubahan room: masuk, keluar, siap, karakter, timer, host pindah |

```ts
RoomState;
```

Tombol MULAI memakai `canStart`. Teks bantuan dari `startBlockReason`: `NEED_MIN_PLAYERS` → "Menunggu minimal 2 pemain", `WAITING_READY` → "Menunggu pemain siap".

### `room:countdown` · S→R

|       |                                                             |
| ----- | ----------------------------------------------------------- |
| Layar | Room varian D (overlay "3" dan "Papan sedang disiapkan...") |
| Aksi  | Setelah host menekan MULAI dan `game:start` diterima        |

```ts
{
  deadline: number;
  seconds: 3;
}
```

Room sudah terkunci sejak event ini.

---

## 8. Game (3 event)

### `game:start` · C→S

|       |                |
| ----- | -------------- |
| Layar | Room (host)    |
| Aksi  | Tombol "MULAI" |

```ts
{
  requestId: string;
}
// ack
Ack;
```

Error: `NOT_HOST`, `NOT_ENOUGH_PLAYERS`, `PLAYERS_NOT_READY`.

### `game:started` · S→R

|       |                                                   |
| ----- | ------------------------------------------------- |
| Layar | Transisi Room → Game Board (1 Januari, Langkah 1) |
| Aksi  | Hitung mundur selesai                             |

```ts
{
  version: number;
  serverTime: number;
  gameId: string;
  boardRadius: 6;                   // v1.12: selalu 127 heksa
  turnSeconds: TurnSeconds;
  revealStepMs: number;             // v0.6: durasi pembalikan per heksa (ms)
  turnOrder: string[];
  startPositions: { playerId: string; hex: HexCoord }[];  // 4 pemain: cincin radius 2; 2-3 pemain: cincin radius 3
  calendar: CalendarInfo;
}
```

Status awal tiap pemain dikirim lewat `player:status` (Kekayaan Rp7.500.000, Hutang 0, Kesehatan 10, Level Stress 0).

### `game:finished` · S→R

|       |                                                                                                    |
| ----- | -------------------------------------------------------------------------------------------------- |
| Layar | Hasil Akhir Multiplayer (podium, rincian skor, Bagikan hasil)                                      |
| Aksi  | Langkah 24 selesai, atau tinggal 1 pemain (atau tidak ada) yang belum tereliminasi (GDD 1.2 v1.10) |

```ts
type GameFinishedPayload = {
  version: number;
  ranking: Array<{
    rank: number;
    playerId: string;
    name: string;
    avatarId: CharacterId; // karakter room saat game dimulai
    finalScore: number; // Skor Kesejahteraan desimal 0-100
    netWorth: number; // Harta Bersih (Rupiah)
    points: { finance: number; health: number; calm: number }; // wajib, masing-masing 0-100
    eliminated: boolean;
    eliminatedAtStep: number | null;
  }>;
};
```

Catatan:

- Dikirim di akhir Fase Pembalikan saat Langkah 24 selesai, atau saat tinggal 1 pemain (atau tidak ada) yang belum tereliminasi (GDD 1.2 v1.12). Pemain yang tersisa otomatis peringkat 1.
- Peringkat: yang bertahan di atas yang tereliminasi. Antar yang tereliminasi, yang bertahan lebih lama lebih tinggi. Yang tereliminasi di Fase Pembalikan yang sama diurutkan menurut skor beku, lalu tie-breaker (Hutang lebih kecil, lalu Level Stress lebih rendah). Semua dihitung server.
- Rincian berisi Harta Bersih dan tiga poin skor (GDD 6.2, 9.5 v1.12); modifier lama tidak dikirim. Karena Poin Kesehatan dan Poin Ketenangan diturunkan langsung dari Kesehatan dan Level Stress, keduanya ikut terbuka setelah game selesai. Kekayaan dan Hutang lawan **tidak** dikirim terpisah.
- Refleksi AI menyusul lewat `reflection:ready` (privat).

---

## 9. Sinkron (2 event)

### `game:patch` · S→R

|       |                                                                                    |
| ----- | ---------------------------------------------------------------------------------- |
| Layar | Game Board: Papan Skor, mahkota, kalender, chip "Kondangan Teman - 2 langkah lagi" |
| Aksi  | Akhir Fase Pembalikan (skor), di awal ronde (kalender, Beban Peringkat 1, fase)    |

```ts
{
  version: number;
  ops: Array<
    | { type: "scores"; scores: ScoreRow[] }
    | { type: "rankOneBurden"; playerIds: string[] }
    | { type: "calendar"; calendar: CalendarInfo }
    | { type: "phase"; phase: PublicGameState["phase"] }
    | { type: "inviteBusy"; playerIds: string[] } // v0.5: daftar lengkap target sibuk saat ini
    | { type: "revealOrder"; playerIds: string[] } // v0.6: urutan Fase Pembalikan; [] saat fase berakhir
    | { type: "eliminationReasons"; reasons: { playerId: string; reason: "bankrupt" | "burnout" }[] } // v0.6: daftar lengkap
  >;
}
```

Server mengirim op `phase` setiap kali `public.phase` berubah (Keputusan Terbuka #12). Op `inviteBusy` dikirim setiap kali daftar target Ajakan sibuk berubah (Ajakan dikirim, dijawab, habis waktu, atau Fase Pembalikan menutupnya) dan selalu berisi daftar lengkap, bukan selisih. Isinya hanya id target: motif, isi Ajakan, dan pengirim tidak pernah ikut.

Op `revealOrder` dikirim setiap kali daftar urutan berubah (terisi saat Fase Pembalikan mulai, `[]` saat berakhir). Op `eliminationReasons` dikirim setiap kali ada pemain baru tereliminasi dan berisi daftar lengkap. Op `calendar` kini membawa `seasonHint` di dalam `CalendarInfo`.

Aturan pembagian: perubahan yang punya event sendiri (heksa terbuka, Petak Emas, eliminasi) tetap memakai event itu agar klien mudah menjalankan animasi. `game:patch` hanya untuk perubahan yang tidak punya event khusus. Semua event S→R tetap berbagi satu urutan `version`.

### `player:status` · S→C (P)

|       |                                                                                               |
| ----- | --------------------------------------------------------------------------------------------- |
| Layar | Kartu Status Pribadi (desktop), chip HUD (mobile), varian stres tinggi ("Awas Doom Spending") |
| Aksi  | Setiap kali satu dari empat indikator milik pemain berubah                                    |

```ts
PrivateStatus;
```

Klien menampilkan peringatan "Awas Doom Spending" jika `stress >= 8` (usulan, karena Doom terpicu di ≥ 9 saat Fase Pembalikan).

Efek Rencana langsung mengubah status saat Fase Berjalan, jadi `player:status` dikirim setelah `tile:opened` dan lagi setelah Fase Pembalikan.

---

## 10. Kalender dan bulan (6 event)

### `calendar:event` · S→R

|       |                                                             |
| ----- | ----------------------------------------------------------- |
| Layar | Popup Event Tanggal (serentak untuk semua pemain hidup)     |
| Aksi  | Awal ronde pada Langkah 1, 6, 9, 12, 16, 21 (Fase Kalender), serentak dengan popup lain (v0.7) |

```ts
type CalendarEventPayload = {
  version: number;
  eventId: string; // "new-year", "lebaran-thr", "labour-day", "wedding", "independence-day", "harbolnas" (sama dengan id di packages/engine/src/data/calendar-events.ts)
  name: string; // "Kondangan Teman"
  dateLabel: string;
  deadline: number; // 15 detik
  choices: Array<{
    id: "join" | "joinPaylater" | "skip";
    label: string;
    effects: Effect[];
    note?: string;
  }>;
};
```

Catatan: efek di popup memakai nilai 1×. `note` untuk efek peluang (misalnya "25% menang lomba: +Rp750.000"). Pilihan `joinPaylater` hanya ada di Harbolnas (lihat Keputusan Terbuka #5). Sejak v0.7, event ini dikirim bersamaan dengan popup awal ronde lain (termasuk Ganti Bulan) dan berbagi satu hitung mundur (GDD 4.2 v1.14); popup bertag "Butuh keputusanmu!" tanpa tombol X. Giliran pertama ronde dimulai setelah hitung mundur bersama selesai.

### `calendar:answer` · C→S

|       |                          |
| ----- | ------------------------ |
| Layar | Popup Event Tanggal      |
| Aksi  | Tombol Ikut / Tidak ikut |

```ts
{
  requestId: string;
  eventId: string;
  choice: "join" | "joinPaylater" | "skip";
}
// ack
Ack;
```

Error: `EVENT_CLOSED` (waktu habis), `INVALID_PAYLOAD`. Waktu habis = otomatis `skip`.

### `calendar:result` · S→C (P)

|       |                                                        |
| ----- | ------------------------------------------------------ |
| Layar | Popup Event Tanggal (hasil), lalu Kartu Status Pribadi |
| Aksi  | Setelah pemain menjawab atau waktu habis               |

```ts
{ eventId: string; choice: "join" | "joinPaylater" | "skip"; autoChosen: boolean; effects: Effect[]; flavor?: string }
```

`flavor` untuk hasil peluang (misalnya "Kamu menang lomba!" atau "Barang tidak sesuai"). Setelah ini server juga mengirim `player:status`.

### `season:changed` · S→R

|       |                                                                             |
| ----- | --------------------------------------------------------------------------- |
| Layar | Banner musim, ikon musim di kalender, efek visual (hujan, heat haze)        |
| Aksi  | Awal ronde saat musim berganti (Mar, Jun, Sep, Des) dan saat `game:started` |

```ts
{ version: number; season: Season; vulnerableCategories: Category[]; zonkFocus: "floodRain" | "heatPollution" | "sick"; hint: string } // hint: "Pancaroba: petak Kesehatan lebih rawan"; v0.6: teks sama ada di CalendarInfo.seasonHint (snapshot)
```

Hujan: rawan `work`. Kemarau: `finance`, `social`. Pancaroba: `health` (pemain dengan Kesehatan ≥ 8 kebal, dihitung per pemain di `turn:options`).

### `month:summary` · S→C (P)

|       |                                                                                          |
| ----- | ---------------------------------------------------------------------------------------- |
| Layar | Popup Ganti Bulan (rincian dan slider Bayar Hutang dalam satu popup)                     |
| Aksi  | Awal ronde pada Langkah 3, 5, 7, ..., 23 (bulan baru), serentak untuk semua pemain hidup |

```ts
type MonthSummaryPayload = {
  month: number;
  salary: 5730000;
  livingCost: 4600000;
  interest: number; // 3% dari Hutang (GDD 2.3 v1.12)
  interestAddedToDebt: number; // bagian bunga yang menjadi Hutang karena Kekayaan kurang
  before: PrivateStatus;
  after: PrivateStatus; // setelah gaji, biaya hidup, dan bunga
  payDebt: { max: number; deadline: number } | null; // null jika Hutang 0; max = min(Kekayaan, Hutang); deadline 15 detik
};
```

Urutan proses mengikuti GDD 2.4 v1.12: gaji → biaya hidup → bunga → slider Bayar Hutang. Doom Spending, Bangkrut, dan Burnout **tidak** dicek di sini, tetapi di Fase Pembalikan. Jika `payDebt` `null`, popup tetap tampil sebagai ringkasan dan ditutup otomatis saat popup pemain lain selesai (atau setelah sekitar 3 detik bila tidak ada debitur). Saat reconnect selama popup terbuka, `snapshot.me.pendingMonth` memuat ringkasan untuk semua pemain hidup; pemain tanpa Hutang atau yang sudah menjawab menerima `payDebt: null` sehingga tidak bisa membayar ulang. Setelah popup selesai, Event Tanggal (jika ada) dimulai, lalu kartu Ajakan dibagikan dan Petak Emas muncul sebelum giliran pertama.

**Lama popup (D5, diperbarui v0.7):** semua popup awal ronde berbagi satu hitung mundur (GDD 4.2 v1.14). Jika ada debtor atau Event Tanggal, server menunggu sampai semua keputusan terjawab atau `MONTH_PAY_SECONDS` (15 detik) habis. Debtor dengan Kekayaan 0 (`payDebt.max` = 0) tetap ditunggu; ia bisa menutup lebih cepat dengan membayar Rp0. Jika tidak ada keputusan sama sekali, hitung mundur 8 detik (menggantikan `MONTH_SUMMARY_ONLY_MS` 3 detik, keputusan D2 lama).

### `month:pay-debt` · C→S **(v1.12)**

|       |                                           |
| ----- | ----------------------------------------- |
| Layar | Popup Ganti Bulan                         |
| Aksi  | Geser slider lalu tekan tombol konfirmasi |

```ts
{
  requestId: string;
  month: number;
  amount: number; // 0 sampai payDebt.max, kelipatan Rp1 (klien membulatkan slider)
}
// ack
Ack<{ paid: number; debtCleared: boolean; stressDelta: 0 | -2 }>;
```

Error: `PAYMENT_CLOSED` (waktu habis atau sudah dibayar), `INVALID_PAYLOAD` (`amount` di luar batas). Pembayaran pada `payDebt.deadline + 500 ms` masih diterima; mulai `deadline + 501 ms` ditolak dan popup ditutup. Waktu habis atau pemain putus = bayar Rp0. Hanya satu pembayaran per bulan. Jika Hutang menjadi 0 dari lebih dari 0, Level Stress -2 (GDD 2.4 v1.12). Setelah ack, server mengirim `player:status`.

---

## 11. Giliran (6 event)

### `turn:start` · S→R

|       |                                                                                           |
| ----- | ----------------------------------------------------------------------------------------- |
| Layar | Game Board: bar bawah "GILIRANMU" atau "GILIRAN RAKA", timer cincin, ring pada pion aktif |
| Aksi  | Pemain berikutnya mulai Fase Pilihan                                                      |

```ts
{
  version: number;
  turnId: string;
  playerId: string;
  deadline: number;
  turnSeconds: TurnSeconds;
}
```

### `turn:options` · S→C (P, hanya pemain aktif)

|       |                                                                                                                                                            |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layar | Game Board (3 heksa menyala dengan Rencana singkat, "Klik heksa untuk lihat detail"), Popup Detail Heksa (Rencana, meter risiko, tag risiko, tombol Pilih) |
| Aksi  | Dikirim bersamaan dengan `turn:start` jika ada heksa yang bisa dimasuki                                                                                    |

```ts
type TurnOptionsPayload = { turnId: string; options: TileOption[] }; // 1-3 opsi
```

Catatan:

- Membuka detail heksa **tidak** memanggil server. Ketiga detail sudah ada di payload ini. Tidak ada hover; klik heksa menyala lain mengganti isi popup (GDD 4.3 v1.12).
- Bagian REALITA di popup selalu terkunci ("Terungkap di akhir ronde"). Server tidak mengirim varian Realita sebelum Fase Pembalikan.
- Petak Emas yang bersebelahan dan bisa dimasuki **selalu** termasuk di `options` (`isGold: true`), mengisi satu dari maksimal 3 slot (GDD 4.7 v1.11).

### `turn:choose` · C→S

|       |                                           |
| ----- | ----------------------------------------- |
| Layar | Detail Heksa                              |
| Aksi  | "PILIH HEKSA INI" atau "AMBIL PETAK EMAS" |

```ts
{
  requestId: string;
  turnId: string;
  hex: HexCoord;
}
// ack
Ack;
```

Error: `NOT_YOUR_TURN`, `TILE_NOT_LIT`, `INVALID_TILE`, `STALE_VERSION` (`turnId` sudah lewat, misalnya waktu habis duluan), `GAME_FINISHED`.

Jika waktu habis, server memilih **acak** dari heksa yang menyala, termasuk saat popup sedang terbuka tetapi Pilih belum ditekan (GDD 4.3 v1.12). Klien tidak mengirim heksa yang sedang dibuka ke server. Saat `turn:choose` diterima, server langsung mengundi hasil Realita (memakai Beban Peringkat 1, musim, dan imunitas saat itu) dan menyimpannya sampai Fase Pembalikan.

### `turn:dead-end` · S→C (P, hanya pemain aktif)

|       |                                                                                 |
| ----- | ------------------------------------------------------------------------------- |
| Layar | Overlay Jalan Buntu ("kena macet dan nyasar")                                   |
| Aksi  | Dikirim **sebagai pengganti** `turn:options` jika semua tetangga sudah terinjak |

```ts
type DeadEndPayload = {
  turnId: string;
  options: Array<TileOption & { distance: number }>;
  stressPenalty: 1;
};
```

3 heksa tertutup terdekat, berapa pun jaraknya (kurang dari 3 jika memang tidak ada).

### `turn:jump` · C→S

|       |                                    |
| ----- | ---------------------------------- |
| Layar | Overlay Jalan Buntu + Detail Heksa |
| Aksi  | Memilih heksa tujuan lompat        |

```ts
{
  requestId: string;
  turnId: string;
  hex: HexCoord;
}
// ack
Ack;
```

Error sama dengan `turn:choose`. Lompatan menggantikan langkah, Level Stress +1, lalu petak tujuan dijalankan seperti biasa.

### `tile:opened` · S→R

|       |                                                                                     |
| ----- | ----------------------------------------------------------------------------------- |
| Layar | Game Board: pion bergerak (spring), heksa terbuka dengan sisi Rencana, efek Rencana |
| Aksi  | Fase Berjalan setelah `turn:choose`, `turn:jump`, atau waktu habis                  |

```ts
{
  version: number;
  turnId: string;
  playerId: string;
  from: HexCoord;
  to: HexCoord;
  category: Category;
  title: string;
  plan: Effect[];
  isGold: boolean;
  viaJump: boolean;
  autoPicked: boolean;     // true jika dipilih acak karena waktu habis → tampilkan penanda
}
```

Efek Rencana langsung berlaku (GDD 4.2 v1.12). Setelah ini server mengirim `player:status` ke pemain aktif, lalu `turn:start` berikutnya atau `round:reveal` jika semua pemain sudah jalan. Realita **tidak** dikirim di sini.

---

## 11a. Fase Pembalikan (2 event) **(v1.12)**

### `round:reveal` · S→R

|       |                                                            |
| ----- | ---------------------------------------------------------- |
| Layar | Game Board: banner Fase Pembalikan, animasi membalik heksa |
| Aksi  | Semua pemain yang masih hidup sudah melangkah di ronde ini |

```ts
{
  version: number;
  round: number;
  step: number;
  order: Array<{ playerId: string; hex: HexCoord }>; // urutan giliran ronde ini
  revealEndsAt: number; // v0.5: waktu server saat kirim + revealStepMs × order.length
  revealStepMs: number; // v0.6: durasi pembalikan per heksa (ms), dari konfigurasi server
}
```

### `tile:resolved` · S→R

|       |                                                                                               |
| ----- | --------------------------------------------------------------------------------------------- |
| Layar | Animasi Realita (Zonk: "Realita datang tanpa permisi.", Hoki: "Sekali-sekali, semesta baik.") |
| Aksi  | Fase Pembalikan, satu event per pemain sesuai `order` (tidak dikirim untuk Petak Emas)        |

```ts
{
  version: number;
  round: number;
  playerId: string;
  hex: HexCoord;
  outcome: Outcome;
  text: string;            // "Bos marah"
  effects: Effect[];
  seasonal: boolean;       // true jika memakai Zonk Musim
}
```

Urutan lengkap Fase Pembalikan (GDD 4.2 v1.12):

1. `round:reveal`
2. `tile:resolved` untuk tiap pemain sesuai `order`, lalu `player:status` (P) ke pemain itu
3. `invite:resolved` (P) untuk setiap Ajakan di ronde ini
4. `doom:triggered` (P) bagi pemain dengan Level Stress ≥ 9, langsung diikuti `player:status` (P) ke pemain itu
5. `player:eliminated` untuk pemain yang Bangkrut atau Burnout
6. `game:patch` (`scores`), lalu `game:finished` jika Langkah 24 selesai atau tersisa 1 pemain atau kurang

Klien boleh mempercepat animasi, tetapi urutan event tidak berubah.

**Jeda dan kalender (D1):** setelah urutan di atas, server menunggu `revealStepMs` (default 2.500 ms, env `REVEAL_STEP_MS`) × panjang `order` sebelum ronde berikutnya. Selama jeda, `phase` tetap `"reveal"` dan `calendar.step` masih langkah ronde yang baru selesai. Langkah baru baru terlihat lewat `game:patch` (`calendar`) di awal ronde berikutnya.

**Ajakan terbuka (D6):** jika semua pemain sudah melangkah tetapi masih ada Ajakan yang belum dijawab, Fase Pembalikan menunggu sampai Ajakan itu dijawab atau habis waktu.

---

## 12. Petak Emas (2 event)

### `gold:spawned` · S→R

|       |                                                                                                             |
| ----- | ----------------------------------------------------------------------------------------------------------- |
| Layar | Game Board (heksa emas berkilau, label "Petak Emas"), kartu "Petak Emas - Hilang dalam 3 ronde", notifikasi |
| Aksi  | Awal Langkah 5, 9, 13, 17, 21 (v0.7: Langkah 1 dihapus)                                                     |

```ts
{
  version: number;
  gold: GoldTile;
}
```

Sisa ronde dihitung klien: `gold.expiresAtStep - calendar.step`. Posisi dipilih server: heksa tertutup di radius ≤ 4, tidak bersebelahan dengan pion mana pun, dengan jarak paling seimbang ke pemain yang masih bertahan (GDD 4.7 v1.12).

### `gold:expired` · S→R

|       |                                                                       |
| ----- | --------------------------------------------------------------------- |
| Layar | Game Board (heksa kembali menjadi heksa tertutup biasa)               |
| Aksi  | Petak Emas tidak diambil sampai kemunculan berikutnya atau akhir game |

```ts
{
  version: number;
  goldId: string;
  hex: HexCoord;
}
```

Heksa kembali ke petak aslinya dan bisa menyala lagi (GDD 4.7 v1.12); **bukan Heksa Mati**. Isi petak asli tidak dikirim. Saat game berakhir dengan Petak Emas yang belum diambil, `gold:expired` dikirim sebelum `game:finished`. Jika diambil, tidak ada `gold:expired`. Pengambilan terlihat dari `tile:opened` dengan `isGold: true`.

---

## 13. Doom Spending, eliminasi, dan Refleksi AI (3 event)

### `doom:triggered` · S→C (P)

|       |                                                             |
| ----- | ----------------------------------------------------------- |
| Layar | Overlay Doom Spending ("Checkout dulu, nyesel belakangan.") |
| Aksi  | Level Stress ≥ 9 saat dicek di Fase Pembalikan              |

```ts
{
  amount: number;
  round: number;
  stressAfter: number;
}
```

### `player:eliminated` · S→R

|       |                                                                                                                 |
| ----- | --------------------------------------------------------------------------------------------------------------- |
| Layar | Pemain sendiri: Layar Eliminasi ("Hari ini kamu perlu istirahat."). Pemain lain: banner dan tanda di Papan Skor |
| Aksi  | Bangkrut (Hutang lebih dari Rp25.000.000) atau Burnout Total, dicek di Fase Pembalikan                          |

```ts
{
  version: number;
  playerId: string;
  reason: "bankrupt" | "burnout";
  step: number;
  frozenScore: number; // Skor Sementara saat eliminasi
}
```

Alasan eliminasi tiap pemain juga tersimpan di `PublicGameState.eliminationReasons` (v0.6) sehingga Layar Eliminasi tetap benar setelah reconnect.

Pion tetap di papan dan heksanya tetap terisi. Pemain ini dilewati di urutan giliran. Layar Eliminasi berisi alasan (dari `eliminationReasons`), ringkasan pribadi (dari `player:status` terakhir) dan Refleksi AI (`reflection:ready`), lalu tombol Kembali ke Lobby (`room:leave`). Tidak ada mode penonton (GDD 9.4 v1.12).

### `reflection:ready` · S→C (P) **(v1.12)**

|       |                                                                        |
| ----- | ---------------------------------------------------------------------- |
| Layar | Kartu Refleksi AI di Layar Eliminasi dan Hasil Akhir                   |
| Aksi  | Server selesai membuat refleksi setelah eliminasi atau `game:finished` |

```ts
{
  gameId: string;
  playerId: string;
  reflection: Reflection;
}
```

Catatan (GDD 6.5 v1.12):

- Dibuat di server dari log keputusan pemain itu. Kunci API LLM hanya di server.
- Jika LLM gagal atau melewati batas waktu (usulan 15 detik), server mengirim `source: "rules"` berisi insight berbasis aturan. Klien menampilkan status memuat sampai event ini datang.
- Gagasan buku ditulis sebagai parafrase. Field `reference` berisi judul dan penulis, bukan kutipan panjang.
- Juga dikirim ulang di `session:snapshot` (`me.reflection`) jika pemain masuk kembali.

---

## 14. Ajakan (5 event) dan Emote (2 event) (v1.12)

### `invite:card` · S→C (P)

|       |                                                                    |
| ----- | ------------------------------------------------------------------ |
| Layar | Tombol "Kartu Ajakan" dengan badge "1"                             |
| Aksi  | Awal Bulan 1, 3, 5, 7, 9, 11. Kartu lama yang belum dipakai hangus |

```ts
{
  card: InviteCard | null;
  expiredCardId: string | null;
}
```

`expiresAtMonth` maksimal 12: kartu dari Bulan 11 berlaku sampai game selesai. Hanya pemain yang belum tereliminasi yang menerima kartu. Rencana dan motif (Tulus 50%, Komisi 50%) diacak saat kartu diterima. Kartu pemain yang tereliminasi hangus.

### `invite:send` · C→S

|       |                                                                                      |
| ----- | ------------------------------------------------------------------------------------ |
| Layar | Ajakan (pilih target)                                                                |
| Aksi  | Di Fase Pilihan sendiri sebelum memilih heksa: kartu → klik pion target → konfirmasi |

```ts
{
  requestId: string;
  turnId: string;
  cardId: string;
  targetPlayerId: string;
}
// ack
Ack<{ inviteId: string; deadline: number }>;
```

`turnId` wajib dan harus sama dengan `turnId` dari `turn:options` pengirim.

Error: `GAME_FINISHED`, `NO_INVITE_CARD`, `INVITE_NOT_ALLOWED` (bukan Fase Pilihan pengirim, `turnId` tidak cocok, atau heksa sudah dipilih), `INVALID_TARGET` (diri sendiri, target tereliminasi, pengirim tereliminasi, atau target sedang punya popup Ajakan aktif).

Aturan (GDD 4.8 v1.12): hanya di Fase Pilihan giliran pengirim, sebelum `turn:choose`. Jika Timer Giliran habis sebelum ack, Ajakan batal dan kartu tidak terpakai. Ajakan yang sudah terkirim tetap berjalan meski giliran pengirim berakhir. Target yang sedang putus tetap boleh diajak; popup tidak ditahan dan dihitung Tolak setelah 15 detik. Tidak ada batas jumlah Ajakan per ronde selain 1 kartu per pemain.

Jika pemain terakhir sudah selesai bergerak sementara Ajakan masih menunggu jawaban, server menahan perpindahan ke ronde berikutnya/Fase Pembalikan sampai Ajakan dijawab atau melewati deadline. Countdown Ajakan tetap berjalan dan tidak ada timer yang dijeda.

### `invite:incoming` · S→C (P, target)

|       |                                                                  |
| ----- | ---------------------------------------------------------------- |
| Layar | Popup Ajakan masuk (Rencana tanpa motif, hitung mundur 15 detik) |
| Aksi  | Ada pemain yang mengajak                                         |

```ts
type InviteIncomingPayload = {
  inviteId: string;
  fromPlayerId: string;
  fromName: string;
  plan: InviteCard["plan"];
  planEffects: Effect[];
  deadline: number; // 15 detik
};
```

`fromName` dan `deadline` diisi server (engine tidak tahu nama pemain dan waktu). **Tidak ada timer yang dijeda.** Jika giliran target dimulai saat popup masih terbuka, Timer Giliran target tetap berjalan bersamaan.

### `invite:respond` · C→S

|       |                            |
| ----- | -------------------------- |
| Layar | Popup Ajakan masuk         |
| Aksi  | Tombol "Ikut" atau "Tolak" |

```ts
{
  requestId: string;
  inviteId: string;
  answer: "join" | "decline";
}
// ack
Ack;
```

Error: `INVITE_EXPIRED`. Waktu habis = `decline`. Ack hanya mengonfirmasi jawaban tercatat; hasil dan motif baru dikirim di Fase Pembalikan.

### `invite:resolved` · S→C (P, pengirim dan target)

|       |                                                 |
| ----- | ----------------------------------------------- |
| Layar | Hasil Ajakan di Fase Pembalikan (motif terbuka) |
| Aksi  | Fase Pembalikan, setelah semua `tile:resolved`  |

```ts
{
  inviteId: string;
  fromPlayerId: string;
  targetPlayerId: string;
  answer: "join" | "decline";
  autoDeclined: boolean;
  motive: Motive;           // dibuka untuk pengirim dan target
  effectsForYou: Effect[];  // efek untuk penerima event ini
}
```

Hasil (GDD 4.8 v1.12):

| Motif        | Target ikut                                                                             | Target menolak         |
| ------------ | --------------------------------------------------------------------------------------- | ---------------------- |
| `sincere`    | Efek Rencana pada target. Level Stress -1 untuk target dan pengirim                     | Target Level Stress +1 |
| `commission` | Efek Rencana pada target, plus target Kekayaan -Rp500.000. Pengirim Kekayaan +Rp500.000 | Target Level Stress -1 |

Motif hanya dikirim ke pengirim dan target. Pemain lain tidak menerima event ini _(asumsi GDD 4.8)_. Setelah ini server mengirim `player:status` ke pihak yang berubah. Efek Ajakan ikut dicek Doom Spending, Bangkrut, dan Burnout di Fase Pembalikan yang sama. Jika pengirim tereliminasi di ronde yang sama, hasilnya tetap diterapkan.

### `emote:send` · C→S

|       |                                     |
| ----- | ----------------------------------- |
| Layar | Room dan Game Board (tombol smiley) |
| Aksi  | Pilih emote                         |

```ts
{
  requestId: string;
  emoteId: string;
}
// ack
Ack;
```

`emoteId` harus cocok `^[a-z0-9-]{1,24}$`. Daftar emote yang tampil ditentukan klien.

Error: `INVALID_PAYLOAD`, `RATE_LIMITED` (1 emote per 3 detik per pemain), `NOT_IN_ROOM`. Berlaku di Room dan saat game.

### `emote:shown` · S→R

```ts
{
  playerId: string;
  emoteId: string;
  at: number;
}
```

Tidak memakai `version` karena tidak mengubah state game.

---

## 15. Kode error dan teks UI

Kode bertanda **[+]** adalah tambahan dari daftar 03_REKOMENDASI. Daftar ini (25 kode) sama persis dengan `ERROR_CODES` di shared dan dikunci oleh tes.

| Kode                     | Arti                               | Teks UI (usulan)                                                               | Muncul di         |
| ------------------------ | ---------------------------------- | ------------------------------------------------------------------------------ | ----------------- |
| `INVALID_PAYLOAD`        | Data tidak sesuai skema Zod        | "Ada yang salah. Coba lagi."                                                   | Semua             |
| `UNAUTHORIZED` [+]       | Token tidak valid/kedaluwarsa      | "Sesi habis. Masuk sebagai tamu lagi."                                         | Handshake, REST   |
| `NAME_REJECTED` [+]      | Nama tidak lolos penyaring         | "Nama ini tidak bisa dipakai."                                                 | Popup tamu        |
| `RATE_LIMITED` [+]       | Terlalu sering                     | "Pelan-pelan dulu, coba sebentar lagi."                                        | `/guest`, emote   |
| `ROOM_NOT_FOUND`         | Kode salah                         | "Kode room tidak ketemu."                                                      | Lobby             |
| `ROOM_FULL`              | Room 4/4                           | "Room sudah penuh (4/4)."                                                      | Lobby             |
| `ROOM_LOCKED`            | Game sudah mulai                   | "Permainan sudah berjalan."                                                    | Lobby, Room       |
| `ALREADY_IN_ROOM` [+]    | Masih tercatat di room lain        | "Kamu masih ada di room lain." (`/guest`: "Edit Profile hanya bisa di Lobby.") | Lobby, `/guest`   |
| `NOT_IN_ROOM` [+]        | Resume ke room yang bukan miliknya | "Kamu tidak terdaftar di room ini."                                            | Resume            |
| `NOT_HOST`               | Aksi khusus host                   | "Hanya host yang bisa melakukan ini."                                          | Room, Hasil Akhir |
| `AVATAR_TAKEN` [+]       | Karakter sudah dipakai             | "Karakter ini sudah dipilih pemain lain."                                      | Room              |
| `NOT_ENOUGH_PLAYERS` [+] | Kurang dari 2 pemain, atau tidak ada pemain yang bisa Main Lagi | "Menunggu minimal 2 pemain" (Main Lagi: "Tidak ada pemain yang bisa main lagi. Kembali ke Lobby.") | Room, Hasil Akhir |
| `PLAYERS_NOT_READY` [+]  | Ada yang belum Siap                | "Menunggu pemain siap"                                                         | Room              |
| `NOT_YOUR_TURN`          | Bukan giliranmu                    | "Belum giliranmu."                                                             | Game Board        |
| `TILE_NOT_LIT`           | Heksa tidak menyala                | "Pilih salah satu heksa yang menyala."                                         | Detail Heksa      |
| `INVALID_TILE`           | Heksa tidak ada/terinjak           | "Heksa ini tidak bisa dipilih."                                                | Detail Heksa      |
| `STALE_VERSION`          | State klien tertinggal             | (diam-diam memanggil `session:resume`)                                         | Game Board        |
| `EVENT_CLOSED` [+]       | Waktu Event Tanggal habis          | "Waktu habis, otomatis tidak ikut."                                            | Event Tanggal     |
| `PAYMENT_CLOSED` [+]     | Waktu bayar Hutang habis           | "Waktu habis, Hutang tidak dibayar bulan ini."                                 | Popup Ganti Bulan |
| `NO_INVITE_CARD`         | Tidak punya kartu                  | "Kamu belum punya Kartu Ajakan."                                               | Ajakan            |
| `INVITE_NOT_ALLOWED` [+] | Di luar Fase Pilihan sendiri       | "Ajakan hanya bisa dikirim di giliranmu sebelum memilih heksa."                | Ajakan            |
| `INVALID_TARGET` [+]     | Target tidak sah                   | "Pemain ini tidak bisa dipilih."                                               | Ajakan, kick      |
| `INVITE_EXPIRED` [+]     | Jawaban terlambat                  | "Waktu menjawab habis."                                                        | Ajakan masuk      |
| `GAME_FINISHED`          | Game sudah selesai                 | "Permainan sudah selesai."                                                     | Game Board        |
| `INTERNAL` [+]           | Error server                       | "Server lagi bermasalah. Coba lagi."                                           | Semua             |

---

## 16. Contoh alur satu ronde (Multiplayer, 3 pemain) (v1.12)

Contoh: Langkah 9 (1 Mei, Bulan 5). Ada ganti bulan, Kartu Ajakan, Petak Emas, dan Event Tanggal (Libur Hari Buruh).

```
Fase Kalender (sekali per ronde)
S→R  game:patch          { ops: [calendar, rankOneBurden, phase] }
S→C  invite:card         (Bulan 5 = bulan ganjil)
S→R  gold:expired        (Petak Emas Langkah 5 hilang jika belum diambil)
S→R  gold:spawned        (Petak Emas baru, klien menampilkan notifikasi)
S→C  month:summary       (tiap pemain, privat, payDebt.deadline 15 dtk)
C→S  month:pay-debt      (tiap pemain yang punya Hutang)
S→C  player:status
S→R  calendar:event      (bersamaan dengan month:summary, deadline bersama 15 dtk; v0.7)
C→S  calendar:answer     (tiap pemain)
S→C  calendar:result + player:status

Giliran pemain A
S→R  turn:start          { playerId: A, deadline }
S→C  turn:options        (hanya A)
     ... A membuka popup detail (tanpa request) ...
C→S  invite:send         (opsional, sebelum memilih heksa) → S→C invite:incoming (target)
C→S  turn:choose         → ack { ok: true }   (Realita diundi, disimpan)
S→R  tile:opened
S→C  player:status       (hanya A, efek Rencana)

Giliran pemain B, C: pola sama

Fase Pembalikan
S→R  round:reveal        { order: [A, B, C] }
S→R  tile:resolved       (A, lalu B, lalu C) + player:status ke pemiliknya
S→C  invite:resolved     (pengirim dan target)
S→C  doom:triggered      (jika Level Stress ≥ 9)
S→R  player:eliminated   (jika ada)
S→R  game:patch          { ops: [scores] }
```

---

## 17. Keputusan terbuka

Status mengikuti GDD v1.14. Butir yang sudah diputuskan berlaku sebagai kontrak. Butir yang masih asumsi memakai usulan di kolom kanan sampai diputuskan.

| #   | Pertanyaan                                                             | Status dan keputusan                                                                                                                                                                           |
| --- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Pemain menekan Keluar saat game berjalan: dianggap apa?                | **Diputuskan (GDD 9.4 v1.10).** Sama seperti koneksi putus: tetap di papan, giliran menunggu timer lalu dipilih acak, bisa kembali lewat `session:resume` (lihat `room:leave`)                 |
| 2   | Room tanpa aktivitas ditutup setelah berapa lama?                      | **Diputuskan (GDD 9.3 v1.11).** 10 menit untuk room `waiting`/`finished`; 2 menit jika semua anggota putus; room `playing` hanya dihapus jika semua pemain putus 10 menit. Lihat event `error` |
| 3   | Game berakhir lebih cepat jika tinggal 1 pemain hidup?                 | **Diputuskan (GDD 1.2 v1.12).** Ya, `game:finished` dikirim di akhir Fase Pembalikan saat tinggal 1 pemain (atau tidak ada) yang belum tereliminasi                                            |
| 4   | Hasil Akhir menampilkan empat indikator semua pemain?                  | **Diputuskan (GDD 9.5 v1.12).** Harta Bersih dan tiga poin skor. Kesehatan dan Level Stress lawan ikut terbaca dari poin, Kekayaan dan Hutang tidak dikirim terpisah                           |
| 5   | Harbolnas: Paylater dipilih pemain atau otomatis saat Kekayaan kurang? | **Diputuskan (GDD 3.3 v1.10, berlaku sejak v1.8).** Pilihan terpisah (`joinPaylater`) di popup                                                                                                 |
| 6   | Ambang level risiko Rendah/Sedang/Tinggi                               | **Diputuskan (GDD 4.3 v1.10).** ≤15% / 16-34% / ≥35%                                                                                                                                           |
| 7   | Masa berlaku token tamu                                                | Asumsi: 7 hari                                                                                                                                                                                 |
| 8   | Motif Ajakan dibuka untuk siapa di Fase Pembalikan?                    | Asumsi (GDD 4.8 v1.12): hanya pengirim dan target                                                                                                                                              |
| 9   | Tampilan skor                                                          | Asumsi (GDD 6.2 v1.12): disimpan desimal, ditampilkan bilangan bulat                                                                                                                           |
| 10  | Provider dan model LLM untuk Refleksi AI                               | Belum dipilih. Lihat 03_REKOMENDASI Bagian 1                                                                                                                                                   |
| 11  | `ping:test` di server produksi                                         | **Diputuskan (v0.5).** Event C→S yang hanya dipakai tes server (koneksi, batas laju); hanya didaftarkan saat `NODE_ENV=test`                                                                   |
| 12  | Op `phase` di `game:patch`                                             | **Diputuskan (v0.5).** Server mengirimnya setiap `public.phase` berubah                                                                                                                        |
| 13  | Snapshot divalidasi seperti event                                      | **Diputuskan (G6).** Setiap field popup dan refleksi di `session:snapshot` divalidasi dengan skema event aslinya; yang gagal dikirim `null` dan dicatat di log server tanpa isi payload       |
| 14  | Config Refleksi                                                        | **Diputuskan (G6).** `REFLECTION_PROVIDER` (`none` default, `fake` hanya di luar production) dan `REFLECTION_TIMEOUT_MS` (default 15000). Maksimal 1 refleksi per pemain per game, 4 panggilan provider bersamaan |
| 15  | Room uji dan `dev:finish-game` | **Diputuskan (v0.7, GDD v1.14).** Hanya saat `DEV_TOOLS=true`, tidak pernah di production; di luar 46 event produksi. Lihat Bagian 18 |

---

## 18. Alat pengembangan: room uji dan `dev:finish-game` (v0.7, GDD v1.14)

**Bukan bagian dari 46 event produksi.** Seperti `ping:test`, event ini hanya didaftarkan pada kondisi tertentu dan tidak masuk hitungan Bagian 0 maupun daftar 46 event yang dikunci tes.

**Room uji `UMR-0099`:**

- Hanya aktif jika `DEV_TOOLS=true`. Tidak pernah aktif di production, apa pun isi `DEV_TOOLS`.
- Kode ini tidak pernah dihasilkan generator kode room. Generator tidak boleh menghasilkan `UMR-0099`.
- Host = pemain yang masuk pertama.
- Setelah game selesai atau room kosong, room kembali ke status menunggu (`waiting`) dan siap dipakai lagi.
- Aturan lain (kapasitas, Siap, Mulai, timer) sama seperti room biasa.

### `dev:finish-game` · C→S (hanya `DEV_TOOLS=true`)

|       |                                                                                                   |
| ----- | ------------------------------------------------------------------------------------------------- |
| Layar | Game Board di room uji (tombol pengembangan, tidak tampil di production)                           |
| Aksi  | Host menekan tombol selesaikan game                                                                |

```ts
{
  requestId: string;
}
// ack
Ack<{ finished: true }>;
```

Server menyelesaikan sisa langkah dengan **jawaban acak** (lewat `RandomSource`, bukan `Math.random`): pilihan heksa, Bayar Hutang, Event Tanggal, dan Ajakan. Fase Pembalikan dan cek eliminasi tetap berjalan seperti biasa. Setelah langkah terakhir, server mengirim `game:finished` yang **sama persis** dengan game biasa (termasuk `reflection:ready`). Klien tidak membedakan hasilnya dari game normal.

Error: `NOT_HOST` (bukan host), `NOT_IN_ROOM`, `GAME_FINISHED` (game sudah selesai). Di luar room uji atau saat `DEV_TOOLS` tidak `true`, event ini tidak terdaftar (server tidak menanggapi, sama seperti event yang tidak dikenal).
