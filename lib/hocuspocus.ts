import { createClient } from "@supabase/supabase-js";
import { Redis as RedisExtension } from "@hocuspocus/extension-redis";
import { Hocuspocus, type Document } from "@hocuspocus/server";
import RedisClient from "ioredis";
import * as Y from "yjs";
import { log } from "@/lib/logger";

type CollaborationContext = {
  accessToken: string;
  userId: string;
  role: "owner" | "editor" | "viewer";
  projectId: string;
  documentId: string;
};

function tokenClient(accessToken: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    },
  );
}

function parseDocumentName(name: string) {
  const [projectId, documentId] = name.split(":");
  if (!projectId || !documentId) throw new Error("Invalid document name");
  return { projectId, documentId };
}

function decodeBytea(value: string) {
  if (value.startsWith("\\x")) return Uint8Array.from(Buffer.from(value.slice(2), "hex"));
  return Uint8Array.from(Buffer.from(value, "base64"));
}

function createHocuspocus() {
  const extensions = [];
  if (process.env.REDIS_URL) {
    const redis = new RedisClient(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    extensions.push(
      new RedisExtension({
        redis,
        identifier: process.env.VERCEL_REGION || "loopthing",
        prefix: "loopthing:yjs",
      }),
    );
  }

  return new Hocuspocus<CollaborationContext>({
    name: "loopthing-collaboration",
    extensions,
    timeout: 30_000,
    debounce: 2_000,
    maxDebounce: 10_000,
    unloadImmediately: true,
    async onAuthenticate({ token, documentName, connectionConfig }) {
      if (!token) throw new Error("Authentication required");
      const { projectId, documentId } = parseDocumentName(documentName);
      const supabase = tokenClient(token);
      const { data: authData, error: authError } = await supabase.auth.getUser(token);
      if (authError || !authData.user) throw new Error("Invalid session");

      const [{ data: membership }, { data: document }] = await Promise.all([
        supabase
          .from("project_members")
          .select("role")
          .eq("project_id", projectId)
          .eq("user_id", authData.user.id)
          .single(),
        supabase
          .from("documents")
          .select("id")
          .eq("id", documentId)
          .eq("project_id", projectId)
          .single(),
      ]);
      if (!membership || !document) throw new Error("Project access denied");

      connectionConfig.readOnly = membership.role === "viewer";
      return {
        accessToken: token,
        userId: authData.user.id,
        role: membership.role,
        projectId,
        documentId,
      } satisfies CollaborationContext;
    },
    async onLoadDocument({ document, context }) {
      const supabase = tokenClient(context.accessToken);
      const { data, error } = await supabase
        .from("yjs_checkpoints")
        .select("state")
        .eq("document_id", context.documentId)
        .order("sequence", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data?.state) Y.applyUpdate(document, decodeBytea(data.state));
      return document;
    },
    async onStoreDocument({ document, lastContext, documentName }) {
      if (!lastContext || lastContext.role === "viewer") return;
      const state = Y.encodeStateAsUpdate(document as Document);
      const plainText = document.getText("plainText").toString();
      const supabase = tokenClient(lastContext.accessToken);
      const { error } = await supabase.rpc("save_yjs_checkpoint", {
        p_project_id: lastContext.projectId,
        p_document_id: lastContext.documentId,
        p_state_base64: Buffer.from(state).toString("base64"),
        p_plain_text: plainText,
        p_reason: "autosave",
      });
      if (error) throw error;
      log("info", "collaboration.checkpoint.saved", {
        documentName,
        userId: lastContext.userId,
      });
    },
  });
}

const globalForHocuspocus = globalThis as typeof globalThis & {
  loopthingHocuspocus?: Hocuspocus<CollaborationContext>;
};

export function getHocuspocus() {
  if (!globalForHocuspocus.loopthingHocuspocus) {
    globalForHocuspocus.loopthingHocuspocus = createHocuspocus();
  }
  return globalForHocuspocus.loopthingHocuspocus;
}
