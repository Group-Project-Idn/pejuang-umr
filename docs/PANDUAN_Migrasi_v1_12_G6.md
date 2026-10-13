# Panduan Migrasi GDD v1.12: G6 (Refleksi dan Tes Privasi)

Basis: `development` di `2773c22` (G5 sudah di-merge). Rencana: `docs/RENCANA_Migrasi_v1_12.md`.

| Tahap | Isi | Commit |
|---|---|---|
| 1 | Server: layanan Refleksi (antarmuka LLM, fallback insight berbasis aturan, `reflection:ready`, snapshot) | 1 |
| 2 | Server: tes privasi menyeluruh untuk satu game penuh | 1 |

**Batas G6 (keputusan D4):** belum ada provider LLM sungguhan, karena providernya belum dipilih. G6 menyiapkan semua yang dibutuhkan, yaitu antarmuka, prompt untuk LLM, batas waktu, fallback, dan pengiriman event. Dengan begitu, menyambungkan provider nanti cukup satu prompt kecil. Selama provider belum ada, pemain mendapat insight berbasis aturan (`source: "rules"`).

---

## Langkah 0 - Siapkan (Kamu)

```bash
cd ~/Downloads/imron-hacktiv8-excercise/pejuang-umr
git checkout development && git pull
git --no-pager log --oneline -1
cp ~/Downloads/PANDUAN_Migrasi_v1_12_G6.md docs/
git add docs/
git commit -m "docs: add G6 guide"
git push

cd ../pejuang-umr-v112
git status
git fetch origin
git checkout -b feat/v112-g6-reflection-privacy origin/development
git branch -D feat/v112-g5-room-avatar
npm install && npm run typecheck && npm test
code .
```
`git log` pertama harus `2773c22` atau sesudahnya. Kabari Nickzad bahwa `apps/server` dan `packages/shared` sedang dipakai G6.

---

## Prompt G6

Mulai di **Plan mode**, baca rencananya, lalu setujui ke Auto.

```
Tugas G6 migrasi GDD v1.12: layanan Refleksi di server dan tes privasi menyeluruh.

Baca dulu: docs/RENCANA_Migrasi_v1_12.md (bagian 2.3 V5-V6, bagian 4 keputusan D4), docs/GDD.md (6.5, 9.4, 9.5), docs/API_CONTRACT.md (Bagian 1.8, 13 reflection:ready, 15), serta packages/engine/src/reflection/rules-insight.ts dan packages/engine/src/log/decision-log.ts.

Batas:
- Pastikan kamu di folder pejuang-umr-v112 dan branch feat/v112-g6-reflection-privacy (cek pwd dan git branch --show-current). Jika bukan, berhenti.
- Boleh mengubah apps/server dan apps/server/.env.example. packages/engine hanya jika perlu fungsi ekspor kecil. packages/shared hanya secara expand. JANGAN mengubah apps/web, dan jangan membaca atau mengubah file .env.
- Tidak ada panggilan jaringan ke provider LLM mana pun, dan tidak ada kunci API di kode. Provider sungguhan disambungkan nanti.
- Kerjakan per tahap. Di akhir setiap tahap jalankan npm run typecheck && npm test sampai lulus. Di akhir, tulis ringkasan per tahap.

TAHAP 1 - Layanan Refleksi (GDD 6.5 v1.12, D4)
1. Folder baru apps/server/src/services/reflection/:
   - Tipe ReflectionInput, berisi data milik SATU pemain saja: log keputusannya (getDecisionLog), status akhir, Skor Kesejahteraan dan tiga poin skor, peringkat akhir atau langkah dan alasan eliminasi, serta jumlah pemain. JANGAN memuat status privat, nama, atau isi kartu pemain lain. Ajakan cukup ditulis "pemain lain".
   - Antarmuka ReflectionProvider: generate(input, signal: AbortSignal) => Promise<unknown>. Hasil mentah selalu divalidasi dengan ReflectionSchema dari shared.
   - Fungsi murni buildReflectionPrompt(input) yang menghasilkan teks instruksi dan data untuk LLM. Aturan isinya: Bahasa Indonesia santai dengan sapaan "kamu"; suportif dan tidak menghakimi; pakai istilah glosarium GDD (Kekayaan, Hutang, Kesehatan, Level Stress, Rencana, Realita, Zonk, Ajakan, Doom Spending); summary 1-2 kalimat dan 1-3 insight; gagasan buku keuangan hanya sebagai parafrase dengan field reference berisi judul dan penulis, tanpa kutipan panjang; balas hanya JSON sesuai ReflectionSchema dengan source "ai". Fungsi ini belum dipanggil provider mana pun, tetapi wajib dites.
   - FakeReflectionProvider untuk tes: bisa diatur berhasil, gagal, mengembalikan data tidak valid, atau lambat.
   - ReflectionService:
     a. Hasil berbasis aturan (buildPlayerReflection dari engine) selalu dihitung lebih dulu sebagai cadangan.
     b. Jika provider dikonfigurasi, panggil dengan batas waktu REFLECTION_TIMEOUT_MS memakai AbortController. Hasil valid dikirim dengan source "ai". Gagal, habis waktu, atau tidak valid berarti cadangan dikirim, dan errornya dicatat ke log server tanpa isi data pemain.
     c. Maksimal satu refleksi per pemain per game, disimpan di sesi game.
     d. Batas panggilan provider yang berjalan bersamaan (usulan 4).
2. Config (apps/server/src/config.ts), dibaca seperti REVEAL_STEP_MS:
   - REFLECTION_PROVIDER: "none" (default) atau "fake". "fake" hanya boleh di luar production.
   - REFLECTION_TIMEOUT_MS: default 15000.
   Tambahkan keduanya ke apps/server/.env.example beserta komentar singkat.
3. Pemicu di GameSession, tanpa menahan game loop (asinkron):
   - Setelah player:eliminated: buat refleksi untuk pemain itu dari state saat eliminasi.
   - Setelah game:finished: buat refleksi untuk semua pemain yang belum punya.
   - Kirim reflection:ready (P) hanya ke pemain itu. Jika sesi game sudah ditutup saat hasil siap, buang hasilnya.
4. Snapshot: me.reflection diisi refleksi milik pemain itu jika sudah ada, selain itu null.
5. Tes:
   - buildReflectionPrompt hanya memuat data satu pemain dan tidak memuat nama atau status pemain lain.
   - Provider "none": reflection:ready berisi source "rules" untuk pemain tereliminasi dan untuk semua pemain di akhir game.
   - Provider palsu berhasil: source "ai".
   - Provider palsu gagal, lambat melewati batas waktu, dan data tidak valid: semuanya jatuh ke source "rules".
   - reflection:ready tidak pernah diterima pemain lain.
   - Reconnect setelah refleksi siap: snapshot memuat me.reflection.
   - Game loop tidak tertahan oleh provider yang lambat: ronde berikutnya tetap berjalan sesuai jadwal.

TAHAP 2 - Tes privasi menyeluruh (GDD 1.8 di API Contract)
Buat apps/server/src/game/privacy.integration.test.ts. Mainkan satu game penuh 4 bot dengan provider "none". Rekam semua event yang diterima setiap socket, lalu periksa:
1. Event privat hanya diterima pemiliknya: player:status, month:summary, doom:triggered, invite:card, turn:options, turn:dead-end, calendar:result, invite:incoming (hanya target), invite:resolved (hanya pengirim dan target), reflection:ready.
2. Motif Ajakan: sebelum round:reveal ronde yang sama, hanya pengirim yang pernah menerima motif (lewat invite:card). Pemain ketiga tidak pernah menerima motif.
3. Realita: teks dan outcome setiap tile:resolved tidak pernah muncul di payload apa pun yang diterima pemain mana pun sebelum round:reveal ronde itu, termasuk snapshot yang diambil di tengah ronde.
4. Isi heksa tertutup: judul petak dari turn:options hanya diterima pemain aktif, sampai heksa itu dibuka (tile:opened).
5. Tidak ada payload mana pun yang memuat kunci internal: decisionLog, pendingRealities, goldOrigin, roundInvites, atau motive di luar invite:card dan invite:resolved.
6. Snapshot setiap pemain di tengah game hanya memuat status, kartu, dan popup miliknya sendiri.
7. Kekayaan dan Hutang pemain lain tidak pernah dikirim, termasuk di game:finished (points boleh, sesuai Keputusan Terbuka #4).
Jika tes menemukan kebocoran, perbaiki kodenya, lalu laporkan di ringkasan apa yang bocor dan bagaimana memperbaikinya.

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
- Tidak boleh ada `apps/web` atau `docs`. Jumlah tes web harus tetap 78.
- Baca bagian ringkasan tentang kebocoran. Jika Tahap 2 menemukan kebocoran, itu temuan penting. Kirim ke chat ini.
- Pastikan tidak ada kunci API atau URL provider di diff: `git --no-pager diff HEAD | grep -i -E "api[_-]?key|sk-|https://api"`. Hasilnya harus kosong.

## Commit

```bash
git add apps/server/src/services/reflection apps/server/src/config.ts apps/server/src/config.test.ts apps/server/.env.example
git commit -m "feat(server): reflection service with rule-based fallback"

git add -A
git --no-pager diff --cached --stat
git commit -m "test(server): end-to-end privacy checks for a full game"

git fetch origin
git --no-pager log --oneline HEAD..origin/development
```
Jika `log` kosong: `git push -u origin feat/v112-g6-reflection-privacy`, lalu PR ke `development`. Jika ada commit baru: merge, tes, baru push.

Commit pertama mungkin belum memuat sambungan di `game-session.ts` dan `snapshot.ts`, karena file itu masuk ke commit kedua. Tidak apa-apa; yang penting kondisi akhir branch lulus.

## Kabari Nickzad setelah merge

- `reflection:ready` dikirim privat ke pemain yang tereliminasi (untuk Layar Eliminasi) dan ke semua pemain setelah `game:finished` (untuk Hasil Akhir).
- Datangnya asinkron, jadi tampilkan status memuat sampai event ini masuk.
- `source: "rules"` berarti insight berbasis aturan; `source: "ai"` baru muncul setelah provider LLM disambungkan. `reference` (judul buku) bisa kosong.
- Setelah reconnect, refleksi ada di `snapshot.me.reflection`.

## Jika kuota habis di tengah prompt

```
Lanjutkan G6 dari docs/PANDUAN_Migrasi_v1_12_G6.md. Pastikan kamu di folder pejuang-umr-v112 dan branch feat/v112-g6-reflection-privacy. Cek git status dan git diff --stat untuk melihat tahap yang sudah dikerjakan, jalankan npm run typecheck && npm test, lalu lanjutkan dari tahap pertama yang belum selesai. Batas dan aturan tetap sama.
```
