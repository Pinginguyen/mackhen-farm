type ErrorRecord = { error?: unknown; message?: unknown };

function isErrorRecord(value: unknown): value is ErrorRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getErrorMessage(value: unknown, fallback = 'Có lỗi xảy ra'): string {
  if (typeof value === 'string' && value.trim()) return value;
  if (value instanceof Error && value.message.trim()) return value.message;
  if (!isErrorRecord(value)) return fallback;

  if (typeof value.message === 'string' && value.message.trim()) return value.message;
  if (typeof value.error === 'string' && value.error.trim()) return value.error;
  if (isErrorRecord(value.error) && typeof value.error.message === 'string' && value.error.message.trim()) {
    return value.error.message;
  }

  return fallback;
}