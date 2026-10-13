import type { ReflectionInput } from "./types";

/** Teks instruksi (system) dan data pemain (user) untuk LLM. Belum dipanggil provider mana pun. */
export interface ReflectionPrompt {
  system: string;
  user: string;
}

const SYSTEM_INSTRUCTIONS = [
  "Kamu menulis Refleksi untuk satu pemain game edukasi keuangan \"Pejuang UMR: Jakarta Survival\".",
  "Gunakan Bahasa Indonesia santai dan sapa pemain dengan \"kamu\".",
  "Nada suportif dan tidak menghakimi. Jangan menyalahkan, jangan menyindir.",
  "Pakai istilah game apa adanya: Kekayaan, Hutang, Kesehatan, Level Stress, Rencana, Realita, Zonk, Ajakan, Doom Spending.",
  "Bahas pola keputusan pemain dan dampaknya ke keempat indikator (Kekayaan, Hutang, Kesehatan, Level Stress), hanya dari data yang diberikan.",
  "Ajakan dari atau ke pemain lain cukup disebut \"pemain lain\". Jangan mengarang nama.",
  "Tulis summary 1-2 kalimat dan 1-3 insight (title dan body singkat).",
  "Gagasan dari buku keuangan (misalnya The Psychology of Money oleh Morgan Housel) boleh dipakai hanya sebagai parafrase. Isi field reference dengan judul dan penulis, tanpa kutipan panjang.",
  "Balas HANYA dengan JSON tanpa teks lain, sesuai bentuk:",
  "{\"source\":\"ai\",\"summary\":string,\"insights\":[{\"title\":string,\"body\":string,\"reference\"?:string}]}",
].join("\n");

/** Fungsi murni: hanya memakai data satu pemain dari `input`. */
export function buildReflectionPrompt(input: ReflectionInput): ReflectionPrompt {
  return {
    system: SYSTEM_INSTRUCTIONS,
    user: `Data pemain (JSON):\n${JSON.stringify(input)}`,
  };
}
