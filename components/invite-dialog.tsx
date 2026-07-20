"use client";

import { useState } from "react";
import { Check, Copy, LoaderCircle, Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type CreatedInvitation = {
  email: string;
  url: string;
};

export function InviteDialog({ projectId }: { projectId: string }) {
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [invitations, setInvitations] = useState<CreatedInvitation[]>([]);
  const [saving, setSaving] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  async function createInvites(event: React.FormEvent) {
    event.preventDefault();
    const parsedEmails = [
      ...new Set(
        emails
          .split(/[\s,;]+/)
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];
    if (!parsedEmails.length) {
      toast.error("Add at least one email address.");
      return;
    }
    if (parsedEmails.length > 20) {
      toast.error("Invite up to 20 people at a time.");
      return;
    }

    setSaving(true);
    const response = await fetch("/api/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, emails: parsedEmails, role }),
    });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok) {
      toast.error(payload.error || "Could not create the invitation.");
      return;
    }
    setInvitations(payload.invitations);
    toast.success(
      `${payload.invitations.length} invitation${
        payload.invitations.length === 1 ? "" : "s"
      } created.`,
    );
  }

  async function copyLink(invitation: CreatedInvitation) {
    await navigator.clipboard.writeText(invitation.url);
    setCopiedEmail(invitation.email);
    toast.success(`Invitation for ${invitation.email} copied.`);
  }

  async function copyAll() {
    await navigator.clipboard.writeText(
      invitations.map(({ email, url }) => `${email}: ${url}`).join("\n"),
    );
    setCopiedEmail("all");
    toast.success("All invitation links copied.");
  }

  function inviteMore() {
    setEmails("");
    setInvitations([]);
    setCopiedEmail(null);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserPlus />
          <span className="hidden sm:inline">Invite</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite collaborators</DialogTitle>
          <DialogDescription>
            Add up to 20 email addresses. Each person gets a private link that
            expires in seven days.
          </DialogDescription>
        </DialogHeader>
        {invitations.length ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <Label>Secure invitation links</Label>
              <Button type="button" size="sm" variant="outline" onClick={copyAll}>
                {copiedEmail === "all" ? <Check /> : <Copy />}
                Copy all
              </Button>
            </div>
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {invitations.map((invitation) => (
                <div
                  key={invitation.email}
                  className="rounded-xl border bg-muted/30 p-3"
                >
                  <p className="truncate text-sm font-medium">{invitation.email}</p>
                  <div className="mt-2 flex gap-2">
                    <Input value={invitation.url} readOnly />
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      aria-label={`Copy invitation for ${invitation.email}`}
                      onClick={() => copyLink(invitation)}
                    >
                      {copiedEmail === invitation.email ? <Check /> : <Copy />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              Each recipient must sign in with the matching email address.
            </p>
            <Button type="button" variant="ghost" onClick={inviteMore}>
              <Plus />
              Invite more people
            </Button>
          </div>
        ) : (
          <form onSubmit={createInvites} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-emails">Email addresses</Label>
              <Textarea
                id="invite-emails"
                value={emails}
                onChange={(event) => setEmails(event.target.value)}
                placeholder={"ada@company.com\nlinus@company.com"}
                rows={4}
                required
              />
              <p className="text-xs text-muted-foreground">
                Separate addresses with commas, spaces, or new lines.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as typeof role)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor — edit and run Loops</SelectItem>
                  <SelectItem value="viewer">Viewer — read and comment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" disabled={saving}>
              {saving && <LoaderCircle className="animate-spin" />}
              Create invitations
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
