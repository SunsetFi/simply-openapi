import { Request, Response } from "express";
import {
  OpenAPIObject,
  OperationObject,
  PathItemObject,
} from "openapi3-ts/oas31";

import { HandledArgument } from "../types";

export interface OperationHandlerMiddlewareContext {
  /**
   * The OpenAPI specification object.
   */
  spec: OpenAPIObject;

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
