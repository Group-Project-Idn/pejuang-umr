"use client";

import { RoomCodeSchema, type GuestResponse } from "@pejuang/shared";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AVATAR_OPTIONS, getAvatarSrc } from "@/lib/avatars";
import { createOrUpdateGuest, getHealth, lookupRoom } from "@/lib/api-client";
import { readGuestSession, writeGuestSession, clearGuestSession } from "@/lib/guest-session";
import { createRequestId } from "@/lib/request-id";
import { readRoomCode, writeRoomCode } from "@/lib/room-session";
import { connectGameSocket, disconnectSocket } from "@/lib/socket";
import { getResumableRoomCode } from "@/lib/lobby-resume";
import { PROFILE_COPY, profileFormDefaults, saveProfile } from "./profile-edit";

export const LOBBY_COPY = {
  title: "RUANG RAPAT",
  playerCount: "Mabar 2-4 pemain",
  identityCardTitle: "Kartu Identitas Pemain",
  editName: "Edit Profile",
  roomCodePlaceholder: "Contoh: UMR-4821",
  resumeTitle: "Lanjutkan permainan",
  gameSummary: "2-4 pemain | 24 langkah | ±30 menit",
} as const;

export function toRoomErrorMessage(code: string): string {
  switch (code) {
    case "UNAUTHORIZED": return "Sesi tamu berakhir. Silakan masuk kembali.";
    case "ROOM_NOT_FOUND": return "Kode room tidak ketemu.";
    case "ROOM_FULL": return "Room sudah penuh (4/4). Minta kode baru ke host.";
    case "ROOM_LOCKED": return "Room sudah mulai atau terkunci.";
    case "HEALTH_CHECK_FAILED": return "Server bermasalah. Periksa koneksi lalu tekan Coba lagi.";
    default: return `Gagal: ${code}`;
  }
}

export function LobbyScreen({ initialCode = "", hideHomeButton = false }: { initialCode?: string; hideHomeButton?: boolean }) {
  const router = useRouter();
  const [session, setSession] = useState<GuestResponse | null>(null);
  const [guestName, setGuestName] = useState("");
  const [avatarId, setAvatarId] = useState(AVATAR_OPTIONS[0]!.id);
  const [guestOpen, setGuestOpen] = useState(false);
  const [guestError, setGuestError] = useState("");
  const [roomCode, setRoomCode] = useState(initialCode.toUpperCase());
  const [codeError, setCodeError] = useState("");
  const [resumeCode, setResumeCode] = useState<string | null>(null);
  const [serverState, setServerState] = useState<"memeriksa" | "normal" | "bermasalah">("memeriksa");
  const [serverVersion, setServerVersion] = useState("");
  const [busy, setBusy] = useState<"idle" | "simpan" | "buat" | "cek" | "gabung">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const stored = readGuestSession();
    const lastRoom = readRoomCode();
    queueMicrotask(() => {
      if (stored) {
        setSession(stored);
        setGuestName(stored.name);
        setAvatarId(stored.avatarId);
      } else setGuestOpen(true);
    });
    let active = true;
    if (stored && lastRoom) {
      lookupRoom(lastRoom, stored.token).then((room) => {
        if (active) setResumeCode(getResumableRoomCode(room));
      }).catch(() => {
        // Gangguan jaringan tidak menghapus kode tersimpan; kartu belum terverifikasi.
      });
    }
    getHealth().then((h) => {
      setServerState("normal");
      setServerVersion(h.version);
    }).catch(() => setServerState("bermasalah"));
    return () => { active = false; };
  }, []);

  const serverTrouble = serverState === "bermasalah";
  const working = busy !== "idle";

  function recoverGuestSession(code: string) {
    if (code !== "UNAUTHORIZED") return;
    clearGuestSession();
    disconnectSocket();
    setSession(null);
    setResumeCode(null);
    setGuestOpen(true);
  }

  async function submitGuest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGuestError("");
    setBusy("simpan");
    const result = await saveProfile({ name: guestName, avatarId }, session, { createOrUpdateGuest, writeGuestSession });
    setBusy("idle");
    if (!result.ok) {
      if (result.code === "UNAUTHORIZED") recoverGuestSession(result.code);
      setGuestError(result.message);
      return;
    }
    setSession(result.session);
    setGuestName(result.session.name);
    setAvatarId(result.session.avatarId);
    setGuestOpen(false);
    setMessage(session ? PROFILE_COPY.savedEdit : PROFILE_COPY.savedGuest);
  }

  function openEditProfile() {
    const defaults = profileFormDefaults(session, AVATAR_OPTIONS[0]!.id);
    setGuestName(defaults.name);
    setAvatarId(defaults.avatarId);
    setGuestError("");
    setGuestOpen(true);
  }

  async function createRoom() {
    if (!session || working || serverTrouble) return;
    setMessage("");
    setBusy("buat");
    try {
      const socket = await connectGameSocket(session.token);
      const res = await new Promise<{ ok: boolean; error?: string; room?: { code: string } }>((resolve) => {
        socket.timeout(5000).emit("room:create", { requestId: createRequestId() }, (err, ack) => {
          if (err) return resolve({ ok: false, error: "HEALTH_CHECK_FAILED" });
          resolve(ack as { ok: boolean; error?: string; room?: { code: string } });
        });
      });
      if (!res.ok || !res.room) {
        recoverGuestSession(res.error ?? "INTERNAL");
        setMessage(toRoomErrorMessage(res.error ?? "INTERNAL"));
        return;
      }
      writeRoomCode(res.room.code);
      router.push(`/room/${res.room.code}`);
    } catch (error) {
      recoverGuestSession(error instanceof Error ? error.message : "INTERNAL");
      setMessage(toRoomErrorMessage(error instanceof Error ? error.message : "INTERNAL"));
    } finally {
      setBusy("idle");
    }
  }

  async function joinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || working || serverTrouble) return;
    const code = roomCode.trim().toUpperCase();
    if (!RoomCodeSchema.safeParse(code).success) {
      setCodeError("Kode room harus berbentuk UMR-1234.");
      return;
    }
    setCodeError("");
    setMessage("");
    setBusy("cek");
    try {
      const lookup = await lookupRoom(code, session.token);
      if (!lookup.joinable) {
        setCodeError(toRoomErrorMessage(lookup.reason ?? "ROOM_LOCKED"));
        return;
      }
      setBusy("gabung");
      const socket = await connectGameSocket(session.token);
      const res = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
        socket.timeout(5000).emit("room:join", { requestId: createRequestId(), roomCode: code }, (err, ack) => {
          if (err) return resolve({ ok: false, error: "HEALTH_CHECK_FAILED" });
          resolve(ack as { ok: boolean; error?: string });
        });
      });
      if (!res.ok) {
        recoverGuestSession(res.error ?? "INTERNAL");
        setCodeError(toRoomErrorMessage(res.error ?? "INTERNAL"));
        return;
      }
      writeRoomCode(code);
      router.push(`/room/${code}`);
    } catch (error) {
      recoverGuestSession(error instanceof Error ? error.message : "INTERNAL");
      setCodeError(toRoomErrorMessage(error instanceof Error ? error.message : "INTERNAL"));
    } finally {
      setBusy("idle");
    }
  }

  function retryServer() {
    setServerState("memeriksa");
    getHealth().then((h) => {
      setServerState("normal");
      setServerVersion(h.version);
      setMessage("");
    }).catch(() => setServerState("bermasalah"));
  }

  function pasteCode() {
    if (!navigator.clipboard) {
      setMessage("Clipboard tidak tersedia. Ketik kode room secara manual.");
      return;
    }
    navigator.clipboard.readText().then((text) => {
      const cleaned = text.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 8);
      if (cleaned) setRoomCode(cleaned);
    }).catch(() => setMessage("Clipboard tidak bisa dibaca di browser ini."));
  }

  const serverLabel =
    serverState === "memeriksa"
      ? "Memeriksa..."
      : serverState === "normal"
        ? `Normal${serverVersion ? ` · v${serverVersion}` : ""}`
        : "Bermasalah";

  return (
    <main className="lobby-desk lobby-page min-h-screen text-[#3b2a12]">
      <div className="lobby-viewport mx-auto w-full">
        <div className="lobby-window overflow-hidden border-2 border-[#3b2a12]/70 bg-[#2b3a4e]">
          <div className="grid gap-2 border-b border-black/20 bg-[#2b3a4e] px-3 py-2 sm:flex sm:items-center sm:justify-between">
            {hideHomeButton ? null : (<button type="button" onClick={() => router.push("/lobby")} className="lobby-comic-btn w-fit rounded-lg bg-[#f5a623] px-3 py-2 text-sm font-bold">← Kembali ke Lobby</button>)}
            <p role="status" className={`w-fit rounded-lg px-3 py-1.5 text-sm font-semibold ${serverTrouble ? "bg-[#f4b7ae] text-[#7c2a19]" : "bg-[#cde9cf] text-[#1e4622]"}`}>
              Server Jakarta Pusat: {serverLabel}
            </p>
          </div>
          <div className="lobby-stage relative bg-[#202a38] p-3 sm:p-4">
            <div aria-hidden="true" className="lobby-folder-tab absolute -top-1 left-6 h-7 w-44" />
            {/* RESUME-DI-SINI */}
            {resumeCode ? (
              <section aria-label={LOBBY_COPY.resumeTitle} className="lobby-paper-card mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl p-3">
                <div>
                  <h2 className="text-lg font-extrabold">{LOBBY_COPY.resumeTitle}</h2>
                  <p className="text-sm">Room terakhir kamu: <strong>{resumeCode}</strong></p>
                </div>
                <button type="button" onClick={() => router.push(`/room/${resumeCode}`)} className="lobby-comic-btn rounded-lg bg-[#7fb0f5] px-4 py-2 font-bold text-[#1f3f73]">Lanjutkan</button>
              </section>
            ) : null}
            <div className="lobby-folder lobby-main-folder relative grid gap-3 rounded-xl border-2 border-[#3b2a12]/70 p-3 sm:p-4 md:grid-cols-[0.8fr_1fr]">
              <section aria-labelledby="ruang-rapat-title" className="grid content-start gap-2 pl-4">
                <h1 id="ruang-rapat-title" className="lobby-main-title font-black leading-[1.05]">{LOBBY_COPY.title}</h1>
                <p className="text-sm font-semibold">{LOBBY_COPY.playerCount}</p>
                <p className="lobby-stamp w-fit rounded px-3 py-1 text-lg font-black">CONFIDENTIAL</p>
                <div className="lobby-paper-card grid gap-1.5 rounded-xl p-2 text-xs font-medium sm:text-sm">
                  <p>{LOBBY_COPY.gameSummary}</p>
                  <p>1 permainan = 12 bulan. Timer giliran diatur host di Room.</p>
                </div>
              </section>
              <section aria-label="Kartu identitas dan room" className="grid content-start gap-2">
                <div className="lobby-paper-card grid gap-2 rounded-xl p-2">
                  <div className="flex items-start gap-2">
                    <span className="relative block h-20 w-16 shrink-0 overflow-hidden rounded-md border-2 border-[#3b2a12] bg-[#cfd8e6]">
                      {session ? (<Image src={getAvatarSrc(session.avatarId)} alt={`Avatar ${session.name}`} fill sizes="80px" className="object-cover" />) : (<span className="grid h-full w-full place-items-center text-2xl" aria-hidden="true">🙂</span>)}
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-base font-extrabold">{LOBBY_COPY.identityCardTitle}</h2>
                      <p className="truncate text-lg font-bold leading-tight">{session?.name ?? "Belum masuk"}</p>
                      <p className="text-sm">Pegawai Biasa</p>
                      <button type="button" onClick={openEditProfile} className="lobby-comic-btn mt-1 min-h-9 rounded-lg bg-[#7fb0f5] px-3 py-1.5 text-sm font-bold text-[#1f3f73]">{LOBBY_COPY.editName}</button>
                    </div>
                  </div>
                </div>
                <button type="button" onClick={createRoom} disabled={!session || working || serverTrouble} className="lobby-comic-btn lobby-primary-action rounded-xl bg-[#8bd450] font-black text-[#2d5a12]">{busy === "buat" ? "MEMBUAT..." : "BUAT ROOM (HOST)"}</button>
                <form onSubmit={joinRoom} className="lobby-paper-card grid gap-1.5 rounded-xl p-2">
                  <label htmlFor="kode-room" className="text-base font-extrabold tracking-wide">KODE ROOM</label>
                  <div className="lobby-code-actions flex gap-2">
                    <input id="kode-room" value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} placeholder={LOBBY_COPY.roomCodePlaceholder} maxLength={8} autoComplete="off" aria-invalid={codeError ? true : undefined} aria-describedby={codeError ? "kode-room-error" : undefined} className="min-h-10 min-w-0 flex-1 rounded-lg border-2 border-[#3b2a12]/70 bg-[#fbf3dd] px-2 py-1.5 text-lg font-bold uppercase tracking-wider placeholder:text-xs placeholder:font-medium placeholder:normal-case placeholder:text-[#85837c] sm:px-3 sm:placeholder:text-sm" />
                    <button type="button" onClick={pasteCode} className="lobby-comic-btn min-h-10 rounded-lg bg-[#efe0b8] px-2 text-xs font-bold sm:px-3 sm:text-sm">Tempel</button>
                    <button type="submit" disabled={!session || working || serverTrouble} className="lobby-comic-btn min-h-10 rounded-lg bg-[#7fb0f5] px-3 text-base font-black text-[#1f3f73] sm:px-4">{busy === "cek" || busy === "gabung" ? "..." : "GABUNG"}</button>
                  </div>
                  {codeError ? (<p id="kode-room-error" role="alert" className="rounded-lg bg-[#fae2dc] px-3 py-2 text-sm font-semibold text-[#7c2a19]">{codeError}</p>) : null}
                </form>
                <div className="flex items-center justify-between gap-2">
                  <button type="button" onClick={() => router.push("/cara-main")} className="min-h-11 rounded-lg px-4 py-2 font-semibold underline decoration-2 underline-offset-4">Cara Main</button>
                  {serverTrouble ? (<button type="button" onClick={retryServer} className="lobby-comic-btn min-h-11 rounded-lg bg-[#f5a623] px-4 py-2 font-bold">Coba lagi</button>) : null}
                </div>
                {message ? (<p role="status" className="rounded-lg bg-[#3b2a12]/85 px-3 py-2 text-sm font-medium text-[#fbe6b1]">{message}</p>) : null}
              </section>
            </div>
          </div>
        </div>
      </div>
      {/* GUEST-DI-SINI */}
      {guestOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="presentation" onClick={() => session && setGuestOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="guest-title" onClick={(e) => e.stopPropagation()} className="lobby-folder grid w-full max-w-md gap-3 rounded-2xl border-2 border-[#3b2a12] p-5">
            <h2 id="guest-title" className="text-2xl font-black">{session ? PROFILE_COPY.editTitle : PROFILE_COPY.guestTitle}</h2>
            <form onSubmit={submitGuest} className="grid gap-3">
              <label className="grid gap-1 text-sm font-bold">Nama (2-20 karakter)
                <input value={guestName} onChange={(e) => setGuestName(e.target.value)} maxLength={20} minLength={2} autoComplete="nickname" placeholder="Nama panggilan kamu" className="min-h-12 rounded-lg border-2 border-[#3b2a12]/70 bg-[#fbf3dd] px-3 py-2 text-lg font-semibold" />
              </label>
              <fieldset className="grid gap-2">
                <legend className="text-sm font-bold">Pilih avatar</legend>
                <div className="grid grid-cols-4 gap-2">
                  {AVATAR_OPTIONS.map((option) => (
                    <button key={option.id} type="button" onClick={() => setAvatarId(option.id)} aria-pressed={avatarId === option.id} aria-label={`Pilih avatar ${option.name}`} className={`grid justify-items-center gap-1 rounded-xl border-2 p-2 ${avatarId === option.id ? "border-[#3b2a12] bg-white/70" : "border-transparent bg-white/30"}`}>
                      <span className="relative block h-16 w-14 overflow-hidden rounded-lg border border-[#3b2a12]/50 bg-[#cfd8e6]"><Image src={option.src} alt="" fill sizes="56px" className="object-cover" /></span>
                      <span className="text-xs font-bold">{option.name}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
              {guestError ? (<p role="alert" className="rounded-lg bg-[#fae2dc] px-3 py-2 text-sm font-semibold text-[#7c2a19]">{guestError}</p>) : null}
              <p className="text-xs">Riwayat permainan tidak tersimpan untuk tamu.</p>
              <button type="submit" className="lobby-comic-btn min-h-12 rounded-xl bg-[#8bd450] text-lg font-black text-[#2d5a12]">{busy === "simpan" ? "MENYIMPAN..." : session ? "Simpan" : "Masuk"}</button>
              {session ? (<button type="button" onClick={() => setGuestOpen(false)} className="min-h-11 rounded-lg px-4 py-2 font-semibold underline underline-offset-4">Batal</button>) : null}
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
