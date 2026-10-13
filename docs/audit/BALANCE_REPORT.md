# Laporan Keseimbangan Engine

Dibuat oleh `packages/engine/scripts/balance-report.ts` (jalankan `npm run simulate:balance -w @pejuang/engine`). Hanya mengukur; tidak ada angka aturan GDD yang diubah. Hasil deterministik untuk seed tetap (seed game ke-i = 1 + i; seed yang sama dipakai di semua kombinasi parameter).

## 1. Cara ukur

- Mesin: engine sungguhan (`createGame`, `startRound`, `chooseHex`, `endRound`, `closeBatch`), termasuk katalog 117 petak, Realita, Zonk Musim, Beban Peringkat 1, Petak Emas, Ajakan, Ganti Bulan, dan Doom Spending.
- Bot **Cerdas**: memilih heksa dengan Skor Sementara hasil Rencana terbaik dikurangi perkiraan kerugian Zonk (risiko terkecil), membayar Hutang sebanyak mungkin tiap Ganti Bulan, memilih Event Tanggal dengan skor harapan terbaik.
- Bot **Acak**: semua keputusan acak; Bayar Hutang separuh batas slider.
- Bot **Pengambil risiko**: suka Rencana yang menambah Hutang (Pinjol/Paylater) dan Zonk dasar tinggi, memilih Paylater di Event Tanggal, tidak pernah membayar Hutang.
- Bot tidak pernah kehabisan waktu atau melewatkan Event Tanggal. Ajakan tetap memakai kebijakan acak bawaan simulasi.
- "Satu meja X": semua kursi bot jenis X. "Campuran": ketiga jenis diputar antar kursi dan game, jadi tiap jenis ikut game yang sama dan tiap kursi bergantian.
- Kolom: Skor rata-rata = Skor Kesejahteraan akhir 0-100 (skor beku untuk yang tereliminasi). Stress >= 8 = persentase pemain dengan Level Stress >= 8 di akhir game. Doom Spending = persentase pemain yang kena minimal sekali (dan rata-rata kali per pemain). Bangkrut/Burnout = persentase pemain tereliminasi karena alasan itu. Kekayaan dan Hutang = rata-rata akhir semua pemain.
- Parameter yang bisa diubah (`GameState.balance`, kosong di game sungguhan): Biaya Hidup, Level Stress pasif per Ganti Bulan (0/1), pembagi Poin Keuangan, pengali Zonk (ukuran efek Realita saat hasilnya Zonk), dan pengali ukuran efek semua Realita. Pengali mengalikan nominal Kekayaan/Hutang (dibulatkan Rp50.000) serta Kesehatan dan Level Stress (dibulatkan, efek tidak hilang jadi 0).

Target usulan (05_PROJECT_STATE): skor rata-rata 55-70, eliminasi 10-20%, Doom 25-40% pemain.

## 2. Baseline: aturan lama GDD v1.14

Biaya Hidup Rp4,60 jt, stress pasif 0, pembagi Rp0,50 jt, pengali Zonk 1, efek Realita 1x

**2 pemain** (500 game per baris)

| Bot | Skor rata-rata | Stress >= 8 | Doom Spending (pemain, kali/pemain) | Bangkrut | Burnout | Eliminasi | Kekayaan akhir | Hutang akhir |
|---|---|---|---|---|---|---|---|---|
| Satu meja Cerdas | 87,4 | 0,0% | 0,0% (0,00x) | 0,0% | 0,0% | 0,0% | Rp13,83 jt | Rp0,12 jt |
| Satu meja Acak | 79,2 | 0,9% | 2,3% (0,05x) | 0,0% | 3,0% | 3,0% | Rp16,06 jt | Rp0,87 jt |
| Satu meja Pengambil risiko | 82,4 | 0,3% | 0,2% (0,00x) | 0,0% | 0,0% | 0,0% | Rp15,59 jt | Rp5,82 jt |
| Campuran: Cerdas | 86,5 | 0,3% | 0,0% (0,00x) | 0,0% | 0,0% | 0,0% | Rp13,23 jt | Rp0,13 jt |
| Campuran: Acak | 78,2 | 0,9% | 4,2% (0,08x) | 0,0% | 4,2% | 4,2% | Rp16,42 jt | Rp0,84 jt |
| Campuran: Pengambil risiko | 82,4 | 0,0% | 0,0% (0,00x) | 0,0% | 0,3% | 0,3% | Rp15,70 jt | Rp6,12 jt |
| **Campuran: semua** | 82,3 | 0,4% | 1,4% (0,03x) | 0,0% | 1,5% | 1,5% | Rp15,12 jt | Rp2,36 jt |

**3 pemain** (500 game per baris)

| Bot | Skor rata-rata | Stress >= 8 | Doom Spending (pemain, kali/pemain) | Bangkrut | Burnout | Eliminasi | Kekayaan akhir | Hutang akhir |
|---|---|---|---|---|---|---|---|---|
| Satu meja Cerdas | 84,8 | 0,4% | 0,3% (0,00x) | 0,0% | 0,1% | 0,1% | Rp13,67 jt | Rp0,27 jt |
| Satu meja Acak | 79,6 | 0,3% | 2,5% (0,04x) | 0,0% | 3,0% | 3,0% | Rp16,47 jt | Rp0,83 jt |
| Satu meja Pengambil risiko | 80,3 | 0,7% | 0,8% (0,01x) | 0,0% | 0,2% | 0,2% | Rp15,65 jt | Rp5,48 jt |
| Campuran: Cerdas | 85,8 | 0,4% | 0,6% (0,01x) | 0,0% | 0,4% | 0,4% | Rp13,66 jt | Rp0,11 jt |
| Campuran: Acak | 75,8 | 1,8% | 4,4% (0,07x) | 0,0% | 5,4% | 5,4% | Rp17,34 jt | Rp0,93 jt |
| Campuran: Pengambil risiko | 81,4 | 0,0% | 1,0% (0,01x) | 0,0% | 0,2% | 0,2% | Rp16,25 jt | Rp6,17 jt |
| **Campuran: semua** | 81,0 | 0,7% | 2,0% (0,03x) | 0,0% | 2,0% | 2,0% | Rp15,75 jt | Rp2,40 jt |

**4 pemain** (500 game per baris)

| Bot | Skor rata-rata | Stress >= 8 | Doom Spending (pemain, kali/pemain) | Bangkrut | Burnout | Eliminasi | Kekayaan akhir | Hutang akhir |
|---|---|---|---|---|---|---|---|---|
| Satu meja Cerdas | 81,4 | 0,5% | 0,7% (0,01x) | 0,0% | 0,8% | 0,8% | Rp13,83 jt | Rp0,34 jt |
| Satu meja Acak | 80,0 | 1,4% | 4,0% (0,06x) | 0,0% | 3,1% | 3,1% | Rp16,79 jt | Rp0,79 jt |
| Satu meja Pengambil risiko | 78,1 | 1,0% | 1,4% (0,02x) | 0,0% | 0,8% | 0,8% | Rp16,39 jt | Rp5,18 jt |
| Campuran: Cerdas | 83,9 | 0,0% | 0,0% (0,00x) | 0,0% | 0,1% | 0,1% | Rp14,45 jt | Rp0,21 jt |
| Campuran: Acak | 73,9 | 3,3% | 7,6% (0,14x) | 0,0% | 5,1% | 5,1% | Rp17,44 jt | Rp0,89 jt |
| Campuran: Pengambil risiko | 79,4 | 0,5% | 1,2% (0,02x) | 0,0% | 0,0% | 0,0% | Rp17,13 jt | Rp6,20 jt |
| **Campuran: semua** | 79,0 | 1,3% | 2,9% (0,05x) | 0,0% | 1,8% | 1,8% | Rp16,34 jt | Rp2,43 jt |

## 3. Sensitivitas satu faktor

Meja campuran 3 pemain, 500 game, satu parameter diubah dari baseline v1.14.

| Perubahan dari baseline | Skor | Eliminasi | Doom | Stress >= 8 |
|---|---|---|---|---|
| Baseline | 81,0 | 2,0% | 2,0% | 0,7% |
| Biaya Hidup Rp5,20 jt | 76,8 | 1,9% | 2,0% | 0,7% |
| Biaya Hidup Rp5,73 jt | 72,4 | 1,7% | 2,6% | 0,9% |
| Biaya Hidup Rp6,20 jt | 67,5 | 1,7% | 2,4% | 0,9% |
| Biaya Hidup Rp6,70 jt | 61,9 | 2,2% | 2,9% | 1,5% |
| Stress pasif 1 per Ganti Bulan | 77,8 | 1,4% | 9,2% | 3,8% |
| Pembagi Poin Keuangan Rp0,75 jt | 78,3 | 1,7% | 2,1% | 1,3% |
| Pembagi Poin Keuangan Rp1,00 jt | 77,0 | 1,5% | 2,3% | 1,2% |
| Pembagi Poin Keuangan Rp1,50 jt | 75,7 | 1,6% | 2,5% | 0,9% |
| Pengali Zonk 1.5 | 77,2 | 3,7% | 7,9% | 3,1% |
| Pengali Zonk 2 | 71,6 | 9,6% | 13,9% | 5,7% |
| Pengali Zonk 2.5 | 67,0 | 13,6% | 31,2% | 10,4% |
| Efek Realita 1.5x | 77,7 | 3,7% | 7,5% | 3,3% |
| Efek Realita 2x | 72,7 | 9,8% | 13,1% | 5,2% |

## 4. Penyaringan kombinasi

480 kombinasi (Biaya Hidup x stress pasif x pembagi x pengali Zonk x efek Realita), meja campuran 3 pemain, 200 game per kombinasi. Jarak = jumlah selisih skor (poin) dan persentase eliminasi/Doom dari rentang target; 0 berarti ketiganya masuk target. 10 terbaik:

| # | Kombinasi | Skor | Eliminasi | Doom | Jarak |
|---|---|---|---|---|---|
| 1 | Biaya Hidup Rp5,20 jt, stress pasif 0, pembagi Rp1,50 jt, pengali Zonk 2.5, efek Realita 1x | 61,4 | 13,8% | 32,2% | 0,0 |
| 2 | Biaya Hidup Rp5,20 jt, stress pasif 0, pembagi Rp0,75 jt, pengali Zonk 2.5, efek Realita 1x | 62,4 | 13,5% | 31,2% | 0,0 |
| 3 | Biaya Hidup Rp4,60 jt, stress pasif 0, pembagi Rp1,50 jt, pengali Zonk 2.5, efek Realita 1x | 63,1 | 12,8% | 32,2% | 0,0 |
| 4 | Biaya Hidup Rp5,73 jt, stress pasif 0, pembagi Rp1,50 jt, pengali Zonk 2.5, efek Realita 1x | 59,8 | 14,0% | 32,8% | 0,0 |
| 5 | Biaya Hidup Rp5,73 jt, stress pasif 0, pembagi Rp0,75 jt, pengali Zonk 2.5, efek Realita 1x | 58,6 | 14,3% | 32,3% | 0,0 |
| 6 | Biaya Hidup Rp5,20 jt, stress pasif 0, pembagi Rp1,00 jt, pengali Zonk 2.5, efek Realita 1x | 62,4 | 12,0% | 31,3% | 0,0 |
| 7 | Biaya Hidup Rp5,73 jt, stress pasif 0, pembagi Rp1,00 jt, pengali Zonk 2.5, efek Realita 1x | 59,2 | 13,5% | 32,8% | 0,0 |
| 8 | Biaya Hidup Rp5,20 jt, stress pasif 0, pembagi Rp0,50 jt, pengali Zonk 2.5, efek Realita 1x | 62,3 | 12,5% | 30,2% | 0,0 |
| 9 | Biaya Hidup Rp5,73 jt, stress pasif 0, pembagi Rp0,50 jt, pengali Zonk 2.5, efek Realita 1x | 57,1 | 13,5% | 32,5% | 0,0 |
| 10 | Biaya Hidup Rp4,60 jt, stress pasif 0, pembagi Rp0,75 jt, pengali Zonk 2.5, efek Realita 1x | 65,1 | 12,5% | 31,2% | 0,0 |

## 5. Finalis (500 game per jumlah pemain; urut dari yang terdekat ke tengah target)

### Finalis 1: Biaya Hidup Rp4,60 jt, stress pasif 0, pembagi Rp1,50 jt, pengali Zonk 2.5, efek Realita 1x

Jarak rata-rata meja campuran 2/3/4 pemain: 0,0

**2 pemain** (500 game per baris)

| Bot | Skor rata-rata | Stress >= 8 | Doom Spending (pemain, kali/pemain) | Bangkrut | Burnout | Eliminasi | Kekayaan akhir | Hutang akhir |
|---|---|---|---|---|---|---|---|---|
| Satu meja Cerdas | 71,1 | 3,8% | 12,6% (0,17x) | 0,0% | 5,2% | 5,2% | Rp10,18 jt | Rp0,26 jt |
| Satu meja Acak | 56,8 | 15,3% | 44,5% (0,91x) | 0,0% | 22,2% | 22,2% | Rp11,26 jt | Rp0,88 jt |
| Satu meja Pengambil risiko | 67,3 | 6,6% | 29,7% (0,46x) | 0,0% | 5,8% | 5,8% | Rp11,13 jt | Rp6,56 jt |
| Campuran: Cerdas | 70,4 | 4,2% | 12,0% (0,17x) | 0,0% | 7,8% | 7,8% | Rp9,73 jt | Rp0,21 jt |
| Campuran: Acak | 54,2 | 18,9% | 45,8% (0,99x) | 0,0% | 32,3% | 32,3% | Rp11,61 jt | Rp0,91 jt |
| Campuran: Pengambil risiko | 68,0 | 8,4% | 28,2% (0,43x) | 0,0% | 3,9% | 3,9% | Rp9,84 jt | Rp6,61 jt |
| **Campuran: semua** | 64,2 | 10,5% | 28,7% (0,53x) | 0,0% | 14,7% | 14,7% | Rp10,40 jt | Rp2,58 jt |

**3 pemain** (500 game per baris)

| Bot | Skor rata-rata | Stress >= 8 | Doom Spending (pemain, kali/pemain) | Bangkrut | Burnout | Eliminasi | Kekayaan akhir | Hutang akhir |
|---|---|---|---|---|---|---|---|---|
| Satu meja Cerdas | 68,6 | 6,3% | 18,0% (0,26x) | 0,0% | 7,0% | 7,0% | Rp10,46 jt | Rp0,38 jt |
| Satu meja Acak | 57,2 | 14,7% | 41,0% (0,86x) | 0,0% | 23,7% | 23,7% | Rp12,02 jt | Rp0,93 jt |
| Satu meja Pengambil risiko | 66,0 | 7,3% | 28,6% (0,49x) | 0,0% | 7,5% | 7,5% | Rp11,83 jt | Rp6,34 jt |
| Campuran: Cerdas | 68,0 | 6,0% | 16,6% (0,21x) | 0,0% | 7,4% | 7,4% | Rp10,30 jt | Rp0,30 jt |
| Campuran: Acak | 54,4 | 19,0% | 48,0% (1,07x) | 0,0% | 28,6% | 28,6% | Rp12,79 jt | Rp0,88 jt |
| Campuran: Pengambil risiko | 66,6 | 8,0% | 32,8% (0,55x) | 0,0% | 5,6% | 5,6% | Rp11,49 jt | Rp7,07 jt |
| **Campuran: semua** | 63,0 | 11,0% | 32,5% (0,61x) | 0,0% | 13,9% | 13,9% | Rp11,53 jt | Rp2,75 jt |

**4 pemain** (500 game per baris)

| Bot | Skor rata-rata | Stress >= 8 | Doom Spending (pemain, kali/pemain) | Bangkrut | Burnout | Eliminasi | Kekayaan akhir | Hutang akhir |
|---|---|---|---|---|---|---|---|---|
| Satu meja Cerdas | 64,5 | 9,7% | 23,8% (0,36x) | 0,0% | 10,9% | 10,9% | Rp10,25 jt | Rp0,50 jt |
| Satu meja Acak | 57,9 | 15,3% | 44,4% (0,96x) | 0,0% | 21,4% | 21,4% | Rp12,22 jt | Rp0,91 jt |
| Satu meja Pengambil risiko | 62,3 | 12,2% | 32,2% (0,56x) | 0,0% | 9,8% | 9,8% | Rp12,67 jt | Rp5,81 jt |
| Campuran: Cerdas | 66,9 | 7,3% | 19,5% (0,29x) | 0,0% | 7,0% | 7,0% | Rp11,04 jt | Rp0,31 jt |
| Campuran: Acak | 52,6 | 20,4% | 48,3% (1,14x) | 0,0% | 31,8% | 31,8% | Rp12,96 jt | Rp0,95 jt |
| Campuran: Pengambil risiko | 64,8 | 9,6% | 34,4% (0,62x) | 0,0% | 6,6% | 6,6% | Rp12,49 jt | Rp6,79 jt |
| **Campuran: semua** | 61,4 | 12,4% | 34,1% (0,68x) | 0,0% | 15,2% | 15,2% | Rp12,17 jt | Rp2,68 jt |

### Finalis 2: Biaya Hidup Rp5,20 jt, stress pasif 0, pembagi Rp1,50 jt, pengali Zonk 2.5, efek Realita 1x

Jarak rata-rata meja campuran 2/3/4 pemain: 0,0

**2 pemain** (500 game per baris)

| Bot | Skor rata-rata | Stress >= 8 | Doom Spending (pemain, kali/pemain) | Bangkrut | Burnout | Eliminasi | Kekayaan akhir | Hutang akhir |
|---|---|---|---|---|---|---|---|---|
| Satu meja Cerdas | 68,9 | 4,2% | 12,7% (0,18x) | 0,0% | 5,6% | 5,6% | Rp4,74 jt | Rp1,08 jt |
| Satu meja Acak | 55,3 | 15,5% | 45,1% (0,93x) | 0,0% | 22,4% | 22,4% | Rp6,23 jt | Rp1,49 jt |
| Satu meja Pengambil risiko | 65,9 | 6,3% | 29,9% (0,46x) | 0,1% | 5,9% | 6,0% | Rp5,64 jt | Rp7,54 jt |
| Campuran: Cerdas | 68,6 | 5,1% | 12,9% (0,19x) | 0,0% | 7,8% | 7,8% | Rp4,74 jt | Rp1,03 jt |
| Campuran: Acak | 52,8 | 19,5% | 45,5% (0,99x) | 0,0% | 31,7% | 31,7% | Rp6,38 jt | Rp1,51 jt |
| Campuran: Pengambil risiko | 66,2 | 7,8% | 30,6% (0,46x) | 0,0% | 3,9% | 3,9% | Rp4,69 jt | Rp7,70 jt |
| **Campuran: semua** | 62,5 | 10,8% | 29,7% (0,55x) | 0,0% | 14,5% | 14,5% | Rp5,27 jt | Rp3,41 jt |

**3 pemain** (500 game per baris)

| Bot | Skor rata-rata | Stress >= 8 | Doom Spending (pemain, kali/pemain) | Bangkrut | Burnout | Eliminasi | Kekayaan akhir | Hutang akhir |
|---|---|---|---|---|---|---|---|---|
| Satu meja Cerdas | 66,3 | 7,1% | 18,1% (0,28x) | 0,0% | 6,5% | 6,5% | Rp4,91 jt | Rp1,25 jt |
| Satu meja Acak | 55,3 | 15,2% | 41,7% (0,89x) | 0,0% | 24,0% | 24,0% | Rp6,53 jt | Rp1,54 jt |
| Satu meja Pengambil risiko | 64,4 | 7,3% | 29,7% (0,50x) | 0,1% | 7,9% | 8,0% | Rp6,18 jt | Rp7,17 jt |
| Campuran: Cerdas | 66,3 | 5,6% | 16,2% (0,22x) | 0,0% | 8,8% | 8,8% | Rp4,91 jt | Rp1,19 jt |
| Campuran: Acak | 53,6 | 18,4% | 47,6% (1,09x) | 0,0% | 27,8% | 27,8% | Rp7,02 jt | Rp1,29 jt |
| Campuran: Pengambil risiko | 65,0 | 7,6% | 33,6% (0,58x) | 0,0% | 6,4% | 6,4% | Rp5,77 jt | Rp8,03 jt |
| **Campuran: semua** | 61,6 | 10,5% | 32,5% (0,63x) | 0,0% | 14,3% | 14,3% | Rp5,90 jt | Rp3,50 jt |

**4 pemain** (500 game per baris)

| Bot | Skor rata-rata | Stress >= 8 | Doom Spending (pemain, kali/pemain) | Bangkrut | Burnout | Eliminasi | Kekayaan akhir | Hutang akhir |
|---|---|---|---|---|---|---|---|---|
| Satu meja Cerdas | 61,7 | 11,4% | 25,6% (0,41x) | 0,0% | 11,4% | 11,4% | Rp4,86 jt | Rp1,47 jt |
| Satu meja Acak | 56,3 | 15,8% | 44,8% (0,99x) | 0,0% | 21,6% | 21,6% | Rp6,61 jt | Rp1,46 jt |
| Satu meja Pengambil risiko | 60,6 | 13,1% | 32,8% (0,58x) | 0,0% | 9,5% | 9,5% | Rp7,03 jt | Rp6,59 jt |
| Campuran: Cerdas | 64,7 | 9,1% | 21,1% (0,32x) | 0,0% | 7,9% | 7,9% | Rp5,58 jt | Rp1,12 jt |
| Campuran: Acak | 51,4 | 20,8% | 48,9% (1,16x) | 0,0% | 31,6% | 31,6% | Rp7,32 jt | Rp1,36 jt |
| Campuran: Pengambil risiko | 62,8 | 9,9% | 35,1% (0,65x) | 0,0% | 6,9% | 6,9% | Rp6,70 jt | Rp7,54 jt |
| **Campuran: semua** | 59,6 | 13,3% | 35,0% (0,71x) | 0,0% | 15,5% | 15,5% | Rp6,53 jt | Rp3,34 jt |

### Finalis 3: Biaya Hidup Rp5,20 jt, stress pasif 0, pembagi Rp0,75 jt, pengali Zonk 2.5, efek Realita 1x

Jarak rata-rata meja campuran 2/3/4 pemain: 0,0

**2 pemain** (500 game per baris)

| Bot | Skor rata-rata | Stress >= 8 | Doom Spending (pemain, kali/pemain) | Bangkrut | Burnout | Eliminasi | Kekayaan akhir | Hutang akhir |
|---|---|---|---|---|---|---|---|---|
| Satu meja Cerdas | 69,8 | 4,2% | 13,3% (0,19x) | 0,0% | 5,7% | 5,7% | Rp4,79 jt | Rp1,06 jt |
| Satu meja Acak | 55,8 | 16,2% | 45,2% (0,92x) | 0,0% | 23,0% | 23,0% | Rp6,19 jt | Rp1,50 jt |
| Satu meja Pengambil risiko | 65,3 | 6,8% | 30,6% (0,50x) | 0,0% | 4,3% | 4,3% | Rp5,89 jt | Rp7,49 jt |
| Campuran: Cerdas | 68,8 | 5,4% | 13,8% (0,20x) | 0,0% | 8,1% | 8,1% | Rp4,84 jt | Rp1,03 jt |
| Campuran: Acak | 54,2 | 17,7% | 44,9% (1,02x) | 0,0% | 31,1% | 31,1% | Rp6,43 jt | Rp1,59 jt |
| Campuran: Pengambil risiko | 64,7 | 8,4% | 28,5% (0,43x) | 0,0% | 5,1% | 5,1% | Rp5,45 jt | Rp7,24 jt |
| **Campuran: semua** | 62,5 | 10,5% | 29,1% (0,55x) | 0,0% | 14,8% | 14,8% | Rp5,57 jt | Rp3,28 jt |

**3 pemain** (500 game per baris)

| Bot | Skor rata-rata | Stress >= 8 | Doom Spending (pemain, kali/pemain) | Bangkrut | Burnout | Eliminasi | Kekayaan akhir | Hutang akhir |
|---|---|---|---|---|---|---|---|---|
| Satu meja Cerdas | 67,0 | 7,0% | 17,3% (0,26x) | 0,0% | 6,7% | 6,7% | Rp4,93 jt | Rp1,23 jt |
| Satu meja Acak | 56,2 | 14,7% | 41,7% (0,90x) | 0,0% | 24,1% | 24,1% | Rp6,51 jt | Rp1,51 jt |
| Satu meja Pengambil risiko | 63,5 | 8,8% | 29,9% (0,49x) | 0,1% | 6,4% | 6,5% | Rp6,25 jt | Rp7,10 jt |
| Campuran: Cerdas | 66,8 | 7,2% | 16,8% (0,22x) | 0,0% | 7,6% | 7,6% | Rp4,92 jt | Rp1,05 jt |
| Campuran: Acak | 54,2 | 16,2% | 45,6% (0,99x) | 0,0% | 29,4% | 29,4% | Rp6,95 jt | Rp1,22 jt |
| Campuran: Pengambil risiko | 65,2 | 7,2% | 31,4% (0,47x) | 0,0% | 6,0% | 6,0% | Rp6,21 jt | Rp7,76 jt |
| **Campuran: semua** | 62,0 | 10,2% | 31,3% (0,56x) | 0,0% | 14,3% | 14,3% | Rp6,03 jt | Rp3,34 jt |

**4 pemain** (500 game per baris)

| Bot | Skor rata-rata | Stress >= 8 | Doom Spending (pemain, kali/pemain) | Bangkrut | Burnout | Eliminasi | Kekayaan akhir | Hutang akhir |
|---|---|---|---|---|---|---|---|---|
| Satu meja Cerdas | 62,2 | 11,1% | 25,4% (0,42x) | 0,0% | 11,4% | 11,4% | Rp4,92 jt | Rp1,43 jt |
| Satu meja Acak | 57,3 | 16,0% | 45,4% (0,99x) | 0,0% | 21,1% | 21,1% | Rp6,63 jt | Rp1,46 jt |
| Satu meja Pengambil risiko | 60,9 | 11,3% | 32,9% (0,59x) | 0,0% | 10,2% | 10,2% | Rp7,17 jt | Rp6,46 jt |
| Campuran: Cerdas | 65,2 | 9,9% | 22,3% (0,34x) | 0,0% | 8,1% | 8,1% | Rp5,24 jt | Rp1,16 jt |
| Campuran: Acak | 53,1 | 21,9% | 49,0% (1,19x) | 0,0% | 29,4% | 29,4% | Rp7,47 jt | Rp1,46 jt |
| Campuran: Pengambil risiko | 62,4 | 10,1% | 34,5% (0,64x) | 0,0% | 6,2% | 6,2% | Rp7,06 jt | Rp7,31 jt |
| **Campuran: semua** | 60,3 | 14,0% | 35,3% (0,72x) | 0,0% | 14,5% | 14,5% | Rp6,59 jt | Rp3,31 jt |

### Finalis 4: Biaya Hidup Rp5,73 jt, stress pasif 0, pembagi Rp1,50 jt, pengali Zonk 2.5, efek Realita 1x

Jarak rata-rata meja campuran 2/3/4 pemain: 0,0

**2 pemain** (500 game per baris)

| Bot | Skor rata-rata | Stress >= 8 | Doom Spending (pemain, kali/pemain) | Bangkrut | Burnout | Eliminasi | Kekayaan akhir | Hutang akhir |
|---|---|---|---|---|---|---|---|---|
| Satu meja Cerdas | 65,9 | 6,3% | 16,0% (0,24x) | 0,0% | 6,5% | 6,5% | Rp2,00 jt | Rp4,08 jt |
| Satu meja Acak | 53,6 | 16,2% | 46,1% (0,96x) | 0,0% | 22,7% | 22,7% | Rp3,07 jt | Rp3,41 jt |
| Satu meja Pengambil risiko | 64,3 | 7,0% | 29,8% (0,48x) | 0,4% | 6,3% | 6,7% | Rp2,82 jt | Rp10,55 jt |
| Campuran: Cerdas | 66,6 | 6,0% | 15,3% (0,22x) | 0,0% | 7,5% | 7,5% | Rp2,19 jt | Rp4,00 jt |
| Campuran: Acak | 50,7 | 18,0% | 45,5% (1,06x) | 0,0% | 31,4% | 31,4% | Rp2,97 jt | Rp3,76 jt |
| Campuran: Pengambil risiko | 64,8 | 7,8% | 30,9% (0,47x) | 0,6% | 4,2% | 4,8% | Rp2,18 jt | Rp10,74 jt |
| **Campuran: semua** | 60,7 | 10,6% | 30,6% (0,58x) | 0,2% | 14,4% | 14,6% | Rp2,45 jt | Rp6,16 jt |

**3 pemain** (500 game per baris)

| Bot | Skor rata-rata | Stress >= 8 | Doom Spending (pemain, kali/pemain) | Bangkrut | Burnout | Eliminasi | Kekayaan akhir | Hutang akhir |
|---|---|---|---|---|---|---|---|---|
| Satu meja Cerdas | 63,2 | 8,9% | 20,2% (0,36x) | 0,0% | 8,1% | 8,1% | Rp2,08 jt | Rp4,22 jt |
| Satu meja Acak | 53,5 | 15,9% | 42,4% (0,93x) | 0,1% | 24,2% | 24,3% | Rp3,23 jt | Rp3,69 jt |
| Satu meja Pengambil risiko | 62,3 | 8,0% | 31,1% (0,54x) | 0,1% | 8,1% | 8,2% | Rp3,02 jt | Rp9,93 jt |
| Campuran: Cerdas | 64,6 | 5,6% | 18,0% (0,26x) | 0,0% | 7,6% | 7,6% | Rp2,10 jt | Rp3,79 jt |
| Campuran: Acak | 51,6 | 17,8% | 47,8% (1,12x) | 0,0% | 27,6% | 27,6% | Rp3,43 jt | Rp3,22 jt |
| Campuran: Pengambil risiko | 63,2 | 7,6% | 33,4% (0,59x) | 1,0% | 5,4% | 6,4% | Rp2,50 jt | Rp10,98 jt |
| **Campuran: semua** | 59,8 | 10,3% | 33,1% (0,66x) | 0,3% | 13,5% | 13,9% | Rp2,68 jt | Rp6,00 jt |

**4 pemain** (500 game per baris)

| Bot | Skor rata-rata | Stress >= 8 | Doom Spending (pemain, kali/pemain) | Bangkrut | Burnout | Eliminasi | Kekayaan akhir | Hutang akhir |
|---|---|---|---|---|---|---|---|---|
| Satu meja Cerdas | 58,4 | 13,8% | 27,0% (0,48x) | 0,0% | 12,7% | 12,7% | Rp2,23 jt | Rp4,71 jt |
| Satu meja Acak | 54,2 | 16,8% | 46,1% (1,03x) | 0,0% | 22,2% | 22,2% | Rp3,15 jt | Rp3,49 jt |
| Satu meja Pengambil risiko | 58,5 | 14,2% | 32,7% (0,61x) | 0,4% | 9,6% | 9,9% | Rp3,62 jt | Rp9,16 jt |
| Campuran: Cerdas | 61,9 | 11,4% | 23,2% (0,40x) | 0,0% | 7,9% | 7,9% | Rp2,53 jt | Rp3,87 jt |
| Campuran: Acak | 49,0 | 21,7% | 48,9% (1,17x) | 0,0% | 31,9% | 31,9% | Rp3,71 jt | Rp3,13 jt |
| Campuran: Pengambil risiko | 60,7 | 11,3% | 34,7% (0,67x) | 0,5% | 6,9% | 7,4% | Rp3,40 jt | Rp10,10 jt |
| **Campuran: semua** | 57,2 | 14,8% | 35,6% (0,75x) | 0,1% | 15,6% | 15,8% | Rp3,21 jt | Rp5,70 jt |

### Finalis 5: Biaya Hidup Rp5,73 jt, stress pasif 0, pembagi Rp0,75 jt, pengali Zonk 2.5, efek Realita 1x

Jarak rata-rata meja campuran 2/3/4 pemain: 0,0

**2 pemain** (500 game per baris)

| Bot | Skor rata-rata | Stress >= 8 | Doom Spending (pemain, kali/pemain) | Bangkrut | Burnout | Eliminasi | Kekayaan akhir | Hutang akhir |
|---|---|---|---|---|---|---|---|---|
| Satu meja Cerdas | 65,2 | 6,4% | 15,9% (0,23x) | 0,0% | 6,4% | 6,4% | Rp2,07 jt | Rp4,01 jt |
| Satu meja Acak | 53,0 | 16,8% | 46,4% (0,96x) | 0,0% | 23,0% | 23,0% | Rp3,01 jt | Rp3,43 jt |
| Satu meja Pengambil risiko | 62,1 | 6,9% | 31,2% (0,52x) | 0,2% | 4,6% | 4,8% | Rp2,76 jt | Rp10,39 jt |
| Campuran: Cerdas | 65,8 | 5,1% | 15,3% (0,22x) | 0,0% | 7,8% | 7,8% | Rp2,36 jt | Rp3,93 jt |
| Campuran: Acak | 50,5 | 18,0% | 46,1% (1,10x) | 0,0% | 30,5% | 30,5% | Rp3,04 jt | Rp3,74 jt |
| Campuran: Pengambil risiko | 61,8 | 8,1% | 28,8% (0,45x) | 0,6% | 4,8% | 5,4% | Rp2,67 jt | Rp10,21 jt |
| **Campuran: semua** | 59,4 | 10,4% | 30,1% (0,59x) | 0,2% | 14,4% | 14,6% | Rp2,69 jt | Rp5,96 jt |

**3 pemain** (500 game per baris)

| Bot | Skor rata-rata | Stress >= 8 | Doom Spending (pemain, kali/pemain) | Bangkrut | Burnout | Eliminasi | Kekayaan akhir | Hutang akhir |
|---|---|---|---|---|---|---|---|---|
| Satu meja Cerdas | 62,2 | 9,1% | 19,7% (0,34x) | 0,0% | 8,1% | 8,1% | Rp2,11 jt | Rp4,22 jt |
| Satu meja Acak | 52,8 | 15,4% | 42,5% (0,94x) | 0,1% | 24,6% | 24,7% | Rp3,21 jt | Rp3,65 jt |
| Satu meja Pengambil risiko | 60,3 | 10,0% | 29,9% (0,50x) | 0,1% | 6,6% | 6,7% | Rp3,04 jt | Rp9,72 jt |
| Campuran: Cerdas | 63,3 | 8,4% | 18,4% (0,27x) | 0,0% | 6,8% | 6,8% | Rp2,08 jt | Rp3,86 jt |
| Campuran: Acak | 50,6 | 17,8% | 46,0% (1,03x) | 0,0% | 30,0% | 30,0% | Rp3,44 jt | Rp3,04 jt |
| Campuran: Pengambil risiko | 61,4 | 8,0% | 30,8% (0,50x) | 1,0% | 5,0% | 6,0% | Rp2,67 jt | Rp10,58 jt |
| **Campuran: semua** | 58,5 | 11,4% | 31,7% (0,60x) | 0,3% | 13,9% | 14,3% | Rp2,73 jt | Rp5,83 jt |

**4 pemain** (500 game per baris)

| Bot | Skor rata-rata | Stress >= 8 | Doom Spending (pemain, kali/pemain) | Bangkrut | Burnout | Eliminasi | Kekayaan akhir | Hutang akhir |
|---|---|---|---|---|---|---|---|---|
| Satu meja Cerdas | 57,2 | 13,2% | 26,6% (0,47x) | 0,0% | 12,7% | 12,7% | Rp2,22 jt | Rp4,65 jt |
| Satu meja Acak | 53,7 | 16,9% | 46,5% (1,02x) | 0,0% | 22,1% | 22,1% | Rp3,13 jt | Rp3,47 jt |
| Satu meja Pengambil risiko | 57,1 | 12,1% | 33,1% (0,62x) | 0,3% | 10,5% | 10,8% | Rp3,74 jt | Rp8,90 jt |
| Campuran: Cerdas | 60,9 | 11,1% | 23,7% (0,40x) | 0,0% | 8,4% | 8,4% | Rp2,25 jt | Rp3,88 jt |
| Campuran: Acak | 49,1 | 24,3% | 51,3% (1,21x) | 0,0% | 29,2% | 29,2% | Rp3,84 jt | Rp3,29 jt |
| Campuran: Pengambil risiko | 58,6 | 10,7% | 35,1% (0,65x) | 0,5% | 5,9% | 6,3% | Rp3,63 jt | Rp9,87 jt |
| **Campuran: semua** | 56,2 | 15,3% | 36,7% (0,75x) | 0,1% | 14,5% | 14,6% | Rp3,24 jt | Rp5,68 jt |

### Finalis 6: Biaya Hidup Rp5,20 jt, stress pasif 1, pembagi Rp0,50 jt, pengali Zonk 2, efek Realita 1x

Jarak rata-rata meja campuran 2/3/4 pemain: 0,6

**2 pemain** (500 game per baris)

| Bot | Skor rata-rata | Stress >= 8 | Doom Spending (pemain, kali/pemain) | Bangkrut | Burnout | Eliminasi | Kekayaan akhir | Hutang akhir |
|---|---|---|---|---|---|---|---|---|
| Satu meja Cerdas | 71,9 | 4,7% | 8,8% (0,13x) | 0,0% | 3,2% | 3,2% | Rp4,62 jt | Rp0,91 jt |
| Satu meja Acak | 56,4 | 19,8% | 47,8% (1,24x) | 0,0% | 18,8% | 18,8% | Rp6,58 jt | Rp1,29 jt |
| Satu meja Pengambil risiko | 66,9 | 5,2% | 16,3% (0,26x) | 0,0% | 1,8% | 1,8% | Rp6,48 jt | Rp6,34 jt |
| Campuran: Cerdas | 72,5 | 3,3% | 10,5% (0,17x) | 0,0% | 1,8% | 1,8% | Rp4,50 jt | Rp0,89 jt |
| Campuran: Acak | 54,9 | 20,4% | 50,3% (1,38x) | 0,0% | 23,7% | 23,7% | Rp6,66 jt | Rp1,25 jt |
| Campuran: Pengambil risiko | 64,8 | 7,8% | 18,3% (0,31x) | 0,0% | 3,9% | 3,9% | Rp6,49 jt | Rp6,35 jt |
| **Campuran: semua** | 64,0 | 10,5% | 26,4% (0,62x) | 0,0% | 9,8% | 9,8% | Rp5,88 jt | Rp2,83 jt |

**3 pemain** (500 game per baris)

| Bot | Skor rata-rata | Stress >= 8 | Doom Spending (pemain, kali/pemain) | Bangkrut | Burnout | Eliminasi | Kekayaan akhir | Hutang akhir |
|---|---|---|---|---|---|---|---|---|
| Satu meja Cerdas | 69,1 | 6,0% | 13,0% (0,22x) | 0,0% | 3,8% | 3,8% | Rp4,75 jt | Rp1,00 jt |
| Satu meja Acak | 56,5 | 17,5% | 47,7% (1,28x) | 0,0% | 20,3% | 20,3% | Rp6,92 jt | Rp1,29 jt |
| Satu meja Pengambil risiko | 64,2 | 8,6% | 21,9% (0,41x) | 0,0% | 3,3% | 3,3% | Rp7,07 jt | Rp6,20 jt |
| Campuran: Cerdas | 69,5 | 4,6% | 9,2% (0,14x) | 0,0% | 4,6% | 4,6% | Rp4,30 jt | Rp1,02 jt |
| Campuran: Acak | 54,8 | 19,2% | 51,6% (1,47x) | 0,0% | 17,0% | 17,0% | Rp7,09 jt | Rp1,37 jt |
| Campuran: Pengambil risiko | 64,2 | 7,8% | 23,2% (0,44x) | 0,0% | 3,4% | 3,4% | Rp6,91 jt | Rp6,67 jt |
| **Campuran: semua** | 62,8 | 10,5% | 28,0% (0,68x) | 0,0% | 8,3% | 8,3% | Rp6,10 jt | Rp3,02 jt |

**4 pemain** (500 game per baris)

| Bot | Skor rata-rata | Stress >= 8 | Doom Spending (pemain, kali/pemain) | Bangkrut | Burnout | Eliminasi | Kekayaan akhir | Hutang akhir |
|---|---|---|---|---|---|---|---|---|
| Satu meja Cerdas | 63,8 | 11,1% | 20,9% (0,41x) | 0,0% | 7,0% | 7,0% | Rp4,93 jt | Rp1,13 jt |
| Satu meja Acak | 56,9 | 18,4% | 49,3% (1,37x) | 0,0% | 16,5% | 16,5% | Rp6,98 jt | Rp1,24 jt |
| Satu meja Pengambil risiko | 60,0 | 14,1% | 27,6% (0,61x) | 0,0% | 6,6% | 6,6% | Rp7,87 jt | Rp5,91 jt |
| Campuran: Cerdas | 68,5 | 6,7% | 15,9% (0,29x) | 0,0% | 3,9% | 3,9% | Rp5,35 jt | Rp0,80 jt |
| Campuran: Acak | 51,7 | 26,8% | 55,9% (1,75x) | 0,0% | 23,7% | 23,7% | Rp7,54 jt | Rp1,26 jt |
| Campuran: Pengambil risiko | 62,5 | 9,3% | 25,8% (0,52x) | 0,0% | 4,2% | 4,2% | Rp7,38 jt | Rp6,54 jt |
| **Campuran: semua** | 60,9 | 14,3% | 32,6% (0,85x) | 0,0% | 10,6% | 10,6% | Rp6,76 jt | Rp2,87 jt |

## 6. Rekomendasi

Kombinasi paling dekat target: **Biaya Hidup Rp4,60 jt, stress pasif 0, pembagi Rp1,50 jt, pengali Zonk 2.5, efek Realita 1x**.

Meja campuran memenuhi ketiga target di 3 dari 3 jumlah pemain (jarak rata-rata 0,0). Angka lengkapnya ada di Finalis 1.

Ringkasan finalis (meja campuran, skor / eliminasi / Doom per jumlah pemain 2, 3, 4):

| Finalis | Kombinasi | 2 pemain | 3 pemain | 4 pemain | Skor bot Cerdas satu meja (3 pemain) |
|---|---|---|---|---|---|
| 1 | Biaya Hidup Rp4,60 jt, stress pasif 0, pembagi Rp1,50 jt, pengali Zonk 2.5, efek Realita 1x | 64,2 / 14,7% / 28,7% | 63,0 / 13,9% / 32,5% | 61,4 / 15,2% / 34,1% | 68,6 |
| 2 | Biaya Hidup Rp5,20 jt, stress pasif 0, pembagi Rp1,50 jt, pengali Zonk 2.5, efek Realita 1x | 62,5 / 14,5% / 29,7% | 61,6 / 14,3% / 32,5% | 59,6 / 15,5% / 35,0% | 66,3 |
| 3 | Biaya Hidup Rp5,20 jt, stress pasif 0, pembagi Rp0,75 jt, pengali Zonk 2.5, efek Realita 1x | 62,5 / 14,8% / 29,1% | 62,0 / 14,3% / 31,3% | 60,3 / 14,5% / 35,3% | 67,0 |
| 4 | Biaya Hidup Rp5,73 jt, stress pasif 0, pembagi Rp1,50 jt, pengali Zonk 2.5, efek Realita 1x | 60,7 / 14,6% / 30,6% | 59,8 / 13,9% / 33,1% | 57,2 / 15,8% / 35,6% | 63,2 |
| 5 | Biaya Hidup Rp5,73 jt, stress pasif 0, pembagi Rp0,75 jt, pengali Zonk 2.5, efek Realita 1x | 59,4 / 14,6% / 30,1% | 58,5 / 14,3% / 31,7% | 56,2 / 14,6% / 36,7% | 62,2 |
| 6 | Biaya Hidup Rp5,20 jt, stress pasif 1, pembagi Rp0,50 jt, pengali Zonk 2, efek Realita 1x | 64,0 / 9,8% / 26,4% | 62,8 / 8,3% / 28,0% | 60,9 / 10,6% / 32,6% | 69,1 |

Pilih kombinasi dengan mempertimbangkan seberapa jauh ia mengubah rasa game: pengali Zonk tinggi membuat satu Zonk jauh lebih menyakitkan, sedangkan Level Stress pasif 1 menekan semua pemain secara merata tiap Ganti Bulan. Baseline (aturan v1.14) sama sekali tidak mendekati target: skor sekitar 80, eliminasi di bawah 3%, Doom di bawah 5%.

## 7. Ringkasan akhir: aturan resmi GDD v1.15

Dipilih: Finalis 6, Biaya Hidup Rp5,20 jt, stress pasif 1, pembagi Rp0,50 jt, pengali Zonk 2, efek Realita 1x (sekarang bawaan di `packages/engine/src/economy/balance.ts`; aturan v1.14 tersimpan sebagai `BALANCE_V1_14` untuk perbandingan). Angka di bawah dijalankan ulang dengan bawaan engine, 500 game per baris.

**2 pemain** (500 game per baris)

| Bot | Skor rata-rata | Stress >= 8 | Doom Spending (pemain, kali/pemain) | Bangkrut | Burnout | Eliminasi | Kekayaan akhir | Hutang akhir |
|---|---|---|---|---|---|---|---|---|
| Satu meja Cerdas | 71,9 | 4,7% | 8,8% (0,13x) | 0,0% | 3,2% | 3,2% | Rp4,62 jt | Rp0,91 jt |
| Satu meja Acak | 56,4 | 19,8% | 47,8% (1,24x) | 0,0% | 18,8% | 18,8% | Rp6,58 jt | Rp1,29 jt |
| Satu meja Pengambil risiko | 66,9 | 5,2% | 16,3% (0,26x) | 0,0% | 1,8% | 1,8% | Rp6,48 jt | Rp6,34 jt |
| Campuran: Cerdas | 72,5 | 3,3% | 10,5% (0,17x) | 0,0% | 1,8% | 1,8% | Rp4,50 jt | Rp0,89 jt |
| Campuran: Acak | 54,9 | 20,4% | 50,3% (1,38x) | 0,0% | 23,7% | 23,7% | Rp6,66 jt | Rp1,25 jt |
| Campuran: Pengambil risiko | 64,8 | 7,8% | 18,3% (0,31x) | 0,0% | 3,9% | 3,9% | Rp6,49 jt | Rp6,35 jt |
| **Campuran: semua** | 64,0 | 10,5% | 26,4% (0,62x) | 0,0% | 9,8% | 9,8% | Rp5,88 jt | Rp2,83 jt |

**3 pemain** (500 game per baris)

| Bot | Skor rata-rata | Stress >= 8 | Doom Spending (pemain, kali/pemain) | Bangkrut | Burnout | Eliminasi | Kekayaan akhir | Hutang akhir |
|---|---|---|---|---|---|---|---|---|
| Satu meja Cerdas | 69,1 | 6,0% | 13,0% (0,22x) | 0,0% | 3,8% | 3,8% | Rp4,75 jt | Rp1,00 jt |
| Satu meja Acak | 56,5 | 17,5% | 47,7% (1,28x) | 0,0% | 20,3% | 20,3% | Rp6,92 jt | Rp1,29 jt |
| Satu meja Pengambil risiko | 64,2 | 8,6% | 21,9% (0,41x) | 0,0% | 3,3% | 3,3% | Rp7,07 jt | Rp6,20 jt |
| Campuran: Cerdas | 69,5 | 4,6% | 9,2% (0,14x) | 0,0% | 4,6% | 4,6% | Rp4,30 jt | Rp1,02 jt |
| Campuran: Acak | 54,8 | 19,2% | 51,6% (1,47x) | 0,0% | 17,0% | 17,0% | Rp7,09 jt | Rp1,37 jt |
| Campuran: Pengambil risiko | 64,2 | 7,8% | 23,2% (0,44x) | 0,0% | 3,4% | 3,4% | Rp6,91 jt | Rp6,67 jt |
| **Campuran: semua** | 62,8 | 10,5% | 28,0% (0,68x) | 0,0% | 8,3% | 8,3% | Rp6,10 jt | Rp3,02 jt |

**4 pemain** (500 game per baris)

| Bot | Skor rata-rata | Stress >= 8 | Doom Spending (pemain, kali/pemain) | Bangkrut | Burnout | Eliminasi | Kekayaan akhir | Hutang akhir |
|---|---|---|---|---|---|---|---|---|
| Satu meja Cerdas | 63,8 | 11,1% | 20,9% (0,41x) | 0,0% | 7,0% | 7,0% | Rp4,93 jt | Rp1,13 jt |
| Satu meja Acak | 56,9 | 18,4% | 49,3% (1,37x) | 0,0% | 16,5% | 16,5% | Rp6,98 jt | Rp1,24 jt |
| Satu meja Pengambil risiko | 60,0 | 14,1% | 27,6% (0,61x) | 0,0% | 6,6% | 6,6% | Rp7,87 jt | Rp5,91 jt |
| Campuran: Cerdas | 68,5 | 6,7% | 15,9% (0,29x) | 0,0% | 3,9% | 3,9% | Rp5,35 jt | Rp0,80 jt |
| Campuran: Acak | 51,7 | 26,8% | 55,9% (1,75x) | 0,0% | 23,7% | 23,7% | Rp7,54 jt | Rp1,26 jt |
| Campuran: Pengambil risiko | 62,5 | 9,3% | 25,8% (0,52x) | 0,0% | 4,2% | 4,2% | Rp7,38 jt | Rp6,54 jt |
| **Campuran: semua** | 60,9 | 14,3% | 32,6% (0,85x) | 0,0% | 10,6% | 10,6% | Rp6,76 jt | Rp2,87 jt |

Meja campuran terhadap target:

| Pemain | Skor (55-70) | Eliminasi (10-20%) | Doom (25-40%) | Masuk target |
|---|---|---|---|---|
| 2 | 64,0 | 9,8% | 26,4% | tidak |
| 3 | 62,8 | 8,3% | 28,0% | tidak |
| 4 | 60,9 | 10,6% | 32,6% | ya |

Catatan: ini hasil bot, bukan pemain nyata. Bot cerdas dan pengambil risiko tidak memakai Ajakan secara strategis, dan bot tidak membaca Beban Peringkat 1 selain lewat risiko heksa. Kunci angka sesudah ada uji main dengan manusia.
