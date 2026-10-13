"use client";

import { formatRupiah, type PrivateStatus } from "@pejuang/shared";
import CategoryIcon from "./CategoryIcon";

function Meter({
  value,
  color,
}: {
  value: number;
  color: string;
}) {
  const percentage = Math.max(0, Math.min(100, value * 10));
  return (
    <div className="meter-track">
      <span style={{ width: `${percentage}%`, background: color }} />
    </div>
  );
}

export default function StatusPanel({
  status,
}: {
  status: PrivateStatus | null;
}) {
  return (
    <aside className="paper-panel status-panel">
      <p className="panel-kicker">Kartu status pribadi</p>
      <p className="privacy-note">▣ Hanya kamu yang melihat</p>
      {status ? (
        <div className="status-list">
          <div className="status-row">
            <span className="status-icon coin-icon">●</span>
            <div><small>Kekayaan</small><strong>{formatRupiah(status.wealth)}</strong></div>
          </div>
          <div className="status-row">
            <span className="status-icon debt-icon">−</span>
            <div><small>Hutang</small><strong>{formatRupiah(status.debt)}</strong></div>
          </div>
          <div className="status-row">
            <span className="status-icon health-icon">♥</span>
            <div><small>Kesehatan</small><Meter value={status.health} color="#72b85d" /></div>
            <b>{status.health}/10</b>
          </div>
          <div className="status-row">
            <span className="status-icon stress-icon">ϟ</span>
            <div><small>Level stres</small><Meter value={status.stress} color="#ef6d5d" /></div>
            <b>{status.stress}/10</b>
          </div>
        </div>
      ) : (
        <p className="empty-status">Status akan muncul saat giliran permainan aktif.</p>
      )}
      <div className="tile-legend">
        <p>Kamus petak</p>
        <span><b><CategoryIcon category="work" size={16} /></b> Kerja (Karier)</span>
        <span><b><CategoryIcon category="social" size={16} /></b> Sosial</span>
        <span><b><CategoryIcon category="health" size={16} /></b> Kesehatan</span>
        <span><b><CategoryIcon category="finance" size={16} /></b> Keuangan / Rezeki</span>
      </div>
    </aside>
  );
}