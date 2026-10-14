import type { Metadata } from "next";
import type { ReactNode } from "react";
import Card from "../components/ui/Card";
import { BackButton } from "./back-button";
import { BoardFigure, CalendarFigure, CategoryFigure, FlowFigure, GuideFigure, StatusFigure, TileFigure } from "./guide-visuals";

export const metadata: Metadata = {
  title: "Cara Main — Pejuang UMR",
  description: "Panduan Mabar Pejuang UMR: room, heksa, status, Ajakan, dan penilaian.",
};

const sections = [
  ["mulai", "Mulai bermain"], ["layar", "Kenali layar"], ["giliran", "Giliran & petak"],
  ["status", "Status & kalender"], ["ajakan", "Kartu Ajakan"], ["khusus", "Kondisi khusus"],
  ["hasil", "Hasil akhir"], ["koneksi", "Koneksi terputus"],
] as const;

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-4 space-y-4">
    <h2 id={`${id}-title`} className="font-heading text-2xl font-bold sm:text-3xl">{title}</h2>{children}
  </section>;
}

function Bullets({ children }: { children: ReactNode }) {
  return <ul className="grid list-disc gap-2 pl-5">{children}</ul>;
}

export default function CaraMainPage() {
  return (
    <main className="lobby-desk min-h-dvh px-3 py-6 text-[#3b2a12] sm:px-6 sm:py-10">
      <div className="lobby-folder mx-auto grid w-full max-w-5xl min-w-0 gap-8 rounded-2xl border-2 border-[#3b2a12]/70 p-4 leading-relaxed sm:p-8">
        <header className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.18em]">Ruang Rapat</p>
          <h1 className="font-heading text-4xl font-bold">Cara Main</h1>
          <p className="max-w-3xl text-base">Bertahan sebagai karyawan Jakarta selama 12 bulan (24 langkah). Mabar dimainkan 2–4 orang di satu papan. Seimbangkan Kekayaan, Hutang, Kesehatan, dan Level Stress: pemenangnya adalah pemain dengan Skor Kesejahteraan terbaik, bukan yang uangnya paling banyak.</p>
          <p className="text-sm font-semibold">Ini simulasi, tanpa uang sungguhan. Mode Singel dan Ajang Flexing belum tersedia. Durasi ±30 menit untuk 4 pemain dengan timer 30 detik hanyalah perkiraan.</p>
          <BackButton />
        </header>
        <nav aria-label="Isi panduan" className="ui-note rounded-xl p-4">
          <h2 className="font-heading text-lg font-bold">Langsung ke bagian</h2>
          <ol className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {sections.map(([id, label]) => <li key={id}><a className="inline-flex min-h-11 items-center underline underline-offset-4 focus-visible:outline-2" href={`#${id}`}>{label}</a></li>)}
          </ol>
        </nav>

        <Section id="mulai" title="1. Mulai bermain">
          <Card className="space-y-3">
            <p>Tekan <strong>Mabar</strong>, masuk sebagai tamu dengan nama (2–20 karakter) dan pilih avatar. Tidak perlu akun.</p>
            <FlowFigure caption="Contoh alur ruang tunggu; host tidak perlu menekan Siap." steps={[
              { title: "Buat / Gabung", note: "Host pilih Buat Room dan bagikan kode atau link. Teman masukkan kode, lalu Gabung." },
              { title: "Atur / Siap", note: "Host pilih Timer Giliran: Kilat 15, Cepat 30, atau Santai 60 detik. Pemain selain host tekan Siap." },
              { title: "Mulai", note: "Host tekan Mulai saat ada minimal 2 pemain dan semua pemain lain siap." },
            ]} />
            <p>Maksimal empat pemain. Karakter harus unik per room; bila sudah dipakai, pilih karakter lain. Setelah Mulai, room terkunci untuk pemain baru; pemain yang terputus masih dapat masuk kembali.</p>
          </Card>
        </Section>

        <Section id="layar" title="2. Kenali layar permainan">
          <Card className="space-y-4">
            <BoardFigure />
            <Bullets>
              <li><strong>Papan 3D:</strong> pion menandai posisi pemain. Ketuk heksa menyala untuk melihat detail; heksa terbuka bisa dilihat lagi, tetapi tidak bisa dimasuki. Putar kamera untuk melihat papan, gunakan tombol +/− untuk zoom.</li>
              <li><strong>Panel pribadi:</strong> rincian empat indikatormu hanya tampak untukmu. <strong>Papan Skor:</strong> semua orang melihat Skor Sementara dan siapa yang sedang <strong>Jalan</strong>, bukan rincian indikator lawan.</li>
              <li><strong>Kalender:</strong> lihat tanggal, Langkah dari 24, musim, dan petunjuk kategori rawan. Timer di bawah papan menunjukkan sisa giliran. Kartu Ajakan ada di HUD milikmu.</li>
            </Bullets>
            <CategoryFigure />
            <p>Papan memakai 127 heksa untuk 2–4 pemain; titik awal pemain berbeda sesuai jumlah pemain. Papan membutuhkan browser yang mendukung WebGL, tetapi panduan ini tetap dapat dibaca tanpa WebGL.</p>
          </Card>
        </Section>

        <Section id="giliran" title="3. Saat giliranmu: pilih petak, lalu lihat Realita">
          <Card className="space-y-4">
            <p>Setiap ronde, pemain yang masih bertahan mendapat satu giliran. Urutan pemain pertama berputar tiap bulan. Di giliranmu, hingga tiga heksa tertutup yang bisa dimasuki menyala. Petak heksagon itulah kartunya: tidak ada deck petak yang ditarik atau dibuang. Satu-satunya kartu yang kamu pegang adalah Kartu Ajakan.</p>
            <FlowFigure caption="Ketuk saja belum memindahkan pion. Pilihan baru final setelah tombol Pilih ditekan." steps={[
              { title: "Ketuk", note: "Buka detail heksa yang menyala; ketuk pilihan lain untuk membandingkan." },
              { title: "Baca", note: "Lihat kategori, Rencana, dan ikon risiko Rendah / Sedang / Tinggi. Realita masih rahasia." },
              { title: "Pilih", note: "Tekan PILIH HEKSA INI. Pion bergerak dan efek Rencana langsung berlaku." },
            ]} />
            <TileFigure />
            <p>Detail opsi heksa hanya terlihat oleh pemain aktif. Petak yang dipilih terbuka untuk semua; di akhir ronde, Realita semua petak ronde itu terungkap dan efeknya berlaku. Hasil Realita: <strong>Zonk</strong> (konsekuensi), <strong>Aman</strong> (tanpa efek tambahan), atau <strong>Hoki</strong> (bonus). Efek Zonk dari Realita dikali 2; Rencana, Aman, Hoki, Event Tanggal, dan Ajakan tidak dikali.</p>
            <p>Risiko sudah memperhitungkan musim dan Beban Peringkat 1; Rendah/Sedang/Tinggi menunjukkan peluang Zonk, <strong>bukan kepastian</strong>. Persentase aslinya tidak ditampilkan di detail. Jika timer habis sebelum memilih, sistem memilih acak dari heksa menyala, termasuk saat detail sedang terbuka. Timer tidak dijeda.</p>
          </Card>
        </Section>

        <Section id="status" title="4. Jaga status dan pahami kalender">
          <Card className="space-y-4">
            <StatusFigure />
            <CalendarFigure />
            <Bullets>
              <li><strong>Kekayaan</strong> adalah uang tunai; <strong>Hutang</strong> menambah bunga dan mengurangi skor. Jika biaya melebihi Kekayaan, Kekayaan menjadi Rp0 dan selisihnya otomatis menjadi Hutang.</li>
              <li><strong>Kesehatan</strong> dan <strong>Level Stress</strong> berada di 0–10. Jaga Kesehatan tetap tinggi dan Level Stress tetap rendah.</li>
            </Bullets>
            <GuideFigure caption="Pergantian bulan terjadi di awal Langkah 3, 5, …, 23; Januari memakai status awal tanpa gajian maupun biaya hidup.">
              <ol className="grid list-decimal gap-1 pl-5"><li>Gaji masuk: Rp5.730.000.</li><li>Biaya Hidup Wajib: Rp5.200.000.</li><li>Bunga Hutang 3% dipotong dari Kekayaan; kekurangan menjadi Hutang.</li><li>Tekanan bulanan: Level Stress +1.</li><li>Jika berhutang, pilih Bayar Hutang melalui slider (Rp0 sampai nilai terkecil dari Kekayaan atau Hutang). Lunas menurunkan Level Stress 2.</li></ol>
            </GuideFigure>
            <p>Ketika Hutang naik <strong>melewati</strong> kelipatan Rp5 juta, Level Stress bertambah 1 per kelipatan yang dilewati; tepat pada kelipatannya belum dihitung. Di awal ronde, popup kalender dapat muncul bersamaan. Popup yang butuh keputusan bertanda “Butuh keputusanmu!” dan memberi 15 detik bersama; waktu habis berarti Bayar Hutang Rp0 atau Event Tanggal <strong>Tidak ikut</strong>. Popup informasi saja memiliki 8 detik. Event Tanggal memiliki akibat baik kamu ikut maupun tidak, dan tidak menghabiskan langkah.</p>
            <details className="ui-note rounded-xl p-4"><summary className="cursor-pointer font-bold">Musim dan risiko kategori</summary><p className="mt-2">Hujan (Desember–Februari): Kerja rawan. Kemarau (Juni–Agustus): Keuangan dan Sosial rawan. Pancaroba (Maret–Mei, September–November): Kesehatan rawan. Kategori rawan menambah peluang Zonk 10 poin persen. Saat Pancaroba, Kesehatan ≥8 kebal dari Zonk Musim Sakit dan tambahan risiko musiman pada petak Kesehatan, bukan dari semua Zonk.</p></details>
          </Card>
        </Section>

        <Section id="ajakan" title="5. Kartu Ajakan: ajak tanpa menghabiskan langkah">
          <Card className="space-y-4">
            <p>Kamu mendapat satu Kartu Ajakan di awal Bulan 1, 3, 5, 7, 9, dan 11. Maksimal satu kartu di tangan; kartu lama hangus saat menerima yang baru. Kartu berisi Rencana yang terlihat oleh pengirim dan target, serta motif <strong>Tulus</strong> atau <strong>Komisi</strong> yang awalnya hanya diketahui pengirim.</p>
            <FlowFigure caption="Contoh alur Ajakan. Gunakan di Fase Pilihan giliranmu, sebelum memilih heksa; mengirim Ajakan tidak memindahkan pion." steps={[
              { title: "Pilih kartu", note: "Buka Kartu Ajakan saat giliranmu, sebelum heksa dipilih." },
              { title: "Pilih target", note: "Ketuk pion target atau namanya di Papan Skor, lalu konfirmasi Ajak." },
              { title: "Ikut / Tolak", note: "Target menjawab dalam 15 detik, termasuk di luar gilirannya. Waktu habis = Tolak." },
            ]} />
            <p>Tidak bisa mengajak diri sendiri, pemain tereliminasi, atau pemain yang sedang memiliki popup Ajakan aktif. Pemain terputus masih bisa diajak; jika tak menjawab tepat waktu hasilnya Tolak. Tidak ada timer yang dijeda, bahkan bila giliran target mulai ketika popup Ajakan masih terbuka. Jika giliranmu habis sebelum konfirmasi, Ajakan batal dan kartu tidak terpakai. Jika target menjadi tidak valid, kamu bisa memilih target lain selama giliran dan kartu masih berlaku.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="ui-note rounded-xl p-4"><h3 className="font-heading text-lg font-bold">Empat Rencana Ajakan</h3><Bullets><li>Ajak Nongkrong: Kekayaan −Rp500.000, Level Stress −2.</li><li>Ajak Lari Pagi: Kesehatan +1, Level Stress −1.</li><li>Ajak Proyek Bareng: Kekayaan +Rp1.500.000, Kesehatan −1.</li><li>Ajak Staycation Patungan: Kekayaan −Rp1.000.000, Kesehatan +1, Level Stress −2.</li></Bullets></div>
              <div className="ui-note rounded-xl p-4"><h3 className="font-heading text-lg font-bold">Motif mengubah hasil</h3><Bullets><li><strong>Tulus + Ikut:</strong> Rencana berlaku, Level Stress target dan pengirim masing-masing −1. <strong>Tulus + Tolak:</strong> target Level Stress +1.</li><li><strong>Komisi + Ikut:</strong> Rencana berlaku; target Kekayaan −Rp500.000 tambahan, pengirim +Rp500.000. <strong>Komisi + Tolak:</strong> target Level Stress −1.</li></Bullets></div>
            </div>
            <p>Hasil dan motif baru dibuka di akhir ronde kepada pengirim dan target. Menolak pun dapat mengubah status.</p>
          </Card>
        </Section>

        <Section id="khusus" title="6. Saat keadaan berubah">
          <div className="grid gap-3 sm:grid-cols-2">
            <Card><h3 className="font-heading text-lg font-bold">Jalan Buntu & Petak Emas</h3><p>Jika semua heksa di sekitar pion sudah diinjak, sistem menawarkan hingga tiga heksa tertutup terdekat untuk dilompati. Pilih satu seperti biasa: Level Stress +1, lalu Rencana dan Realita petaknya tetap berlaku. Petak Emas muncul pada Langkah 5, 9, 13, 17, dan 21; satu aktif selama empat ronde. Petaknya berkilau dan terlihat bersama isinya, tetapi tetap harus dijangkau dan dipilih. Emas hanya punya Rencana, tanpa Realita.</p></Card>
            <Card><h3 className="font-heading text-lg font-bold">Peringkat & Doom Spending</h3><p>Mulai Bulan 3, pemilik Skor Sementara tertinggi di awal ronde mendapat Beban Peringkat 1: peluang Zonk +15 poin persen. Jika seri, semuanya terkena. Mahkota di Papan Skor menandai peringkat, bukan berarti beban sudah aktif sejak Bulan 1. Di akhir ronde, Level Stress ≥9 memicu Doom Spending: Kekayaan −Rp750.000 sampai −Rp1.500.000 secara acak, lalu Level Stress −1.</p></Card>
          </div>
          <GuideFigure caption="Pemeriksaan eliminasi terjadi di akhir ronde, bukan segera saat angkanya berubah.">
            <Bullets><li><strong>Bangkrut:</strong> Hutang lebih dari Rp25.000.000 pada pemeriksaan akhir ronde. Tepat Rp25.000.000 belum Bangkrut.</li><li><strong>Burnout Total:</strong> Kesehatan 0, atau Level Stress 10 bersamaan dengan Kesehatan ≤3.</li></Bullets>
          </GuideFigure>
        </Section>

        <Section id="hasil" title="7. Siapa yang menang?">
          <Card className="space-y-3">
            <p>Permainan selesai setelah Langkah 24, atau lebih cepat jika tersisa satu pemain yang belum tereliminasi (atau tidak ada). Pemenang yang bertahan ditentukan oleh Skor Kesejahteraan tertinggi. Pemain tereliminasi berada di bawah semua pemain yang bertahan; antarpemain tereliminasi, yang bertahan lebih lama lebih tinggi.</p>
            <GuideFigure caption="Skor berupa poin 0–100, bukan Rupiah. Tiga komponen memiliki bobot sama.">
              <div className="grid gap-2 sm:grid-cols-3"><p className="rounded-lg bg-[#fff3bf] p-3"><strong>Keuangan</strong><br />Harta Bersih dan Hutang</p><p className="rounded-lg bg-[#fff3bf] p-3"><strong>Kesehatan</strong><br />Kesehatan × 10</p><p className="rounded-lg bg-[#fff3bf] p-3"><strong>Ketenangan</strong><br />(10 − Level Stress) × 10</p></div>
            </GuideFigure>
            <details className="ui-note rounded-xl p-4"><summary className="cursor-pointer font-bold">Lihat rumus dan aturan skor seri</summary><p className="mt-2">Harta Bersih = Kekayaan − (Hutang × 1,5). Poin Keuangan = nilai 50 + Harta Bersih / Rp500.000, dibatasi 0–100. Skor Kesejahteraan = (Poin Keuangan + Kesehatan × 10 + (10 − Level Stress) × 10) / 3. Skor ditampilkan sebagai bilangan bulat. Jika skor sama, Hutang lebih kecil menang, lalu Level Stress lebih rendah. Jika masih sama persis, peringkat bersama. Jika pemain tereliminasi pada ronde yang sama, gunakan Skor Sementara saat eliminasi lalu aturan seri tersebut.</p></details>
            <p>Di Hasil Akhir, kamu bisa melihat rincian poin dan refleksi pribadi. Host dapat memilih Main Lagi untuk kembali ke ruang tunggu; pemain lain perlu menekan Siap lagi. Pemain yang tereliminasi tidak ikut Main Lagi.</p>
          </Card>
        </Section>

        <Section id="koneksi" title="8. Kalau koneksi terputus">
          <Card><p>Permainan tidak berhenti. Jika timer giliranmu habis saat terputus, sistem memilih heksa acak; keputusan kalender yang terlewat memakai aturan waktu habis, dan Ajakan masuk dihitung Tolak bila tidak dijawab. Kamu dapat melanjutkan sesi permainan yang masih tersedia dari perangkat dengan sesi tersimpan. Tidak ada bot pengganti, pause, atau mode penonton setelah eliminasi. Pion pemain yang tereliminasi tetap menempati papan.</p></Card>
        </Section>
        <footer className="border-t border-[#3b2a12]/40 pt-4"><BackButton /></footer>
      </div>
    </main>
  );
}
