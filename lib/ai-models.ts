import type { AIProvider } from "@/lib/domain";

export const DEFAULT_GOOGLE_MODEL = "gemini-3.6-flash";
export const DEFAULT_OPENAI_MODEL = "gpt-5.6-sol";

type AIModelEnvironment = Record<string, string | undefined>;

export function resolveAIModel(
  provider: AIProvider,
  environment: AIModelEnvironment = process.env,
) {
  const configuredModel =
    provider === "openai"
      ? environment.OPENAI_MODEL
      : environment.GOOGLE_GENERATIVE_AI_MODEL;

  return (
    configuredModel?.trim() ||
    (provider === "openai" ? DEFAULT_OPENAI_MODEL : DEFAULT_GOOGLE_MODEL)
  );
}
