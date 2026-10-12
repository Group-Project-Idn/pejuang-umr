# Rencana implementasi Gameplay & Movement MVP

Project: **Pejuang UMR: Jakarta Survival**. Dokumen untuk programmer junior dan AI coding agent. Status: **rencana, bukan bukti seluruh fitur selesai**.

## 1. Tujuan dan sumber kebenaran

Lengkapi gameplay multiplayer 2–4 pemain selama 24 langkah dengan mempertahankan kode yang sudah benar. Prioritas pertama: **Giliran → Pilihan Heksa → Movement → Rencana → Realita → Update Statistik → Giliran Berikutnya**.

Urutan acuan:
1. `docs/GDD.md`: aturan, angka, jadwal, glosarium dan eliminasi.
2. `docs/API_CONTRACT.md`: event, payload, privasi, error dan recovery.
3. `docs/CONTENT_SCHEMA.md`: struktur dan skala konten.
4. `docs/02_DESIGN.md`: UI, aksesibilitas dan presentasi.

Jika referensi bertentangan, catat bagian dan hentikan perubahan perilaku terkait. Angka yang disebut usulan di GDD tetap dipakai sebagai baseline saat ini; pelaksana tidak boleh melakukan balancing sendiri.

Di luar MVP: solo, akun/login, database akun/riwayat/rekor, achievement, Hall of Fame, Rapor Insight Solo. Jangan menambah PostgreSQL hanya karena disebut sebagai kemungkinan stack.

## 2. Aturan kerja pelaksana

- Periksa `git status` dan diff sebelum mengedit; jangan menimpa pekerjaan lokal lain.
- Jangan membaca, membuat, atau menampilkan isi `.env`.
- Jangan commit/push atau menambah dependensi npm tanpa izin.
- Gunakan path relatif dari root dalam dokumentasi dan laporan.
- `apps/web` tidak boleh mengimpor `@pejuang/engine`. Engine hanya digunakan server.
- Konten petak, Realita, musim, kalender, Ajakan dan isi papan hanya di `packages/engine/src/data` atau state internal engine; tidak di shared/web.
- Validasi input dengan Zod 4 dari `@pejuang/shared`; tipe kontrak diturunkan melalui `z.infer`, bukan ditulis ulang.
- Field/enum Inggris; teks pemain Indonesia, sapaan kamu, istilah glosarium GDD.
- Rupiah bulat; Kekayaan tidak negatif; Kesehatan/Level Stress 0–10; Hutang sesuai limit GDD.
- Semua RNG gameplay melalui `RandomSource` dari `packages/engine/src/random.ts`. Pemakaian `Math.random` internal adapter sumber acak berbeda dari undian langsung di gameplay.
- Perubahan perilaku wajib memiliki tes Vitest. Gunakan fake clock dan RNG terkontrol untuk hasil reproducible.
- Selesaikan satu task kecil per perubahan; jangan mengganti engine atau controller secara menyeluruh.

## 3. Baseline yang ditemukan

Inspeksi menunjukkan modul berikut sudah tersedia. Keberadaan file bukan bukti seluruh acceptance criteria terpenuhi; audit tes dan perilakunya dahulu.

| Area | Kode existing | Langkah berikutnya |
|---|---|---|
| Papan/movement | `packages/engine/src/board/movement.ts`, `hex/*`, `game/initial-state.ts` | Uji radius, titik awal, opsi normal, Jalan Buntu |
| Turn/round | `packages/engine/src/turn/turn.ts`, `round.ts` | Audit transaksi dan pergantian giliran |
| Realita/ekonomi/skor | `packages/engine/src/reality/*`, `economy/*`, `score/*` | Tambah kasus batas, bukan implementasi ulang |
| Kalender/Emas/konten | `packages/engine/src/calendar/*`, `gold/*`, `data/*` | Cocokkan jadwal dan tabel GDD |
| Runtime server | `apps/server/src/game/game-session.ts`, `clock.ts`, dispatcher, snapshot, handler | Uji timer, race, privasi dan recovery |
| Client synchronization | `apps/web/src/lib/game-view.ts`, `room-session-view.ts`, `session-resume-controller.ts`, `socket-subscriptions.ts` | Pertahankan sequencing dan recovery existing |
| UI | Lobby/Room dan `apps/web/src/app/components/game/*` | Hubungkan opsi, DOM HUD, aksesibilitas dan fallback |
| Ajakan | Kontrak API dan data tersedia; folder engine `invite` belum ada pada inspeksi | Audit seluruh alur lalu lengkapi engine/server/web |

Temuan audit spesifik:
- GDD §4.1 sudah menetapkan Jalan Buntu: **3 heksa tertutup terdekat**, jika kurang dari 3 tampilkan semuanya, tie jarak dipilih acak. Boleh mengisi slot dari kelompok jarak berikutnya; bukan hanya kelompok jarak minimum.
- `turn.ts` memiliki `withGoldLit` yang memaksa Emas bersebelahan masuk pilihan. GDD §4.7 tidak menyatakan prioritas highlight secara eksplisit. Jangan mengubah atau menganggapnya keputusan final sebelum konfirmasi.
- `apps/server/src/game/full-game.integration.test.ts` memakai undian pilihan kalender langsung dengan `Math.random`; rencanakan tes deterministik.
- Handler game yang diperiksa mencakup `calendar:answer`, `turn:choose`, `turn:jump`; jangan menganggap Ajakan end-to-end sudah tersedia.
- Board memakai Canvas/OrbitControls; fallback WebGL dan mode hemat perlu dibuktikan, tidak cukup kamera bisa diputar.

## 4. Arsitektur dan invariant

```text
apps/web: DOM UI + R3F papan/sprite + proyeksi state + preferensi UI
    ↕ HTTP / Socket.IO (@pejuang/shared)
apps/server: auth + validasi + idempotensi + GameSession/timer + dispatch
    → packages/engine: aturan + konten rahasia + RNG + transaksi
```

Shared berisi geometri heksa tanpa isi papan, skema dan kontrak. Zustand untuk preferensi/state tampilan yang diterima, bukan engine kedua. Server menerima niat pemain dan menentukan hasil. Animasi tidak menghambat server.

State machine konseptual:
`waiting → countdown → calendar → calendar response jika ada → selection → movement/plan → reality jika bukan Emas → proses lanjutan GDD → eliminasi/skor → next turn/round/finished`.

Tidak wajib membuat enum fase baru untuk setiap animasi. Gunakan state internal existing dan transaksi atomik jika sesuai kontrak.

Invariant:
- Maksimal satu turn aktif; setiap pemain aktif maksimal sekali per ronde.
- Tujuan harus termasuk opsi `turnId` aktif, dengan mode normal/jump yang benar.
- Terbuka/Mati tidak dapat dimasuki siapa pun; titik awal sesuai aturan board.
- Aksi dan timeout menyelesaikan turn maksimal sekali; request duplikat tidak menggandakan efek.
- Kalender sekali per ronde; game selesai tidak menerima gameplay baru.
- Pilihan rahasia dan statistik rinci hanya ke pemilik; opened tile menjadi publik.
- Pemain eliminated tidak mendapat giliran, pion tetap di papan dan dapat menonton.
- Putus/keluar tidak membuat bot dan tidak menghentikan timer.

## 5. Format task dan urutan pengerjaan

P0 = kebenaran/keamanan/kelangsungan game; P1 = wajib MVP; P2 = polish. Status awal semua task **belum diverifikasi**, bukan selalu belum diimplementasikan.

Setiap task: baca referensi → periksa existing/diff → tambah tes regresi → perubahan minimum → tes task → gate workspace → laporkan. Jika acceptance criteria sudah terpenuhi, catat bukti dan jangan menulis ulang.

### Fase A — Audit dan baseline

| ID / prioritas | Tujuan & area | Dependensi | Instruksi junior/AI & acceptance criteria |
|---|---|---|---|
| A01 / P0 | Matriks aturan; docs dan semua workspace | Tidak ada | Petakan tiap aturan ke bagian GDD, file dan tes. Tandai sesuai/belum terbukti/belum ada/konflik. Selesai jika seluruh scope brief terpetakan tanpa keputusan produk rekaan. |
| A02 / P0 | Baseline scripts/tes | Tidak ada; paralel A01 | Jalankan `npm run typecheck` dan `npm test`, simpan hasil/exit code. Selesai jika kegagalan awal dan perubahan lokal diketahui. |
| A03 / P0 | Kontrak; `packages/shared/src/schemas/*`, `socket/events.ts` | A01 | Inventaris input/push/ack/public-private. Selesai jika setiap fitur punya kontrak dan tidak ada konten rahasia shared. Jangan menambah payload tandingan. |

Milestone: daftar gap terverifikasi dan keputusan terblokir disepakati.

### Fase B — Core movement dan turn (prioritas pertama)

| ID / prioritas | Tujuan & file/area | Dependensi | Instruksi junior/AI & acceptance criteria |
|---|---|---|---|
| B01 / P0 | Init board; `engine/src/game/create-game.ts`, `initial-state.ts`, `hex/*`, `board/*` | A01–A03 | Audit radius dan assignment konten sejak awal. Tes 2/3/4 pemain: radius 4/5/6, 61/91/127 heksa; titik awal unik cincin radius 2 dan jarak/penempatan sesuai GDD §4.1. |
| B02 / P0 | Opsi normal; `engine/src/board/movement.ts`, `movement.test.ts` | B01 | Tes tetangga valid 0–6 dengan RNG terkontrol. 1–3 valid semuanya; 4–6 tepat 3 unik. Tidak memilih luar board, opened/dead. Kasus 0 masuk B03. |
| B03 / P0 | Jalan Buntu; movement dan `turn/turn.ts` | B02 | Tes tiga heksa tertutup terdekat, tie RNG, kurang dari tiga, board habis. Jump memberi Stress +1 sekali, menjalankan efek tujuan dan menggunakan satu giliran; board habis skip tanpa efek. |
| B04 / P0 | Validasi aksi; `turn.ts`, `server/src/socket/register-game-handlers.ts` | B02–B03 | Tolak pemain salah, turn lama, mode salah dan koordinat bukan opsi tanpa mutasi. Tes request ganda/idempotensi; hanya satu movement/efek. Validasi schema memakai shared. |
| B05 / P0 | Rencana/Realita/transaksi; `turn.ts`, `reality/*`, `economy/*` | B04 | Audit urutan persis GDD, termasuk Doom Spending dan pemeriksaan eliminasi. Tes Emas tanpa Realita, hasil probabilitas lalu varian, posisi/statistik/skor berubah sekali. Jangan mengeliminasi semua shortfall biasa sebagai Bangkrut. |
| B06 / P0 | Next turn/round; `turn.ts`, `round.ts`, `server/src/game/game-session.ts` | B05 | Tes semua pemain hidup sekali per ronde, eliminated dilewati, rotasi bulanan GDD, board habis. Tidak ada double round advance. |

Milestone: satu ronde dapat disimulasikan tanpa UI, hasil reproducible.

### Fase C — Timer dan multiplayer synchronization

| ID / prioritas | Tujuan & file/area | Dependensi | Instruksi junior/AI & acceptance criteria |
|---|---|---|---|
| C01 / P0 | Timer; `server/src/game/game-session.ts`, `clock.ts`, `test-clock.ts` | B04–B06 | Fake clock 30/60 detik; deadline server mulai saat pilihan aktif. Timeout memilih opsi sah melalui RNG. Tes aksi vs timeout, callback lama dan dispose: satu penyelesaian, timer lama dibersihkan. |
| C02 / P0 | Dispatch/privasi; `game/event-dispatcher.ts`, `services/snapshot.ts` | A03, B05 | Tes beberapa client dan spectator. Opsi/status rinci tidak dikirim ke lawan; opened tile publik; snapshot whitelist tidak berisi tiles rahasia/seed/motif target. |
| C03 / P0 | Proyeksi client; `web/src/lib/game-view.ts`, `room-session-view.ts`, `socket-subscriptions.ts` | C02 | Gunakan reducer existing. Tes contiguous/stale/duplicate/gap; gap memicu resume dan snapshot mengembalikan pending turn/calendar. Handler typed sesuai event. |
| C04 / P0 | Recovery; `session-resume-controller.ts`, controller Room, snapshot server | C01–C03 | Tes disconnect, timeout resume, reconnect berulang dan cleanup. Single-flight; callback setelah unmount aman; pion/game tidak digandakan; timeout tetap jalan saat putus. Recovery lintas restart diblokir D4. |

Milestone: dua client konsisten, resume mengembalikan pending action yang benar.

### Fase D — Kalender, ekonomi, musim dan Petak Emas

| ID / prioritas | Tujuan & file/area | Dependensi | Instruksi junior/AI & acceptance criteria |
|---|---|---|---|
| D01 / P0 | Jadwal; `engine/src/calendar/*`, `turn/round.ts`, `economy/schedule.ts` | B06 | Tes 24 langkah, tanggal/bulan/musim. Ganti bulan pada 3,5,…,23 saja; tidak ada pembayaran bulanan setelah 24. |
| D02 / P0 | Ekonomi; `engine/src/economy/*`, `data/multiplier.ts` | D01 | Table tests gaji Rp5.730.000, biaya Rp4.600.000, bunga 10%, limit Rp25.000.000, pembayaran dan pinjaman parsial; ikuti urutan §2.4. Tes Stress dari Hutang baru, clamp, shortfall dan eliminasi khusus. Pengali ×2 hanya sumber yang ditetapkan, status batas ±3; Emas/Ajakan/Doom/bulanan tidak dikali. |
| D03 / P1 | Event Tanggal; `data/calendar-events.ts`, `round.ts`, server handler dan UI kalender | C01–C03, D01–D02 | Enam event sesuai katalog, termasuk `joinPaylater` bila tersedia. Deadline 15 detik; timeout skip; jawaban ganda ditolak; tidak menggunakan giliran. Tes hasil probabilitas memakai RNG. |
| D04 / P1 | Risiko/musim; `reality/zonk-chance.ts`, `resolve-reality.ts`, data musim | D01–D02 | Tes rawan +10 pp, burden +15 pp mulai langkah 5 termasuk seri, Zonk ≤80%, Hoki 10%, Aman sisanya. Imunitas health ≥8 Pancaroba dan tag kebal mengikuti GDD. Risiko ≤15/16–34/≥35%. |
| D05 / P1 | Emas; `gold/placement.ts`, `round.ts`, `turn.ts` | B02, D01; keputusan D1 untuk highlight | Tes spawn 1,5,9,13,17,21; satu aktif, lifetime 4 ronde, mengganti heksa tertutup cincin luar radius ≥4 sesuai algoritme existing/GDD, expired menjadi dead. Hadiah tanpa pengali/Realita. Jangan mengubah highlight sampai D1 diputuskan. |

Milestone: jadwal dan transaksi sampai akhir tahun konsisten.

### Fase E — UI gameplay dan platform

| ID / prioritas | Tujuan & file/area | Dependensi | Instruksi junior/AI & acceptance criteria |
|---|---|---|---|
| E01 / P1 | Pilihan/detail; `web/src/app/components/game/GameBoard.tsx`, `GameInterface.tsx`, detail sheet existing | C03; paralel D | Render opsi server dan kategori/judul/Rencana/risiko. Klik untuk detail lalu konfirmasi. Hanya opsi turn aktif boleh submit; busy mencegah double click; lawan tidak menerima detail tertutup. |
| E02 / P1 | Sprite/animasi; `CharacterSprite.tsx`, `GameCharacters.tsx` | E01 | PNG `public/characters`, tidak mengganti aset dengan emoji. Posisi mengikuti server; jump dibedakan; eliminated tetap tampil; reduced motion tersedia. Animasi tidak menentukan hasil/durasi server. |
| E03 / P1 | HUD/status/skor; `StatusPanel.tsx`, `Scoreboard.tsx`, `GameInterface.tsx` | C03, D02 | DOM untuk teks/HUD, dark default, icon+warna dan kontras ≥4.5:1. Hutang angka+badge bukan bar; Rupiah, label GDD dan layout mobile terbaca; tidak menampilkan statistik lawan. |
| E04 / P1 | Keyboard/fallback/mode hemat; board dan komponen fallback baru bila diperlukan | E01–E03; keputusan D2 | Usulan fallback DOM daftar tujuan+detail+konfirmasi; setujui dahulu. Semua aksi penting keyboard, focus visible, WebGL gagal tetap playable; mode hemat tidak mengubah rules. Tes pilihan via fallback memakai payload yang sama. |

Milestone: mouse/touch/keyboard dapat menyelesaikan turn, UI tidak membocorkan informasi.

### Fase F — Eliminasi dan finish

| ID / prioritas | Tujuan & file/area | Dependensi | Instruksi junior/AI & acceptance criteria |
|---|---|---|---|
| F01 / P0 | Eliminasi; `economy/elimination.ts`, turn/round/session | D02, B06 | Tes Bangkrut hanya pada kewajiban bulanan/Doom sesuai GDD; burnout health 0 atau stress 10+health ≤3 pada titik evaluasi yang benar. Pion tetap, hak aksi hilang, spectator dapat recovery. |
| F02 / P0 | Ranking; `engine/src/score/ranking.ts` | F01 | Tes harta bersih negatif/positif, modifier -50%/+20%, abs(netWorth), survivor di atas eliminated; eliminated berdasar lama bertahan; tie-break hutang lalu stress dan peringkat bersama mengikuti GDD. |
| F03 / P1 | Result; session, snapshot dan UI hasil existing | F02, C03 | Selesai setelah langkah 24 atau ≤1 hidup; satu hasil final; aksi baru ditolak; resume setelah finish mengembalikan result sama. Hasil publik hanya field sesuai API, bukan empat statistik semua pemain. |

### Fase G — Ajakan end-to-end

| ID / prioritas | Tujuan & file/area | Dependensi | Instruksi junior/AI & acceptance criteria |
|---|---|---|---|
| G01 / P1 | Kontrak/state Ajakan; shared existing, engine game state, snapshot | A03, D02; keputusan D3 | Audit API §14 dan mekanisme public/private. Tetapkan state pending tanpa payload tandingan. Pengirim tahu motif; target sebelum jawab tidak tahu; resume memulihkan pending/deadline. |
| G02 / P1 | Engine Ajakan; usulan `engine/src/invite/*`, `data/invite-plans.ts` | G01 | Jadwal bulan 1/3/5/7/9/11, kartu lama hangus, max 1. Motif 50/25/25 lewat RNG; empat Rencana dan efek motif sesuai GDD; tanpa ×2. Tolak self/target eliminated sesuai kontrak. |
| G03 / P0 | Runtime/handler; server GameSession dan register-game-handlers | G02, C01; keputusan D3 | Lock maksimal satu Ajakan per ronde; first accepted menang, request lain tidak memakai kartu. Timeout 10 detik=tolak. Pause timer turn hanya jika target pemain aktif; simpan sisa waktu dan resume tepat. Tes race, disconnect, kalender, finish dan dispose. |
| G04 / P1 | UI; komponen Ajakan existing dan controller Room | G03, C03 | Hubungkan kirim/target/jawab/hasil. Konfirmasi privacy motif: accept terbuka untuk target; reject non-Tulus tidak dibuka; reject Tulus publik memerlukan kanal sesuai kontrak (klarifikasi jika belum tersedia). Pending recovery sama; tidak menghabiskan langkah. |

Milestone: Ajakan tidak merusak timer, sequencing, privasi atau peringkat.

### Fase H — Gate MVP

| ID / prioritas | Tujuan & area | Dependensi | Instruksi junior/AI & acceptance criteria |
|---|---|---|---|
| H01 / P0 | Simulation/full integration; `engine/src/turn/*test.ts`, `server/src/game/*integration.test.ts` | B–G | Hilangkan undian langsung dari tes kalender memakai sumber terkontrol; tambah simulasi 2/3/4 pemain, timeout, jump, eliminasi dan finish. Hasil reproducible, invariant konsisten, tidak ada timer tertinggal. |
| H02 / P1 | Uji perangkat & aset | E–G | Catat perangkat/browser, masalah input/kinerja dan lisensi PNG. Android kelas menengah, desktop, fallback, reduced motion dan mode hemat harus bisa menjalankan gameplay. Jangan mengklaim lolos perangkat yang belum diuji. |
| H03 / P0 | Gate dan status rencana | Semua task selesai/terblokir tercatat | Jalankan typecheck, tes, lint, build dan diff check. Catat exit code, kegagalan baseline, task tertunda. Selesai jika gate lulus dan blocker deployment jelas. |

## 6. Dependensi dan paralelisme

```text
A → B → C → D → F
        └→ E
C + D + keputusan Ajakan → G
B–G → H
```

- A01/A02 independen. UI E dapat paralel dengan D setelah kontrak C03 stabil.
- Tes ekonomi/konten dapat dikerjakan terpisah setelah fixture/skala disepakati.
- Jangan menugaskan dua agent mengedit `turn.ts`, `round.ts`, `game-session.ts` atau controller Room bersamaan.
- Integrasikan per task dan jalankan gate sebelum task bergantung dimulai. Ajakan tahap akhir tetapi tetap wajib MVP.

## 7. Keputusan / blocker (jangan mengarang produk)

| ID | Status | Pertanyaan dan tindakan |
|---|---|---|
| D1 | Perlu konfirmasi | Emas bersebelahan selalu menyala (kode sekarang) atau ikut undian normal? GDD §4.7 belum eksplisit. Pertahankan baseline sampai keputusan, jangan menyebut komentar kode sebagai aturan. |
| D2 | Perlu persetujuan presentasi | Setujui fallback DOM daftar opsi+detail+konfirmasi? GDD mewajibkan fallback tetapi bukan bentuknya. Tidak mengubah aksi game. |
| D3 | Perlu konfirmasi prioritas | Ajakan saat Event Tanggal, pergantian ronde atau hasil final: bagaimana arbitration dan timeout? GDD menjeda timer turn aktif target, bukan otomatis timer kalender. Jangan menjeda semua timer berdasarkan asumsi. Klarifikasi juga kanal publik motif Tulus yang ditolak jika kontrak belum memadai. |
| D4 | Perlu konfirmasi scope | Reconnect hanya selama proses server hidup atau recovery lintas restart? Repository existing in-memory tidak berarti persistensi. Jangan menambah DB tanpa keputusan. Persistensi membutuhkan state, RNG continuation, deadline, versi dan idempotensi atomik. |
| D5 | Blocker deployment | Lisensi empat PNG karakter belum dibuktikan; minta bukti atau ganti dengan aset berizin. |

Jalan Buntu bukan blocker produk: sudah dijelaskan GDD §4.1. Keputusan D1–D4 tidak menghalangi audit/tes perilaku yang jelas, tetapi menghentikan perubahan terkait.

## 8. Risiko dan mitigasi

| Risiko | Mitigasi |
|---|---|
| Race aksi vs timer | Guard turnId/pending dan satu penyelesaian; fake clock |
| Secret board/motif bocor | Whitelist snapshot, private dispatch, negative tests beberapa client |
| Event hilang/ganda | Sequencing existing, request idempotensi, snapshot recovery |
| Pengali ganda/ekonomi salah | Satu jalur konversi, table tests pengecualian/shortfall |
| RNG tes flakey | Seed/sequence RandomSource dan fake clock; jangan undian bebas |
| Ajakan melewati batas ronde | Arbitration tertulis, lock room dan tes boundary |
| Animasi menghambat gameplay | UI hanya presentasi state server; tidak menunggu animation ack |
| WebGL lambat/gagal | Instancing sesuai existing, kualitas terbatas, mode hemat, fallback dan tes HP |
| Restart kehilangan game | Laporkan limit in-memory, scope recovery diputuskan terpisah |
| Agent menulis ulang kode benar | Satu task/satu perilaku; acceptance tests dahulu; review diff |

## 9. Template prompt task

> Kerjakan hanya task [ID]. Baca bagian GDD/API/CONTENT_SCHEMA terkait, file existing dan tesnya. Periksa perubahan lokal. Tambah tes acceptance/regresi lalu ubah minimum. Jangan menambah dependensi, mengubah aturan terblokir, membaca .env, atau commit/push. Gunakan RandomSource dan skema shared. Jalankan tes task, npm run typecheck dan npm test. Laporkan file berubah, hasil/exit code, bukti acceptance dan sisa pekerjaan.

## 10. Definition of Done dan validasi

- [ ] Guest → Room → Countdown → Game → Result berjalan untuk 2/3/4 pemain.
- [ ] Movement normal/jump/timeout, Rencana/Realita dan giliran sesuai GDD.
- [ ] Kalender, ekonomi, musim, burden, Emas dan Ajakan end-to-end teruji.
- [ ] Privasi, idempotensi, sequencing dan reconnect terjaga.
- [ ] Eliminasi, final ranking dan result snapshot benar.
- [ ] DOM HUD, icon+warna, keyboard, reduced motion, mode hemat dan fallback tersedia.
- [ ] Lisensi aset dan keputusan blocker terdokumentasi.
- [ ] Tidak ada impor engine di web atau konten rahasia di shared.
- [ ] Semua gate lulus; tidak ada klaim browser/HP tanpa pengujian nyata.

Perintah dari root (pelaksana harus mempertahankan exit code, jangan hanya membaca tail):

```sh
npm run typecheck
npm test
npm run lint
npm run build
git diff --check
```

Rencana ini tidak memerintahkan perubahan gameplay sebelum keputusan penting disetujui. Mulai A01–A03 lalu B01–B06/C01; pertahankan perilaku yang sudah terbukti benar.

## 11. Status implementasi 12 Oktober 2026

Legenda: **selesai** = acceptance utama terbukti oleh kode dan tes otomatis; **parsial** = jalur utama tersedia tetapi masih ada acceptance yang belum diuji/diimplementasikan; **terblokir** = menunggu keputusan pada §7; **belum diuji nyata** = tidak boleh diklaim hanya dari unit/build.

| Task | Status | Bukti dan catatan |
|---|---|---|
| A01–A03 | Selesai | Aturan, arsitektur, kontrak public/private, skema Zod dan gap sudah dipetakan dalam dokumen ini. `packages/shared/src/schemas/privacy.test.ts` dan `web-dependency.test.ts` menjaga batas privasi/dependensi. |
| B01–B06 | Selesai | `packages/engine/src/game/game.test.ts`, `board/*test.ts`, `turn/turn.test.ts`, `turn/round.test.ts`, dan simulasi membuktikan init papan, opsi normal, Jalan Buntu, transaksi, eliminasi, next turn/round dan finish. D1 tidak diubah. |
| C01–C04 | Selesai untuk recovery in-memory | Fake clock, idempotensi, privasi multi-client, sequencing, gap/resume dan deadline asli diuji di `apps/server/src/game/*integration.test.ts` serta `apps/web/src/lib/*test.ts`. Recovery lintas restart tetap terblokir D4. |
| D01–D04 | Selesai | Jadwal, ekonomi, kalender, risiko, musim dan burden memiliki table/regression tests di engine; popup kalender kini terhubung ke controller web dan memakai `calendar:answer`. |
| D05 | Parsial / D1 | Spawn, expiry, hadiah dan dead hex teruji. Prioritas highlight Emas bersebelahan dipertahankan seperti baseline sampai D1 dijawab. |
| E01 | Selesai | `GameInterface.tsx` menampilkan opsi privat server sebagai tombol DOM, membuka `HexDetailSheet`, mengonfirmasi, memilih event `turn:choose`/`turn:jump` sesuai payload, dan mencegah double-submit. Opsi tidak masuk state lawan karena hanya event privat/snapshot pemilik yang diproyeksikan. |
| E02 | Parsial | Sprite/posisi server existing dipertahankan. Acceptance reduced motion, beda animasi jump, dan lisensi PNG belum seluruhnya dibuktikan; D5 masih terbuka. |
| E03 | Parsial | HUD/status/skor existing dan format Rupiah detail Rencana tersedia. Audit kontras/layout mobile nyata belum dilakukan. |
| E04 | Terblokir D2 / belum diuji nyata | Tombol opsi DOM dapat dipakai keyboard dan payload sama dengan jalur normal, tetapi fallback ketika WebGL gagal serta mode hemat belum ditetapkan/diuji. |
| F01–F03 | Selesai pada engine/server | Eliminasi, ranking, finish langkah 24/early finish, penolakan aksi setelah finish dan result snapshot diuji. UI hasil khusus masih perlu audit visual bila acceptance mengharuskannya. |
| G01–G04 | Terblokir D3 | Kontrak/data/komponen presentasi sebagian tersedia, tetapi state engine, runtime, timer arbitration, handler dan recovery Ajakan belum diimplementasikan. Tidak ada klaim Ajakan end-to-end. |
| H01 | Parsial | Undian langsung `Math.random` di full integration test sudah dihapus; full game 3 bot, timeout, privasi, sequencing dan simulasi 200 game reproducible lulus. Matriks full integration khusus 2 dan 4 bot masih perlu ditambah setelah G selesai. |
| H02 | Belum diuji nyata / D5 | Tidak ada klaim Android, browser desktop interaktif, WebGL fallback, reduced motion, mode hemat atau lisensi aset. |
| H03 | Selesai untuk perubahan saat ini | Gate di bawah lulus; blocker D1–D5 tetap dicatat dan tidak disamarkan sebagai selesai. |

### Perubahan implementasi pada iterasi ini

- Menambahkan proyeksi privat `turn:options`/`turn:dead-end` ke state sesi web dan cleanup berdasarkan `turnId`/`eventId`.
- Menghubungkan UI Event Tanggal ke `calendar:answer`.
- Menghubungkan pilihan heksa normal/Jalan Buntu ke `turn:choose`/`turn:jump` dengan request id, ack, busy guard dan pesan hasil.
- Menampilkan detail kategori, judul, Rencana, risiko dan nilai Rupiah sebelum konfirmasi.
- Menambah empat tes regresi proyeksi/cleanup private action.
- Mengganti pilihan kalender acak langsung pada full integration test dengan cursor deterministik per bot.

### Hasil gate

| Perintah | Hasil |
|---|---|
| `npm run typecheck` | Exit 0; server, web, engine dan shared lulus. |
| `npm test` | Exit 0; 51 file, 419 tes lulus (server 74, web 71, engine 220, shared 54). |
| `npm run lint` | Exit 0. |
| `npm run build` | Exit 0; Next.js production build, TypeScript dan 6 halaman selesai. |
| `git diff --check` | Exit 0. |

Implementasi belum dapat dinyatakan sebagai seluruh MVP selesai sampai D2/D3/D5 diputuskan dan G01–G04, E04, serta pengujian perangkat H02 diselesaikan. D1 dan D4 juga harus mendapat keputusan eksplisit sebelum perilakunya diubah.
