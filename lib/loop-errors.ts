import type { AIProvider } from "@/lib/domain";

type LoopFailureContext = {
  stage: string;
  provider?: AIProvider;
  model?: string;
};

const MESSAGE_KEYS = [
  "message",
  "error",
  "cause",
  "reason",
  "lastError",
] as const;

function recordOf(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function sanitiseErrorText(value: string) {
  return value
    .replace(/\bAIza[\w-]{20,}\b/g, "[redacted]")
    .replace(/\bsk-[\w-]{20,}\b/g, "[redacted]")
    .replace(/(bearer\s+)[^\s\",]+/gi, "$1[redacted]")
    .replace(/([?&](?:key|api_key)=)[^&\s]+/gi, "$1[redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

function findErrorText(
  value: unknown,
  seen = new WeakSet<object>(),
  depth = 0,
): string | null {
  if (depth > 4) return null;
  if (typeof value === "string") {
    const text = sanitiseErrorText(value);
    return text || null;
  }
  const directErrorText =
    value instanceof Error && value.message
      ? sanitiseErrorText(value.message)
      : null;
  if (isUsefulErrorText(directErrorText)) return directErrorText;

  const record = recordOf(value);
  if (!record || seen.has(record)) return null;
  seen.add(record);

  let fallback = directErrorText;
  for (const key of MESSAGE_KEYS) {
    const text = findErrorText(record[key], seen, depth + 1);
    if (isUsefulErrorText(text)) return text;
    fallback ??= text;
  }
  return fallback;
}

function isUsefulErrorText(value: string | null) {
  if (!value) return false;
  const normalised = value.toLowerCase().replace(/[.!]$/, "");
  return ![
    "unknown",
    "unknown error",
    "unknown loop failure",
    "[object object]",
  ].includes(normalised);
}

function sentence(value: string) {
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

export function formatLoopFailure(
  error: unknown,
  { stage, provider, model }: LoopFailureContext,
) {
  const detail = findErrorText(error);
  if (detail?.includes("No document changes were applied.")) return detail;

  const subject =
    provider === "google"
      ? "Gemini"
      : provider === "openai"
        ? "OpenAI"
        : "The Loop";
  const runtime = model ? ` (${model})` : "";
  if (isUsefulErrorText(detail)) {
    return `${subject}${runtime} stopped during ${stage}: ${sentence(detail!)} No document changes were applied.`;
  }
  return `${subject}${runtime} could not finish ${stage} after its retry limit. No document changes were applied.`;
}

function scalar(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  return typeof value === "string" || typeof value === "number"
    ? value
    : undefined;
}

export function loopErrorMetadata(error: unknown) {
  const record = recordOf(error);
  const cause = recordOf(record?.cause);
  return {
    errorType:
      error instanceof Error
        ? error.name
        : typeof scalar(record, "name") === "string"
          ? scalar(record, "name")
          : typeof error,
    errorCode: scalar(record, "code") ?? scalar(cause, "code"),
    statusCode:
      scalar(record, "statusCode") ??
      scalar(record, "status") ??
      scalar(cause, "statusCode") ??
      scalar(cause, "status"),
    errorMessage: findErrorText(error) ?? "No provider error message",
  };
}
