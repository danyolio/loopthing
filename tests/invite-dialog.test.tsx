// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InviteDialog } from "@/components/invite-dialog";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("batch invitation dialog", () => {
  it("submits deduplicated email addresses and renders every secure link", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        invitations: [
          { email: "ada@example.com", url: "https://loopthing.ai/invite/ada" },
          {
            email: "linus@example.com",
            url: "https://loopthing.ai/invite/linus",
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<InviteDialog projectId="68621480-c545-4fab-8a78-d592ccd9f47e" />);
    fireEvent.click(screen.getByRole("button", { name: "Invite" }));
    fireEvent.change(screen.getByLabelText("Email addresses"), {
      target: {
        value: "Ada@example.com\nlinus@example.com, ada@example.com",
      },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Create invitations" }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      projectId: "68621480-c545-4fab-8a78-d592ccd9f47e",
      emails: ["ada@example.com", "linus@example.com"],
      role: "editor",
    });
    expect(await screen.findByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByText("linus@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy all" })).toBeInTheDocument();
  });
});
