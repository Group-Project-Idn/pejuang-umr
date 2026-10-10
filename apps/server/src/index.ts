import { createServer } from "node:http";
import { Server } from "socket.io";
import { PingSchema } from "@pejuang/shared";

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server(httpServer, {
  cors: { origin: "http://localhost:3000" },
});

io.on("connection", (socket) => {
  console.log("terhubung:", socket.id);

  socket.on("ping:test", (payload, ack) => {
    const parsed = PingSchema.safeParse(payload);
    if (!parsed.success) {
      ack?.({ ok: false, error: "INVALID_PAYLOAD" });
      return;
    }
    ack?.({
      ok: true,
      message: `Halo ${parsed.data.name}, server menerima pesanmu`,
    });
  });
});

const PORT = Number(process.env.PORT ?? 3001);
httpServer.listen(PORT, () =>
  console.log(`Server di http://localhost:${PORT}`),
);
