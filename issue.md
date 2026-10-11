# Implementasi Mekanisme Game Multiplayer Pejuang UMR

## Tujuan

Menyelesaikan mekanisme game multiplayer Pejuang UMR dari awal permainan sampai hasil akhir sesuai aturan resmi, dengan server sebagai satu-satunya pihak yang menentukan validitas aksi, hasil acak, timer, dan perubahan state.

Dokumen ini ditulis sebagai rencana implementasi yang dapat dikerjakan bertahap oleh junior programmer atau AI. Jangan mengerjakan tahap UI interaktif sebelum dependency engine dan server pada tahap sebelumnya selesai.

---

## 1. Sumber kebenaran dan urutan prioritas

Jika terdapat perbedaan antar-sumber, gunakan urutan berikut:

1. `docs/GDD.md` — aturan game dan angka mekanik.
2. `docs/API_CONTRACT.md` — nama event, payload, ack, error, versioning, dan aturan realtime.
3. `docs/CONTENT_SCHEMA.md` — bentuk data konten game.
4. Schema Zod di `packages/shared` — kontrak runtime yang harus tetap selaras dengan dokumen API.
5. Implementasi `packages/engine` — fondasi domain yang sudah tersedia, tetapi TODO di dalamnya bukan aturan baru.
6. `example/my-app` — hanya referensi UX/visual, bukan sumber aturan.

### Aturan kerja wajib

- Jangan mengubah angka game tanpa perubahan eksplisit pada `docs/GDD.md`.
- Nama field dan enum di kode menggunakan bahasa Inggris; teks pemain menggunakan bahasa Indonesia.
- Semua input socket harus divalidasi dengan Zod 4 dari `@pejuang/shared`.
- Tipe diturunkan dengan `z.infer`; jangan menulis ulang tipe yang sudah berasal dari schema.
- Data petak, Realita, Event Tanggal, musim, Petak Emas, dan Ajakan hanya berada di `packages/engine/src/data`.
- `apps/web` tidak boleh mengimpor `@pejuang/engine` karena isi heksa dan hasil rahasia hanya boleh diketahui server.
- Uang adalah Rupiah bulat bertipe `number`.
- Kesehatan dan Level Stress selalu berada pada rentang 0–10.
- Semua hasil acak engine harus memakai `RandomSource`, bukan `Math.random()` langsung.
- Setiap perubahan kode harus disertai test Vitest.
- Jangan membaca, membuat, atau menampilkan file `.env`.
- Jangan menjalankan `git commit` atau `git push`.

---

## 2. Scope

### Termasuk dalam scope

- Multiplayer 2–4 pemain.
- Room, countdown, dan start game.
- Papan bersama sesuai jumlah pemain.
- Kalender 24 langkah dari 1 Januari sampai 31 Desember.
- Fase kalender, pilihan, berjalan, dan Realita.
- Pergerakan normal, Jalan Buntu, dan kondisi tidak ada heksa tersisa.
- Rencana, Realita, Zonk/Aman/Hoki, dan pengaruh musim.
- Timer giliran 30 atau 60 detik yang authoritative di server.
- Ekonomi bulanan, Hutang, bunga, Doom Spending, dan batas transaksi.
- Skor sementara, Beban Peringkat 1, dan ranking akhir.
- Event Tanggal.
- Petak Emas.
- Kartu Ajakan realtime.
- Eliminasi dan spectator.
- Reconnect dengan pemulihan state publik dan privat.
- Hasil akhir dan rematch.
- Emote sebagai fitur non-mekanik setelah core loop stabil.

### Tidak termasuk dalam scope

- Mode Solo.
- Akun pengguna permanen.
- Database riwayat dan rekor.
- Hall of Fame/Ajang Flexing.
- Bot pengganti pemain disconnect.
- Chat atau voice chat.
- Perubahan balance yang tidak tertulis di GDD.

### Keputusan terbuka yang tidak boleh ditebak

- Game berakhir lebih cepat ketika hanya satu pemain hidup masih belum diputuskan. Untuk implementasi awal, game tetap berjalan sampai langkah 24 sesuai perilaku engine saat ini dan catatan GDD v1.9.
- Pemain yang menekan keluar saat game berjalan belum memiliki keputusan final. Sampai diputuskan, perlakukan sebagai disconnect dan pertahankan slot agar sesi dapat dilanjutkan.
- Ambang ikon risiko yang saat ini dipakai engine mengikuti usulan kontrak: Rendah ≤15%, Sedang 16–34%, Tinggi ≥35%. Jangan mengubahnya tanpa keputusan produk.
- Ubah nama hanya di Lobby mengikuti usulan kontrak saat ini.

---

## 3. Prototype `example/my-app`

### Mekanisme yang diperagakan

Prototype adalah simulasi lokal di browser:

1. Empat pemain statis dibuat di Zustand.
2. Papan heksagonal radius 3 dirender dalam 3D.
3. Pemain aktif memilih heksa tetangga.
4. Pion bergerak dan efek sederhana diterapkan berdasarkan kategori heksa.
5. Giliran berpindah setelah jeda animasi.
6. Timer, pause, pergantian giliran, ronde, dan reset ditentukan browser.

Efek prototype hanya berupa contoh:

- `career`: Kekayaan `+Rp750.000`.
- `social`: Level Stress `-2`.
- `health`: Kesehatan `+2`.
- `fortune`: Kekayaan `+Rp1.500.000`.
- `empty`: tidak ada efek.

### UX yang boleh diadaptasi

- Papan heksagonal 3D dan kontrol kamera.
- Instanced mesh untuk performa papan.
- Warna heksa berdasarkan kategori setelah terbuka.
- Highlight heksa yang dapat dipilih.
- Fog atau penyembunyian petak tertutup.
- Sprite/pion karakter.
- HUD kalender, musim, timer, scoreboard, dan status privat.
- Modal detail sebelum mengonfirmasi pilihan.
- Feedback animasi ketika pion bergerak dan hasil petak muncul.

### Perilaku prototype yang tidak boleh disalin sebagai aturan

| Bagian | Prototype | Aturan resmi |
| --- | --- | --- |
| Otoritas | Zustand/browser | Server authoritative |
| Jumlah pemain | Selalu 4 statis | 2–4 pemain dari room |
| Radius papan | Selalu 3 | 2 pemain: 4, 3 pemain: 5, 4 pemain: 6 |
| Pilihan gerak | Semua tetangga | Maksimal 3 heksa valid yang diacak server |
| Heksa terbuka | Dapat dipilih lagi | Tidak dapat dimasuki lagi |
| Timeout | Melewati giliran | Server memilih acak salah satu opsi |
| Efek petak | Berdasarkan kategori | Rencana, peluang hasil, dan Realita |
| Isi petak | Tersedia di klien | Rahasia di engine/server sampai relevan |
| Pause | Menghentikan game | Hanya menu pribadi; game multiplayer terus berjalan |
| Reset | Mereset state lokal | Bukan aksi game multiplayer |
| Skor | Berdasarkan Kekayaan | Skor Kesejahteraan dan modifier GDD |
| Eliminasi | Tidak ada | Bangkrut atau Burnout Total |

---

## 4. Ringkasan mekanisme resmi

### 4.1 Setup

- Game berisi 2–4 pemain.
- Radius papan:
  - 2 pemain: 4.
  - 3 pemain: 5.
  - 4 pemain: 6.
- Titik awal tidak berisi petak dan tidak dapat diinjak ulang.
- Semua heksa lain diisi acak dengan petak biasa berbobot sama.
- Petak Emas tidak berada di papan awal; ia muncul sesuai jadwal.
- Semua pemain mulai dengan status dari GDD:
  - Kekayaan Rp7.500.000.
  - Hutang Rp0.
  - Kesehatan 10.
  - Level Stress 0.
- Urutan dasar pemain diacak sekali ketika game dibuat.

### 4.2 Kalender dan ronde

- Multiplayer berlangsung selama 24 langkah.
- Satu langkah adalah satu ronde: setiap pemain hidup mendapat maksimal satu giliran.
- Urutan giliran diputar setiap bulan berdasarkan aturan GDD.
- Ganti bulan berlangsung 11 kali pada langkah 3, 5, ..., 23.
- Event Tanggal berlangsung pada langkah yang ditentukan data kalender.
- Musim hanya memengaruhi peluang/varian Zonk sesuai kategori rawan.

### 4.3 Giliran

1. Server mencari heksa tertutup yang bersebelahan dengan pion.
2. Jika tersedia lebih dari tiga, server mengacak tiga pilihan.
3. Jika tersedia tiga atau kurang, seluruhnya ditampilkan.
4. Detail Rencana hanya dikirim kepada pemain aktif.
5. Pemain memilih satu heksa sebelum deadline.
6. Jika timeout, server memilih acak dari opsi yang sama.
7. Jika tidak ada tetangga valid, gunakan Jalan Buntu:
   - cari heksa tertutup terdekat;
   - tampilkan maksimal tiga;
   - tambahkan Level Stress +1 saat melompat.
8. Jika tidak ada heksa tertutup di seluruh papan, lewati giliran tanpa efek.

### 4.4 Rencana dan Realita

- Rencana terlihat sebelum pemain memilih.
- Realita ditentukan server setelah heksa dipilih.
- Hasil adalah Zonk, Aman, atau Hoki berdasarkan peluang petak dan modifier.
- Beban Peringkat 1 menambah peluang Zonk 15 poin persen.
- Musim menambah peluang Zonk 10 poin persen pada kategori rawan.
- Imunitas Sakit berlaku sesuai GDD ketika Kesehatan ≥8.
- Pengali multiplayer hanya berlaku pada sumber efek yang ditentukan GDD.

### 4.5 Ekonomi dan eliminasi

- Kekurangan pembayaran otomatis menjadi Hutang selama masih di bawah limit.
- Kekayaan tidak boleh negatif.
- Hutang tidak boleh melebihi Rp25.000.000.
- Kenaikan Hutang menambah Level Stress sesuai aturan GDD.
- Bangkrut hanya diperiksa saat ganti bulan dan setelah Doom Spending.
- Burnout diperiksa setelah efek yang dapat mengubah Kesehatan atau Level Stress.
- Pemain tereliminasi tidak mendapat giliran lagi tetapi tetap ada dalam hasil akhir.

### 4.6 Petak Emas

- Muncul pada langkah 1, 5, 9, 13, 17, dan 21.
- Muncul pada heksa tertutup di cincin luar.
- Bertahan empat ronde.
- Jika tidak diambil, Petak Emas hangus dan heksanya menjadi Heksa Mati.
- Tidak memiliki fase Realita.
- Nilainya sudah merupakan nilai multiplayer dan tidak dikali lagi.

### 4.7 Ajakan

- Tidak tersedia pada mode Solo.
- Kartu dibagikan pada awal bulan ganjil sesuai GDD.
- Pemain memegang maksimal satu kartu; kartu lama hangus saat kartu baru dibagikan.
- Pengirim dapat mengirim kapan saja kepada satu lawan hidup.
- Hanya satu Ajakan boleh diproses untuk seluruh meja per ronde.
- Target menjawab Ikut/Tolak dalam 10 detik; timeout berarti Tolak.
- Jika target adalah pemain aktif, timer giliran dijeda dan dilanjutkan dengan sisa waktu yang sama.
- Motif Tulus/Komisi/Jebakan dan aturan pembukaannya harus mengikuti GDD.

---

## 5. Kondisi codebase saat dokumen ini dibuat

### Sudah tersedia di `packages/engine`

- Setup papan berdasarkan jumlah pemain.
- Posisi awal dan urutan pemain.
- Board state rahasia.
- Status awal pemain.
- Pergerakan normal dan Jalan Buntu.
- Auto-pick ketika timeout.
- Rencana dan Realita petak biasa.
- Peluang Zonk dan pengaruh musim.
- Transaksi, limit Hutang, ganti bulan, dan Doom Spending.
- Kalender dan Event Tanggal.
- Skor sementara dan ranking akhir.
- Penyelesaian game langkah 24.
- Simulasi random banyak game dengan pemeriksaan invariant.

### TODO engine yang masih nyata

- Spawn dan expire Petak Emas.
- Pengambilan Petak Emas dalam resolusi turn.
- Pembagian dan lifecycle Kartu Ajakan.
- Beban Peringkat 1 pada awal ronde.
- Pemeriksaan eliminasi setelah Event Tanggal.
- Keputusan early finish masih sengaja belum diterapkan.

### Sudah tersedia di `packages/shared`

- Schema public game state dan snapshot.
- Kontrak turn, timer, tile opened/resolved, kalender, status privat, eliminasi, Petak Emas, Ajakan, patch, dan hasil akhir.
- Schema action client dan tipe Socket.IO.
- Version field untuk sinkronisasi event.

### Sudah tersedia di `apps/server`

- Guest session.
- Room create/join/leave.
- Ready, pemilihan pion, timer room, dan kick.
- Countdown dan start game.
- Session resume.
- Dasar idempotency aksi room.
- Penyimpanan public game state awal.

### Gap server utama

- Repository game baru menyimpan `PublicGameState`, bukan full `GameState` engine.
- Server belum menjalankan `startRound`, `startTurn`, `chooseHex`, `timeoutTurn`, dan `endRound` sebagai satu lifecycle.
- Domain event engine belum diterjemahkan ke event Socket.IO berdasarkan target publik/privat.
- Belum ada timer authoritative per room.
- Snapshot belum mengisi state privat dan pending action secara lengkap.
- Belum ada handler gameplay, Event Tanggal, Petak Emas, Ajakan, spectator, dan rematch end-to-end.

### Sudah tersedia di `apps/web`

- Room UI dan koneksi Socket.IO.
- Session resume.
- Penerimaan snapshot dan penolakan event stale.
- Perhitungan tampilan timer berdasarkan clock server.
- Papan 3D untuk public game state.
- Tampilan pion, heksa terbuka/mati, Petak Emas, kalender, musim, skor, dan status privat.

### Gap web utama

- Papan masih read-only.
- Pending turn belum divisualisasikan sebagai heksa interaktif.
- Modal Rencana, konfirmasi pilihan, dan hasil Realita belum tersedia.
- Event Tanggal dan Ajakan belum memiliki flow interaktif.
- Reconnect belum memulihkan modal pending.
- Eliminasi, spectator, hasil akhir, dan rematch belum tersedia.

---

## 6. Arsitektur target

```text
apps/web
  └─ mengirim action + requestId
       ↓
apps/server socket handler
  ├─ validasi schema, sesi, room, dan idempotency
  └─ meneruskan action ke GameRuntime per room
       ↓
GameRuntime
  ├─ memegang full GameState
  ├─ memanggil fungsi packages/engine
  ├─ menyimpan state baru secara atomik
  ├─ mengatur deadline/timeout server
  └─ menerjemahkan DomainEvent ke Socket.IO
       ↓
packages/engine
  ├─ aturan dan RNG deterministik
  ├─ state publik + rahasia
  └─ DomainEvent bertarget room/player
       ↓
apps/server
  ├─ emit event room
  ├─ emit event privat ke socket pemain
  └─ menyediakan snapshot reconnect
       ↓
apps/web
  └─ merender state; tidak menghitung hasil game
```

### Boundary keamanan

- Full `GameState`, `BoardState`, tile id tertutup, Realita belum dibuka, dan motif Ajakan hanya berada di server.
- Room hanya menerima public state dan event publik.
- Status, opsi turn, kartu, dan pending action hanya dikirim kepada pemiliknya.
- Spectator hanya menerima public state.
- Browser tidak boleh menentukan RNG, eligibility, efek, ranking, deadline, timeout, atau version.

### Versioning dan concurrency

- Setiap mutasi authoritative menaikkan `PublicGameState.version` secara monoton.
- Event dengan version lebih lama harus diabaikan klien.
- `requestId` harus idempotent: request yang sama mengembalikan hasil yang sama dan tidak menerapkan efek dua kali.
- Setiap room harus memiliki antrean/mutex atau mekanisme serialisasi aksi.
- Callback timeout harus membawa identity seperti `turnId`/`inviteId`; callback stale wajib menjadi no-op.
- Simpan state baru sebelum emit event agar reconnect segera melihat hasil terbaru.

---

## 7. Urutan implementasi

## Tahap 0 — Bekukan scope dan baseline

### Pekerjaan

- Catat keputusan terbuka pada PR/issue turunan; jangan menyelesaikannya dengan asumsi tersembunyi.
- Jalankan baseline `npm run typecheck` dan `npm test` sebelum perubahan kode.
- Dokumentasikan kegagalan baseline jika ada agar tidak dianggap regresi tahap baru.

### Acceptance criteria

- MVP hanya mencakup multiplayer 2–4 pemain.
- Tidak ada angka baru di luar GDD.
- Kondisi working tree milik pengguna tidak di-reset atau ditimpa.

---

## Tahap 1 — Simpan full engine state di server

### Dependency

- Tidak ada.

### Pekerjaan

- Ubah repository game agar menyimpan `GameState`, bukan hanya `PublicGameState`.
- Gunakan `createGame` saat countdown selesai.
- Simpan result game terpisah jika diperlukan oleh snapshot.
- Buat selector/helper untuk memperoleh public state melalui `toPublicState`.
- Pastikan room lookup dan game lookup tetap berdasarkan room code.
- Hindari menaruh logic Socket.IO di repository.

### File yang kemungkinan disentuh

- `apps/server/src/repositories/game-repository.ts`
- `apps/server/src/repositories/game-repository.test.ts`
- `apps/server/src/socket/register-room-handlers.ts`
- `apps/server/src/services/snapshot.ts`
- test server terkait start game dan snapshot

### Acceptance criteria

- `apps/server` menyimpan full state engine setelah start.
- `game:started` tetap hanya berisi data publik sesuai kontrak.
- Snapshot tidak memuat tile id tertutup, board rahasia, atau status lawan.
- `apps/web` tidak mengimpor `@pejuang/engine`.

### Test minimum

- Repository menyimpan dan mengganti `GameState` secara benar.
- Start 2, 3, dan 4 pemain menghasilkan radius yang benar.
- Serialisasi payload publik tidak mengandung `wealth`, `debt`, tile id rahasia, atau `motive`.

---

## Tahap 2 — Game runtime dan penerjemah domain event

### Dependency

- Tahap 1.

### Pekerjaan

- Buat service runtime per room untuk:
  - membaca state saat ini;
  - menserialkan aksi agar tidak race;
  - memanggil fungsi engine;
  - menyimpan state baru;
  - menaikkan version bila engine belum menangani version;
  - meneruskan domain event sesuai target;
  - menjalankan `nextAction` sampai runtime harus menunggu input atau timer.
- Buat penerjemah `DomainEvent` ke nama event kontrak.
- Target `room` di-emit ke Socket.IO room.
- Target `player` hanya di-emit ke seluruh socket aktif milik player tersebut.
- Jangan mengirim event privat dengan broadcast room lalu memfilter di klien.

### Struktur yang disarankan

- `apps/server/src/services/game-runtime.ts`
- `apps/server/src/services/domain-event-emitter.ts`
- `apps/server/src/services/game-timers.ts`
- test unit untuk masing-masing service

Nama final boleh mengikuti konvensi codebase, tetapi tanggung jawabnya harus tetap dipisah.

### Lifecycle runtime

```text
countdown selesai
  -> createGame
  -> startRound
  -> jika calendarEvent: tunggu jawaban/timeout
  -> startTurn
  -> jika noMove dan masih ada pemain: startTurn berikutnya
  -> jika turn aktif: tunggu choose/timeout
  -> chooseHex atau timeoutTurn
  -> nextTurn atau endRound
  -> jika roundStart: startRound
  -> ulangi sampai finished
```

### Acceptance criteria

- Satu aksi menghasilkan tepat satu transisi state.
- State tersimpan sebelum event dikirim.
- Error engine tidak mengubah state.
- Event privat tidak diterima pemain lain.
- Loop otomatis berhenti ketika menunggu input, menunggu deadline, atau game selesai.
- Tidak terjadi recursive loop tak terbatas ketika semua pemain tereliminasi atau tidak memiliki langkah.

### Test minimum

- Runtime start menghasilkan Event Tanggal atau turn pertama sesuai langkah.
- Domain event room dan player diarahkan ke tujuan yang benar.
- Dua aksi bersamaan diproses berurutan.
- Error transition mempertahankan object/state lama.

---

## Tahap 3 — Turn action end-to-end

### Dependency

- Tahap 2.

### Pekerjaan server

- Daftarkan handler `turn:choose` dan `turn:jump`.
- Untuk setiap request:
  1. validasi payload dengan schema shared;
  2. verifikasi sesi dan membership room;
  3. verifikasi room berstatus playing;
  4. cek cache idempotency berdasarkan player, event, dan `requestId`;
  5. panggil `chooseHex` melalui runtime;
  6. petakan error engine ke ack kontrak;
  7. simpan ack untuk replay request yang sama;
  8. lanjutkan lifecycle sesuai `nextAction`.
- Jangan menerima category/title/effects dari klien; klien hanya mengirim identity pilihan sesuai kontrak.

### Error yang harus diuji

- `NOT_IN_ROOM`
- `GAME_NOT_STARTED`
- `NOT_YOUR_TURN`
- `STALE_VERSION`
- `TILE_NOT_LIT`
- `GAME_FINISHED`
- payload invalid

Gunakan nama error persis dari kontrak yang berlaku; jika daftar di atas berbeda, selaraskan implementasi dengan `docs/API_CONTRACT.md` dan schema shared terlebih dahulu.

### File yang kemungkinan disentuh

- `apps/server/src/socket/register-game-handlers.ts` atau file handler setara
- `apps/server/src/socket/register-handlers.ts`
- service runtime
- `packages/shared/src/schemas/game-actions.ts` hanya jika ada ketidaksesuaian kontrak
- integration test Socket.IO

### Acceptance criteria

- Hanya pemain aktif dapat memilih.
- `turnId` lama tidak dapat mengubah state.
- Heksa di luar opsi server ditolak.
- `turn:jump` hanya valid saat pending turn adalah Jalan Buntu.
- Double click dengan `requestId` sama tidak menerapkan efek dua kali.
- Choose dan timeout yang tiba hampir bersamaan hanya menghasilkan satu langkah.

---

## Tahap 4 — Timer authoritative

### Dependency

- Tahap 3.

### Pekerjaan server

- Kelola tepat satu timer turn aktif per room.
- Saat `startTurn`:
  - hitung deadline dari waktu server dan `room.turnSeconds`;
  - simpan deadline di authoritative state;
  - emit `turn:start` dan payload pilihan privat;
  - jadwalkan callback timeout dengan `turnId`.
- Saat callback berjalan:
  - cek room dan game masih ada;
  - cek pending turn masih memiliki `turnId` yang sama;
  - panggil `timeoutTurn`;
  - emit hasil dengan `autoPicked: true`;
  - lanjutkan lifecycle.
- Batalkan timer setelah choose sukses, game selesai, atau runtime dihapus.
- Jangan mengirim tick setiap detik; klien menghitung tampilan dari deadline server.

### Pekerjaan web

- Pertahankan offset clock dari `serverTime` snapshot.
- Render countdown dari deadline authoritative.
- Jangan memulai ulang timer saat patch/event lama datang.
- Ketika paused, gunakan `remainingMs` dari server.

### Acceptance criteria

- Menutup tab tidak menghentikan timer.
- Disconnect tidak menghentikan giliran.
- Timeout memilih salah satu opsi pending, bukan mengundi ulang opsi.
- Callback timeout lama tidak memengaruhi turn baru.
- Reconnect menampilkan sisa waktu yang mendekati server.

### Test minimum

- Fake timer: deadline memicu `timeoutTurn` tepat sekali.
- Choose sesaat sebelum timeout membatalkan auto-pick.
- Timeout sesaat sebelum choose membuat choose ditolak sebagai stale.
- Cleanup room membatalkan semua timeout.

---

## Tahap 5 — Snapshot privat dan reconnect

### Dependency

- Tahap 4.

### Pekerjaan

- Lengkapi `createSnapshot` agar menghasilkan:
  - `game`: public state;
  - `me.status`: status privat pemain;
  - `me.inviteCard`: kartu pemain atau `null`;
  - `me.pendingTurn`: opsi yang sama jika pemain sedang mendapat giliran;
  - `me.pendingCalendar`: event aktif jika pemain masih perlu/berhak melihatnya;
  - `me.pendingInvite`: Ajakan masuk yang belum selesai;
  - `me.isSpectator`;
  - `result`: ranking final jika game selesai.
- Hitung `serverTime` ketika snapshot dibuat.
- Reconnect tidak boleh menjalankan ulang RNG atau membuat pending id baru.
- Jika satu player memiliki beberapa socket, seluruh socket tersebut menerima event privat yang sama.

### File yang kemungkinan disentuh

- `apps/server/src/services/snapshot.ts`
- `apps/server/src/socket/register-room-handlers.ts`
- `apps/server/src/socket/register-game-handlers.ts`
- test snapshot dan resume

### Acceptance criteria

- Refresh saat memilih petak mengembalikan opsi dan `turnId` yang sama.
- Refresh saat Event Tanggal aktif mengembalikan event yang sama.
- Refresh saat menerima Ajakan mengembalikan Ajakan dan deadline yang sama.
- Status privat lawan tidak pernah masuk snapshot.
- Spectator tidak menerima status privat siapa pun.

---

## Tahap 6 — UI pemilihan petak

### Dependency

- Tahap 5.

### Pekerjaan state client

- Tambahkan reducer/store untuk event gameplay tanpa menghitung aturan domain.
- Simpan `pendingTurn`, status privat, modal aktif, request pending, dan result.
- Terapkan snapshot sebagai sumber pemulihan penuh.
- Abaikan event stale berdasarkan version dan identity pending (`turnId`, `inviteId`).

### Pekerjaan board

- Highlight hanya koordinat dari `me.pendingTurn`.
- Bedakan pilihan normal dan Jalan Buntu secara visual.
- Klik heksa menyala membuka modal detail, bukan langsung bergerak.
- Modal menampilkan:
  - kategori;
  - judul;
  - Rencana/effects;
  - tingkat risiko;
  - tag Beban Peringkat 1;
  - tag musim;
  - tag imunitas bila ada;
  - penjelasan penalti Jalan Buntu bila relevan.
- Realita tetap tersembunyi sebelum server mengirim hasil.
- Tombol konfirmasi mengirim `turn:choose` atau `turn:jump` dengan `requestId` baru.
- Disable tombol selama request pending.
- Jangan melakukan optimistic movement atau optimistic status update.

### File yang kemungkinan disentuh

- `apps/web/src/app/game/[roomCode]/game-client.tsx`
- `apps/web/src/app/components/game/GameInterface.tsx`
- `apps/web/src/app/components/game/GameBoard3D.tsx`
- komponen modal baru di folder game
- `apps/web/src/lib/game-view.ts`
- test reducer/helper/komponen

Sesuaikan nama path dengan struktur aktual; jangan memindahkan file yang tidak perlu.

### Acceptance criteria

- Pemain menunggu tidak melihat pilihan privat pemain aktif.
- Heksa biasa yang tidak menyala tidak dapat mengirim action.
- Satu klik konfirmasi menghasilkan satu request.
- Pion bergerak hanya setelah event authoritative.
- Hasil Realita muncul dari event server.
- UI tetap dapat digunakan setelah ack terlambat tetapi event sudah datang.

---

## Tahap 7 — Event Tanggal, bulan, musim, dan ekonomi

### Dependency

- Tahap 5; UI dapat dikerjakan paralel setelah kontrak server stabil.

### Pekerjaan engine

- Lengkapi pemeriksaan Burnout setelah efek Event Tanggal.
- Pastikan eliminated player tidak menerima atau memengaruhi Event Tanggal berikutnya.
- Pastikan pengali multiplayer, Harbolnas, dan auto-skip sesuai GDD.

### Pekerjaan server

- Ketika `startRound` membuka Event Tanggal:
  - emit event kepada pemain yang berhak;
  - jadwalkan timeout 15 detik;
  - terima `calendar:answer` secara idempotent;
  - tutup lebih cepat jika seluruh pemain yang berhak sudah menjawab;
  - jalankan `closeCalendarEvent` pada timeout;
  - emit hasil privat/publik sesuai domain event;
  - lanjutkan ke turn pertama.
- Emit dan sinkronkan:
  - calendar patch;
  - `month:summary` privat;
  - `season:changed`;
  - `doom:triggered`;
  - `player:status`;
  - `player:eliminated`.

### Pekerjaan web

- Modal Event Tanggal dengan pilihan dan countdown.
- Tampilkan status telah menjawab tanpa membuka jawaban pemain lain.
- Tampilkan hasil milik pemain ketika tersedia.
- Tampilkan ringkasan bulanan dan Doom Spending sebagai feedback berurutan tanpa kehilangan event.

### Acceptance criteria

- Event muncul tepat pada langkah data kalender.
- Pemain hanya dapat menjawab satu kali.
- Timeout dihitung sebagai `skip`.
- Harbolnas menyediakan Belanja, Paylater, dan Tidak ikut.
- Pergantian bulan terjadi tepat 11 kali pada langkah 3, 5, ..., 23.
- Pemain tereliminasi tidak menerima month summary berikutnya.
- Event Tanggal yang menyebabkan Burnout langsung mengeliminasi pemain.

---

## Tahap 8 — Skor sementara dan Beban Peringkat 1

### Dependency

- Tahap 2 dan aturan skor engine yang sudah ada.

### Pekerjaan engine

- Pada awal ronde, hitung skor sementara seluruh pemain.
- Tentukan seluruh pemain hidup dengan peringkat pertama.
- Simpan daftar tersebut di `public.rankOneBurden` untuk ronde berjalan.
- Beban tidak berubah di tengah ronde walaupun skor berubah.
- Gunakan beban ketika membangun risiko opsi turn.
- Pemain tereliminasi tidak menerima beban baru.

### Pekerjaan server/web

- Emit patch scores dan `rankOneBurden` setelah awal ronde.
- Scoreboard menampilkan Skor Sementara, bukan Kekayaan.
- Tandai semua pemain yang terkena beban, termasuk ketika seri.
- Jangan tampilkan Kesehatan, Stress, Kekayaan, atau Hutang lawan jika kontrak menetapkannya privat.

### Acceptance criteria

- Skor diambil dari kondisi awal ronde.
- Seri peringkat pertama menghasilkan beberapa penerima beban.
- Ranking seri memakai pola `1, 1, 3` setelah tie-breaker tetap seri.
- Risk tag privat sesuai beban pemain pemilik opsi.

### Test minimum

- Satu pemimpin.
- Dua pemain seri peringkat pertama.
- Pemimpin berubah di tengah ronde tetapi burden tidak berubah.
- Ronde berikutnya menghitung burden baru.

---

## Tahap 9 — Petak Emas

### Dependency

- Tahap 7 dan runtime stabil.

### Pekerjaan data/engine

- Pastikan katalog Petak Emas hanya berada di `packages/engine/src/data`.
- Implementasikan spawn pada langkah 1, 5, 9, 13, 17, dan 21.
- Sebelum spawn baru, expire Petak Emas lama yang belum diambil.
- Pilih heksa tertutup pada cincin luar:
  - bukan titik awal;
  - belum terbuka;
  - bukan Heksa Mati;
  - bukan heksa Petak Emas aktif lain.
- Simpan `expiresAtStep` yang sesuai masa empat ronde.
- Saat dipilih:
  - pindahkan pion;
  - buka/tandai heksa sesuai representasi publik;
  - terapkan Rencana langsung;
  - jangan lakukan undian Realita;
  - hapus Petak Emas aktif.
- Saat expired:
  - tambahkan koordinat ke `deadHexes`;
  - hapus Petak Emas aktif;
  - emit event expire.

### Pekerjaan server/web

- Emit `gold:spawned` dan `gold:expired`.
- Render Petak Emas dan jumlah ronde tersisa.
- Modal konfirmasi menggunakan teks khusus Petak Emas.
- Heksa Mati tidak boleh tampil sebagai pilihan.

### Acceptance criteria

- Maksimal satu Petak Emas aktif.
- Petak Emas tidak dapat muncul di koordinat invalid.
- Petak Emas hanya dapat diambil sekali.
- Efeknya tidak dikali multiplier multiplayer lagi.
- Petak expired menjadi mati dan tidak dapat diinjak.
- Spawn dan pemilihan dapat dites deterministik dengan `RandomSource`.

---

## Tahap 10 — Eliminasi dan spectator

### Dependency

- Tahap 7 dan 9 agar semua sumber efek utama sudah tersedia.

### Pekerjaan engine

- Audit pemeriksaan Burnout setelah:
  - Realita petak;
  - Jalan Buntu + efek petak;
  - Event Tanggal;
  - Petak Emas;
  - Ajakan pada tahap berikutnya.
- Audit Bangkrut hanya setelah:
  - ganti bulan;
  - Doom Spending.
- Jangan mengeliminasi akibat kekurangan petak/Realita yang melewati limit; gunakan aturan transaksi GDD.
- Event eliminasi hanya boleh dibuat saat transisi hidup → tereliminasi.

### Pekerjaan server

- Lewati pemain tereliminasi ketika mencari turn berikutnya.
- Pertahankan pion dan riwayat heksa pemain di public state.
- Sediakan aksi menjadi spectator bila kontrak membutuhkannya.
- Tolak semua aksi mekanik dari spectator.
- Reconnect mempertahankan status eliminated/spectator.

### Pekerjaan web

- Overlay “Hari ini kamu perlu istirahat.”
- Aksi `Lihat hasil` dan `Jadi penonton`.
- Spectator tetap melihat papan dan event publik.
- Hilangkan semua kontrol privat/action ketika spectator.

### Acceptance criteria

- Pemain tereliminasi tidak mendapat turn atau pilihan baru.
- `player:eliminated` dikirim tepat sekali.
- Pion pemain tetap di posisi terakhir.
- Heksa yang pernah diinjak tetap terpakai.
- Ranking mencatat alasan dan langkah eliminasi sesuai bentuk state internal/kontrak.
- Spectator tidak menerima status atau pending action pemain lain.

---

## Tahap 11 — Kartu Ajakan realtime

### Dependency

- Tahap 4, 5, 7, dan 10.

Ajakan dikerjakan setelah runtime dan timer stabil karena fitur ini dapat masuk di tengah turn dan menjeda timer secara selektif.

### Pekerjaan data/engine

- Definisikan empat Rencana Ajakan dan efeknya di `packages/engine/src/data`.
- Simpan kartu dan motif rahasia per pemain.
- Simpan pending invite dan penanda apakah Ajakan meja sudah dipakai pada ronde berjalan.
- Pada awal bulan ganjil:
  - hanguskan kartu lama;
  - bagikan satu kartu baru kepada pemain hidup;
  - pilih motif dengan distribusi GDD: Tulus 50%, Komisi 25%, Jebakan 25%.
- Implementasikan transition:
  - send invite;
  - accept/decline;
  - timeout decline;
  - resolve effects;
  - pemeriksaan Burnout setelah effects.
- Terapkan aturan pembukaan motif secara tepat:
  - ikut: motif terbuka kepada target;
  - tolak Komisi/Jebakan: motif tetap rahasia;
  - tolak Tulus: motif dibuka ke semua dan penalti berlaku pada penolak.

### Pekerjaan server

- Handler `invite:send` dan `invite:answer` menggunakan validasi dan idempotency.
- Serialisasikan send melalui runtime room agar dua pengiriman bersamaan tidak sama-sama berhasil.
- Validasi target:
  - bukan diri sendiri;
  - berada di game yang sama;
  - belum tereliminasi;
  - bukan spectator.
- Jadwalkan timeout 10 detik berdasarkan `inviteId`.
- Jika target adalah active player:
  - simpan sisa waktu turn;
  - batalkan timeout turn;
  - set `turnPaused` dan deadline `null`;
  - emit `turn:timer` paused.
- Setelah invite selesai:
  - lanjutkan turn dengan sisa waktu yang sama;
  - buat deadline baru;
  - jadwalkan timeout turn baru;
  - emit `turn:timer` resumed.
- Jika target bukan active player, jangan mengubah timer turn.

### Pekerjaan web

- Tombol Ajakan aktif hanya jika pemain memegang kartu dan boleh mengirim.
- Modal pilih target hanya menampilkan lawan hidup.
- Target menerima popup Rencana dengan countdown 10 detik.
- Tombol Ikut/Tolak disable setelah satu jawaban dikirim.
- Tampilkan hasil dan motif hanya kepada audience yang berhak.

### Acceptance criteria

- Maksimal satu Ajakan diproses per meja per ronde.
- Dua send bersamaan: hanya yang terserialisasi pertama berhasil.
- Send yang ditolak karena meja sudah memakai Ajakan tidak menghabiskan kartu.
- Timeout dihitung Tolak.
- Target active player menjeda turn tanpa kehilangan waktu.
- Target nonaktif tidak menjeda turn.
- Motif tidak bocor sebelum waktunya.
- Efek Ajakan tidak menghabiskan langkah dan tidak memindahkan pion.
- Eliminasi akibat Ajakan langsung diterapkan.

### Test minimum

- Semua kombinasi tiga motif × ikut/tolak.
- Timeout target.
- Target active dan nonaktif.
- Dua sender race.
- Sender/target disconnect ketika pending.
- Resume target ketika pending.
- Invite stale setelah ronde berganti menjadi no-op/error kontrak.

---

## Tahap 12 — Hasil akhir dan rematch

### Dependency

- Seluruh mekanisme inti selesai.

### Pekerjaan server

- Setelah langkah 24 selesai, panggil `finishGame` dengan identitas room.
- Simpan hasil agar tersedia pada snapshot reconnect.
- Batalkan timer turn, kalender, dan Ajakan.
- Tolak action gameplay setelah finished.
- Implementasikan rematch sesuai kontrak:
  - dikendalikan host jika itu keputusan kontrak saat ini;
  - room kembali ke waiting;
  - ready seluruh pemain direset;
  - runtime/game/result lama dihapus;
  - pemain yang masih berada di room tetap dipertahankan.

### Pekerjaan web

- Tampilkan podium dan seluruh ranking.
- Tampilkan rincian:
  - final score;
  - net worth;
  - modifier dan persentase;
  - status eliminasi dan langkah eliminasi.
- Tombol:
  - Main Lagi;
  - Kembali ke Lobby;
  - Bagikan hasil, dibuat di sisi klien.

### Acceptance criteria

- `game:finished` dikirim sekali.
- Ranking memuat semua pemain tepat sekali.
- Pemain hidup berada di atas pemain tereliminasi sesuai aturan ranking.
- Tie final menggunakan ranking kompetisi (`1, 1, 3`).
- Snapshot setelah refresh tetap menampilkan hasil final.
- Rematch tidak dapat dipengaruhi timeout dari game lama.

---

## Tahap 13 — Emote dan polish non-kritis

### Dependency

- Core loop dan reconnect stabil.

### Pekerjaan

- Gunakan daftar emote tetap; jangan menerima teks bebas.
- Validasi `emoteId` dan rate limit di server.
- Emit `emote:shown` tanpa mengubah engine state.
- Animasi tidak boleh menutup modal turn, kalender, Ajakan, atau eliminasi.
- Tombol pause membuka menu pribadi dan tidak menghentikan game.
- Tombol reset/ulang prototype tidak menjadi aksi aktif selama game.

### Acceptance criteria

- Spam emote dibatasi.
- Emote tidak menaikkan game version jika bukan bagian public game state.
- Emote tidak memengaruhi timer atau mekanik.

---

## 8. File-level checklist

Daftar ini adalah perkiraan berdasarkan struktur saat ini. Periksa file aktual sebelum mengedit dan buat perubahan kecil serta terarah.

### `packages/engine`

- [ ] Lengkapi TODO Petak Emas di `src/turn/round.ts` dan `src/turn/turn.ts`.
- [ ] Lengkapi Beban Peringkat 1 di awal ronde.
- [ ] Lengkapi eliminasi setelah Event Tanggal.
- [ ] Tambah state dan transition Ajakan.
- [ ] Tambah data Ajakan/Petak Emas hanya di `src/data`.
- [ ] Pastikan public view tidak membocorkan secret state baru.
- [ ] Tambah unit test untuk setiap transition.
- [ ] Perluas full-game simulation agar mencakup mekanisme baru.

### `packages/shared`

- [ ] Audit schema terhadap `docs/API_CONTRACT.md` sebelum menambah field.
- [ ] Tambah/ubah schema hanya jika transition membutuhkan kontrak yang belum tersedia.
- [ ] Turunkan semua tipe baru dari schema.
- [ ] Tambah schema test untuk valid/invalid/unknown field.
- [ ] Pastikan payload privat dan publik terpisah.

### `apps/server`

- [ ] Repository menyimpan full engine state.
- [ ] Runtime mengorkestrasi transition engine.
- [ ] Domain event emitter memisahkan room dan player target.
- [ ] Timer manager mengelola turn, kalender, dan Ajakan.
- [ ] Gameplay handlers memvalidasi payload, auth, membership, dan idempotency.
- [ ] Snapshot memulihkan seluruh state privat milik requester.
- [ ] Disconnect tidak menghapus pemain dari game berjalan.
- [ ] Cleanup room membatalkan seluruh timer.
- [ ] Integration test mencakup multi-client dan reconnect.

### `apps/web`

- [ ] Store/reducer menerima snapshot dan seluruh event gameplay.
- [ ] Event stale diabaikan.
- [ ] Board hanya mengaktifkan pending options milik pemain.
- [ ] Modal Rencana dan Realita.
- [ ] Modal Event Tanggal.
- [ ] Modal Ajakan.
- [ ] Ringkasan bulan/Doom Spending.
- [ ] Overlay eliminasi dan spectator mode.
- [ ] Hasil akhir dan rematch.
- [ ] Test helper/reducer dan komponen interaktif.

---

## 9. Edge cases wajib

### Turn dan board

- Pemain memilih tepat ketika timeout berjalan.
- Request yang sama dikirim ulang setelah ack hilang.
- Socket reconnect dengan turn yang masih aktif.
- Pemain memiliki 1, 2, 3, atau lebih dari 3 tetangga valid.
- Jalan Buntu memiliki kurang dari 3 tujuan global.
- Tidak ada heksa tertutup di papan.
- Pemain tereliminasi adalah active player ketika efek selesai.
- Seluruh pemain tereliminasi sebelum langkah 24.

### Kalender

- Semua pemain menjawab sebelum timeout.
- Sebagian pemain disconnect dan timeout menjadi skip.
- Pemain tereliminasi saat Event Tanggal berlangsung.
- Jawaban datang setelah event ditutup.
- Event dan ganti bulan terjadi pada awal ronde yang sama.

### Timer dan reconnect

- Server menerima reconnect beberapa milidetik sebelum deadline.
- Callback lama berjalan setelah timer sudah diganti.
- Multiple socket untuk satu player.
- Browser memiliki clock lokal yang maju/mundur.
- Event tiba sebelum ack atau ack tiba sebelum event.

### Petak Emas

- Kandidat cincin luar semakin sedikit.
- Petak diambil pada ronde terakhir masa berlaku.
- Expire dan pilihan pemain terjadi hampir bersamaan.
- Spawn baru pada langkah yang sama dengan expire lama.

### Ajakan

- Dua pemain mengirim pada saat yang hampir sama.
- Sender disconnect setelah send.
- Target disconnect sebelum menjawab.
- Target reconnect saat countdown masih berjalan.
- Target adalah active player dengan sisa waktu kurang dari satu detik.
- Turn selesai tepat ketika invite send diproses.
- Target tereliminasi oleh Ajakan.
- Pengirim tereliminasi sebelum Ajakan selesai.

### Finish/rematch

- Refresh setelah game selesai.
- Rematch ketika masih ada callback timeout game lama.
- Host disconnect setelah game selesai.
- Pemain meninggalkan room sebelum rematch.

---

## 10. Test plan lengkap

## 10.1 Unit test engine

- Setup radius, titik awal, dan secrecy board.
- Turn normal dengan seluruh jumlah kandidat tetangga.
- Jalan Buntu dan tidak ada heksa tersisa.
- Risiko dasar, Beban Peringkat 1, musim, dan imunitas.
- Rencana/Realita untuk Zonk, Aman, dan Hoki.
- Multiplayer multiplier dan clamp status.
- Aturan transaksi dan limit Hutang.
- Ganti bulan tepat 11 kali.
- Doom Spending dan Bangkrut.
- Burnout dari seluruh sumber efek.
- Event Tanggal answer/skip/timeout.
- Petak Emas spawn/take/expire.
- Ajakan semua motif dan respons.
- Scoring, tie-breaker, dan ranking eliminated player.
- `toPublicState` tidak membocorkan secret baru.

## 10.2 Property/simulation test engine

Perluas simulasi game penuh dengan seed deterministik dan periksa:

- Kesehatan dan Stress selalu 0–10.
- Kekayaan tidak negatif.
- Hutang 0–Rp25.000.000.
- Satu heksa tidak dibuka dua kali.
- Heksa Mati tidak diinjak.
- Petak Emas maksimal satu aktif.
- Eliminated player tidak mendapat turn/month summary/kartu baru.
- Game selesai tanpa deadlock.
- Ranking memuat setiap pemain tepat sekali.
- Domain event privat tidak ditargetkan ke player yang salah.

## 10.3 Integration test server/Socket.IO

Gunakan minimal dua client Socket.IO nyata:

1. Buat room, join, ready, dan start.
2. Pastikan game disimpan sebagai full state.
3. Pastikan hanya pemain aktif menerima opsi turn.
4. Pilihan valid membuka dan menyelesaikan petak.
5. Pilihan pemain lain ditolak.
6. Pilihan stale ditolak.
7. Double request idempotent.
8. Timeout melakukan auto-pick.
9. Race choose vs timeout tidak double apply.
10. Event Kalender answer dan timeout.
11. Reconnect ketika pending turn.
12. Reconnect ketika pending calendar.
13. Reconnect ketika pending invite.
14. Status privat dan card tidak bocor.
15. Petak Emas spawn, take, dan expire.
16. Eliminasi melewati turn pemain.
17. Spectator tidak dapat melakukan aksi.
18. Ajakan menjeda/resume timer hanya untuk target aktif.
19. Game selesai dan snapshot result.
20. Rematch membersihkan runtime lama.

## 10.4 Test web

- Snapshot lebih baru diterapkan; snapshot lama ditolak.
- Patch/event version lama ditolak.
- Pending turn hanya menyalakan koordinat resmi.
- Jalan Buntu menampilkan penalti.
- Tombol konfirmasi disable saat request pending.
- Pion tidak bergerak optimistis.
- Timer memakai server offset dan deadline.
- Timer paused membeku pada `remainingMs`.
- Modal pending dipulihkan dari snapshot.
- Public state tidak digunakan untuk membuat status privat lawan.
- Tile result dan status update dapat tiba dalam urutan jaringan berbeda tanpa merusak UI.
- Eliminated/spectator mode menghilangkan kontrol aksi.
- Result screen menangani ranking seri.

## 10.5 Manual smoke test

Jalankan server dan web, lalu gunakan dua browser/profile berbeda:

1. Buat dua guest dan masuk ke room yang sama.
2. Pilih pion, ready, dan mulai game.
3. Pastikan hanya pemain aktif melihat tiga opsi.
4. Buka modal detail dan pilih satu heksa.
5. Pastikan kedua browser melihat gerakan/hasil publik yang sama.
6. Pastikan status privat hanya berubah pada browser pemilik.
7. Biarkan satu turn timeout dan periksa auto-pick.
8. Refresh pemain aktif ketika modal turn terbuka.
9. Putuskan koneksi dan resume sebelum/sesudah deadline.
10. Jalankan sampai ganti bulan dan Event Tanggal.
11. Periksa spawn/expire/ambil Petak Emas.
12. Kirim Ajakan ketika target sedang dan tidak sedang mendapat giliran.
13. Uji eliminasi lalu spectator.
14. Selesaikan langkah 24 dan periksa ranking.
15. Jalankan rematch dan pastikan tidak ada event dari game lama.

---

## 11. Quality gates per tahap

Setelah setiap tahap kode:

```bash
npm run typecheck
npm test
```

Sebelum menutup seluruh issue:

```bash
npm run typecheck
npm test
npm run lint
npm run build
git diff --check
```

Jika monorepo tidak memiliki script `lint` atau `build` di root, jalankan script workspace yang setara dan catat command aktual pada laporan penyelesaian. Jangan menambahkan dependency hanya untuk memenuhi command dokumentasi ini.

---

## 12. Definition of Done

Issue ini selesai hanya jika seluruh kondisi berikut terpenuhi:

- [ ] Game 2–4 pemain dapat berjalan dari room sampai langkah 24.
- [ ] Semua mutasi game ditentukan server melalui engine.
- [ ] Browser tidak memiliki data heksa atau motif yang masih rahasia.
- [ ] Turn, kalender, Petak Emas, Ajakan, ekonomi, eliminasi, dan ranking mengikuti GDD.
- [ ] Timeout tetap berjalan ketika client disconnect.
- [ ] Reconnect memulihkan public state, status privat, pending action, timer, dan result.
- [ ] Race action/timeout dan duplicate request tidak menerapkan efek dua kali.
- [ ] Spectator tidak dapat melakukan aksi atau melihat data privat.
- [ ] UI board interaktif hanya berdasarkan opsi authoritative.
- [ ] Seluruh schema dan event sesuai API contract.
- [ ] Unit, simulation, integration, reconnect, timer, dan UI test lulus.
- [ ] `npm run typecheck` dan `npm test` lulus.
- [ ] Lint/build yang tersedia lulus.
- [ ] Tidak ada perubahan angka mekanik di luar GDD.
- [ ] Tidak ada import `@pejuang/engine` dari `apps/web`.
- [ ] Tidak ada file `.env`, secret, commit, atau push yang dibuat oleh implementer.

---

## 13. Larangan implementasi

- Jangan memindahkan aturan domain ke React component atau Zustand store.
- Jangan mempercayai category, effects, score, deadline, atau outcome dari klien.
- Jangan mengirim full engine state untuk mempermudah rendering.
- Jangan menggunakan broadcast publik untuk payload privat.
- Jangan mengundi ulang opsi saat reconnect atau timeout.
- Jangan membuat timer per detik sebagai sumber kebenaran.
- Jangan melakukan optimistic movement/status mutation.
- Jangan menaruh seluruh runtime, timer, dan socket action dalam satu file handler besar.
- Jangan menangkap error lalu tetap menyimpan partial state.
- Jangan menyelesaikan keputusan produk terbuka tanpa memperbarui GDD/kontrak.
- Jangan mereset atau menimpa perubahan lokal yang tidak terkait, khususnya perubahan pada `apps/server/src/http/router.ts` dan folder `example/`.

---

## 14. Urutan delivery yang disarankan

Agar setiap PR kecil dan dapat ditinjau:

1. Full engine state repository + public snapshot secrecy.
2. Runtime/domain event emitter tanpa UI baru.
3. Turn handlers + authoritative timer + integration test.
4. Snapshot reconnect lengkap untuk pending turn.
5. UI turn selection dan Realita.
6. Event Tanggal/month/season end-to-end.
7. Skor sementara dan Beban Peringkat 1.
8. Petak Emas end-to-end.
9. Eliminasi dan spectator.
10. Ajakan end-to-end.
11. Hasil akhir dan rematch.
12. Emote dan polish.

Setiap delivery harus tetap menjaga game state lama tidak bocor dan seluruh test sebelumnya tetap lulus.