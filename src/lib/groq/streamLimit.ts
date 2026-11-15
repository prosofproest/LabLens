// Request body streaming byte limiter
// Reads and counts raw chunks before full memory buffer or JSON parsing to prevent DoS.

export class PayloadTooLargeError extends Error {
  constructor(maxBytes: number) {
    super(`Request payload exceeds maximum allowed size of ${maxBytes} bytes (32 KB).`);
    this.name = "PayloadTooLargeError";
  }
}

/**
 * Reads request body stream and strictly enforces the maximum byte limit.
 * Cancels stream consumption immediately if the cumulative byte count exceeds limit.
 */
export async function readJsonWithByteLimit<T = unknown>(
  req: Request,
  maxBytes = 32 * 1024
): Promise<T> {
  // Pre-check Content-Length header if present
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    throw new PayloadTooLargeError(maxBytes);
  }

  if (!req.body) {
    throw new Error("Request body is empty.");
  }

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value) {
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
          // Cancel stream immediately to release socket
          await reader.cancel();
          throw new PayloadTooLargeError(maxBytes);
        }
        chunks.push(value);
      }
    }
  } catch (err) {
    if (err instanceof PayloadTooLargeError) throw err;
    throw new Error(`Failed to read request body stream: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (chunks.length === 0) {
    throw new Error("Request body is empty.");
  }

  // Combine chunks into single Buffer / string
  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  const text = new TextDecoder().decode(merged);

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Malformed JSON payload in request body.");
  }
}
