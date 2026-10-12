# Panduan Migrasi GDD v1.12: G7 (Pembersihan Kontrak)

Basis: `development` di `6a42c59` (G6 dan W1 sudah di-merge). Ini prompt terakhir rangkaian G.

**Tujuan:** shared, engine, server, dan web hanya memakai kontrak v0.3 di `docs/API_CONTRACT.md`. Semua yang ditandai `@deprecated` dihapus, dan semua field "wajib setelah pembersihan G7" dijadikan wajib.

**Kenapa web ikut disentuh:** setelah W1, web masih mengisi beberapa field lama dengan nilai netral (`turnPaused: false`, `deadHexes: []`, dan sejenisnya), karena shared masih mewajibkannya. Begitu field itu dihapus dari shared, baris-baris itu juga harus dihapus.

| Tahap | Isi | Commit |
|---|---|---|
| 1 | Shared, engine, dan server: hapus yang lama, wajibkan yang baru | 1 |
| 2 | Web: hapus nilai netral dan fixture lama | 1 |

---

## Langkah 0 - Siapkan (Kamu)

**Beri tahu Nickzad** bahwa G7 akan menyentuh `packages/shared` dan sedikit `apps/web`. Minta ia menahan push ke `apps/web` sampai G7 di-merge, atau setidaknya mengabari sebelum push.

```bash
cd ~/Downloads/imron-hacktiv8-excercise/pejuang-umr
git checkout development && git pull
git --no-pager log --oneline -1
cp ~/Downloads/PANDUAN_Migrasi_v1_12_G7.md docs/
git add docs/
git commit -m "docs: add G7 guide"
git push

cd ../pejuang-umr-v112
git status
git fetch origin
git checkout -b feat/v112-g7-contract-cleanup origin/development
git branch -D feat/v112-g6-reflection-privacy
ls apps/web/.env.local || cp apps/web/.env.example apps/web/.env.local
npm install && npm run typecheck && npm test
```

**Ubah pagar.** G7 boleh menyentuh `apps/web`, jadi baris kunci web dihapus:
```bash
cat > .claude/settings.local.json <<'EOF'
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
code .
```
Setelah G7 di-merge, kembalikan kunci web di worktree ini jika masih dipakai untuk pekerjaan server.

---

## Prompt G7

Mulai di **Plan mode**. Baca daftar yang akan dihapus di rencananya dengan teliti, lalu setujui ke Auto.

```
Tugas G7 migrasi GDD v1.12: pembersihan kontrak. Setelah tugas ini, shared, engine, server, dan web hanya memakai kontrak v0.3 sesuai docs/API_CONTRACT.md.

Baca dulu: docs/API_CONTRACT.md (seluruhnya, terutama Bagian 0, 3, dan 15), docs/RENCANA_Migrasi_v1_12.md (bagian 3), lalu cari semua "@deprecated" dan "wajib setelah pembersihan G7" di packages/shared/src.

Batas:
- Pastikan kamu di folder pejuang-umr-v112 dan branch feat/v112-g7-contract-cleanup (cek pwd dan git branch --show-current). Jika bukan, berhenti.
- Boleh mengubah packages/shared, packages/engine, apps/server, dan apps/web. Di apps/web HANYA menghapus pemakaian field yang dihapus (nilai netral, fixture tes, dan tipe). Jangan mengubah tampilan atau menambah fitur web.
- Jangan mengubah docs. Jika kode dan API_CONTRACT berbeda, ikuti API_CONTRACT dan laporkan perbedaannya di ringkasan.
- Kerjakan per tahap. Di akhir jalankan npm run typecheck && npm test dan npm run lint -w @pejuang/web sampai lulus. Di akhir, tulis ringkasan per tahap.

TAHAP 1 - Shared, engine, server
1. Hapus dari shared, beserta pemakaiannya di engine dan server:
   - PawnIdSchema, tipe PawnId, RoomPlayer.pawn, GameFinishedRank.pawn, RoomPawnRequestSchema, event room:pawn (skema klien, tipe event, dan handler server), kode error PAWN_TAKEN, serta pemetaan karakter ke pion di room-repository.
   - PublicGameState.turnPaused, deadHexes, dan spectators.
   - Snapshot.me.isSpectator.
   - Event turn:timer beserta skema payload-nya.
   - Event spectate:enter beserta skema dan handler server.
   - Kode error INVITE_LIMIT dan NOT_ELIMINATED.
   - MonthSummaryPayload.doomAmount.
   - OpenedHex.outcome (pakai reality).
   - Nilai zonkFocus lama ("vehicleWash", "vehicleBreakdown").
   - doom:triggered.trigger.
   - Field lain di payload yang tidak ada di definisi API_CONTRACT v0.3. Periksa terutama tile:resolved (kontrak tidak memuat turnId), lalu laporkan setiap field yang kamu hapus karena alasan ini.
2. Jadikan wajib semua field bertanda "v0.3: wajib setelah pembersihan G7", lalu hapus komentarnya. Termasuk: PublicGameState.phase, OpenedHex.plan dan reality, GameFinishedRank.avatarId, Snapshot.me.pendingMonth dan reflection, MonthSummaryPayload.payDebt, season:changed.hint, player:eliminated.frozenScore, doom:triggered.round, tile:resolved.round, dan invite:send.turnId. Pastikan engine dan server selalu mengisinya.
3. Karakter: avatarId di guest, room, dan ranking memakai CharacterIdSchema. Hapus AvatarIdSchema yang berupa string bebas, atau jadikan alias CharacterIdSchema. Token tamu lama dengan avatar tidak sah tetap tidak boleh membuat server error; pertahankan perilaku "dianggap belum punya karakter".
4. Engine: hapus packages/engine/src/data/multiplier.ts jika tidak dipakai, InviteMotiveReveal dan sisa revealMotiveTo jika masih ada, penanganan kartu "trap", serta tipe atau fungsi lain yang hanya ada untuk kontrak lama.
5. Server: invite:send sekarang mewajibkan turnId. Hapus jalur "tanpa turnId pakai giliran aktif".
6. Tes:
   - Perbarui semua tes yang terdampak.
   - Tambah tes di shared yang memastikan daftar event klien-ke-server dan server-ke-klien sama dengan daftar di API_CONTRACT Bagian 0 (46 event: 44 dari 03_REKOMENDASI ditambah room:kicked dan room:rematch). Jika jumlahnya berbeda dari kontrak, laporkan event mana yang berbeda.
   - Tes privasi dan full-game harus tetap lulus.

TAHAP 2 - Web
1. Hapus nilai netral untuk field yang sudah dihapus (turnPaused, deadHexes, spectators, isSpectator, outcome, pawn) di apps/web/src/lib/game-view.ts dan file lain.
2. Perbarui fixture tes web (game-view.test.ts, room-session-view.test.ts, dan lainnya) supaya sesuai tipe baru, termasuk field yang kini wajib.
3. Hapus tes yang khusus memeriksa op inviteSincereDeclined diabaikan, karena op itu sudah tidak ada di tipe.
4. Akhiri dengan pencarian di seluruh repo (packages, apps, kecuali node_modules dan docs) untuk: room:pawn, PawnId, PAWN_TAKEN, turn:timer, turnPaused, deadHexes, spectators, isSpectator, spectate:enter, INVITE_LIMIT, NOT_ELIMINATED, doomAmount, inviteSincereDeclined, vehicleWash, vehicleBreakdown, trap, modifier, toMultiplayerEffects, "wajib setelah pembersihan G7", @deprecated. Laporkan hasilnya; targetnya kosong.

Selesai jika npm run typecheck && npm test dan lint web lulus.
```

---

## Cek akhir (Kamu)

```bash
pwd
npm run typecheck && npm test
npm run lint -w @pejuang/web
git --no-pager diff HEAD --stat
git status --short | grep '^??'
```
- Perubahan di `apps/web` hanya boleh berupa penghapusan nilai netral, fixture, dan tipe. Cek dengan `git --no-pager diff HEAD --stat -- apps/web`. Isinya seharusnya didominasi baris yang dihapus.
- Hasil pencarian di akhir ringkasan Claude Code harus kosong, atau berisi alasan yang jelas.

**Coba di browser** (seperti W1). Jalankan `npm run dev:server` dan `npm run dev:web` di dua terminal, lalu mainkan beberapa giliran dengan dua jendela (biasa dan incognito). Cek:
- masuk sebagai tamu;
- memilih karakter di Room;
- mulai game, memilih heksa, dan Fase Pembalikan berjalan;
- tidak ada error di konsol browser.

## Commit

```bash
git add packages apps/server
git commit -m "refactor: remove deprecated contract v0.2 fields and require v0.3 fields"

git add -A
git --no-pager diff --cached --stat
git commit -m "refactor(web): drop neutral values for removed contract fields"

git fetch origin
git --no-pager log --oneline HEAD..origin/development
```
Jika `log` kosong: `git push -u origin feat/v112-g7-contract-cleanup`, lalu PR ke `development` dan minta Nickzad me-review bagian web. Jika ada commit baru (terutama dari Nickzad di `apps/web`): `git merge origin/development`, tes, baru push.

Commit pertama sendirian tidak lulus typecheck web, karena web baru diperbaiki di commit kedua. Tidak apa-apa, CI hanya mengecek kondisi akhir branch.

## Kabari Nickzad setelah merge

- Kontrak sekarang persis v0.3. Field dan event lama sudah hilang dari tipe, jadi kode web baru yang memakainya tidak akan lolos typecheck.
- `invite:send` wajib membawa `turnId` (dari `turn:options`).
- `avatarId` bertipe karakter (`michael`, `raka`, `sinta`, `icha`).

## Jika kuota habis di tengah prompt

```
Lanjutkan G7 dari docs/PANDUAN_Migrasi_v1_12_G7.md. Pastikan kamu di folder pejuang-umr-v112 dan branch feat/v112-g7-contract-cleanup. Cek git status dan git diff --stat untuk melihat tahap yang sudah dikerjakan, jalankan npm run typecheck && npm test, lalu lanjutkan dari tahap pertama yang belum selesai. Batas dan aturan tetap sama.
```
