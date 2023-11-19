import { Request, Response } from "express";

import { MethodHandlerContext } from "../types";

export interface OperationHandlerMiddlewareContext
  extends MethodHandlerContext {
  /**
   * The express request.
   */
  req: Request;

  /**
   * The express response.
   */
  res: Response;
}

/**
 * Function to invoke the next middleware in the chain.
 * @returns A promise awaiting the result of the handler function or next middleware step.
 */
export type OperationHandlerMiddlewareNextFunction = () => Promise<any>;

export type OperationHandlerMiddleware = (
  context: OperationHandlerMiddlewareContext,
  next: OperationHandlerMiddlewareNextFunction,
) => Promise<any> | any;
