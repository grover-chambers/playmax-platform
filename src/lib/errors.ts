export function sanitizeError(error: unknown, fallback = "Internal server error"): string {
  if (process.env.NODE_ENV === "development") {
    return error instanceof Error ? error.message : fallback;
  }
  return fallback;
}
