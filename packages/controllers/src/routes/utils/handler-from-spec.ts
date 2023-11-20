import AJV, { ValidateFunction, ValidationError } from "ajv";
import { isObject, isFunction } from "lodash";
import { OpenAPIObject, SchemaObject } from "openapi3-ts/oas31";

import {
  SOCControllerMethodExtensionData,
  SOCControllerMethodExtensionName,
  validateSOCControllerMethodExtensionData,
} from "../../openapi";
import { ControllerInstance, Middleware, RequestMethod } from "../../types";
import { isConstructor, isNotNullOrUndefined } from "../../utils";
import { sliceAjvError } from "../../ajv";

import { MethodHandlerContext, OperationContext } from "../types";
import { RequestDataProcessorFactory } from "../request-data";
import { OperationHandlerMiddleware } from "../handler-middleware";

import { MethodHandler } from "./MethodHandler";
export interface CreateMethodHandlerOpts {
  /**
   * Resolve a controller specified in the x-simply-controller-method extension into a controller object.
   * @param controller The controller to resolve.
   * @param ctx The operation context.
   * @returns The resolved controller
   */
  resolveController?: (
    controller: object | string | symbol,
    ctx: OperationContext,
  ) => object;

  /**
   * Resolve a method specified in the x-simply-controller-method extension into a method.
   * @param controller The controller containing the method to resolve.
   * @param method The method to resolve.
   * @param ctx The operation context.
   * @returns The resolved method
   */
  resolveHandler?: (
    controller: object,
    method: Function | string | symbol,
    ctx: OperationContext,
  ) => Function;

  /**
   * Request data processors are responsible for both validating the request conforms to the OpenAPI specification
   * as well as extracting the data to be presented to the handler function.
   */
  requestDataProcessorFactories?: RequestDataProcessorFactory[];

  /**
   * Middleware to apply to all handlers.
   * This middleware will apply in-order before any middleware registered on the operation.
   *
   * In addition to the middleware specified here, the last middleware will always be one that
   * processes json responses.
   */
  handlerMiddleware?: OperationHandlerMiddleware[];

  /**
   * Middleware to apply to the express router before the request.
   */
  preExpressMiddleware?: Middleware[];

  /**
   * Middleware to apply to the express router after the request.
   */
  postExpressMiddleware?: Middleware[];
}

export function createMethodHandlerFromSpec(
  spec: OpenAPIObject,
  path: string,
  method: RequestMethod,
  ajv: AJV,
  opts: CreateMethodHandlerOpts,
) {
  const pathItem = (spec.paths ?? {})[path];
  if (!pathItem) {
    throw new Error(`Path ${path} not found in spec.`);
  }

  const operation = pathItem[method];
  if (!operation) {
    throw new Error(`Operation ${method} not found on path ${path}.`);
  }

  const extensionData = operation[
    SOCControllerMethodExtensionName
  ] as SOCControllerMethodExtensionData;

  if (!extensionData) {
    throw new Error(
      `Operation ${operation.operationId} is missing the ${SOCControllerMethodExtensionName} extension.`,
    );
  }

  if (!validateSOCControllerMethodExtensionData(extensionData)) {
    throw new Error(
      `Operation ${
        operation.operationId
      } has an invalid ${SOCControllerMethodExtensionName} extension: ${ajv.errorsText(
        validateSOCControllerMethodExtensionData.errors,
      )}}`,
    );
  }

  let { resolveController, resolveHandler } = opts;

  if (!resolveController) {
    resolveController = defaultResolveController;
  }

  if (!resolveHandler) {
    resolveHandler = defaultResolveHandler;
  }

  const ctx: OperationContext = {
    spec,
    path,
    method,
    pathItem,
    operation,
  };

  const controller = resolveController(extensionData.controller, ctx);
  const handler = resolveHandler(controller, extensionData.handler, ctx);

  const createValueProcessor = (schema: SchemaObject) => {
    // Wrap the value so that coersion functions properly on non-reference values.
    const wrappedSchema: SchemaObject = {
      type: "object",
      properties: {
        value: schema,
      },
      required: ["value"],
    };

    let validate: ValidateFunction;
    try {
      validate = ajv.compile(wrappedSchema);
    } catch (e: any) {
      console.error(
        "\n\n\nCOMPILE ERROR",
        e.message,
        JSON.stringify(wrappedSchema, null, 2),
      );
      throw e;
    }
    return (value: any) => {
      const wrapper = { value };
      if (!validate(wrapper)) {
        throw new ValidationError(
          validate.errors!.map((error) => sliceAjvError(error, "value")),
        );
      }

      return wrapper.value;
    };
  };

  const processors = (opts.requestDataProcessorFactories ?? [])
    .map((factory) =>
      factory({
        spec,
        path,
        method,
        pathItem,
        operation,
        controller,
        handler,
        createValueProcessor,
      }),
    )
    .filter(isNotNullOrUndefined);

  const context: MethodHandlerContext = {
    spec,
    path,
    method,
    pathItem,
    operation,
    controller,
    handler,
  };

  const handlerMiddleware = [
    ...(opts.handlerMiddleware ?? []),
    ...(extensionData.handlerMiddleware ?? []),
  ];

  const preExpressMiddleware = [
    ...(opts.preExpressMiddleware ?? []),
    ...(extensionData.preExpressMiddleware ?? []),
  ];

  const postExpressMiddleware = [...(opts.postExpressMiddleware ?? [])];

  return new MethodHandler(
    controller,
    handler,
    extensionData.handlerArgs ?? [],
    processors,
    handlerMiddleware,
    preExpressMiddleware,
    postExpressMiddleware,
    context,
  );
}

function defaultResolveController(
  controller: string | symbol | object,
  ctx: OperationContext,
) {
  if (!isObject(controller)) {
    throw new Error(
      `Controller for operation ${ctx.operation.operationId} handling \"${
        ctx.method
      } ${ctx.path}\" is not an object (got ${String(controller)}).`,
    );
  }

  return controller;
}

function defaultResolveHandler(
  controller: ControllerInstance,
  method: string | symbol | Function,
  ctx: OperationContext,
) {
  if (typeof method === "string" || typeof method === "symbol") {
    method = (controller as any)[method];
  }

  if (!isFunction(method)) {
    if (isConstructor(controller)) {
      throw new Error(
        `Handler for operation \"${
          ctx.operation.operationId
        }\" handling \"${String(ctx.method)} ${
          ctx.path
        }\" could not be resolved.  The controller seems to be a constructor.  Either pass initialized controllers to createOpenAPIFromControllers, or use a custom resolveController or resolveMethod option to resolve the metadata to their controller and handler instances.`,
      );
    }
    throw new Error(
      `Handler for operation \"${ctx.operation.operationId}\" handling \"${ctx.method} ${ctx.path}\" could not be resolved to a function.  Check that the function exists or supply a custom resolveMethod option to resolve it to its intended handler.`,
    );
  }

  return method;
}
