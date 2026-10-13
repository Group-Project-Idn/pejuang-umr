import { GoldTileDefinitionSchema, type GoldTileDefinition } from "./schema";

// 8 Petak Emas dari katalog master GDD 5.1 v1.14. Tiap game memakai 5 dari 8 tanpa pengulangan.
// Petak Emas hanya punya Rencana, tidak punya Realita. Nilai dipakai apa adanya (1×).

const GOLD_TILE_DEFINITIONS: GoldTileDefinition[] = [
  { id: "lolos-cpns-jalur-murni", title: "Lolos CPNS Jalur Murni", plan: [{ stat: "wealth", delta: 5_000_000 }, { stat: "stress", delta: -3 }] },
  { id: "video-tiktok-tembus-fyp", title: "Video TikTok Tembus FYP", plan: [{ stat: "wealth", delta: 8_000_000 }, { stat: "stress", delta: -2 }] },
  { id: "dapat-warisan-tanah-kampung", title: "Dapat Warisan Tanah Kampung", plan: [{ stat: "wealth", delta: 10_000_000 }, { stat: "stress", delta: -2 }] },
  { id: "menang-undian-bank-bumn", title: "Menang Undian Bank BUMN", plan: [{ stat: "wealth", delta: 7_500_000 }, { stat: "stress", delta: -2 }] },
  { id: "menang-flash-sale-rp10-000", title: "Menang Flash Sale Rp10.000", plan: [{ stat: "wealth", delta: 10_000_000 }, { stat: "stress", delta: -2 }] },
  { id: "giveaway-tiket-vip-konser", title: "Giveaway Tiket VIP Konser", plan: [{ stat: "wealth", delta: 3_000_000 }, { stat: "stress", delta: -3 }] },
  { id: "bonus-kinerja-2x-gaji", title: "Bonus Kinerja 2x Gaji", plan: [{ stat: "wealth", delta: 10_000_000 }, { stat: "stress", delta: -3 }] },
  { id: "proyek-side-job-dibayar-dolar", title: "Proyek Side Job Dibayar Dolar", plan: [{ stat: "wealth", delta: 7_500_000 }, { stat: "stress", delta: -2 }] },
];

export const GOLD_TILES = GOLD_TILE_DEFINITIONS.map((tile) =>
  GoldTileDefinitionSchema.parse(tile),
);
