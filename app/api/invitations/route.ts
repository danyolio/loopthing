import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const inviteSchema = z.object({
  projectId: z.uuid(),
  email: z.email(),
  role: z.enum(["editor", "viewer"]),
});

export async function POST(request: Request) {
  const parsed = inviteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid invitation" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }
  const { data: membership } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", parsed.data.projectId)
    .eq("user_id", authData.user.id)
    .single();
  if (membership?.role !== "owner") {
    return Response.json({ error: "Owner access required" }, { status: 403 });
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { error } = await supabase.from("invitations").insert({
    project_id: parsed.data.projectId,
    email: parsed.data.email.toLowerCase(),
    role: parsed.data.role,
    token_hash: tokenHash,
    invited_by: authData.user.id,
  });
  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({ url: `${new URL(request.url).origin}/invite/${token}` });
}
