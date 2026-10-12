# Pejuang UMR: Jakarta Survival

### Game Design Document (GDD) Ringkas - v1.12

> **Logline:** Game simulasi kehidupan berbasis papan heksagonal di mana pemain harus bertahan hidup selama 12 bulan dengan menyeimbangkan uang, kesehatan, dan kewarasan mental di tengah kejamnya realita finansial Jakarta.

Bagian yang baru atau berubah ditandai **[v1.12]** (perubahan terbaru), **[v1.11]**, **[v1.10]**, **[v1.9]**, **[v1.8]**, **[v1.7]**, atau **[v1.6]**. Ringkasan perubahan dan daftar asumsi ada di Bagian 10. Dokumen ini adalah versi terkonsolidasi: aturan game dari v1.6, scope MVP dan alur Room dari v1.7, dan ide dari konsep awal "Jatah" yang dicatat sebagai backlog.

### Konsep Inti: Petak adalah Kartu **[v1.6]**

Pejuang UMR bukan game kartu biasa. **Petak heksagon itu sendiri adalah kartunya.** Tidak ada deck yang ditarik, tidak ada kartu di tangan, dan tidak ada kartu yang dibuang. Sejak permainan dimulai, setiap heksa di papan sudah berisi satu petak (kartu) tertutup. Di tiap giliran, **3 heksa di sekeliling pion menyala secara acak**. Pemain mengklik heksa yang menyala untuk membuka popup detail, lalu menekan **Pilih** untuk melangkah ke sana **[v1.12]**. Heksa yang dipilih menentukan efek sekaligus arah. Satu-satunya kartu yang dipegang pemain adalah **Kartu Ajakan** (4.8).

**Platform:** web app responsif, dimainkan di browser pada HP, tablet, dan desktop. Papan dirender **3D** (meja dan heksa low-poly dengan karakter sprite, kamera bisa diputar dan di-zoom) **[v1.10]**. Fokus utama MVP adalah web di desktop, tetapi tampilan diusahakan responsif sebaik mungkin di HP dan tablet **[v1.12]**. Perangkat atau browser tanpa WebGL (teknologi browser untuk grafis 3D) tidak bisa memainkan game dan mendapat pemberitahuan bahwa perangkatnya belum didukung. Tidak ada papan cadangan. Mode hemat, akses keyboard, dan label pembaca layar ditunda (bukan prioritas MVP) **[v1.12]**. Keputusan sebelumnya (2D, v1.7) diganti karena papan 3D sudah dibangun dan hasilnya dinilai menarik.

### Scope MVP **[v1.7]**

**Dikerjakan dulu:** Multiplayer 2-4 pemain (24 langkah) dengan **pemain tamu** (nama dan avatar, tanpa akun), termasuk **Refleksi AI** di layar hasil (6.5) **[v1.12]**.

| Ditunda (bukan MVP)                                                   | Bagian GDD yang terpengaruh                                  |
| --------------------------------------------------------------------- | ------------------------------------------------------------ |
| Mode Solo (48 langkah), Akhiri Permainan, Gelar, rekor                | 1.1, 6.3, 6.4, kolom Solo di 1.3, kelompok glosarium N dan T |
| Register, login, profil akun, riwayat, Hall of Fame ("Ajang Flexing") | Bagian 9 (identitas tamu menggantikan akun)                  |
| Database (MongoDB)                                                    | Tidak dibutuhkan tanpa akun dan riwayat                      |

Bagian yang ditunda **tidak dihapus** dari dokumen agar aturan tidak hilang. Ajakan (4.8) tetap bagian dari aturan dan boleh dikerjakan paling akhir di MVP.

### Profil Game **[v1.7]**

| Dimensi       | Pejuang UMR                                                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Jumlah pemain | 2-4 (Solo ditunda)                                                                                                           |
| Durasi        | ±30 menit untuk 4 pemain pada Timer 30 detik (estimasi, perlu playtest)                                                      |
| Kompleksitas  | Ringan sampai menengah. Inti mudah (pilih 1 dari 3 heksa); lapisan tambahan: 4 indikator, kalender, musim, Ajakan            |
| Interaksi     | Semi-kompetitif: balapan Petak Emas, menutup jalur lawan, Ajakan, Beban Peringkat 1. Tanpa serangan langsung                 |
| Mekanik       | Papan heksa bersama, informasi tersembunyi, RNG terkontrol (Rencana vs Realita), manajemen sumber daya, giliran dengan timer |
| Tema          | Simulasi kehidupan dan literasi finansial karyawan UMR Jakarta                                                               |
| Target pemain | Usia 22-27 tahun, tinggal di Jakarta                                                                                         |
| Platform      | Web app responsif                                                                                                            |

---
