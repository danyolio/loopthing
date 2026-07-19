"use client";

import { useState } from "react";
import { Check, Copy, LoaderCircle, UserPlus } from "lucide-react";
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

export function InviteDialog({ projectId }: { projectId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [link, setLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  async function createInvite(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const response = await fetch("/api/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, email, role }),
    });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok) {
      toast.error(payload.error || "Could not create the invitation.");
      return;
    }
    setLink(payload.url);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Invitation link copied.");
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
          <DialogTitle>Invite a collaborator</DialogTitle>
          <DialogDescription>
            The link is bound to this email and expires in seven days.
          </DialogDescription>
        </DialogHeader>
        {link ? (
          <div className="space-y-3">
            <Label>Secure invitation link</Label>
            <div className="flex gap-2">
              <Input value={link} readOnly />
              <Button type="button" size="icon" onClick={copyLink}>
                {copied ? <Check /> : <Copy />}
              </Button>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              Share this privately with {email}. The recipient must sign in with
              the same email address.
            </p>
          </div>
        ) : (
          <form onSubmit={createInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="collaborator@company.com"
                required
              />
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
              Create invitation
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
