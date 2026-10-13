# Panduan Menyelesaikan Game (Imron, kerja sendiri)

Dibuat 13 Oktober 2026 dari `development` di `70b7f9a` (PR #40 Nickzad sudah masuk). Menggantikan `RENCANA_Bersama_Penyelesaian_Game.md`, `PANDUAN_Imron.md`, dan `PANDUAN_Nickzad.md`. Ketiga dokumen itu **tidak perlu di-commit**.

Cara kerja: **satu repo, branch biasa, tanpa worktree.** Satu tugas = satu branch = satu PR, dikerjakan berurutan.

---

## 1. Kondisi sekarang (sudah dicek di GitHub)

### Yang baru dari Nickzad (PR #40)

| Commit | Isi | Dampak |
|---|---|---|
| `791e1ea`, `b3a7cf4` | Popup Ganti Bulan di web (`MonthChangeView.tsx`) dengan slider dan hitung mundur, plus `month:pay-debt` di `lobby-client.tsx` | Sebagian besar W2 **selesai** |
| `d131ed6` | Urutan Fase Kalender sesuai GDD 4.2: Beban Peringkat 1 → Ganti Bulan → Event Tanggal → kartu Ajakan → Petak Emas → giliran. Snapshot `pendingMonth` kini dikirim ke semua pemain (yang sudah bayar atau tanpa Hutang mendapat `payDebt: null`) | Keputusan K2 **selesai** |
| `f3795ba` | `docs/katalog_master_sisi_rencana.md`: 125 petak unik (hanya sisi Rencana) | **Perlu keputusan**, lihat bagian 3 |

### Status per area

| Area | Status | Bukti |
|---|---|---|
| Engine dan server (aturan v1.13) | Selesai | G1-G7, PR #30-#39, #40 |
| Kontrak v0.4 | Selesai, dengan 5 celah kecil | `docs/API_CONTRACT.md` Keputusan Terbuka #11-12 dan audit Nickzad |
| Web: Lobby, Room, karakter, papan 3D, giliran, Event Tanggal, Fase Pembalikan (banner) | Selesai | `lobby-client.tsx`, `waiting-room.tsx`, `GameInterface.tsx` |
| Web: popup Ganti Bulan | Selesai (sebagian kecil sisa) | `MonthChangeView.tsx` |
| Web: overlay Doom, hasil Event Tanggal | Belum | `doom:triggered` dan `calendar:result` belum didaftarkan di `lobby-client.tsx` |
| Web: Ajakan | Belum | `invite:*` belum didaftarkan; tombol Ajakan nonaktif |
| Web: Layar Eliminasi, Hasil Akhir, Main Lagi, Refleksi | Belum | `reflection:ready` belum didaftarkan; `room.status "finished"` jatuh ke `WaitingRoom` |
| Web: klik heksa di papan, detail heksa terbuka, label "Jalan", info musim, notifikasi Emas, tanpa WebGL | Belum | Pilihan masih lewat tombol di luar papan; `HexDetailSheet` masih "Terungkap setelah melangkah" |
| Web: animasi Fase Pembalikan | Parsial | Banner saja, belum ada jadwal animasi |
| Web: Edit Profile | Belum | Lobby masih "Ubah nama" |

**Kesimpulannya:** game belum bisa dimainkan sampai Hasil Akhir lewat web. Sisa pekerjaan terbesar ada di web.

---

## 2. Urutan tugas

| # | Branch | Isi | Kenapa urutan ini |
|---|---|---|---|
| T0 | - | Rapikan folder, pindah ke branch biasa, pasang pagar | Persiapan |
| T1 | `feat/s1-contract-gaps` | Celah kontrak: `revealEndsAt`, target Ajakan sibuk, hasil Ajakan terlewat, op `phase`, `ping:test` hanya di tes, tes deadline, cek penanda konflik di CI | Fondasi T3, T4, T6 |
| T2 | `feat/w5-result-screens` | Layar Eliminasi, Hasil Akhir, Refleksi, Main Lagi | **Game punya akhir.** Syarat playtest |
| T3 | `feat/w4a-board-hud` | Klik heksa di papan, detail heksa terbuka, Rencana singkat, Papan Skor ("Jalan"), info musim, notifikasi Emas, tanpa WebGL | Inti pengalaman bermain |
| T4 | `feat/w3-invites` | Ajakan lengkap di web | Fitur terakhir yang belum bisa dipakai |
| T5 | `feat/w2b-doom-calendar-result` | Overlay Doom, hasil Event Tanggal, sisa popup Ganti Bulan | Umpan balik ke pemain |
| T6 | `feat/w4b-reveal-animation` | Animasi Fase Pembalikan sesuai `revealEndsAt` | Polesan |
| T7 | `feat/w6-edit-profile` | Edit Profile di Lobby | Kecil |
| T8 | `fix/playtest-*` | Playtest end-to-end dan perbaikan bug | Penutup |
| T9 | `docs/v1-14` | Dokumen disesuaikan dengan kode akhir | Penutup |

Perkiraan: **8 prompt utama, realistis 11-14** dengan perbaikan.

---

## 3. Keputusan sebelum mulai

| # | Pertanyaan | Usulan (dipakai di prompt) | Mempengaruhi |
|---|---|---|---|
| K3 | Apakah semua pemain boleh tahu siapa yang sedang punya Ajakan belum dijawab, supaya pionnya bisa tampil nonaktif (GDD 4.8)? | Ya. `inviteBusyPlayerIds` publik, berisi id target saja, tanpa motif, isi, atau pengirim | T1, T4 |
| K4 | Hasil Ajakan yang terlewat saat putus | `me.inviteResults` di snapshot, milik pemain itu saja, dari Fase Pembalikan terakhir | T1, T4 |
| K5 | Refleksi setelah pemain tereliminasi keluar room | Tampil di Layar Eliminasi sebelum Kembali ke Lobby; setelah keluar tidak bisa diakses (MVP tanpa database) | T2 |
| K6 | Bagikan hasil | Ditunda ke backlog | T2 |
| K7 | **Katalog 125 petak unik dari Nickzad** | **Ditunda sampai setelah playtest.** GDD v1.13 memakai 12 jenis petak (masing-masing sekitar 10 kali di papan) dengan 6 Realita per jenis. Katalog 125 petak unik berarti mengubah desain inti (GDD 5) dan butuh sekitar 750 Realita baru. Katalog ini bisa jadi bahan saat menyetel keseimbangan angka | Backlog |

Jika kamu tidak setuju dengan salah satu usulan, ubah dulu prompt terkait sebelum menjalankannya.

---

## 4. T0 - Persiapan

**Cek dan hapus worktree lama.** Pastikan tidak ada pekerjaan yang belum di-commit:
```bash
cd ~/Downloads/imron-hacktiv8-excercise/pejuang-umr
git worktree list
git -C ../pejuang-umr-v112 status --short
git -C ../pejuang-umr-web status --short
```
Kedua `status --short` harus kosong. Jika ada isinya, kirim ke chat dulu. Jika kosong:
```bash
git worktree remove ../pejuang-umr-v112
git worktree remove ../pejuang-umr-web
git worktree prune
git worktree list
```
Baris terakhir hanya boleh menampilkan `pejuang-umr`. Hapus juga branch lokal lama yang sudah di-merge:
```bash
git branch
git branch -D feat/v112-g7-contract-cleanup feat/web-v112-contract 2>/dev/null
```

**Siapkan repo utama:**
```bash
git checkout development && git pull
git status --short
ls apps/web/.env.local || cp apps/web/.env.example apps/web/.env.local
ls apps/server/.env
npm install && npm run typecheck && npm test
```
`git status --short` harus kosong. Catat jumlah tes per workspace sebagai pembanding.

**Pagar di repo utama.** Pagar ini belum pernah dipasang di sini:
```bash
mkdir -p .claude && cat > .claude/settings.local.json <<'EOF'
{
  "permissions": {
    "deny": [
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
git check-ignore .claude/settings.local.json || echo ".claude/settings.local.json" >> .git/info/exclude
git status --short
```
`git status --short` terakhir harus tetap kosong, artinya file pagar tidak ikut ke Git.

**Simpan panduan ini:**
```bash
cp ~/Downloads/PANDUAN_Penyelesaian_Solo_Imron.md docs/
git add docs/PANDUAN_Penyelesaian_Solo_Imron.md
git commit -m "docs: add solo completion guide"
git push
```

---

## 5. Pola setiap tugas

**Mulai:**
```bash
cd ~/Downloads/imron-hacktiv8-excercise/pejuang-umr
git checkout development && git pull
git status --short
git checkout -b <branch>
npm install && npm run typecheck && npm test
```
Buka Claude Code (**New session**) di VS Code dari folder `pejuang-umr`. Mulai di **Plan mode**, baca rencananya, lalu setujui ke Auto.

**Selesai:**
```bash
npm run typecheck && npm test && npm run lint
git --no-pager diff HEAD --stat
git status --short | grep '^??'
```
Untuk tugas yang mengubah tampilan, **coba di browser** dulu: `npm run dev:server` dan `npm run dev:web` di dua terminal, lalu buka 2-3 jendela (biasa, incognito, dan browser lain) sebagai pemain berbeda.

Lalu:
```bash
git add -A
git commit -m "<pesan dari panduan>"
git fetch origin
git --no-pager log --oneline HEAD..origin/development
```
- **Jika `log` kosong:** `git push -u origin <branch>`.
- **Jika ada commit baru** (misalnya Nickzad sempat mendorong sesuatu): `git merge origin/development`, lalu `grep -rn '^<<<<<<<' packages apps docs` harus kosong, lalu tes lagi, baru push.

Buka PR ke `development`, tunggu CI hijau, merge, lalu:
```bash
git checkout development && git pull
git branch -d <branch>
```

**Jika kuota Claude Code habis di tengah tugas:** buka New session, lalu kirim:
```
Lanjutkan tugas <kode> dari docs/PANDUAN_Penyelesaian_Solo_Imron.md. Pastikan branch aktif <branch>. Cek git status dan git diff --stat untuk melihat bagian yang sudah dikerjakan, jalankan npm run typecheck && npm test, lalu lanjutkan bagian yang belum selesai. Batas dan aturan tetap sama.
```

**Aturan umum untuk semua prompt di bawah:** setiap prompt meminta Claude Code memverifikasi kondisi kode sebelum mengubah apa pun. Kode bisa sudah berubah sejak panduan ini ditulis.

---

## 6. Prompt

### T1 - Celah kontrak

Branch `feat/s1-contract-gaps`. Commit: `feat: reveal timing, invite busy targets, missed invite results, and contract hardening`.

```
Tugas T1: tutup celah kontrak yang tersisa dari audit Nickzad. Lihat docs/PANDUAN_Penyelesaian_Solo_Imron.md bagian 1 dan keputusan K3-K4 di bagian 3.

Baca dulu: docs/GDD.md (4.2, 4.8, 9.4), docs/API_CONTRACT.md (Bagian 1.5, 3, 6, 9, 11a, 14, 17), apps/server/src/game/game-session.ts, apps/server/src/server.ts, packages/engine/src/turn/round.ts dan turn.ts, packages/shared/src/schemas/game.ts, serta .github/workflows/ci.yml.

Sebelum mengubah apa pun, verifikasi di kode dan laporkan di rencana: mana dari poin 1-8 yang sudah ada sebagian. Jangan mengerjakan ulang yang sudah ada.

Batas:
- Branch aktif harus feat/s1-contract-gaps. Jika bukan, berhenti.
- Boleh mengubah packages, apps/server, apps/web/src/lib (reducer dan tesnya saja, bukan komponen), .github/workflows/ci.yml, dan docs/API_CONTRACT.md (hanya bagian yang berubah karena tugas ini; naikkan versi ke 0.5 dan tulis daftar perubahannya di bagian atas).
- Tes privasi dan full-game harus tetap lulus. Jalankan npm run typecheck && npm test dan npm run lint sampai lulus. Di akhir, tulis ringkasan per poin.

Pekerjaan:
1. Waktu animasi Fase Pembalikan: round:reveal membawa revealEndsAt (waktu server saat kirim + REVEAL_STEP_MS × panjang order). PublicGameState membawa revealEndsAt (angka saat phase "reveal", selain itu null), supaya snapshot saat reconnect tahu kapan animasi selesai.
2. Target Ajakan sibuk (K3): PublicGameState membawa inviteBusyPlayerIds (id target yang punya Ajakan belum dijawab; tanpa motif, isi, atau pengirim). Kirim lewat game:patch op baru { type: "inviteBusy", playerIds } setiap kali daftar berubah. Tambah tes privasi untuk ini.
3. Hasil Ajakan terlewat (K4): Snapshot.me.inviteResults berisi payload invite:resolved milik pemain itu dari Fase Pembalikan terakhir (dikosongkan saat ronde berikutnya dimulai), divalidasi skema seperti field snapshot lain.
4. Op phase: server mengirim game:patch { type: "phase" } setiap kali public.phase berubah (Keputusan Terbuka #12).
5. ping:test hanya didaftarkan saat NODE_ENV=test (Keputusan Terbuka #11). Tes yang memakainya tetap lulus.
6. Tes deadline untuk turn:choose, calendar:answer, month:pay-debt, dan invite:respond: diterima tepat sebelum deadline + DEADLINE_GRACE_MS, ditolak sesudahnya, dan default timeout tidak diterapkan dua kali.
7. CI: tambah langkah "Check merge markers" sebelum Typecheck yang gagal jika ada baris diawali <<<<<<<, =======, atau >>>>>>> di docs, packages, atau apps (abaikan node_modules).
8. Web lib: perbarui reducer di apps/web/src/lib untuk revealEndsAt, op inviteBusy, op phase, dan me.inviteResults, beserta tesnya. Jangan mengubah komponen.
9. docs/API_CONTRACT.md: tulis perubahan poin 1-5 di bagian terkait, tandai Keputusan Terbuka #11 dan #12 sebagai diputuskan, dan pastikan tes daftar event dan kode error tetap sesuai.
```

### T2 - Eliminasi, Hasil Akhir, Refleksi, Main Lagi

Branch `feat/w5-result-screens`. Commit: `feat(web): elimination and result screens with reflection and rematch`.

```
Tugas T2: buat Layar Eliminasi dan Hasil Akhir Multiplayer di web, termasuk Refleksi dan Main Lagi.

Baca dulu: docs/GDD.md (6.2, 6.5, 9.4, 9.5), docs/API_CONTRACT.md (room:leave, room:rematch, game:finished, player:eliminated, reflection:ready, session:snapshot, Bagian 15), docs/02_DESIGN.md, apps/web/AGENTS.md, apps/web/src/app/room/[code]/lobby-client.tsx, apps/web/src/lib/room-session-view.ts, dan komponen ui yang ada (Button, Card, BottomSheet, Badge).

Sebelum mengubah apa pun, verifikasi: bagaimana lobby-client.tsx memilih layar sekarang (playing, waiting, finished), dan apakah me.reflection dan session.result sudah terisi dari snapshot.

Batas:
- Branch aktif harus feat/w5-result-screens. Jika bukan, berhenti.
- Hanya mengubah apps/web. Komponen baru ditaruh di apps/web/src/app/components/screens/ dan apps/web/src/app/components/game/ReflectionCard.tsx.
- Teks UI Bahasa Indonesia dengan istilah glosarium GDD. Skor ditampilkan bilangan bulat.
- Jalankan npm run typecheck && npm test dan npm run lint sampai lulus. Di akhir, tulis ringkasan.

Pekerjaan:
1. Daftarkan reflection:ready di lobby-client.tsx dan simpan ke me.reflection lewat reducer di lib (pola applyPrivateStatus), beserta tesnya.
2. Pemilihan layar di lobby-client.tsx:
   - Pemain sendiri ada di game.eliminated dan room masih playing → EliminationScreen.
   - room.status "finished" atau session.result terisi → ResultScreen.
   - Room kembali "waiting" setelah Main Lagi → WaitingRoom seperti biasa.
3. ReflectionCard: me.reflection (summary, 1-3 insight, reference jika ada). Saat belum ada: "Menyusun refleksimu...". Label kecil "Insight berbasis aturan" jika source "rules".
4. EliminationScreen:
   - Judul "Hari ini kamu perlu istirahat." dan alasan (Bangkrut atau Burnout Total).
   - Ringkasan pribadi dari me.status terakhir: Kekayaan, Hutang, Kesehatan, Level Stress.
   - ReflectionCard.
   - Tombol "Kembali ke Lobby" → room:leave → /lobby.
5. ResultScreen:
   - Podium dan daftar peringkat dari result.ranking: karakter (getAvatarSrc), nama, Skor Kesejahteraan (dibulatkan), tanda tereliminasi.
   - Rincian yang bisa dibuka per pemain: Harta Bersih (formatRupiah) dan tiga poin (Keuangan, Kesehatan, Ketenangan).
   - ReflectionCard milik pemain sendiri.
   - Tombol "Main Lagi" hanya untuk pemain yang id-nya sama dengan room.hostId terbaru → room:rematch. Pemain lain melihat "Menunggu host memulai Main Lagi". Tangani NOT_HOST dan NOT_ENOUGH_PLAYERS ("Tidak ada pemain yang bisa main lagi. Kembali ke Lobby.").
   - Tombol "Kembali ke Lobby" → room:leave → /lobby.
6. Tes: pemilihan layar (playing, tereliminasi, finished, kembali waiting), tombol Main Lagi untuk host dan bukan host, NOT_ENOUGH_PLAYERS, pembulatan skor, ReflectionCard memuat dan terisi.
```
Uji di browser dengan timer 15 detik, lalu biarkan waktu habis supaya game cepat selesai. Cek Main Lagi dari host dan tampilan non-host.

### T3 - Papan dan HUD

Branch `feat/w4a-board-hud`. Commit: `feat(web): board interaction, opened hex details, scoreboard, season info, and WebGL notice`.

```
Tugas T3: lengkapi interaksi papan dan HUD sesuai GDD.

Baca dulu: docs/GDD.md (Platform, 3.2, 3.4, 4.1, 4.3, 4.6, 4.7), docs/API_CONTRACT.md (Bagian 3 PublicGameState, OpenedHex, TileOption, serta turn:options, tile:opened, season:changed, gold:spawned, gold:expired), docs/02_DESIGN.md, apps/web/src/app/components/game/GameInterface.tsx, GameBoard.tsx, Scoreboard.tsx, dan apps/web/src/app/components/game-v2/HexDetailSheet.tsx.

Sebelum mengubah apa pun, verifikasi bagaimana pilihan heksa dan detail heksa bekerja sekarang, serta apakah hint musim sudah tersimpan di state.

Batas:
- Branch aktif harus feat/w4a-board-hud. Jika bukan, berhenti.
- Hanya mengubah apps/web.
- Tidak ada hover untuk menampilkan informasi heksa (GDD 4.3); hanya klik atau ketuk.
- Jalankan npm run typecheck && npm test dan npm run lint sampai lulus. Di akhir, tulis ringkasan.

Pekerjaan:
1. Klik heksa menyala di papan 3D membuka HexDetailSheet (Rencana, ikon risiko, tag risiko, tombol "PILIH HEKSA INI"). Klik heksa menyala lain langsung mengganti isi. Heksa yang tidak menyala tidak bisa diklik. Hapus daftar tombol pilihan di luar papan.
2. Rencana singkat (judul petak) tampil di permukaan heksa menyala, hanya untuk pemain aktif.
3. Heksa terbuka bisa diklik semua pemain: detail berisi Rencana dan, setelah Fase Pembalikan, Realita (OpenedHex.reality). Tanpa tombol Pilih.
4. HexDetailSheet: Realita terkunci bertuliskan "Terungkap di akhir ronde". Petak Emas tidak punya bagian Realita, dan tombolnya "AMBIL PETAK EMAS".
5. Papan Skor: karakter (getAvatarSrc), nama, Skor Sementara dibulatkan, mahkota Peringkat 1, tanda tereliminasi, dan label "Jalan" pada pemain yang sedang giliran.
6. HUD: keterangan musim dari season:changed.hint (simpan di state jika belum), contoh "Pancaroba: petak Kesehatan lebih rawan".
7. Notifikasi Petak Emas: gold:spawned ("Petak Emas muncul! Hilang dalam 3 ronde") dan gold:expired.
8. Tanpa WebGL: jika WebGL tidak tersedia atau canvas gagal dibuat, tampilkan "Perangkatmu belum mendukung papan 3D. Coba buka di komputer atau browser lain." tanpa papan cadangan.
9. Hapus tombol yang tidak berlaku: "Jeda" dan "Ulang". Tombol Kartu Ajakan biarkan untuk T4.
10. Tes: klik heksa menyala membuka detail, klik heksa lain mengganti isi, heksa tidak menyala tidak bisa diklik, detail heksa terbuka tanpa Pilih, Petak Emas tanpa Realita, label "Jalan", pembulatan skor, dan pemberitahuan tanpa WebGL.
```

### T4 - Ajakan

Branch `feat/w3-invites`. Commit: `feat(web): invites with target picker, incoming popup, and reveal results`.

```
Tugas T4: sambungkan Ajakan di web.

Baca dulu: docs/GDD.md (4.2, 4.8, 9.4), docs/API_CONTRACT.md (Bagian 14, 11a, 15, serta inviteBusyPlayerIds dan me.inviteResults), keputusan K3-K4 di docs/PANDUAN_Penyelesaian_Solo_Imron.md, apps/web/src/app/room/[code]/lobby-client.tsx, apps/web/src/lib/room-session-view.ts, apps/web/src/app/components/game/GameInterface.tsx, dan apps/web/src/app/components/game-v2/invites.tsx.

Sebelum mengubah apa pun, verifikasi apa yang sudah ada di invites.tsx dan apakah reducer untuk inviteBusy dan inviteResults dari T1 sudah ada.

Batas:
- Branch aktif harus feat/w3-invites. Jika bukan, berhenti.
- Hanya mengubah apps/web.
- Motif Ajakan tidak pernah ditampilkan ke pemain lain. Motif hanya terlihat oleh pemilik kartu, dan oleh target setelah Fase Pembalikan.
- Jalankan npm run typecheck && npm test dan npm run lint sampai lulus. Di akhir, tulis ringkasan.

Pekerjaan:
1. Daftarkan invite:card, invite:incoming, dan invite:resolved di lobby-client.tsx dengan reducer di lib (me.inviteCard, me.pendingInvite, daftar hasil sementara), beserta tesnya.
2. Tombol "Kartu Ajakan": aktif hanya saat pemain punya me.inviteCard, sedang giliran, dan me.pendingTurn ada (belum memilih heksa). Kartu menampilkan Rencana, efek, dan motif (hanya pemilik).
3. Alur kirim: pilih kartu → klik pion target di papan → konfirmasi "Ajak <nama> untuk <Rencana>?" → invite:send dengan turnId dari me.pendingTurn.
   - Pion nonaktif untuk diri sendiri, pemain tereliminasi, dan pemain di game.inviteBusyPlayerIds.
   - Tangani INVITE_NOT_ALLOWED, NO_INVITE_CARD, dan INVALID_TARGET dengan teks dari API_CONTRACT Bagian 15.
   - Jika Timer Giliran habis sebelum konfirmasi, batalkan alurnya.
4. Popup untuk target (me.pendingInvite): nama pengirim, Rencana dan efeknya, hitung mundur dari deadline (pakai serverClockOffsetMs), tombol "Ikut" dan "Tolak" → invite:respond. Waktu habis menutup popup ("Waktu menjawab habis, dihitung Tolak"). Popup tidak menutupi heksa menyala jika target sedang giliran.
5. Hasil di Fase Pembalikan dan setelah reconnect (me.inviteResults): jawaban, motif (Tulus atau Komisi), dan efek untukmu. Tampil sekali per inviteId.
6. Tes: tombol aktif atau nonaktif, pion sibuk tidak bisa dipilih, payload invite:send membawa turnId, hitung mundur dan timeout, hasil tampil sekali, motif tidak bocor ke pemain lain.
```
Uji di browser dengan tiga jendela, supaya ada pemain ketiga yang bisa dicek tidak melihat motif.

### T5 - Doom, hasil Event Tanggal, sisa Ganti Bulan

Branch `feat/w2b-doom-calendar-result`. Commit: `feat(web): doom overlay, calendar results, and month popup polish`.

```
Tugas T5: tambah overlay Doom Spending dan pemberitahuan hasil Event Tanggal, lalu rapikan popup Ganti Bulan.

Baca dulu: docs/GDD.md (2.4, 2.5, 3.3), docs/API_CONTRACT.md (month:summary, month:pay-debt, doom:triggered, calendar:result, Bagian 15), apps/web/src/app/components/game/MonthChangeView.tsx, apps/web/src/app/components/game-v2/CalendarEventView.tsx, dan lobby-client.tsx.

Sebelum mengubah apa pun, verifikasi apa yang sudah ditangani MonthChangeView (buatan Nickzad) supaya tidak dikerjakan ulang.

Batas:
- Branch aktif harus feat/w2b-doom-calendar-result. Jika bukan, berhenti.
- Hanya mengubah apps/web.
- Jalankan npm run typecheck && npm test dan npm run lint sampai lulus. Di akhir, tulis ringkasan.

Pekerjaan:
1. Daftarkan doom:triggered dan calendar:result di lobby-client.tsx. Simpan sebagai pemberitahuan sementara di state (id unik, jenis, payload) dengan fungsi untuk menghapusnya, beserta tesnya.
2. Overlay Doom: "Checkout dulu, nyesel belakangan.", nominal, dan Level Stress setelahnya. Bisa ditutup, atau tertutup sendiri setelah 4 detik.
3. Toast hasil Event Tanggal: pilihan, efek, dan flavor. Hilang sendiri setelah 4 detik.
4. MonthChangeView, hanya jika belum ada:
   - payDebt.max 0: slider nonaktif dengan teks "Kekayaanmu belum cukup untuk mencicil" dan tombol "Lewati" yang mengirim Rp0.
   - Ack debtCleared: "Hutang lunas! Level Stress -2".
   - PAYMENT_CLOSED dan INVALID_PAYLOAD dengan teks dari API_CONTRACT Bagian 15.
   - Langkah slider Rp50.000, dengan nilai maksimum tetap bisa dipilih.
5. Tes untuk semua poin di atas.
```

### T6 - Animasi Fase Pembalikan

Branch `feat/w4b-reveal-animation`. Commit: `feat(web): reveal phase animation synced with revealEndsAt`.

```
Tugas T6: animasi Fase Pembalikan yang sinkron dengan server.

Baca dulu: docs/GDD.md (4.2, 4.4), docs/API_CONTRACT.md (Bagian 11a: round:reveal, revealEndsAt, tile:resolved, PublicGameState.revealEndsAt), docs/02_DESIGN.md (Motion), dan komponen papan.

Batas:
- Branch aktif harus feat/w4b-reveal-animation. Jika bukan, berhenti.
- Hanya mengubah apps/web.
- Jalankan npm run typecheck && npm test dan npm run lint sampai lulus. Di akhir, tulis ringkasan.

Pekerjaan:
1. Saat round:reveal: banner "Fase Pembalikan", heksa dibalik satu per satu sesuai order, dengan jarak waktu dibagi rata sampai revealEndsAt (pakai serverClockOffsetMs). Hasil Zonk, Aman, atau Hoki tampil dengan teks Realita.
2. Reconnect di tengah Fase Pembalikan (snapshot phase "reveal" dan revealEndsAt di masa depan): lanjutkan dari posisi yang benar tanpa mengulang animasi yang sudah lewat. Jika revealEndsAt sudah lewat, langsung tampilkan keadaan akhir.
3. Hormati prefers-reduced-motion: tanpa animasi balik, langsung tampilkan hasil.
4. Tes: jadwal animasi dari order dan revealEndsAt, reconnect di tengah, revealEndsAt sudah lewat.
```

### T7 - Edit Profile

Branch `feat/w6-edit-profile`. Commit: `feat(web): edit profile in lobby`.

```
Tugas T7: ganti tombol "Ubah nama" di Lobby menjadi "Edit Profile" untuk mengubah nama dan karakter.

Baca dulu: docs/GDD.md (9.1), docs/API_CONTRACT.md (4.1 POST /api/v1/guest, Bagian 15), apps/web/src/app/lobby/lobby-screen.tsx, apps/web/src/lib/api-client.ts, dan apps/web/src/lib/avatars.ts.

Batas:
- Branch aktif harus feat/w6-edit-profile. Jika bukan, berhenti.
- Hanya mengubah apps/web/src/app/lobby/* dan tesnya.
- Jalankan npm run typecheck && npm test dan npm run lint sampai lulus. Di akhir, tulis ringkasan.

Pekerjaan:
1. Label tombol "Edit Profile". Membuka popup yang sama dengan "Masuk sebagai tamu" dalam mode edit: judul "Edit Profile", nama dan karakter terisi dari sesi.
2. Simpan memanggil POST /api/v1/guest dengan header Authorization, lalu memperbarui sesi di localStorage.
3. Tangani ALREADY_IN_ROOM ("Edit Profile hanya bisa di Lobby."), NAME_REJECTED, dan RATE_LIMITED dengan teks dari API_CONTRACT Bagian 15.
4. Tes: mode edit terisi, simpan memperbarui sesi, pesan error.
```

---

## 7. T8 - Playtest end-to-end

Jalankan server dan web, lalu main dengan 3 jendela browser (biasa, incognito, dan browser lain). Checklist:

| # | Skenario | Lulus jika |
|---|---|---|
| 1 | Masuk sebagai tamu, buat room, 2 pemain lain gabung lewat kode | Ketiganya di Room, karakter berbeda |
| 2 | Ganti karakter, Siap, host Mulai | Hitung mundur, game mulai |
| 3 | Giliran: klik heksa di papan, lihat detail, Pilih | Pion pindah, Rencana berlaku |
| 4 | Akhir ronde | Fase Pembalikan berurutan, skor berubah |
| 5 | Langkah 3 | Popup Ganti Bulan muncul untuk semua; slider jika berhutang |
| 6 | Langkah 9 (Hari Buruh) | Ganti Bulan dulu, lalu Event Tanggal, lalu kartu Ajakan dan Petak Emas |
| 7 | Kirim Ajakan dari giliran sendiri | Target dapat popup; pion target nonaktif bagi pemain lain; hasil dan motif muncul di Fase Pembalikan untuk pengirim dan target saja |
| 8 | Refresh browser di tengah giliran, popup, dan Fase Pembalikan | Kembali ke keadaan yang sama tanpa efek ganda |
| 9 | Biarkan waktu habis di giliran, Ganti Bulan, Event Tanggal, dan Ajakan | Default berlaku (acak, Rp0, Tidak ikut, Tolak) |
| 10 | Eliminasi (pakai Pinjol berulang sampai Hutang lebih dari Rp25 juta) | Layar Eliminasi dan Refleksi muncul; Kembali ke Lobby berhasil; pion tetap di papan pemain lain |
| 11 | Game sampai Langkah 24 | Hasil Akhir, podium, tiga poin, Refleksi |
| 12 | Main Lagi oleh host | Room kembali tanpa pemain tereliminasi |
| 13 | Konsol browser dan log server | Tidak ada error |

Catat semua bug dalam satu file (layar, langkah reproduksi, hasil yang diharapkan), lalu kirim ke chat. Setiap kelompok bug diperbaiki di branch `fix/playtest-<ringkas>`.

---

## 8. T9 dan backlog setelah game selesai

1. **Dokumen (T9):** GDD v1.14, API Contract, dan 05_PROJECT_STATE disesuaikan dengan kode akhir. Saya kerjakan dari chat setelah T8.
2. **Keseimbangan angka:** simulasi pembanding, karena game masih terlalu mudah (skor rata-rata 89, eliminasi 0%). Katalog 125 petak (K7) bisa dibahas di sini.
3. **Provider LLM** untuk Refleksi.
4. **Bagikan hasil** (K6).
5. **Keamanan:** `npm audit --omit=dev`.
6. **Lisensi sprite karakter** (repo public).
7. **Desain layar baru** di 04_UI.
8. **Deploy.**
