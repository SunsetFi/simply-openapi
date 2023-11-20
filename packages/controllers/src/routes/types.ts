import {
  OpenAPIObject,
  OperationObject,
  PathItemObject,
} from "openapi3-ts/oas31";
import { SOCControllerMethodHandlerArg } from "../openapi";

export type HandledArgument = [any, SOCControllerMethodHandlerArg];

export interface OperationContext {
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
}

export interface MethodHandlerContext extends OperationContext {
  /**
   * The controller class that contains the handler.
   * This should be the `this` object of the handler.
   */
  controller: object;

  /**
   * The handler function that will process the request.
   */
  handler: Function;
}
