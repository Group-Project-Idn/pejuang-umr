"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { PingSchema } from "@pejuang/shared";

export default function Home() {
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState("belum terhubung");
  const [reply, setReply] = useState("");

  useEffect(() => {
    const socket = io("http://localhost:3001");
    socketRef.current = socket;

    socket.on("connect", () => setStatus("terhubung"));
    socket.on("disconnect", () => setStatus("terputus"));

    return () => {
      socket.disconnect();
    };
  }, []);

  function kirim() {
    const payload = PingSchema.parse({ name: "Pejuang UMR" });
    socketRef.current?.emit(
      "ping:test",
      payload,
      (res: { ok: boolean; message?: string; error?: string }) => {
        setReply(res.ok ? (res.message ?? "") : `Gagal: ${res.error}`);
      },
    );
  }

  return (
    <main style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1
        style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px" }}
      >
        Pejuang UMR
      </h1>
      <p style={{ marginBottom: "16px" }}>
        Status: <strong>{status}</strong>
      </p>
      <button
        onClick={kirim}
        style={{
          padding: "8px 16px",
          background: "blue",
          color: "white",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Kirim ping ke Server
      </button>
      <p style={{ marginTop: "16px", color: "green" }}>{reply}</p>
    </main>
  );
}
