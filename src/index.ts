import { createMcpHandler } from "agents/mcp/server";
import { emitMinimalLog } from "./http/logger.js";
import { guardMcpRequest, jsonRpcErrorResponse } from "./http/security.js";
import { createCaioMcpServer } from "./server.js";

const mcpHandler = createMcpHandler(createCaioMcpServer, {
  route: "/mcp",
  corsOptions: false,
  allowedOriginHostnames: "*",
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const startedAt = Date.now();
    const guarded = await guardMcpRequest(request);

    if (!guarded.ok) {
      emitMinimalLog({
        tool: guarded.toolName,
        status: guarded.response.status,
        durationMs: Date.now() - startedAt,
        errorCode: guarded.errorCode,
      });
      return guarded.response;
    }

    try {
      const response = await mcpHandler(guarded.request, env, ctx);
      const headers = new Headers(response.headers);
      headers.set("Cache-Control", "no-store");
      headers.set("X-Content-Type-Options", "nosniff");

      const finalResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });

      emitMinimalLog({
        tool: guarded.toolName,
        status: finalResponse.status,
        durationMs: Date.now() - startedAt,
        errorCode: finalResponse.status >= 400 ? `HTTP_${String(finalResponse.status)}` : null,
      });

      return finalResponse;
    } catch {
      const errorResponse = jsonRpcErrorResponse(500, -32603, "Internal server error");
      emitMinimalLog({
        tool: guarded.toolName,
        status: 500,
        durationMs: Date.now() - startedAt,
        errorCode: "INTERNAL_ERROR",
      });
      return errorResponse;
    }
  },
} satisfies ExportedHandler<Env>;
