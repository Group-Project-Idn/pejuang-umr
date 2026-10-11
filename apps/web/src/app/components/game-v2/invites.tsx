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
  onSend: (cardId: string, targetPlayerId: string) => void;
  targets: { playerId: string; name: string }[];
};

/** Kartu Ajakan milikmu: pilih target lalu kirim (satu per ronde). */
export function InviteCardView({ card, pending, onSend, targets }: InviteCardViewProps) {
  if (!card) {
    return (
      <section aria-label="Kartu ajakan" className="grid gap-1 rounded-md border border-garis bg-kartu p-4">
        <h2 className="text-title text-teks-utama">Kartu ajakan</h2>
        <p className="text-body-sm text-teks-sekunder">Kamu belum punya kartu. Kartu baru datang tiap dua bulan.</p>
      </section>
    );
  }
  return (
    <section aria-label="Kartu ajakan" className="grid gap-3 rounded-md border border-garis bg-kartu p-4">
      <h2 className="text-title text-teks-utama">Kartu ajakan</h2>
      <p className="text-body-sm text-teks-utama">{PLAN_LABEL[card.plan]} · motif {MOTIVE_LABEL[card.motive]}</p>
      <form
        className="grid gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const target = String(data.get("target") ?? "");
          if (target) onSend(card.cardId, target);
        }}
      >
        <label className="grid gap-1 text-label text-teks-sekunder">
          Ajak pemain
          <select name="target" required className="min-h-11 rounded-sm border border-garis bg-kartu-tinggi px-3 py-2 text-body text-teks-utama">
            <option value="">Pilih teman...</option>
            {targets.map((target) => (
              <option key={target.playerId} value={target.playerId}>{target.name}</option>
            ))}
          </select>
        </label>
        <Button variant="inverted" type="submit" disabled={pending || targets.length === 0}>
          {pending ? "Mengirim..." : "Kirim ajakan"}
        </Button>
      </form>
    </section>
  );
}

export type IncomingInviteProps = {
  invite: InviteIncomingPayload | null;
  pending: boolean;
  onRespond: (inviteId: string, answer: "join" | "decline") => void;
};

/** Popup Ajakan masuk: terima atau tolak (motif disembunyikan sampai reveal). */
export function IncomingInviteSheet({ invite, pending, onRespond }: IncomingInviteProps) {
  return (
    <BottomSheet open={invite !== null} title="Ajakan masuk" onClose={() => invite && onRespond(invite.inviteId, "decline")}>
      {invite ? (
        <div className="grid gap-3">
          <p className="text-body text-teks-utama">
            <strong>{invite.fromName}</strong> mengajakmu: {PLAN_LABEL[invite.plan]}
          </p>
          <p className="text-body-sm text-teks-sekunder">Motifnya baru terlihat setelah kamu menjawab.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="primary" disabled={pending} onClick={() => onRespond(invite.inviteId, "join")}>
              {pending ? "Menjawab..." : "Ikut"}
            </Button>
            <Button variant="outlined" disabled={pending} onClick={() => onRespond(invite.inviteId, "decline")}>
              Tolak
            </Button>
          </div>
        </div>
      ) : null}
    </BottomSheet>
  );
}
