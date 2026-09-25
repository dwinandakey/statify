/**
 * Text of a thrown value for an error toast or a worker error response.
 *
 * `String(new Error("x"))` is "Error: x", so a toast that renders
 * `Error: {String(err)}` showed "Error: Error: x" for errors thrown as Error
 * objects (e.g. the δ₀ check in the MV service), while errors thrown by the
 * WASM module arrive as plain strings. Using the message of an Error gives
 * the same "Error: x" line for both.
 */
export function errorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    return String(err);
}
