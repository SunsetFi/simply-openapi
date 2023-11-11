import { Request, Response } from "express";
import { OperationObject, PathItemObject } from "openapi3-ts/oas31";

import { SOCControllerMethodHandlerArg } from "../openapi";

export type HandledArgument = [any, SOCControllerMethodHandlerArg];
export interface OperationHandlerMiddlewareContext {
  /**
   * The full path of this operation.
   */
  path: string;
  /**
   * The HTTP method of this operation.
   */
  method: string;
  /**
   * The OpenAPI path item object.
   */
  pathItem: PathItemObject;
  /**
   * The OpenAPI operation object.
   */
  operation: OperationObject;
  /**
   * The controller class that contains the handler.
   * This should be the `this` object of the handler.
   */
  controller: object;

  /**
   * The handler function that will process the request.
   */
  handler: Function;

  /**
   * An array of tupples containing the argument to pass to the handler in index 0, and a description
   * of the argument in index 1.
   */
  handlerArgs: (HandledArgument | undefined)[];

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
 * @returns The result of the handler function.
 */
export type OperationHandlerMiddlewareNextFunction = (() => any) & {
  /**
   * Invokes the handler with the specified arguments.
   * This replaces all arguments queued up for the handler.
   * @returns The result of the handler function.
   */
  withArgs(...args: any[]): Promise<any>;
};

export type OperationHandlerMiddleware = (
  context: OperationHandlerMiddlewareContext,
  next: OperationHandlerMiddlewareNextFunction
) => Promise<any> | any;
