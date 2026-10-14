import type { InviteCard } from "@pejuang/shared";
import {
  buildInviteConfirmText,
  describeCard,
  formatEffects,
  INVITE_EXPIRED_NOTICE,
  type InviteFlow,
  type InvitePopupState,
  PLAN_LABEL,
} from "@/lib/invites";
import BottomSheet from "../ui/BottomSheet";
import Button from "../ui/Button";
import PopupFrame from "../ui/PopupFrame";
import Card from "../ui/Card";

/** Kartu milik pemain tetap di HUD; menampilkan isi atau slot kosong, terlepas dari giliran. */
export function InviteHandCard({
  card,
  playable,
  selected,
  unavailableReason,
  onSelect,
}: {
  card: InviteCard | null;
  playable: boolean;
  selected: boolean;
  unavailableReason: string;
  onSelect: () => void;
}) {
  const view = card ? describeCard(card) : null;
  return (
    <Card as="aside" title="Kartu Ajakan" className={`invite-hand-card${selected ? " invite-hand-card-selected" : ""}`}>
      {view && card ? <>
        <p className="comic-invite-plan"><strong>{view.plan}</strong></p>
        <p className="comic-effect">Efek jika target ikut: {view.effects}</p>
        <p className="comic-invite-detail">Motif: {view.motive} (hanya kamu yang tahu). Berlaku sampai bulan {card.expiresAtMonth}.</p>
      </> : <p className="comic-invite-detail">Belum ada Kartu Ajakan.</p>}
      <p className="invite-hand-status" role="status">
        {selected ? "Pilih pemain yang disorot di papan atau Papan Skor." : playable ? "Bisa dimainkan sebelum memilih heksa." : unavailableReason}
      </p>
      <Button type="button" variant="primary" disabled={!card || !playable || selected} onClick={onSelect}>
        {selected ? "Memilih target..." : "Pilih kartu"}
      </Button>
    </Card>
  );
}

/** Petunjuk memilih target di atas papan; tidak menutupi papan. */
export function InvitePickBanner({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="ui-folder invite-pick-banner" role="status">
      <span>Pilih pemain yang ingin diajak: klik karakternya di papan atau namanya di Papan Skor</span>
      <Button variant="outlined" onClick={onCancel}>Batal</Button>
    </div>
  );
}

export function InviteConfirmSheet({
  flow,
  targetName,
  plan,
  pending,
  onConfirm,
  onCancel,
}: {
  flow: InviteFlow | null;
  targetName: string;
  plan: InviteCard["plan"] | null;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const open = flow?.step === "confirm" && plan !== null;
  return (
    <BottomSheet open={open} title="Konfirmasi Ajakan" onClose={onCancel}>
      {plan ? (
        <div className="grid gap-3">
          <p className="comic-invite-plan">{buildInviteConfirmText(targetName, plan)}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="primary" disabled={pending} onClick={onConfirm}>
              {pending ? "Mengirim..." : "Ajak"}
            </Button>
            <Button variant="outlined" disabled={pending} onClick={onCancel}>Batal</Button>
          </div>
        </div>
      ) : null}
    </BottomSheet>
  );
}

/**
 * Ajakan masuk: Ikut atau Tolak sebelum hitung mundur habis. Motif tidak ada di payload.
 * Mode compact (target sedang giliran) memakai kartu kecil tanpa lapisan gelap agar heksa menyala tetap bisa diketuk.
 */
export function InviteIncomingView({
  popup,
  expired,
  pending,
  onRespond,
  onDismissExpired,
}: {
  popup: InvitePopupState | null;
  expired: boolean;
  pending: boolean;
  onRespond: (inviteId: string, answer: "join" | "decline") => void;
  onDismissExpired: () => void;
}) {
  if (!popup) {
    return expired ? (
      <p className="game-action-message" role="status">
        {INVITE_EXPIRED_NOTICE}{" "}
        <button type="button" className="underline" onClick={onDismissExpired}>Tutup</button>
      </p>
    ) : null;
  }
  const { invite, secondsLeft, compact } = popup;
  const body = (
    <div className="grid gap-3">
      <p className="comic-invite-plan">
        <strong>{invite.fromName}</strong> mengajakmu: {PLAN_LABEL[invite.plan]}
      </p>
      <p className="comic-effect">Efek jika ikut: {formatEffects(invite.planEffects)}</p>
      <p className="comic-timer" role="timer"><span aria-hidden="true">◷</span> Sisa waktu menjawab: {secondsLeft} detik</p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="primary" disabled={pending} onClick={() => onRespond(invite.inviteId, "join")}>
          {pending ? "..." : "Ikut"}
        </Button>
        <Button variant="outlined" disabled={pending} onClick={() => onRespond(invite.inviteId, "decline")}>
          {pending ? "..." : "Tolak"}
        </Button>
      </div>
    </div>
  );
  if (compact) {
    return (
      <PopupFrame title="Ada ajakan buat kamu" className="comic-dialog-compact">
        {body}
      </PopupFrame>
    );
  }
  return (
    <BottomSheet open title="Ada ajakan buat kamu" onClose={() => undefined}>
      {body}
    </BottomSheet>
  );
}
