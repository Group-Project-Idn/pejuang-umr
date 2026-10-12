# Panduan Migrasi GDD v1.12: G3 (Fase Pembalikan dan Ganti Bulan)

Basis: `development` di `5db8fd6` (G1 dan G2 sudah di-merge). Rencana: `docs/RENCANA_Migrasi_v1_12.md`.

| Tahap | Isi | Commit |
|---|---|---|
| 1 | Engine: Fase Pembalikan (Realita ditunda, Doom dan eliminasi di akhir ronde) | 1 |
| 2 | Engine: fase Ganti Bulan dengan slider Bayar Hutang | 1 |
| 3 | Server: sambungan Ganti Bulan dan Fase Pembalikan | 1 |

**Kenapa server ikut di G3.** Begitu engine punya fase `monthChange` dan `endRound` berubah menjadi Fase Pembalikan, server lama tidak tahu cara menjalankannya: game loop macet dan tes integrasi gagal. Jadi sambungan server untuk dua fase ini dipindah dari G5 ke G3. G5 tinggal Ajakan versi baru dan Room.

**Yang belum diubah di G3:** Ajakan. Ajakan masih memakai alur lama (hasil langsung saat dijawab) sampai G4.

---

## Langkah 0 - Siapkan (Kamu)

**Perbarui `development` lokal**, karena `git log` terakhirmu masih di `2a99a28`:
```bash
cd ~/Downloads/imron-hacktiv8-excercise/pejuang-umr
git checkout development && git pull
git --no-pager log --oneline -3
```
Baris pertama harus `5db8fd6 Merge pull request #31 ...`.

**Simpan panduan dan rencana yang diperbarui ke `docs/`:**
```bash
cp ~/Downloads/PANDUAN_Migrasi_v1_12_G3.md docs/
cp ~/Downloads/RENCANA_Migrasi_v1_12.md docs/RENCANA_Migrasi_v1_12.md
git add docs/
git commit -m "docs: add G3 guide and move server wiring for month change and reveal into G3"
git push
```

**Branch G3 di worktree:**
```bash
cd ../pejuang-umr-v112
git status
git fetch origin
git checkout -b feat/v112-g3-reveal-month origin/development
npm install && npm run typecheck && npm test
```
`git status` pertama harus bersih. Pagar dari G1 masih berlaku: `apps/web` dikunci, sedangkan server boleh diubah di G3.

---

## Prompt G3

Mulai di **Plan mode**. Baca rencananya dengan teliti, terutama urutan event Fase Pembalikan, lalu setujui ke Auto.

```
Tugas G3 migrasi GDD v1.12: Fase Pembalikan dan fase Ganti Bulan di engine, plus sambungannya di server.

Baca dulu: docs/RENCANA_Migrasi_v1_12.md (bagian 2.2 E10-E12, E14, dan bagian 4 keputusan D1-D2), docs/GDD.md (1.2, 1.4, 2.4, 2.5, 3.3, 4.2, 4.4, 4.6), docs/API_CONTRACT.md (month:summary, month:pay-debt, round:reveal, tile:opened, tile:resolved, doom:triggered, player:eliminated, game:patch, Bagian 16).

Batas:
- Boleh mengubah packages/engine, apps/server, dan packages/shared hanya secara expand (jangan hapus atau ubah tipe yang ada). JANGAN mengubah apps/web. Web harus tetap lulus typecheck.
- Field deprecated yang masih wajib di skema tetap diisi dengan nilai netral: tile:resolved.turnId diisi turnId giliran pemain itu, doom:triggered.trigger diisi "tile", OpenedHex.outcome diisi null sampai Fase Pembalikan lalu diisi hasilnya.
- Ajakan TIDAK diubah di G3 (alur lama tetap jalan, dikerjakan di G4).
- Kerjakan per tahap. Di akhir setiap tahap jalankan npm run typecheck && npm test sampai lulus. Di akhir, tulis ringkasan per tahap.
- Isi Realita yang belum dibuka TIDAK BOLEH masuk state publik maupun event apa pun sebelum round:reveal.

TAHAP 1 - Engine: Fase Pembalikan (GDD 4.2 dan 4.4 v1.12)
1. GamePhase ditambah "reveal". public.phase (opsional dari G1) diisi: "calendar" untuk roundStart/monthChange/calendarEvent, "turn", "reveal", "finished".
2. applyChoice di turn/turn.ts hanya menjalankan Fase Berjalan: Jalan Buntu (Level Stress +1), efek Rencana, tile:opened, player:status (P), pion pindah, heksa ditandai terpakai, Petak Emas diambil. Hasil Realita DIUNDI SAAT ITU JUGA memakai resolveReality dengan konteks pemain saat memilih (Beban Peringkat 1, musim, imunitas), lalu disimpan tersembunyi di GameState (mis. pendingRealities berisi playerId, hex, turnId, dan hasilnya). Petak Emas tidak punya Realita.
3. applyChoice TIDAK lagi menjalankan Doom Spending, cek eliminasi, atau game:patch scores. OpenedHex baru diisi plan dan reality null.
4. endRound berubah menjadi Fase Pembalikan, dengan urutan event:
   a. round:reveal { round, step, order } berisi pemain yang melangkah di ronde ini sesuai urutan giliran.
   b. Untuk setiap pemain di order yang punya Realita: terapkan efeknya, kirim tile:resolved (round diisi), lalu player:status (P). Perbarui OpenedHex.reality dan outcome.
   c. Doom Spending: untuk setiap pemain hidup dengan Level Stress >= 9, terapkan applyDoomSpending sekali, kirim doom:triggered (round diisi).
   d. Eliminasi: untuk setiap pemain hidup, cek isBankrupt lalu isBurnout. Isi frozenScore dan kirim player:eliminated.
   e. game:patch scores.
   f. Jika pemain hidup <= 1 atau langkah >= 24: finishGame (nextAction "finished"). Selain itu maju ke langkah berikutnya dengan phase "roundStart".
   Kosongkan Realita tersembunyi setelah dibuka.
5. Hapus cek eliminasi sementara dari G1 di applyChoice. Ajakan (invite.ts) tetap seperti sekarang.
6. Tes:
   - Setelah turn:choose, tidak ada tile:resolved dan state publik tidak memuat isi Realita.
   - Urutan event Fase Pembalikan persis seperti poin 4.
   - Hasil Realita memakai konteks saat memilih: pemain yang menjadi Peringkat 1 setelah memilih tetap memakai peluang saat memilih.
   - Hutang lebih dari Rp25 juta di tengah ronde baru mengeliminasi di Fase Pembalikan; tepat Rp25 juta aman.
   - Doom Spending sekali per ronde per pemain.
   - Langkah 24: Fase Pembalikan tetap berjalan dan eliminasi dicek sebelum game:finished.
   - Dua pemain tereliminasi di Fase Pembalikan yang sama diurutkan menurut skor beku.
   - Simulasi 200 game tetap lulus, ditambah invarian: tile:resolved untuk ronde N selalu muncul setelah round:reveal ronde N.

TAHAP 2 - Engine: fase Ganti Bulan (GDD 2.4 v1.12)
1. GamePhase ditambah "monthChange". Di startRound pada langkah ganti bulan: processMonthChange untuk setiap pemain hidup, kirim month:summary (P) dengan payDebt { max: min(Kekayaan, Hutang), deadline: 0 } jika Hutang > 0, atau payDebt null jika Hutang 0, lalu player:status (P). Hapus cek eliminasi sementara dari G1 di sini.
2. Urutan Fase Kalender: game:patch calendar, season:changed, Petak Emas (gold:expired dan gold:spawned), invite:card, game:patch rankOneBurden, lalu month:summary. Setelah itu phase "monthChange" jika langkah ganti bulan; selain itu langsung ke Event Tanggal atau giliran seperti sekarang.
3. Simpan di GameState: pendingMonth { month, debtorIds, answers }.
4. Fungsi baru answerMonthPayment(state, playerId, month, amount):
   - PAYMENT_CLOSED jika phase bukan monthChange, month tidak cocok, pemain bukan debtor, atau sudah membayar.
   - INVALID_PAYLOAD jika amount bukan bilangan bulat atau di luar 0..payDebt.max saat ini.
   - Terapkan payDebt (dari G1) langsung, catat jawaban, kembalikan { paid, debtCleared, stressDelta } dan event player:status (P).
5. Fungsi baru closeMonthChange(state): debtor yang belum menjawab dianggap bayar 0. Lalu lanjut ke Event Tanggal (phase calendarEvent + calendar:event) jika ada di langkah ini, atau phase turn.
6. Fungsi bantu allMonthPaymentsAnswered(state) dan hasMonthDebtors(state) untuk server.
7. closeCalendarEvent tidak lagi mengeliminasi (hapus cek Burnout di sana); efek tetap diterapkan, eliminasi dicek di Fase Pembalikan.
8. Perbarui turn/simulation-helpers.ts: bot debtor membayar secara deterministik (mis. separuh payDebt.max dibulatkan ke bawah kelipatan Rp1.000), lalu closeMonthChange.
9. Tes: urutan Fase Kalender; payDebt null saat Hutang 0; validasi answerMonthPayment (semua kode error); bonus lunas Level Stress -2; timeout = 0; urutan Ganti Bulan lalu Event Tanggal di Langkah 9 dan 21; Event Tanggal yang membuat Kesehatan 0 baru mengeliminasi di Fase Pembalikan.

TAHAP 3 - Server: sambungan Ganti Bulan dan Fase Pembalikan
1. apps/server/src/config.ts: tambah REVEAL_STEP_MS (default 2500), MONTH_PAY_SECONDS (default 15), MONTH_SUMMARY_ONLY_MS (default 3000), dibaca seperti ROOM_IDLE_MS.
2. GameSession, phase monthChange:
   - Isi payDebt.deadline di month:summary = now + MONTH_PAY_SECONDS.
   - Jika tidak ada debtor: tutup setelah MONTH_SUMMARY_ONLY_MS. Jika ada: tutup setelah MONTH_PAY_SECONDS, atau lebih cepat begitu semua debtor menjawab.
   - Setelah closeMonthChange: jika phase calendarEvent, jalankan timer Event Tanggal seperti sekarang; jika turn, runTurn.
   - Pemain putus tidak ditunggu khusus: ia ikut timeout (bayar 0).
3. Handler month:pay-debt di apps/server/src/socket/register-game-handlers.ts memakai MonthPayDebtRequestSchema dari shared, dengan pola ack, requestId, dan rate limit yang sama seperti handler lain. Ack: { ok: true, paid, debtCleared, stressDelta } atau error PAYMENT_CLOSED / INVALID_PAYLOAD / GAME_FINISHED.
4. Fase Pembalikan: nextRound SELALU memanggil endRound (termasuk di Langkah 24; hapus pengecekan step >= TOTAL_STEPS sebelum endRound). Kirim event-nya, lalu tunggu REVEAL_STEP_MS × panjang order sebelum runRound berikutnya. Jika hasilnya finished, panggil finish() seperti alur selesai yang sudah ada (finishGame dengan identitas).
5. Snapshot (services/snapshot.ts dan GameSession): isi me.pendingMonth dengan payload month:summary terakhir milik pemain itu jika phase monthChange dan ia debtor yang belum menjawab, beserta deadline aslinya.
6. Tes integrasi (pakai clock tes dan nilai config kecil supaya tes tetap cepat):
   - month:pay-debt: bayar sebagian, lunas (Level Stress -2), terlambat (PAYMENT_CLOSED), di luar batas (INVALID_PAYLOAD).
   - Popup ditutup lebih cepat saat semua debtor menjawab; tanpa debtor, lanjut setelah MONTH_SUMMARY_ONLY_MS.
   - Di Langkah 9: month:summary lalu calendar:event, bukan sebaliknya.
   - Tidak ada tile:resolved sebelum round:reveal pada ronde yang sama, untuk semua socket.
   - Ronde berikutnya baru mulai setelah jeda REVEAL_STEP_MS × jumlah pemain.
   - Reconnect saat popup Ganti Bulan masih terbuka mendapat pendingMonth.
   - full-game.integration tetap selesai di bawah 20 detik.

Selesai jika npm run typecheck && npm test lulus.
```

---

## Cek akhir (Kamu)

```bash
npm run typecheck && npm test
git --no-pager diff HEAD --stat
git status --short | grep '^??'
```
- Tidak boleh ada `apps/web` atau `docs`.
- Perhatikan jumlah tes web: harus sama dengan sebelum G3.
- Baca ringkasan Claude Code, terutama bagian shared. Isinya harus hanya tambahan (expand).

## Commit dipecah per tahap

```bash
git add packages/shared
git add packages/engine/src/turn/turn.ts packages/engine/src/turn/turn.test.ts packages/engine/src/game
git commit -m "feat(engine): defer reality to end-of-round reveal phase"

git add packages/engine
git commit -m "feat(engine): add month change phase with debt payment"

git add -A
git --no-pager diff --cached --stat
git commit -m "feat(server): wire month change payment and reveal phase timing"

git status
```
Jika `packages/shared` tidak berubah, baris `git add packages/shared` tidak berpengaruh. Pemecahan tahap 1 dan 2 tidak harus sempurna, karena keduanya sama-sama mengubah `round.ts`. Yang penting kondisi akhir branch lulus.

## Push dan PR

```bash
git fetch origin
git --no-pager log --oneline HEAD..origin/development
```
- **Kosong:** `git push -u origin feat/v112-g3-reveal-month`.
- **Ada commit baru:** `git merge origin/development`, lalu `npm run typecheck && npm test`, baru push. Jika konflik, kirim daftar filenya ke chat.

PR `feat/v112-g3-reveal-month` → `development`, tunggu CI hijau, lalu merge.

## Kabari Nickzad setelah merge

Perilaku server berubah dan web perlu menyesuaikan:
- `tile:resolved` sekarang datang **setelah** `round:reveal` di akhir ronde, bukan langsung setelah `tile:opened`.
- `month:summary` membawa `payDebt` dan menunggu `month:pay-debt` (slider).
- Ada jeda sekitar 2,5 detik per pemain di akhir ronde.
- Skor Sementara hanya berubah di akhir ronde.

## Jika kuota habis di tengah prompt

```
Lanjutkan G3 dari docs/PANDUAN_Migrasi_v1_12_G3.md. Cek git status dan git diff --stat untuk melihat tahap yang sudah dikerjakan, jalankan npm run typecheck && npm test, lalu lanjutkan dari tahap pertama yang belum selesai. Batas dan aturan tetap sama.
```
