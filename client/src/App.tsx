import { useEffect, useState } from "react";
import { io } from "socket.io-client";

function App() {
  const [status, setStatus] = useState("接続中...");

  useEffect(() => {
    const socket = io();

    socket.on("server:hello", (message: string) => {
      setStatus(message);
    });

    socket.on("connect_error", (error) => {
      setStatus(`接続エラー: ${error.message}`);
    });

    socket.on("disconnect", () => {
      setStatus("切断されました");
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <main>
      <h1>Monomane Battle</h1>
      <p>{status}</p>
    </main>
  );
}

export default App;
