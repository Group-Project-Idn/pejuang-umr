# Panduan Migrasi GDD v1.12: G4 (Ajakan, Log Keputusan, Simulasi)

Basis: `development` di `002a5d6` (G3 sudah di-merge). Rencana: `docs/RENCANA_Migrasi_v1_12.md`.

| Tahap | Isi | Commit |
|---|---|---|
| 1 | Engine: Ajakan v1.12 (data, motif, hasil di Fase Pembalikan) | 1 |
| 2 | Server: Ajakan v1.12 (beberapa Ajakan per ronde, timer per Ajakan, Fase Pembalikan menunggu Ajakan) | 1 |
| 3 | Engine: log keputusan, insight berbasis aturan, laporan simulasi | 1 |

**Kenapa server Ajakan ikut di G4.** Alasannya sama seperti G3: begitu engine mengubah alur Ajakan, server lama tidak bisa menjalankannya dan tes integrasi gagal. G5 tinggal Room dan snapshot.

---

## Keputusan yang dipakai di G4

- **D5 (disetujui):** debtor dengan Kekayaan 0 tetap ditunggu, sesuai GDD 2.4. Tidak ada perubahan kode.
- **D6 (usulan, konfirmasi sebelum menjalankan prompt):** GDD 4.8 belum mengatur kasus pemain terakhir di ronde mengirim Ajakan lalu langsung memilih heksa. Fase Pembalikan akan langsung jalan, padahal target masih punya waktu menjawab. Usulan: **Fase Pembalikan menunggu semua Ajakan ronde itu dijawab atau habis waktu** (maksimal 15 detik). Prompt di bawah sudah memakai usulan ini. Jika tidak setuju, beri tahu di chat sebelum menjalankan prompt.

---

## Langkah 0 - Siapkan (Kamu)

Pastikan sesi Claude Code dibuka dari folder **`pejuang-umr-v112`**, bukan repo utama (pelajaran dari G3).

```bash
cd ~/Downloads/imron-hacktiv8-excercise/pejuang-umr
git checkout development && git pull
git --no-pager log --oneline -1
cp ~/Downloads/PANDUAN_Migrasi_v1_12_G4.md docs/
cp ~/Downloads/RENCANA_Migrasi_v1_12.md docs/RENCANA_Migrasi_v1_12.md
git add docs/
git commit -m "docs: add G4 guide and move server invite wiring into G4"
git push

cd ../pejuang-umr-v112
git status
git fetch origin
git checkout -b feat/v112-g4-invite-log-sim origin/development
npm install && npm run typecheck && npm test
code .
```
`git log` pertama harus menampilkan `002a5d6` (atau commit sesudahnya). `code .` membuka jendela VS Code dari folder worktree. Buka Claude Code (New session) di jendela itu.

---

## Prompt G4

Mulai di **Plan mode**, baca rencananya, lalu setujui ke Auto.

```
Tugas G4 migrasi GDD v1.12: Ajakan versi baru (engine dan server), log keputusan dan insight berbasis aturan, serta laporan simulasi.

Baca dulu: docs/RENCANA_Migrasi_v1_12.md (bagian 2.2 E13, E15, E16, bagian 4 keputusan D1-D6), docs/GDD.md (4.2, 4.8, 6.5), docs/API_CONTRACT.md (Bagian 11a, 14, 15).

Batas:
- Pastikan kamu bekerja di folder pejuang-umr-v112 (cek dengan pwd dan git branch --show-current = feat/v112-g4-invite-log-sim). Jika bukan, berhenti.
- Boleh mengubah packages/engine, apps/server, dan packages/shared hanya secara expand. JANGAN mengubah apps/web. Web harus tetap lulus typecheck.
- Field deprecated yang masih wajib di skema tetap diisi nilai netral. Nilai enum "trap" tetap ada di shared, tetapi engine tidak pernah membagikannya lagi.
- Isi Realita dan motif Ajakan tidak boleh sampai ke pemain yang tidak berhak (motif hanya ke pengirim; ke target baru di Fase Pembalikan).
- Kerjakan per tahap. Di akhir SETIAP tahap jalankan npm run typecheck && npm test sampai lulus sebelum lanjut. Di akhir, tulis ringkasan per tahap.

TAHAP 1 - Engine: Ajakan v1.12 (GDD 4.8)
1. Data (packages/engine/src/data/invite-plans.ts):
   - Nilai 4 Rencana sesuai tabel GDD 4.8 v1.12: Nongkrong (Kekayaan -500.000, Level Stress -2), Lari Pagi (Kesehatan +1, Level Stress -1), Proyek Bareng (Kekayaan +1.500.000, Kesehatan -1), Staycation (Kekayaan -1.000.000, Kesehatan +1, Level Stress -2).
   - Motif hanya sincere dan commission, bobot 50:50. Pakai tipe lokal engine (mis. ActiveInviteMotive) supaya "trap" dari shared tidak perlu punya aturan.
   - Aturan hasil: sincere+join = efek Rencana ke target, Level Stress -1 ke target dan pengirim; sincere+decline = target Level Stress +1; commission+join = efek Rencana ke target ditambah target Kekayaan -500.000, pengirim Kekayaan +500.000; commission+decline = target Level Stress -1. Motif dibuka ke pengirim dan target.
2. State: ganti pendingInvite dan inviteUsedThisRound dengan daftar Ajakan ronde ini (mis. roundInvites: inviteId, senderId, targetId, plan, planEffects, motive, answer: "join" | "decline" | null, autoDeclined). Kosongkan setelah Fase Pembalikan.
3. sendInvite(state, senderId, cardId, targetId, turnId?):
   - INVITE_NOT_ALLOWED jika phase bukan turn, pengirim bukan pemain aktif, atau pengirim sudah memilih heksa. Jika turnId dikirim, harus sama dengan pendingTurn.turnId.
   - NO_INVITE_CARD jika kartu tidak cocok.
   - INVALID_TARGET jika target diri sendiri, tereliminasi, pengirim tereliminasi, atau target masih punya Ajakan yang belum dijawab.
   - Kartu dipakai (inviteCard null), invite:incoming (P, target) dikirim tanpa motif. Tidak ada batas jumlah Ajakan per ronde selain 1 kartu per pemain.
4. respondInvite dan expireInvite hanya MENCATAT jawaban (expire = decline dengan autoDeclined true). Tidak ada efek, tidak ada eliminasi, tidak ada event invite:resolved di sini.
5. Fungsi bantu hasOpenInvites(state) untuk server (ada Ajakan dengan answer null).
6. endRound (Fase Pembalikan): setelah semua tile:resolved dan sebelum Doom Spending, untuk setiap Ajakan ronde ini sesuai urutan kirim: terapkan efek, kirim invite:resolved ke pengirim dan target (motive diisi, effectsForYou sesuai penerima), lalu player:status ke pihak yang berubah. Ajakan yang masih answer null saat endRound dianggap decline dengan autoDeclined true. Efek Ajakan ikut dicek Doom, Bangkrut, dan Burnout di Fase Pembalikan yang sama. Hapus op game:patch inviteSincereDeclined dari engine (tipe di shared tetap ada).
7. Hapus checkEarlyFinish dan eliminasi dari alur Ajakan lama.
8. Tes: semua kode error sendInvite; dua pemain berbeda bisa mengirim Ajakan di ronde yang sama; target sibuk ditolak; jawaban tidak menimbulkan efek sebelum Fase Pembalikan; keempat kombinasi motif dan jawaban; urutan event Fase Pembalikan (tile:resolved semua pemain, lalu invite:resolved, lalu doom, lalu eliminasi); Ajakan yang belum dijawab saat endRound menjadi autoDeclined; motif tidak pernah dikirim ke pemain ketiga; bobot motif mendekati 50:50 di banyak undian.

TAHAP 2 - Server: Ajakan v1.12
1. GameSession: dukung beberapa Ajakan terbuka sekaligus, masing-masing dengan timer INVITE_SECONDS sendiri. Simpan payload invite:incoming per target untuk snapshot (pendingInvite di snapshot = Ajakan terbuka milik pemain itu, beserta deadline aslinya).
2. invite:send: teruskan turnId jika ada. Jika tidak ada (web lama), pakai turn pemain aktif saat ini. Ack sesuai kontrak; error INVITE_NOT_ALLOWED, NO_INVITE_CARD, INVALID_TARGET, GAME_FINISHED.
3. invite:respond dan timeout hanya mencatat jawaban lewat engine. Tidak ada efek langsung dan tidak ada perubahan giliran.
4. D6: saat semua pemain sudah melangkah, jika hasOpenInvites(state) benar, tunda endRound sampai semua Ajakan terbuka dijawab atau habis waktu, baru jalankan Fase Pembalikan beserta jeda REVEAL_STEP_MS seperti sekarang.
5. Bersihkan sisa alur lama: pendingInviteInfo tunggal, afterInvite yang memajukan giliran, penanganan pemain aktif yang Burnout karena Ajakan.
6. Tes integrasi (perbarui invite.integration.test.ts dan full-game.integration.test.ts):
   - Ajakan di luar giliran sendiri ditolak INVITE_NOT_ALLOWED; setelah turn:choose juga ditolak.
   - Dua Ajakan dari dua pengirim berbeda dalam satu ronde.
   - Target yang sedang punya Ajakan terbuka ditolak INVALID_TARGET.
   - Pemain terakhir mengirim Ajakan lalu langsung memilih heksa: round:reveal baru muncul setelah Ajakan dijawab atau habis waktu.
   - invite:resolved hanya diterima pengirim dan target, dan baru setelah round:reveal.
   - Reconnect saat Ajakan masuk masih terbuka mendapat pendingInvite.
   - Tidak ada turn:timer dan tidak ada INVITE_LIMIT di seluruh game.
   - full-game.integration tetap di bawah 20 detik.

TAHAP 3 - Engine: log keputusan, insight, laporan simulasi (GDD 6.5)
1. Log keputusan per pemain di GameState (mis. decisionLog: Record<playerId, DecisionEntry[]>), tidak pernah masuk state publik atau event. Catat: heksa yang dipilih (langkah, kategori, judul, Rencana, apakah autoPicked atau Jalan Buntu), hasil Realita saat dibuka, jawaban Event Tanggal, nominal Bayar Hutang, Ajakan yang dikirim dan dijawab (beserta motif setelah dibuka), Doom Spending, serta keempat indikator di akhir setiap Fase Pembalikan.
2. Fungsi murni buildRuleInsights(log, finalStatus) mengembalikan objek yang lolos ReflectionSchema dengan source "rules": summary 1-2 kalimat dan 1-3 insight. Contoh aturan: sering memilih Pinjol/Paylater dan kenaikan Hutang; Doom Spending berulang; Kesehatan rendah lebih dari beberapa ronde; pola Bayar Hutang (selalu 0 vs rutin); pola Ajakan (sering ikut Komisi). Bahasa Indonesia santai dengan sapaan "kamu", memakai istilah glosarium GDD, tidak menghakimi. Tanpa field reference (buku hanya untuk LLM nanti).
3. Ekspor fungsi untuk mengambil log dan insight per pemain (dipakai server di G6). Server belum perlu memakainya.
4. Simulasi (turn/simulation-helpers.ts dan simulation.test.ts):
   - Bot mengirim Ajakan hanya di Fase Pilihan sendiri sebelum memilih heksa, menjawab Ajakan secara deterministik, dan tetap membayar Hutang seperti G3.
   - Laporan yang dicetak: rata-rata Skor Kesejahteraan akhir beserta rata-rata Poin Keuangan, Kesehatan, dan Ketenangan; persentase pemain tereliminasi per alasan; rata-rata Doom Spending per pemain; persentase pemain yang berhutang di akhir dan rata-rata Hutangnya; rata-rata Kekayaan akhir; statistik Ajakan per motif dan jawaban.
   - Invarian baru: motif tidak pernah dikirim ke pemain ketiga; invite:resolved selalu setelah round:reveal ronde yang sama; log keputusan tidak muncul di state publik maupun event.
   - Tes buildRuleInsights untuk beberapa log contoh, dan hasilnya lolos ReflectionSchema.

Selesai jika npm run typecheck && npm test lulus.
```

---

## Cek akhir (Kamu)

```bash
pwd
npm run typecheck && npm test
git --no-pager diff HEAD --stat
git status --short | grep '^??'
```
- `pwd` harus berakhir di `pejuang-umr-v112`.
- Tidak boleh ada `apps/web` atau `docs`. Jumlah tes web harus tetap 76.
- Salin bagian laporan simulasi (`Simulasi 200 game ...`) dari output `npm test`. Kita pakai untuk menilai keseimbangan angka.

## Commit dipecah per tahap

```bash
git add packages/shared packages/engine/src/data packages/engine/src/invite
git commit -m "feat(engine): invites with two motives resolved in reveal phase"

git add apps/server
git commit -m "feat(server): multiple open invites and reveal waits for answers"

git add -A
git --no-pager diff --cached --stat
git commit -m "feat(engine): decision log, rule-based insights, and simulation report"

git status
git fetch origin
git --no-pager log --oneline HEAD..origin/development
```
Jika `log` terakhir kosong: `git push -u origin feat/v112-g4-invite-log-sim`, lalu PR ke `development`. Jika ada commit baru: merge dulu, tes, lalu push.

Pemecahan commit tidak harus sempurna (misalnya `turn.ts` berubah di tahap 1 dan 3). Yang penting kondisi akhir branch lulus.

## Kabari Nickzad setelah merge

- `invite:send` hanya bisa di giliran sendiri sebelum memilih heksa. Kirim `turnId` jika memungkinkan.
- `invite:respond` tidak lagi langsung menghasilkan efek. `invite:resolved` datang di Fase Pembalikan, dengan motif selalu terisi.
- Motif hanya `sincere` dan `commission`. Teks "Jebakan" di `invites.tsx` sudah tidak dipakai.
- Beberapa Ajakan bisa terjadi dalam satu ronde. Fase Pembalikan bisa tertunda sampai 15 detik jika masih ada Ajakan terbuka.

## Jika kuota habis di tengah prompt

```
Lanjutkan G4 dari docs/PANDUAN_Migrasi_v1_12_G4.md. Pastikan kamu di folder pejuang-umr-v112. Cek git status dan git diff --stat untuk melihat tahap yang sudah dikerjakan, jalankan npm run typecheck && npm test, lalu lanjutkan dari tahap pertama yang belum selesai. Batas dan aturan tetap sama.
```
