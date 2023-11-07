import {
  IExtensionType,
  OperationObject,
  PathItemObject,
} from "openapi3-ts/oas31";
import { JSONSchema6 } from "json-schema";
import { Request, RequestHandler, Response } from "express";

import ajv from "../../ajv";

/**
 * Describes an argument that pulls data from an OpenAPI parameter.
 */
export interface SECControllerMethodHandlerParameterArg {
  type: "openapi-parameter";

  /**
   * The name of the OpenAPI parameter in the operation to insert into this argument.
   */
  parameterName: string;
}

export const secControllerMethodHandlerParameterArgSchema: JSONSchema6 = {
  type: "object",
  properties: {
    type: {
      type: "string",
      enum: ["openapi-parameter"],
    },
    parameterName: {
      type: "string",
      minLength: 1,
    },
  },
  required: ["type", "parameterName"],
};

/**
 * Describes an argument that expects the HTTP request.
 */
export interface SECControllerMethodHandlerRequestArg {
  type: "http-request";
}

export const secControllerMethodHandlerRequestArg: JSONSchema6 = {
  type: "object",
  properties: {
    type: {
      type: "string",
      enum: ["http-request"],
    },
  },
  required: ["type"],
};

/**
 * Describes an argument that expects the HTTP response.
 */
export interface SECControllerMethodHandlerResponseArg {
  type: "http-response";
}

export const secControllerMethodHandlerResponseArg: JSONSchema6 = {
  type: "object",
  properties: {
    type: {
      type: "string",
      enum: ["http-response"],
    },
  },
  required: ["type"],
};

/**
 * Metadata about the argument of a controller method handler function.
 */
export type SECControllerMethodHandlerArg =
  | SECControllerMethodHandlerParameterArg
  | SECControllerMethodHandlerRequestArg
  | SECControllerMethodHandlerResponseArg;

export const secControllerMethodHandlerArgSchema: JSONSchema6 = {
  oneOf: [
    secControllerMethodHandlerParameterArgSchema,
    secControllerMethodHandlerRequestArg,
    secControllerMethodHandlerResponseArg,
  ],
};

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
  handlerArgs: [any, SECControllerMethodHandlerArg][];

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

/**
 * OpenAPI Specification Extension: x-sec-controller-method
 * Stores metadata about the handler of an operation, so that routers may be built for it.
 */
export const SECControllerMethodExtensionName =
  "x-sec-controller-method" satisfies IExtensionType;

/**
 * Data extending an operation that describes the controller and method which will handle this operation.
 */
export interface SECControllerMethodExtensionData {
  /**
   * The class instance of the controller class.
   */
  controller: object | string | symbol;

  /**
   * The handler method of the controller class.
   */
  handler: Function | string | symbol;

  /**
   * An array of objects describing the purpose of each argument to the handler function.
   */
  handlerArgs?: SECControllerMethodHandlerArg[];

  /**
   * Middleware for transforming the arguments or response of the handler.
   */
  handlerMiddleware?: OperationHandlerMiddleware[];

  /**
   * Express middleware to run around the handler.
   */
  expressMiddleware?: RequestHandler[];
}

export const secControllerMethodExtensionDataSchema: JSONSchema6 = {
  type: "object",
  properties: {
    // We would want to validate controller and handler, but ajv doesn't do that out of the box.
    controller: { type: "object" },
    handlerArgs: {
      type: "array",
      items: secControllerMethodHandlerArgSchema,
    },
  },
  required: ["controller", "handler", "handlerArgs"],
};

export const validateSECControllerMethodExtensionData = ajv.compile(
  secControllerMethodExtensionDataSchema
);
