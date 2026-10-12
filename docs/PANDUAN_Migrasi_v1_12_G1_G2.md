# Panduan Migrasi GDD v1.12: G1 dan G2

Satu jalur, satu worktree, satu branch per kelompok. Rencana lengkap: `docs/RENCANA_Migrasi_v1_12.md`.

| Kelompok | Isi | Prompt | Commit |
|---|---|---|---|
| G1 | Kontrak shared v0.3 (expand), konten 1×, ekonomi | 1 (3 tahap) | 3 |
| G2 | Papan dan skor seimbang | 1 (2 tahap) | 2 |

Panduan G3-G7 ditulis setelah G2 di-merge, karena isinya bergantung pada kode hasil G1-G2.

---

## Langkah 0 - Catat keputusan dan rencana di repo (Kamu)

File yang dipakai: `GDD.md` dan `05_PROJECT_STATE.md` (sudah memuat keputusan D1-D4), `RENCANA_Migrasi_v1_12_Engine_Shared_Server.md`, dan panduan ini.

```bash
cd ~/Downloads/imron-hacktiv8-excercise/pejuang-umr
git checkout development && git pull
cp ~/Downloads/GDD.md docs/GDD.md
cp ~/Downloads/05_PROJECT_STATE.md docs/05_PROJECT_STATE.md
cp ~/Downloads/RENCANA_Migrasi_v1_12_Engine_Shared_Server.md docs/RENCANA_Migrasi_v1_12.md
cp ~/Downloads/PANDUAN_Migrasi_v1_12_G1_G2.md docs/PANDUAN_Migrasi_v1_12_G1_G2.md
git diff --stat
git add docs/
git commit -m "docs: record v1.12 migration decisions and plan"
git push
```

Prompt Claude Code merujuk ke `docs/RENCANA_Migrasi_v1_12.md`, jadi langkah ini wajib sebelum worktree dibuat.

---

## Langkah 1 - Worktree dan pagar (Kamu)

```bash
git worktree add ../pejuang-umr-v112 -b feat/v112-g1-contract-economy
cp apps/server/.env ../pejuang-umr-v112/apps/server/.env
cd ../pejuang-umr-v112 && npm install && npm run typecheck && npm test
```

Catat jumlah tes yang lulus sebagai pembanding.

**Pagar** (di `pejuang-umr-v112`). Web dikunci, karena G1-G6 tidak boleh menyentuh web:
```bash
mkdir -p .claude && cat > .claude/settings.local.json <<'EOF'
{
  "permissions": {
    "deny": [
      "Edit(./apps/web/**)",
      "Write(./apps/web/**)",
      "Bash(git commit:*)",
      "Bash(git push:*)",
      "Bash(git reset:*)",
      "Bash(git checkout:*)",
      "Bash(git stash:*)",
      "Bash(git merge:*)",
      "Bash(git rebase:*)",
      "Bash(npm install:*)",
      "Read(./**/.env)",
      "Read(./**/.env.*)"
    ]
  }
}
EOF
git status
```

Buka `pejuang-umr-v112` di VS Code, lalu Claude Code: Local → New session. Mulai di **Plan mode**, baca rencananya, lalu setujui ke Auto.

---

## G1 - Kontrak, konten 1×, ekonomi

**Penjelasan singkat.**
- **Tahap 1** hanya menambah ke shared (pola expand, keputusan D3). Web tidak diubah dan harus tetap lulus typecheck.
- **Tahap 2** menghapus pengali ×2 dan memperbarui konten.
- **Tahap 3** mengubah aturan ekonomi. Alur ronde belum dirombak; itu tugas G3. Jadi setelah G1, game masih memakai alur lama (Realita per giliran) dengan angka baru. Ini disengaja supaya game tetap bisa dimainkan dan dites.
- Data Ajakan (nilai dan motif) **tidak** disentuh di G1. Itu dikerjakan di G4 bersama alur Ajakan baru.

**Prompt:**
```
Tugas G1 migrasi GDD v1.12: kontrak shared (expand), konten 1×, dan ekonomi.

Baca dulu: docs/RENCANA_Migrasi_v1_12.md (bagian 2.1, 2.2 E1-E6, dan 3), docs/GDD.md (1.3, 1.4, 2.3, 2.4, 3.2-3.4, Bagian 5), docs/API_CONTRACT.md (Bagian 1-3, 10, 15), docs/CONTENT_SCHEMA.md.

Batas:
- Boleh mengubah packages/shared dan packages/engine. Di apps/server hanya file *.test.ts, dan hanya jika nilai yang diharapkan berubah karena aturan baru. JANGAN mengubah apps/web dan kode non-tes di apps/server.
- npm run typecheck mencakup apps/web. Web harus tetap lulus tanpa diubah. Jika tidak mungkin, berhenti dan laporkan.
- Kerjakan per tahap. Di akhir setiap tahap jalankan npm run typecheck && npm test sampai lulus, baru lanjut.
- Di akhir, tulis ringkasan per tahap: file yang diubah dan tes yang ditambah.

TAHAP 1 - Shared: kontrak v0.3 secara expand (hanya packages/shared)
Aturan expand: JANGAN menghapus atau mengubah tipe field, nilai enum, event, atau kode error yang sudah ada. Yang tidak dipakai lagi di v0.3 cukup diberi JSDoc @deprecated. Field baru pada skema yang sudah ada dibuat .optional() dengan komentar "// v0.3: wajib setelah pembersihan G7".
1. Skema baru: CharacterIdSchema (enum "michael", "raka", "sinta", "icha"), TurnSecondsSchema (15 | 30 | 60), RevealedRealitySchema, ReflectionSchema, MonthSummaryPayload sebagai tipe bernama.
2. Field baru opsional: PublicGameState.phase; OpenedHex.plan dan OpenedHex.reality; ranking di GameFinishedPayload: avatarId dan points { finance, health, calm }; Snapshot.me.pendingMonth dan Snapshot.me.reflection; MonthSummaryPayload.payDebt; season:changed.hint; player:eliminated.frozenScore; doom:triggered.round; tile:resolved.round; invite:send.turnId.
3. Tambah nilai zonkFocus "floodRain" dan "heatPollution" (nilai lama tetap ada). room:timer dan RoomState.turnSeconds menerima 15.
4. Event baru di socket/events.ts dan socket/client-event-schemas.ts sesuai docs/API_CONTRACT.md v0.3: room:avatar (C→S), month:pay-debt (C→S, ack berisi paid, debtCleared, stressDelta), round:reveal (S→R), reflection:ready (S→C). turn:timer dan spectate:enter tetap ada dan diberi @deprecated.
5. Kode error baru: AVATAR_TAKEN, INVITE_NOT_ALLOWED, PAYMENT_CLOSED.
6. Tes skema untuk semua tambahan, memakai contoh payload dari API_CONTRACT.

TAHAP 2 - Engine: konten 1×
1. Hapus pengali Multiplayer (GDD 1.3 v1.12): hapus packages/engine/src/data/multiplier.ts dan semua pemanggil toMultiplayerEffects. Efek dipakai apa adanya. Perbarui komentar yang menyebut nilai Solo atau Multiplayer.
2. Petak: hapus "paying-debt" beserta 6 Realitanya. Tambah petak "day-trip" (Jalan-jalan), kategori social, Zonk dasar 20%, Rencana dan 6 Realita persis GDD 5.1 dan 5.2. Tes komposisi menjadi 3 work, 4 social, 3 health, 2 finance. Tambah tes: tidak ada efek debt bernilai negatif di konten.
3. Zonk Musim: ganti 6 varian rainy dan dry sesuai tabel GDD 3.4 v1.12, id kebab-case Inggris (rainy-flooded-motorbike, rainy-leaky-room, rainy-ojol-surge, dry-electricity-bill, dry-pam-water-outage, dry-dusty-motorbike). focus "Banjir dan Kehujanan" dan "Panas dan Polusi". Varian transition tetap.
4. season:changed: zonkFocus "floodRain" (rainy), "heatPollution" (dry), "sick" (transition), dan isi hint, contoh "Pancaroba: petak Kesehatan lebih rawan".
5. Event Tanggal: Kondangan Teman pilihan join menjadi Kekayaan -250.000. Nilai lain mengikuti tabel GDD 3.3 apa adanya.
6. JANGAN mengubah packages/engine/src/data/invite-plans.ts. Data Ajakan dikerjakan di G4.

TAHAP 3 - Engine: ekonomi
1. Bunga Hutang 3% (DEBT_INTEREST_PCT).
2. applyEffects: Hutang tidak punya batas atas, dan kekurangan Kekayaan selalu menjadi Hutang. Hapus shortfallWrittenOff serta logika Bayar Hutang lewat efek debt negatif.
3. Stress Hutang (GDD 2.3 v1.12): Level Stress +1 untuk setiap kelipatan Rp5.000.000 yang DILEWATI (lebih dari, bukan sama dengan) oleh total Hutang dalam satu transaksi. Contoh untuk tes:
   - 0 → 5.000.000: +0
   - 0 → 5.000.001: +1
   - 4.500.000 → 10.500.000: +2
   - Hutang 9.000.000 turun ke 4.000.000, lalu naik ke 6.000.000: +1
4. Fungsi baru payDebt(status, amount): amount dibatasi 0 sampai min(Kekayaan, Hutang), mengurangi Kekayaan dan Hutang, dan memberi Level Stress -2 jika Hutang berubah dari lebih dari 0 menjadi 0 (GDD 2.4 v1.12). Belum disambungkan ke alur (itu G3).
5. isBankrupt(status): Hutang lebih dari 25.000.000 (GDD 1.4 v1.12). debtLimit di PrivateStatus tetap 25.000.000.
6. processMonthChange hanya memproses gaji, biaya hidup, dan bunga. Hapus Doom Spending dan eliminasi dari fungsi ini. summary.doomAmount diisi null (field deprecated).
7. Penyesuaian sementara di turn/round.ts dan turn/turn.ts supaya game tetap utuh sampai G3: setelah ganti bulan dan setelah giliran, eliminasi dicek dengan isBankrupt dan isBurnout di tempat yang sama seperti sekarang. Doom Spending tetap di akhir giliran. Jangan merombak alur ronde.
8. Perbarui tes engine dan tes simulasi sesuai aturan baru.

Selesai jika npm run typecheck && npm test lulus.
```

**Cek akhir (Kamu):**
```bash
npm run typecheck && npm test
git diff origin/development --stat
```
Tidak boleh ada file di `apps/web/`. File di `apps/server/` hanya `*.test.ts`.

**Commit dipecah per tahap:**
```bash
git add packages/shared
git commit -m "feat(shared): add contract v0.3 schemas alongside deprecated fields"

git add packages/engine/src/data
git commit -m "feat(engine): use GDD v1.12 content at 1x scale"

git add -A
git diff --cached --stat
git commit -m "feat(engine): uncap debt, add debt stress thresholds, pay debt, and bankruptcy check"

git push -u origin feat/v112-g1-contract-economy
```
Commit kedua menghapus pengali, padahal sebagian pemanggilnya ada di commit ketiga. Jadi commit kedua sendirian belum tentu lulus tes. Yang dicek CI adalah kondisi akhir branch, jadi ini aman.

**PR:** `feat/v112-g1-contract-economy` → `development`. Tunggu CI hijau, lalu merge.

---

## G2 - Papan dan skor

**Siapkan branch (Kamu)**, setelah G1 di-merge:
```bash
cd ~/Downloads/imron-hacktiv8-excercise/pejuang-umr-v112
git fetch origin
git checkout -b feat/v112-g2-board-score origin/development
npm install && npm run typecheck && npm test
```

**Penjelasan singkat.**
- **Tahap 1:** papan selalu 127 heksa, titik awal radius 3 untuk 2-3 pemain, Heksa Mati dihapus, Petak Emas kembali ke petak asli, dan posisi Petak Emas di sisi dalam.
- **Tahap 2:** rumus skor seimbang 0-100 dan skor beku untuk pemain yang tereliminasi.
- Server baru mengisi `avatarId` di hasil akhir pada G5. Di G2 engine cukup menyiapkan tempatnya.

**Prompt:**
```
Tugas G2 migrasi GDD v1.12: papan dan skor.

Baca dulu: docs/RENCANA_Migrasi_v1_12.md (bagian 2.2 E7-E9 dan 3), docs/GDD.md (1.2, 4.1, 4.7, 6.1, 6.2), docs/API_CONTRACT.md (game:started, game:finished, gold:spawned, gold:expired, player:eliminated).

Batas sama seperti G1: shared hanya expand (jangan hapus atau ubah tipe yang ada), apps/web tidak diubah dan harus tetap lulus typecheck, apps/server hanya *.test.ts bila nilai yang diharapkan berubah. Kerjakan per tahap dan jalankan npm run typecheck && npm test di akhir setiap tahap. Di akhir, tulis ringkasan per tahap.

TAHAP 1 - Papan
1. getBoardRadius selalu 6 untuk 2-4 pemain. Titik awal: 4 pemain di cincin radius 2 seperti sekarang; 2-3 pemain di cincin radius 3, berjarak sama (2 pemain saling berseberangan).
2. Hapus Heksa Mati dari engine: markHexDead, deadHexKeys, dan semua pemakaiannya. public.deadHexes di shared tetap ada (deprecated) dan selalu diisi [].
3. Petak Emas: simpan isi petak asli saat Petak Emas ditempatkan. Saat Petak Emas berikutnya muncul dan Petak Emas lama belum diambil, heksa kembali ke petak aslinya (tertutup dan bisa menyala lagi), lalu kirim gold:expired. Isi petak asli tidak pernah dikirim ke klien.
4. pickGoldHex (GDD 4.7 v1.12): kandidat = heksa tertutup di radius ≤ 4 dari pusat yang tidak bersebelahan dengan pion mana pun (termasuk pion pemain tereliminasi). Pilih kandidat dengan selisih jarak terjauh dan terdekat ke pemain yang masih hidup paling kecil; seri diacak lewat RandomSource. Jika tidak ada kandidat, longgarkan syarat tidak bersebelahan dulu, baru syarat radius.
5. Tes: radius dan titik awal untuk 2, 3, dan 4 pemain; tidak ada heksa mati sepanjang simulasi; Petak Emas kembali ke isi asli dan bisa menyala lagi; posisi Petak Emas memenuhi syarat; isi asli tidak muncul di payload mana pun.

TAHAP 2 - Skor (GDD 6.2 v1.12)
1. Skor Kesejahteraan = rata-rata dari:
   - Poin Keuangan = clamp(50 + Harta Bersih / 500.000, 0, 100)
   - Poin Kesehatan = Kesehatan × 10
   - Poin Ketenangan = (10 - Level Stress) × 10
   Simpan sebagai desimal; jangan dibulatkan di engine. Hapus modifier lama.
2. Skor Sementara memakai rumus yang sama.
3. Skor beku: saat pemain tereliminasi, simpan skornya. Skor itu yang dipakai di Papan Skor dan peringkat akhir.
4. Peringkat: yang bertahan di atas yang tereliminasi; antar yang tereliminasi, yang bertahan lebih lama lebih tinggi; yang tereliminasi di langkah sama diurutkan menurut skor beku; lalu tie-breaker Hutang lebih kecil, lalu Level Stress lebih rendah; seri tetap berperingkat sama (1, 1, 3).
5. game:finished: isi points { finance, health, calm } dan avatarId jika identitas pemain memilikinya (tambahkan avatarId opsional ke PlayerIdentity; server mengisinya di G5). Field lama tetap diisi: modifier "none", modifierPct 0, pawn seperti sekarang.
6. player:eliminated: isi frozenScore.
7. Tes:
   - Tiga skenario GDD 6.2: 90; 56,333...; 22.
   - Harta Bersih Rp10.000.000, Kesehatan 10, Level Stress 0 = 90.
   - Skor awal (Kekayaan 7.500.000, tanpa Hutang, Kesehatan 10, Stress 0) = 88,333...
   - Skor beku tidak berubah setelah eliminasi.
   - Urutan beberapa pemain yang tereliminasi di langkah yang sama.

Selesai jika npm run typecheck && npm test lulus.
```

**Cek akhir (Kamu):**
```bash
npm run typecheck && npm test
git diff origin/development --stat
```

**Commit dipecah per tahap:**
```bash
git add packages/engine/src/board packages/engine/src/gold packages/engine/src/game
git commit -m "feat(engine): fixed radius board, start rings, and gold tile revert"

git add -A
git diff --cached --stat
git commit -m "feat(engine): balanced welfare score with frozen scores"

git push -u origin feat/v112-g2-board-score
```
Jika `git add` pertama ikut memasukkan file skor (misalnya `game/` memuat perubahan skor), tidak apa-apa. Pemecahan commit ini hanya untuk memudahkan membaca riwayat.

**PR:** `feat/v112-g2-board-score` → `development`, lalu merge.

---

## Jika kuota Claude Code habis di tengah prompt

Pekerjaan yang sudah tersimpan di file tidak hilang. Setelah kuota reset, buka New session dan kirim:
```
Lanjutkan G1 (atau G2) dari docs/PANDUAN_Migrasi_v1_12_G1_G2.md. Cek git status dan git diff --stat untuk melihat tahap yang sudah dikerjakan, jalankan npm run typecheck && npm test, lalu lanjutkan dari tahap pertama yang belum selesai. Batas dan aturan tetap sama.
```

## Jika tes web gagal

Artinya ada perubahan shared yang tidak sesuai pola expand. Jangan izinkan Claude Code mengubah web. Kirim pesan error-nya ke chat ini.

## Setelah G2

Kirim ke chat ini hasil `git log --oneline -6` dan jumlah tes. Saya tulis panduan G3 (Fase Pembalikan dan Ganti Bulan) dan G4 berdasarkan kode terbaru.
