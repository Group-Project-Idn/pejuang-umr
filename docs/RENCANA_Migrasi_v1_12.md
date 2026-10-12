# Rencana Migrasi ke GDD v1.12: Engine, Shared, Server

Revisi 2: satu jalur, prompt digabung menjadi 7 kelompok (G1-G7), dan keempat keputusan sudah disetujui.

Basis: branch `development` di commit `2e8b98b` (docs v1.12 sudah masuk). Dibandingkan dengan `docs/GDD.md` v1.12 dan `docs/API_CONTRACT.md` v0.3.
Cara analisis: membaca kode. Tes belum dijalankan, jadi perkiraan bisa meleset.

---

## 1. Ringkasan

Hampir semua perubahan v1.12 menyentuh inti engine. Perubahan terbesar adalah **Fase Pembalikan**: hari ini `applyChoice()` di `turn.ts` menerapkan Rencana, Realita, Doom, eliminasi, dan skor sekaligus dalam satu giliran. Di v1.12, alur itu dipecah dua: Rencana langsung berlaku, sisanya ditunda ke akhir ronde.

| Paket | Tingkat perubahan | Inti |
|---|---|---|
| `packages/shared` | Sedang | Skema event v0.3, tipe baru, kode error |
| `packages/engine` | **Besar** | Alur ronde, ekonomi, skor, papan, Ajakan, konten, log keputusan |
| `apps/server` | Sedang-besar | Timer tanpa jeda, popup Ganti Bulan, Fase Pembalikan, avatar, Refleksi AI |
| `apps/web` | Ikut terdampak | Web mengimpor tipe shared. Field yang dihapus akan memecah typecheck web dan CI |

---

## 2. Perubahan per paket

### 2.1 `packages/shared`

| # | File | Perubahan |
|---|---|---|
| S1 | `schemas/common.ts` | `PawnIdSchema` diganti `AvatarIdSchema` berupa enum 4 karakter (`michael`, `raka`, `sinta`, `icha`, sama dengan `apps/web/src/lib/avatars.ts`). Tambah `TurnSecondsSchema` (15/30/60) dan `MotiveSchema` (`sincere`/`commission`) |
| S2 | `schemas/room.ts`, `room-actions.ts` | `PublicPlayer.avatarId` menggantikan `pawn`. Event `room:avatar` menggantikan `room:pawn`. `room:timer` menerima 15 |
| S3 | `schemas/game.ts` | `PublicGameState`: hapus `turnPaused`, `deadHexes`, `spectators`; tambah `phase`; `boardRadius: 6`. `OpenedHex`: tambah `plan` dan `reality` (null sampai Fase Pembalikan). `ScoreRow` 0-100. `GameFinishedPayload`: `avatarId` dan `points`, hapus `modifier`/`modifierPct`. `Snapshot.me`: tambah `pendingMonth` dan `reflection`, hapus `isSpectator` |
| S4 | `schemas/calendar.ts` | `MonthSummaryPayload`: hapus `doomAmount`, tambah `payDebt`. Event `month:pay-debt`. `season:changed`: `zonkFocus` baru dan `hint` |
| S5 | `schemas/invite.ts` | Motif 2 nilai. `invite:send` membawa `turnId`. `invite:resolved.motive` tidak lagi nullable. Hapus op `inviteSincereDeclined` |
| S6 | `socket/events.ts` | Tambah `month:pay-debt`, `round:reveal`, `reflection:ready`. Hapus `turn:timer`, `spectate:enter`. `tile:resolved` membawa `round`, bukan `turnId`. `doom:triggered` membawa `round`, bukan `trigger`. `player:eliminated` membawa `frozenScore` |
| S7 | `common/errors.ts` | Tambah `AVATAR_TAKEN`, `INVITE_NOT_ALLOWED`, `PAYMENT_CLOSED`. Hapus `PAWN_TAKEN`, `INVITE_LIMIT`, `NOT_ELIMINATED` |
| S8 | `schemas/privacy.test.ts` | Tes baru: Realita tidak ada di payload publik sebelum `round:reveal`, motif hanya ke pengirim dan target, Refleksi hanya ke pemiliknya |

### 2.2 `packages/engine`

| # | Area / file | Kondisi sekarang | Target v1.12 |
|---|---|---|---|
| E1 | `data/multiplier.ts` dan semua pemanggil `toMultiplayerEffects` | Rupiah ×2, status ×2 maks ±3 | Dihapus, semua 1× (GDD 1.3) |
| E2 | `economy/constants.ts` | Bunga 10% | 3% (GDD 2.3) |
| E3 | `economy/apply-effects.ts` | Hutang mentok di limit, kekurangan dihapus (`shortfallWrittenOff`), Stress Hutang `ceil(debtAdded / 5jt)` per transaksi | Hutang tanpa batas atas. Stress Hutang +1 per kelipatan Rp5 juta yang **dilewati** (lebih dari, bukan sama dengan). Logika Bayar Hutang lewat petak dihapus |
| E4 | `economy/month-change.ts` | Gaji, biaya, bunga, Doom, cek Bangkrut dan Burnout | Gaji, biaya, bunga saja, plus fungsi baru `payDebt(status, amount)` dengan bonus lunas Level Stress -2. Doom dan eliminasi pindah ke Fase Pembalikan |
| E5 | `economy/elimination.ts` | Hanya Burnout | Tambah `isBankrupt(status)`: Hutang lebih dari Rp25 juta |
| E6 | `data/tiles.ts`, `season-zonks.ts`, `calendar-events.ts`, `invite-plans.ts` | Ada Bayar Hutang, Zonk Musim kendaraan, Kondangan Rp1 juta, Ajakan 3 motif dengan nilai lama | Hapus Bayar Hutang, tambah Jalan-jalan (Sosial), 6 Zonk Musim baru, Kondangan Rp250 ribu, Ajakan 2 motif dengan nilai baru (GDD 4.8) |
| E7 | `score/score.ts`, `ranking.ts` | Harta Bersih × modifier -50%/+20% | Skor seimbang 0-100 (GDD 6.2). Skor beku saat eliminasi. Yang tereliminasi di ronde sama diurutkan menurut skor beku, lalu tie-breaker |
| E8 | `game/initial-state.ts` | Radius 4/5/6 sesuai jumlah pemain, titik awal selalu radius 2 | Radius selalu 6. Titik awal radius 2 untuk 4 pemain, radius 3 untuk 2-3 pemain |
| E9 | `board/*`, `gold/placement.ts`, `turn/round.ts` | Heksa Mati (`markHexDead`, `deadHexKeys`). Petak Emas di radius ≥ 4 | Hapus Heksa Mati. Petak Emas di radius ≤ 4, tidak bersebelahan dengan pion mana pun. Petak Emas yang tidak diambil kembali ke petak asli (engine perlu menyimpan isi asli) |
| E10 | `turn/turn.ts` `applyChoice()` | Satu giliran langsung menjalankan Rencana, Realita, Doom, eliminasi, dan skor | Giliran hanya menjalankan Rencana, `tile:opened`, `player:status`. Hasil Realita **diundi saat memilih** lalu disimpan tersembunyi di state |
| E11 | `turn/turn.ts` `endRound()` (baru: `revealRound()`) | Hanya maju ke langkah berikutnya | Fase Pembalikan: `round:reveal` → `tile:resolved` sesuai urutan → hasil Ajakan → Doom → Bangkrut dan Burnout → skor → selesai jika ≤ 1 pemain atau Langkah 24 |
| E12 | `turn/round.ts` `startRound()` | Ganti bulan langsung memproses semua dan bisa mengeliminasi | Fase baru `monthChange`: menunggu jawaban slider (`payDebt`), lalu Event Tanggal. Urutan popup sesuai GDD 4.2 |
| E13 | `invite/invite.ts` | 1 Ajakan per ronde untuk seluruh meja, boleh kapan saja, hasil langsung, menjeda timer, Tulus ditolak -Rp3 juta | Hanya di Fase Pilihan pengirim sebelum memilih heksa. Boleh beberapa per ronde (1 kartu per pemain). Target sibuk = `INVALID_TARGET`. Jawaban disimpan, hasil diterapkan di Fase Pembalikan. Tanpa jeda timer |
| E14 | `game/game-state.ts` | `inviteUsedThisRound`, satu `pendingInvite` | Daftar Ajakan ronde ini, hasil Realita tersembunyi per pemain, isi asli Petak Emas, `phase` baru (`monthChange`, `reveal`), log keputusan |
| E15 | Baru: `log/decision-log.ts` dan `reflection/rules-insight.ts` | Tidak ada | Log keputusan per pemain (GDD 6.5) dan insight berbasis aturan (fungsi murni, tanpa LLM) |
| E16 | `turn/simulation*.ts` | Simulasi 200 game dengan aturan lama | Bot membayar Hutang, mengirim Ajakan di gilirannya, plus laporan angka (tingkat Bangkrut, Burnout, Doom, rata-rata skor) untuk balancing |

### 2.3 `apps/server`

| # | File | Perubahan |
|---|---|---|
| V1 | `game/game-session.ts` | Hapus jeda timer (`pausedTurn`, `broadcastTurnTimer`). Ajakan 15 detik, bisa lebih dari satu sekaligus. Fase `monthChange` dengan timer 15 detik, ditutup cepat jika semua sudah bayar. Urutan popup Ganti Bulan → Event Tanggal. Fase Pembalikan dengan jeda animasi sebelum ronde berikutnya. Toleransi 500 ms setelah `deadline` |
| V2 | `socket/register-game-handlers.ts` | Handler `month:pay-debt`. Hapus `spectate:enter`. `invite:send` memakai `turnId` |
| V3 | `socket/register-room-handlers.ts`, `repositories/room-repository.ts` | `room:avatar` menggantikan `room:pawn`. Karakter unik per room, karakter kosong pertama jika bentrok. Timer 15. Pemain tereliminasi yang `room:leave` dikeluarkan dari room. Main Lagi tanpa pemain tereliminasi |
| V4 | `services/snapshot.ts` | `pendingMonth`, `reflection`, `phase`. Hapus `isSpectator` dan `spectators` |
| V5 | Baru: `services/reflection.ts` | Antarmuka `ReflectionProvider` (LLM) dengan batas waktu 15 detik, fallback ke insight berbasis aturan dari engine, lalu kirim `reflection:ready`. Provider asli belum disambungkan karena belum dipilih. Untuk tes dipakai provider palsu |
| V6 | Tes integrasi | `full-game`, `game-flow`, `invite`, `room` diperbarui. `spectator.integration.test.ts` dihapus. Tes privasi baru: Realita tidak bocor sebelum Fase Pembalikan |

---

## 3. Dampak ke web (milik Nickzad)

Web mengimpor tipe dari `@pejuang/shared` di beberapa file (`GameInterface`, `Scoreboard`, `GameBoard`, `waiting-room`, `lobby-client`, `game-view`, `room-session-view`). Jika shared langsung menghapus `pawn`, `turnPaused`, `spectators`, `deadHexes`, dan `modifier`, **typecheck web gagal dan CI merah**.

Keputusan (D3): **expand lalu contract.**
1. G1 hanya **menambah** di shared. Field, enum, dan event lama tidak dihapus atau diubah tipenya, hanya ditandai `@deprecated`, dan engine/server mengisinya dengan nilai netral (`[]`, `false`, `null`). Field baru pada objek yang sudah ada dibuat opsional dulu.
2. Nickzad memindahkan web ke kontrak baru.
3. G7 menghapus field lama dan menjadikan field baru wajib.

---

## 4. Keputusan (disetujui 12 Oktober 2026)

| # | Keputusan | Dicatat di |
|---|---|---|
| D1 | Server mengirim hasil Fase Pembalikan sekaligus, lalu menunggu `REVEAL_STEP_MS` (2.500 ms, dari config) × jumlah pemain sebelum ronde berikutnya | GDD 4.2, 05_PROJECT_STATE |
| D2 | Popup Ganti Bulan: ditutup lebih cepat jika semua yang berhutang sudah bayar; jika tidak ada yang berhutang, lanjut setelah sekitar 3 detik | GDD 2.4, 05_PROJECT_STATE |
| D3 | Expand lalu contract untuk shared (bagian 3) | 05_PROJECT_STATE |
| D4 | Refleksi AI: antarmuka dan insight berbasis aturan dulu, LLM menyusul | GDD 6.5, 05_PROJECT_STATE |
| D5 | Debtor dengan Kekayaan 0 tetap ditunggu seperti debtor lain (mengikuti GDD 2.4 apa adanya). Ia bisa menutup popup lebih cepat dengan membayar Rp0 | GDD 2.4 (tidak berubah) |
| D6 | **(usulan, menunggu konfirmasi)** Fase Pembalikan menunggu semua Ajakan ronde itu dijawab atau habis waktu (maksimal 15 detik) sebelum dimulai | GDD 4.8 (perlu ditambah) |

---

## 5. Rencana prompt Claude Code (satu jalur)

Satu worktree (`../pejuang-umr-v112`), satu branch per kelompok, merge berurutan. Setiap kelompok dikerjakan dalam satu prompt bertahap; Claude Code menjalankan `npm run typecheck && npm test` di akhir setiap tahap. Commit dipecah per tahap oleh kamu (berdasarkan path).

| Kelompok | Gabungan | Isi | Commit (usulan) |
|---|---|---|---|
| **G1** | P1 + P2 + P3 | Kontrak shared v0.3 (expand), konten 1× (pengali dihapus, Jalan-jalan, Zonk Musim, Kondangan), ekonomi (bunga 3%, Hutang tanpa batas, Stress Hutang per kelipatan, `payDebt`, `isBankrupt`) | 3 |
| **G2** | P4 + P5 | Papan (radius 6, titik awal, tanpa Heksa Mati, Petak Emas) dan skor seimbang | 2 |
| **G3** | P6 + P7 + sebagian P11 | Fase Pembalikan dan fase Ganti Bulan dengan slider di engine, plus sambungannya di server (timer popup Ganti Bulan, `month:pay-debt`, jeda Fase Pembalikan, `pendingMonth` di snapshot). Server ikut di G3 supaya game loop tetap jalan dan tes tetap hijau | 3 |
| **G4** | P8 + P9 + P10 + Ajakan dari P11 | Ajakan v1.12 di engine (data, motif, hasil di Fase Pembalikan) dan di server (beberapa Ajakan per ronde, timer per Ajakan, Fase Pembalikan menunggu Ajakan terbuka), log keputusan dan insight berbasis aturan, simulasi bot dengan laporan angka | 3 |
| **G5** | P12 + sisa snapshot | Room (`room:avatar`, keluar setelah eliminasi, tanpa penonton, Main Lagi tanpa pemain tereliminasi), snapshot (kalender tidak maju selama jeda Fase Pembalikan), dan `avatarId` di hasil akhir. Ajakan server sudah pindah ke G4 | 2 |
| **G6** | P13 + P14 | Server: layanan Refleksi dan tes integrasi/privasi menyeluruh | 2 |
| **G7** | P15 | Pembersihan kontrak (setelah web Nickzad pindah) | 1 |

Data Ajakan (nilai dan motif) dipindah dari G1 ke G4 supaya engine tidak setengah jadi: motif `trap` baru hilang bersamaan dengan alur Ajakan baru.

### Perkiraan

- **Rencana inti: 7 prompt** (6 sebelum web siap, 1 sesudahnya).
- Prompt gabungan lebih panjang, jadi peluang butuh prompt lanjutan lebih besar (perkiraan 1 dari 2). Realistis **10-12 prompt**.
- G3 tetap yang paling berisiko. Jika kuota atau konteks habis di tengah, lanjutkan dengan prompt "lanjutkan dari tahap terakhir yang belum lulus" (ada di panduan).

### Konsekuensi penggabungan

- Diff per PR lebih besar, jadi review lebih lama.
- Commit yang dipecah per path belum tentu lulus tes satu per satu. Yang dijamin lulus adalah kondisi akhir branch. CI hanya mengecek PR, jadi ini aman.
- Antara G1 dan G3 alur game masih alur lama dengan angka baru (misalnya Realita masih dibuka per giliran). Ini sengaja, supaya setiap kelompok tetap bisa dimainkan dan dites.

---

## 6. Temuan lain di repo publik

- **Lisensi sprite karakter.** Repo sudah public, padahal `apps/web/public/characters/README.md` mencatat sumbernya repo `nickzadpratama/Final-Project` tanpa file lisensi. Jika gambar itu buatan Nickzad sendiri, cukup tambahkan pernyataan izin di README. Jika berasal dari pihak lain, pastikan izinnya. Sejak v1.12 karakter juga menjadi pion, jadi asetnya makin penting.
- **Tidak ditemukan rahasia** di repo (`.env.example` hanya berisi placeholder `change-me`).
