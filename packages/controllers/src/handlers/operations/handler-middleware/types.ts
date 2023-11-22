import { RequestContext } from "../../RequestContext";

/**
 * Function to invoke the next middleware in the chain.
 * @returns A promise awaiting the result of the handler function or next middleware step.
 */
export type OperationHandlerMiddlewareNextFunction = () => Promise<any>;

export type OperationHandlerMiddleware = (
  context: RequestContext,
  next: OperationHandlerMiddlewareNextFunction,
) => Promise<any> | any;
