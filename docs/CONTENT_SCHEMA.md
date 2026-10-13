# Skema Data Konten (CONTENT_SCHEMA.md)

Sumber aturan: GDD v1.14 (perubahan v1.14 ditandai **[v1.14]**; bagian v1.12 di bawah tetap berlaku bila tidak diganti).

## Tujuan

`packages/engine/src/data/schema.ts` mendefinisikan bentuk Zod untuk semua data konten
permainan (petak, Realita, Petak Emas, Event Tanggal, Zonk Musim, Ajakan). Data aktual
diisi di file data terpisah pada `packages/engine/src/data/`; skema ini adalah kontraknya.
Semua tipe diekspor dengan `z.infer`. Validasi memakai Zod 4 dari `"zod"`; `Effect`
memakai `EffectSchema` dari `@pejuang/shared`.

## Entitas

| Entitas                   | Ringkasan bentuk                                                                                                                                                                                                                                                           |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RealityVariant`          | `id`, `outcome` (`zonk`/`safe`/`lucky`), `text` (Indonesia), `effects` (maks 3)                                                                                                                                                                                            |
| `TileDefinition`          | `id`, `category` (`work`/`social`/`health`/`finance` — tanpa `gold`), `title`, `plan` (maks 3 efek), `baseZonkPct` (integer 0-80). **[v1.14]** Tanpa `realities`: Realita diambil dari `RealityPool` kategori. Katalog v1.14: 117 petak (29 `work`, 37 `social`, 29 `health`, 22 `finance`) dari `docs/katalog_master_sisi_rencana.md` dengan perubahan `docs/revisi_kesulitan_katalog.md` |
| `GoldTileDefinition`      | `id`, `title`, `plan` (maks 3 efek). **[v1.14]** 8 petak di katalog; Kekayaan di `plan` maksimal Rp10.000.000 (Bonus Kinerja 2x Gaji: Rp10.000.000); Level Stress -3 hanya boleh di sini |
| `RealityPool` **[v1.14]** | `key` (`work`/`social`/`health`/`finance`/`finance-debt`), `variants` (`RealityVariant[]`, wajib ada minimal satu `zonk`, `safe`, dan `lucky`). Jumlah varian per jenis ditetapkan saat konten ditulis |
| `CalendarEventDefinition` | `id`, `name`, `dateLabel`, `multiplayerStep`, `choices.join`/`choices.skip` (wajib) dan `choices.joinPaylater?` (opsional, mis. Harbolnas). Tiap choice: `effects`, plus `chance?` `{ pct (0-100), effects, text }` untuk hasil peluang (mis. 25% menang lomba)            |
| `SeasonZonkDefinition`    | `id`, `season` (`rainy`/`dry`/`transition`), `focus`, `title`, `effects` — 3 varian per musim. Fokus v1.12: Hujan "Banjir dan Kehujanan", Kemarau "Panas dan Polusi", Pancaroba "Sakit"                                                                                    |
| `InvitePlanDefinition`    | `id` (`hangout`/`morningRun`/`jointProject`/`staycation`), `title`, `effects`. Motif (`sincere`/`commission`) bukan konten, melainkan aturan engine (GDD 4.8)                                                                                                              |

Konstanta: `SEASON_BY_MONTH` memetakan bulan 1-12 ke musim (GDD 3.4: Hujan = Des/Jan/Feb,
Kemarau = Jun-Agu, Pancaroba = Mar-Mei & Sep-Nov). `VULNERABLE_CATEGORIES` berisi kategori
rawan per musim (GDD 3.4: Hujan = Kerja; Kemarau = Keuangan & Sosial; Pancaroba = Kesehatan).

## Aturan skala nilai

**[v1.14]** `TileDefinitionSchema` tidak lagi menegakkan komposisi enam Realita per petak (GDD 5.2 v1.14). Gantinya:

- `RealityPoolSchema` menolak tumpukan yang tidak punya varian untuk salah satu jenis hasil (`zonk`, `safe`, `lucky`).
- Tes data katalog menegakkan aturan harga Level Stress (GDD 5.1): Level Stress -2 hanya untuk biaya minimal Rp400.000 dan Zonk dasar minimal 20%; petak berbiaya Rp250.000 ke bawah maksimal -1; Level Stress -3 hanya di Petak Emas; tidak ada efek Kekayaan Rp0; Kesehatan +2 tidak boleh berbiaya Rp150.000 ke bawah kecuali ada harga Level Stress.
- Pemilihan pool adalah properti petak: petak `finance` yang `plan`-nya punya efek Hutang lebih dari 0 memakai pool `finance-debt`, petak lain memakai pool kategorinya. Kondisi Hutang pemain tidak memengaruhi pemilihan pool (GDD 4.4, 5.2).
- Tes jumlah: 117 petak biasa dengan sebaran 29/37/29/22, 8 Petak Emas, semua `id` unik.

- **Semua konten disimpan persis seperti tabel GDD dan dipakai apa adanya (1×)** di semua mode
  (GDD 1.3 v1.12). Engine tidak lagi mengali ×2 dan tidak lagi membatasi efek status ±3.
- Skala nilai tidak ditulis per field (tidak ada `valueScale`).

## Perubahan data untuk GDD v1.12

| Data          | Perubahan                                                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Petak         | Hapus petak Bayar Hutang beserta 6 Realitanya. Tambah petak Jalan-jalan (`social`, Zonk dasar 20%) beserta 6 Realita (GDD 5.1, 5.2) |
| Zonk Musim    | Ganti 6 varian Hujan dan Kemarau sesuai GDD 3.4 v1.12. Varian Pancaroba tetap                                                       |
| Event Tanggal | Kondangan Teman: Kekayaan -Rp250.000 saat Datang                                                                                    |
| Ajakan        | Nilai baru 1× (GDD 4.8 v1.12)                                                                                                       |
| Petak Emas    | Nilai tetap (angka playtest) — diganti v1.14, lihat tabel di bawah                                                                  |

## Perubahan data untuk GDD v1.14

| Data                | Perubahan                                                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Petak               | Ganti 12 petak biasa dengan 117 petak (Kerja 29, Sosial 37, Kesehatan 29, Keuangan 22), memakai perubahan di `docs/revisi_kesulitan_katalog.md`             |
| Realita             | Hapus `realities` per petak. Tambah 5 `RealityPool`: `work`, `social`, `health`, `finance`, `finance-debt` (petak Keuangan yang menambah Hutang)     |
| Petak Emas          | Ganti 2 petak lama dengan 8 petak dari katalog master. Tiap game memakai 5 dari 8 tanpa pengulangan. Bonus Kinerja 2x Gaji: Rp11.460.000 menjadi Rp10.000.000 |
| Jadwal Petak Emas   | Langkah 5, 9, 13, 17, 21 (5 kali). Langkah 1 dihapus                                                                                                   |
| Isi papan           | Urutan acak seeded dari 117 petak. Tiap heksa mengambil petak berikutnya; jika heksa lebih banyak dari petak, lanjut dari awal urutan yang sama. Papan 4 pemain butuh 123 petak, 3 pemain 124, 2 pemain 125 |

## Aturan id

- `id` petak, Realita, Petak Emas, Event Tanggal, dan Zonk Musim: **kebab-case Inggris**
  (regex `^[a-z0-9]+(-[a-z0-9]+)*$`), contoh: `morning-exercise` (petak), `dry-pam-water-outage` (Zonk Musim), `lebaran-thr` (Event Tanggal).
- `id` Ajakan harus persis satu dari enum `hangout`/`morningRun`/`jointProject`/`staycation`
  (camelCase, mengikuti kontrak `@pejuang/shared`).
- `id` unik dalam satu kategori entitas; teks yang tampil ke pemain (`title`, `name`, `text`,
  `focus`, `dateLabel`) ditulis dalam Bahasa Indonesia.
