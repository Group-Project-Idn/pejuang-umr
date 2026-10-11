# Pejuang UMR: Jakarta Survival - Status Layar dan Prompt Gambar

Dokumen ini mencatat layar yang sudah dibuat, yang masih kurang, dan prompt gambar yang dipakai (dibuat dengan generator gambar, bukan Stitch). Gaya visual: ilustrasi komik bertema kantor/HRD (lihat 02_DESIGN.md).

## 1. Status layar

Scope MVP: Multiplayer dan pemain tamu saja (Solo, register, dan login ditunda).

| Layar | Status | Catatan |
|---|---|---|
| Home | Sudah ada | Tombol Singel, Ajang Flexing, dan ikon merah (Portal/Masuk) tetap tampil tetapi tidak bisa diklik. Mabar, Spill Cara Main, dan ikon pengaturan aktif |
| Portal Pejuang UMR (profil HRD) | Sudah ada, **ditunda** | Butuh akun |
| Form Masuk Kerja (login) | Sudah ada, **ditunda** | Butuh akun |
| Daftar Pejuang UMR (register) | Sudah ada, **ditunda** | Butuh akun |
| Pengaturan | Sudah ada, **perlu revisi** | Hapus bagian Akun dan "Aturan Mabar". Sisakan Musik, Efek suara, Notifikasi Ajakan |
| Lobby | Sudah ada, **perlu revisi** | Judul masih "Ruang Mabar / Ruang Rapat", masih ada "Player Identity Card", aturan Mabar tertulis dua baris, kolom kode terisi, tombol "Lihat Profil" perlu menjadi "Ubah nama" |
| Popup "Masuk sebagai tamu" | **Belum ada** | Nama dan pilihan avatar. Juga dipakai untuk "Ubah nama" |
| Room (ruang tunggu) | Sudah ada + 5 variasi | A host sendiri, B tampilan tamu, C belum siap, D hitung mundur, E menyambungkan ulang |
| Game Board (giliran sendiri) | Sudah ada + variasi | Giliran lawan dan kondisi stres tinggi |
| Detail Heksa | Sudah ada + variasi | Risiko tinggi dan Petak Emas |
| Reveal Realita (Zonk, Aman, Hoki) | **Belum ada** | Momen puncak: heksa dibalik |
| Ringkasan Ganti Bulan | **Belum ada** | Gaji, Biaya Hidup Wajib, bunga, perubahan status |
| Popup Event Tanggal | **Belum ada** | Serentak ke semua pemain, 15 detik |
| Layar Eliminasi | **Belum ada** | "Hari ini kamu perlu istirahat." |
| Hasil Akhir Multiplayer | **Belum ada** | Podium, rincian skor, Main Lagi, Bagikan |
| Ajakan (masuk, pilih target, hasil) | **Belum ada** | Boleh paling akhir |
| Jalan Buntu, Doom Spending, banner musim dan Petak Emas, Pause | **Belum ada** | Overlay kecil |
| Cara Main dan Error/Reconnect | **Belum ada** | Bisa belakangan |

Layar penuh MVP sekitar 8: Home, Lobby, Room, Game Board, Hasil Akhir Multiplayer, Pengaturan, Cara Main, Error/Reconnect (ditambah popup tamu dan ±20 overlay di Game Board).

## 2. Urutan alur

Home → Lobby (popup tamu pertama kali) → Room → hitung mundur → Game Board (dengan overlay) → Hasil Akhir Multiplayer → Main Lagi (Room) atau Kembali ke Lobby.

## 3. Catatan dari gambar yang sudah dibuat

- Hexa pada Game Board berupa **2D datar tampak atas** (flat-top), karakter sprite 2D. Tidak perlu Three.js.
- Hutang di Game Board ditampilkan sebagai bar. DESIGN.md menyarankan angka dengan badge. Putuskan satu cara (bar bisa dimaknai sebagai pemakaian limit Rp25jt).
- Di gambar Game Board hanya 2 heksa menyala di sekitar pion pemain (selain Petak Emas yang jauh), padahal aturan GDD adalah 3 dari 6 tetangga.
- Ikon pada chip "Kondangan Teman" kosong.
- "Kamus Petak" (legenda ikon) berguna, tetapi kategori Emas belum masuk daftar.
- Pion dibedakan lewat karakter dan warna alas. Bentuk pion yang berbeda (rancangan awal) belum dipakai.

## 4. Prompt gambar

Semua instruksi dalam bahasa Inggris, teks UI dalam bahasa Indonesia. Jalankan prompt utama dulu, lalu varian, lalu mobile. Cocokkan teks pada gambar dengan daftar "teks yang harus persis" di bagian 5.

### 4.1 Room, tampilan host (desktop)

```
Create a 16:9 web game UI screen, "Ruang Tunggu" (multiplayer waiting room) for the game "Pejuang UMR: Jakarta Survival". Same illustrated comic style as the previous lobby screen: a cluttered Jakarta office cubicle background (desks, paper stacks, coffee cup, sticky notes, ceiling lights), with a large yellow manila-folder card in the center holding all UI. Warm, slightly humorous, flat comic outlines, bold dark-brown strokes. Keep the layout clean and readable, with large clear text.

Layout (two columns inside the folder card):

TOP BAR: an orange button "Kembali" with a left arrow (top-left); a green rounded status chip with a check icon "Server Jakarta Pusat: Normal" (top-right).

LEFT COLUMN:
- Title "RUANG TUNGGU" and a subtitle "Menunggu peserta rapat".
- A red rubber stamp "CONFIDENTIAL" tilted slightly.
- A card "KODE ROOM" showing a big code "UMR-4821" with two buttons: "Salin kode" and "Bagikan link".
- A card "ATURAN MABAR" with the lines: "2-4 pemain | 24 langkah | ±30 menit" and "1 permainan = 12 bulan. Papan menyesuaikan jumlah pemain."
- A card "TIMER GILIRAN (diatur host)" with a two-option segmented control: "30 dtk - Cepat" (selected) and "60 dtk - Santai".

RIGHT COLUMN:
- Heading "PESERTA (2/4)".
- Four player slots as employee ID cards in a 2x2 grid:
  1. "Michael Ali Ramadhan", small badge "HOST", status "Siap" with a check icon, a cream circle-shaped pawn.
  2. "Raka Pratama", status "Siap" with a check icon, an ice-blue square-shaped pawn, and a small "..." menu button for the host (Keluarkan).
  3. Empty dashed slot "Menunggu pemain..." with a mint triangle-shaped pawn outline.
  4. Empty dashed slot "Menunggu pemain..." with a salmon diamond-shaped pawn outline.
  Each pawn has a different color AND a different shape.
- Big green button "MULAI" (enabled).
- Bottom row: outlined red button "Keluar", an outlined button "? Cara Main", and a small round emote (smiley) button.

Style notes: palette is yellow #F5C542, green #3FB871, coral #E0614A, navy #243040, cream and light blue accents. All text in Bahasa Indonesia and spelled EXACTLY as written above. No real brand logos. No extra text or gibberish.
```

### 4.2 Room, varian kondisi

```
Using the same "Ruang Tunggu" screen, create these variants. Change only what is listed.

A) Host waiting alone: only slot 1 (the host, "Michael Ali Ramadhan", badge "HOST") is filled; slots 2-4 are "Menunggu pemain...". The "MULAI" button is disabled (gray) with the helper text "Menunggu minimal 2 pemain".

B) Guest view: the player "Raka Pratama" sees the same room, but the timer card is read-only (lock icon, text "Diatur oleh host"), the main button is "SIAP" (green) instead of "MULAI", and there is no "Keluarkan" menu.

C) Players not ready: slot 2 shows status "Belum siap" with a clock icon; "MULAI" is disabled with the helper text "Menunggu pemain siap".

D) Countdown: a dark overlay with a huge "3" and the text "Papan sedang disiapkan..." on top of the room.

E) Reconnecting: a banner at the top "Menyambungkan ulang..." with a spinner; the player slots stay visible but slightly dimmed.
```

### 4.3 Room, versi mobile (portrait)

```
Create the mobile portrait version (9:19.5) of the same "Ruang Tunggu" screen, same illustrated style but without any browser window frame. Single column inside the yellow folder card: top row with "Kembali" and the server chip "Server: Normal"; title "RUANG TUNGGU"; code card "UMR-4821" with "Salin kode" and "Bagikan link"; the "ATURAN MABAR" card; the "TIMER GILIRAN" segmented control (30 dtk - Cepat selected / 60 dtk - Santai); the "PESERTA (2/4)" list as a vertical stack of 4 slots (same two filled players and two empty slots, each pawn with a different color and shape); a large green "MULAI" button; and below it "Keluar" and "Cara Main". Large touch targets, same exact Indonesian text.
```

### 4.4 Game Board, giliran sendiri (desktop)

```
Create a 16:9 web game UI screen, the main "Game Board" of the multiplayer game "Pejuang UMR: Jakarta Survival". Same illustrated comic style as the previous lobby and room screens: warm, flat comic outlines with bold dark-brown strokes, yellow manila-paper UI panels, sticky notes and paper clips as decoration. The board is a hexagonal board game laid out on a cluttered office desk seen from a slightly elevated angle (coffee cup, paper stacks, stapler, and sticky notes at the edges, soft warm desk-lamp light). The board fills the center of the screen. Keep text large and readable, and keep the UI uncluttered.

THE BOARD (center): about 40 visible hexagon tiles (a cropped part of a bigger board). Four pawns with different colors AND different shapes: a cream circle pawn (the player, "Michael"), an ice-blue square pawn with a small gold crown above it (rank 1, "Raka"), a mint triangle pawn ("Sinta"), and a salmon diamond pawn ("Dimas"). Hex states:
- Closed tiles: dim navy-gray with no icon (most of the board).
- Opened tiles (already stepped on, left behind the pawns as trails): lighter paper color with a small category icon (briefcase, speech bubble, heart, coin).
- Exactly 3 tiles next to the cream pawn glow bright yellow with a soft pulsing halo (these are the player's options). The cream pawn has 6 neighbors: 2 are opened trail tiles, 1 is a dim closed tile that does not glow, and 3 glow.
- One golden tile far from the player with a sparkle and a small label "Petak Emas".
- One dark gray cracked "dead" tile.
A small callout arrow pointing at the glowing tiles: "Klik heksa untuk lihat detail".

TOP BAR (center): a calendar plate "15 Mei" with "Langkah 10/24" and a small season icon (a cloud with sun) plus the label "Pancaroba". Next to it, a small chip "Kondangan Teman - 2 langkah lagi".

LEFT SIDEBAR: a yellow paper card "KARTU STATUS PRIBADI" with a small lock icon and the line "Hanya kamu yang melihat". Inside:
- "Kekayaan" with a coin icon and the amount "Rp8.200.000" and a yellow bar.
- "Hutang" with a minus icon and a small dark-red badge "Rp0".
- "Kesehatan" with a heart icon, a green bar, and "7/10".
- "Level Stress" with a lightning icon, a coral bar, and "4/10".

RIGHT SIDEBAR: a yellow paper card "PAPAN SKOR" with the sub-label "Skor Sementara" and four rows (pawn icon, name, score), ranked:
1. Raka, a crown icon, "Rp9.100.000"
2. Michael (highlighted as "Kamu"), "Rp8.200.000"
3. Sinta, "Rp6.400.000"
4. Dimas, "Rp3.900.000"
Below the list, a small note tag next to the crown: "Beban Peringkat 1: peluang Zonk +15%".
Under the scoreboard, a small card "Petak Emas" with the line "Hangus dalam 3 ronde".

BOTTOM BAR (center): a circular countdown timer ring with the number "24", the text "GILIRANMU" in bold and the helper line "Pilih satu heksa yang menyala". On the right of the bar: four round icon buttons: camera, smiley (emote), a card button "Kartu Ajakan" with a small badge "1", and a pause button.

Style notes: palette is yellow #F5C542, green #3FB871, coral #E0614A, navy #243040, cream and light blue accents. Never rely on color alone: status bars always have icons. All text in Bahasa Indonesia, spelled EXACTLY as written above. No real brand logos. No extra text or gibberish.
```

### 4.5 Game Board, varian kondisi

```
Using the same "Game Board" screen, create these variants. Change only what is listed.

A) Opponent's turn: no tiles glow around the cream pawn. The bottom bar shows "GILIRAN RAKA" with its timer ring, and the helper line "Menunggu giliran..." The left sidebar still shows my private status. The ice-blue square pawn with the crown has a small highlighted ring.

B) High stress state: Level Stress shows "9/10" with the coral bar full and shaking, a thin red pulsing vignette on the screen edges, and a small warning chip with a warning icon "Awas Doom Spending". Kesehatan shows "3/10".

C) Season variants (same layout): "Musim Hujan" with rain streaks and a cold blue-gray tint, the season icon is a rain cloud and the label "Musim Hujan"; "Musim Kemarau" with a warm amber tint and heat-haze shimmer, the label "Musim Kemarau".

D) Petak Emas nearby: the golden tile is two tiles away from the cream pawn with a gold light beam and the countdown chip "Hangus dalam 1 ronde".
```

### 4.6 Game Board, versi mobile (portrait)

```
Create the mobile portrait version (9:19.5) of the same "Game Board" screen, same illustrated style, no browser frame. The hexagon board on the desk fills most of the screen, with the same pawns, tiles, and 3 glowing tiles next to the cream pawn. The side panels collapse into a compact top HUD: a calendar chip "15 Mei | Langkah 10/24 | Pancaroba" on the first row, then a row with four compact status chips: coin "Rp8,2jt", minus badge "Rp0", heart "7/10", lightning "4/10". Two small buttons at the top corners: a scoreboard button with a crown icon (opens "PAPAN SKOR" as a bottom sheet) and a status button (opens "KARTU STATUS PRIBADI"). At the bottom: the circular timer ring "24", the text "GILIRANMU" and "Pilih satu heksa yang menyala", with round buttons for camera, emote, "Kartu Ajakan" (badge "1"), and pause. Large touch targets. Same exact Indonesian text.
```

### 4.7 Detail Heksa (desktop)

```
Create a 16:9 web game UI screen, the "Detail Heksa" state of the multiplayer game "Pejuang UMR: Jakarta Survival". It is the same Game Board scene as the previous screen (same illustrated comic style, hexagonal board on a cluttered office desk, same pawns, same left status card, same top calendar bar), but now the player has tapped one of the 3 glowing tiles next to the cream pawn. The board is slightly dimmed. The tapped tile has a bright selection ring and a thin dotted line connecting it to a detail panel on the right.

RIGHT SIDE PANEL (replaces the scoreboard, a tall yellow manila paper card with a paper clip), top to bottom:
- A small lock icon and the line "Hanya kamu yang bisa melihat ini".
- A selector with 3 small tabs showing the 3 glowing tiles: "1 Kerja" (selected), "2 Sosial", "3 Kesehatan", each with a tiny category icon (briefcase, speech bubble, heart).
- A category chip "Kerja" with a briefcase icon.
- A large title "Lembur Proyek".
- A section "RENCANA" with one effect chip: a coin icon and "Kekayaan +Rp5.000.000" in yellow.
- A risk meter titled "Risiko Sedang": 3 bars where 2 are filled, plus a warning-triangle icon (shape-based, not only color). A small tag below: "Musim Pancaroba: tidak berpengaruh pada Kerja".
- A section "REALITA" shown as a locked box with a question-mark icon and the text "Terungkap setelah kamu melangkah".
- Two buttons: a big green button "PILIH HEKSA INI" and an outlined button "Tutup".

BOTTOM BAR: the circular countdown timer ring "18" with "GILIRANMU" and the helper line "Pilih satu heksa yang menyala".

Keep the left status card (Kekayaan Rp8.200.000, Hutang Rp0, Kesehatan 7/10, Level Stress 4/10) and the calendar bar "15 Mei | Langkah 10/24 | Pancaroba". The scoreboard is hidden while this panel is open.

Style notes: palette is yellow #F5C542, green #3FB871, coral #E0614A, navy #243040, cream and light blue accents. Never rely on color alone. All text in Bahasa Indonesia, spelled EXACTLY as written above. No real brand logos. No extra text or gibberish.
```

### 4.8 Detail Heksa, varian

```
Using the same "Detail Heksa" screen, create these variants. Change only what is listed.

A) High-risk tile: the tab is "2 Sosial", title "Nongkrong", Rencana chips: "Kekayaan -Rp1.000.000" and "Level Stress -2". The risk meter is "Risiko Tinggi" (3 of 3 bars filled, a bigger warning icon). Add two small tags below it: "Beban Peringkat 1: risiko +15" with a crown icon, and "Musim Kemarau: Sosial rawan, risiko +10" with a sun icon.

B) Golden tile: the selected tile is the glowing golden hexagon. The panel has a gold border and a sparkle, the category chip "Emas", title "Beasiswa Penuh", Rencana chip "Kekayaan +Rp10.000.000". No risk meter. A note "Tidak ada Realita, langsung untung." and an alert "Hanya 1 pemain yang bisa mengambil. Hangus dalam 2 ronde." The button reads "AMBIL PETAK EMAS".

C) Waiting: the panel is closed, only the tile glows with a hint "Klik heksa untuk lihat detail" (this is the previous screen, for comparison).
```

### 4.9 Revisi Lobby

```
Revise the "Ruang Rapat" multiplayer lobby screen. Keep the office/HRD comic style and layout. Changes: (1) Use one title "Ruang Rapat" with the subtitle "Mabar 2-4 pemain". (2) Merge the two rule lines into one: "2-4 pemain | 24 langkah | ±30 menit" and add a line "1 permainan = 12 bulan. Timer giliran diatur host di Room." (3) Room code field must be empty with placeholder "Contoh: UMR-4821", uppercase input, plus a paste button. (4) Replace "Player Identity Card" with "Kartu Identitas Pemain", and replace the "Lihat Profil" button with "Ubah nama". (5) Make "Cara Main" a proper text button with a larger tap area. Also generate variants: wrong code error ("Kode room tidak ketemu."), room full, server problem (warning icon plus disabled buttons and "Coba lagi"), loading, and a "Lanjutkan permainan" resume card on top. Text must be in Bahasa Indonesia.
```

### 4.10 Popup "Masuk sebagai tamu"

Prompt untuk popup ini belum dibuat. Isi yang dibutuhkan: judul "Masuk sebagai tamu", kolom Nama (batas panjang), pilihan beberapa avatar, tombol utama, dan teks bahwa riwayat tidak tersimpan. Gunakan gaya map kuning yang sama.

## 5. Teks yang harus persis (cek hasil generator)

| Bagian | Teks |
|---|---|
| Room | RUANG TUNGGU, Menunggu peserta rapat, KODE ROOM, UMR-4821, Salin kode, Bagikan link, ATURAN MABAR, TIMER GILIRAN (diatur host), 30 dtk - Cepat, 60 dtk - Santai, PESERTA (2/4), HOST, Siap, Belum siap, Menunggu pemain..., MULAI, SIAP, Keluar, Cara Main, Keluarkan, Menunggu minimal 2 pemain, Menunggu pemain siap, Menyambungkan ulang..., Papan sedang disiapkan... |
| Game Board | 15 Mei, Langkah 10/24, Pancaroba, Kondangan Teman - 2 langkah lagi, KARTU STATUS PRIBADI, Hanya kamu yang melihat, Kekayaan, Hutang, Kesehatan, Level Stress, PAPAN SKOR, Skor Sementara, Beban Peringkat 1: peluang Zonk +15%, Petak Emas, Hangus dalam 3 ronde, GILIRANMU, Pilih satu heksa yang menyala, Klik heksa untuk lihat detail, Kartu Ajakan |
| Detail Heksa | Hanya kamu yang bisa melihat ini, Lembur Proyek, RENCANA, Kekayaan +Rp5.000.000, Risiko Sedang, REALITA, Terungkap setelah kamu melangkah, PILIH HEKSA INI, Tutup, AMBIL PETAK EMAS |
| Lobby | Ruang Rapat, Mabar 2-4 pemain, Kartu Identitas Pemain, Ubah nama, Contoh: UMR-4821, Kode room tidak ketemu., Lanjutkan permainan |

Catatan: nama pemain dan semua angka pada gambar hanyalah contoh. Nominal pada Multiplayer sudah memakai pengali ×2 (misalnya Lembur Proyek Rp5.000.000).
