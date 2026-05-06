import { io, Socket } from "socket.io-client";
import { getSession } from "next-auth/react";

let socket: Socket | null = null;

export async function getSocket(): Promise<Socket> {
  if (socket?.connected) return socket;

  const session = await getSession();
  if (!session?.apiToken) throw new Error("Not authenticated");

  socket = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000", {
    auth: { token: session.apiToken },
    transports: ["websocket", "polling"],
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
