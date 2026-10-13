import type { InviteCard } from "@pejuang/shared";
import {
  buildInviteConfirmText,
  describeCard,
  formatEffects,
  INVITE_EXPIRED_NOTICE,
  type InviteFlow,
  type InvitePopupState,
  type InviteResultView,
  PLAN_LABEL,
} from "@/lib/invites";
import BottomSheet from "../ui/BottomSheet";
import Button from "../ui/Button";

/** Kartu Ajakan milikmu: Rencana, efek, dan motif (rahasia, hanya pemilik kartu). */
export function InviteCardSheet({
  card,
  open,
  onPickTarget,
  onClose,
}: {
  card: InviteCard | null;
  open: boolean;
  onPickTarget: () => void;
  onClose: () => void;
}) {
  const view = card ? describeCard(card) : null;
  return (
    <BottomSheet open={open && view !== null} title="Kartu Ajakan" onClose={onClose}>
      {view && card ? (
        <div className="grid gap-3">
          <p className="text-body text-teks-utama"><strong>{view.plan}</strong></p>
          <p className="text-body-sm text-teks-utama">Efek jika target ikut: {view.effects}</p>
          <p className="text-body-sm text-teks-sekunder">
            Motif: {view.motive} (hanya kamu yang tahu). Berlaku sampai bulan {card.expiresAtMonth}.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="primary" onClick={onPickTarget}>Pilih target</Button>
            <Button variant="secondary" onClick={onClose}>Tutup</Button>
          </div>
        </div>
      ) : null}
    </BottomSheet>
  );
}

/** Petunjuk memilih pion target; tidak menutupi papan. */
export function InvitePickBanner({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="game-action-message" role="status">
      Ketuk pion pemain yang ingin diajak{" "}
      <button type="button" className="underline" onClick={onCancel}>Batal</button>
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
          <p className="text-body text-teks-utama">{buildInviteConfirmText(targetName, plan)}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="primary" disabled={pending} onClick={onConfirm}>
              {pending ? "Mengirim..." : "Ajak"}
            </Button>
            <Button variant="secondary" disabled={pending} onClick={onCancel}>Batal</Button>
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
      <p className="text-body text-teks-utama">
        <strong>{invite.fromName}</strong> mengajakmu: {PLAN_LABEL[invite.plan]}
      </p>
      <p className="text-body-sm text-teks-utama">Efek jika ikut: {formatEffects(invite.planEffects)}</p>
      <p className="text-body-sm text-teks-sekunder" role="timer">Sisa waktu menjawab: {secondsLeft} detik</p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="primary" disabled={pending} onClick={() => onRespond(invite.inviteId, "join")}>
          {pending ? "..." : "Ikut"}
        </Button>
        <Button variant="secondary" disabled={pending} onClick={() => onRespond(invite.inviteId, "decline")}>
          {pending ? "..." : "Tolak"}
        </Button>
      </div>
    </div>
  );
  if (compact) {
    return (
      <section
        role="dialog"
        aria-label="Ada ajakan buat kamu"
        className="fixed right-4 top-4 z-30 w-72 rounded-lg border border-garis bg-kartu p-4 text-teks-utama"
      >
        {body}
      </section>
    );
  }
  return (
    <BottomSheet open title="Ada ajakan buat kamu" onClose={() => undefined}>
      {body}
    </BottomSheet>
  );
}

/** Hasil Ajakan di Fase Pembalikan: jawaban, motif, dan efek untukmu. */
export function InviteResultsView({
  results,
  onDismiss,
}: {
  results: InviteResultView[];
  onDismiss: (inviteId: string) => void;
}) {
  const first = results[0];
  return (
    <BottomSheet open={first !== undefined} title="Hasil Ajakan" onClose={() => first && onDismiss(first.inviteId)}>
      {first ? (
        <div className="grid gap-3">
          <p className="text-body text-teks-utama"><strong>{first.title}</strong></p>
          <p className="text-body-sm text-teks-utama">{first.answerText}</p>
          <p className="text-body-sm text-teks-utama">{first.motiveText}</p>
          <p className="text-body-sm text-teks-utama">Efek untukmu: {first.effectsText}</p>
          <Button variant="primary" onClick={() => onDismiss(first.inviteId)}>
            {results.length > 1 ? `Lanjut (${results.length - 1} lagi)` : "Tutup"}
          </Button>
        </div>
      ) : null}
    </BottomSheet>
  );
}
