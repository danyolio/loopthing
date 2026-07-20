import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const inviteSchema = z.object({
  projectId: z.uuid(),
  emails: z.array(z.email()).min(1).max(20),
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

  const emails = [
    ...new Set(parsed.data.emails.map((email) => email.trim().toLowerCase())),
  ];
  const invitations = emails.map((email) => {
    const token = randomBytes(32).toString("base64url");
    return {
      email,
      token,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      role: parsed.data.role,
    };
  });

  const { data, error } = await supabase.rpc("create_or_refresh_invitations", {
    p_project_id: parsed.data.projectId,
    p_invitations: invitations.map(({ email, role, tokenHash }) => ({
      email,
      role,
      tokenHash,
    })),
  });
  if (error || data?.length !== invitations.length) {
    return Response.json(
      { error: error?.message ?? "Not every invitation could be created." },
      { status: 400 },
    );
  }

  const origin = new URL(request.url).origin;
  return Response.json({
    invitations: invitations.map(({ email, token }) => ({
      email,
      url: `${origin}/invite/${token}`,
    })),
  });
}
