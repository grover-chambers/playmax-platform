import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

type LoggableHandler = (
  request: Request,
  context?: unknown,
) => Promise<Response> | Response;

/**
 * Wraps a route handler to:
 *  - generate a `requestId` (randomUUID),
 *  - time the request,
 *  - set `x-request-id` on the response (clone if the handler built its own),
 *  - log one JSON line `{ requestId, route, method, status, durationMs, ts }`,
 *  - on throw, log the 500 line and re-throw.
 */
export function withLogging(handler: LoggableHandler): LoggableHandler {
  return async (request, context) => {
    const requestId = randomUUID();
    const startedAt = Date.now();
    const url = new URL(request.url);
    const route = url.pathname;
    const method = request.method;
    const ts = new Date().toISOString();

    try {
      const response = await handler(request, context);
      const durationMs = Date.now() - startedAt;
      console.log(
        JSON.stringify({
          requestId,
          route,
          method,
          status: response.status,
          durationMs,
          ts,
        }),
      );
      return withRequestId(response, requestId);
    } catch (err) {
      console.log(
        JSON.stringify({
          requestId,
          route,
          method,
          status: 500,
          durationMs: Date.now() - startedAt,
          ts,
        }),
      );
      throw err;
    }
  };
}

function withRequestId(response: Response, requestId: string): Response {
  if (response.headers.get("x-request-id")) return response;
  const headers = new Headers(response.headers);
  headers.set("x-request-id", requestId);
  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
