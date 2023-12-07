import { RequestContext } from "../../RequestContext";

import { OperationMiddlewareFactoryContext } from "./OperationMiddlewareFactoryContext";

export type OperationHandlerMiddlewareFactory = (
  context: OperationMiddlewareFactoryContext,
) => OperationHandlerMiddleware;
export function isOperationHandlerMiddlewareFactory(
  middleware: OperationMiddleware,
): middleware is OperationHandlerMiddlewareFactory {
  return typeof middleware === "function" && middleware.length === 1;
}

export type OperationHandlerMiddleware = (
  context: RequestContext,
  next: OperationHandlerMiddlewareNextFunction,
) => Promise<any> | any;
export function isOperationHandlerMiddleware(
  middleware: OperationMiddleware,
): middleware is OperationHandlerMiddlewareFactory {
  return typeof middleware === "function" && middleware.length === 2;
}

export type OperationMiddleware =
  | OperationHandlerMiddleware
  | OperationHandlerMiddlewareFactory;

/**
 * Function to invoke the next middleware in the chain.
 * @returns A promise awaiting the result of the handler function or next middleware step.
 */
export type OperationHandlerMiddlewareNextFunction = () => Promise<any>;

/**
 * A function that validates and coerces a value.
 */
export type ValueProcessorFunction = (value: any) => any;
