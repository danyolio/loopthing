import { experimental_upgradeWebSocket } from "@vercel/functions";
import { getHocuspocus } from "@/lib/hocuspocus";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
    return new Response("WebSocket upgrade required", {
      status: 426,
      headers: { Upgrade: "websocket" },
    });
  }

  return experimental_upgradeWebSocket(
    async (socket) => {
      const connection = getHocuspocus().handleConnection(socket, request);

      socket.on("message", (data) => {
        const bytes =
          typeof data === "string"
            ? Buffer.from(data)
            : data instanceof ArrayBuffer
              ? new Uint8Array(data)
              : ArrayBuffer.isView(data)
                ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
                : Buffer.concat(data);
        connection.handleMessage(bytes);
      });
      socket.on("close", (code, reason) => {
        connection.handleClose({
          code,
          reason: reason.toString(),
        });
      });
    },
    { maxPayload: 1024 * 1024 },
  );
}
