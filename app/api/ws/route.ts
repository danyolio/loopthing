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
      getHocuspocus().handleConnection(socket, request);
    },
    { maxPayload: 1024 * 1024 },
  );
}
