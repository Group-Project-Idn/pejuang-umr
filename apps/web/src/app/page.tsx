"use client";

import { useEffect, useState, type FormEvent } from "react";
import { GuestRequestSchema, type GuestResponse } from "@pejuang/shared";
import { createOrUpdateGuest, getHealth } from "@/lib/api-client";
import {
  clearGuestSession,
  readGuestSession,
  writeGuestSession,
} from "@/lib/guest-session";
import { disconnectSocket, getSocket } from "@/lib/socket";

type ConnectionState =
  | "belum terhubung"
  | "menghubungkan"
  | "terhubung"
  | "terputus"
  | "sesi tidak valid";

export default function Home() {
  const [session, setSession] = useState<GuestResponse | null>(null);
  const [name, setName] = useState("Pejuang UMR");
  const [avatarId, setAvatarId] = useState("avatar-01");
  const [serverStatus, setServerStatus] = useState("memeriksa...");
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("belum terhubung");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setMessage("Nama harus 2–20 karakter dan hanya memakai huruf, angka, spasi, .-' ");
      return;
    }

    setIsSubmitting(true);
    try {
      const nextSession = await createOrUpdateGuest(
        parsed.data,
        session?.token,
      );
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
      setIsSubmitting(false);
    }
  }

  function sendPing() {
    if (!session) return;
    const socket = getSocket(session.token);
    socket.timeout(2_000).emit("ping:test", { name: session.name }, (error, response) => {
      if (error) {
        setMessage("Ping timeout.");
        return;
      }
      setMessage(response.ok ? response.message : `Gagal: ${response.error}`);
    });
  }

  function logout() {
    clearGuestSession();
    disconnectSocket();
    setSession(null);
    setConnectionState("belum terhubung");
    setMessage("Sesi lokal dihapus.");
  }

  return (
    <main className="min-h-screen bg-stone-950 px-6 py-12 text-stone-100">
      <div className="mx-auto grid max-w-3xl gap-8">
        <header>
          <p className="text-sm uppercase tracking-[0.3em] text-amber-400">
            Multiplayer foundation
          </p>
          <h1 className="mt-2 text-4xl font-bold">Pejuang UMR</h1>
          <p className="mt-3 text-stone-300">
            Guest session, health check, dan Socket.IO authentication sudah
            memakai shared API contract.
          </p>
        </header>

        <section className="grid gap-3 rounded-2xl border border-stone-700 bg-stone-900 p-6 sm:grid-cols-2">
          <p>Server: <strong>{serverStatus}</strong></p>
          <p>Socket: <strong>{connectionState}</strong></p>
          <p className="sm:col-span-2">
            Player: <strong>{session?.playerId ?? "belum ada sesi"}</strong>
          </p>
        </section>

        <form
          onSubmit={submitGuest}
          className="grid gap-4 rounded-2xl border border-stone-700 bg-stone-900 p-6"
        >
          <label className="grid gap-2">
            <span>Nama pemain</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-lg border border-stone-600 bg-stone-950 px-4 py-3"
              minLength={2}
              maxLength={20}
            />
          </label>
          <label className="grid gap-2">
            <span>Avatar ID</span>
            <input
              value={avatarId}
              onChange={(event) => setAvatarId(event.target.value)}
              className="rounded-lg border border-stone-600 bg-stone-950 px-4 py-3"
            />
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-amber-400 px-4 py-3 font-bold text-stone-950 disabled:opacity-50"
          >
            {isSubmitting
              ? "Menyimpan..."
              : session
                ? "Perbarui identitas"
                : "Masuk sebagai tamu"}
          </button>
        </form>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={sendPing}
            disabled={!session || connectionState !== "terhubung"}
            className="rounded-lg bg-emerald-500 px-4 py-3 font-bold text-stone-950 disabled:opacity-40"
          >
            Ping authenticated server
          </button>
          <button
            type="button"
            onClick={logout}
            disabled={!session}
            className="rounded-lg border border-stone-600 px-4 py-3 disabled:opacity-40"
          >
            Hapus sesi lokal
          </button>
        </div>

        {message ? (
          <p role="status" className="rounded-lg bg-stone-800 px-4 py-3 text-amber-200">
            {message}
          </p>
        ) : null}
      </div>
    </main>
  );
}
