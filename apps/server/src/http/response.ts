import type { ServerResponse } from "node:http";
import type { ErrorCode } from "@pejuang/shared";

export function sendJson(
  response: ServerResponse,
  statusCode: number,
  body: unknown,
): void {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

export function sendError(
  response: ServerResponse,
  statusCode: number,
  error: ErrorCode,
  message?: string,
): void {
  sendJson(response, statusCode, {
    ok: false,
    error,
    ...(message ? { message } : {}),
  });
}