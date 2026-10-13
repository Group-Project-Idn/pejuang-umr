import { RealityPoolDefinitionSchema, type RealityPoolDefinition } from "./schema";

// Tumpukan Realita per kategori (GDD 5.2 v1.14). Isi awal: 72 varian lama yang
// dikelompokkan per kategori; Pinjol/Paylater masuk finance-debt.

const REALITY_POOL_DEFINITIONS: RealityPoolDefinition[] = [
  {
    id: "work",
    variants: [
      {
        id: "overtime-project-zonk-1",
        outcome: "zonk",
        text: "Bos marah",
        effects: [
          { stat: "stress", delta: 3 },
          { stat: "health", delta: -2 },
        ],
      },
      {
        id: "overtime-project-zonk-2",
        outcome: "zonk",
        text: "Proyek direvisi total",
        effects: [
          { stat: "stress", delta: 2 },
          { stat: "health", delta: -1 },
        ],
      },
      {
        id: "overtime-project-zonk-3",
        outcome: "zonk",
        text: "Lembur tidak dihitung penuh",
        effects: [{ stat: "wealth", delta: -1_500_000 }],
      },
      {
        id: "overtime-project-safe-1",
        outcome: "safe",
        text: "Proyek selesai tepat waktu",
        effects: [],
      },
      {
        id: "overtime-project-safe-2",
        outcome: "safe",
        text: "Lembur sampai malam, tapi lancar",
        effects: [],
      },
      {
        id: "overtime-project-lucky-1",
        outcome: "lucky",
        text: "Bos puas dan kasih bonus",
        effects: [{ stat: "wealth", delta: 1_000_000 }],
      },
      {
        id: "quick-freelance-zonk-1",
        outcome: "zonk",
        text: "Klien kabur, pemasukan batal",
        effects: [{ stat: "wealth", delta: -1_500_000 }],
      },
      {
        id: "quick-freelance-zonk-2",
        outcome: "zonk",
        text: "Revisi tanpa akhir",
        effects: [
          { stat: "stress", delta: 2 },
          { stat: "health", delta: -1 },
        ],
      },
      {
        id: "quick-freelance-zonk-3",
        outcome: "zonk",
        text: "Laptop error saat deadline",
        effects: [{ stat: "wealth", delta: -750_000 }],
      },
      {
        id: "quick-freelance-safe-1",
        outcome: "safe",
        text: "Klien membayar sesuai janji",
        effects: [],
      },
      {
        id: "quick-freelance-safe-2",
        outcome: "safe",
        text: "Brief jelas, kerjaan mulus",
        effects: [],
      },
      {
        id: "quick-freelance-lucky-1",
        outcome: "lucky",
        text: "Klien puas dan kasih tip",
        effects: [{ stat: "wealth", delta: 750_000 }],
      },
      {
        id: "outstation-trip-zonk-1",
        outcome: "zonk",
        text: "Macet dan masuk angin",
        effects: [{ stat: "health", delta: -2 }],
      },
      {
        id: "outstation-trip-zonk-2",
        outcome: "zonk",
        text: "Uang dinas harus ditalangi dulu",
        effects: [{ stat: "wealth", delta: -1_000_000 }],
      },
      {
        id: "outstation-trip-zonk-3",
        outcome: "zonk",
        text: "Tiket delay semalaman",
        effects: [
          { stat: "stress", delta: 2 },
          { stat: "health", delta: -1 },
        ],
      },
      {
        id: "outstation-trip-safe-1",
        outcome: "safe",
        text: "Perjalanan lancar",
        effects: [],
      },
      {
        id: "outstation-trip-safe-2",
        outcome: "safe",
        text: "Hotel nyaman, tidur cukup",
        effects: [],
      },
      {
        id: "outstation-trip-lucky-1",
        outcome: "lucky",
        text: "Uang saku dinas bersisa",
        effects: [{ stat: "wealth", delta: 750_000 }],
      },
    ],
  },
  {
    id: "social",
    variants: [
      {
        id: "hanging-out-zonk-1",
        outcome: "zonk",
        text: "Patungan membengkak",
        effects: [{ stat: "wealth", delta: -750_000 }],
      },
      {
        id: "hanging-out-zonk-2",
        outcome: "zonk",
        text: "Pulang kemalaman",
        effects: [
          { stat: "health", delta: -1 },
          { stat: "stress", delta: 1 },
        ],
      },
      {
        id: "hanging-out-zonk-3",
        outcome: "zonk",
        text: "Obrolan berujung debat panas",
        effects: [{ stat: "stress", delta: 2 }],
      },
      {
        id: "hanging-out-safe-1",
        outcome: "safe",
        text: "Ngobrol santai, pulang cepat",
        effects: [],
      },
      {
        id: "hanging-out-safe-2",
        outcome: "safe",
        text: "Tempatnya ramai tapi seru",
        effects: [],
      },
      {
        id: "hanging-out-lucky-1",
        outcome: "lucky",
        text: "Ditraktir teman",
        effects: [{ stat: "wealth", delta: 500_000 }],
      },
      {
        id: "old-friend-meetup-zonk-1",
        outcome: "zonk",
        text: "Teman pinjam uang",
        effects: [{ stat: "wealth", delta: -1_000_000 }],
      },
      {
        id: "old-friend-meetup-zonk-2",
        outcome: "zonk",
        text: "Ternyata dia sekarang jualan MLM",
        effects: [{ stat: "stress", delta: 2 }],
      },
      {
        id: "old-friend-meetup-zonk-3",
        outcome: "zonk",
        text: "Ketularan pilek temannya",
        effects: [{ stat: "health", delta: -1 }],
      },
      {
        id: "old-friend-meetup-safe-1",
        outcome: "safe",
        text: "Reuni singkat yang hangat",
        effects: [],
      },
      {
        id: "old-friend-meetup-safe-2",
        outcome: "safe",
        text: "Ngopi sebentar lalu pulang",
        effects: [],
      },
      {
        id: "old-friend-meetup-lucky-1",
        outcome: "lucky",
        text: "Dapat tawaran proyek sampingan",
        effects: [{ stat: "wealth", delta: 1_000_000 }],
      },
      {
        id: "arisan-zonk-1",
        outcome: "zonk",
        text: "Arisan bubar",
        effects: [{ stat: "wealth", delta: -1_500_000 }],
      },
      {
        id: "arisan-zonk-2",
        outcome: "zonk",
        text: "Gosip panas di arisan",
        effects: [{ stat: "stress", delta: 2 }],
      },
      {
        id: "arisan-zonk-3",
        outcome: "zonk",
        text: "Iuran naik mendadak",
        effects: [
          { stat: "wealth", delta: -500_000 },
          { stat: "stress", delta: 1 },
        ],
      },
      {
        id: "arisan-safe-1",
        outcome: "safe",
        text: "Iuran tertib, tidak ada drama",
        effects: [],
      },
      {
        id: "arisan-safe-2",
        outcome: "safe",
        text: "Arisan berjalan biasa saja",
        effects: [],
      },
      {
        id: "arisan-lucky-1",
        outcome: "lucky",
        text: "Dapat giliran arisan",
        effects: [{ stat: "wealth", delta: 3_000_000 }],
      },
      {
        id: "day-trip-zonk-1",
        outcome: "zonk",
        text: "Macet parah di jalan",
        effects: [
          { stat: "stress", delta: 2 },
        ],
      },
      {
        id: "day-trip-zonk-2",
        outcome: "zonk",
        text: "Harga tiket dan makan di tempat wisata mahal",
        effects: [
          { stat: "wealth", delta: -500_000 },
        ],
      },
      {
        id: "day-trip-zonk-3",
        outcome: "zonk",
        text: "Kehujanan di jalan pulang",
        effects: [
          { stat: "health", delta: -1 },
          { stat: "stress", delta: 1 },
        ],
      },
      {
        id: "day-trip-safe-1",
        outcome: "safe",
        text: "Jalan-jalan sesuai rencana",
        effects: [],
      },
      {
        id: "day-trip-safe-2",
        outcome: "safe",
        text: "Pulang capek tapi senang",
        effects: [],
      },
      {
        id: "day-trip-lucky-1",
        outcome: "lucky",
        text: "Dapat promo tiket",
        effects: [
          { stat: "wealth", delta: 250_000 },
        ],
      },
    ],
  },
  {
    id: "health",
    variants: [
      {
        id: "buying-vitamins-zonk-1",
        outcome: "zonk",
        text: "Vitamin abal-abal",
        effects: [{ stat: "health", delta: -1 }],
      },
      {
        id: "buying-vitamins-zonk-2",
        outcome: "zonk",
        text: "Alergi ringan",
        effects: [
          { stat: "health", delta: -1 },
          { stat: "stress", delta: 1 },
        ],
      },
      {
        id: "buying-vitamins-zonk-3",
        outcome: "zonk",
        text: "Salah beli, harga ternyata mahal",
        effects: [{ stat: "wealth", delta: -250_000 }],
      },
      {
        id: "buying-vitamins-safe-1",
        outcome: "safe",
        text: "Minum rutin, hasilnya belum terasa",
        effects: [],
      },
      {
        id: "buying-vitamins-safe-2",
        outcome: "safe",
        text: "Badan terasa sedikit lebih segar",
        effects: [],
      },
      {
        id: "buying-vitamins-lucky-1",
        outcome: "lucky",
        text: "Diskon apotek, uang kembali",
        effects: [{ stat: "wealth", delta: 250_000 }],
      },
      {
        id: "morning-exercise-zonk-1",
        outcome: "zonk",
        text: "Cedera ringan",
        effects: [{ stat: "health", delta: -2 }],
      },
      {
        id: "morning-exercise-zonk-2",
        outcome: "zonk",
        text: "Hujan deras, olahraga batal",
        effects: [{ stat: "stress", delta: 1 }],
      },
      {
        id: "morning-exercise-zonk-3",
        outcome: "zonk",
        text: "Polusi pagi bikin batuk",
        effects: [{ stat: "health", delta: -1 }],
      },
      {
        id: "morning-exercise-safe-1",
        outcome: "safe",
        text: "Lari lancar",
        effects: [],
      },
      {
        id: "morning-exercise-safe-2",
        outcome: "safe",
        text: "Jalan santai keliling komplek",
        effects: [],
      },
      {
        id: "morning-exercise-lucky-1",
        outcome: "lucky",
        text: "Ketemu komunitas lari yang seru",
        effects: [{ stat: "stress", delta: -1 }],
      },
      {
        id: "full-rest-zonk-1",
        outcome: "zonk",
        text: "Tetangga renovasi",
        effects: [{ stat: "stress", delta: 2 }],
      },
      {
        id: "full-rest-zonk-2",
        outcome: "zonk",
        text: "Listrik padam, kamar gerah",
        effects: [{ stat: "health", delta: -1 }],
      },
      {
        id: "full-rest-zonk-3",
        outcome: "zonk",
        text: "Kebanyakan tidur, badan pegal",
        effects: [{ stat: "stress", delta: 1 }],
      },
      {
        id: "full-rest-safe-1",
        outcome: "safe",
        text: "Tidur nyenyak",
        effects: [],
      },
      {
        id: "full-rest-safe-2",
        outcome: "safe",
        text: "Rebahan seharian",
        effects: [],
      },
      {
        id: "full-rest-lucky-1",
        outcome: "lucky",
        text: "Bangun dengan badan sangat segar",
        effects: [{ stat: "health", delta: 1 }],
      },
    ],
  },
  {
    id: "finance",
    variants: [
      {
        id: "self-reward-shopping-zonk-1",
        outcome: "zonk",
        text: "Menyesal setelah checkout",
        effects: [{ stat: "stress", delta: 2 }],
      },
      {
        id: "self-reward-shopping-zonk-2",
        outcome: "zonk",
        text: "Barang rusak saat sampai",
        effects: [{ stat: "wealth", delta: -500_000 }],
      },
      {
        id: "self-reward-shopping-zonk-3",
        outcome: "zonk",
        text: "Ongkir dan pajak membengkak",
        effects: [
          { stat: "wealth", delta: -750_000 },
          { stat: "stress", delta: 1 },
        ],
      },
      {
        id: "self-reward-shopping-safe-1",
        outcome: "safe",
        text: "Barang datang sesuai harapan",
        effects: [],
      },
      {
        id: "self-reward-shopping-safe-2",
        outcome: "safe",
        text: "Dipakai sekali lalu disimpan",
        effects: [],
      },
      {
        id: "self-reward-shopping-lucky-1",
        outcome: "lucky",
        text: "Voucher dan cashback",
        effects: [{ stat: "wealth", delta: 500_000 }],
      },
    ],
  },
  {
    id: "finance-debt",
    variants: [
      {
        id: "online-loan-zonk-1",
        outcome: "zonk",
        text: "Denda dan biaya admin",
        effects: [{ stat: "debt", delta: 1_500_000 }],
      },
      {
        id: "online-loan-zonk-2",
        outcome: "zonk",
        text: "Penagih menelepon terus",
        effects: [{ stat: "stress", delta: 3 }],
      },
      {
        id: "online-loan-zonk-3",
        outcome: "zonk",
        text: "Bunga promo ternyata dihitung harian",
        effects: [
          { stat: "debt", delta: 750_000 },
          { stat: "stress", delta: 1 },
        ],
      },
      {
        id: "online-loan-safe-1",
        outcome: "safe",
        text: "Proses cair cepat",
        effects: [],
      },
      {
        id: "online-loan-safe-2",
        outcome: "safe",
        text: "Dana cair sesuai pengajuan",
        effects: [],
      },
      {
        id: "online-loan-lucky-1",
        outcome: "lucky",
        text: "Biaya admin dibebaskan",
        effects: [{ stat: "stress", delta: -1 }],
      },

    ],
  },
]

export const REALITY_POOLS = REALITY_POOL_DEFINITIONS.map((pool) =>
  RealityPoolDefinitionSchema.parse(pool),
);
