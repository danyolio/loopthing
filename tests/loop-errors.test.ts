import { describe, expect, it } from "vitest";
import { formatLoopFailure, loopErrorMetadata } from "@/lib/loop-errors";

describe("Loop error reporting", () => {
  it("keeps a provider message even when Workflow deserialises it as an object", () => {
    expect(
      formatLoopFailure(
        { error: { message: "The model returned an invalid structured result" } },
        {
          stage: "AI synthesis",
          provider: "google",
          model: "gemini-3.6-flash",
        },
      ),
    ).toBe(
      "Gemini (gemini-3.6-flash) stopped during AI synthesis: The model returned an invalid structured result. No document changes were applied.",
    );
  });

  it("replaces unknown provider failures with a stage-specific explanation", () => {
    expect(
      formatLoopFailure({ message: "Unknown error" }, {
        stage: "AI synthesis",
        provider: "google",
      }),
    ).toBe(
      "Gemini could not finish AI synthesis after its retry limit. No document changes were applied.",
    );
  });

  it("looks through a generic wrapper for the useful underlying cause", () => {
    expect(
      formatLoopFailure(
        {
          message: "Unknown error",
          cause: { message: "Response schema was not satisfied" },
        },
        { stage: "AI synthesis", provider: "google" },
      ),
    ).toContain("Response schema was not satisfied");
  });

  it("redacts credentials from stored messages and structured logs", () => {
    const error = {
      name: "ProviderError",
      code: "RATE_LIMITED",
      statusCode: 429,
      message: "Request key=AIzaabcdefghijklmnopqrstuvwxyz123456 failed",
    };
    const message = formatLoopFailure(error, {
      stage: "AI synthesis",
      provider: "google",
    });
    const metadata = loopErrorMetadata(error);

    expect(message).not.toContain("AIza");
    expect(metadata.errorMessage).not.toContain("AIza");
    expect(metadata).toMatchObject({
      errorType: "ProviderError",
      errorCode: "RATE_LIMITED",
      statusCode: 429,
    });
  });
});
