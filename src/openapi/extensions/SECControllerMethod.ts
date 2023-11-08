import { IExtensionType } from "openapi3-ts/oas31";
import { JSONSchema6 } from "json-schema";

import ajv from "../../ajv";
import { OperationHandlerMiddleware } from "../../routes";
import { Middleware } from "../../types";

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
 * Describes an argument that pulls data from the request body.
 */
export interface SECControllerMethodHandlerBodyArg {
  type: "request-body";
}

export const secControllerMethodHandlerBodyArg: JSONSchema6 = {
  type: "object",
  properties: {
    type: {
      type: "string",
      enum: ["request-body"],
    },
  },
  required: ["type"],
};

/**
 * Describes an argument that expects the HTTP request.
 */
export interface SECControllerMethodHandlerRequestArg {
  type: "request-raw";
}

export const secControllerMethodHandlerRequestArg: JSONSchema6 = {
  type: "object",
  properties: {
    type: {
      type: "string",
      enum: ["request-raw"],
    },
  },
  required: ["type"],
};

/**
 * Describes an argument that expects the HTTP response.
 */
export interface SECControllerMethodHandlerResponseArg {
  type: "response-raw";
}

export const secControllerMethodHandlerResponseArg: JSONSchema6 = {
  type: "object",
  properties: {
    type: {
      type: "string",
      enum: ["response-raw"],
    },
  },
  required: ["type"],
};

/**
 * Metadata about the argument of a controller method handler function.
 */
export type SECControllerMethodHandlerArg =
  | SECControllerMethodHandlerParameterArg
  | SECControllerMethodHandlerBodyArg
  | SECControllerMethodHandlerRequestArg
  | SECControllerMethodHandlerResponseArg;

export const secControllerMethodHandlerArgSchema: JSONSchema6 = {
  oneOf: [
    secControllerMethodHandlerParameterArgSchema,
    secControllerMethodHandlerBodyArg,
    secControllerMethodHandlerRequestArg,
    secControllerMethodHandlerResponseArg,
  ],
};

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
   * If this is a string or symbol, then the resolveController option must be passed to createRouterFromSpec to successfully create a controller.
   */
  controller: object | string | symbol;

  /**
   * The handler method of the controller class.
   * If this is a string or symbol, then createRouterFromSpec will attempt to find a method by that key on the controller.
   * If other behavior is desired, this may be overridden by passing the resolveHandler option to createRouterFromSpec.
   */
  handler: Function | string | symbol;

  /**
   * An array of objects describing the purpose of each argument to the handler function.
   * The order if this array should match the order of the parameters in the function that they pertain to.
   */
  handlerArgs?: SECControllerMethodHandlerArg[];

  /**
   * Middleware for wrapping the handler function.
   * These can replace parameters and reinterpret the handler's results as needed.
   *
   * These middlewares are responsible for sending the return value of the handler to the response.
   * While defaults are provided to do this, you can customize the behavior of the responses by overriding this behavior here.
   */
  handlerMiddleware?: OperationHandlerMiddleware[];

  /**
   * Express middleware to run around the handler.
   */
  expressMiddleware?: Middleware[];
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
