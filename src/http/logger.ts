export type MinimalLogEntry = {
  readonly tool: string;
  readonly status: number;
  readonly durationMs: number;
  readonly errorCode: string | null;
};

const ALLOWED_TOOL_PATTERN = /^[a-zA-Z0-9_./-]{1,64}$/;
const ALLOWED_ERROR_PATTERN = /^[A-Z0-9_-]{1,64}$/;

export function formatMinimalLog(entry: MinimalLogEntry): string {
  const safeTool = ALLOWED_TOOL_PATTERN.test(entry.tool) ? entry.tool : "unknown";
  const safeStatus = Number.isInteger(entry.status) ? entry.status : 500;
  const safeDuration = Math.max(0, Math.round(entry.durationMs));
  const safeError =
    entry.errorCode !== null && ALLOWED_ERROR_PATTERN.test(entry.errorCode)
      ? entry.errorCode
      : entry.errorCode === null
        ? null
        : "INTERNAL_ERROR";

  return JSON.stringify({
    tool: safeTool,
    status: safeStatus,
    durationMs: safeDuration,
    errorCode: safeError,
  });
}

export function emitMinimalLog(entry: MinimalLogEntry): void {
  console.log(formatMinimalLog(entry));
}
