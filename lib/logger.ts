type LogFields = Record<string, unknown>;

export function log(
  level: "info" | "warn" | "error",
  event: string,
  fields: LogFields = {},
) {
  const record = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...fields,
  };

  const output = JSON.stringify(record);
  if (level === "error") console.error(output);
  else if (level === "warn") console.warn(output);
  else console.info(output);
}
