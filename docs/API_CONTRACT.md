# API Contract - Pejuang UMR: Jakarta Survival (MVP)

Versi 0.1 · Oktober 2026 · Sumber aturan: GDD v1.7 · Sumber stack: 03_REKOMENDASI
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

| Jenis        | Jumlah                  | Keterangan                                                                                         |
| ------------ | ----------------------- | -------------------------------------------------------------------------------------------------- |
| REST         | 3                       | `POST /api/v1/guest`, `GET /api/v1/rooms/:code`, `GET /health`                                     |
| Socket.IO    | 45                      | 42 dari 03_REKOMENDASI + 3 tambahan bertanda **[+]** (`room:kicked`, `room:rematch`, `turn:timer`) |
| Server lokal | `http://localhost:3001` | REST dan Socket.IO di port yang sama                                                               |
| Web lokal    | `http://localhost:3000` | Next.js                                                                                            |

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
| Petak Emas / Heksa Mati                               | `gold` / `dead`                                   |
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

Setiap payload C→S berisi `requestId: string` (UUID dari `crypto.randomUUID()`). Jika server menerima `requestId` yang sama dua kali (misalnya klien mengirim ulang setelah koneksi goyang), server mengembalikan ack yang sama tanpa memproses ulang.

### 1.4 version (state publik)

- Semua event S→R selama game membawa `version: number` yang naik 1 setiap ada perubahan publik.
- Klien menyimpan `lastVersion`. Jika event datang dengan `version !== lastVersion + 1`, klien memanggil `session:resume` untuk meminta snapshot ulang.
- Event privat (S→C P) **tidak** memakai version. Isinya selalu state lengkap (misalnya `player:status` selalu mengirim keempat indikator), jadi aman diterima ulang.

### 1.5 deadline

Semua batas waktu dikirim sebagai `deadline: number` (epoch ms waktu server), bukan tick tiap detik. Klien menghitung mundur sendiri. Untuk menghindari jam HP yang meleset, `session:snapshot` dan `game:started` membawa `serverTime`, dan klien menyimpan selisihnya (`offset = serverTime - Date.now()`).

### 1.6 Angka

- Uang dalam **Rupiah bulat** (`number`), misalnya `5000000`. Format "Rp5,7jt" atau "Rp5.730.000" dibuat di klien (util di `shared`).
- Kesehatan dan Level Stress `0-10`.
- Nilai yang dikirim server **sudah memakai pengali Multiplayer** (Rupiah ×2, status ×2 maksimal ±3). Klien tidak menghitung ulang.

### 1.7 Koordinat heksa

Koordinat axial `{ q, r }`, heksa flat-top, pusat papan `{ q: 0, r: 0 }`. Klien bisa membangun seluruh bentuk papan hanya dari `boardRadius`, jadi server tidak perlu mengirim daftar heksa tertutup.

### 1.8 Privasi data (ringkas dari 03_REKOMENDASI Bagian 6)

| Data                                                      | Dikirim ke                          |
| --------------------------------------------------------- | ----------------------------------- |
| Isi heksa tertutup                                        | Tidak pernah dikirim                |
| 3 heksa menyala + detail Rencana + risiko                 | Hanya pemain aktif (`turn:options`) |
| Heksa terbuka, posisi pion, Skor Sementara, hasil Realita | Semua (`tile:*`, `game:patch`)      |
| Kekayaan, Hutang, Kesehatan, Level Stress                 | Hanya pemiliknya (`player:status`)  |
| Motif Ajakan sebelum dijawab                              | Hanya pengirim (`invite:card`)      |
| Petak Emas (posisi dan isi)                               | Semua (`gold:spawned`)              |

---

## 2. Peta Layar → API

Pakai tabel ini untuk tahu layar mana memanggil apa.

| Layar / overlay                     | Aksi pengguna atau kejadian               | API                                                                                                     |
| ----------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Home**                            | Tekan Mabar                               | Jika belum ada sesi tamu di `localStorage`: buka popup tamu. Jika ada: ke Lobby. Tidak memanggil server |
| Home                                | Singel, Ajang Flexing, ikon Portal        | Tidak ada (nonaktif)                                                                                    |
| **Popup Masuk sebagai tamu**        | Isi nama + avatar, tekan tombol utama     | `POST /api/v1/guest`                                                                                    |
| Popup (mode Ubah nama, dari Lobby)  | Ubah nama/avatar                          | `POST /api/v1/guest` dengan header `Authorization`                                                      |
| **Lobby**                           | Halaman dibuka                            | `GET /health` (chip "Server ...: Normal" dan kondisi server bermasalah)                                 |
| Lobby                               | Kartu "Lanjutkan permainan"               | `GET /api/v1/rooms/:code` (kode terakhir dari `localStorage`), lalu `session:resume`                    |
| Lobby                               | Buat Room (Host)                          | `room:create`                                                                                           |
| Lobby                               | Isi kode, tekan Gabung / Enter            | `GET /api/v1/rooms/:code` (cek cepat), lalu `room:join`                                                 |
| **Room (Ruang Tunggu)**             | Masuk halaman / ada perubahan             | `room:state` (diterima)                                                                                 |
| Room                                | Pilih warna/bentuk pion                   | `room:pawn`                                                                                             |
| Room                                | Host pilih 30 dtk / 60 dtk                | `room:timer`                                                                                            |
| Room                                | Tamu tekan SIAP                           | `room:ready`                                                                                            |
| Room                                | Host tekan "..." → Keluarkan              | `room:kick` → target menerima `room:kicked` [+]                                                         |
| Room                                | Keluar / Kembali                          | `room:leave`                                                                                            |
| Room                                | Host tekan MULAI                          | `game:start` → `room:countdown` → `game:started`                                                        |
| Room varian E (Menyambungkan ulang) | Socket tersambung lagi                    | `session:resume` → `session:snapshot`                                                                   |
| **Game Board**                      | Awal ronde                                | `game:patch`, `season:changed`, `gold:spawned` / `gold:expired`, `invite:card`                          |
| Game Board                          | Giliran mulai                             | `turn:start` (semua), `turn:options` (pemain aktif)                                                     |
| Game Board                          | Pemain lain putus/sambung                 | `player:connection`                                                                                     |
| **Detail Heksa**                    | Klik heksa menyala                        | **Tidak ada request.** Detail ketiga heksa sudah dikirim di `turn:options`                              |
| Detail Heksa                        | PILIH HEKSA INI / AMBIL PETAK EMAS        | `turn:choose`                                                                                           |
| **Overlay Jalan Buntu**             | Tidak ada heksa menyala                   | `turn:dead-end` → `turn:jump`                                                                           |
| **Reveal Realita**                  | Heksa dibalik                             | `tile:opened` lalu `tile:resolved`                                                                      |
| **Ringkasan Ganti Bulan**           | Bulan berganti                            | `month:summary`                                                                                         |
| **Popup Event Tanggal**             | Event muncul serentak                     | `calendar:event` → `calendar:answer` → `calendar:result`                                                |
| **Overlay Doom Spending**           | Level Stress ≥ 9                          | `doom:triggered`                                                                                        |
| **Banner musim / Petak Emas**       | Musim ganti, Petak Emas muncul/hangus     | `season:changed`, `gold:spawned`, `gold:expired`                                                        |
| **Layar Eliminasi**                 | Bangkrut / Burnout Total                  | `player:eliminated` → pilih Jadi penonton: `spectate:enter`                                             |
| **Ajakan** (pilih target)           | Tekan Kartu Ajakan, pilih lawan           | `invite:send`                                                                                           |
| Ajakan (masuk)                      | Popup diterima, Ikut / Tolak              | `invite:incoming` → `invite:respond`                                                                    |
| Ajakan (hasil)                      | Motif terbuka                             | `invite:resolved`                                                                                       |
| Timer Giliran dijeda                | Pemain aktif sedang menjawab Ajakan       | `turn:timer` [+]                                                                                        |
| **Emote**                           | Tekan ikon smiley                         | `emote:send` → `emote:shown`                                                                            |
| **Pause**                           | Tekan pause                               | Tidak ada request (menu pribadi, game tidak berhenti)                                                   |
| **Hasil Akhir Multiplayer**         | Langkah 24 selesai                        | `game:finished`                                                                                         |
| Hasil Akhir                         | Main Lagi (host)                          | `room:rematch` [+]                                                                                      |
| Hasil Akhir                         | Kembali ke Lobby                          | `room:leave`                                                                                            |
| Hasil Akhir                         | Bagikan hasil                             | Tidak ada request (gambar dibuat di klien dari `game:finished`)                                         |
| **Pengaturan**                      | Musik, Efek suara, Notifikasi Ajakan      | Tidak ada request (disimpan di `localStorage`)                                                          |
| **Cara Main**                       | Buka                                      | Tidak ada request (konten statis)                                                                       |
| **Error / Reconnect**               | Event `error`, `connect_error`, ack gagal | Lihat Bagian 15                                                                                         |

---

## 3. Tipe data bersama

Semua tipe ini nanti menjadi skema Zod di `packages/shared/src`.

```ts
type HexCoord = { q: number; r: number };

type Category = "work" | "social" | "health" | "finance" | "gold";
type Outcome = "zonk" | "safe" | "lucky";
type Risk = "low" | "medium" | "high"; // Rendah / Sedang / Tinggi
type Season = "rainy" | "dry" | "transition";
type PawnId =
  | "cream-circle"
  | "iceblue-square"
  | "mint-triangle"
  | "salmon-diamond";
type AvatarId = string; // "avatar-01" ... "avatar-08" (usulan)

type Stat = "wealth" | "debt" | "health" | "stress";
type Effect = { stat: Stat; delta: number }; // wealth/debt dalam Rupiah, health/stress poin

type PublicPlayer = {
  playerId: string;
  name: string;
  avatarId: AvatarId;
  pawn: PawnId | null;
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
  turnSeconds: 30 | 60;
  players: RoomPlayer[]; // maksimal 4
  maxPlayers: 4;
  canStart: boolean;
  startBlockReason: null | "NEED_MIN_PLAYERS" | "WAITING_READY";
};

type OpenedHex = {
  hex: HexCoord;
  category: Category;
  title: string; // "Lembur Proyek"
  outcome: Outcome | null; // null untuk Petak Emas
  byPlayerId: string;
  step: number;
};

type GoldTile = {
  goldId: string;
  hex: HexCoord;
  title: string; // "Beasiswa Penuh"
  plan: Effect[];
  expiresAtStep: number; // hangus saat langkah ini dimulai
};

type ScoreRow = {
  playerId: string;
  provisionalScore: number; // Skor Sementara (Rupiah)
  rank: number;
  eliminated: boolean;
};

type CalendarInfo = {
  step: number; // 1-24
  totalSteps: 24;
  round: number;
  month: number; // 1-12
  dateLabel: string; // "15 Mei"
  season: Season;
  nextEvent: { name: string; stepsLeft: number } | null; // "Kondangan Teman - 2 langkah lagi"
};

type PublicGameState = {
  version: number;
  gameId: string;
  boardRadius: 4 | 5 | 6;
  calendar: CalendarInfo;
  turnOrder: string[];
  activePlayerId: string | null;
  turnDeadline: number | null;
  turnPaused: boolean;
  pawns: { playerId: string; hex: HexCoord }[];
  openedHexes: OpenedHex[];
  deadHexes: HexCoord[];
  gold: GoldTile | null;
  scores: ScoreRow[];
  rankOneBurden: string[]; // playerId yang kena (bisa >1 jika seri)
  eliminated: string[];
  spectators: string[];
};

type PrivateStatus = {
  wealth: number;
  debt: number;
  debtLimit: 25000000;
  health: number;
  stress: number;
};

type TileOption = {
  hex: HexCoord;
  category: Category;
  title: string;
  plan: Effect[]; // efek Rencana (nilai Multiplayer)
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
  plan: "hangout" | "morningRun" | "jointProject" | "staycation";
  planEffects: Effect[];
  motive: "sincere" | "commission" | "trap"; // Tulus / Komisi / Jebakan, hanya pemilik kartu
  expiresAtMonth: number;
};
```

**Level risiko (usulan, perlu playtest):** `low` jika Peluang Zonk ≤ 15%, `medium` 16-34%, `high` ≥ 35%. Peluang Zonk sudah memperhitungkan Beban Peringkat 1, Musim, dan imunitas pemain yang melihat (GDD 4.3, 4.5). Persentase asli **tidak** dikirim, hanya level dan tag.

---

## 4. REST API

Format error REST sama dengan ack: `{ ok: false, error: ErrorCode, message?: string }` plus status HTTP.

### 4.1 `POST /api/v1/guest` - Buat atau ubah sesi tamu

|       |                                                                                                                           |
| ----- | ------------------------------------------------------------------------------------------------------------------------- |
| Layar | Popup "Masuk sebagai tamu", popup yang sama dalam mode "Ubah nama"                                                        |
| Aksi  | Pertama kali membuka Lobby, menekan Mabar tanpa sesi, atau menekan "Ubah nama" di Kartu Identitas Pemain                  |
| Auth  | Tidak wajib. Jika header `Authorization: Bearer <token>` valid, server **mengubah** nama/avatar dan `playerId` tetap sama |

Request:

```ts
{
  name: string;
  avatarId: AvatarId;
}
```

- `name`: di-trim, 2-20 karakter, huruf/angka/spasi dan `.-'`, lalu disaring kata kasar.

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

Error: `400 INVALID_PAYLOAD`, `422 NAME_REJECTED` (kata kasar), `429 RATE_LIMITED` (usulan 10 request/menit per IP).

Catatan:

- Klien menyimpan `{ playerId, name, avatarId, token }` di `localStorage` (usulan key `pejuang.guest`).
- **Ubah nama hanya di Lobby**, tidak saat berada di Room atau game, supaya nama di Papan Skor tidak berubah di tengah permainan.

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
Catatan: server juga mengirim ulang popup yang masih berjalan (Event Tanggal, Ajakan masuk, `turn:options`) di dalam snapshot, supaya pemain bisa melanjutkan.

### `session:snapshot` · S→C (P)

|       |                                                                                                    |
| ----- | -------------------------------------------------------------------------------------------------- |
| Layar | Semua layar room/game (dipakai untuk menggambar ulang)                                             |
| Aksi  | Dikirim sebagai isi ack `session:resume` dan `spectate:enter`, dan bisa didorong server bila perlu |

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
    pendingCalendar: CalendarEventPayload | null;
    pendingInvite: InviteIncomingPayload | null;
    isSpectator: boolean;
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

Catatan: pemain yang putus tetap punya giliran. Jika timer habis, heksa dipilih acak (GDD 4.3, 9.4). Tidak ada bot pengganti _(asumsi GDD 9.4)_.

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

Error: `ALREADY_IN_ROOM`. Pengirim menjadi Host, `turnSeconds` default 30. Klien pindah ke `/room/[code]`.

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
Catatan: pemain yang terputus dan sudah terdaftar di room yang terkunci memakai `session:resume`, bukan `room:join`.

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
- Keluar saat game berjalan: lihat Keputusan Terbuka #1.

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

### `room:pawn` · C→S

|       |                               |
| ----- | ----------------------------- |
| Layar | Room                          |
| Aksi  | Memilih warna dan bentuk pion |

```ts
{
  requestId: string;
  pawn: PawnId;
}
// ack
Ack;
```

Error: `PAWN_TAKEN`. Warna dan bentuk dipasangkan tetap (krem-lingkaran, biru es-kotak, mint-segitiga, salmon-wajik) supaya pion selalu berbeda warna **dan** bentuk (02_DESIGN aturan warna #6). Saat bergabung, server memberi pion pertama yang kosong.

### `room:timer` · C→S

|       |                                                      |
| ----- | ---------------------------------------------------- |
| Layar | Room, kartu "TIMER GILIRAN (diatur host)"            |
| Aksi  | Host memilih "30 dtk - Cepat" atau "60 dtk - Santai" |

```ts
{
  requestId: string;
  turnSeconds: 30 | 60;
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

Error: `NOT_HOST`, `INVALID_TARGET`, `ROOM_LOCKED`.

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

Error: `NOT_HOST`. Room kembali ke `waiting`, semua `ready` jadi `false`, pemain yang tidak tersambung dikeluarkan. Pemain lain yang menekan Main Lagi hanya pindah ke tampilan Room dan menunggu _(asumsi GDD 9.5)_.

### `room:state` · S→R

|       |                                                                      |
| ----- | -------------------------------------------------------------------- |
| Layar | Room (semua varian), Lobby setelah create/join berhasil              |
| Aksi  | Setiap perubahan room: masuk, keluar, siap, pion, timer, host pindah |

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
  boardRadius: 4 | 5 | 6;            // 2 pemain = 4, 3 = 5, 4 = 6
  turnSeconds: 30 | 60;
  turnOrder: string[];
  startPositions: { playerId: string; hex: HexCoord }[];  // cincin radius 2
  calendar: CalendarInfo;
}
```

Status awal tiap pemain dikirim lewat `player:status` (Kekayaan Rp7.500.000, Hutang 0, Kesehatan 10, Level Stress 0).

### `game:finished` · S→R

|       |                                                                                              |
| ----- | -------------------------------------------------------------------------------------------- |
| Layar | Hasil Akhir Multiplayer (podium, rincian skor, Bagikan hasil)                                |
| Aksi  | Langkah 24 selesai, atau semua pemain kecuali satu tereliminasi (lihat Keputusan Terbuka #3) |

```ts
type GameFinishedPayload = {
  version: number;
  ranking: Array<{
    rank: number;
    playerId: string;
    name: string;
    pawn: PawnId;
    finalScore: number; // Skor Kesejahteraan
    netWorth: number; // Harta Bersih
    modifier: "penalty" | "bonus" | "none";
    modifierPct: -50 | 20 | 0;
    eliminated: boolean;
    eliminatedAtStep: number | null;
  }>;
};
```

Catatan:

- Peringkat: yang bertahan di atas yang tereliminasi. Antar yang tereliminasi, yang bertahan lebih lama lebih tinggi. Tie-breaker (Hutang lebih kecil, lalu Level Stress lebih rendah) dihitung server.
- Rincian berisi Harta Bersih dan modifier sesuai GDD 9.5. Empat indikator lawan **tidak** dikirim (lihat Keputusan Terbuka #4). Indikator milik sendiri ada di `player:status` terakhir.

---

## 9. Sinkron (2 event)

### `game:patch` · S→R

|       |                                                                                    |
| ----- | ---------------------------------------------------------------------------------- |
| Layar | Game Board: Papan Skor, mahkota, kalender, chip "Kondangan Teman - 2 langkah lagi" |
| Aksi  | Setelah setiap Fase Realita (skor), di awal ronde (kalender, Beban Peringkat 1)    |

```ts
{
  version: number;
  ops: Array<
    | { type: "scores"; scores: ScoreRow[] }
    | { type: "rankOneBurden"; playerIds: string[] }
    | { type: "calendar"; calendar: CalendarInfo }
    | {
        type: "inviteSincereDeclined";
        fromPlayerId: string;
        targetPlayerId: string;
      }
  >;
}
```

Aturan pembagian: perubahan yang punya event sendiri (heksa terbuka, Petak Emas, eliminasi) tetap memakai event itu agar klien mudah menjalankan animasi. `game:patch` hanya untuk perubahan yang tidak punya event khusus. Semua event S→R tetap berbagi satu urutan `version`.

### `player:status` · S→C (P)

|       |                                                                                               |
| ----- | --------------------------------------------------------------------------------------------- |
| Layar | Kartu Status Pribadi (desktop), chip HUD (mobile), varian stres tinggi ("Awas Doom Spending") |
| Aksi  | Setiap kali satu dari empat indikator milik pemain berubah                                    |

```ts
PrivateStatus;
```

Klien menampilkan peringatan "Awas Doom Spending" jika `stress >= 8` (usulan, karena Doom terpicu di ≥ 9).

---

## 10. Kalender dan bulan (5 event)

### `calendar:event` · S→R

|       |                                                             |
| ----- | ----------------------------------------------------------- |
| Layar | Popup Event Tanggal (serentak untuk semua pemain hidup)     |
| Aksi  | Awal ronde pada Langkah 1, 6, 9, 12, 16, 21 (Fase Kalender) |

```ts
type CalendarEventPayload = {
  version: number;
  eventId: string; // "new-year", "lebaran", "labour-day", "wedding", "independence-day", "harbolnas"
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

Catatan: efek di popup sudah nilai Multiplayer. `note` untuk efek peluang (misalnya "25% menang lomba: +Rp1.500.000"). Pilihan `joinPaylater` hanya ada di Harbolnas (lihat Keputusan Terbuka #5). Giliran pertama ronde dimulai setelah semua menjawab atau waktu habis.

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
{ version: number; season: Season; vulnerableCategories: Category[]; zonkFocus: "vehicleWash" | "vehicleBreakdown" | "sick" }
```

Hujan: rawan `work`. Kemarau: `finance`, `social`. Pancaroba: `health` (pemain dengan Kesehatan ≥ 8 kebal, dihitung per pemain di `turn:options`).

### `month:summary` · S→C (P)

|       |                                                       |
| ----- | ----------------------------------------------------- |
| Layar | Ringkasan Ganti Bulan ("Gajian masuk. Tagihan juga.") |
| Aksi  | Awal ronde pada Langkah 3, 5, 7, ..., 23 (bulan baru) |

```ts
{
  month: number;
  salary: 5730000;
  livingCost: 4600000;
  interest: number; // 10% dari Hutang
  interestAddedToDebt: number; // bagian bunga yang masuk pokok karena Kekayaan kurang
  doomAmount: number | null; // jika Doom Spending terpicu di proses ini
  before: PrivateStatus;
  after: PrivateStatus;
}
```

Urutan proses mengikuti GDD 2.4: gaji → biaya hidup → bunga → Doom Spending → cek Bangkrut dan Burnout.

---

## 11. Giliran (7 + 1 event)

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
  turnSeconds: 30 | 60;
}
```

### `turn:options` · S→C (P, hanya pemain aktif)

|       |                                                                                                                          |
| ----- | ------------------------------------------------------------------------------------------------------------------------ |
| Layar | Game Board (3 heksa menyala, "Klik heksa untuk lihat detail"), Detail Heksa (tab 1-3, Rencana, meter risiko, tag risiko) |
| Aksi  | Dikirim bersamaan dengan `turn:start` jika ada heksa yang bisa dimasuki                                                  |

```ts
type TurnOptionsPayload = { turnId: string; options: TileOption[] }; // 1-3 opsi
```

Catatan:

- Membuka detail heksa **tidak** memanggil server. Ketiga detail sudah ada di payload ini.
- Bagian REALITA di panel selalu terkunci ("Terungkap setelah kamu melangkah"). Server tidak mengirim varian Realita sebelum heksa dipilih.

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

### `turn:dead-end` · S→C (P, hanya pemain aktif)

|       |                                                                                           |
| ----- | ----------------------------------------------------------------------------------------- |
| Layar | Overlay Jalan Buntu ("kena macet dan nyasar")                                             |
| Aksi  | Dikirim **sebagai pengganti** `turn:options` jika semua tetangga sudah terinjak atau mati |

```ts
type DeadEndPayload = {
  turnId: string;
  options: Array<TileOption & { distance: number }>;
  stressPenalty: 1;
};
```

3 heksa tertutup terdekat (kurang dari 3 jika memang tidak ada).

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

### `turn:timer` · S→R **[+]**

|       |                                                                          |
| ----- | ------------------------------------------------------------------------ |
| Layar | Timer cincin di bar bawah (semua pemain)                                 |
| Aksi  | Timer Giliran dijeda saat pemain aktif menjawab Ajakan, lalu dilanjutkan |

```ts
{
  version: number;
  turnId: string;
  paused: boolean;
  deadline: number | null;
  remainingMs: number;
}
```

Alasan ditambahkan: GDD 4.3 dan 4.8 mewajibkan timer dijeda, dan semua pemain perlu melihat timer berhenti.

### `tile:opened` · S→R

|       |                                                                                              |
| ----- | -------------------------------------------------------------------------------------------- |
| Layar | Game Board: pion bergerak (spring), heksa terbuka, efek Rencana. Awal animasi Reveal Realita |
| Aksi  | Fase Berjalan setelah `turn:choose`, `turn:jump`, atau waktu habis                           |

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

### `tile:resolved` · S→R

|       |                                                                                              |
| ----- | -------------------------------------------------------------------------------------------- |
| Layar | Reveal Realita (Zonk: "Realita datang tanpa permisi.", Hoki: "Sekali-sekali, semesta baik.") |
| Aksi  | Fase Realita, langsung setelah `tile:opened` (tidak dikirim untuk Petak Emas)                |

```ts
{
  version: number;
  turnId: string;
  playerId: string;
  hex: HexCoord;
  outcome: Outcome;
  text: string;            // "Bos marah"
  effects: Effect[];
  seasonal: boolean;       // true jika memakai Zonk Musim
}
```

Setelah ini server mengirim `player:status` (P) ke pemain aktif, lalu `game:patch` (`scores`), lalu `turn:start` berikutnya.

---

## 12. Petak Emas (2 event)

### `gold:spawned` · S→R

|       |                                                                                                         |
| ----- | ------------------------------------------------------------------------------------------------------- |
| Layar | Game Board (heksa emas berkilau, label "Petak Emas"), kartu "Petak Emas - Hangus dalam 3 ronde", banner |
| Aksi  | Awal Langkah 1, 5, 9, 13, 17, 21                                                                        |

```ts
{
  version: number;
  gold: GoldTile;
}
```

Sisa ronde dihitung klien: `gold.expiresAtStep - calendar.step`.

### `gold:expired` · S→R

|       |                                                                       |
| ----- | --------------------------------------------------------------------- |
| Layar | Game Board (heksa berubah menjadi Heksa Mati, retak), banner          |
| Aksi  | Petak Emas tidak diambil sampai kemunculan berikutnya atau akhir game |

```ts
{
  version: number;
  goldId: string;
  hex: HexCoord;
}
```

Jika diambil, tidak ada `gold:expired`. Pengambilan terlihat dari `tile:opened` dengan `isGold: true`.

---

## 13. Doom Spending dan eliminasi (3 event)

### `doom:triggered` · S→C (P)

|       |                                                                |
| ----- | -------------------------------------------------------------- |
| Layar | Overlay Doom Spending ("Checkout dulu, nyesel belakangan.")    |
| Aksi  | Level Stress ≥ 9 saat ganti bulan atau setelah menginjak petak |

```ts
{
  amount: number;
  trigger: "month" | "tile";
  stressAfter: number;
}
```

### `player:eliminated` · S→R

|       |                                                                                                                 |
| ----- | --------------------------------------------------------------------------------------------------------------- |
| Layar | Pemain sendiri: Layar Eliminasi ("Hari ini kamu perlu istirahat."). Pemain lain: banner dan tanda di Papan Skor |
| Aksi  | Bangkrut atau Burnout Total                                                                                     |

```ts
{
  version: number;
  playerId: string;
  reason: "bankrupt" | "burnout";
  step: number;
}
```

Pion tetap di papan dan heksanya tetap terisi. Pemain ini dilewati di urutan giliran.

### `spectate:enter` · C→S

|       |                        |
| ----- | ---------------------- |
| Layar | Layar Eliminasi        |
| Aksi  | Tombol "Jadi penonton" |

```ts
{
  requestId: string;
}
// ack
Ack<{ snapshot: Snapshot }>;
```

Error: `NOT_ELIMINATED`. Penonton tetap menerima event S→R, tidak pernah menerima data privat pemain lain. Tombol "Lihat hasil" menampilkan ringkasan status sendiri dari `player:status` terakhir (tanpa request).

---

## 14. Ajakan (5 event) dan Emote (2 event)

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

### `invite:send` · C→S

|       |                                                                               |
| ----- | ----------------------------------------------------------------------------- |
| Layar | Ajakan (pilih target)                                                         |
| Aksi  | Pilih satu lawan lalu kirim. Boleh kapan saja, tidak harus di giliran sendiri |

```ts
{
  requestId: string;
  cardId: string;
  targetPlayerId: string;
}
// ack
Ack<{ inviteId: string; deadline: number }>;
```

Error: `NO_INVITE_CARD`, `INVITE_LIMIT` (sudah ada 1 Ajakan di ronde ini, kartu tidak terpakai), `INVALID_TARGET` (diri sendiri atau tereliminasi).

### `invite:incoming` · S→C (P, target)

|       |                                                                  |
| ----- | ---------------------------------------------------------------- |
| Layar | Popup Ajakan masuk (Rencana tanpa motif, hitung mundur 10 detik) |
| Aksi  | Ada pemain yang mengajak                                         |

```ts
type InviteIncomingPayload = {
  inviteId: string;
  fromPlayerId: string;
  fromName: string;
  plan: InviteCard["plan"];
  planEffects: Effect[];
  deadline: number; // 10 detik
};
```

Jika target sedang giliran, server mengirim `turn:timer` (`paused: true`).

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

Error: `INVITE_EXPIRED`. Waktu habis = `decline`.

### `invite:resolved` · S→C (P, pengirim dan target)

|       |                                         |
| ----- | --------------------------------------- |
| Layar | Hasil Ajakan (motif terbuka atau tidak) |
| Aksi  | Target menjawab atau waktu habis        |

```ts
{
  inviteId: string;
  fromPlayerId: string;
  targetPlayerId: string;
  answer: "join" | "decline";
  autoDeclined: boolean;
  motive: "sincere" | "commission" | "trap" | null;   // null jika tidak dibuka
  effectsForYou: Effect[];                            // efek untuk penerima event ini
}
```

Kapan motif dibuka (GDD 4.8):

- Target **ikut**: motif dibuka ke target.
- Target **menolak** Komisi/Jebakan: motif tidak dibuka (`null`), tidak ada efek.
- Target **menolak** Tulus: target Kekayaan -Rp3.000.000 dan motif dibuka ke semua lewat `game:patch` (`inviteSincereDeclined`).

Setelah ini server mengirim `player:status` ke pihak yang berubah dan `turn:timer` (`paused: false`) jika timer sempat dijeda.

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

Error: `RATE_LIMITED` (usulan 1 emote per 3 detik).

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

Kode bertanda **[+]** adalah tambahan dari daftar 03_REKOMENDASI.

| Kode                     | Arti                               | Teks UI (usulan)                                         | Muncul di         |
| ------------------------ | ---------------------------------- | -------------------------------------------------------- | ----------------- |
| `INVALID_PAYLOAD`        | Data tidak sesuai skema Zod        | "Ada yang salah. Coba lagi."                             | Semua             |
| `UNAUTHORIZED` [+]       | Token tidak valid/kedaluwarsa      | "Sesi habis. Masuk sebagai tamu lagi."                   | Handshake, REST   |
| `NAME_REJECTED` [+]      | Nama tidak lolos penyaring         | "Nama ini tidak bisa dipakai."                           | Popup tamu        |
| `RATE_LIMITED` [+]       | Terlalu sering                     | "Pelan-pelan dulu, coba sebentar lagi."                  | `/guest`, emote   |
| `ROOM_NOT_FOUND`         | Kode salah                         | "Kode room tidak ketemu."                                | Lobby             |
| `ROOM_FULL`              | Room 4/4                           | "Room sudah penuh (4/4)."                                | Lobby             |
| `ROOM_LOCKED`            | Game sudah mulai                   | "Permainan sudah berjalan."                              | Lobby, Room       |
| `ALREADY_IN_ROOM` [+]    | Masih tercatat di room lain        | "Kamu masih ada di room lain."                           | Lobby             |
| `NOT_IN_ROOM` [+]        | Resume ke room yang bukan miliknya | "Kamu tidak terdaftar di room ini."                      | Resume            |
| `NOT_HOST`               | Aksi khusus host                   | "Hanya host yang bisa melakukan ini."                    | Room, Hasil Akhir |
| `PAWN_TAKEN` [+]         | Pion sudah dipakai                 | "Pion ini sudah dipilih pemain lain."                    | Room              |
| `NOT_ENOUGH_PLAYERS` [+] | Kurang dari 2 pemain               | "Menunggu minimal 2 pemain"                              | Room              |
| `PLAYERS_NOT_READY` [+]  | Ada yang belum Siap                | "Menunggu pemain siap"                                   | Room              |
| `NOT_YOUR_TURN`          | Bukan giliranmu                    | "Belum giliranmu."                                       | Game Board        |
| `TILE_NOT_LIT`           | Heksa tidak menyala                | "Pilih salah satu heksa yang menyala."                   | Detail Heksa      |
| `INVALID_TILE`           | Heksa tidak ada/terinjak           | "Heksa ini tidak bisa dipilih."                          | Detail Heksa      |
| `STALE_VERSION`          | State klien tertinggal             | (diam-diam memanggil `session:resume`)                   | Game Board        |
| `EVENT_CLOSED` [+]       | Waktu Event Tanggal habis          | "Waktu habis, otomatis tidak ikut."                      | Event Tanggal     |
| `NO_INVITE_CARD`         | Tidak punya kartu                  | "Kamu belum punya Kartu Ajakan."                         | Ajakan            |
| `INVITE_LIMIT`           | Sudah ada Ajakan di ronde ini      | "Sudah ada Ajakan di ronde ini. Kartumu tidak terpakai." | Ajakan            |
| `INVALID_TARGET` [+]     | Target tidak sah                   | "Pemain ini tidak bisa dipilih."                         | Ajakan, kick      |
| `INVITE_EXPIRED` [+]     | Jawaban terlambat                  | "Waktu menjawab habis."                                  | Ajakan masuk      |
| `NOT_ELIMINATED` [+]     | Belum tereliminasi                 | -                                                        | Spectate          |
| `GAME_FINISHED`          | Game sudah selesai                 | "Permainan sudah selesai."                               | Game Board        |
| `INTERNAL` [+]           | Error server                       | "Server lagi bermasalah. Coba lagi."                     | Semua             |

---

## 16. Contoh alur satu ronde (Multiplayer, 3 pemain)

Contoh: awal Langkah 9 (1 Mei, Bulan 5). Ada ganti bulan, Kartu Ajakan, Petak Emas, dan Event Tanggal (Libur Hari Buruh).

```
Fase Kalender (sekali per ronde)
S→R  game:patch          { ops: [calendar, rankOneBurden] }
S→C  month:summary       (tiap pemain, privat)
S→C  player:status       (tiap pemain)
S→C  invite:card         (Bulan 5 = bulan ganjil)
S→R  gold:expired        (Petak Emas Langkah 5 hangus jika belum diambil)
S→R  gold:spawned        (Petak Emas baru)
S→R  calendar:event      (deadline 15 dtk)
C→S  calendar:answer     (tiap pemain)
S→C  calendar:result + player:status

Giliran pemain A
S→R  turn:start          { playerId: A, deadline }
S→C  turn:options        (hanya A)
     ... A membuka detail (tanpa request) ...
C→S  turn:choose         → ack { ok: true }
S→R  tile:opened
S→R  tile:resolved
S→C  player:status       (hanya A)
S→R  game:patch          { ops: [scores] }

Giliran pemain B, C: pola sama
```

---

## 17. Keputusan terbuka

Hal di bawah tidak diatur jelas di GDD v1.7. Kontrak memakai usulan di kolom kanan sampai diputuskan.

| #   | Pertanyaan                                                             | Usulan sementara                                                                                                                 |
| --- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Pemain menekan Keluar saat game berjalan: dianggap apa?                | Diperlakukan seperti putus permanen: tetap di papan, giliran dipilih acak saat waktu habis, bisa kembali lewat `session:resume`  |
| 2   | Room tanpa aktivitas ditutup setelah berapa lama?                      | 10 menit (asumsi GDD 9.3). Server mengirim `error` dengan `fatal: true`                                                          |
| 3   | Game berakhir lebih cepat jika tinggal 1 pemain hidup?                 | Ya, `game:finished` dikirim saat tinggal 1 pemain hidup. Perlu dicatat di GDD                                                    |
| 4   | Hasil Akhir menampilkan empat indikator semua pemain?                  | Tidak. Hanya Harta Bersih dan modifier (sesuai GDD 9.5). Jika ingin dibuka setelah game selesai, cukup tambah field di `ranking` |
| 5   | Harbolnas: Paylater dipilih pemain atau otomatis saat Kekayaan kurang? | Pilihan terpisah (`joinPaylater`) di popup                                                                                       |
| 6   | Ambang level risiko Rendah/Sedang/Tinggi                               | ≤15% / 16-34% / ≥35%                                                                                                             |
| 7   | Masa berlaku token tamu                                                | 7 hari                                                                                                                           |
