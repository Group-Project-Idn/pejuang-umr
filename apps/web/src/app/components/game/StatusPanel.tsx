"use client";

import { formatRupiah, type PrivateStatus } from "@pejuang/shared";
import Badge from "../ui/Badge";
import Card from "../ui/Card";
import ProgressBar from "../ui/ProgressBar";
import CategoryIcon from "./CategoryIcon";

export default function StatusPanel({
  status,
}: {
  status: PrivateStatus | null;
}) {
  return (
    <Card as="aside" className="status-panel" title="Kartu status pribadi">
      <p className="privacy-note">▣ Hanya kamu yang melihat</p>
      {status ? (
        <div className="status-list">
          <div className="status-row">
            <span className="status-icon coin-icon">●</span>
            <div><small>Kekayaan</small><strong>{formatRupiah(status.wealth)}</strong></div>
          </div>
          <div className="status-row">
            <span className="status-icon debt-icon">−</span>
            <div><small>Hutang</small><Badge amount={status.debt} /></div>
          </div>
          <div className="status-row">
            <span className="status-icon health-icon">♥</span>
            <ProgressBar kind="kesehatan" value={status.health} icon="" valueText={`${status.health}/10`} />
          </div>
          <div className="status-row">
            <span className="status-icon stress-icon">ϟ</span>
            <ProgressBar kind="stres" value={status.stress} icon="" valueText={`${status.stress}/10`} />
          </div>
        </div>
      ) : (
        <p className="empty-status">Status akan muncul saat giliran permainan aktif.</p>
      )}
      <div className="tile-legend ui-note">
        <p>Kamus petak</p>
        <span><b><CategoryIcon category="work" size={16} /></b> Kerja (Karier)</span>
        <span><b><CategoryIcon category="social" size={16} /></b> Sosial</span>
        <span><b><CategoryIcon category="health" size={16} /></b> Kesehatan</span>
        <span><b><CategoryIcon category="finance" size={16} /></b> Keuangan / Rezeki</span>
      </div>
    </Card>
  );
}
