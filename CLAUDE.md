# Pejuang UMR: Jakarta Survival

Game web multiplayer berbasis giliran di papan heksagon 2D, 2-4 pemain, 24 langkah, pemain tamu.

## Dokumen (baca sesuai kebutuhan, jangan dimuat semua sekaligus)

- Aturan game (sumber kebenaran): docs/GDD.md
- Kontrak REST dan Socket.IO: docs/API_CONTRACT.md
- Skema data konten: docs/CONTENT_SCHEMA.md
- Desain UI: docs/02_DESIGN.md

## Struktur

- apps/web (Next.js), apps/server (Node + Socket.IO), packages/engine (logika game), packages/shared (tipe + skema Zod).
- npm workspaces. Dependensi workspace memakai `"*"`, bukan `"workspace:*"`.

## Aturan

- packages/engine hanya dipakai apps/server. apps/web TIDAK BOLEH mengimpor @pejuang/engine (isi heksa rahasia).
- Data konten dan isi papan hanya ada di packages/engine. Jangan taruh di shared.
- Validasi input dengan Zod 4 dari @pejuang/shared. Tipe diturunkan dengan z.infer.
- Nama field dan enum di kode bahasa Inggris. Teks untuk pemain bahasa Indonesia, memakai istilah glosarium GDD.
- Uang dalam Rupiah bulat. Kesehatan dan Level Stress 0-10.
- Semua acak lewat RandomSource (packages/engine/src/random.ts), jangan Math.random langsung, supaya tes deterministik.
- Setiap perubahan disertai tes Vitest. Sebelum selesai jalankan: npm run typecheck && npm test.
- Jangan membaca, membuat, atau menampilkan isi file .env.
- Jangan menjalankan git commit atau git push. Pengguna yang melakukannya.
- Jangan menambah dependensi npm tanpa izin.
- Perubahan kecil dan terarah. Jangan menulis ulang file yang tidak terkait.
- Selalu pakai path relatif dari root repo (contoh: packages/engine/src/data/tiles.ts). Jangan pernah menulis path absolut seperti /Users/... atau Users/...
