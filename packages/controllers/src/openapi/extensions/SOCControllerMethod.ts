import { IExtensionType } from "openapi3-ts/oas31";
import { JSONSchema6 } from "json-schema";

import ajv from "../../ajv";
import { OperationHandlerMiddleware } from "../../routes";
import { Middleware } from "../../types";

/**
 * Describes an argument that pulls data from an OpenAPI parameter.
 */
export interface SOCControllerMethodHandlerParameterArg {
  type: "openapi-parameter";

  /**
   * The name of the OpenAPI parameter in the operation to insert into this argument.
   */
  parameterName: string;
}

export const socControllerMethodHandlerParameterArgSchema: JSONSchema6 = {
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
export interface SOCControllerMethodHandlerBodyArg {
  type: "request-body";
}

export const socControllerMethodHandlerBodyArg: JSONSchema6 = {
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
export interface SOCControllerMethodHandlerRequestArg {
  type: "request-raw";
}

export const socControllerMethodHandlerRequestArg: JSONSchema6 = {
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
export interface SOCControllerMethodHandlerResponseArg {
  type: "response-raw";
}

export const socControllerMethodHandlerResponseArg: JSONSchema6 = {
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
export type SOCControllerMethodHandlerArg =
  | SOCControllerMethodHandlerParameterArg
  | SOCControllerMethodHandlerBodyArg
  | SOCControllerMethodHandlerRequestArg
  | SOCControllerMethodHandlerResponseArg;

export const socControllerMethodHandlerArgSchema: JSONSchema6 = {
  oneOf: [
    socControllerMethodHandlerParameterArgSchema,
    socControllerMethodHandlerBodyArg,
    socControllerMethodHandlerRequestArg,
    socControllerMethodHandlerResponseArg,
  ],
};

/**
 * OpenAPI Specification Extension: x-simply-controller-method
 * Stores metadata about the handler of an operation, so that routers may be built for it.
 */
export const SOCControllerMethodExtensionName =
  "x-simply-controller-method" satisfies IExtensionType;

/**
 * Data extending an operation that describes the controller and method which will handle this operation.
 */
export interface SOCControllerMethodExtensionData {
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
  handlerArgs?: (SOCControllerMethodHandlerArg | undefined)[];

  /**
   * Middleware for wrapping the handler function.
   * These can replace parameters and reinterpret the handler's results as needed.
   *
   * These middlewares are responsible for sending the return value of the handler to the response.
   * While defaults are provided to do this, you can customize the behavior of the responses by overriding this behavior here.
   */
  handlerMiddleware?: OperationHandlerMiddleware[];

  /**
   * Express middleware to run before the handler.
   */
  preExpressMiddleware?: Middleware[];
}

export const socControllerMethodExtensionDataSchema: JSONSchema6 = {
  type: "object",
  properties: {
    // Controller can be object, string, or symbol.  We cannot validate for symbol.
    controller: {},
    // Handler can be Function, string, symbol.  We cannot validate for function or symbol.
    handler: {},
    handlerArgs: {
      type: "array",
      items: socControllerMethodHandlerArgSchema,
    },
    handlerMiddleware: {
      type: "array",
    },
    expressMiddleware: {
      type: "array",
    },
  },
  required: ["controller", "handler"],
};

export const validateSOCControllerMethodExtensionData = ajv.compile(
  socControllerMethodExtensionDataSchema
);
