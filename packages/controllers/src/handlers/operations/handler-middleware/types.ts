import { OperationRequestContext } from "../../OperationRequestContext";

import { OperationMiddlewareFactoryContext } from "./OperationMiddlewareFactoryContext";

export type OperationMiddlewareFactory = (
  context: OperationMiddlewareFactoryContext,
) => OperationMiddlewareFunction;
export function isOperationMiddlewareFactory(
  middleware: OperationMiddleware,
): middleware is OperationMiddlewareFactory {
  return typeof middleware === "function" && middleware.length === 1;
}

export type OperationMiddlewareFunction = (
  context: OperationRequestContext,
  next: OperationMiddlewareNextFunction,
) => Promise<any> | any;
export function isOperationHandlerMiddleware(
  middleware: OperationMiddleware,
): middleware is OperationMiddlewareFunction {
  return typeof middleware === "function" && middleware.length === 2;
}

export type OperationMiddleware =
  | OperationMiddlewareFunction
  | OperationMiddlewareFactory;

/**
 * Function to invoke the next middleware in the chain.
 * @returns A promise awaiting the result of the handler function or next middleware step.
 */
export type OperationMiddlewareNextFunction = () => Promise<any>;
