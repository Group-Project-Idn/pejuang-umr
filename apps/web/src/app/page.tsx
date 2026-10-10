"use client";

import { GuestRequestSchema, RoomCodeSchema, type GuestResponse } from "@pejuang/shared";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { createOrUpdateGuest, getHealth } from "@/lib/api-client";
import {
  clearGuestSession,
  readGuestSession,
  writeGuestSession,
} from "@/lib/guest-session";
import { createRequestId } from "@/lib/request-id";
import { writeRoomCode } from "@/lib/room-session";
import { disconnectSocket, getSocket } from "@/lib/socket";

type ConnectionState =
  | "belum terhubung"
  | "menghubungkan"
  | "terhubung"
  | "terputus"
  | "sesi tidak valid";

export default function Home() {
  const router = useRouter();
  const [session, setSession] = useState<GuestResponse | null>(null);
  const [name, setName] = useState("Pejuang UMR");
  const [avatarId, setAvatarId] = useState("avatar-01");
  const [roomCode, setRoomCode] = useState("");
  const [serverStatus, setServerStatus] = useState("memeriksa...");
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("belum terhubung");
  const [message, setMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<
    "guest" | "create" | "join" | null
  >(null);

  useEffect(() => {
    const stored = readGuestSession();
    if (stored) queueMicrotask(() => {
      setSession(stored);
      setName(stored.name);
      setAvatarId(stored.avatarId);
      setConnectionState("menghubungkan");
    });
    getHealth()
      .then((health) => setServerStatus(`normal · v${health.version}`))
      .catch(() => setServerStatus("bermasalah"));
  }, []);

  useEffect(() => {
    if (!session) return;
    const socket = getSocket(session.token);
    const onConnect = () => setConnectionState("terhubung");
    const onDisconnect = () => setConnectionState("terputus");
    const onConnectError = (error: Error) => {
      if (error.message === "UNAUTHORIZED") {
        clearGuestSession();
        setSession(null);
        setConnectionState("sesi tidak valid");
        return;
      }
      setConnectionState("terputus");
    };
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.connect();
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
    };
  }, [session]);

  async function submitGuest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const parsed = GuestRequestSchema.safeParse({ name, avatarId });
    if (!parsed.success) {
      setMessage("Nama harus 2–20 karakter dan memakai karakter yang valid.");
      return;
    }
    setPendingAction("guest");
    try {
      const nextSession = await createOrUpdateGuest(parsed.data, session?.token);
      writeGuestSession(nextSession);
      setConnectionState("menghubungkan");
      setSession(nextSession);
      setMessage(session ? "Identitas diperbarui." : "Sesi tamu dibuat.");
    } catch (error) {
      const code = error instanceof Error ? error.message : "INTERNAL";
      if (code === "UNAUTHORIZED") {
        clearGuestSession();
        disconnectSocket();
        setSession(null);
      }
      setMessage(`Gagal: ${code}`);
    } finally {
      setPendingAction(null);
    }
  }

  function createRoom() {
    if (!session) return;
    setPendingAction("create");
    setMessage("");
    getSocket(session.token)
      .timeout(3_000)
      .emit("room:create", { requestId: createRequestId() }, (error, response) => {
        setPendingAction(null);
        if (error) return setMessage("Server tidak merespons. Coba lagi.");
        if (!response.ok) return setMessage(`Gagal: ${response.error}`);
        writeRoomCode(response.room.code);
        router.push(`/room/${response.room.code}`);
      });
  }

  function joinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    const parsed = RoomCodeSchema.safeParse(roomCode.trim().toUpperCase());
    if (!parsed.success) {
      setMessage("Kode room harus berbentuk UMR-1234.");
      return;
    }
    setPendingAction("join");
    setMessage("");
    getSocket(session.token)
      .timeout(3_000)
      .emit(
        "room:join",
        { requestId: createRequestId(), roomCode: parsed.data },
        (error, response) => {
          setPendingAction(null);
          if (error) return setMessage("Server tidak merespons. Coba lagi.");
          if (!response.ok) return setMessage(`Gagal: ${response.error}`);
          writeRoomCode(response.room.code);
          router.push(`/room/${response.room.code}`);
        },
      );
  }

  function logout() {
    clearGuestSession();
    disconnectSocket();
    setSession(null);
    setConnectionState("belum terhubung");
    setMessage("Sesi lokal dihapus.");
  }

  const connected = connectionState === "terhubung";

  return (
    <main className="min-h-screen bg-stone-950 px-6 py-12 text-stone-100">
      <div className="mx-auto grid max-w-4xl gap-8">
        <header>
          <p className="text-sm uppercase tracking-[0.3em] text-amber-400">Multiplayer lobby</p>
          <h1 className="mt-2 text-4xl font-bold">Pejuang UMR</h1>
          <p className="mt-3 text-stone-300">Buat identitas tamu, lalu buat room atau bergabung memakai kode.</p>
        </header>

        <section className="grid gap-3 rounded-2xl border border-stone-700 bg-stone-900 p-6 sm:grid-cols-3">
          <p>Server: <strong>{serverStatus}</strong></p>
          <p>Socket: <strong>{connectionState}</strong></p>
          <p>Player: <strong>{session?.playerId ?? "belum ada sesi"}</strong></p>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={submitGuest} className="grid gap-4 rounded-2xl border border-stone-700 bg-stone-900 p-6">
            <h2 className="text-xl font-bold">Identitas pemain</h2>
            <label className="grid gap-2">
              <span>Nama pemain</span>
              <input value={name} onChange={(event) => setName(event.target.value)} className="rounded-lg border border-stone-600 bg-stone-950 px-4 py-3" minLength={2} maxLength={20} />
            </label>
            <label className="grid gap-2">
              <span>Avatar ID</span>
              <input value={avatarId} onChange={(event) => setAvatarId(event.target.value)} className="rounded-lg border border-stone-600 bg-stone-950 px-4 py-3" />
            </label>
            <button type="submit" disabled={pendingAction !== null} className="rounded-lg bg-amber-400 px-4 py-3 font-bold text-stone-950 disabled:opacity-50">
              {pendingAction === "guest" ? "Menyimpan..." : session ? "Perbarui identitas" : "Masuk sebagai tamu"}
            </button>
          </form>

          <section className="grid content-start gap-4 rounded-2xl border border-stone-700 bg-stone-900 p-6">
            <h2 className="text-xl font-bold">Room</h2>
            <button type="button" onClick={createRoom} disabled={!session || !connected || pendingAction !== null} className="rounded-lg bg-emerald-500 px-4 py-3 font-bold text-stone-950 disabled:opacity-40">
              {pendingAction === "create" ? "Membuat room..." : "Buat room baru"}
            </button>
            <div className="flex items-center gap-3 text-stone-500"><span className="h-px flex-1 bg-stone-700" />atau<span className="h-px flex-1 bg-stone-700" /></div>
            <form onSubmit={joinRoom} className="grid gap-3">
              <label className="grid gap-2">
                <span>Kode room</span>
                <input value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} placeholder="UMR-1234" maxLength={8} className="rounded-lg border border-stone-600 bg-stone-950 px-4 py-3 uppercase" />
              </label>
              <button type="submit" disabled={!session || !connected || pendingAction !== null} className="rounded-lg border border-amber-400 px-4 py-3 font-bold text-amber-300 disabled:opacity-40">
                {pendingAction === "join" ? "Bergabung..." : "Gabung room"}
              </button>
            </form>
          </section>
        </div>

        <button type="button" onClick={logout} disabled={!session} className="w-fit rounded-lg border border-stone-600 px-4 py-3 disabled:opacity-40">Hapus sesi lokal</button>
        {message ? <p role="status" className="rounded-lg bg-stone-800 px-4 py-3 text-amber-200">{message}</p> : null}
      </div>
    </main>
  );
}
