# Panduan Migrasi Web ke GDD v1.12 dan Kontrak v0.3

Dibuat dari kode `apps/web` di `development` `93ce6e6`. Izin dari Nickzad sudah ada, tetapi tetap sepakati pembagian file sebelum mulai (bagian 4).

---

## 1. Seberapa besar pekerjaannya

Pekerjaan web terbagi dua, dan ukurannya sangat berbeda.

**A. Memindahkan web ke kontrak baru (syarat G7). Kecil: 1 prompt, sekitar 10 file.**
Web masih memakai field dan event lama yang sudah ditandai `@deprecated`. Selama web masih memakainya, G7 tidak bisa menghapusnya.

| Yang lama | Dipakai di | Pengganti |
|---|---|---|
| `room:pawn`, `PawnId`, `player.pawn`, `PAWNS`, `PAWN_DETAILS` | `waiting-room.tsx`, `lobby-client.tsx`, `GameCharacters.tsx`, `Scoreboard.tsx`, `game-v2/Pawn.tsx`, `data/game.ts` | `room:avatar`, `player.avatarId`, karakter dari `lib/avatars.ts` |
| `turn:timer`, `turnPaused` | `lobby-client.tsx`, `GameInterface.tsx`, `lib/game-view.ts`, `lib/room-session-view.ts` | Tidak ada. Timer tidak pernah dijeda; cukup dari `turnDeadline` |
| `deadHexes` | `GameBoard.tsx` | Tidak ada. Heksa Mati dihapus |
| `spectators`, `me.isSpectator` | `lib/room-session-view.ts` | Tidak ada. Penonton dihapus |
| op `inviteSincereDeclined` | `lib/game-view.ts` | Tidak ada |
| `OpenedHex.outcome` | `lib/game-view.ts` | `OpenedHex.reality` |

**B. Fitur v1.12 yang belum ada di web. Besar: sekitar 6 prompt, realistis 8-10.**
Server sudah siap untuk semua fitur di bawah, tetapi web belum punya tampilannya. Sebagian bahkan belum ada sejak sebelum v1.12.

| # | Fitur | Kondisi sekarang |
|---|---|---|
| W2 | Popup Ganti Bulan dengan slider Bayar Hutang, overlay Doom Spending, hasil Event Tanggal | Belum ada |
| W3 | Ajakan lengkap: kartu, pilih target di giliran sendiri, popup masuk 15 detik, hasil di Fase Pembalikan | Tombol Ajakan masih nonaktif; `invites.tsx` ada tetapi belum tersambung |
| W4 | Papan: label "Jalan", Rencana singkat di heksa menyala, klik heksa terbuka untuk detail, keterangan musim di HUD | Sebagian (Fase Pembalikan sudah dikerjakan Nickzad) |
| W5 | Layar Eliminasi, Hasil Akhir, Main Lagi (host pindah, `NOT_ENOUGH_PLAYERS`), kartu Refleksi | Belum ada sama sekali |
| W6 | Edit Profile di Lobby (nama dan karakter), pemberitahuan perangkat tanpa WebGL | Belum ada |

Catatan: layar baru di W2-W6 belum punya desain di 04_UI. Claude Code bisa membuat versi fungsional memakai komponen yang sudah ada (`BottomSheet`, `Button`, `Card`, token desain), lalu tampilan dipoles belakangan.

**Kesimpulan:** bagian A sebaiknya kamu kerjakan sekarang. Ukurannya kecil, membuka jalan untuk G7, dan tidak bentrok dengan G6 karena G6 tidak menyentuh web. Bagian B dibagi dengan Nickzad (bagian 4).

---

## 2. Langkah 0 - Worktree web (Kamu)

Pakai worktree terpisah supaya tidak tercampur dengan G6 yang sedang menunggu merge.

```bash
cd ~/Downloads/imron-hacktiv8-excercise/pejuang-umr
git checkout development && git pull
git worktree add ../pejuang-umr-web -b feat/web-v112-contract origin/development
cp apps/server/.env ../pejuang-umr-web/apps/server/.env
cd ../pejuang-umr-web && npm install && npm run typecheck && npm test
```

**Pagar** (kebalikan dari worktree v112: web boleh, engine, shared, dan server dikunci):
```bash
mkdir -p .claude && cat > .claude/settings.local.json <<'EOF'
{
  "permissions": {
    "deny": [
      "Edit(./packages/**)",
      "Write(./packages/**)",
      "Edit(./apps/server/**)",
      "Write(./apps/server/**)",
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
Buka Claude Code (New session) di jendela VS Code yang baru terbuka.

---

## 3. Prompt W1 - Memindahkan web ke kontrak v0.3

Mulai di **Plan mode**, lalu setujui ke Auto.

```
Tugas W1: pindahkan apps/web dari field dan event yang sudah @deprecated ke kontrak v0.3, supaya G7 bisa menghapusnya dari shared dan server.

Baca dulu: docs/RENCANA_Migrasi_v1_12.md (bagian 3), docs/API_CONTRACT.md (Bagian 3, 7, 11, 13), docs/GDD.md (4.1, 4.3, 9.3, 9.4), apps/web/AGENTS.md, dan apps/web/src/lib/avatars.ts.

Batas:
- Pastikan kamu di folder pejuang-umr-web dan branch feat/web-v112-contract (cek pwd dan git branch --show-current). Jika bukan, berhenti.
- Hanya mengubah apps/web. JANGAN mengubah packages atau apps/server.
- Perilaku yang terlihat pemain tidak berubah, kecuali yang disebut di bawah. Jangan menambah fitur baru (popup Ganti Bulan, Ajakan, Hasil Akhir, dan sejenisnya dikerjakan terpisah).
- Jalankan npm run typecheck && npm test dan npm run lint -w @pejuang/web sampai lulus. Di akhir, tulis ringkasan dan daftar sisa pemakaian field deprecated (harus kosong).

Pekerjaan:
1. Karakter menggantikan pion:
   - Ganti pemakaian room:pawn dengan room:avatar ({ requestId, avatarId }).
   - Ganti player.pawn, PawnId, PAWNS, dan PAWN_DETAILS dengan player.avatarId dan data karakter dari lib/avatars.ts (id, nama, gambar).
   - Di Room, pemilih pion menjadi pemilih karakter: 4 karakter, yang dipakai pemain lain nonaktif. Tangani error AVATAR_TAKEN dengan pesan "Karakter ini sudah dipilih pemain lain.".
   - Server selalu memberi karakter saat masuk, jadi syarat "pilih pion sebelum siap" dihapus.
   - Karakter dipakai sebagai pion di papan (GameCharacters) dan di Papan Skor.
   - Hapus game-v2/Pawn.tsx dan data pion lama jika tidak dipakai lagi.
2. Timer tanpa jeda: hapus listener turn:timer, tipe TurnTimer, fungsi applyTurnTimer, applySessionTurnTimer, applyRealtimeTurnTimer, dan semua pemakaian turnPaused. Sisa waktu dihitung dari turnDeadline saja.
3. Heksa Mati: hapus pemakaian deadHexes di GameBoard.
4. Penonton: hapus pemakaian spectators dan me.isSpectator di lib/room-session-view.ts.
5. Op game:patch inviteSincereDeclined: hapus penanganannya.
6. OpenedHex: baca hasil dari reality (outcome, text) dan jangan lagi menulis atau membaca field outcome yang deprecated.
7. Perbarui tes web yang terdampak, dan tambahkan tes untuk pemilih karakter (karakter terpakai nonaktif, AVATAR_TAKEN) serta perhitungan timer dari deadline.
8. Akhiri dengan pencarian di apps/web/src untuk: room:pawn, PawnId, .pawn, PAWN_DETAILS, turn:timer, turnPaused, deadHexes, spectators, isSpectator, inviteSincereDeclined, spectate:enter, modifier. Laporkan hasilnya; idealnya kosong.

Selesai jika npm run typecheck && npm test dan lint lulus.
```

### Cek akhir, commit, PR (Kamu)

```bash
pwd
npm run typecheck && npm test
git --no-pager diff HEAD --stat
git status --short | grep '^??'
```
Semua file harus ada di `apps/web`. Lalu:
```bash
git add -A
git commit -m "refactor(web): move to contract v0.3 characters and drop deprecated fields"
git fetch origin
git --no-pager log --oneline HEAD..origin/development
git push -u origin feat/web-v112-contract
```
Jika `log` memuat commit baru yang menyentuh `apps/web`, jalankan `git merge origin/development` dan tes dulu sebelum push. Buka PR ke `development`, dan minta Nickzad me-review karena ini area kerjanya.

**Coba jalankan sebelum PR:** jalankan server dan web di dua terminal (`npm run dev:server` dan `npm run dev:web`), lalu buka dua jendela browser. Cek:
- pilih karakter di Room;
- karakter yang sudah dipakai pemain lain nonaktif;
- karakter muncul di papan dan di Papan Skor;
- timer giliran berjalan.

Setelah W1 di-merge, G7 (pembersihan kontrak di shared dan server) bisa langsung dijalankan.

---

## 4. Pembagian kerja bagian B dengan Nickzad

W2-W6 menyentuh file yang sama dengan pekerjaan Nickzad, terutama `lobby-client.tsx`, `GameInterface.tsx`, dan `lib/*-view.ts`. Sepakati dulu sebelum mulai. Usulan pembagian berdasarkan area, supaya bentrok minimal:

| Bagian | Usulan pemegang | Alasan |
|---|---|---|
| W1 (kontrak) | Kamu | Kecil, membuka G7, dan kamu paling paham kontraknya |
| W2 (Ganti Bulan, Doom) dan W5 (Eliminasi, Hasil Akhir, Refleksi) | Kamu | Layar baru yang sebagian besar berupa file baru, dan erat dengan logika server yang kamu kerjakan di G3-G6 |
| W3 (Ajakan) dan W4 (papan) | Nickzad | Ia sudah mengerjakan Fase Pembalikan dan Ajakan di web |
| W6 (Edit Profile, tanpa WebGL) | Siapa pun yang selesai duluan | Kecil dan terpisah |

Aturan kerja bersama:
1. Satu bagian = satu branch dan satu PR, dan saling kabari bagian mana yang sedang dikerjakan.
2. Sebelum push, selalu `git fetch origin` lalu `git --no-pager log --oneline HEAD..origin/development`, dan merge jika ada yang baru.
3. File bersama (`lobby-client.tsx`, `lib/game-view.ts`, `lib/room-session-view.ts`) diubah seperlunya saja. Logika baru dimasukkan ke file baru (misalnya `lib/month-view.ts`, `components/game/MonthPopup.tsx`), lalu cukup disambungkan dari file bersama.

Prompt W2-W6 saya tulis setelah W1 di-merge dan pembagian dengan Nickzad disepakati.
