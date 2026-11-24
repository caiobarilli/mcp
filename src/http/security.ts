export const MAX_REQUEST_BODY_BYTES = 16_384;

const SECURITY_HEADERS: Record<string, string> = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export type JsonRpcGuardResult =
  | {
      readonly ok: true;
      readonly request: Request;
      readonly toolName: string;
    }
  | {
      readonly ok: false;
      readonly response: Response;
      readonly toolName: string;
      readonly errorCode: string;
    };

export function jsonRpcErrorResponse(
  status: number,
  code: number,
  message: string,
  extraHeaders?: Record<string, string>,
): Response {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: null,
    error: { code, message },
  });

  return new Response(body, {
    status,
    headers: {
      ...SECURITY_HEADERS,
      ...extraHeaders,
    },
  });
}

function isAllowedOrigin(origin: string, requestUrl: URL): boolean {
  if (origin === "null") {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return false;
  }

  if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
    return true;
  }

  return parsed.origin === requestUrl.origin;
}

function hasJsonContentType(request: Request): boolean {
  const raw = request.headers.get("content-type");
  if (raw === null) {
    return false;
  }
  const mediaType = raw.split(";")[0]?.trim().toLowerCase();
  return mediaType === "application/json";
}

async function readBodyWithLimit(request: Request, maxBytes: number): Promise<Uint8Array | null> {
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader !== null) {
    const parsedLength = Number(contentLengthHeader);
    if (!Number.isFinite(parsedLength) || parsedLength < 0 || parsedLength > maxBytes) {
      return null;
    }
  }

  if (request.body === null) {
    return new Uint8Array(0);
  }

  const reader = request.body.getReader() as ReadableStreamDefaultReader<Uint8Array>;
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) {
      break;
    }
    const value = chunk.value;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return combined;
}

function extractToolNameForLog(parsed: unknown): string {
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return "invalid_jsonrpc";
  }

  const record = parsed as Record<string, unknown>;
  const method = typeof record["method"] === "string" ? record["method"] : "unknown";

  if (method === "tools/call" || method === "prompts/get") {
    const params = record["params"];
    if (typeof params === "object" && params !== null && !Array.isArray(params)) {
      const name = (params as Record<string, unknown>)["name"];
      if (typeof name === "string" && name.length > 0) {
        return name;
      }
    }
  }

  return method;
}

export async function guardMcpRequest(request: Request): Promise<JsonRpcGuardResult> {
  const url = new URL(request.url);

  if (url.pathname !== "/mcp" && url.pathname !== "/") {
    return {
      ok: false,
      response: jsonRpcErrorResponse(404, -32004, "Not found"),
      toolName: "not_found",
      errorCode: "NOT_FOUND",
    };
  }

  if (request.method !== "POST") {
    return {
      ok: false,
      response: jsonRpcErrorResponse(405, -32000, "Method not allowed. Use POST.", {
        Allow: "POST",
      }),
      toolName: "method_not_allowed",
      errorCode: "METHOD_NOT_ALLOWED",
    };
  }

  const origin = request.headers.get("origin");
  if (origin !== null && !isAllowedOrigin(origin, url)) {
    return {
      ok: false,
      response: jsonRpcErrorResponse(403, -32003, "Forbidden origin"),
      toolName: "forbidden_origin",
      errorCode: "FORBIDDEN_ORIGIN",
    };
  }

  if (!hasJsonContentType(request)) {
    return {
      ok: false,
      response: jsonRpcErrorResponse(
        415,
        -32000,
        "Unsupported media type. Expected application/json.",
      ),
      toolName: "unsupported_media_type",
      errorCode: "UNSUPPORTED_MEDIA_TYPE",
    };
  }

  const bodyBytes = await readBodyWithLimit(request, MAX_REQUEST_BODY_BYTES);
  if (bodyBytes === null) {
    return {
      ok: false,
      response: jsonRpcErrorResponse(
        413,
        -32000,
        `Payload too large. Maximum body size is ${String(MAX_REQUEST_BODY_BYTES)} bytes.`,
      ),
      toolName: "payload_too_large",
      errorCode: "PAYLOAD_TOO_LARGE",
    };
  }

  const bodyText = new TextDecoder().decode(bodyBytes);
  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return {
      ok: false,
      response: jsonRpcErrorResponse(400, -32700, "Parse error: invalid JSON payload"),
      toolName: "parse_error",
      errorCode: "PARSE_ERROR",
    };
  }

  if (Array.isArray(parsed)) {
    return {
      ok: false,
      response: jsonRpcErrorResponse(400, -32600, "Batch JSON-RPC requests are not supported"),
      toolName: "batch_rejected",
      errorCode: "BATCH_REJECTED",
    };
  }

  const toolName = extractToolNameForLog(parsed);

  const normalizedUrl = new URL(request.url);
  normalizedUrl.pathname = "/mcp";

  const headers = new Headers(request.headers);
  if (!headers.has("accept")) {
    headers.set("accept", "application/json, text/event-stream");
  }

  const clonedRequest = new Request(normalizedUrl.toString(), {
    method: "POST",
    headers,
    body: bodyBytes,
  });

  return {
    ok: true,
    request: clonedRequest,
    toolName,
  };
}
