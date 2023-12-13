import { RequestHandler } from "express";

import { OperationMiddleware } from "../handlers";

import { RouteCreationContext } from "./RouteCreationContext";

export type OperationHandlerFactory = (
  ctx: RouteCreationContext,
  opts: OperationHandlerOptions,
) => RequestHandler | null | undefined;

export interface OperationHandlerOptions {
  /**
   * Middleware to apply to all handlers.
   * This middleware will apply in-order before any middleware registered on the operation.
   */
  handlerMiddleware?: OperationMiddleware[];

  /**
   * If true, ensure that all responses are handled by the handler.
   * If false, no such check will be performed, and handlers that return undefined may leave requests hanging open.
   * @default true
   */
  ensureResponsesHandled?: boolean;
}
