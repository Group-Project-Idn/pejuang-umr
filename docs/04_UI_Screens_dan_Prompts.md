# Pejuang UMR: Jakarta Survival - Status Layar dan Prompt Gambar

Dokumen ini mencatat layar yang sudah dibuat, yang masih kurang, dan prompt gambar yang dipakai (dibuat dengan generator gambar, bukan Stitch). Gaya visual: ilustrasi komik bertema kantor/HRD (lihat 02_DESIGN.md). Diselaraskan dengan GDD v1.12: prompt 4.1-4.10 sudah diperbarui, sehingga gambar lama untuk Room, Game Board, Detail Heksa, dan Lobby perlu dibuat ulang.

## 1. Status layar

Scope MVP: Multiplayer dan pemain tamu saja (Solo, register, dan login ditunda).

| Layar                                                                                           | Status                                  | Catatan                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home                                                                                            | Sudah ada                               | Tombol Singel, Ajang Flexing, dan ikon merah (Portal/Masuk) tetap tampil tetapi tidak bisa diklik. Mabar, Spill Cara Main, dan ikon pengaturan aktif                              |
| Portal Pejuang UMR (profil HRD)                                                                 | Sudah ada, **ditunda**                  | Butuh akun                                                                                                                                                                        |
| Form Masuk Kerja (login)                                                                        | Sudah ada, **ditunda**                  | Butuh akun                                                                                                                                                                        |
| Daftar Pejuang UMR (register)                                                                   | Sudah ada, **ditunda**                  | Butuh akun                                                                                                                                                                        |
| Pengaturan                                                                                      | Sudah ada, **perlu revisi**             | Hapus bagian Akun dan "Aturan Mabar". Sisakan Musik, Efek suara, Notifikasi Ajakan                                                                                                |
| Lobby                                                                                           | Sudah ada, **perlu revisi**             | Judul masih "Ruang Mabar / Ruang Rapat", masih ada "Player Identity Card", aturan Mabar tertulis dua baris, kolom kode terisi, tombol "Lihat Profil" perlu menjadi "Edit Profile" |
| Popup "Masuk sebagai tamu"                                                                      | **Belum ada**                           | Nama dan pilihan avatar (karakter yang juga menjadi pion). Juga dipakai untuk "Edit Profile"                                                                                      |
| Room (ruang tunggu)                                                                             | Sudah ada + 5 variasi, **perlu revisi** | A host sendiri, B tampilan tamu, C belum siap, D hitung mundur, E menyambungkan ulang. Revisi v1.12: pion karakter, timer 15/30/60                                                |
| Game Board (giliran sendiri)                                                                    | Sudah ada + variasi, **perlu revisi**   | Revisi v1.12: tanpa Heksa Mati dan pause, Rencana singkat di heksa menyala, skor 0-100, label "Jalan", pion karakter                                                              |
| Popup Detail Heksa                                                                              | Sudah ada + variasi, **perlu revisi**   | Revisi v1.12: tanpa tab, klik heksa lain mengganti isi, nilai 1×, Realita "Terungkap di akhir ronde"                                                                              |
| Fase Pembalikan (Zonk, Aman, Hoki)                                                              | **Belum ada**                           | Momen puncak di akhir ronde: heksa semua pemain dibalik satu per satu, lalu hasil Ajakan                                                                                          |
| Popup Ganti Bulan                                                                               | **Belum ada**                           | Gaji, Biaya Hidup Wajib, bunga, Kekayaan baru, dan slider Bayar Hutang (15 detik) dalam satu popup                                                                                |
| Popup Event Tanggal                                                                             | **Belum ada**                           | Serentak ke semua pemain, 15 detik                                                                                                                                                |
| Layar Eliminasi                                                                                 | **Belum ada**                           | "Hari ini kamu perlu istirahat.", ringkasan pribadi, Refleksi AI, tombol Kembali ke Lobby. Tanpa mode penonton                                                                    |
| Hasil Akhir Multiplayer                                                                         | **Belum ada**                           | Podium, rincian skor (Harta Bersih dan tiga poin), Refleksi AI, Main Lagi, Bagikan                                                                                                |
| Ajakan (pilih target, masuk, hasil)                                                             | **Belum ada**                           | Pilih target hanya di giliran sendiri sebelum memilih heksa. Popup masuk 15 detik. Hasil tampil di Fase Pembalikan                                                                |
| Jalan Buntu, Doom Spending, banner musim (dengan keterangan petak rawan), notifikasi Petak Emas | **Belum ada**                           | Overlay kecil. Pause dihapus (GDD v1.12)                                                                                                                                          |
| Cara Main dan Error/Reconnect                                                                   | **Belum ada**                           | Bisa belakangan                                                                                                                                                                   |
| Pemberitahuan perangkat tidak didukung (tanpa WebGL)                                            | **Belum ada**                           | Layar sederhana, tanpa papan cadangan (GDD v1.12)                                                                                                                                 |

Layar penuh MVP sekitar 8: Home, Lobby, Room, Game Board, Hasil Akhir Multiplayer, Pengaturan, Cara Main, Error/Reconnect (ditambah popup tamu dan ±20 overlay di Game Board).

## 2. Urutan alur

Home → Lobby (popup tamu pertama kali) → Room → hitung mundur → Game Board (dengan overlay) → Hasil Akhir Multiplayer → Main Lagi (Room) atau Kembali ke Lobby. Pemain yang tereliminasi: Layar Eliminasi → Kembali ke Lobby.

## 3. Catatan dari gambar yang sudah dibuat

- Hexa pada Game Board kini dirender **3D** dengan Three.js (GDD v1.10). Gambar desain yang sudah ada (2D datar, flat-top) tetap dipakai sebagai acuan warna, HUD, dan teks, bukan sudut kamera.
- Hutang di Game Board ditampilkan sebagai bar. DESIGN.md menyarankan angka dengan badge. Putuskan satu cara (bar bisa dimaknai sebagai pemakaian limit Rp25jt).
- Di gambar Game Board hanya 2 heksa menyala di sekitar pion pemain (selain Petak Emas yang jauh), padahal aturan GDD adalah 3 dari 6 tetangga.
- Gambar lama masih memuat Heksa Mati, tombol pause, skor Rupiah, dan tab 1-3 di Detail Heksa. Semuanya tidak berlaku lagi di GDD v1.12.
- Ikon pada chip "Kondangan Teman" kosong.
- "Kamus Petak" (legenda ikon) berguna, tetapi kategori Emas belum masuk daftar.
- Pion adalah karakter (avatar) pilihan pemain, unik per room, dan juga tampil di Papan Skor (GDD v1.12). Pasangan warna-bentuk pion tidak dipakai lagi.

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
- A card "ATURAN MABAR" with the lines: "2-4 pemain | 24 langkah | ±30 menit" and "1 permainan = 12 bulan."
- A card "TIMER GILIRAN (diatur host)" with a three-option segmented control: "15 dtk - Kilat", "30 dtk - Cepat" (selected), and "60 dtk - Santai".

RIGHT COLUMN:
- Heading "PESERTA (2/4)".
- Four player slots as employee ID cards in a 2x2 grid:
  1. "Michael Ali Ramadhan", small badge "HOST", status "Siap" with a check icon, and his illustrated office-worker character (character A) standing on a small round base.
  2. "Raka Pratama", status "Siap" with a check icon, a different illustrated character (character B), and a small "..." menu button for the host (Keluarkan).
  3. Empty dashed slot "Menunggu pemain..." with an empty dashed character silhouette.
  4. Empty dashed slot "Menunggu pemain..." with an empty dashed character silhouette.
  Each player's character is visually distinct (silhouette, outfit, hair), and this same character is used as the pawn on the board.
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
Create the mobile portrait version (9:19.5) of the same "Ruang Tunggu" screen, same illustrated style but without any browser window frame. Single column inside the yellow folder card: top row with "Kembali" and the server chip "Server: Normal"; title "RUANG TUNGGU"; code card "UMR-4821" with "Salin kode" and "Bagikan link"; the "ATURAN MABAR" card; the "TIMER GILIRAN" segmented control (15 dtk / 30 dtk - Cepat selected / 60 dtk - Santai); the "PESERTA (2/4)" list as a vertical stack of 4 slots (same two filled players with their distinct characters, and two empty slots with dashed silhouettes); a large green "MULAI" button; and below it "Keluar" and "Cara Main". Large touch targets, same exact Indonesian text.
```

### 4.4 Game Board, giliran sendiri (desktop)

```
Create a 16:9 web game UI screen, the main "Game Board" of the multiplayer game "Pejuang UMR: Jakarta Survival". Same illustrated comic style as the previous lobby and room screens: warm, flat comic outlines with bold dark-brown strokes, yellow manila-paper UI panels, sticky notes and paper clips as decoration. The board is a hexagonal board game laid out on a cluttered office desk seen from a slightly elevated angle (coffee cup, paper stacks, stapler, and sticky notes at the edges, soft warm desk-lamp light). The board fills the center of the screen. Keep text large and readable, and keep the UI uncluttered.

THE BOARD (center): about 40 visible hexagon tiles (a cropped part of a bigger board). Four pawns, each a distinct small illustrated office-worker character standing on a round base: the player "Michael", "Raka" with a small gold crown above him (rank 1), "Sinta", and "Dimas". Hex states:
- Closed tiles: dark navy with no icon (most of the board).
- Opened tiles (already stepped on, left behind the pawns as trails): lighter paper color with a small category icon (briefcase, speech bubble, heart, coin).
- Exactly 3 tiles next to Michael's pawn glow bright yellow with a soft pulsing halo (these are the player's options). Each glowing tile shows a short label on its surface: "Lembur Proyek", "Nongkrong", and "Beli Vitamin". Michael's pawn has 6 neighbors: 2 are opened trail tiles, 1 is a dark closed tile that does not glow, and 3 glow.
- One golden tile far from the player with a sparkle and a small label "Petak Emas".
A small callout arrow pointing at the glowing tiles: "Klik heksa untuk lihat detail".

TOP BAR (center): a calendar plate "15 Mei" with "Langkah 10/24" and a small season icon (a cloud with sun) plus the label "Pancaroba". Next to it, a small chip "Kondangan Teman - 2 langkah lagi".

LEFT SIDEBAR: a yellow paper card "KARTU STATUS PRIBADI" with a small lock icon and the line "Hanya kamu yang melihat". Inside:
- "Kekayaan" with a coin icon and the amount "Rp8.200.000" and a yellow bar.
- "Hutang" with a minus icon and a small dark-red badge "Rp0".
- "Kesehatan" with a heart icon, a green bar, and "7/10".
- "Level Stress" with a lightning icon, a coral bar, and "4/10".

RIGHT SIDEBAR: a yellow paper card "PAPAN SKOR" with the sub-label "Skor Sementara" and four rows (small character portrait, name, score out of 100), ranked:
1. Raka, a crown icon, "86"
2. Michael (highlighted as "Kamu"), with a small green tag "Jalan", "82"
3. Sinta, "74"
4. Dimas, "61"
Below the list, a small note tag next to the crown: "Beban Peringkat 1: peluang Zonk +15%".
Under the scoreboard, a small card "Petak Emas" with the line "Hilang dalam 3 ronde".

BOTTOM BAR (center): a circular countdown timer ring with the number "24", the text "GILIRANMU" in bold and the helper line "Pilih satu heksa yang menyala". On the right of the bar: three round icon buttons: camera, smiley (emote), and a card button "Kartu Ajakan" with a small badge "1". No pause button.

Style notes: palette is yellow #F5C542, green #3FB871, coral #E0614A, navy #243040, cream and light blue accents. Never rely on color alone: status bars always have icons. All text in Bahasa Indonesia, spelled EXACTLY as written above. No real brand logos. No extra text or gibberish.
```

### 4.5 Game Board, varian kondisi

```
Using the same "Game Board" screen, create these variants. Change only what is listed.

A) Opponent's turn: no tiles glow around Michael's pawn. The bottom bar shows "GILIRAN RAKA" with its timer ring, and the helper line "Menunggu giliran..." The left sidebar still shows my private status. Raka's character pawn with the crown has a small highlighted ring, and the "Jalan" tag moves to Raka's row in the scoreboard.

B) High stress state: Level Stress shows "9/10" with the coral bar full and shaking, a thin red pulsing vignette on the screen edges, and a small warning chip with a warning icon "Awas Doom Spending". Kesehatan shows "3/10".

C) Season variants (same layout): "Musim Hujan" with rain streaks and a cold blue-gray tint, the season icon is a rain cloud and the label "Musim Hujan"; "Musim Kemarau" with a warm amber tint and heat-haze shimmer, the label "Musim Kemarau".

D) Petak Emas nearby: the golden tile is two tiles away from Michael's pawn with a gold light beam and the countdown chip "Hilang dalam 1 ronde".
```

### 4.6 Game Board, versi mobile (portrait)

```
Create the mobile portrait version (9:19.5) of the same "Game Board" screen, same illustrated style, no browser frame. The hexagon board on the desk fills most of the screen, with the same character pawns, tiles, and 3 glowing tiles (with short labels) next to Michael's pawn. The side panels collapse into a compact top HUD: a calendar chip "15 Mei | Langkah 10/24 | Pancaroba" on the first row, then a row with four compact status chips: coin "Rp8,2jt", minus badge "Rp0", heart "7/10", lightning "4/10". Two small buttons at the top corners: a scoreboard button with a crown icon (opens "PAPAN SKOR" as a bottom sheet) and a status button (opens "KARTU STATUS PRIBADI"). At the bottom: the circular timer ring "24", the text "GILIRANMU" and "Pilih satu heksa yang menyala", with round buttons for camera, emote, and "Kartu Ajakan" (badge "1"). No pause button. Large touch targets. Same exact Indonesian text.
```

### 4.7 Detail Heksa (desktop)

```
Create a 16:9 web game UI screen, the "Detail Heksa" state of the multiplayer game "Pejuang UMR: Jakarta Survival". It is the same Game Board scene as the previous screen (same illustrated comic style, hexagonal board on a cluttered office desk, same pawns, same left status card, same top calendar bar), but now the player has clicked one of the 3 glowing tiles next to Michael's pawn. The board is slightly dimmed. The clicked tile has a bright selection ring and a thin dotted line connecting it to a detail popup on the right.

RIGHT SIDE POPUP (replaces the scoreboard, a tall yellow manila paper card with a paper clip), top to bottom:
- A small lock icon and the line "Hanya kamu yang bisa melihat ini".
- A small hint line: "Klik heksa menyala lain untuk ganti pilihan".
- A category chip "Kerja" with a briefcase icon.
- A large title "Lembur Proyek".
- A section "RENCANA" with one effect chip: a coin icon and "Kekayaan +Rp2.500.000" in yellow.
- A risk meter titled "Risiko Sedang": 3 bars where 2 are filled, plus a warning-triangle icon (shape-based, not only color). A small tag below: "Musim Pancaroba: tidak berpengaruh pada Kerja".
- A section "REALITA" shown as a locked box with a question-mark icon and the text "Terungkap di akhir ronde".
- Two buttons: a big green button "PILIH HEKSA INI" and an outlined button "Tutup".

BOTTOM BAR: the circular countdown timer ring "18" with "GILIRANMU" and the helper line "Pilih satu heksa yang menyala".

Keep the left status card (Kekayaan Rp8.200.000, Hutang Rp0, Kesehatan 7/10, Level Stress 4/10) and the calendar bar "15 Mei | Langkah 10/24 | Pancaroba". The scoreboard is hidden while this panel is open.

Style notes: palette is yellow #F5C542, green #3FB871, coral #E0614A, navy #243040, cream and light blue accents. Never rely on color alone. All text in Bahasa Indonesia, spelled EXACTLY as written above. No real brand logos. No extra text or gibberish.
```

### 4.8 Detail Heksa, varian

```
Using the same "Detail Heksa" screen, create these variants. Change only what is listed.

A) High-risk tile: the clicked tile is a Sosial tile, category chip "Sosial", title "Nongkrong", Rencana chips: "Kekayaan -Rp500.000" and "Level Stress -2". The risk meter is "Risiko Tinggi" (3 of 3 bars filled, a bigger warning icon). Add two small tags below it: "Beban Peringkat 1: risiko +15" with a crown icon, and "Musim Kemarau: Sosial rawan, risiko +10" with a sun icon.

B) Golden tile: the selected tile is the glowing golden hexagon. The panel has a gold border and a sparkle, the category chip "Emas", title "Beasiswa Penuh", Rencana chip "Kekayaan +Rp7.500.000". No risk meter. A note "Tidak ada Realita, langsung untung." and an alert "Hanya 1 pemain yang bisa mengambil. Hilang dalam 2 ronde." The button reads "AMBIL PETAK EMAS".

C) Waiting: the popup is closed, only the tiles glow with a hint "Klik heksa untuk lihat detail" (this is the previous screen, for comparison).
```

### 4.9 Revisi Lobby

```
Revise the "Ruang Rapat" multiplayer lobby screen. Keep the office/HRD comic style and layout. Changes: (1) Use one title "Ruang Rapat" with the subtitle "Mabar 2-4 pemain". (2) Merge the two rule lines into one: "2-4 pemain | 24 langkah | ±30 menit" and add a line "1 permainan = 12 bulan. Timer giliran diatur host di Room." (3) Room code field must be empty with placeholder "Contoh: UMR-4821", uppercase input, plus a paste button. (4) Replace "Player Identity Card" with "Kartu Identitas Pemain", and replace the "Lihat Profil" button with "Edit Profile". (5) Make "Cara Main" a proper text button with a larger tap area. Also generate variants: wrong code error ("Kode room tidak ketemu."), room full, server problem (warning icon plus disabled buttons and "Coba lagi"), loading, and a "Lanjutkan permainan" resume card on top. Text must be in Bahasa Indonesia.
```

### 4.10 Popup "Masuk sebagai tamu"

Prompt untuk popup ini belum dibuat. Isi yang dibutuhkan: judul "Masuk sebagai tamu" (mode kedua: "Edit Profile"), kolom Nama (batas panjang), pilihan karakter (avatar yang juga menjadi pion), tombol utama, dan teks bahwa riwayat tidak tersimpan. Gunakan gaya map kuning yang sama.

### 4.11 Layar baru GDD v1.12

Prompt belum dibuat untuk: Popup Ganti Bulan (rincian dan slider Bayar Hutang), Fase Pembalikan, Layar Eliminasi dengan Refleksi AI, Hasil Akhir dengan Refleksi AI, dan pemberitahuan perangkat tidak didukung.

## 5. Teks yang harus persis (cek hasil generator)

| Bagian             | Teks                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Room               | RUANG TUNGGU, Menunggu peserta rapat, KODE ROOM, UMR-4821, Salin kode, Bagikan link, ATURAN MABAR, 1 permainan = 12 bulan., TIMER GILIRAN (diatur host), 15 dtk - Kilat, 30 dtk - Cepat, 60 dtk - Santai, PESERTA (2/4), HOST, Siap, Belum siap, Menunggu pemain..., MULAI, SIAP, Keluar, Cara Main, Keluarkan, Menunggu minimal 2 pemain, Menunggu pemain siap, Menyambungkan ulang..., Papan sedang disiapkan... |
| Game Board         | 15 Mei, Langkah 10/24, Pancaroba, Kondangan Teman - 2 langkah lagi, KARTU STATUS PRIBADI, Hanya kamu yang melihat, Kekayaan, Hutang, Kesehatan, Level Stress, PAPAN SKOR, Skor Sementara, Beban Peringkat 1: peluang Zonk +15%, Petak Emas, Hilang dalam 3 ronde, Jalan, Lembur Proyek, Nongkrong, Beli Vitamin, GILIRANMU, Pilih satu heksa yang menyala, Klik heksa untuk lihat detail, Kartu Ajakan     |
| Popup Detail Heksa | Hanya kamu yang bisa melihat ini, Klik heksa menyala lain untuk ganti pilihan, Lembur Proyek, RENCANA, Kekayaan +Rp2.500.000, Risiko Sedang, REALITA, Terungkap di akhir ronde, PILIH HEKSA INI, Tutup, AMBIL PETAK EMAS, Hilang dalam 2 ronde                                                                                                                                                             |
| Lobby              | Ruang Rapat, Mabar 2-4 pemain, Kartu Identitas Pemain, Edit Profile, Contoh: UMR-4821, Kode room tidak ketemu., Lanjutkan permainan                                                                                                                                                                                                                                                                        |

Catatan: nama pemain dan semua angka pada gambar hanyalah contoh. Sejak GDD v1.12 semua nominal 1× (misalnya Lembur Proyek Rp2.500.000) dan skor berupa angka 0-100.
