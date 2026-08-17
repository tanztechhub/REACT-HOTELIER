// Extracts a display message from any rejection shape. Plain try/catch
// around api() calls always throws a real Error. But createAsyncThunk +
// .unwrap() is different: on failure it serializes the thrown value into
// a plain { name, message, stack } object (RTK's miniSerializeError) before
// re-throwing it — so `cause instanceof Error` is false there even for a
// genuine network failure, silently falling through to whatever fallback
// text the caller chose. Checking for a string .message covers both shapes.
export function getErrorMessage(cause: unknown, fallback: string): string {
  const message =
    cause instanceof Error
      ? cause.message
      : typeof cause === 'object' && cause !== null && 'message' in cause && typeof (cause as { message: unknown }).message === 'string'
        ? (cause as { message: string }).message
        : null

  if (!message) return fallback
  if (message === 'Failed to fetch' || /networkerror|load failed/i.test(message)) {
    return 'Could not reach the server. Check your connection and try again.'
  }
  return message
}
