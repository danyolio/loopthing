import { describe, expect, it } from "vitest";
import {
  DEFAULT_GOOGLE_MODEL,
  DEFAULT_OPENAI_MODEL,
  resolveAIModel,
} from "@/lib/ai-models";

describe("AI model defaults", () => {
  it("uses Gemini 3.6 Flash for Google Loops and Dreams", () => {
    expect(DEFAULT_GOOGLE_MODEL).toBe("gemini-3.6-flash");
    expect(resolveAIModel("google", {})).toBe("gemini-3.6-flash");
    expect(resolveAIModel("google", { GOOGLE_GENERATIVE_AI_MODEL: "" })).toBe(
      "gemini-3.6-flash",
    );
  });

  it("preserves provider-specific overrides and the OpenAI default", () => {
    expect(DEFAULT_OPENAI_MODEL).toBe("gpt-5.6-sol");
    expect(resolveAIModel("openai", {})).toBe("gpt-5.6-sol");
    expect(
      resolveAIModel("google", {
        GOOGLE_GENERATIVE_AI_MODEL: "gemini-custom",
      }),
    ).toBe("gemini-custom");
  });
});
