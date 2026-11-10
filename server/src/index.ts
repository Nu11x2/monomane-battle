import { createServer } from "node:http";
import { Server } from "socket.io";

const PORT = 3001;

const httpServer = createServer((_req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8"
  });
  res.end("Monomane Battle Server");
});

const io = new Server(httpServer);

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.emit("server:hello", "接続成功！");

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
  });
});

httpServer.listen(PORT, "127.0.0.1", () => {
  console.log(`Server running on port ${PORT}`);
});
