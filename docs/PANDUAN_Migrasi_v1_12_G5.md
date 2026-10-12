# Panduan Migrasi GDD v1.12: G5 (Room, Karakter, Eliminasi, Snapshot)

Rencana: `docs/RENCANA_Migrasi_v1_12.md`. Ditulis dari kode `development` di `d12420c`, ditambah hasil G4.

| Tahap | Isi | Commit |
|---|---|---|
| 1 | Karakter sebagai pion (`room:avatar`, unik per room) dan `avatarId` di hasil akhir | 1 |
| 2 | Keluar setelah eliminasi, penonton dihapus, Main Lagi tanpa pemain tereliminasi, kalender tidak maju selama jeda Fase Pembalikan | 1 |

---

## Syarat sebelum mulai

1. **PR G4 sudah di-merge** ke `development`. G5 mengubah `game-session.ts` dan `register-room-handlers.ts`, yang juga diubah G4, jadi G5 harus dimulai dari kode setelah G4.
2. **Kabari Nickzad** bahwa G5 (Room) sedang kamu kerjakan, supaya ia tidak mengubah file berikut sampai G5 di-merge:
   - `apps/server/src/socket/register-room-handlers.ts`
   - `apps/server/src/socket/register-game-handlers.ts`
   - `apps/server/src/repositories/room-repository.ts`
   - `apps/server/src/game/game-session.ts`
   - `apps/server/src/services/snapshot.ts`
   - `packages/shared`

   Ia tetap bebas di `apps/web`.

---

## Langkah 0 - Siapkan (Kamu)

```bash
cd ~/Downloads/imron-hacktiv8-excercise/pejuang-umr
git checkout development && git pull
git --no-pager log --oneline -3
cp ~/Downloads/PANDUAN_Migrasi_v1_12_G5.md docs/
git add docs/
git commit -m "docs: add G5 guide"
git push

cd ../pejuang-umr-v112
git status
git fetch origin
git checkout -b feat/v112-g5-room-avatar origin/development
npm install && npm run typecheck && npm test
code .
```
`git log` harus memuat merge PR G4. Buka Claude Code (New session) di jendela VS Code yang terbuka dari `code .`.

---

## Prompt G5

Mulai di **Plan mode**, baca rencananya, lalu setujui ke Auto.

```
Tugas G5 migrasi GDD v1.12: karakter sebagai pion, keluar setelah eliminasi, penonton dihapus, Main Lagi, dan snapshot selama jeda Fase Pembalikan.

Baca dulu: docs/RENCANA_Migrasi_v1_12.md (bagian 2.3 V3-V4, bagian 3), docs/GDD.md (1.2, 9.1, 9.3, 9.4, 9.5), docs/API_CONTRACT.md (Bagian 4, 6, 7, 8, 13, 15).

Batas:
- Pastikan kamu di folder pejuang-umr-v112 dan branch feat/v112-g5-room-avatar (cek pwd dan git branch --show-current). Jika bukan, berhenti.
- Boleh mengubah apps/server, packages/engine, dan packages/shared hanya secara expand (jangan hapus atau ubah tipe yang ada; event dan field yang tidak dipakai lagi cukup ditandai @deprecated). JANGAN mengubah apps/web. Web harus tetap lulus typecheck.
- Kerjakan per tahap. Di akhir setiap tahap jalankan npm run typecheck && npm test. Jika satu tahap tidak bisa lulus tanpa tahap berikutnya, jelaskan alasannya di ringkasan. Di akhir, tulis ringkasan per tahap.

TAHAP 1 - Karakter sebagai pion (GDD 9.1 dan 9.3 v1.12)
1. Karakter yang sah adalah CharacterIdSchema dari shared ("michael", "raka", "sinta", "icha"), sama dengan apps/web/src/lib/avatars.ts.
2. POST /api/v1/guest: avatarId harus salah satu karakter. Token lama yang avatarId-nya bukan karakter tetap diterima; server memperlakukannya sebagai belum punya karakter.
3. Room: RoomPlayer.avatarId adalah karakter di room itu dan harus unik dalam room.
   - Saat membuat atau bergabung ke room, pakai karakter dari profil tamu. Jika sudah dipakai atau tidak sah, beri karakter kosong pertama sesuai urutan CharacterIdSchema.
   - Profil tamu tidak berubah; ini hanya karakter di room.
4. Handler room:avatar memakai RoomAvatarRequestSchema, dengan pola ack, requestId, dan idempotensi yang sama seperti room:pawn. Error: AVATAR_TAKEN, ROOM_LOCKED, NOT_IN_ROOM. Setelah berhasil, kirim room:state.
5. room:pawn tetap berfungsi untuk web lama (deprecated). Field pawn tetap diisi dan tetap unik: petakan urutan karakter ke urutan PAWN_ORDER, sehingga mengganti karakter juga mengganti pawn, dan sebaliknya.
6. Hasil akhir: identitiesFromRoom mengisi avatarId dari karakter room, sehingga game:finished.ranking[].avatarId selalu terisi. Identitas tetap diambil saat game dimulai (sudah begitu sekarang), jadi pemain yang keluar setelah eliminasi tetap muncul dengan nama dan karakternya.
7. Tes: guest dengan karakter tidak sah ditolak; bergabung dengan karakter yang sudah dipakai mendapat karakter kosong pertama; room:avatar berhasil dan AVATAR_TAKEN; room:pawn dan room:avatar tetap konsisten; avatarId terisi di game:finished.

TAHAP 2 - Eliminasi, penonton, Main Lagi, snapshot (GDD 9.4 dan 9.5 v1.12)
1. room:leave oleh pemain yang SUDAH TERELIMINASI saat game berjalan: keluarkan dari room (rooms.leave, socket keluar dari channel room, room:state ke yang lain). Jika ia host, host pindah ke pemain berikutnya seperti aturan keluar yang ada. Game tetap berjalan; pion dan heksanya tetap ada di state engine. Pemain yang belum tereliminasi tetap diperlakukan seperti koneksi putus (aturan lama).
2. Penonton dihapus:
   - Hapus set spectators, enterSpectate, dan isSpectator di GameSession.
   - public.spectators selalu [] dan Snapshot.me.isSpectator selalu false (keduanya deprecated).
   - Handler spectate:enter tetap ada (deprecated) dan selalu menjawab { ok: false, error: "INVALID_PAYLOAD", message: "Mode penonton sudah dihapus." }.
   - Event dispatcher tidak lagi mengecualikan penonton.
   - Hapus atau tulis ulang spectator.integration.test.ts sesuai aturan baru.
3. Main Lagi: rooms.rematch juga mengeluarkan pemain yang tereliminasi di game sebelumnya, selain yang tidak tersambung. Mereka masuk daftar removed seperti sekarang.
4. Kalender selama jeda Fase Pembalikan: setelah endRound, public.calendar tetap di langkah ronde yang baru selesai sampai startRound berikutnya. Langkah baru baru terlihat lewat game:patch calendar di startRound. Ubah engine seperlunya (mis. langkah berikutnya disimpan internal, lalu dipakai di startRound). Simulasi dan semua invarian tetap lulus.
5. Tes:
   - Pemain tereliminasi yang keluar hilang dari room:state, game tetap jalan sampai game:finished, dan ia tetap ada di ranking.
   - Host tereliminasi yang keluar: host pindah.
   - Pemain belum tereliminasi yang keluar tetap terdaftar dan ditandai terputus.
   - spectate:enter selalu ditolak.
   - Main Lagi tidak memuat pemain yang tereliminasi.
   - Snapshot selama jeda Fase Pembalikan: phase "reveal" dan calendar.step masih langkah ronde yang baru selesai.
   - full-game.integration tetap di bawah 20 detik.

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
- Tidak boleh ada `apps/web` atau `docs`. Jumlah tes web harus sama dengan sebelum G5.

## Commit

```bash
git add packages/shared apps/server/src/http apps/server/src/services/guest-token.ts apps/server/src/repositories
git commit -m "feat(server): characters as unique pawns with room:avatar"

git add -A
git --no-pager diff --cached --stat
git commit -m "feat(server): leave after elimination, remove spectators, rematch without eliminated players"

git status
git fetch origin
git --no-pager log --oneline HEAD..origin/development
```
Jika `log` terakhir kosong: `git push -u origin feat/v112-g5-room-avatar`, lalu PR ke `development`. Jika ada commit baru: `git merge origin/development`, tes, baru push. Jika konflik, kirim daftar filenya ke chat.

Pemecahan commit tidak harus sempurna (misalnya `register-room-handlers.ts` berubah di kedua tahap). Yang penting kondisi akhir branch lulus.

## Kabari Nickzad setelah merge

- Pakai `room:avatar` dengan id karakter (`michael`, `raka`, `sinta`, `icha`). `room:pawn` masih jalan tetapi akan dihapus di G7.
- `RoomPlayer.avatarId` adalah karakter di room itu, unik per room. `game:finished.ranking[].avatarId` selalu terisi.
- Layar Eliminasi: tombol Kembali ke Lobby mengirim `room:leave`, dan pemain itu benar-benar keluar dari room. `spectate:enter` sudah tidak berfungsi.
- Main Lagi tidak memuat pemain yang tereliminasi.
- Selama jeda Fase Pembalikan, kalender belum maju.
- Setelah web sudah memakai semua kontrak baru, kabari supaya G7 (pembersihan) bisa dijalankan.

## Jika kuota habis di tengah prompt

```
Lanjutkan G5 dari docs/PANDUAN_Migrasi_v1_12_G5.md. Pastikan kamu di folder pejuang-umr-v112 dan branch feat/v112-g5-room-avatar. Cek git status dan git diff --stat untuk melihat tahap yang sudah dikerjakan, jalankan npm run typecheck && npm test, lalu lanjutkan dari tahap pertama yang belum selesai. Batas dan aturan tetap sama.
```
