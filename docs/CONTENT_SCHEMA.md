# Skema Data Konten (CONTENT_SCHEMA.md)

Sumber aturan: GDD v1.12.

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
| `TileDefinition`          | `id`, `category` (`work`/`social`/`health`/`finance` — tanpa `gold`), `title`, `plan` (maks 3 efek), `baseZonkPct` (integer 0-80), `realities` (tepat 6 varian). Katalog v1.12: 3 `work`, 4 `social`, 3 `health`, 2 `finance` (Bayar Hutang dihapus, Jalan-jalan ditambah) |
| `GoldTileDefinition`      | `id`, `title`, `plan` (maks 3 efek)                                                                                                                                                                                                                                        |
| `CalendarEventDefinition` | `id`, `name`, `dateLabel`, `multiplayerStep`, `choices.join`/`choices.skip` (wajib) dan `choices.joinPaylater?` (opsional, mis. Harbolnas). Tiap choice: `effects`, plus `chance?` `{ pct (0-100), effects, text }` untuk hasil peluang (mis. 25% menang lomba)            |
| `SeasonZonkDefinition`    | `id`, `season` (`rainy`/`dry`/`transition`), `focus`, `title`, `effects` — 3 varian per musim. Fokus v1.12: Hujan "Banjir dan Kehujanan", Kemarau "Panas dan Polusi", Pancaroba "Sakit"                                                                                    |
| `InvitePlanDefinition`    | `id` (`hangout`/`morningRun`/`jointProject`/`staycation`), `title`, `effects`. Motif (`sincere`/`commission`) bukan konten, melainkan aturan engine (GDD 4.8)                                                                                                              |

Konstanta: `SEASON_BY_MONTH` memetakan bulan 1-12 ke musim (GDD 3.4: Hujan = Des/Jan/Feb,
Kemarau = Jun-Agu, Pancaroba = Mar-Mei & Sep-Nov). `VULNERABLE_CATEGORIES` berisi kategori
rawan per musim (GDD 3.4: Hujan = Kerja; Kemarau = Keuangan & Sosial; Pancaroba = Kesehatan).

## Aturan skala nilai

Validasi `TileDefinitionSchema` juga menegakkan komposisi enam Realita sesuai
GDD 5.2: tepat 3 `zonk`, 2 `safe`, dan 1 `lucky`. Enam varian dengan komposisi
lain ditolak; panjang array saja tidak cukup.

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
| Petak Emas    | Nilai tetap (angka playtest)                                                                                                        |

## Aturan id

- `id` petak, Realita, Petak Emas, Event Tanggal, dan Zonk Musim: **kebab-case Inggris**
  (regex `^[a-z0-9]+(-[a-z0-9]+)*$`), contoh: `morning-exercise` (petak), `dry-pam-water-outage` (Zonk Musim), `lebaran-thr` (Event Tanggal).
- `id` Ajakan harus persis satu dari enum `hangout`/`morningRun`/`jointProject`/`staycation`
  (camelCase, mengikuti kontrak `@pejuang/shared`).
- `id` unik dalam satu kategori entitas; teks yang tampil ke pemain (`title`, `name`, `text`,
  `focus`, `dateLabel`) ditulis dalam Bahasa Indonesia.
