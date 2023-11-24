import { RequestHandler } from "express";

import { RouteCreationContext } from "./RouteCreationContext";
import {
  OperationHandlerMiddleware,
  RequestProcessorFactory,
} from "../handlers";

export type OperationHandlerFactory = (
  ctx: RouteCreationContext,
  opts: OperationHandlerOptions,
) => RequestHandler | null | undefined;

export interface OperationHandlerOptions {
  /**
   * Middleware to apply to all handlers.
   * This middleware will apply in-order before any middleware registered on the operation.
   */
  handlerMiddleware?: OperationHandlerMiddleware[];

  /**
   * Middleware to apply to the express router before the handler.
   */
  preExpressMiddleware?: RequestHandler[];

  /**
   * Request data processors are responsible for both validating the request conforms to the OpenAPI specification
   * as well as extracting the data to be presented to the handler function.
   */
  requestProcessorFactories?: RequestProcessorFactory[];

  /**
   * If true, ensure that all responses are handled by the handler.
   * If false, no such check will be performed, and handlers that return undefined may leave requests hanging open.
   * @default true
   */
  ensureResponsesHandled?: boolean;
}
