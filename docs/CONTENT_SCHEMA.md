# Skema Data Konten (CONTENT_SCHEMA.md)

## Tujuan

`packages/engine/src/data/schema.ts` mendefinisikan bentuk Zod untuk semua data konten
permainan (petak, Realita, Petak Emas, Event Tanggal, Zonk Musim, Ajakan). Data aktual
diisi di file data terpisah pada `packages/engine/src/data/`; skema ini adalah kontraknya.
Semua tipe diekspor dengan `z.infer`. Validasi memakai Zod 4 dari `"zod"`; `Effect`
memakai `EffectSchema` dari `@pejuang/shared`.

## Entitas

| Entitas                   | Ringkasan bentuk                                                                                                                                                                                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RealityVariant`          | `id`, `outcome` (`zonk`/`safe`/`lucky`), `text` (Indonesia), `effects` (maks 3)                                                                                                                                                                                 |
| `TileDefinition`          | `id`, `category` (`work`/`social`/`health`/`finance` — tanpa `gold`), `title`, `plan` (maks 3 efek), `baseZonkPct` (integer 0-80), `realities` (tepat 6 varian)                                                                                                 |
| `GoldTileDefinition`      | `id`, `title`, `plan` (maks 3 efek)                                                                                                                                                                                                                             |
| `CalendarEventDefinition` | `id`, `name`, `dateLabel`, `multiplayerStep`, `choices.join`/`choices.skip` (wajib) dan `choices.joinPaylater?` (opsional, mis. Harbolnas). Tiap choice: `effects`, plus `chance?` `{ pct (0-100), effects, text }` untuk hasil peluang (mis. 25% menang lomba) |
| `SeasonZonkDefinition`    | `id`, `season` (`rainy`/`dry`/`transition`), `focus`, `title`, `effects` — 3 varian per musim                                                                                                                                                                   |
| `InvitePlanDefinition`    | `id` (`hangout`/`morningRun`/`jointProject`/`staycation`), `title`, `effects`                                                                                                                                                                                   |

Konstanta: `SEASON_BY_MONTH` memetakan bulan 1-12 ke musim (GDD 3.4: Hujan = Des/Jan/Feb,
Kemarau = Jun-Agu, Pancaroba = Mar-Mei & Sep-Nov). `VULNERABLE_CATEGORIES` berisi kategori
rawan per musim (GDD 3.4: Hujan = Kerja; Kemarau = Keuangan & Sosial; Pancaroba = Kesehatan).

## Aturan skala nilai

- **Petak biasa, Realita, Zonk Musim, dan Event Tanggal** disimpan dalam **nilai Solo**
  (persis tabel GDD). Engine mengali ×2 (Multiplayer) saat dipakai.
- **Petak Emas dan Ajakan** disimpan dalam **nilai Multiplayer** dan **tidak dikali lagi**.
- Skala nilai tidak ditulis per field (tidak ada `valueScale`); aturan di atas cukup.

## Aturan id

- `id` petak, Realita, Petak Emas, Event Tanggal, dan Zonk Musim: **kebab-case Inggris**
  (regex `^[a-z0-9]+(-[a-z0-9]+)*$`), contoh: `morning-exercise` (petak), `dry-overheat-engine` (Zonk Musim), `lebaran-thr` (Event Tanggal).
- `id` Ajakan harus persis satu dari enum `hangout`/`morningRun`/`jointProject`/`staycation`
  (camelCase, mengikuti kontrak `@pejuang/shared`).
- `id` unik dalam satu kategori entitas; teks yang tampil ke pemain (`title`, `name`, `text`,
  `focus`, `dateLabel`) ditulis dalam Bahasa Indonesia.
