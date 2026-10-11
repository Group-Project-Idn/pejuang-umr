import type { InviteCard, InviteIncomingPayload, InvitePlan } from "@pejuang/shared";
import BottomSheet from "../ui/BottomSheet";
import Button from "../ui/Button";

const MOTIVE_LABEL = {
  sincere: "Tulus",
  commission: "Komisi",
  trap: "Jebakan",
} as const;

const PLAN_LABEL: Record<InvitePlan, string> = {
  hangout: "Nongkrong bareng",
  morningRun: "Lari pagi",
  jointProject: "Proyek bareng",
  staycation: "Staycation",
};

export type InviteCardViewProps = {
  card: InviteCard | null;
  pending: boolean;
  targets: Array<{ playerId: string; name: string }>;
  onSend: (cardId: string, targetPlayerId: string) => void;
};

/** Kartu Ajakan milikmu: pilih target lalu kirim (motif tetap rahasia). */
export function InviteCardView({ card, pending, targets, onSend }: InviteCardViewProps) {
  if (!card) return null;
  return (
    <form
      className="grid gap-2 rounded-md border border-garis bg-kartu p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const target = String(new FormData(event.currentTarget).get("target") ?? "");
        if (target) onSend(card.cardId, target);
      }}
    >
      <h3 className="text-title text-teks-utama">Kartu ajakan</h3>
      <p className="text-body-sm text-teks-utama">{PLAN_LABEL[card.plan]} · motif {MOTIVE_LABEL[card.motive]}</p>
      <p className="text-label text-teks-sekunder">Berlaku sampai bulan {card.expiresAtMonth}</p>
      <label className="grid gap-1 text-label text-teks-sekunder">
        Target ajakan
        <select name="target" required className="min-h-11 rounded-sm border border-garis bg-kartu-tinggi px-3 py-2 text-body text-teks-utama">
          <option value="">Pilih pemain...</option>
          {targets.map((target) => (
            <option key={target.playerId} value={target.playerId}>{target.name}</option>
          ))}
        </select>
      </label>
      <Button variant="primary" type="submit" disabled={pending || targets.length === 0}>
        {pending ? "Mengirim..." : "Kirim ajakan"}
      </Button>
    </form>
  );
}

export type InviteIncomingViewProps = {
  invite: InviteIncomingPayload | null;
  pending: boolean;
  onRespond: (inviteId: string, answer: "join" | "decline") => void;
};

/** Ajakan masuk: ikut atau tolak dalam 10 detik (timer authoritative dari server). */
export function InviteIncomingView({ invite, pending, onRespond }: InviteIncomingViewProps) {
  return (
    <BottomSheet open={invite !== null} title="Ada ajakan buat kamu" onClose={() => undefined}>
      {invite ? (
        <div className="grid gap-3">
          <p className="text-body text-teks-utama">
            <strong>{invite.fromName}</strong> mengajakmu: {PLAN_LABEL[invite.plan]}
          </p>
          <p className="text-body-sm text-teks-sekunder">
            Motifnya rahasia. Menolak ajakan tulus bikin kamu rugi Rp3jt — tapi ikut ajakan jebakan juga bahaya.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="primary" disabled={pending} onClick={() => onRespond(invite.inviteId, "join")}>
              {pending ? "..." : "Ikut"}
            </Button>
            <Button variant="secondary" disabled={pending} onClick={() => onRespond(invite.inviteId, "decline")}>
              {pending ? "..." : "Tolak"}
            </Button>
          </div>
        </div>
      ) : null}
    </BottomSheet>
  );
}
