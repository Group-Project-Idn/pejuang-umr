import type { Snapshot } from "@pejuang/shared";
import { formatRupiah } from "@pejuang/shared";

type GameResult = NonNullable<Snapshot["result"]>;

export async function createResultsImage(result: GameResult): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas tidak tersedia.");

  context.fillStyle = "#263440";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#f5d56b";
  context.strokeStyle = "#483629";
  context.lineWidth = 10;
  context.beginPath();
  context.roundRect(34, 30, 1132, 570, 28);
  context.fill();
  context.stroke();

  context.fillStyle = "#382b22";
  context.font = "900 48px system-ui, sans-serif";
  context.fillText("HASIL AKHIR", 78, 108);
  context.font = "600 24px system-ui, sans-serif";
  context.fillText("Pejuang UMR · Evaluasi kinerja 12 bulan", 80, 148);

  const ranking = [...result.ranking].sort((first, second) => first.rank - second.rank);
  ranking.forEach((entry, index) => {
    const top = 205 + index * 84;
    context.fillStyle = index === 0 ? "#fff0b1" : "#f8e6a9";
    context.fillRect(78, top - 36, 1044, 66);
    context.fillStyle = "#382b22";
    context.font = "800 28px system-ui, sans-serif";
    context.fillText(`${entry.rank}. ${entry.name}`, 100, top + 4);
    context.font = "600 22px system-ui, sans-serif";
    context.fillText(formatRupiah(entry.netWorth), 570, top + 4);
    context.textAlign = "right";
    context.font = "900 28px system-ui, sans-serif";
    context.fillText(`${Math.round(entry.finalScore)} poin`, 1094, top + 4);
    context.textAlign = "left";
  });

  context.font = "700 18px system-ui, sans-serif";
  context.fillText("Harta Bersih dan Skor Kesejahteraan", 80, 560);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Gambar hasil tidak dapat dibuat."));
    }, "image/png");
  });
}
